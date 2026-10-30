-- ============================================================
-- Tras publicar la app que usa `enviar_solicitud_web`: se borran las entradas
-- viejas, que no exigían el secreto y permitían saltarse el límite por conexión.
-- ============================================================

drop function if exists public.enviar_solicitud(text, text, text, text, text, text, text, text, boolean);
drop function if exists public.enviar_solicitud(text, text, text, text, text, text, text, text, boolean, date, text);
