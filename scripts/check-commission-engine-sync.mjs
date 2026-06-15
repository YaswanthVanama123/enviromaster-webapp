import { build } from 'esbuild';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const committedPath = path.resolve(
  root,
  '../enviromaster-server/src/shared/commission-engine/engine.mjs',
);
const banner =
  '// GENERATED FILE - do not edit by hand. Source: enviromaster-webapp/src/shared/commission-engine. Rebuild: npm run build:commission-engine';

const result = await build({
  entryPoints: [path.join(root, 'src/shared/commission-engine/index.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node18',
  legalComments: 'none',
  banner: { js: banner },
  write: false,
});

const fresh = result.outputFiles[0].text.trim();

let committed = '';
try {
  committed = readFileSync(committedPath, 'utf8').trim();
} catch {
  committed = '';
}

if (fresh !== committed) {
  console.error(
    '❌ commission-engine bundle is OUT OF SYNC with the TypeScript source.\n' +
      '   Run: npm run build:commission-engine  (and commit the regenerated engine.mjs)',
  );
  process.exit(1);
}

console.log('✓ commission-engine bundle is in sync with source');
