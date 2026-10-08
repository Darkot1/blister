-- ============================================================
-- Migración 005 — Las funciones de trigger no deben poder
-- llamarse vía API (/rest/v1/rpc).
-- ============================================================
revoke execute on function public.auditar_cambio() from authenticated, anon, public;
revoke execute on function public.crear_perfil_nuevo_usuario() from authenticated, anon, public;
revoke execute on function public.validar_archivo_alumno() from authenticated, anon, public;
revoke execute on function public.actualizar_marca_tiempo() from authenticated, anon, public;
