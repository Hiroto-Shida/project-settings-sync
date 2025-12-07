import * as vscode from 'vscode';
import { ProjectDecorationProvider } from './features/badgeProvider';
import { applyFocusMode } from './features/focusMode';
import { syncSettings } from './features/settingsSync';

let debounceTimer: NodeJS.Timeout | undefined;

/**
 * 拡張機能のエントリーポイント
 */
export function activate(context: vscode.ExtensionContext) {
	// 1. バッジプロバイダーの登録
	const provider = new ProjectDecorationProvider();
	context.subscriptions.push(
		vscode.window.registerFileDecorationProvider(provider),
	);

	// 2. アクティブエディタ変更イベントの監視
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(() => {
			triggerUpdate();
		}),
	);

	// 起動時の初期化
	triggerUpdate(true);

	// 3. 設定変更の監視
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('projectSettingsSync')) {
				provider.refresh();
				triggerUpdate();
			}
		}),
	);
}

/**
 * 設定同期とフォーカスモード適用をトリガーします。
 * 連続操作時の負荷軽減のためデバウンス制御を行います。
 */
function triggerUpdate(immediate: boolean = false) {
	if (debounceTimer) {
		clearTimeout(debounceTimer);
		debounceTimer = undefined;
	}

	const config = vscode.workspace.getConfiguration('projectSettingsSync');
	const delay = config.get<number>('debounceDelay', 500);

	if (immediate) {
		performSync(vscode.window.activeTextEditor);
	} else {
		debounceTimer = setTimeout(() => {
			performSync(vscode.window.activeTextEditor);
		}, delay);
	}
}

/**
 * 同期処理のオーケストレーター
 */
async function performSync(editor: vscode.TextEditor | undefined) {
	await syncSettings(editor);
	await applyFocusMode(editor);
}

export function deactivate() {
	if (debounceTimer) {
		clearTimeout(debounceTimer);
	}
}
