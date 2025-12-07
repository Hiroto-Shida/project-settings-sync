# Project Settings Sync

モノレポ（Monorepo）やマルチプロジェクト構成の開発を強力にサポートする VS Code 拡張機能です。
現在開いているファイルに応じて、サブプロジェクトの設定をルートに自動同期し、開発コンテキスト（設定・検索範囲・見た目）をシームレスに切り替えます。

## ✨ 特徴

1.  **設定の自動同期 (Settings Sync)**
    - サブディレクトリ（プロジェクト）にある `.vscode/settings.json` を読み込み、ルートのワークスペース設定に自動でマージします。
    - タブを切り替えるだけで、フォーマッタやLinterの設定がそのプロジェクト専用のものに切り替わります。
    - 相対パス（`node_modules/...` 等）をルート基準のパス（`apps/app1/node_modules/...`）に自動で書き換えます。

2.  **フォーカスモード (Focus Mode)**
    - 作業中のプロジェクト以外のファイルを、検索結果（`Cmd+P` や全文検索）から自動で除外します。
    - 同名のファイルや別プロジェクトのノイズに悩まされることがなくなります。

3.  **プロジェクトバッジ (Project Badge)**
    - エクスプローラーのフォルダや、開いているタブの横に「バッジ（アイコンや短い文字）」を表示します。
    - 今どのプロジェクトのファイルを触っているかが一目でわかります。

## ⚙️ 設定 (Usage)

ルートの `.vscode/settings.json` に設定を記述します。

```json
{
  // 拡張機能を有効にするプロジェクトのパスとバッジの設定
  "projectSettingsSync.mappings": [
    {
      "path": "apps/frontend",
      "badge": "FE"
    },
    {
      "path": "apps/backend",
      "badge": {
        "root": "🟣", // フォルダに表示するバッジ
        "file": "🟪" // ファイル(タブ)に表示するバッジ
      }
    }
  ],

  // フォーカスモード（検索スコープ制御）を有効にするか
  "projectSettingsSync.focusMode": true,

  // 有効なプロジェクト以外を開いた際に、適用済みの設定をリセットするか
  // false（デフォルト）: 直前のプロジェクト設定を維持
  // true: 設定を自動的にクリーンアップして初期状態に戻す
  "projectSettingsSync.autoCleanup": false,

  // タブ切り替え時の同期遅延時間 (ms) - デフォルト: 500
  "projectSettingsSync.debounceDelay": 200
}
```
