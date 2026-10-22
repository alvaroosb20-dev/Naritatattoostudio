import { isAdmin, adminConfigured } from '../_lib/auth.js';
import { json, sameOrigin } from '../_lib/http.js';
import { supabaseConfig, listRows, getRow, updateRow, deleteRow, signFiles, removeFiles } from '../_lib/supabase.js';

const ESTADOS = ['pendiente', 'contactado', 'confirmada', 'descartada'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function guard(request, { write = false } = {}) {
  if (write && !sameOrigin(request)) return json({ ok: false, error: 'forbidden' }, 403);
  if (!adminConfigured()) return json({ ok: false, error: 'admin_not_configured' }, 503);
  if (!isAdmin(request)) return json({ ok: false, error: 'unauthorized' }, 401);
  const cfg = supabaseConfig();
  if (!cfg) return json({ ok: false, error: 'not_configured' }, 503);
  return cfg;
}

// GET /api/admin/reservas?estado=pendiente → lista con enlaces temporales a las fotos
export async function GET(request) {
  const cfg = guard(request);
  if (cfg instanceof Response) return cfg;
  const estado = new URL(request.url).searchParams.get('estado');
  try {
    const rows = await listRows(cfg, { estado: ESTADOS.includes(estado) ? estado : undefined });
    const signed = await signFiles(cfg, rows.flatMap((r) => r.fotos || []), 3600);
    for (const r of rows) r.fotos_urls = (r.fotos || []).map((p) => signed[p]).filter(Boolean);
    return json({ ok: true, rows });
  } catch (err) {
    console.error('[admin] Lectura:', err.message);
    return json({ ok: false, error: 'server_error' }, 502);
  }
}

// PATCH /api/admin/reservas { id, estado?, notas? }
export async function PATCH(request) {
  const cfg = guard(request, { write: true });
  if (cfg instanceof Response) return cfg;
  const body = await request.json().catch(() => ({}));
  if (!UUID_RE.test(body.id || '')) return json({ ok: false, error: 'bad_id' }, 400);
  const patch = {};
  if (body.estado !== undefined) {
    if (!ESTADOS.includes(body.estado)) return json({ ok: false, error: 'bad_estado' }, 400);
    patch.estado = body.estado;
  }
  if (body.notas !== undefined) patch.notas = String(body.notas).slice(0, 2000);
  if (!Object.keys(patch).length) return json({ ok: false, error: 'nothing_to_update' }, 400);
  try {
    const row = await updateRow(cfg, body.id, patch);
    return json({ ok: true, row });
  } catch (err) {
    console.error('[admin] Actualización:', err.message);
    return json({ ok: false, error: 'server_error' }, 502);
  }
}

// DELETE /api/admin/reservas?id=… → borra la solicitud y sus fotos (derecho de supresión)
export async function DELETE(request) {
  const cfg = guard(request, { write: true });
  if (cfg instanceof Response) return cfg;
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!UUID_RE.test(id)) return json({ ok: false, error: 'bad_id' }, 400);
  try {
    const row = await getRow(cfg, id);
    if (!row) return json({ ok: false, error: 'not_found' }, 404);
    await removeFiles(cfg, row.fotos || []);
    await deleteRow(cfg, id);
    return json({ ok: true });
  } catch (err) {
    console.error('[admin] Borrado:', err.message);
    return json({ ok: false, error: 'server_error' }, 502);
  }
}
