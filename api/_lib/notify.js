import { escapeHtml } from './http.js';

// Aviso por correo al estudio cuando entra una solicitud nueva (opcional).
// Funciona con Resend (https://resend.com). Si faltan las variables, simplemente no se envía:
// la solicitud ya está guardada en la base de datos y se ve en /admin.

export async function notifyStudio(booking, { photoCount, adminUrl }) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL_TO;
  const from = process.env.NOTIFY_EMAIL_FROM;
  if (!apiKey || !to || !from) return { sent: false, reason: 'not_configured' };

  const rows = [
    ['Nombre', booking.nombre],
    ['Teléfono', booking.telefono],
    ['Correo', booking.email],
    ['Tipo', booking.tipo],
    ['Estilo', booking.estilo],
    ['Zona', booking.zona],
    ['Tamaño', booking.tamano],
    ['Presupuesto', booking.presupuesto],
    ['Fecha preferida', booking.fecha_preferida],
    ['Horario preferido', booking.horario],
    ['Fotos adjuntas', String(photoCount)],
  ];

  const html = `
  <div style="font-family:Helvetica,Arial,sans-serif;color:#1c1815;max-width:560px">
    <h2 style="font-weight:400">Nueva solicitud de cita</h2>
    <table style="border-collapse:collapse;width:100%">
      ${rows.map(([k, v]) => `<tr><td style="padding:6px 10px 6px 0;color:#7a7065;white-space:nowrap">${k}</td><td style="padding:6px 0">${escapeHtml(v)}</td></tr>`).join('')}
    </table>
    <p style="margin-top:16px;color:#7a7065">Idea:</p>
    <p style="white-space:pre-wrap">${escapeHtml(booking.descripcion)}</p>
    <p style="margin-top:24px"><a href="${escapeHtml(adminUrl)}" style="background:#cba56b;color:#14110f;padding:10px 18px;border-radius:99px;text-decoration:none">Ver la solicitud y las fotos</a></p>
    <p style="color:#9d9385;font-size:12px">La solicitud está pendiente hasta que el estudio confirme la cita con el cliente.</p>
  </div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: to.split(',').map((s) => s.trim()).filter(Boolean),
      reply_to: booking.email,
      subject: `Nueva solicitud de cita: ${booking.nombre}`,
      html,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return { sent: true };
}
