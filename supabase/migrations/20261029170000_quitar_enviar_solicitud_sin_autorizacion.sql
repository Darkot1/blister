-- ============================================================
-- Quita la versión vieja de enviar_solicitud (8 parámetros, sin p_autoriza).
--   Quedó al lado de la nueva cuando se añadió la autorización de datos, y como
--   cualquiera (anon) podía llamarla, permitía crear solicitudes sin el
--   consentimiento. La app solo usa la de 9 parámetros, que lo exige.
-- ============================================================

drop function if exists public.enviar_solicitud(text, text, text, text, text, text, text, text);
