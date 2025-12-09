# Project Settings Sync

[**🇯🇵 日本語のドキュメントはこちら (Read in Japanese)**](https://github.com/Hiroto-Shida/project-settings-sync/blob/main/README-ja.md)

---

A VS Code extension that powerfully supports development in **Monorepo** or **Multi-project** configurations.

It automatically syncs sub-project settings to the root based on the currently open file or directory, seamlessly switching the development context (settings, search scope, and appearance).

## ✨ Features

1.  **Settings Sync**
    - Automatically reads `.vscode/settings.json` from sub-directories (projects) and merges them into the root workspace settings.
    - **Problem Solved:** By default, VS Code only recognizes `.vscode/settings.json` at the project root. Settings located in sub-directories (e.g., `projectXxx/.vscode/settings.json`) are ignored when working from the parent directory. This extension solves this issue.
    - Simply switching tabs automatically applies project-specific settings, such as formatters and linters.
    - Automatically rewrites relative paths in `settings.json` (e.g., `node_modules/...`) to root-relative paths (e.g., `apps/app1/node_modules/...`) to ensure they work correctly.

2.  **Focus Mode**
    - Automatically excludes files outside the active project from search results (`Cmd+P`, Quick Open, and full-text search).
    - Eliminates noise from duplicate filenames or unrelated code in other projects.

3.  **Project Badge**
    - Displays a "Badge" (icon or short text) next to the folder in the Explorer and on the open tab.
    - Allows you to instantly recognize which project's files you are currently working on.

## ⚙️ Configuration (Usage)

Below is an example configuration for a project structure like this:

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

Add the following configuration to your **root** `.vscode/settings.json`:

```json
{
  // Settings for project paths and badges to enable the extension for
  "projectSettingsSync.mappings": [
    {
      "path": "project1",
      "badge": {
        "root": "🟦", // Badge to display on the project root folder (optional)
        "file": "🔵"  // Badge to display on the file/tab (optional)
      }
    },
    {
      "path": "admin-project/projectX",
      "badge": "🟥"   // Badge to display on both directory and files (optional)
    }
  ],

  // Delay time (ms) before starting the update process after switching tabs - Default: 500
  "projectSettingsSync.debounceDelay": 200,

  // Whether to reset applied settings when opening a file outside the projects - Default: false
  // false: Maintains the previous project settings
  // true: Automatically cleans up settings to restore the initial state
  "projectSettingsSync.autoCleanup": false,

  // Whether to enable Focus Mode (Search Scope Control) - Default: false
  // false: All files are searchable
  // true: Only files within the open project will appear in search results
  "projectSettingsSync.focusMode": true
}
```

🎥 Demo

<img src="https://github.com/Hiroto-Shida/project-settings-sync/blob/main/assets/demo.gif">

In this demo, different color themes are applied to `workbench.colorCustomizations.titleBar.activeBackground` for each project.
As you can see, the settings are automatically synced and the color theme changes instantly when switching tabs!