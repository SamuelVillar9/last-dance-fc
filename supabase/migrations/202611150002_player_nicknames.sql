alter table public.players add column if not exists nickname text;
alter table public.players drop constraint if exists players_nickname_length;
alter table public.players add constraint players_nickname_length check (nickname is null or length(nickname) <= 80);
