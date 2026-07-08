-- ============================================================
-- 0004 — admin account management
--
-- Adds an is_admin flag and security-definer RPCs so a designated admin can
-- list every account (to recover a forgotten username), reset a password, or
-- delete an account outright. All RPCs re-check is_admin() server-side, so
-- being granted to `authenticated` is safe — a non-admin call just raises.
-- ============================================================

alter table profiles add column if not exists is_admin boolean not null default false;

-- Is the current caller an admin? SECURITY DEFINER so it can read is_admin
-- regardless of the caller's row-level visibility.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;
grant execute on function public.is_admin() to authenticated;

-- List every account (admin only). Exposes usernames so an admin can help a
-- family member who forgot theirs.
create or replace function public.admin_list_accounts()
returns table (id uuid, username text, display_name text, is_admin boolean, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'ต้องเป็นผู้ดูแลเท่านั้น';
  end if;
  return query
    select p.id, p.username, p.display_name, p.is_admin, p.created_at
    from profiles p
    order by p.created_at;
end;
$$;
grant execute on function public.admin_list_accounts() to authenticated;

-- Delete any account (admin only). Clears the target's owned data in dependency
-- order, then removes the auth user (profiles cascades). Admins can't delete
-- their own account here — they use the normal self-delete flow.
create or replace function public.admin_delete_account(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'ต้องเป็นผู้ดูแลเท่านั้น';
  end if;
  if target = auth.uid() then
    raise exception 'ลบบัญชีตัวเองจากหน้าผู้ดูแลไม่ได้';
  end if;

  delete from trips where created_by = target;
  delete from expenses where created_by = target or payer_id = target;
  delete from pool_transactions where profile_id = target;
  delete from trip_members where profile_id = target;
  delete from auth.users where id = target;
end;
$$;
grant execute on function public.admin_delete_account(uuid) to authenticated;

-- Reset any account's password (admin only). GoTrue stores a bcrypt hash in
-- auth.users.encrypted_password; pgcrypto's crypt()/gen_salt('bf') produce a
-- compatible one. pgcrypto lives in the `extensions` schema on Supabase.
create or replace function public.admin_reset_password(target uuid, new_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.is_admin() then
    raise exception 'ต้องเป็นผู้ดูแลเท่านั้น';
  end if;
  if length(coalesce(new_password, '')) < 6 then
    raise exception 'รหัสผ่านอย่างน้อย 6 ตัวอักษร';
  end if;

  update auth.users
    set encrypted_password = crypt(new_password, gen_salt('bf')),
        updated_at = now()
    where id = target;
end;
$$;
grant execute on function public.admin_reset_password(uuid, text) to authenticated;

-- ============================================================
-- MAKE YOURSELF ADMIN: edit the username below and run this line.
-- ============================================================
-- update profiles set is_admin = true where username = 'your_username';
