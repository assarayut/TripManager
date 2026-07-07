-- ============================================================
-- 0002 — join by invite code under RLS
--
-- The trips SELECT policy is member-only, so joining by invite code can't work
-- from the client: a non-member can't read the trip to look up its id. This
-- security-definer RPC resolves the code, adds the caller as a member, and
-- returns the trip id atomically.
--
-- (Trip creation is handled entirely app-side: the id is generated client-side
-- and the row is inserted without a select-back, so no SELECT-policy change is
-- needed there.)
-- ============================================================

-- Atomic "join by invite code": resolve the code, add the caller as a member,
-- return the trip id. security definer bypasses the member-only SELECT so a
-- brand-new joiner can be added; the caller is always auth.uid(), never spoofable.
create or replace function public.join_trip_by_code(p_code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_trip_id uuid;
begin
  select id into v_trip_id
  from trips
  where invite_code = upper(trim(p_code));

  if v_trip_id is null then
    raise exception 'ไม่พบทริปที่ใช้รหัสนี้' using errcode = 'P0001';
  end if;

  insert into trip_members (trip_id, profile_id)
  values (v_trip_id, auth.uid())
  on conflict (trip_id, profile_id) do nothing;

  return v_trip_id;
end;
$$;

grant execute on function public.join_trip_by_code(text) to authenticated;

-- Let the trip creator delete their trip. All child rows (members, expenses,
-- splits, category budgets, pool transactions) cascade via their
-- `on delete cascade` foreign keys.
create policy "the creator can delete their trip"
  on trips for delete to authenticated
  using (created_by = auth.uid());
