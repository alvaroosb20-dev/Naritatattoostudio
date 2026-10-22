// Servidor local para probar la web igual que en Vercel (archivos estáticos + /api).
// Uso: node dev-server.mjs   (lee variables de un archivo .env si existe)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const vercel = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));

if (existsSync(join(ROOT, '.env'))) {
  for (const line of readFileSync(join(ROOT, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain',
};

const globalHeaders = vercel.headers.find((h) => h.source === '/(.*)').headers;

async function fileFor(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const candidates = clean.endsWith('/') ? [join(clean, 'index.html')] : [clean, `${clean}.html`];
  for (const c of candidates) {
    const full = join(ROOT, c);
    if (!full.startsWith(ROOT)) continue;
    try {
      if ((await stat(full)).isFile()) return full;
    } catch {}
  }
  return null;
}

async function handleApi(req, res, url) {
  const file = join(ROOT, `${url.pathname.replace(/\/$/, '')}.js`);
  if (!existsSync(file) || /\/_/.test(url.pathname)) return false;
  const mod = await import(pathToFileURL(file).href + `?t=${Date.now()}`);
  const handler = mod[req.method];
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const request = new Request(`http://${req.headers.host}${url.pathname}${url.search}`, {
    method: req.method,
    headers: req.headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
  });
  const response = handler ? await handler(request) : new Response('Method Not Allowed', { status: 405 });
  const headers = {};
  response.headers.forEach((v, k) => (headers[k] = v));
  res.writeHead(response.status, headers);
  res.end(Buffer.from(await response.arrayBuffer()));
  return true;
}

createServer(async (req, res) => {
  try {
    let url = new URL(req.url, `http://${req.headers.host}`);
    for (const r of vercel.rewrites || []) {
      if (url.pathname === r.source) url = new URL(r.destination, url);
    }
    globalHeaders.forEach(({ key, value }) => key !== 'Strict-Transport-Security' && res.setHeader(key, value));

    if (url.pathname.startsWith('/api/') && (await handleApi(req, res, url))) return;

    if (url.pathname.endsWith('.html')) {
      res.writeHead(308, { Location: url.pathname.replace(/(index)?\.html$/, '') || '/' });
      return res.end();
    }
    const file = await fileFor(url.pathname === '/' ? '/index.html' : url.pathname);
    if (!file) {
      res.writeHead(404, { 'Content-Type': TYPES['.html'] });
      return res.end(await readFile(join(ROOT, '404.html')));
    }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch (err) {
    console.error(err);
    res.writeHead(500);
    res.end('Error interno');
  }
}).listen(PORT, () => console.log(`Narita Tattoo en http://localhost:${PORT}`));
