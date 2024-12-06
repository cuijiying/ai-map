import { defineConfig } from 'vite';

/** @type {import('vite').UserConfig} */
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts', // 将入口文件指向 TypeScript 文件
      name: 'AIMap',
    // //   fileName: (format) => `aimap.${format}.${Date.now()}.js`,
      fileName: (format) => `ai-map.${format}.js`,
    }
  },
});
