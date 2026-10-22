// /sitemap.xml y /robots.txt (vía vercel.json) usando el dominio real de la petición,
// así no hay que escribir el dominio a mano.

function origin(request) {
  const env = (process.env.SITE_URL || '').replace(/\/+$/, '');
  return env || new URL(request.url).origin;
}

export function GET(request) {
  const url = new URL(request.url);
  const base = origin(request);

  if (url.searchParams.get('file') === 'robots') {
    const body = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${base}/sitemap.xml\n`;
    return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
  }

  const pages = [
    ['/', '1.0'],
    ['/privacidad', '0.2'],
    ['/aviso-legal', '0.2'],
    ['/cookies', '0.2'],
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(([p, prio]) => `  <url><loc>${base}${p}</loc><priority>${prio}</priority></url>`).join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
