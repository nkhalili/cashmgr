import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

const config = {
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  // Native modules and Electron itself cannot be bundled
  external: ['electron', 'better-sqlite3'],
  entryPoints: ['src/main.ts', 'src/preload.ts'],
  outdir: 'dist',
};

if (watch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await esbuild.build(config);
}
