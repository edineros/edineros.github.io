import { defineConfig } from 'vitest/config';
import { transformWithEsbuild, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// react-native-qrcode-svg ships JSX in a plain .js file. Rollup's parser can't
// handle that during `vite build` (optimizeDeps.esbuildOptions only covers dev),
// so strip JSX via esbuild before Rollup sees them. Scoped to node_modules .js
// files that actually look like they contain JSX, so we don't pay an esbuild
// pass for every file.
const JSX_LIKE = /<[A-Za-z][^>]*>/;

function jsxInNodeModulesJs(): Plugin {
  return {
    name: 'jsx-in-node-modules-js',
    async transform(code, id) {
      if (!id.includes('node_modules') || !id.endsWith('.js') || !JSX_LIKE.test(code)) {
        return null;
      }
      const result = await transformWithEsbuild(code, id, { loader: 'jsx', jsx: 'automatic' });
      return { code: result.code };
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), jsxInNodeModulesJs()],
  resolve: {
    alias: [
      { find: /^react-native$/, replacement: 'react-native-web' },
      // react-native-svg and react-native-safe-area-context's compiled lib/
      // output has no .web variants, so it unconditionally pulls in the real
      // react-native package's Flow-typed internals. Their src/ is plain TS
      // and has .web.ts(x) variants that our extension order below resolves
      // correctly instead (same as Metro's "react-native" package.json field).
      { find: /^react-native-svg$/, replacement: 'react-native-svg/src/index.ts' },
      {
        find: /^react-native-safe-area-context$/,
        replacement: 'react-native-safe-area-context/src/index.tsx',
      },
    ],
    extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.json'],
  },
  define: {
    global: 'globalThis',
    __DEV__: JSON.stringify(mode !== 'production'),
    // Tamagui's core reads many process.env.* feature flags at runtime (not
    // just NODE_ENV). There's no `process` global in the browser, so without
    // this the first access throws "process is not defined". Replacing the
    // whole `process.env` expression means every `process.env.X` access just
    // resolves to `undefined` instead.
    'process.env': '{}',
  },
  optimizeDeps: {
    esbuildOptions: {
      // react-native-qrcode-svg ships JSX in a plain .js file
      loader: { '.js': 'jsx' },
      // The dep optimizer's esbuild pass has its own extension order,
      // separate from `resolve.extensions` above. Without this, extensionless
      // imports inside react-native-svg/react-native-safe-area-context resolve
      // to their plain (native) files instead of the .web ones.
      resolveExtensions: [
        '.web.tsx',
        '.web.ts',
        '.web.jsx',
        '.web.js',
        '.tsx',
        '.ts',
        '.jsx',
        '.js',
        '.json',
      ],
      // The dep optimizer's esbuild pass doesn't inherit the root `define`
      // above, so dependencies (tamagui) that read process.env.* still see a
      // bare `process` and throw at runtime unless it's repeated here.
      define: { 'process.env': '{}' },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
}));
