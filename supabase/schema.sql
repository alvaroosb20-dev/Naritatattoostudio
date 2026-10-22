-- ════════════════════════════════════════════════════════════════
--  Narita Tattoo Studio — base de datos de solicitudes de cita
--  Pegar en Supabase → SQL Editor → Run (una sola vez).
-- ════════════════════════════════════════════════════════════════

create table if not exists public.reservas (
  id                uuid primary key,
  created_at        timestamptz not null default now(),
  nombre            text not null check (char_length(nombre) between 3 and 100),
  telefono          text not null check (char_length(telefono) between 9 and 20),
  email             text not null check (char_length(email) <= 160),
  tipo              text not null,
  zona              text not null check (char_length(zona) <= 80),
  tamano            text not null,
  estilo            text not null,
  descripcion       text not null check (char_length(descripcion) between 20 and 2000),
  presupuesto       text not null,
  fecha_preferida   date not null,
  horario           text not null,
  fotos             text[] not null default '{}',
  acepta_privacidad boolean not null default false,
  estado            text not null default 'pendiente'
                    check (estado in ('pendiente', 'contactado', 'confirmada', 'descartada')),
  notas             text
);

create index if not exists reservas_created_at_idx on public.reservas (created_at desc);
create index if not exists reservas_estado_idx on public.reservas (estado);

-- Seguridad: RLS activado y SIN políticas públicas.
-- Nadie puede leer ni escribir desde el navegador; solo el servidor (clave service_role).
alter table public.reservas enable row level security;

-- Bucket PRIVADO para las fotos de referencia (máx. 5 MB por archivo, solo imágenes)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('referencias', 'referencias', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
