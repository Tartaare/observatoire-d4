import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
await mkdir(new URL('../supabase/functions/observatoire/', import.meta.url), {recursive: true});
await build({absWorkingDir: root, entryPoints: ['cloud/entry.ts'], outfile: 'supabase/functions/observatoire/index.ts',
  bundle: true, platform: 'neutral', mainFields: ['module', 'main'], conditions: ['import'], format: 'esm', target: 'es2022'});
await build({absWorkingDir: root, stdin: {contents: `export * from '../cloud/api.ts';
export * from '../cloud/collector.ts'; export * from '../cloud/projection.ts'; export * from '../cloud/reader.ts';`, resolveDir: fileURLToPath(new URL('./', import.meta.url))},
  outfile: 'artifacts/cloud.mjs', bundle: true, platform: 'node', format: 'esm', target: 'es2022'});
