import * as path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectDecorationProvider } from '../../features/badgeProvider';

// vi.hoisted を使って、モック内で使う変数を先に定義する
const { mockConfigGet, mockWorkspaceFolders } = vi.hoisted(() => {
	return {
		mockConfigGet: vi.fn(),
		mockWorkspaceFolders: [{ uri: { fsPath: '/root' } }],
	};
});

// 1. vscodeモジュールを完全にモック化
vi.mock('vscode', () => {
	return {
		workspace: {
			getConfiguration: () => ({
				get: mockConfigGet, // hoistedされた変数なら参照できる
			}),
			workspaceFolders: mockWorkspaceFolders, // hoistedされた変数なら参照できる
		},
		Uri: {
			file: (path: string) => ({ fsPath: path }),
			parse: (path: string) => ({ fsPath: path }),
		},
		EventEmitter: class {
			event = vi.fn();
			fire() {}
		},
		FileDecoration: class {},
	};
});

describe('ProjectDecorationProvider', () => {
	let provider: ProjectDecorationProvider;

	beforeEach(() => {
		vi.clearAllMocks();
		provider = new ProjectDecorationProvider();
	});

	it('マッピングがない場合は undefined を返す', () => {
		mockConfigGet.mockReturnValue(undefined); // mappings設定なし
		const uri = { fsPath: '/root/some/file.ts' } as any;

		expect(provider.provideFileDecoration(uri)).toBeUndefined();
	});

	it('ルートフォルダに一致する場合、rootバッジを返す', () => {
		mockConfigGet.mockReturnValue([
			{ path: 'project1', badge: { root: 'R', file: 'F' } },
		]);

		const folderPath = path.join('/root', 'project1');
		const uri = { fsPath: folderPath } as any;

		const result = provider.provideFileDecoration(uri);

		expect(result).toBeDefined();
		expect(result?.badge).toBe('R');
		expect(result?.propagate).toBe(false);
	});

	it('子ファイルに一致する場合、fileバッジを返す', () => {
		mockConfigGet.mockReturnValue([
			{ path: 'project1', badge: { root: 'R', file: 'F' } },
		]);

		const filePath = path.join('/root', 'project1', 'src', 'index.ts');
		const uri = { fsPath: filePath } as any;

		const result = provider.provideFileDecoration(uri);

		expect(result).toBeDefined();
		expect(result?.badge).toBe('F');
		expect(result?.propagate).toBe(false);
	});

	it('文字列指定（ショートハンド）の場合、両方に同じバッジが適用される', () => {
		mockConfigGet.mockReturnValue([{ path: 'project1', badge: '🟣' }]);

		const folderPath = path.join('/root', 'project1');
		const filePath = path.join('/root', 'project1', 'file.ts');

		const folderResult = provider.provideFileDecoration({
			fsPath: folderPath,
		} as any);
		expect(folderResult?.badge).toBe('🟣');

		const fileResult = provider.provideFileDecoration({
			fsPath: filePath,
		} as any);
		expect(fileResult?.badge).toBe('🟣');
	});

	it('パスが一致しない場合は undefined', () => {
		mockConfigGet.mockReturnValue([{ path: 'project1', badge: 'P1' }]);

		const otherPath = path.join('/root', 'other-project', 'file.ts');
		const result = provider.provideFileDecoration({ fsPath: otherPath } as any);

		expect(result).toBeUndefined();
	});
});
