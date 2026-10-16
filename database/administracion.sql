-- =============================================================
--  Módulo de administración: roles, auditoría de accesos y
--  permisos del administrador.
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--  Orden: 1) schema.sql  2) politicas_rls.sql  3) administracion.sql
--  Se puede ejecutar varias veces sin romper nada.
-- =============================================================

-- 1. Rol, correo y estado de cada perfil -----------------------
alter table public.perfiles add column if not exists email  text;
alter table public.perfiles add column if not exists rol    text not null default 'usuario';
alter table public.perfiles add column if not exists activo boolean not null default true;

alter table public.perfiles drop constraint if exists perfiles_rol_valido;
alter table public.perfiles add constraint perfiles_rol_valido check (rol in ('usuario', 'admin'));

-- Solo puede existir UN administrador
create unique index if not exists perfiles_un_solo_admin on public.perfiles (rol) where rol = 'admin';

-- Perfiles de usuarios creados antes de este script
insert into public.perfiles (id, nombre, email)
select u.id, u.raw_user_meta_data ->> 'nombre', u.email from auth.users u
on conflict (id) do nothing;

update public.perfiles p set email = u.email
from auth.users u where u.id = p.id and p.email is distinct from u.email;

-- El perfil nuevo guarda también el correo
create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre, email)
  values (new.id, new.raw_user_meta_data ->> 'nombre', new.email);
  return new;
end;
$$;

-- Un usuario solo puede cambiar su nombre: nunca su rol ni su estado
revoke update on public.perfiles from authenticated;
grant update (nombre) on public.perfiles to authenticated;

-- 2. ¿El usuario de la sesión actual es administrador? ---------
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles
    where id = (select auth.uid()) and rol = 'admin' and activo
  );
$$;

revoke execute on function public.es_admin() from public, anon;
grant execute on function public.es_admin() to authenticated;

-- 3. El administrador puede VER todos los perfiles y análisis --
drop policy if exists "perfil: el admin ve todos" on public.perfiles;
create policy "perfil: el admin ve todos" on public.perfiles
  for select to authenticated using ((select public.es_admin()));

drop policy if exists "analisis: el admin ve todos" on public.analisis;
create policy "analisis: el admin ve todos" on public.analisis
  for select to authenticated using ((select public.es_admin()));

-- 4. Registro de auditoría ------------------------------------
-- Lo escribe SOLO el backend con la clave de servicio. Nadie puede editarlo
-- ni borrarlo desde la aplicación; el administrador solo puede leerlo.
create table if not exists public.auditoria (
  id         bigint generated always as identity primary key,
  fecha      timestamptz not null default now(),
  accion     text not null,      -- login, registro, logout, predict, admin
  estado     text not null check (estado in ('exito', 'fallo', 'bloqueado')),
  user_id    uuid references auth.users (id) on delete set null,
  email      text,
  ip         text,
  agente     text,               -- navegador (User-Agent)
  detalle    text
);

create index if not exists auditoria_fecha_idx on public.auditoria (fecha desc);

alter table public.auditoria enable row level security;

drop policy if exists "auditoria: solo el admin la lee" on public.auditoria;
create policy "auditoria: solo el admin la lee" on public.auditoria
  for select to authenticated using ((select public.es_admin()));

revoke all on public.auditoria from anon, authenticated;
grant select on public.auditoria to authenticated;

-- =============================================================
--  5. Nombrar al administrador (después de crear su cuenta)
--     Cambia el correo y ejecuta SOLO esta línea:
--
--  update public.perfiles set rol = 'admin' where email = 'admin@tu-dominio.com';
-- =============================================================
