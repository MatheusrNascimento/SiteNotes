import { context } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';

const outdir = 'dist';
const watch = process.argv.includes('--watch');

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });
await cp('static', outdir, { recursive: true });

// IIFE: content script e background (scripts do Firefox) rodam como script classico, sem import.
const ctx = await context({
  entryPoints: ['src/background.ts', 'src/content.ts', 'src/popup.ts'],
  outdir,
  bundle: true,
  format: 'iife',
  target: ['chrome120', 'firefox140'],
  logLevel: 'info',
});

if (watch) {
  await ctx.watch();
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
