-- =============================================================
--  Row Level Security: cada usuario solo accede a SUS datos.
--  El historial es de solo inserción (no se puede editar ni borrar),
--  así funciona como registro de auditoría.
-- =============================================================

alter table public.perfiles enable row level security;
alter table public.analisis enable row level security;

-- Perfiles
drop policy if exists "perfil: ver el propio" on public.perfiles;
create policy "perfil: ver el propio" on public.perfiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "perfil: editar el propio" on public.perfiles;
create policy "perfil: editar el propio" on public.perfiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Análisis
drop policy if exists "analisis: ver los propios" on public.analisis;
create policy "analisis: ver los propios" on public.analisis
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "analisis: registrar los propios" on public.analisis;
create policy "analisis: registrar los propios" on public.analisis
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- Sin políticas de UPDATE/DELETE en analisis: quedan prohibidas para todos los usuarios.
-- Los anónimos (sin sesión) no tienen ninguna política, así que no ven nada.
revoke all on public.analisis from anon;
revoke all on public.perfiles from anon;
