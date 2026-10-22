// POST /api/reservas — recibe una solicitud de cita del formulario.
// Guarda los datos en Supabase (tabla «reservas») y las fotos en un bucket privado («referencias»).

import { randomUUID } from 'node:crypto';
import { validateBooking, FILE_RULES } from '../assets/js/booking-rules.js';
import { supabaseConfig, uploadFile, insertRow, removeFiles } from './_lib/supabase.js';
import { notifyStudio } from './_lib/notify.js';
import { json, sameOrigin } from './_lib/http.js';

const MIN_FILL_MS = 3000; // nadie rellena el formulario en menos de 3 segundos

function sniffImage(bytes) {
  const b = bytes;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', type: 'image/jpeg' };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: 'png', type: 'image/png' };
  if (String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') {
    return { ext: 'webp', type: 'image/webp' };
  }
  const brand = String.fromCharCode(...b.slice(4, 12));
  if (/^ftyp(heic|heix|hevc|heim|heis|mif1|msf1)/.test(brand)) return { ext: 'heic', type: 'image/heic' };
  return null;
}

export async function POST(request) {
  if (!sameOrigin(request)) return json({ ok: false, error: 'forbidden' }, 403);

  const cfg = supabaseConfig();
  if (!cfg) {
    console.error('[reservas] Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
    return json({ ok: false, error: 'not_configured' }, 503);
  }

  const length = Number(request.headers.get('content-length') || 0);
  if (length > FILE_RULES.maxTotalBytes + 200_000) return json({ ok: false, error: 'too_large' }, 413);

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: 'bad_request' }, 400);
  }

  // Filtros anti-bots: campo trampa y tiempo mínimo de relleno.
  // Respondemos como si todo fuera bien para no dar pistas.
  const started = Number(form.get('t') || 0);
  if (form.get('empresa') || (started && Date.now() - started < MIN_FILL_MS)) {
    return json({ ok: true }, 201);
  }

  const raw = {};
  for (const [k, v] of form.entries()) if (typeof v === 'string') raw[k] = v;
  // Margen de un día por la diferencia horaria entre el servidor y Canarias
  const { data, errors } = validateBooking(raw, new Date(Date.now() - 24 * 3600 * 1000));

  // Fotos
  const files = form.getAll('fotos').filter((f) => typeof f === 'object' && f && f.size > 0);
  const photos = [];
  if (files.length > FILE_RULES.maxFiles) {
    errors.fotos = `Puedes adjuntar como máximo ${FILE_RULES.maxFiles} fotos.`;
  } else {
    let total = 0;
    for (const f of files) {
      total += f.size;
      if (f.size > FILE_RULES.maxFileBytes) {
        errors.fotos = 'Alguna foto pesa demasiado.';
        break;
      }
      const bytes = new Uint8Array(await f.arrayBuffer());
      const kind = sniffImage(bytes.slice(0, 16));
      if (!kind) {
        errors.fotos = 'Solo se aceptan imágenes JPG, PNG, WEBP o HEIC.';
        break;
      }
      photos.push({ bytes, ...kind });
    }
    if (total > FILE_RULES.maxTotalBytes) errors.fotos = 'Las fotos ocupan demasiado en total.';
  }

  if (Object.keys(errors).length) return json({ ok: false, errors }, 400);

  const id = randomUUID();
  const paths = photos.map((p, i) => `${id}/${i + 1}.${p.ext}`);

  try {
    await Promise.all(photos.map((p, i) => uploadFile(cfg, paths[i], new Blob([p.bytes], { type: p.type }), p.type)));

    const row = {
      id,
      nombre: data.nombre,
      telefono: data.telefono,
      email: data.email,
      tipo: data.tipo,
      zona: data.zona,
      tamano: data.tamano,
      estilo: data.estilo,
      descripcion: data.descripcion,
      presupuesto: data.presupuesto,
      fecha_preferida: data.fecha,
      horario: data.horario,
      fotos: paths,
      acepta_privacidad: true,
      estado: 'pendiente',
    };
    await insertRow(cfg, row);

    const adminUrl = `${new URL(request.url).origin}/admin`;
    try {
      await notifyStudio(row, { photoCount: paths.length, adminUrl });
    } catch (err) {
      // El aviso por correo es secundario: la solicitud ya está guardada.
      console.error('[reservas] No se pudo enviar el aviso por correo:', err.message);
    }

    return json({ ok: true }, 201);
  } catch (err) {
    console.error('[reservas] Error guardando la solicitud:', err.message);
    await removeFiles(cfg, paths).catch(() => {});
    return json({ ok: false, error: 'server_error' }, 502);
  }
}

export function GET() {
  return json({ ok: false, error: 'method_not_allowed' }, 405, { Allow: 'POST' });
}
