import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
export default defineConfig({ resolve: { alias: { '@': resolve(__dirname, 'src'), 'server-only': resolve(__dirname, 'tests/gate1/server-only.ts') } }, test: { include: ['tests/gate1/*.test.ts'], fileParallelism: false, testTimeout: 20000, hookTimeout: 30000 } });
