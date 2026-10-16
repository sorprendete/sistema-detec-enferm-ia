-- =============================================================
--  Base de datos (Supabase / PostgreSQL)
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--  Orden: 1) schema.sql   2) politicas_rls.sql
-- =============================================================

-- Perfil público de cada usuario (la contraseña la gestiona Supabase Auth con bcrypt)
create table if not exists public.perfiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nombre      text check (char_length(nombre) <= 100),
  creado_en   timestamptz not null default now()
);

-- Historial y auditoría de cada diagnóstico
create table if not exists public.analisis (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at      timestamptz not null default now(),
  clase           text not null,
  cultivo         text,
  saludable       boolean not null,
  confianza       real not null check (confianza between 0 and 1),
  baja_certeza    boolean not null default false,
  top3            jsonb,
  imagen_sha256   char(64) not null,   -- huella de la imagen analizada (trazabilidad)
  modelo_sha256   char(64) not null,   -- versión exacta del modelo que hizo el diagnóstico
  nombre_archivo  text
);

create index if not exists analisis_user_fecha_idx on public.analisis (user_id, created_at desc);

-- Crea el perfil automáticamente cuando alguien se registra
create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, new.raw_user_meta_data ->> 'nombre');
  return new;
end;
$$;

drop trigger if exists al_registrar_usuario on auth.users;
create trigger al_registrar_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();
