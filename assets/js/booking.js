import { OPTIONS, FILE_RULES, dateLimits, validateBooking } from './booking-rules.js';
import { links } from './main.js';
import { SITE } from './config.js';

const WA_NUMBER = String(SITE.whatsapp || '').replace(/\D/g, '');

function fmtDate(iso) {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** Mensaje de WhatsApp con todos los datos de la solicitud, listo para enviar al estudio. */
function whatsappMessage(raw, photoCount, saved) {
  const desc = raw.descripcion.trim();
  const lines = [
    '*Solicitud de cita · Narita Tattoo Studio*',
    '',
    `*Nombre:* ${raw.nombre.trim()}`,
    `*Teléfono:* ${raw.telefono.trim()}`,
    `*Correo:* ${raw.email.trim()}`,
    '',
    `*Tipo:* ${raw.tipo}`,
    `*Estilo:* ${raw.estilo}`,
    `*Zona del cuerpo:* ${raw.zona.trim()}`,
    `*Tamaño:* ${raw.tamano}`,
    `*Presupuesto:* ${raw.presupuesto}`,
    `*Fecha preferida:* ${fmtDate(raw.fecha)}`,
    `*Horario preferido:* ${raw.horario}`,
    '',
    '*Mi idea:*',
    desc.length > 900 ? `${desc.slice(0, 900)}…` : desc,
  ];
  if (photoCount) {
    lines.push('', saved
      ? `*Fotos de referencia:* ${photoCount}, enviadas desde la web.`
      : `*Fotos de referencia:* ${photoCount}, te las adjunto en este chat.`);
  }
  return lines.join('\n');
}

const form = document.querySelector('[data-booking-form]');
if (form) init(form);

function init(form) {
  const $ = (sel) => form.querySelector(sel);
  const alertBox = $('[data-form-alert]');
  const success = document.querySelector('[data-success]');
  const submitBtn = $('[data-submit]');
  const submitLabel = $('[data-submit-label]');
  const fileInput = $('[data-file-input]');
  const thumbs = $('[data-thumbs]');
  const dropzone = $('[data-dropzone]');
  const touched = new Set();
  /** @type {{ blob: Blob, name: string, preview: string|null }[]} */
  let photos = [];
  let busy = false;

  // Opciones de los desplegables
  form.querySelectorAll('select[data-options]').forEach((select) => {
    const ph = new Option('Elige una opción', '', true, true);
    ph.disabled = true;
    select.append(ph);
    OPTIONS[select.dataset.options].forEach((o) => select.append(new Option(o, o)));
  });

  // Fechas permitidas: desde mañana hasta dentro de un año
  const { min, max } = dateLimits();
  const date = $('#f-fecha');
  date.min = min;
  date.max = max;

  // Contador de caracteres
  const desc = $('#f-descripcion');
  const count = $('[data-count]');
  desc.addEventListener('input', () => (count.textContent = desc.value.length));

  // Momento en que se abrió el formulario (filtro anti-bots)
  $('[data-started]').value = String(Date.now());

  /* ── Validación ───────────────────────── */
  const values = () => {
    const fd = new FormData(form);
    const out = {};
    for (const [k, v] of fd.entries()) if (typeof v === 'string') out[k] = v;
    out.privacidad = $('#f-privacidad').checked ? 'on' : '';
    return out;
  };

  const setError = (name, msg) => {
    const input = form.elements[name];
    const field = (input?.closest?.('.field')) || $(`#e-${name}`)?.closest('.field');
    const err = $(`#e-${name}`);
    if (err) err.textContent = msg || '';
    field?.classList.toggle('has-error', Boolean(msg));
    if (input && input.setAttribute) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  };

  const showErrors = (errors, only = null) => {
    const names = ['nombre', 'telefono', 'email', 'tipo', 'estilo', 'zona', 'tamano', 'descripcion', 'presupuesto', 'fecha', 'horario', 'privacidad'];
    names.forEach((n) => {
      if (only && !only.has(n)) return;
      setError(n, errors[n]);
    });
  };

  const validateLive = () => {
    const { errors } = validateBooking(values());
    showErrors(errors, touched);
  };

  form.addEventListener('focusout', (e) => {
    if (e.target.name && e.target.name !== 'fotos') {
      touched.add(e.target.name);
      validateLive();
    }
  });
  form.addEventListener('change', (e) => {
    if (e.target.name && e.target.name !== 'fotos') {
      touched.add(e.target.name);
      validateLive();
    }
  });
  form.addEventListener('input', (e) => {
    if (touched.has(e.target.name)) validateLive();
  });

  /* ── Fotos de referencia ──────────────── */
  const renderThumbs = () => {
    thumbs.innerHTML = '';
    photos.forEach((p, i) => {
      const li = document.createElement('li');
      if (p.preview) {
        const img = document.createElement('img');
        img.src = p.preview;
        img.alt = `Referencia ${i + 1}`;
        li.append(img);
      } else {
        const span = document.createElement('span');
        span.className = 'thumb__name';
        span.textContent = p.name;
        li.append(span);
      }
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.textContent = '×';
      rm.setAttribute('aria-label', `Quitar ${p.name}`);
      rm.addEventListener('click', () => {
        if (p.preview) URL.revokeObjectURL(p.preview);
        photos.splice(i, 1);
        renderThumbs();
        setError('fotos', '');
      });
      li.append(rm);
      thumbs.append(li);
    });
    dropzone.querySelector('.dropzone__title').textContent = photos.length
      ? `${photos.length} de ${FILE_RULES.maxFiles} fotos añadidas`
      : 'Añadir fotos o diseños';
  };

  const addFiles = async (fileList) => {
    setError('fotos', '');
    const files = [...fileList];
    const room = FILE_RULES.maxFiles - photos.length;
    if (files.length > room) {
      setError('fotos', `Puedes adjuntar como máximo ${FILE_RULES.maxFiles} fotos.`);
    }
    for (const file of files.slice(0, Math.max(room, 0))) {
      const isImage = /^image\//.test(file.type) || /\.(heic|heif)$/i.test(file.name);
      if (!isImage) {
        setError('fotos', `«${file.name}» no es una imagen. Usa JPG, PNG, WEBP o HEIC.`);
        continue;
      }
      try {
        const blob = await compress(file);
        photos.push({ blob, name: file.name, preview: URL.createObjectURL(blob) });
      } catch {
        if (file.size <= FILE_RULES.maxFileBytes) {
          photos.push({ blob: file, name: file.name, preview: null });
        } else {
          setError('fotos', `«${file.name}» pesa demasiado y no se puede optimizar en este navegador. Prueba a enviarla como JPG.`);
        }
      }
      renderThumbs();
    }
  };

  fileInput.addEventListener('change', async () => {
    await addFiles(fileInput.files);
    fileInput.value = '';
  });
  ['dragenter', 'dragover'].forEach((t) =>
    dropzone.addEventListener(t, (e) => {
      e.preventDefault();
      dropzone.classList.add('is-over');
    }),
  );
  ['dragleave', 'drop'].forEach((t) => dropzone.addEventListener(t, () => dropzone.classList.remove('is-over')));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  });

  /* ── Envío ────────────────────────────── */
  const showAlert = (html) => {
    alertBox.innerHTML = html;
    alertBox.hidden = false;
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const fallbackContact = () =>
    links.wa ? ` Mientras tanto, puedes <a href="${links.wa}" target="_blank" rel="noopener">escribirnos por WhatsApp</a>.` : links.tel ? ` Mientras tanto, puedes <a href="${links.tel}">llamarnos</a>.` : '';

  const setBusy = (state, label) => {
    busy = state;
    submitBtn.disabled = state;
    submitLabel.textContent = label || 'SOLICITAR MI CITA';
  };

  /**
   * saved = true  → la solicitud está guardada; WhatsApp es un atajo opcional.
   * saved = false → el envío se completa por WhatsApp (único paso que falta).
   */
  const showSuccess = (raw, saved) => {
    const name = raw.nombre.trim().split(/\s+/)[0];
    const waBtn = success.querySelector('[data-success-wa]');
    success.dataset.mode = saved ? 'saved' : 'whatsapp';
    success.querySelectorAll('[data-success-name]').forEach((n) => (n.textContent = name));
    success.querySelector('[data-saved-copy]').hidden = !saved;
    success.querySelector('[data-wa-copy]').hidden = saved;
    if (WA_NUMBER) {
      waBtn.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(whatsappMessage(raw, photos.length, saved))}`;
      waBtn.hidden = false;
      waBtn.querySelector('[data-success-wa-label]').textContent = saved ? 'ENVIAR TAMBIÉN POR WHATSAPP' : 'ENVIAR POR WHATSAPP';
      waBtn.classList.toggle('btn--gold', !saved);
      waBtn.classList.toggle('btn--wa', saved);
    } else {
      waBtn.hidden = true;
    }
    form.hidden = true;
    success.hidden = false;
    success.focus();
    success.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    alertBox.hidden = true;

    const raw = values();
    const { errors } = validateBooking(raw);
    Object.keys(raw).forEach((k) => touched.add(k));
    touched.add('privacidad');
    showErrors(errors);

    const total = photos.reduce((s, p) => s + p.blob.size, 0);
    if (total > FILE_RULES.maxTotalBytes) {
      errors.fotos = 'Las fotos ocupan demasiado en total. Quita alguna e inténtalo de nuevo.';
      setError('fotos', errors.fotos);
    }

    const firstError = Object.keys(errors)[0];
    if (firstError) {
      const target = form.elements[firstError] || $(`#e-${firstError}`);
      target?.focus?.();
      return;
    }

    const body = new FormData();
    for (const [k, v] of Object.entries(raw)) body.append(k, v);
    photos.forEach((p, i) => {
      const ext = p.blob.type === 'image/jpeg' ? 'jpg' : (p.name.split('.').pop() || 'jpg').toLowerCase();
      body.append('fotos', p.blob, `referencia-${i + 1}.${ext}`);
    });

    setBusy(true, 'ENVIANDO…');
    try {
      const res = await fetch('/api/reservas', { method: 'POST', body, headers: { Accept: 'application/json' } });
      const json = await res.json().catch(() => ({}));

      if (res.ok && json.ok) return showSuccess(raw, true);

      if (res.status === 400 && json.errors) {
        showErrors(json.errors);
        if (json.errors.fotos) setError('fotos', json.errors.fotos);
        showAlert('Revisa los campos marcados en rojo.');
      } else if (res.status === 413) {
        setError('fotos', 'Las fotos ocupan demasiado. Quita alguna e inténtalo de nuevo.');
        showAlert('No se ha enviado: las fotos ocupan demasiado.');
      } else if (res.status === 429) {
        showAlert('Has enviado varias solicitudes seguidas. Espera unos minutos e inténtalo de nuevo.');
      } else if (WA_NUMBER) {
        // La web no ha podido guardarla (servidor sin configurar o caído):
        // la solicitud se envía por WhatsApp para no perderla.
        return showSuccess(raw, false);
      } else {
        showAlert(`No se ha podido enviar tu solicitud. Inténtalo de nuevo en unos minutos.${fallbackContact()}`);
      }
    } catch {
      if (WA_NUMBER) return showSuccess(raw, false);
      showAlert(`No hay conexión con el servidor. Comprueba tu conexión a internet e inténtalo de nuevo.${fallbackContact()}`);
    } finally {
      setBusy(false);
    }
  });

  success.querySelector('[data-new-request]').addEventListener('click', () => {
    form.reset();
    photos.forEach((p) => p.preview && URL.revokeObjectURL(p.preview));
    photos = [];
    renderThumbs();
    touched.clear();
    showErrors({});
    count.textContent = '0';
    $('[data-started]').value = String(Date.now());
    success.hidden = true;
    form.hidden = false;
    $('#f-nombre').focus();
  });
}

/**
 * Reduce la foto a un máximo de 1800 px y la convierte a JPEG.
 * Así las fotos del móvil (a menudo de 3–8 MB) pasan a pesar unos cientos de KB.
 */
async function compress(file, maxSide = 1800, quality = 0.82) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/jpeg', quality),
  );
  if (blob.size > FILE_RULES.maxFileBytes) throw new Error('too big');
  return blob;
}
