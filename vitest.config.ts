import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify('test'),
    __BUILD_TIME__: JSON.stringify('1970-01-01T00:00:00.000Z'),
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
