import * as vscode from 'vscode';
import * as path from 'path';
import { MappingItem } from '../types';

/**
 * 開いているプロジェクト以外のファイルを検索結果（search.exclude）から除外します。
 */
export async function applyFocusMode(editor: vscode.TextEditor | undefined) {
  const config = vscode.workspace.getConfiguration();
  const extConfig = vscode.workspace.getConfiguration('projectSettingsSync');

  const isFocusModeEnabled = extConfig.get<boolean>('focusMode', false);
  const autoCleanup = extConfig.get<boolean>('autoCleanup', false);
  const mappings = extConfig.get<MappingItem[]>('mappings');

  if (
    !isFocusModeEnabled ||
    !Array.isArray(mappings) ||
    mappings.length === 0
  ) {
    return;
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return;
  }
  const rootPath = workspaceFolders[0].uri.fsPath;

  // 現在アクティブなプロジェクトを特定
  let activeProjectPath: string | null = null;

  if (editor && editor.document.uri.scheme === 'file') {
    const currentFilePath = editor.document.uri.fsPath;
    const matchedItem = mappings.find((item) => {
      if (!item.path) {
        return false;
      }
      const absPath = path.resolve(rootPath, item.path);
      return (
        currentFilePath === absPath ||
        currentFilePath.startsWith(absPath + path.sep)
      );
    });

    if (matchedItem && matchedItem.path) {
      activeProjectPath = matchedItem.path;
    }
  }

  // プロジェクト外のファイルを開いた場合
  if (!activeProjectPath) {
    if (!autoCleanup) {
      // 自動クリーンアップOFFなら、検索スコープを変更せず終了（維持）
      return;
    }
    // ONなら、下のループで activeProjectPath が null なので、全パターンが false (制限解除) になる
  }

  // 更新用の一時オブジェクト作成
  const searchExcludeUpdate: { [key: string]: boolean | undefined } = {};

  for (const item of mappings) {
    if (!item.path) {
      continue;
    }
    const globPattern = `${item.path}/**`;

    if (activeProjectPath) {
      // アクティブなプロジェクトなら表示(false)、それ以外は非表示(true)
      if (item.path === activeProjectPath) {
        searchExcludeUpdate[globPattern] = false;
      } else {
        searchExcludeUpdate[globPattern] = true;
      }
    } else {
      // プロジェクト外のファイルを開いている時は制限解除
      searchExcludeUpdate[globPattern] = false;
    }
  }

  // 現在のワークスペース設定のみを取得してマージ（デフォルト値を含めない）
  const inspect = config.inspect<{ [key: string]: boolean }>('search.exclude');
  const currentWorkspaceExclude = inspect?.workspaceValue || {};

  let hasChanges = false;
  const newSearchExclude = { ...currentWorkspaceExclude };

  for (const [pattern, shouldExclude] of Object.entries(searchExcludeUpdate)) {
    if (newSearchExclude[pattern] !== shouldExclude) {
      if (shouldExclude === undefined) {
        delete newSearchExclude[pattern];
      } else {
        newSearchExclude[pattern] = shouldExclude;
      }
      hasChanges = true;
    }
  }

  if (hasChanges) {
    await config.update(
      'search.exclude',
      newSearchExclude,
      vscode.ConfigurationTarget.Workspace,
    );
  }
}
