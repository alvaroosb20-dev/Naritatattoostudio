// Reglas del formulario de reservas.
// Este archivo lo usan tanto el navegador (validación al momento)
// como el servidor (/api/reservas), así las dos validaciones nunca se separan.

export const OPTIONS = {
  tipo: [
    'Diseño nuevo a partir de mi idea',
    'Tengo un diseño y quiero tatuarlo',
    'Cover (tapar un tatuaje anterior)',
    'Retoque de un tatuaje del estudio',
    'Otro',
  ],
  tamano: [
    'Mini (hasta 5 cm)',
    'Pequeño (5 a 10 cm)',
    'Mediano (10 a 20 cm)',
    'Grande (más de 20 cm)',
    'No lo sé, prefiero que me aconsejen',
  ],
  estilo: [
    'Fine line',
    'Lettering',
    'Black & grey',
    'Ilustración',
    'Otro / no lo tengo claro',
  ],
  presupuesto: [
    'Menos de 100 €',
    'Entre 100 y 200 €',
    'Entre 200 y 400 €',
    'Más de 400 €',
    'Prefiero que me orienten',
  ],
  horario: ['Mañana', 'Mediodía', 'Tarde', 'Sin preferencia'],
};

export const FILE_RULES = {
  maxFiles: 5,
  // Vercel limita el cuerpo de cada petición a 4,5 MB; dejamos margen
  // para el resto del formulario. El navegador comprime antes de enviar.
  maxTotalBytes: 4_200_000,
  maxFileBytes: 4_000_000,
  accept: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9 ()-]{9,20}$/;

function text(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function isoDay(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Primer y último día que se pueden elegir (formato AAAA-MM-DD). */
export function dateLimits(now = new Date()) {
  const min = new Date(now);
  min.setDate(min.getDate() + 1);
  const max = new Date(now);
  max.setFullYear(max.getFullYear() + 1);
  return { min: isoDay(min), max: isoDay(max) };
}

/**
 * Valida los datos del formulario.
 * @param {Record<string,string>} raw  valores de texto del formulario
 * @returns {{ data: Record<string,string|boolean>, errors: Record<string,string> }}
 */
export function validateBooking(raw, now = new Date()) {
  const errors = {};
  const data = {
    nombre: text(raw.nombre),
    telefono: text(raw.telefono),
    email: text(raw.email).toLowerCase(),
    tipo: text(raw.tipo),
    zona: text(raw.zona),
    tamano: text(raw.tamano),
    estilo: text(raw.estilo),
    descripcion: text(raw.descripcion),
    presupuesto: text(raw.presupuesto),
    fecha: text(raw.fecha),
    horario: text(raw.horario),
    privacidad: raw.privacidad === 'on' || raw.privacidad === 'true' || raw.privacidad === true,
  };

  if (data.nombre.length < 3) errors.nombre = 'Escribe tu nombre y apellidos.';
  else if (data.nombre.length > 100) errors.nombre = 'El nombre es demasiado largo.';

  const digits = data.telefono.replace(/\D/g, '');
  if (!PHONE_RE.test(data.telefono) || digits.length < 9 || digits.length > 15) {
    errors.telefono = 'Escribe un teléfono válido, por ejemplo 612 345 678.';
  }

  if (!EMAIL_RE.test(data.email) || data.email.length > 160) {
    errors.email = 'Escribe un correo válido, por ejemplo nombre@correo.com.';
  }

  for (const key of ['tipo', 'tamano', 'estilo', 'presupuesto', 'horario']) {
    if (!OPTIONS[key].includes(data[key])) errors[key] = 'Elige una opción.';
  }

  if (data.zona.length < 2) errors.zona = 'Indica en qué zona del cuerpo lo quieres.';
  else if (data.zona.length > 80) errors.zona = 'Resume la zona en menos palabras.';

  if (data.descripcion.length < 20) {
    errors.descripcion = 'Cuéntanos tu idea con un poco más de detalle (mínimo 20 caracteres).';
  } else if (data.descripcion.length > 2000) {
    errors.descripcion = 'La descripción no puede pasar de 2000 caracteres.';
  }

  const { min, max } = dateLimits(now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.fecha)) {
    errors.fecha = 'Elige una fecha.';
  } else if (data.fecha < min) {
    errors.fecha = 'Elige una fecha a partir de mañana.';
  } else if (data.fecha > max) {
    errors.fecha = 'Elige una fecha dentro de los próximos 12 meses.';
  }

  if (!data.privacidad) errors.privacidad = 'Necesitamos que aceptes la política de privacidad.';

  return { data, errors };
}
