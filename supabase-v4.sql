-- Candy Crepas — actualización de la tabla en línea (v4)
-- Córrelo UNA vez en Supabase → SQL Editor → Run (después de supabase-v3.sql).
-- Mini perfil: al tocar a alguien en la tabla se ve su dinero, sus logros, etc.
-- El juego sube una fila cuando esos números cambian (al terminar el día y al
-- salir del juego); el perfil usa la más nueva de cada jugador.

create table if not exists public.perfiles (
  id bigint generated always as identity primary key,
  jugador_id uuid not null,
  dinero int not null check (dinero between -1000000000 and 1000000000),          -- lo que tiene ahorita
  dinero_total int not null check (dinero_total between 0 and 2000000000),        -- todo lo que ha cobrado
  logros int not null check (logros between 0 and 1000),
  dia int not null check (dia between 1 and 100000),
  vendidas int not null check (vendidas between 0 and 10000000),
  creado timestamptz not null default now()
);
create index if not exists perfiles_jugador on public.perfiles (jugador_id, creado desc);

alter table public.perfiles enable row level security;
drop policy if exists "todos leen" on public.perfiles;
drop policy if exists "todos suben" on public.perfiles;
create policy "todos leen" on public.perfiles for select to anon, authenticated using (true);
create policy "todos suben" on public.perfiles for insert to anon, authenticated with check (true);
revoke update, delete, truncate on public.perfiles from anon, authenticated;
