import * as fs from 'fs';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findSettingsDir, resolveSettingsPaths } from '../../utils/pathUtils';

// fsモジュールをモック化（実際にファイルシステムを触らないようにする）
vi.mock('fs');

describe('pathUtils', () => {
	describe('resolveSettingsPaths', () => {
		it('文字列の相対パスにプレフィックスを付与する', () => {
			const settings = {
				'typescript.tsdk': 'node_modules/typescript/lib',
			};
			const prefix = 'src/project1';

			const result = resolveSettingsPaths(settings, prefix);

			expect(result['typescript.tsdk']).toBe(
				'src/project1/node_modules/typescript/lib',
			);
		});

		it('配列内のパスにも適用する', () => {
			const settings = {
				locales: ['locales/en', 'locales/ja'],
			};
			const prefix = 'packages/app';

			const result = resolveSettingsPaths(settings, prefix);

			expect(result['locales']).toEqual([
				'packages/app/locales/en',
				'packages/app/locales/ja',
			]);
		});

		it('絶対パスやURLは無視する', () => {
			const settings = {
				absolute: '/usr/local/bin',
				url: 'https://example.com/schema.json',
			};
			const prefix = 'src';

			const result = resolveSettingsPaths(settings, prefix);

			expect(result['absolute']).toBe('/usr/local/bin');
			expect(result['url']).toBe('https://example.com/schema.json');
		});

		it('ネストしたオブジェクトのキーと値も変換する', () => {
			const settings = {
				'yaml.schemas': {
					'./schemas/config.json': 'src/config/*.yaml',
				},
			};
			const prefix = 'project';

			const result = resolveSettingsPaths(settings, prefix);

			// キーの "./" が除去されて結合されること
			expect(result['yaml.schemas']).toHaveProperty(
				'project/schemas/config.json',
			);
			// 値も変換されること
			expect(result['yaml.schemas']['project/schemas/config.json']).toBe(
				'project/src/config/*.yaml',
			);
		});
	});

	describe('findSettingsDir', () => {
		// fs.existsSync のモック実装
		beforeEach(() => {
			vi.resetAllMocks();
		});

		it('settings.jsonが存在するディレクトリを見つける', () => {
			// モック: 特定のパスのみ true を返すように設定
			vi.spyOn(fs, 'existsSync').mockImplementation((pathToCheck) => {
				// Windows/Linuxパス区切りの違いを吸収して比較
				const p = pathToCheck.toString();
				return p.includes(path.join('project1', '.vscode', 'settings.json'));
			});

			const currentFile = path.join('/root', 'project1', 'src', 'index.ts');
			const rootPath = '/root';

			const result = findSettingsDir(currentFile, rootPath);

			// 期待値: /root/project1
			expect(result).toBe(path.join('/root', 'project1'));
		});

		it('見つからなければ null を返す', () => {
			vi.spyOn(fs, 'existsSync').mockReturnValue(false);

			const currentFile = path.join('/root', 'project1', 'index.ts');
			const rootPath = '/root';

			const result = findSettingsDir(currentFile, rootPath);

			expect(result).toBeNull();
		});
	});
});
