import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['packages/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'dist/',
                'bundle/',
                '**/*.d.ts',
                '**/*.config.{js,ts}',
                '**/scripts/**',
                '**/.{cache,temp,tmp,build,output}/**'
            ],
            thresholds: {
                global: {
                    branches: 80,
                    functions: 80,
                    lines: 80,
                    statements: 80
                }
            }
        },
        setupFiles: ['./tests/setup.ts']
    },
    resolve: {
        alias: {
            '@freedom/shared': resolve(__dirname, 'packages/shared/src'),
            '@freedom/cli': resolve(__dirname, 'packages/cli/src'),
            '@freedom/core': resolve(__dirname, 'packages/core/src'),
            '@freedom/test-utils': resolve(__dirname, 'packages/test-utils/src')
        }
    }
});
//# sourceMappingURL=vitest.config.js.map