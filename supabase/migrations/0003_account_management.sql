-- ============================================================
-- 0003 — self-service account deletion
--
-- A user can't delete their own auth.users row from the client (needs elevated
-- privileges), and several tables reference profiles with RESTRICT foreign keys
-- (trips.created_by, expenses.payer_id/created_by, pool_transactions.profile_id),
-- so a naive delete would fail. This security-definer RPC clears the caller's
-- data in dependency order, then deletes the auth user — profiles and the
-- remaining cascade-linked rows (trip_members, expense_splits) drop automatically.
-- ============================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- Trips I created: deleting the trip cascades its members, expenses, splits,
  -- category budgets and pool transactions.
  delete from trips where created_by = uid;

  -- My expenses in trips created by other people (cascades their splits).
  delete from expenses where created_by = uid or payer_id = uid;

  -- My pool-ledger entries in other people's trips.
  delete from pool_transactions where profile_id = uid;

  -- My memberships in other people's trips.
  delete from trip_members where profile_id = uid;

  -- Finally the auth user. profiles.id references auth.users(id) on delete
  -- cascade, so the profile row (and any remaining cascade-linked rows) go too.
  delete from auth.users where id = uid;
end;
$$;

grant execute on function public.delete_my_account() to authenticated;
