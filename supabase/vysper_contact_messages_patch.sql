-- Contact messages module for the MVP admin dashboard.
-- Public visitors can submit messages. Admins can view and manage them.

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'read', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_contact_messages_updated_at on public.contact_messages;
create trigger set_contact_messages_updated_at
before update on public.contact_messages
for each row execute function public.set_updated_at();

alter table public.contact_messages enable row level security;

drop policy if exists "public_insert_contact_messages" on public.contact_messages;
create policy "public_insert_contact_messages"
on public.contact_messages for insert
to anon, authenticated
with check (true);

drop policy if exists "admins_read_contact_messages" on public.contact_messages;
create policy "admins_read_contact_messages"
on public.contact_messages for select
to authenticated
using (public.is_admin());

drop policy if exists "admins_update_contact_messages" on public.contact_messages;
create policy "admins_update_contact_messages"
on public.contact_messages for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins_delete_contact_messages" on public.contact_messages;
create policy "admins_delete_contact_messages"
on public.contact_messages for delete
to authenticated
using (public.is_admin());
