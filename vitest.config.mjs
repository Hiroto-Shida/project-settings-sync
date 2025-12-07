import { defineConfig } from 'vitest/config';
export default defineConfig({
    test: {
        // VS Code拡張機能開発では Node.js 環境で動かすのが一般的
        environment: 'node',
        // テスト対象のファイルパターン
        include: ['src/__test__/**/*.test.ts'],
        // 依存関係の解決設定（必要に応じて）
        deps: {
            interopDefault: true,
        },
    },
});
//# sourceMappingURL=vitest.config.mjs.map