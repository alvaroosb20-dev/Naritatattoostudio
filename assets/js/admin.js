const $ = (s, r = document) => r.querySelector(s);
const login = $('[data-login]');
const panel = $('[data-panel]');
const list = $('[data-list]');
const msg = $('[data-msg]');
const logoutBtn = $('[data-logout]');
const tpl = $('#card-tpl');
let estado = '';

const fmtDate = (iso) =>
  new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const fmtDay = (d) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(options.headers || {}) },
    credentials: 'same-origin',
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

function showLogin(text = '') {
  panel.hidden = true;
  logoutBtn.hidden = true;
  login.hidden = false;
  $('[data-login-error]').textContent = text;
  $('#a-pass').focus();
}

function contactLinks(row) {
  const wrap = document.createDocumentFragment();
  const digits = row.telefono.replace(/\D/g, '');
  const intl = digits.length === 9 ? `34${digits}` : digits;
  const add = (href, text, external) => {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    if (external) {
      a.target = '_blank';
      a.rel = 'noopener';
    }
    wrap.append(a);
  };
  const first = row.nombre.split(/\s+/)[0];
  add(`https://wa.me/${intl}?text=${encodeURIComponent(`Hola ${first}, te escribimos de Narita Tattoo Studio sobre tu solicitud de cita.`)}`, 'WhatsApp', true);
  add(`tel:+${intl}`, row.telefono);
  add(`mailto:${row.email}?subject=${encodeURIComponent('Tu solicitud de cita en Narita Tattoo Studio')}`, row.email);
  return wrap;
}

function render(rows) {
  list.innerHTML = '';
  msg.textContent = rows.length ? `${rows.length} solicitud${rows.length === 1 ? '' : 'es'}` : 'No hay solicitudes en esta vista.';
  for (const row of rows) {
    const card = tpl.content.firstElementChild.cloneNode(true);
    card.dataset.estado = row.estado;
    const set = (f, v) => ($(`[data-f="${f}"]`, card).textContent = v);
    set('nombre', row.nombre);
    set('created', `Recibida el ${fmtDate(row.created_at)}`);
    set('tipo', row.tipo);
    set('estilo', row.estilo);
    set('zona', row.zona);
    set('tamano', row.tamano);
    set('presupuesto', row.presupuesto);
    set('cuando', `${fmtDay(row.fecha_preferida)}, ${row.horario.toLowerCase()}`);
    set('descripcion', row.descripcion);
    $('[data-contact]', card).append(contactLinks(row));

    const photos = $('[data-photos]', card);
    (row.fotos_urls || []).forEach((url, i) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      const isHeic = /\.heic(\?|$)/i.test(url);
      if (isHeic) {
        const s = document.createElement('span');
        s.className = 'thumb__name';
        s.textContent = `Foto ${i + 1} (HEIC)`;
        a.append(s);
      } else {
        const img = document.createElement('img');
        img.src = url;
        img.alt = `Referencia ${i + 1} de ${row.nombre}`;
        img.loading = 'lazy';
        a.append(img);
      }
      li.append(a);
      photos.append(li);
    });

    const select = $('[data-estado]', card);
    select.value = row.estado;
    select.addEventListener('change', async () => {
      const { status } = await api('/api/admin/reservas', { method: 'PATCH', body: JSON.stringify({ id: row.id, estado: select.value }) });
      if (status === 401) return showLogin('La sesión ha caducado. Vuelve a entrar.');
      if (status !== 200) {
        alert('No se pudo cambiar el estado. Inténtalo de nuevo.');
        select.value = row.estado;
        return;
      }
      row.estado = select.value;
      card.dataset.estado = row.estado;
    });

    const notas = $('[data-notas]', card);
    notas.value = row.notas || '';
    const notesBtn = $('[data-save-notes]', card);
    notesBtn.addEventListener('click', async () => {
      notesBtn.disabled = true;
      const { status } = await api('/api/admin/reservas', { method: 'PATCH', body: JSON.stringify({ id: row.id, notas: notas.value }) });
      notesBtn.disabled = false;
      if (status === 401) return showLogin('La sesión ha caducado. Vuelve a entrar.');
      notesBtn.textContent = status === 200 ? 'NOTAS GUARDADAS' : 'ERROR AL GUARDAR';
      setTimeout(() => (notesBtn.textContent = 'GUARDAR NOTAS'), 2000);
    });

    $('[data-delete]', card).addEventListener('click', async () => {
      if (!confirm(`¿Borrar la solicitud de ${row.nombre} y sus fotos? No se puede deshacer.`)) return;
      const { status } = await api(`/api/admin/reservas?id=${row.id}`, { method: 'DELETE' });
      if (status === 401) return showLogin('La sesión ha caducado. Vuelve a entrar.');
      if (status !== 200) return alert('No se pudo borrar. Inténtalo de nuevo.');
      card.remove();
    });

    list.append(card);
  }
}

async function load() {
  msg.textContent = 'Cargando…';
  const { status, body } = await api(`/api/admin/reservas${estado ? `?estado=${estado}` : ''}`);
  if (status === 401) return showLogin();
  if (status === 503) {
    login.hidden = true;
    panel.hidden = false;
    msg.textContent =
      body.error === 'admin_not_configured'
        ? 'El panel aún no está activado: faltan ADMIN_PASSWORD y ADMIN_SESSION_SECRET en Vercel.'
        : 'Falta conectar Supabase: añade SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en Vercel.';
    return;
  }
  if (status !== 200) {
    msg.textContent = 'No se pudieron cargar las solicitudes. Recarga la página.';
    return;
  }
  login.hidden = true;
  panel.hidden = false;
  logoutBtn.hidden = false;
  render(body.rows);
}

login.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = login.querySelector('button');
  btn.disabled = true;
  const { status, body } = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: $('#a-pass').value }) });
  btn.disabled = false;
  if (status === 200) {
    $('#a-pass').value = '';
    return load();
  }
  $('[data-login-error]').textContent =
    body.error === 'not_configured' ? 'El panel aún no está activado (faltan variables en Vercel).' : 'Contraseña incorrecta.';
});

logoutBtn.addEventListener('click', async () => {
  await api('/api/admin/login', { method: 'DELETE' });
  list.innerHTML = '';
  showLogin();
});

document.querySelectorAll('[data-state]').forEach((btn) =>
  btn.addEventListener('click', () => {
    estado = btn.dataset.state;
    document.querySelectorAll('[data-state]').forEach((b) => {
      b.classList.toggle('is-active', b === btn);
      b.setAttribute('aria-pressed', String(b === btn));
    });
    load();
  }),
);

load();
