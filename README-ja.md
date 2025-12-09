# Project Settings Sync

モノレポ（Monorepo）やマルチプロジェクト構成の開発を強力にサポートする VS Code 拡張機能です。
現在開いているファイル・ディレクトリに応じて、サブプロジェクトの設定をルートに自動同期し、開発コンテキスト（設定・検索範囲・見た目）をシームレスに切り替えます。

## ✨ 特徴

1.  **設定の自動同期 (Settings Sync)**
    - サブディレクトリ（プロジェクト）にある `.vscode/settings.json` を読み込み、ルートのワークスペース設定に自動でマージします。
    - vscode はプロジェクトルートにある `.vscode/settings.json` しか対応していないため、サブディレクトリに存在する `projectXxx/.vscode/settings.json` を親ディレクトリ操作時は適用されません。こちらの拡張機能をつかうことで、この問題を解決します
    - タブを切り替えるだけで、フォーマッタやLinterの設定がそのプロジェクト専用のものに切り替わります。
    - `settings.json` 内の相対パス（`node_modules/...` 等）をルート基準のパス（`apps/app1/node_modules/...`）に自動で書き換えます。

2.  **フォーカスモード (Focus Mode)**
    - 作業中のプロジェクト以外のファイルを、検索結果（`Cmd+P` や全文検索）から自動で除外します。
    - 同名のファイルや別プロジェクトのノイズに悩まされることがなくなります。

3.  **プロジェクトバッジ (Project Badge)**
    - エクスプローラーのフォルダや、開いているタブの横に「バッジ（アイコンや短い文字）」を表示します。
    - 今どのプロジェクトのファイルを触っているかが一目でわかります。

## ⚙️ 設定 (Usage)

下記のようなプロジェクトでの設定例です。

```
.vscode/
└─ settings.json
project1/
├─ .vscode/
│  └─ settings.json
└─ aaa.txt
admin-project/
└─ projectX
   ├─ .vscode/
   │  └─ settings.json
   └─ bbb.txt
```

ルートの `.vscode/settings.json` に設定を記述します。

```json
{
  // 拡張機能を有効にするプロジェクトのパスとバッジの設定
  "projectSettingsSync.mappings": [
    {
      "path": "project1",
      "badge": {
        "root": "🟦", // プロジェクトルートに表示するバッジ (省略可能)
        "file": "🔵" // ファイル(タブ)に表示するバッジ (省略可能)
      }
    },
    {
      "path": "admin-project/projectX",
      "badge": "🟥" // ディレクトリおよびファイルすべてに表示するバッジ (省略可能)
    }
  ],

  // タブ切り替え後に更新処理を開始するまでの遅延時間 (ms) - デフォルト: 500
  "projectSettingsSync.debounceDelay": 200,

  // プロジェクト以外のファイルを開いた際に、適用済みの設定をリセットするか - デフォルト: false
  // false: 直前のプロジェクト設定を維持
  // true: 設定を自動的にクリーンアップして初期状態に戻す
  "projectSettingsSync.autoCleanup": false,

  // フォーカスモード（検索スコープ制御）を有効にするか - デフォルト: false
  // false: 全てのファイルが検索可能です
  // true: 開いているプロジェクト内のファイルしか検索にヒットしなくなります
  "projectSettingsSync.focusMode": true,
}
```

## 🎥 デモ

<img src="https://github.com/Hiroto-Shida/project-settings-sync/blob/main/assets/demo.gif">

`workbench.colorCustomizations.titleBar.activeBackground` にそれぞれ異なるカラーテーマを当てているプロジェクトの切り替え時に、自動でその設定が同期され、タブ切り替え時にカラーテーマが変わっています！
