# Change Log

All notable changes to the "project-settings-sync" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

# Change Log

## [0.1.0] - 2025-12-10

### Added
- **Output Logging**: Added an Output Channel for easier debugging. You can check logs via "Output: Project Settings Sync".
- **Documentation**: Added troubleshooting guide for conflicts with other extensions (e.g., i18n-ally).

## [0.0.1] - 2025-12-07

### Added

- **Initial Release**: Released Project Settings Sync extension.
- **Settings Sync**: Automatically syncs `.vscode/settings.json` from sub-directories to the root workspace settings based on the active file.
- **Context Switching**:
  - **Focus Mode**: Automatically updates `search.exclude` to hide files from inactive projects, reducing search noise.
  - **Path Rewriting**: Automatically converts relative paths (e.g., `node_modules/...` or `./src`) in sub-project settings to be root-relative.
- **Visual Cues**:
  - **Project Badges**: Adds customizable badges to the File Explorer and Editor Tabs to identify the active project context.
  - Supports separate badges for Root folders and Files.
- **Configuration Options**:
  - `projectSettingsSync.mappings`: Define project paths and badge styles.
  - `projectSettingsSync.focusMode`: Toggle search scope control.
  - `projectSettingsSync.debounceDelay`: Adjust delay for syncing settings (default: 500ms).
  - `projectSettingsSync.autoCleanup`: Toggle whether to reset settings when opening a file outside of mapped projects.
- **Performance**:
  - Implemented debounce logic for rapid tab switching.
  - Optimized file I/O by checking file status before writing.
