import * as fs from 'fs';
import * as path from 'path';

/**
 * 設定オブジェクト内のパス文字列（文字列、配列、オブジェクト）を検出し、
 * ルートからのプレフィックスを付与して変換します。
 */
export function resolveSettingsPaths(settings: any, prefix: string): any {
	const newSettings = JSON.parse(JSON.stringify(settings)); // Deep Copy

	for (const key in newSettings) {
		const value = newSettings[key];

		if (typeof value === 'string') {
			if (shouldPrefix(value)) {
				newSettings[key] = joinPath(prefix, value);
			}
		} else if (Array.isArray(value)) {
			newSettings[key] = value.map((item: any) => {
				if (typeof item === 'string' && shouldPrefix(item)) {
					return joinPath(prefix, item);
				}
				return item;
			});
		} else if (typeof value === 'object' && value !== null) {
			const newObj: { [key: string]: any } = {};
			for (const subKey in value) {
				let newSubKey = subKey;
				let newSubValue = value[subKey];

				if (shouldPrefix(subKey)) {
					newSubKey = joinPath(prefix, subKey);
				}
				if (typeof newSubValue === 'string' && shouldPrefix(newSubValue)) {
					newSubValue = joinPath(prefix, newSubValue);
				}
				newObj[newSubKey] = newSubValue;
			}
			newSettings[key] = newObj;
		}
	}
	return newSettings;
}

/**
 * 与えられた文字列が、プレフィックスを付与すべき「相対パス」かどうか判定します。
 * URLや絶対パスは除外します。
 */
function shouldPrefix(text: string): boolean {
	if (!text.includes('/')) {
		return false;
	}
	if (text.startsWith('http://') || text.startsWith('https://')) {
		return false;
	}
	if (path.isAbsolute(text)) {
		return false;
	}
	return true;
}

/**
 * パス結合ヘルパー。 "./" の除去とスラッシュ結合を行います。
 */
function joinPath(prefix: string, target: string): string {
	const cleanTarget = target.startsWith('./') ? target.substring(2) : target;
	return `${prefix}/${cleanTarget}`;
}

/**
 * 現在のファイルパスから遡って、最も近い .vscode/settings.json のあるディレクトリを探します。
 */
export function findSettingsDir(
	currentFilePath: string,
	rootPath: string,
): string | null {
	let dir = path.dirname(currentFilePath);
	while (dir.startsWith(rootPath) && dir !== rootPath) {
		const settingsPath = path.join(dir, '.vscode', 'settings.json');
		if (fs.existsSync(settingsPath)) {
			return dir;
		}
		const parentDir = path.dirname(dir);
		if (parentDir === dir) {
			break;
		}
		dir = parentDir;
	}
	return null;
}
