import * as path from 'node:path';
import * as vscode from 'vscode';
import * as fs from 'fs';
import {
	modify,
	applyEdits,
	parse,
	type FormattingOptions,
	type ModificationOptions,
} from 'jsonc-parser';
import type { MappingItem } from '../types';

// 無駄な書き込みを防ぐためのキャッシュ
let previousRulesJSON: string | null = null;

/**
 * Focus Mode のルール（search.exclude の設定値）を計算します。
 * 副作用を持たない純粋関数です。
 * * @param rootPath ワークスペースのルートパス
 * @param currentFilePath 現在開いているファイルのパス
 * @param mappings プロジェクトのマッピング設定
 * @param config 拡張機能の設定オブジェクト
 * @returns 適用すべき search.exclude のルールオブジェクト、または null
 */
export function getFocusModeRules(
	rootPath: string,
	currentFilePath: string,
	mappings: MappingItem[],
	config: vscode.WorkspaceConfiguration,
): Record<string, boolean> | null {
	const isFocusModeEnabled = config.get<boolean>('focusMode', false);
	const autoCleanup = config.get<boolean>('autoCleanup', false);

	if (!isFocusModeEnabled) {
		return null;
	}

	// 現在アクティブなプロジェクトを特定
	let activeProjectPath: string | null = null;
	const matchedItem = mappings.find((item) => {
		if (!item.path) return false;
		const absPath = path.resolve(rootPath, item.path);
		return (
			currentFilePath === absPath ||
			currentFilePath.startsWith(absPath + path.sep)
		);
	});

	if (matchedItem?.path) {
		activeProjectPath = matchedItem.path;
	}

	// プロジェクト外のファイルを開いた場合
	if (!activeProjectPath) {
		if (!autoCleanup) return null;
	}

	const rules: Record<string, boolean> = {};

	for (const item of mappings) {
		if (!item.path) continue;
		const globPattern = `${item.path}/**`;

		if (activeProjectPath) {
			if (item.path === activeProjectPath) {
				rules[globPattern] = false; // 表示
			} else {
				rules[globPattern] = true; // 非表示
			}
		} else {
			// 全解除 (autoCleanup=true かつ プロジェクト外の場合)
			rules[globPattern] = false;
		}
	}

	return rules;
}

/**
 * Focus Mode の設定を settings.json に直接書き込みます。
 * settingsSync が実行されないケース（設定変更時など）で使用されます。
 */
export async function applyFocusMode(
	editor: vscode.TextEditor | undefined,
	force: boolean = false,
) {
	const extConfig = vscode.workspace.getConfiguration('projectSettingsSync');
	const mappings = extConfig.get<MappingItem[]>('mappings');

	if (!Array.isArray(mappings) || mappings.length === 0) {
		return;
	}

	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) return;
	const rootPath = workspaceFolders[0].uri.fsPath;

	let currentFilePath = '';
	if (editor && editor.document.uri.scheme === 'file') {
		currentFilePath = editor.document.uri.fsPath;
	} else {
		return;
	}

	// ルールの計算
	const rules = getFocusModeRules(
		rootPath,
		currentFilePath,
		mappings,
		extConfig,
	);

	if (!rules) {
		return;
	}

	// キャッシュチェック (強制モードでない場合)
	const rulesJSON = JSON.stringify(rules);
	if (!force && rulesJSON === previousRulesJSON) {
		return;
	}
	previousRulesJSON = rulesJSON;

	// ファイル操作
	const rootSettingsPath = path.join(rootPath, '.vscode', 'settings.json');
	if (!fs.existsSync(rootSettingsPath)) return;

	// 最新状態を読み込むために fs を使用
	const content = fs.readFileSync(rootSettingsPath, 'utf8');
	const parsed = parse(content);
	const currentSearchExclude = parsed['search.exclude'] || {};

	const formattingOptions: FormattingOptions = {
		tabSize: 2,
		insertSpaces: true,
		eol: '\n',
	};
	const modificationOptions: ModificationOptions = { formattingOptions };

	let newContent = content;
	let hasChanges = false;

	// 差分更新
	for (const [pattern, shouldExclude] of Object.entries(rules)) {
		if (currentSearchExclude[pattern] !== shouldExclude) {
			const edits = modify(
				newContent,
				['search.exclude', pattern],
				shouldExclude,
				modificationOptions,
			);
			if (edits.length > 0) {
				newContent = applyEdits(newContent, edits);
				hasChanges = true;
			}
		}
	}

	if (hasChanges) {
		try {
			fs.writeFileSync(rootSettingsPath, newContent, 'utf8');
		} catch (e) {
			console.error(`focusMode書き込み失敗: ${e}`);
		}
	}
}
