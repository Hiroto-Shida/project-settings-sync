import * as vscode from 'vscode';
import { ProjectDecorationProvider } from './features/badgeProvider';
import { applyFocusMode } from './features/focusMode';
import { syncSettings } from './features/settingsSync';
import {
	disposeLogger,
	initializeLogger,
	logError,
	logInfo,
	logSuccess,
} from './utils/logger';

let debounceTimer: NodeJS.Timeout | undefined;

/**
 * 拡張機能の有効化処理
 */
export function activate(context: vscode.ExtensionContext) {
	// ロガーの初期化
	initializeLogger();
	logSuccess('Extension activated');

	// 1. バッジプロバイダーの登録
	const provider = new ProjectDecorationProvider();
	context.subscriptions.push(
		vscode.window.registerFileDecorationProvider(provider),
	);
	logInfo('Badge provider registered');

	// 2. アクティブエディタ変更イベントの監視
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(() => {
			// タブ切り替え時はキャッシュを活用して高速に処理 (force=false)
			triggerUpdate(false);
		}),
	);

	// 起動時に一度強制実行
	triggerUpdate(true, true);

	// 3. 設定変更の監視
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((e) => {
			// 自身の設定変更に加え、Peacock等による外部変更も監視対象とする
			if (
				e.affectsConfiguration('projectSettingsSync') ||
				e.affectsConfiguration('workbench.colorCustomizations')
			) {
				provider.refresh();
				// 設定変更時はキャッシュを無視して強制同期 (force=true)
				triggerUpdate(false, true);
			}
		}),
	);
}

/**
 * 設定同期とフォーカスモード適用をトリガーします。
 * 連続操作時の負荷軽減のためデバウンス制御を行います。
 * * @param immediate 待機時間を無視して即時実行するか
 * @param force キャッシュを無視して強制的に書き込みを行うか
 */
function triggerUpdate(immediate: boolean = false, force: boolean = false) {
	if (debounceTimer) {
		clearTimeout(debounceTimer);
		debounceTimer = undefined;
	}

	const config = vscode.workspace.getConfiguration('projectSettingsSync');
	const delay = config.get<number>('debounceDelay', 500);

	if (immediate) {
		performSync(vscode.window.activeTextEditor, force);
	} else {
		debounceTimer = setTimeout(() => {
			performSync(vscode.window.activeTextEditor, force);
		}, delay);
	}
}

/**
 * 同期処理の実行
 */
async function performSync(
	editor: vscode.TextEditor | undefined,
	force: boolean,
) {
	try {
		// 設定同期処理 (FocusModeの設定もここでマージして書き込まれます)
		await syncSettings(editor, force);

		// 設定変更時など、強制実行の際は念のため FocusMode 単体処理も実行
		if (force) {
			await applyFocusMode(editor, force);
		}
	} catch (error) {
		logError(`Sync failed: ${error}`);
	}
}

export function deactivate() {
	if (debounceTimer) {
		clearTimeout(debounceTimer);
	}
	disposeLogger();
}
