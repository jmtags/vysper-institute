-- Speaker management for trainings.
-- Admins can manage speakers and assign them to trainings.
-- Public users can read active speakers attached to active trainings.

create table if not exists public.speakers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  title text,
  specialty text,
  bio_notes text,
  profile_image_url text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_speakers_updated_at on public.speakers;
create trigger set_speakers_updated_at
before update on public.speakers
for each row execute function public.set_updated_at();

create table if not exists public.training_speakers (
  training_id uuid not null references public.trainings(id) on delete cascade,
  speaker_id uuid not null references public.speakers(id) on delete cascade,
  sort_order int not null default 0,
  primary key (training_id, speaker_id)
);

create index if not exists idx_training_speakers_training_id on public.training_speakers(training_id);
create index if not exists idx_training_speakers_speaker_id on public.training_speakers(speaker_id);

alter table public.speakers enable row level security;
alter table public.training_speakers enable row level security;

drop policy if exists "speakers_public_read_active" on public.speakers;
create policy "speakers_public_read_active"
on public.speakers for select
to anon, authenticated
using (is_active = true or public.is_admin());

drop policy if exists "admins_manage_speakers" on public.speakers;
create policy "admins_manage_speakers"
on public.speakers for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "training_speakers_public_read" on public.training_speakers;
create policy "training_speakers_public_read"
on public.training_speakers for select
to anon, authenticated
using (
  exists (
    select 1
    from public.trainings t
    join public.speakers s on s.id = speaker_id
    where t.id = training_id
      and (t.is_active = true or public.is_admin())
      and (s.is_active = true or public.is_admin())
  )
);

drop policy if exists "admins_manage_training_speakers" on public.training_speakers;
create policy "admins_manage_training_speakers"
on public.training_speakers for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
