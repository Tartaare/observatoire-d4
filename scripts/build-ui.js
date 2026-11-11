import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
await mkdir(new URL('../assets/generated/', import.meta.url), {recursive: true});
await build({
  absWorkingDir: root,
  entryPoints: {'appearance': 'src/appearance/main.tsx', 'theme': 'src/appearance/bootstrap.js'},
  outdir: 'assets/generated',
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2022'],
  jsx: 'automatic',
  define: {'process.env.NODE_ENV': '"production"'},
  logLevel: 'info',
});
const css = spawnSync(process.execPath, [
  ...process.execArgv, 'node_modules/tailwindcss/lib/cli.js',
  '--config', 'tailwind.config.js', '--input', 'assets/css/appearance.css',
  '--output', 'assets/generated/appearance.css', '--minify',
], {cwd: root, stdio: 'inherit'});
if (css.status !== 0) throw css.error ?? new Error(`Compilation CSS échouée (${css.status}).`);
