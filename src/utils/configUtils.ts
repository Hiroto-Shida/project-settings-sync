import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'jsonc-parser';
import { MappingItem } from '../types';
import { findSettingsDir } from './pathUtils';

/**
 * エディタに対応する設定ファイルを探して読み込みます。
 * ホワイトリスト（mappings設定）に含まれないパスの場合は空オブジェクトを返します。
 */
export function loadSettingsForEditor(editor: vscode.TextEditor | undefined): {
  [key: string]: any;
} {
  if (!editor || editor.document.uri.scheme !== 'file') {
    return {};
  }

  const currentFilePath = editor.document.uri.fsPath;

  // ホワイトリストチェック
  if (!isPathAllowed(currentFilePath)) {
    return {};
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return {};
  }
  const rootPath = workspaceFolders[0].uri.fsPath;

  // 設定ファイルの探索と読み込み
  const settingsDir = findSettingsDir(currentFilePath, rootPath);

  if (settingsDir) {
    const settingsPath = path.join(settingsDir, '.vscode', 'settings.json');
    try {
      const content = fs.readFileSync(settingsPath, 'utf8');
      const json = parse(content, [], { allowTrailingComma: true });
      if (json && typeof json === 'object') {
        return json;
      }
    } catch (e) {
      console.error(`設定読み込み失敗: ${settingsPath}`, e);
    }
  }

  return {};
}

/**
 * エディタに対応する settings.json のパスを特定します。
 * ファイルの中身は読み込みません。パス変更検知の軽量チェック用です。
 */
export function getSettingsPathForEditor(
  editor: vscode.TextEditor | undefined,
): string | null {
  if (!editor || editor.document.uri.scheme !== 'file') {
    return null;
  }

  const currentFilePath = editor.document.uri.fsPath;

  if (!isPathAllowed(currentFilePath)) {
    return null;
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return null;
  }
  const rootPath = workspaceFolders[0].uri.fsPath;

  const settingsDir = findSettingsDir(currentFilePath, rootPath);

  if (settingsDir) {
    return path.join(settingsDir, '.vscode', 'settings.json');
  }

  return null;
}

/**
 * 現在のパスが設定（mappings）に含まれているかを確認します。
 */
function isPathAllowed(currentFilePath: string): boolean {
  const config = vscode.workspace.getConfiguration('projectSettingsSync');
  const mappings = config.get<MappingItem[]>('mappings');
  if (Array.isArray(mappings)) {
    return mappings.some(
      (item) => item.path && currentFilePath.includes(item.path),
    );
  }
  return false;
}
