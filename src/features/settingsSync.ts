import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
	modify,
	applyEdits,
	format,
	type FormattingOptions,
	type ModificationOptions,
	type Edit,
} from 'jsonc-parser';
import {
	loadSettingsForEditor,
	getSettingsPathForEditor,
} from '../utils/configUtils';
import { resolveSettingsPaths, findSettingsDir } from '../utils/pathUtils';
import { getFocusModeRules } from './focusMode';
import type { MappingItem } from '../types';

let previouslyAppliedKeys: string[] = [];
let currentSettingsPath: string | null = null;
let isSyncing = false;

/**
 * サブプロジェクトの設定をルートの settings.json に同期します。
 * Focus Mode の設定も同時にマージして書き込みます。
 * * @param editor 対象のエディタ
 * @param force キャッシュを無視して強制的に同期するか
 */
export async function syncSettings(
	editor: vscode.TextEditor | undefined,
	force: boolean = false,
) {
	// 排他制御
	if (isSyncing) return;

	try {
		isSyncing = true;

		const extConfig = vscode.workspace.getConfiguration('projectSettingsSync');
		const autoCleanup = extConfig.get<boolean>('autoCleanup', false);
		const mappings = extConfig.get<MappingItem[]>('mappings') || [];

		const nextSettingsPath = getSettingsPathForEditor(editor);

		// 対象外ファイルのハンドリング
		if (nextSettingsPath === null) {
			if (!autoCleanup) return;
		}

		// キャッシュチェック: 強制モードでなく、かつパスが変わっていなければ早期リターン
		if (!force && nextSettingsPath === currentSettingsPath) {
			return;
		}

		currentSettingsPath = nextSettingsPath;

		// 設定の読み込み
		let targetSettings = loadSettingsForEditor(editor);

		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) return;
		const rootPath = workspaceFolders[0].uri.fsPath;

		// パス書き換え処理 & 現在のファイルパス取得
		let currentFilePath = '';
		if (editor && editor.document.uri.scheme === 'file') {
			currentFilePath = editor.document.uri.fsPath;
			const settingsDir = findSettingsDir(currentFilePath, rootPath);

			if (settingsDir) {
				const relativePath = path.relative(rootPath, settingsDir);
				if (relativePath && relativePath !== '') {
					const normalizedPrefix = relativePath.split(path.sep).join('/');
					targetSettings = resolveSettingsPaths(
						targetSettings,
						normalizedPrefix,
					);
				}
			}
		}

		// Focus Mode 設定のマージ
		// 設定書き込み時の競合を防ぐため、ここで一括で計算してマージします
		if (currentFilePath) {
			const focusRules = getFocusModeRules(
				rootPath,
				currentFilePath,
				mappings,
				extConfig,
			);

			if (focusRules) {
				const existingExclude =
					(targetSettings['search.exclude'] as Record<string, boolean>) || {};
				targetSettings['search.exclude'] = {
					...existingExclude,
					...focusRules,
				};
			}
		}

		const newKeys = Object.keys(targetSettings);
		const rootSettingsPath = path.join(rootPath, '.vscode', 'settings.json');

		const vscodeDir = path.dirname(rootSettingsPath);
		if (!fs.existsSync(vscodeDir)) {
			fs.mkdirSync(vscodeDir, { recursive: true });
		}

		// ファイルが開かれているか確認（競合回避のため）
		const openDoc = vscode.workspace.textDocuments.find(
			(doc) => doc.uri.fsPath === rootSettingsPath,
		);

		let content = openDoc
			? openDoc.getText()
			: fs.existsSync(rootSettingsPath)
				? fs.readFileSync(rootSettingsPath, 'utf8')
				: '{}';

		if (content.trim() === '') content = '{}';

		const formattingOptions: FormattingOptions = {
			tabSize: 2,
			insertSpaces: true,
			eol: '\n',
		};
		const modificationOptions: ModificationOptions = { formattingOptions };

		/**
		 * 編集適用とフォーマットを一括で行うヘルパー関数
		 * 部分的な編集でもJSON構造（カンマ等）を正常に保つためにフォーマットを行います。
		 */
		const applyAndFormat = (currentContent: string, edits: Edit[]) => {
			let nextContent = applyEdits(currentContent, edits);
			const formatEdits = format(nextContent, undefined, formattingOptions);
			return applyEdits(nextContent, formatEdits);
		};

		let hasChanges = false;

		// クリーンアップ: 不要になった設定の削除
		const keysToRemove = previouslyAppliedKeys.filter(
			(key) => !newKeys.includes(key),
		);

		for (const key of keysToRemove) {
			const edits = modify(content, [key], undefined, modificationOptions);
			if (edits.length > 0) {
				content = applyAndFormat(content, edits);
				hasChanges = true;
			}
		}

		// 新規設定の適用
		for (const key of newKeys) {
			const newValue = targetSettings[key];
			const isComplexValue = typeof newValue === 'object' && newValue !== null;

			if (isComplexValue) {
				// オブジェクト型の場合、マージ不整合を防ぐため「削除 -> 新規作成」の手順を踏む
				const removeEdits = modify(
					content,
					[key],
					undefined,
					modificationOptions,
				);
				if (removeEdits.length > 0) {
					content = applyAndFormat(content, removeEdits);
					hasChanges = true;
				}
				const addEdits = modify(content, [key], newValue, modificationOptions);
				if (addEdits.length > 0) {
					content = applyAndFormat(content, addEdits);
					hasChanges = true;
				}
			} else {
				// 単純な値は上書き更新
				const edits = modify(content, [key], newValue, modificationOptions);
				if (edits.length > 0) {
					content = applyAndFormat(content, edits);
					hasChanges = true;
				}
			}
		}

		if (!hasChanges) {
			previouslyAppliedKeys = newKeys;
			return;
		}

		// 保存処理
		if (openDoc) {
			// ファイルが開かれている場合は WorkspaceEdit API を使用 (Undo可能、競合回避)
			const fullRange = new vscode.Range(
				openDoc.positionAt(0),
				openDoc.positionAt(openDoc.getText().length),
			);
			const workspaceEdit = new vscode.WorkspaceEdit();
			workspaceEdit.replace(openDoc.uri, fullRange, content);

			const success = await vscode.workspace.applyEdit(workspaceEdit);
			if (success) {
				await openDoc.save();
			}
		} else {
			// 閉じている場合は fs で直接書き込み (高速)
			try {
				fs.writeFileSync(rootSettingsPath, content, 'utf8');
			} catch (e) {
				console.error(`書き込み失敗: ${e}`);
			}
		}

		previouslyAppliedKeys = newKeys;
	} catch (e) {
		console.error('[ERROR] syncSettings で例外が発生しました:', e);
	} finally {
		isSyncing = false;
	}
}
