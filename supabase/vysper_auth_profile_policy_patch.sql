-- Allows a signed-in user to create their own profile row if the auth trigger
-- did not create it yet. Safe to run after the main MVP schema.

drop policy if exists "profiles_insert_own_user" on public.profiles;
create policy "profiles_insert_own_user"
on public.profiles for insert
to authenticated
with check (id = auth.uid() and role = 'user');
