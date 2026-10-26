-- Candy Crepas — actualización de la tabla en línea (v5)
-- Córrelo UNA vez en Supabase → SQL Editor → Run (después de supabase-v4.sql).
-- Pestaña "Semana": los mejores creperos de la semana (de lunes a domingo,
-- hora del centro de México). Suma lo ganado en los días que se terminaron
-- esta semana; el lunes empieza de cero sola (no hay que borrar nada).
-- La frase del personaje no necesita cambios: va dentro del personaje.

create index if not exists puntuaciones_creado on public.puntuaciones (creado);

create or replace view public.tabla_semanal with (security_invoker = true) as
select
  t.jugador_id, t.nombre, t.semana, t.mejor_dia, t.dias,
  coalesce((select c.personaje from public.caras c where c.jugador_id = t.jugador_id order by c.creado desc limit 1), t.personaje) as personaje
from (
  select
    jugador_id,
    (array_agg(nombre order by creado desc))[1] as nombre,
    sum(ganado)::int as semana,
    max(ganado) as mejor_dia,
    count(*)::int as dias,
    (array_agg(personaje order by creado desc) filter (where personaje is not null))[1] as personaje
  from public.puntuaciones
  where creado >= (date_trunc('week', now() at time zone 'America/Mexico_City') at time zone 'America/Mexico_City')
  group by jugador_id
) t;
grant select on public.tabla_semanal to anon, authenticated;
