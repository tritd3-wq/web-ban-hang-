import { copyFile, cp, mkdir, readdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'dist');
if (root !== process.cwd() || dirname(output) !== root) throw new Error('Run the build from the project directory');
await rm(output, { recursive: true, force: true });
await mkdir('dist', { recursive: true });
const files = await readdir('.', { withFileTypes: true });
await Promise.all(files.filter(file => file.isFile() && /\.(html|js|css|png|webp|jpe?g)$/.test(file.name))
  .map(file => copyFile(file.name, 'dist/' + file.name)));
await Promise.all(['fonts', 'posters', 'videos'].map(dir => cp(dir, 'dist/' + dir, { recursive: true })));
