import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['./src/handler.ts'],
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  outdir: './build',
  outExtension: { '.js': '.mjs' },
  minify: true,
  treeShaking: true,
  sourcemap: true,
  external: ['@aws-sdk/*'],
  mainFields: ['module', 'main'],
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);"
  },
});

console.log('build complete');
