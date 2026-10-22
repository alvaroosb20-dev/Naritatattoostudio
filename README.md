# Narita Tattoo Studio — web

Web del estudio con portafolio, solicitud de citas con fotos de referencia, contacto por WhatsApp/teléfono, mapa y panel privado para gestionar las solicitudes.

- **Sin dependencias ni compilación.** HTML, CSS y JavaScript + funciones de Vercel en `/api`.
- **Datos del estudio en un solo archivo:** `assets/js/config.js`.
- **Solicitudes:** se guardan en Supabase (tabla `reservas`) y las fotos en un bucket **privado** (`referencias`).
- **Panel del estudio:** `tudominio.com/admin` (con contraseña). Ver, cambiar estado, notas, contactar por WhatsApp y borrar.

## Estructura

```
index.html            Página principal (inicio, estudio, portafolio, sobre nosotros, reservas, contacto)
privacidad.html       Política de privacidad (plantilla editable)
aviso-legal.html      Aviso legal (plantilla editable)
cookies.html          Política de cookies (plantilla editable)
404.html              Página de error
admin.html            Panel del estudio
assets/js/config.js   ← DATOS DEL ESTUDIO (teléfono, WhatsApp, dirección, horario, redes)
assets/js/booking-rules.js  Reglas del formulario (las usan navegador y servidor)
api/reservas.js       Recibe el formulario y lo guarda en Supabase
api/admin/*           Login y gestión del panel
supabase/schema.sql   Tabla + bucket privado (pegar una vez en Supabase)
vercel.json           Rutas limpias, cabeceras de seguridad, sitemap y robots
dev-server.mjs        Servidor local de pruebas (node dev-server.mjs)
```

## 1. Datos reales que faltan

Mientras falten, la web muestra avisos «Dato pendiente» (y no aparece ningún botón que no funcione).

| Dato | Dónde se cambia |
|---|---|
| Teléfono y número de WhatsApp | `assets/js/config.js` → `phone`, `whatsapp` |
| Dirección completa (y nombre en Google Maps) | `config.js` → `address`, `mapsQuery` |
| Horario de apertura | `config.js` → `hours` |
| Instagram, TikTok, Facebook | `config.js` → `social` |
| Correo público (opcional) | `config.js` → `email` |
| Texto real de «Sobre nosotros» (nombre de quien tatúa, trayectoria) | `index.html`, sección `sobre-nosotros` (texto provisional marcado) |
| Titular, NIF/CIF, dirección y correo para los textos legales | `privacidad.html`, `aviso-legal.html`, `cookies.html` (campos entre corchetes) |
| Más fotos del portafolio (opcional) | `assets/img/` + bloque `<li class="gallery__item">` en `index.html` |

Cuando esté todo, pon `showPendingNotes: false` en `config.js`.

> Los textos legales son una base editable, no asesoramiento jurídico: conviene que los revise una asesoría.

## 2. Servicios externos

### Supabase (obligatorio para recibir solicitudes) — gratis
1. Crea un proyecto en [supabase.com](https://supabase.com) (región recomendada: **Frankfurt / EU Central**).
2. **SQL Editor → New query** → pega el contenido de `supabase/schema.sql` → **Run**.
3. **Project Settings → API**: copia `Project URL` y la clave **`service_role`** (secreta; solo va en Vercel, nunca en el código).

### Resend (opcional: aviso por correo de cada solicitud nueva)
1. Cuenta en [resend.com](https://resend.com) → verifica el dominio del estudio → crea una API key.
2. Sin dominio propio solo puede enviar a tu propio correo de Resend. Sin Resend todo funciona igual: las solicitudes se ven en `/admin`.

## 3. Publicar en Vercel (desde el iPhone)
1. En [vercel.com](https://vercel.com) → **Add New → Project** → importa este repositorio. Framework: **Other**. No hace falta comando de build.
2. **Settings → Environment Variables** (ver `.env.example`):
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD` (la que usará el estudio para entrar en `/admin`)
   - `ADMIN_SESSION_SECRET` (texto aleatorio de 32+ caracteres)
   - Opcional: `RESEND_API_KEY`, `NOTIFY_EMAIL_TO`, `NOTIFY_EMAIL_FROM`, `SITE_URL`
3. **Deployments → Redeploy** para que coja las variables.
4. Prueba: envía una solicitud con una foto desde el móvil y ábrela en `/admin`.
5. Dominio: **Settings → Domains**. Después añade la web en Google Search Console y envía `tudominio.com/sitemap.xml`.
6. Ficha de Google Business Profile del estudio: es lo que más ayuda al SEO local (y lo que debes poner en `mapsQuery`).

## Cómo funciona la reserva
1. El navegador valida los campos y reduce las fotos (máx. 5, a ~1800 px) antes de enviarlas.
2. `/api/reservas` vuelve a validar todo, comprueba que los archivos son imágenes reales, sube las fotos al bucket privado y guarda la solicitud con estado **pendiente**.
3. Nunca se muestran horas «disponibles»: la fecha y el horario son preferencias. El estudio confirma la cita al hablar con el cliente y cambia el estado en `/admin`.
4. Las fotos solo se ven desde el panel, con enlaces que caducan en 1 hora.
5. Protección: campo trampa anti-bots, tiempo mínimo de relleno, bloqueo de envíos desde otros dominios, RLS activado sin acceso público, cabeceras de seguridad y CSP.

## Probar en local
```
node dev-server.mjs        # http://localhost:3000  (lee variables de un archivo .env)
```
