import * as vscode from 'vscode';
import * as path from 'path';
import { MappingItem } from '../types';

/**
 * ファイル/フォルダごとのバッジ定義を提供するプロバイダー。
 * settings.json の mappings 設定に基づいて装飾を行います。
 */
export class ProjectDecorationProvider
  implements vscode.FileDecorationProvider
{
  private _onDidChangeFileDecorations = new vscode.EventEmitter<
    vscode.Uri | undefined
  >();
  readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

  /**
   * 装飾の再描画をVS Codeに通知します
   */
  refresh() {
    this._onDidChangeFileDecorations.fire(undefined);
  }

  provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
    const config = vscode.workspace.getConfiguration('projectSettingsSync');
    const mappings = config.get<MappingItem[]>('mappings');

    if (!Array.isArray(mappings)) {
      return undefined;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return undefined;
    }
    const rootPath = workspaceFolders[0].uri.fsPath;

    const filePath = uri.fsPath;
    const filePathLower = filePath.toLowerCase();

    for (const item of mappings) {
      if (!item.path) {
        continue;
      }

      const absItemPath = path.resolve(rootPath, item.path);
      const absItemPathLower = absItemPath.toLowerCase();

      // バッジ設定の解決（文字列なら両方、オブジェクトなら個別）
      let rootBadgeText: string | undefined;
      let fileBadgeText: string | undefined;

      if (typeof item.badge === 'string') {
        rootBadgeText = item.badge;
        fileBadgeText = item.badge;
      } else if (typeof item.badge === 'object' && item.badge !== null) {
        rootBadgeText = item.badge.root;
        fileBadgeText = item.badge.file;
      } else {
        rootBadgeText = undefined;
        fileBadgeText = undefined;
      }

      // 1. プロジェクトルートフォルダ判定 (完全一致)
      if (path.normalize(filePathLower) === path.normalize(absItemPathLower)) {
        if (!rootBadgeText) {
          return undefined;
        }
        return {
          badge: rootBadgeText.substring(0, 2),
          tooltip: `Project Root: ${item.path}`,
          propagate: false, // ファイルと独立させるため伝播させない
        };
      }

      // 2. 配下のファイル判定 (前方一致)
      if (filePathLower.startsWith(absItemPathLower + path.sep)) {
        if (!fileBadgeText) {
          return undefined;
        }
        return {
          badge: fileBadgeText.substring(0, 2),
          tooltip: `Project: ${item.path}`,
          propagate: false,
        };
      }
    }
    return undefined;
  }
}
