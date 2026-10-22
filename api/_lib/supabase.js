// Cliente mínimo de Supabase (REST) sin dependencias.
// Usa la clave service_role, que SOLO existe en el servidor (variables de entorno de Vercel).

export const BUCKET = 'referencias';
export const TABLE = 'reservas';

export function supabaseConfig() {
  const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  return { url, key };
}

function headers(cfg, extra = {}) {
  return { apikey: cfg.key, Authorization: `Bearer ${cfg.key}`, ...extra };
}

async function check(res, what) {
  if (res.ok) return res;
  const text = await res.text().catch(() => '');
  const err = new Error(`${what} falló (${res.status}): ${text.slice(0, 300)}`);
  err.status = res.status;
  throw err;
}

export async function uploadFile(cfg, path, blob, contentType) {
  const res = await fetch(`${cfg.url}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: headers(cfg, { 'Content-Type': contentType, 'x-upsert': 'false', 'cache-control': '3600' }),
    body: blob,
  });
  await check(res, 'Subida de foto');
}

export async function removeFiles(cfg, paths) {
  if (!paths.length) return;
  const res = await fetch(`${cfg.url}/storage/v1/object/${BUCKET}`, {
    method: 'DELETE',
    headers: headers(cfg, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ prefixes: paths }),
  });
  await check(res, 'Borrado de fotos');
}

/** Devuelve { path: urlFirmada } válidas durante `expiresIn` segundos. */
export async function signFiles(cfg, paths, expiresIn = 3600) {
  if (!paths.length) return {};
  const res = await fetch(`${cfg.url}/storage/v1/object/sign/${BUCKET}`, {
    method: 'POST',
    headers: headers(cfg, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ expiresIn, paths }),
  });
  await check(res, 'Firma de enlaces');
  const list = await res.json();
  const out = {};
  for (const item of list) {
    if (item.signedURL) out[item.path] = `${cfg.url}/storage/v1${item.signedURL}`;
  }
  return out;
}

export async function insertRow(cfg, row) {
  const res = await fetch(`${cfg.url}/rest/v1/${TABLE}`, {
    method: 'POST',
    headers: headers(cfg, { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify(row),
  });
  await check(res, 'Guardado de la solicitud');
}

export async function listRows(cfg, { estado } = {}) {
  const params = new URLSearchParams({ select: '*', order: 'created_at.desc', limit: '300' });
  if (estado) params.set('estado', `eq.${estado}`);
  const res = await fetch(`${cfg.url}/rest/v1/${TABLE}?${params}`, { headers: headers(cfg) });
  await check(res, 'Lectura de solicitudes');
  return res.json();
}

export async function getRow(cfg, id) {
  const params = new URLSearchParams({ select: '*', id: `eq.${id}` });
  const res = await fetch(`${cfg.url}/rest/v1/${TABLE}?${params}`, { headers: headers(cfg) });
  await check(res, 'Lectura de solicitud');
  const rows = await res.json();
  return rows[0] || null;
}

export async function updateRow(cfg, id, patch) {
  const res = await fetch(`${cfg.url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: headers(cfg, { 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    body: JSON.stringify(patch),
  });
  await check(res, 'Actualización de solicitud');
  const rows = await res.json();
  return rows[0] || null;
}

export async function deleteRow(cfg, id) {
  const res = await fetch(`${cfg.url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: headers(cfg),
  });
  await check(res, 'Borrado de solicitud');
}
