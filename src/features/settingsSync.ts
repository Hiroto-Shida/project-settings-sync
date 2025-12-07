import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
  modify,
  applyEdits,
  FormattingOptions,
  ModificationOptions,
} from 'jsonc-parser';
import {
  loadSettingsForEditor,
  getSettingsPathForEditor,
} from '../utils/configUtils';
import { resolveSettingsPaths, findSettingsDir } from '../utils/pathUtils';

// --- モジュール内ステート ---
let previouslyAppliedKeys: string[] = [];
let currentSettingsPath: string | null = null;

/**
 * サブディレクトリの settings.json を読み込み、ルート設定に適用します。
 * ファイルIOを最小限にするため、パス変更検知やメモリ内編集を活用しています。
 */
export async function syncSettings(editor: vscode.TextEditor | undefined) {
  // 1. 今回適用すべき設定ファイルのパスを特定
  const nextSettingsPath = getSettingsPathForEditor(editor);

  // 2. 設定ファイルの場所が変わっていなければ早期リターン
  if (nextSettingsPath === currentSettingsPath) {
    return;
  }

  // 3. キャッシュを更新
  currentSettingsPath = nextSettingsPath;

  // 4. 設定の読み込みと適用準備
  let targetSettings = loadSettingsForEditor(editor);

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return;
  }
  const rootPath = workspaceFolders[0].uri.fsPath;

  // パス書き換え処理 (相対パスをルート基準に変換)
  if (editor && editor.document.uri.scheme === 'file') {
    const currentFilePath = editor.document.uri.fsPath;
    const settingsDir = findSettingsDir(currentFilePath, rootPath);

    if (settingsDir) {
      const relativePath = path.relative(rootPath, settingsDir);
      if (relativePath && relativePath !== '') {
        const normalizedPrefix = relativePath.split(path.sep).join('/');
        targetSettings = resolveSettingsPaths(targetSettings, normalizedPrefix);
      }
    }
  }

  const newKeys = Object.keys(targetSettings);
  const rootSettingsPath = path.join(rootPath, '.vscode', 'settings.json');

  // .vscodeフォルダ作成
  const vscodeDir = path.dirname(rootSettingsPath);
  if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir, { recursive: true });
  }

  // ファイルが開かれているかチェック (競合回避のため)
  const openDoc = vscode.workspace.textDocuments.find(
    (doc) => doc.uri.fsPath === rootSettingsPath,
  );

  // 編集ベースとなるテキストの取得
  let content = openDoc
    ? openDoc.getText()
    : fs.existsSync(rootSettingsPath)
      ? fs.readFileSync(rootSettingsPath, 'utf8')
      : '{}';

  const formattingOptions: FormattingOptions = {
    tabSize: 4,
    insertSpaces: true,
    eol: '\n',
  };
  const modificationOptions: ModificationOptions = { formattingOptions };

  let hasChanges = false;

  // クリーンアップ: 不要になった設定の削除
  const keysToRemove = previouslyAppliedKeys.filter(
    (key) => !newKeys.includes(key),
  );

  for (const key of keysToRemove) {
    const edits = modify(content, [key], undefined, modificationOptions);
    if (edits.length > 0) {
      content = applyEdits(content, edits);
      hasChanges = true;
    }
  }

  // 新規設定の適用
  for (const key of newKeys) {
    const newValue = targetSettings[key];
    const edits = modify(content, [key], newValue, modificationOptions);

    if (edits.length > 0) {
      content = applyEdits(content, edits);
      hasChanges = true;
    }
  }

  if (!hasChanges) {
    previouslyAppliedKeys = newKeys;
    return;
  }

  // 保存処理
  if (openDoc) {
    // A. ファイルが開かれている場合: WorkspaceEdit APIで全文置換
    const fullRange = new vscode.Range(
      openDoc.positionAt(0),
      openDoc.positionAt(openDoc.getText().length),
    );

    const workspaceEdit = new vscode.WorkspaceEdit();
    workspaceEdit.replace(openDoc.uri, fullRange, content);

    await vscode.workspace.applyEdit(workspaceEdit);
    await openDoc.save();
  } else {
    // B. ファイルが閉じている場合: fsで直接書き込み
    try {
      fs.writeFileSync(rootSettingsPath, content, 'utf8');
    } catch (e) {
      console.error(`書き込み失敗: ${e}`);
    }
  }

  previouslyAppliedKeys = newKeys;
}
