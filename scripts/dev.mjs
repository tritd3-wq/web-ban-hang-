import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import admin from '../api/admin.js';
import adminPage from '../api/admin-page.js';
import content from '../api/content.js';
import leads from '../api/leads.js';

const root = resolve('dist');
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff': 'font/woff', '.woff2': 'font/woff2', '.mp4': 'video/mp4'
};
const handlers = new Map([
  ['/admin', adminPage], ['/api/admin-page', adminPage], ['/api/admin', admin],
  ['/api/content', content], ['/api/leads', leads]
]);
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const handler = handlers.get(pathname);
    if (handler) return await handler(req, res);
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + sep)) throw new Error('Invalid path');
    const info = await stat(file);
    if (!info.isFile()) throw new Error('Not a file');
    res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404).end('Not found');
  }
});
server.listen(Number(process.env.PORT) || 3000, '127.0.0.1', () => {
  console.log('Website http://127.0.0.1:' + server.address().port + ' · Admin /admin');
});
