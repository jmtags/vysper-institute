-- Certificate verification module.
-- Public visitors can verify active or revoked certificates by certificate number.
-- Admins can create, update, archive, and manage all certificate records.

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_number text not null unique,
  recipient_name text not null,
  program_title text not null,
  issued_date date not null,
  completion_date date,
  facilitator_name text,
  remarks text,
  status text not null default 'active' check (status in ('active', 'revoked', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_certificates_updated_at on public.certificates;
create trigger set_certificates_updated_at
before update on public.certificates
for each row execute function public.set_updated_at();

create index if not exists idx_certificates_certificate_number on public.certificates(certificate_number);
create index if not exists idx_certificates_status on public.certificates(status);

alter table public.certificates enable row level security;

drop policy if exists "public_verify_active_or_revoked_certificates" on public.certificates;
create policy "public_verify_active_or_revoked_certificates"
on public.certificates for select
to anon, authenticated
using (status in ('active', 'revoked') or public.is_admin());

drop policy if exists "admins_manage_certificates" on public.certificates;
create policy "admins_manage_certificates"
on public.certificates for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
