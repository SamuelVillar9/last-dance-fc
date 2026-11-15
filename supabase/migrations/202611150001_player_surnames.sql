alter table public.players add column if not exists surname text;
alter table public.players drop constraint if exists players_surname_length;
alter table public.players add constraint players_surname_length check (surname is null or length(surname) <= 120);
