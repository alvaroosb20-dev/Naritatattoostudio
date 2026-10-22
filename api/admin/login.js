import { adminConfigured, checkPassword, sessionCookie, clearCookie } from '../_lib/auth.js';
import { json, sameOrigin } from '../_lib/http.js';

// POST /api/admin/login  { password }   → inicia sesión
// DELETE /api/admin/login               → cierra sesión
export async function POST(request) {
  if (!sameOrigin(request)) return json({ ok: false, error: 'forbidden' }, 403);
  if (!adminConfigured()) return json({ ok: false, error: 'not_configured' }, 503);

  let body = {};
  try {
    body = await request.json();
  } catch {
    /* cuerpo vacío */
  }

  if (!checkPassword(body.password)) {
    // Pequeña espera para frenar intentos por fuerza bruta
    await new Promise((r) => setTimeout(r, 800));
    return json({ ok: false, error: 'wrong_password' }, 401);
  }
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(request) });
}

export function DELETE() {
  return json({ ok: true }, 200, { 'Set-Cookie': clearCookie() });
}
