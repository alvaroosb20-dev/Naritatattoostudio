import { SITE } from './config.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

document.documentElement.classList.add('js');
if (!SITE.showPendingNotes) document.documentElement.classList.add('hide-pending');

/* ── Utilidades de datos del estudio ─────────────── */
const digits = (v) => String(v || '').replace(/\D/g, '');
const phone = digits(SITE.phone);
const whatsapp = digits(SITE.whatsapp);
const addr = SITE.address || {};
const addressLine = [addr.street, [addr.postalCode, addr.city].filter(Boolean).join(' '), addr.region !== addr.city ? addr.region : '']
  .filter(Boolean)
  .join(', ');
const mapsQuery = (SITE.mapsQuery || (addr.street ? [SITE.name, addressLine].join(', ') : '')).trim();

export const links = {
  tel: phone ? `tel:+${phone}` : '',
  wa: whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(SITE.whatsappMessage || '')}` : '',
  maps: mapsQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}` : '',
  directions: mapsQuery ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapsQuery)}` : '',
};

function formatPhone(d) {
  // 34612345678 → +34 612 34 56 78
  if (d.startsWith('34') && d.length === 11) {
    const n = d.slice(2);
    return `+34 ${n.slice(0, 3)} ${n.slice(3, 5)} ${n.slice(5, 7)} ${n.slice(7)}`;
  }
  return `+${d}`;
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of [].concat(children)) if (c) node.append(c);
  return node;
}

function pending(text) {
  return el('span', { class: 'pending', text });
}

function icon(id) {
  return el('span', {
    'aria-hidden': 'true',
    html: `<svg viewBox="0 0 ${id === 'whatsapp' ? 32 : 24} ${id === 'whatsapp' ? 32 : 24}"><use href="#i-${id}"/></svg>`,
  }).firstChild;
}

/* ── Pintar datos de contacto ───────────────────── */
function renderContact() {
  // Botones principales
  const actions = $('[data-contact-actions]');
  if (actions) {
    if (links.wa) {
      actions.append(el('a', { class: 'btn btn--wa', href: links.wa, target: '_blank', rel: 'noopener' }, [icon('whatsapp'), 'WHATSAPP']));
    }
    if (links.tel) {
      actions.append(el('a', { class: 'btn btn--ghost', href: links.tel }, [icon('phone'), 'LLAMAR']));
    }
    if (!links.wa && !links.tel) actions.append(pending('Añadir teléfono y WhatsApp en assets/js/config.js'));
  }

  // Dirección
  const addrEl = $('[data-address]');
  if (addrEl) {
    if (addressLine) {
      addrEl.append(el('span', { text: addressLine }));
    } else {
      addrEl.append(pending('Añadir la dirección del estudio'));
    }
  }

  // Horario
  const hoursEl = $('[data-hours]');
  if (hoursEl) {
    if (Array.isArray(SITE.hours) && SITE.hours.length) {
      hoursEl.append(el('ul', { class: 'hours' }, SITE.hours.map((h) => el('li', {}, [el('span', { text: h.days }), el('span', { text: h.time })]))));
    } else {
      hoursEl.append(pending('Añadir el horario de apertura'));
    }
  }

  // Teléfono
  const phoneEl = $('[data-phone]');
  if (phoneEl) {
    if (phone) phoneEl.append(el('a', { href: links.tel, text: formatPhone(phone) }));
    else phoneEl.append(pending('Añadir teléfono'));
  }

  // Correo
  if (SITE.email) {
    $('[data-email-row]')?.removeAttribute('hidden');
    $('[data-email]')?.append(el('a', { href: `mailto:${SITE.email}`, text: SITE.email }));
  }

  // Redes sociales
  const nets = [
    ['instagram', 'Instagram'],
    ['tiktok', 'TikTok'],
    ['facebook', 'Facebook'],
  ].filter(([key]) => SITE.social?.[key]);

  $$('[data-social]').forEach((list, i) => {
    if (nets.length) {
      nets.forEach(([key, label]) => {
        list.append(el('li', {}, el('a', { href: SITE.social[key], target: '_blank', rel: 'noopener me' }, [icon(key), label])));
      });
    } else if (i === 0) {
      list.append(el('li', {}, pending('Añadir los enlaces de Instagram, TikTok o Facebook')));
    }
  });

  // Footer
  const fc = $('[data-footer-contact]');
  if (fc) {
    if (addressLine) fc.append(el('p', { text: addressLine }));
    if (phone) fc.append(el('a', { href: links.tel, text: formatPhone(phone) }));
    if (links.wa) fc.append(el('a', { href: links.wa, target: '_blank', rel: 'noopener', text: 'WhatsApp' }));
    if (SITE.email) fc.append(el('a', { href: `mailto:${SITE.email}`, text: SITE.email }));
    if (Array.isArray(SITE.hours) && SITE.hours.length) {
      fc.append(el('p', { text: SITE.hours.map((h) => `${h.days}: ${h.time}`).join(' / ') }));
    }
  }

  // WhatsApp flotante y enlace alternativo junto al formulario
  if (links.wa) {
    const float = $('[data-wa-float]');
    if (float) {
      float.href = links.wa;
      float.target = '_blank';
      float.rel = 'noopener';
      float.hidden = false;
    }
    const alt = $('[data-booking-alt]');
    if (alt) {
      const a = $('[data-wa-link]', alt);
      a.href = links.wa;
      a.target = '_blank';
      a.rel = 'noopener';
      alt.hidden = false;
    }
  }

  // Datos estructurados para Google: solo lo que existe
  const ld = $('#ld-business');
  if (ld) {
    try {
      const data = JSON.parse(ld.textContent);
      const origin = location.origin;
      data.url = origin + '/';
      data.image = origin + '/assets/img/og.jpg';
      data.logo = origin + '/assets/img/logo-narita-dorado-600.png';
      if (phone) data.telephone = `+${phone}`;
      if (SITE.email) data.email = SITE.email;
      if (addr.street) {
        data.address = {
          '@type': 'PostalAddress',
          streetAddress: addr.street,
          postalCode: addr.postalCode || undefined,
          addressLocality: addr.city || undefined,
          addressRegion: addr.region || undefined,
          addressCountry: 'ES',
        };
      }
      const sameAs = Object.values(SITE.social || {}).filter(Boolean);
      if (sameAs.length) data.sameAs = sameAs;
      ld.textContent = JSON.stringify(data);
    } catch {
      /* sin datos estructurados */
    }
  }
}

/* ── Mapa: se carga solo cuando la persona lo pide ── */
function renderMap() {
  const box = $('[data-map]');
  if (!box) return;
  const text = $('[data-map-text]', box);
  const buttons = $('[data-map-buttons]', box);

  if (!mapsQuery) {
    text.textContent = 'Aquí aparecerá el mapa con la ubicación del estudio.';
    if (SITE.showPendingNotes) buttons.append(pending('Añadir dirección o mapsQuery en config.js'));
    return;
  }

  text.textContent = addressLine || mapsQuery;
  const load = el('button', { type: 'button', class: 'btn btn--ghost', text: 'VER MAPA' });
  const go = el('a', { class: 'btn btn--gold', href: links.directions, target: '_blank', rel: 'noopener' }, [icon('pin'), 'CÓMO LLEGAR']);
  const open = el('a', { class: 'btn btn--ghost', href: links.maps, target: '_blank', rel: 'noopener', text: 'ABRIR EN GOOGLE MAPS' });
  buttons.append(go, load, open);
  $('[data-map-placeholder]', box).append(
    el('p', { class: 'map__privacy', text: 'Al ver el mapa se carga Google Maps, que puede usar sus propias cookies.' }),
  );

  load.addEventListener('click', () => {
    const iframe = el('iframe', {
      title: `Mapa de ${SITE.name}`,
      src: `https://www.google.com/maps?q=${encodeURIComponent(mapsQuery)}&output=embed`,
      loading: 'lazy',
      referrerpolicy: 'no-referrer-when-downgrade',
      allowfullscreen: true,
    });
    box.append(iframe);
    $('[data-map-placeholder]', box).remove();
    const overlay = el('div', { class: 'map__buttons map__overlay' }, [
      el('a', { class: 'btn btn--gold', href: links.directions, target: '_blank', rel: 'noopener' }, [icon('pin'), 'CÓMO LLEGAR']),
    ]);
    box.append(overlay);
  });
}

/* ── Cabecera y menú móvil ───────────────────────── */
function initHeader() {
  const header = $('[data-header]');
  const menu = $('[data-menu]');
  const toggle = $('[data-menu-toggle]');
  if (!header) return;

  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  if (!menu || !toggle) return;
  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    $('.sr-only', toggle).textContent = open ? 'Cerrar menú' : 'Abrir menú';
    menu.classList.toggle('is-open', open);
    header.classList.toggle('is-open', open);
    document.body.classList.toggle('no-scroll', open);
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });
  window.matchMedia('(min-width: 901px)').addEventListener('change', (mq) => mq.matches && setOpen(false));

  // Marca la sección visible en el menú
  const navLinks = $$('a[href^="#"]:not(.btn)', menu);
  const sections = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === `#${entry.target.id}`)));
        });
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    sections.forEach((s) => io.observe(s));
  }
}

/* ── Portafolio: filtros + visor ─────────────────── */
function initPortfolio() {
  const gallery = $('[data-gallery]');
  if (!gallery) return;
  const items = $$('.gallery__item', gallery);
  const filters = $$('[data-filter]');

  filters.forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.filter;
      filters.forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      items.forEach((item) => {
        const show = cat === 'todos' || item.dataset.cat === cat;
        if (show) {
          item.hidden = false;
          requestAnimationFrame(() => item.classList.remove('is-hiding'));
        } else {
          item.classList.add('is-hiding');
          setTimeout(() => {
            if (item.classList.contains('is-hiding')) item.hidden = true;
          }, 300);
        }
      });
    });
  });

  // Visor a pantalla completa
  const lb = $('[data-lightbox]');
  const img = $('[data-lb-img]', lb);
  const cap = $('[data-lb-caption]', lb);
  const supportsWebp = document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp');
  let current = 0;
  let lastFocus = null;
  const visible = () => items.filter((i) => !i.hidden).map((i) => $('.gallery__open', i));

  const show = (index) => {
    const list = visible();
    if (!list.length) return;
    current = (index + list.length) % list.length;
    const btn = list[current];
    img.src = supportsWebp ? btn.dataset.full : btn.dataset.fallback;
    img.alt = $('img', btn).alt;
    cap.textContent = btn.dataset.caption;
  };
  const open = (btn) => {
    lastFocus = btn;
    show(visible().indexOf(btn));
    lb.hidden = false;
    document.body.classList.add('no-scroll');
    $('[data-lb-close]', lb).focus();
  };
  const close = () => {
    lb.hidden = true;
    document.body.classList.remove('no-scroll');
    lastFocus?.focus();
  };

  gallery.addEventListener('click', (e) => {
    const btn = e.target.closest('.gallery__open');
    if (btn) open(btn);
  });
  $('[data-lb-close]', lb).addEventListener('click', close);
  $('[data-lb-prev]', lb).addEventListener('click', () => show(current - 1));
  $('[data-lb-next]', lb).addEventListener('click', () => show(current + 1));
  $('[data-lb-book]', lb).addEventListener('click', () => {
    lb.hidden = true;
    document.body.classList.remove('no-scroll');
  });
  lb.addEventListener('click', (e) => {
    if (e.target === lb || e.target.classList.contains('lightbox__figure')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
    if (e.key === 'Tab') {
      // mantener el foco dentro del visor
      const focusables = $$('button, a', lb);
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Deslizar en móvil
  let startX = null;
  lb.addEventListener('touchstart', (e) => (startX = e.touches[0].clientX), { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    startX = null;
  });
}

/* ── Aparición suave al entrar en pantalla ───────── */
function initReveal() {
  const els = $$('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach((e) => e.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 },
  );
  els.forEach((e) => io.observe(e));
}

$$('[data-year]').forEach((n) => (n.textContent = new Date().getFullYear()));
renderContact();
renderMap();
initHeader();
initPortfolio();
initReveal();
