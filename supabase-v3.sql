-- Candy Crepas — actualización de la tabla en línea (v3)
-- Córrelo UNA vez en Supabase → SQL Editor → Run (después de supabase-v2.sql).
-- El juego sube el personaje al abrirse (y cada vez que cambia), así cada
-- jugador sale con su carita sin esperar a terminar un día.

-- 1) Caritas: una fila cada vez que alguien cambia su personaje
create table if not exists public.caras (
  id bigint generated always as identity primary key,
  jugador_id uuid not null,
  personaje jsonb not null check (octet_length(personaje::text) <= 3000),
  creado timestamptz not null default now()
);
create index if not exists caras_jugador on public.caras (jugador_id, creado desc);

alter table public.caras enable row level security;
drop policy if exists "todos leen" on public.caras;
drop policy if exists "todos suben" on public.caras;
create policy "todos leen" on public.caras for select to anon, authenticated using (true);
create policy "todos suben" on public.caras for insert to anon, authenticated with check (true);
revoke update, delete, truncate on public.caras from anon, authenticated;

-- 2) Las tablas usan la carita más nueva (y si no hay, la que vino con los puntos)
create or replace view public.tabla_jugadores with (security_invoker = true) as
select
  t.jugador_id, t.nombre, t.mejor_dia, t.total, t.dias, t.ultimo,
  coalesce((select c.personaje from public.caras c where c.jugador_id = t.jugador_id order by c.creado desc limit 1), t.personaje) as personaje
from (
  select
    jugador_id,
    (array_agg(nombre order by creado desc))[1] as nombre,
    max(ganado) as mejor_dia,
    sum(ganado)::int as total,
    max(dia) as dias,
    max(creado) as ultimo,
    (array_agg(personaje order by creado desc) filter (where personaje is not null))[1] as personaje
  from public.puntuaciones
  group by jugador_id
) t;
grant select on public.tabla_jugadores to anon, authenticated;

create or replace view public.tabla_sinfin with (security_invoker = true) as
select
  t.jugador_id, t.nombre, t.mejor, t.crepas, t.partidas,
  coalesce((select c.personaje from public.caras c where c.jugador_id = t.jugador_id order by c.creado desc limit 1), t.personaje) as personaje
from (
  select
    jugador_id,
    (array_agg(nombre order by creado desc))[1] as nombre,
    max(puntos) as mejor,
    max(crepas) as crepas,
    count(*)::int as partidas,
    (array_agg(personaje order by creado desc) filter (where personaje is not null))[1] as personaje
  from public.sinfin
  group by jugador_id
) t;
grant select on public.tabla_sinfin to anon, authenticated;
