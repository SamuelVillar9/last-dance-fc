begin;
create or replace function public.validate_report() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.entries is null or jsonb_typeof(new.entries)<>'array' or jsonb_array_length(new.entries)>30 then raise exception 'Acta no válida'; end if;
 if exists(select 1 from jsonb_array_elements(new.entries) e where jsonb_typeof(e)<>'object' or not (e ?& array['playerId','goals','assists','yellow','red']) or jsonb_typeof(e->'playerId') is distinct from 'string' or jsonb_typeof(e->'goals') is distinct from 'number' or jsonb_typeof(e->'assists') is distinct from 'number' or jsonb_typeof(e->'yellow') is distinct from 'number' or jsonb_typeof(e->'red') is distinct from 'number' or not exists(select 1 from public.players p where p.id=e->>'playerId') or (e->>'goals') !~ '^\d+$' or (e->>'assists') !~ '^\d+$' or (e->>'yellow') !~ '^\d+$' or (e->>'red') !~ '^\d+$' or (e->>'goals')::int>100 or (e->>'assists')::int>100 or (e->>'yellow')::int>2 or (e->>'red')::int>1) then raise exception 'Participación no válida'; end if;
 if exists(select 1 from jsonb_array_elements(new.entries) e join public.players p on p.id=e->>'playerId' where e ? 'goalsConceded' and e->'goalsConceded'<>'null'::jsonb and (p.position is distinct from 'Portero' or jsonb_typeof(e->'goalsConceded')<>'number' or (e->>'goalsConceded') !~ '^\\d+<>(select count(distinct e->>'playerId') from jsonb_array_elements(new.entries)e) then raise exception 'Jugador duplicado';end if;
 if not exists(select 1 from public.league_snapshots l cross join lateral jsonb_array_elements(l.data->'matches') m where m->>'key'=new.match_key and m->>'status'='played' and (m->>'home'='LAST DANCE' or m->>'away'='LAST DANCE')) then raise exception 'El partido debe ser del LAST DANCE y tener resultado oficial';end if;
 new.updated_at=now();return new;
end; $$;
 or length(e->>'goalsConceded')>3 or (e->>'goalsConceded')::int>100)) then raise exception 'Goles encajados no válidos'; end if;
 if (select count(*) from jsonb_array_elements(new.entries))<>(select count(distinct e->>'playerId') from jsonb_array_elements(new.entries)e) then raise exception 'Jugador duplicado';end if;
 if not exists(select 1 from public.league_snapshots l cross join lateral jsonb_array_elements(l.data->'matches') m where m->>'key'=new.match_key and m->>'status'='played' and (m->>'home'='LAST DANCE' or m->>'away'='LAST DANCE')) then raise exception 'El partido debe ser del LAST DANCE y tener resultado oficial';end if;
 new.updated_at=now();return new;
end; $$;
commit;
