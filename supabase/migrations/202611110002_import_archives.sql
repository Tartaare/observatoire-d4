-- Import atomique dans une saison encore vide. Jamais d'écrasement des archives distantes.
create function public.od_import(p_season integer, p_state jsonb, p_snapshot jsonb)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare r public.od_seasons;
begin
  insert into public.od_seasons(season) values (p_season) on conflict do nothing;
  select * into r from public.od_seasons where season = p_season for update;
  if r.lease_until > now() or coalesce((r.state->>'running')::boolean, false)
    or exists (select 1 from public.od_fixtures where season = p_season) then
    raise exception 'Saison déjà utilisée ; import refusé pour préserver les archives';
  end if;
  insert into public.od_fixtures(season, url, data)
    select p_season, value->>'url', value from jsonb_array_elements(p_snapshot->'fixtures');
  insert into public.od_matches(season, url, data)
    select p_season, value->>'url', value from jsonb_array_elements(p_snapshot->'matches');
  update public.od_seasons set state = p_state || '{"running":false,"stage":"finished","queue":[]}'::jsonb,
    owner = null, lease_until = null where season = p_season;
  return true;
end $$;
revoke all on function public.od_import(integer, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.od_import(integer, jsonb, jsonb) to service_role;
