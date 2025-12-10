import * as vscode from 'vscode';

let outputChannel: vscode.OutputChannel | undefined;

/**
 * Output Channelを初期化します
 */
export function initializeLogger() {
	if (!outputChannel) {
		outputChannel = vscode.window.createOutputChannel('Project Settings Sync');
	}
	return outputChannel;
}

/**
 * ログを出力します
 * @param message ログメッセージ
 * @param emoji 絵文字（オプション）
 */
export function log(message: string, emoji?: string) {
	if (!outputChannel) {
		initializeLogger();
	}
	const timestamp = new Date().toLocaleTimeString();
	const emojiPrefix = emoji ? `${emoji} ` : '';
	outputChannel?.appendLine(`[${timestamp}] ${emojiPrefix}${message}`);
}

/**
 * 情報レベルのログを出力します
 */
export function logInfo(message: string) {
	log(message, 'ℹ️');
}

/**
 * 成功レベルのログを出力します
 */
export function logSuccess(message: string) {
	log(message, '✅');
}

/**
 * 警告レベルのログを出力します
 */
export function logWarning(message: string) {
	log(message, '⚠️');
}

/**
 * エラーレベルのログを出力します
 */
export function logError(message: string) {
	log(message, '❌');
}

/**
 * デバッグレベルのログを出力します
 */
export function logDebug(message: string) {
	log(message, '🔍');
}

/**
 * Output Channelを表示します
 */
export function showOutputChannel() {
	outputChannel?.show();
}

/**
 * Output Channelを破棄します
 */
export function disposeLogger() {
	outputChannel?.dispose();
	outputChannel = undefined;
}
