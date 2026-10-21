import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/tercios/',
  test: { include: ['src/**/*.test.ts'] },
});
