-- ============================================================
-- Bot de Telegram: ficha del alumno más legible
--   · El teléfono vuelve a ir como texto normal: Telegram lo reconoce y al
--     tocarlo abre su menú (llamar, copiar, WhatsApp…). En <code> solo copiaba.
--   · La burbuja se ordena por bloques: quién es (nombre, edad, objetivo), su
--     rutina con el día que le toca, lo que hay que tener en cuenta, agenda y
--     seguimiento, y el contacto al final.
--   · El nombre sale con mayúscula inicial en cada palabra (salvo de, del, la…).
-- ============================================================

create or replace function public.nombre_tg(p_texto text)
returns text language sql immutable set search_path = ''
as $$
  select string_agg(case when p.palabra in ('de', 'del', 'la', 'las', 'los', 'y') and p.n > 1 then p.palabra
                         else upper(left(p.palabra, 1)) || substring(p.palabra from 2) end, ' ' order by p.n)
  from regexp_split_to_table(lower(trim(p_texto)), '\s+') with ordinality as p(palabra, n);
$$;

create or replace function public.vista_alumno_tg(p_alumno public.alumnos, p_zona text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_texto     text;
  v_peso      record;
  v_hoy       date := (now() at time zone p_zona)::date;
  v_fotos     int;
  v_plan      text;
  v_toca      text;
  v_objetivo  text;
  v_cuidados  text;
  v_proxima   timestamptz;
  v_ultima    date;
begin
  select m.peso_kg, m.medido_en,
         m.peso_kg - (select m2.peso_kg from public.mediciones m2 where m2.alumno_id = p_alumno.id and m2.peso_kg is not null
                      and m2.medido_en < m.medido_en order by m2.medido_en desc limit 1) as cambio
    into v_peso
  from public.mediciones m where m.alumno_id = p_alumno.id and m.peso_kg is not null order by m.medido_en desc limit 1;
  select count(*) into v_fotos from public.fotos_progreso f where f.alumno_id = p_alumno.id;
  select p.nombre into v_plan from public.planes p where p.alumno_id = p_alumno.id and p.estado = 'activo' limit 1;
  select d.nombre into v_toca from public.plan_dias d where d.id = public.siguiente_dia_plan_tg(p_alumno.id);
  select o.nombre into v_objetivo from public.objetivos_alumno o
   where o.alumno_id = p_alumno.id and o.estado = 'activo' order by o.es_principal desc, o.creado_en desc limit 1;
  select string_agg('• ' || public.html_telegram(left(k.descripcion, 160)), chr(10)) into v_cuidados
  from (select k.descripcion from public.condiciones_alumno k where k.alumno_id = p_alumno.id and k.estado = 'activo'
        order by k.creado_en desc limit 3) k;
  select c.inicia_en into v_proxima from public.citas c
   where c.alumno_id = p_alumno.id and c.estado in ('programada', 'confirmada') and c.inicia_en > now() order by c.inicia_en limit 1;
  select (c.inicia_en at time zone p_zona)::date into v_ultima from public.citas c
   where c.alumno_id = p_alumno.id and c.estado = 'completada' order by c.inicia_en desc limit 1;

  -- Quién es
  v_texto := '👤 <b>' || public.html_telegram(public.nombre_tg(p_alumno.nombres || ' ' || p_alumno.apellidos)) || '</b>'
    || coalesce(chr(10) || '<i>' || nullif(concat_ws(' · ',
         extract(year from age(current_date, p_alumno.fecha_nacimiento))::int || ' años',
         public.html_telegram(v_objetivo)), '') || '</i>', '')

  -- Su rutina
    || chr(10) || chr(10) || case when v_plan is null then '📋 <i>Sin rutina activa</i>'
         else '📋 <b>' || public.html_telegram(v_plan) || '</b>'
              || coalesce(chr(10) || '<blockquote>Le toca: <b>' || public.html_telegram(v_toca) || '</b></blockquote>', '') end

  -- A tener en cuenta
    || coalesce(chr(10) || chr(10) || '🩹 <b>A tener en cuenta</b>' || chr(10) || '<blockquote>' || v_cuidados || '</blockquote>', '')

  -- Agenda y seguimiento
    || chr(10) || chr(10) || '📅 Próxima cita: ' || coalesce('<b>' || public.fecha_corta_tg((v_proxima at time zone p_zona)::date) || ', '
              || public.hora_telegram(v_proxima, p_zona) || '</b>', '<i>ninguna</i>')
    || chr(10) || '🕘 Última sesión: ' || coalesce('<b>' || public.fecha_corta_tg(v_ultima) || '</b>'
              || ' <i>(' || case v_hoy - v_ultima when 0 then 'hoy' when 1 then 'ayer' else 'hace ' || (v_hoy - v_ultima) || ' días' end || ')</i>', '<i>ninguna</i>')
    || case when v_peso.peso_kg is null then ''
            else chr(10) || '⚖️ Peso: <b>' || replace(to_char(v_peso.peso_kg, 'FM999990.0'), '.', ',') || ' kg</b>'
                 || coalesce(' (' || case when v_peso.cambio >= 0 then '+' else '' end || replace(to_char(v_peso.cambio, 'FM999990.0'), '.', ',') || ')', '')
                 || ' <i>· ' || public.fecha_corta_tg((v_peso.medido_en at time zone p_zona)::date) || '</i>' end
    || case when v_fotos > 0 then chr(10) || '📸 ' || v_fotos || ' foto' || case when v_fotos = 1 then '' else 's' end || ' de progreso' else '' end

  -- Contacto: en texto normal para que Telegram lo reconozca y abra su menú al tocarlo.
    || coalesce(chr(10) || chr(10) || '📞 ' || public.html_telegram(p_alumno.telefono), '')
    || coalesce(chr(10) || '📧 ' || public.html_telegram(p_alumno.correo), '');

  return jsonb_build_object('texto', v_texto, 'teclado',
    jsonb_build_array(
      jsonb_build_array(public.boton_telegram(coalesce('📋 ' || left(v_plan, 30), '📋 Asignar rutina'), 'pl:' || p_alumno.id)),
      case when v_proxima is null
           then jsonb_build_array(public.boton_telegram('📅 Agendar cita', 'ag:' || p_alumno.id))
           else jsonb_build_array(
                  public.boton_telegram('📅 ' || public.fecha_corta_tg((v_proxima at time zone p_zona)::date) || ', ' || public.hora_telegram(v_proxima, p_zona), 'pc:' || p_alumno.id),
                  public.boton_telegram('➕ Agendar', 'ag:' || p_alumno.id)) end,
      jsonb_build_array(public.boton_telegram('🕘 Última sesión', 'us:' || p_alumno.id))
        || case when v_plan is not null then jsonb_build_array(public.boton_telegram('🏋️ Rutina de hoy', 'va:' || p_alumno.id)) else '[]'::jsonb end,
      jsonb_build_array(public.boton_telegram('📝 Nota', 'an:' || p_alumno.id), public.boton_telegram('⚖️ Peso', 'ap:' || p_alumno.id),
                        public.boton_telegram('📸 Foto', 'fo:' || p_alumno.id)))
    || case when public.whatsapp_tg(p_alumno.telefono) is null and public.url_app_tg('/') is null then '[]'::jsonb
            else jsonb_build_array(
                   case when public.whatsapp_tg(p_alumno.telefono) is not null then jsonb_build_array(public.boton_url_tg('💬 WhatsApp', public.whatsapp_tg(p_alumno.telefono))) else '[]'::jsonb end
                   || case when public.url_app_tg('/') is not null then jsonb_build_array(public.boton_url_tg('🔗 Abrir en Blister', public.url_app_tg('/alumnos/' || p_alumno.id))) else '[]'::jsonb end)
       end
    || jsonb_build_array(jsonb_build_array(public.boton_telegram('☰ Menú', 'm:menu'))));
end;
$$;

revoke execute on function public.vista_alumno_tg(public.alumnos, text), public.nombre_tg(text) from authenticated, anon, public;
