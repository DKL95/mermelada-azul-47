-- Candy Crepas: tabla de puntuaciones en línea (Supabase → SQL Editor → Run)
create table public.puntuaciones (
  id bigint generated always as identity primary key,
  envio uuid not null unique,              -- lo genera el juego: evita duplicados al reintentar
  jugador_id uuid not null,
  nombre text not null check (char_length(nombre) between 1 and 20),
  dia int not null check (dia between 1 and 10000),
  ganado int not null check (ganado between 0 and 100000),
  vendidas int not null check (vendidas between 0 and 500),
  reputacion numeric(2,1) not null check (reputacion between 0 and 5),
  creado timestamptz not null default now()
);
create index on public.puntuaciones (jugador_id);

alter table public.puntuaciones enable row level security;
create policy "todos leen" on public.puntuaciones for select to anon, authenticated using (true);
create policy "todos suben" on public.puntuaciones for insert to anon, authenticated with check (true);
revoke update, delete, truncate on public.puntuaciones from anon, authenticated;

-- Una fila por jugador: su mejor día y lo acumulado
create view public.tabla_jugadores with (security_invoker = true) as
select
  jugador_id,
  (array_agg(nombre order by creado desc))[1] as nombre,
  max(ganado) as mejor_dia,
  sum(ganado)::int as total,
  max(dia) as dias,
  max(creado) as ultimo
from public.puntuaciones
group by jugador_id;
grant select on public.tabla_jugadores to anon, authenticated;
