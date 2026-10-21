-- Candy Crepas — actualización de la tabla en línea (v2)
-- Córrelo UNA vez en Supabase → SQL Editor → Run (después de supabase.sql).
-- Agrega el personaje a la tabla y crea la tabla del modo sin fin.

-- 1) Personaje de cada jugador (para su carita en la tabla)
alter table public.puntuaciones
  add column if not exists personaje jsonb
  check (personaje is null or octet_length(personaje::text) <= 3000);

create or replace view public.tabla_jugadores with (security_invoker = true) as
select
  jugador_id,
  (array_agg(nombre order by creado desc))[1] as nombre,
  max(ganado) as mejor_dia,
  sum(ganado)::int as total,
  max(dia) as dias,
  max(creado) as ultimo,
  (array_agg(personaje order by creado desc) filter (where personaje is not null))[1] as personaje
from public.puntuaciones
group by jugador_id;
grant select on public.tabla_jugadores to anon, authenticated;

-- 2) Modo sin fin: una fila por partida
create table if not exists public.sinfin (
  id bigint generated always as identity primary key,
  envio uuid not null unique,              -- lo genera el juego: evita duplicados al reintentar
  jugador_id uuid not null,
  nombre text not null check (char_length(nombre) between 1 and 20),
  puntos int not null check (puntos between 0 and 1000000),
  crepas int not null check (crepas between 0 and 5000),
  segundos int not null check (segundos between 0 and 86400),
  personaje jsonb check (personaje is null or octet_length(personaje::text) <= 3000),
  creado timestamptz not null default now()
);
create index if not exists sinfin_jugador on public.sinfin (jugador_id);

alter table public.sinfin enable row level security;
drop policy if exists "todos leen" on public.sinfin;
drop policy if exists "todos suben" on public.sinfin;
create policy "todos leen" on public.sinfin for select to anon, authenticated using (true);
create policy "todos suben" on public.sinfin for insert to anon, authenticated with check (true);
revoke update, delete, truncate on public.sinfin from anon, authenticated;

-- Una fila por jugador: su mejor partida
create or replace view public.tabla_sinfin with (security_invoker = true) as
select
  jugador_id,
  (array_agg(nombre order by creado desc))[1] as nombre,
  max(puntos) as mejor,
  max(crepas) as crepas,
  count(*)::int as partidas,
  (array_agg(personaje order by creado desc) filter (where personaje is not null))[1] as personaje
from public.sinfin
group by jugador_id;
grant select on public.tabla_sinfin to anon, authenticated;
