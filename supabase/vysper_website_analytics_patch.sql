-- Website visit analytics for the admin dashboard.
-- Public visitors can create visit events. Only admins can read or manage analytics.

create table if not exists public.website_visits (
  id uuid primary key default gen_random_uuid(),
  page_key text not null,
  page_title text not null,
  training_id uuid references public.trainings(id) on delete set null,
  visitor_id text,
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_website_visits_created_at on public.website_visits(created_at desc);
create index if not exists idx_website_visits_page_key on public.website_visits(page_key);
create index if not exists idx_website_visits_training_id on public.website_visits(training_id);
create index if not exists idx_website_visits_visitor_id on public.website_visits(visitor_id);

alter table public.website_visits enable row level security;

drop policy if exists "public_insert_website_visits" on public.website_visits;
create policy "public_insert_website_visits"
on public.website_visits for insert
to anon, authenticated
with check (true);

drop policy if exists "admins_read_website_visits" on public.website_visits;
create policy "admins_read_website_visits"
on public.website_visits for select
to authenticated
using (public.is_admin());

drop policy if exists "admins_delete_website_visits" on public.website_visits;
create policy "admins_delete_website_visits"
on public.website_visits for delete
to authenticated
using (public.is_admin());
