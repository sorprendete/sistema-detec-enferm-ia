-- =============================================================
--  Limpieza de la base de datos (borra datos de prueba)
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--
--  ATENCIÓN: lo borrado NO se puede recuperar.
--  Ejecuta solo el bloque que necesites (selecciónalo y pulsa Run).
-- =============================================================

-- Antes de borrar, revisa cuánto hay:
select
  (select count(*) from auth.users)       as usuarios,
  (select count(*) from public.analisis)  as analisis,
  (select count(*) from public.auditoria) as eventos_auditoria;


-- BLOQUE A · Borrar todos los análisis (historial de diagnósticos)
delete from public.analisis;


-- BLOQUE B · Vaciar el registro de auditoría (logs de accesos)
truncate public.auditoria restart identity;


-- BLOQUE C · Borrar todos los usuarios EXCEPTO el administrador.
-- Sus perfiles y análisis se borran solos (on delete cascade).
delete from auth.users
where id not in (select id from public.perfiles where rol = 'admin');


-- BLOQUE D · Borrar un usuario concreto (cambia el correo)
-- delete from auth.users where email = 'correo@ejemplo.com';
