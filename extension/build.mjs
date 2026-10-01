import { context } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const watch = process.argv.includes('--watch');

// Cada navegador recebe so as chaves que usa (Chrome: `service_worker`; Firefox: `scripts` e
// `browser_specific_settings`), sem os avisos de chave desconhecida do manifest hibrido.
const targets = {
  chrome: 'chrome120',
  firefox: 'firefox140',
};

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const base = await readJson('manifests/base.json');

await rm('dist', { recursive: true, force: true });

const contexts = [];
for (const [browser, esbuildTarget] of Object.entries(targets)) {
  const outdir = `dist/${browser}`;
  await mkdir(outdir, { recursive: true });
  await cp('static', outdir, { recursive: true });

  const manifest = { ...base, ...(await readJson(`manifests/${browser}.json`)) };
  await writeFile(`${outdir}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);

  // IIFE: content script e background (scripts do Firefox) rodam como script classico, sem import.
  contexts.push(
    await context({
      entryPoints: ['src/background.ts', 'src/content.ts', 'src/popup.ts'],
      outdir,
      bundle: true,
      format: 'iife',
      target: [esbuildTarget],
      logLevel: 'info',
    }),
  );
}

if (watch) {
  await Promise.all(contexts.map((ctx) => ctx.watch()));
} else {
  await Promise.all(contexts.map((ctx) => ctx.rebuild()));
  await Promise.all(contexts.map((ctx) => ctx.dispose()));
}
