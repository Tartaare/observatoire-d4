-- Tables dédiées ; aucun objet existant du projet n'est modifié.
create table public.od_members (user_id uuid primary key references auth.users(id) on delete cascade);
create table public.od_seasons (
  season integer primary key check (season between 2000 and 2100),
  state jsonb not null default '{}', owner uuid, lease_until timestamptz
);
create table public.od_fixtures (
  season integer not null references public.od_seasons(season), url text not null,
  data jsonb not null, primary key (season, url)
);
create table public.od_matches (
  season integer not null, url text not null, data jsonb not null,
  primary key (season, url), foreign key (season, url) references public.od_fixtures(season, url)
);
create table public.od_sources (url text primary key, data jsonb not null);

alter table public.od_members enable row level security;
alter table public.od_seasons enable row level security;
alter table public.od_fixtures enable row level security;
alter table public.od_matches enable row level security;
alter table public.od_sources enable row level security;
revoke all on public.od_members, public.od_seasons, public.od_fixtures, public.od_matches, public.od_sources from anon, authenticated;
grant all on public.od_members, public.od_seasons, public.od_fixtures, public.od_matches, public.od_sources to service_role;

-- Un bail court protège toutes les écritures d'une opération, même entre deux onglets.
create function public.od_claim(p_season integer, p_start boolean, p_force boolean)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare r public.od_seasons; token uuid := gen_random_uuid();
begin
  insert into public.od_seasons(season) values (p_season) on conflict do nothing;
  select * into r from public.od_seasons where season = p_season for update;
  if r.lease_until > now() then return null; end if;
  if p_start then
    if coalesce((r.state->>'running')::boolean, false) then return null; end if;
    r.state := r.state || jsonb_build_object('running', true, 'stage', 'standings',
      'phase', 'Lecture des calendriers', 'queue', '[]'::jsonb, 'force', p_force,
      'done', 0, 'total', 0, 'errors', '[]'::jsonb, 'requests', 0, 'cached', 0,
      'startedAt', now(), 'finishedAt', null);
  elsif not coalesce((r.state->>'running')::boolean, false) then return null;
  end if;
  update public.od_seasons set state = r.state, owner = token, lease_until = now() + interval '120 seconds'
    where season = p_season;
  return jsonb_build_object('owner', token, 'state', r.state);
end $$;

create function public.od_commit(p_season integer, p_owner uuid, p_change jsonb)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare item jsonb;
begin
  perform 1 from public.od_seasons where season = p_season and owner = p_owner and lease_until > now() for update;
  if not found then raise exception 'Bail de collecte expiré'; end if;
  for item in select value from jsonb_array_elements(coalesce(p_change->'fixtures', '[]'::jsonb)) loop
    insert into public.od_fixtures(season, url, data) values (p_season, item->>'url', item)
      on conflict (season, url) do update set data = excluded.data;
  end loop;
  if p_change ? 'match' then
    item := p_change->'match';
    insert into public.od_matches(season, url, data) values (p_season, item->>'url', item)
      on conflict (season, url) do update set data = excluded.data;
  end if;
  if p_change ? 'page' then
    item := p_change->'page';
    insert into public.od_sources(url, data) values (item->>'url', item->'data')
      on conflict (url) do update set data = excluded.data;
  end if;
  update public.od_seasons set state = p_change->'state', owner = null, lease_until = null where season = p_season;
  return true;
end $$;

create function public.od_snapshot(p_season integer)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'fixtures', coalesce((select jsonb_agg(data order by url) from public.od_fixtures where season = p_season), '[]'::jsonb),
    'matches', coalesce((select jsonb_agg(data order by url) from public.od_matches where season = p_season), '[]'::jsonb)
  );
$$;

revoke all on function public.od_claim(integer, boolean, boolean) from public, anon, authenticated;
revoke all on function public.od_commit(integer, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.od_snapshot(integer) from public, anon, authenticated;
grant execute on function public.od_claim(integer, boolean, boolean) to service_role;
grant execute on function public.od_commit(integer, uuid, jsonb) to service_role;
grant execute on function public.od_snapshot(integer) to service_role;
