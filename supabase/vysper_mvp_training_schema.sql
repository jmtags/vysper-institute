-- VYSPER INSTITUTE MVP schema for Supabase
-- Paste this into Supabase SQL Editor and run it once.

create extension if not exists pgcrypto;

do $$
begin
  create type public.app_role as enum ('admin', 'user');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.service_status as enum ('active', 'coming_soon', 'hidden');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.proposal_status as enum ('draft', 'submitted', 'accepted', 'declined', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.add_on_pricing_type as enum ('included', 'fixed', 'per_participant');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    'user'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  status public.service_status not null default 'coming_soon',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_services_updated_at on public.services;
create trigger set_services_updated_at
before update on public.services
for each row execute function public.set_updated_at();

create table if not exists public.training_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_training_categories_updated_at on public.training_categories;
create trigger set_training_categories_updated_at
before update on public.training_categories
for each row execute function public.set_updated_at();

create table if not exists public.trainings (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.training_categories(id) on delete set null,
  slug text not null unique,
  title text not null,
  short_description text not null,
  overview text not null,
  target_participants text,
  duration text not null,
  delivery_mode text not null,
  image_icon text,
  min_participants int not null default 15 check (min_participants > 0),
  max_participants int not null default 30 check (max_participants >= min_participants),
  base_price numeric(12,2) not null default 25000 check (base_price >= 0),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_trainings_updated_at on public.trainings;
create trigger set_trainings_updated_at
before update on public.trainings
for each row execute function public.set_updated_at();

create table if not exists public.training_objectives (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.trainings(id) on delete cascade,
  objective text not null,
  sort_order int not null default 0
);

create table if not exists public.training_outline_items (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.trainings(id) on delete cascade,
  title text not null,
  sort_order int not null default 0
);

create table if not exists public.training_testimonials (
  id uuid primary key default gen_random_uuid(),
  training_id uuid references public.trainings(id) on delete cascade,
  client_name text not null,
  client_role text,
  content text not null,
  rating int not null default 5 check (rating between 1 and 5),
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table if not exists public.training_add_ons (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  pricing_type public.add_on_pricing_type not null,
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_training_add_ons_updated_at on public.training_add_ons;
create trigger set_training_add_ons_updated_at
before update on public.training_add_ons
for each row execute function public.set_updated_at();

create table if not exists public.training_proposals (
  id uuid primary key default gen_random_uuid(),
  proposal_number text not null unique default ('VYSPER-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  user_id uuid not null references auth.users(id) on delete cascade,
  training_id uuid not null references public.trainings(id) on delete restrict,
  status public.proposal_status not null default 'draft',
  organization_name text,
  contact_person text,
  contact_email text,
  contact_phone text,
  participants int not null check (participants > 0),
  duration text not null,
  delivery_mode text not null,
  venue text not null check (venue in ('client-site', 'vysper-site')),
  preferred_date date,
  base_price numeric(12,2) not null default 0 check (base_price >= 0),
  total_price numeric(12,2) not null default 0 check (total_price >= 0),
  admin_notes text,
  decline_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_training_proposals_updated_at on public.training_proposals;
create trigger set_training_proposals_updated_at
before update on public.training_proposals
for each row execute function public.set_updated_at();

create table if not exists public.training_proposal_add_ons (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.training_proposals(id) on delete cascade,
  add_on_id uuid not null references public.training_add_ons(id) on delete restrict,
  quantity int not null default 1 check (quantity >= 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  total_price numeric(12,2) not null default 0 check (total_price >= 0),
  unique (proposal_id, add_on_id)
);

create index if not exists idx_trainings_category_id on public.trainings(category_id);
create index if not exists idx_trainings_active on public.trainings(is_active);
create index if not exists idx_training_proposals_user_id on public.training_proposals(user_id);
create index if not exists idx_training_proposals_training_id on public.training_proposals(training_id);
create index if not exists idx_training_proposals_status on public.training_proposals(status);

alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.training_categories enable row level security;
alter table public.trainings enable row level security;
alter table public.training_objectives enable row level security;
alter table public.training_outline_items enable row level security;
alter table public.training_testimonials enable row level security;
alter table public.training_add_ons enable row level security;
alter table public.training_proposals enable row level security;
alter table public.training_proposal_add_ons enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own_basic" on public.profiles;
create policy "profiles_update_own_basic"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid() and role = 'user');

drop policy if exists "profiles_insert_own_user" on public.profiles;
create policy "profiles_insert_own_user"
on public.profiles for insert
to authenticated
with check (id = auth.uid() and role = 'user');

drop policy if exists "admins_manage_profiles" on public.profiles;
create policy "admins_manage_profiles"
on public.profiles for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "services_public_read_visible" on public.services;
create policy "services_public_read_visible"
on public.services for select
to anon, authenticated
using (status <> 'hidden');

drop policy if exists "admins_manage_services" on public.services;
create policy "admins_manage_services"
on public.services for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "training_categories_public_read" on public.training_categories;
create policy "training_categories_public_read"
on public.training_categories for select
to anon, authenticated
using (true);

drop policy if exists "admins_manage_training_categories" on public.training_categories;
create policy "admins_manage_training_categories"
on public.training_categories for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "trainings_public_read_active" on public.trainings;
create policy "trainings_public_read_active"
on public.trainings for select
to anon, authenticated
using (is_active = true or public.is_admin());

drop policy if exists "admins_manage_trainings" on public.trainings;
create policy "admins_manage_trainings"
on public.trainings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "training_objectives_public_read" on public.training_objectives;
create policy "training_objectives_public_read"
on public.training_objectives for select
to anon, authenticated
using (
  exists (
    select 1 from public.trainings t
    where t.id = training_id
      and (t.is_active = true or public.is_admin())
  )
);

drop policy if exists "admins_manage_training_objectives" on public.training_objectives;
create policy "admins_manage_training_objectives"
on public.training_objectives for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "training_outline_public_read" on public.training_outline_items;
create policy "training_outline_public_read"
on public.training_outline_items for select
to anon, authenticated
using (
  exists (
    select 1 from public.trainings t
    where t.id = training_id
      and (t.is_active = true or public.is_admin())
  )
);

drop policy if exists "admins_manage_training_outline" on public.training_outline_items;
create policy "admins_manage_training_outline"
on public.training_outline_items for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "training_testimonials_public_read_active" on public.training_testimonials;
create policy "training_testimonials_public_read_active"
on public.training_testimonials for select
to anon, authenticated
using (is_active = true);

drop policy if exists "admins_manage_training_testimonials" on public.training_testimonials;
create policy "admins_manage_training_testimonials"
on public.training_testimonials for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "training_add_ons_public_read_active" on public.training_add_ons;
create policy "training_add_ons_public_read_active"
on public.training_add_ons for select
to anon, authenticated
using (is_active = true or public.is_admin());

drop policy if exists "admins_manage_training_add_ons" on public.training_add_ons;
create policy "admins_manage_training_add_ons"
on public.training_add_ons for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "users_insert_own_training_proposals" on public.training_proposals;
create policy "users_insert_own_training_proposals"
on public.training_proposals for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "users_read_own_training_proposals" on public.training_proposals;
create policy "users_read_own_training_proposals"
on public.training_proposals for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "users_update_own_draft_training_proposals" on public.training_proposals;
create policy "users_update_own_open_training_proposals"
on public.training_proposals for update
to authenticated
using (user_id = auth.uid() and status not in ('accepted', 'archived'))
with check (user_id = auth.uid() and status not in ('accepted', 'archived'));

drop policy if exists "admins_manage_training_proposals" on public.training_proposals;
create policy "admins_manage_training_proposals"
on public.training_proposals for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "users_manage_own_proposal_add_ons" on public.training_proposal_add_ons;
create policy "users_manage_own_open_proposal_add_ons"
on public.training_proposal_add_ons for all
to authenticated
using (
  exists (
    select 1 from public.training_proposals p
    where p.id = proposal_id
      and (
        public.is_admin()
        or (p.user_id = auth.uid() and p.status not in ('accepted', 'archived'))
      )
  )
)
with check (
  exists (
    select 1 from public.training_proposals p
    where p.id = proposal_id
      and (
        public.is_admin()
        or (p.user_id = auth.uid() and p.status not in ('accepted', 'archived'))
      )
  )
);

insert into public.services (slug, name, description, status, sort_order)
values
  ('trainings', 'Corporate Trainings', 'Evidence-based training programs for organizations and institutions.', 'active', 1),
  ('online-courses', 'Online Courses', 'Self-paced learning programs.', 'coming_soon', 2),
  ('digital-products', 'Digital Products', 'Digital resources, templates, and toolkits.', 'coming_soon', 3),
  ('physical-products', 'Physical Products', 'Training kits, books, and assessment tools.', 'coming_soon', 4)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  status = excluded.status,
  sort_order = excluded.sort_order;

insert into public.training_categories (name, slug, sort_order)
values
  ('Mental Health', 'mental-health', 1),
  ('Workplace Development', 'workplace-development', 2),
  ('School-Based Programs', 'school-based-programs', 3)
on conflict (slug) do update set
  name = excluded.name,
  sort_order = excluded.sort_order;

insert into public.trainings (
  category_id, slug, title, short_description, overview, target_participants,
  duration, delivery_mode, image_icon, min_participants, max_participants, base_price, sort_order
)
values
  (
    (select id from public.training_categories where slug = 'mental-health'),
    'mental-health-first-aid-workplace',
    'Mental Health First Aid in the Workplace',
    'Equip your team with skills to recognize and respond to mental health challenges',
    'This comprehensive training program equips participants with evidence-based knowledge and practical skills for recognizing, responding to, and supporting mental health concerns in professional settings.',
    'HR professionals, team leaders, managers, wellness champions, and staff responsible for supporting workplace well-being.',
    'Half-day',
    'Hybrid',
    'brain',
    15,
    30,
    25000,
    1
  ),
  (
    (select id from public.training_categories where slug = 'workplace-development'),
    'leadership-emotional-intelligence',
    'Leadership & Emotional Intelligence',
    'Develop emotionally intelligent leaders who inspire and engage teams',
    'A practical leadership program focused on self-awareness, empathy, communication, and emotionally intelligent decision-making.',
    'Managers, supervisors, team leads, and emerging leaders.',
    'Whole-day',
    'Face-to-Face',
    'users',
    15,
    30,
    35000,
    2
  ),
  (
    (select id from public.training_categories where slug = 'school-based-programs'),
    'building-resilient-school-communities',
    'Building Resilient School Communities',
    'Create supportive environments that promote student and staff well-being',
    'A school-centered program for strengthening resilience, psychological safety, and coordinated support systems for students and staff.',
    'Educators, guidance teams, school administrators, and student support personnel.',
    '2 hours',
    'Online',
    'school',
    15,
    30,
    20000,
    3
  ),
  (
    (select id from public.training_categories where slug = 'mental-health'),
    'stress-management-burnout-prevention',
    'Stress Management & Burnout Prevention',
    'Evidence-based strategies to manage stress and prevent burnout',
    'A skills-based session that helps participants understand stress patterns, apply coping strategies, and design sustainable well-being routines.',
    'Employees, team leaders, wellness committees, and high-demand teams.',
    'Half-day',
    'Hybrid',
    'leaf',
    15,
    30,
    25000,
    4
  ),
  (
    (select id from public.training_categories where slug = 'workplace-development'),
    'effective-communication-skills',
    'Effective Communication Skills',
    'Master the art of clear, empathetic, and impactful communication',
    'A practical communication workshop covering active listening, feedback, conflict navigation, and message clarity.',
    'Professionals, managers, client-facing teams, and cross-functional teams.',
    'Whole-day',
    'Face-to-Face',
    'message',
    15,
    30,
    35000,
    5
  ),
  (
    (select id from public.training_categories where slug = 'school-based-programs'),
    'trauma-informed-care-educators',
    'Trauma-Informed Care for Educators',
    'Understand and support students who have experienced trauma',
    'A trauma-informed program that helps educators identify trauma responses, respond with care, and build supportive classroom practices.',
    'Teachers, school administrators, guidance counselors, and student support staff.',
    'Whole-day',
    'Hybrid',
    'handshake',
    15,
    30,
    35000,
    6
  )
on conflict (slug) do update set
  category_id = excluded.category_id,
  title = excluded.title,
  short_description = excluded.short_description,
  overview = excluded.overview,
  target_participants = excluded.target_participants,
  duration = excluded.duration,
  delivery_mode = excluded.delivery_mode,
  image_icon = excluded.image_icon,
  min_participants = excluded.min_participants,
  max_participants = excluded.max_participants,
  base_price = excluded.base_price,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.training_add_ons (key, name, description, pricing_type, unit_price, sort_order)
values
  ('certificates', 'Certificates of Completion', 'Professional certificates for all participants.', 'included', 0, 1),
  ('training_kits', 'Training Kits', 'Workbooks, pens, and materials for each participant.', 'per_participant', 500, 2),
  ('booth', 'Booth Setup', 'Professional booth for events and wellness fairs.', 'fixed', 8000, 3),
  ('screening', 'Psychological Screening', 'Pre-training assessment and personalized insights.', 'per_participant', 300, 4),
  ('additional_facilitator', 'Additional Facilitator', 'For larger groups or specialized sessions.', 'fixed', 8000, 5)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  pricing_type = excluded.pricing_type,
  unit_price = excluded.unit_price,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.training_objectives (training_id, objective, sort_order)
select t.id, v.objective, v.sort_order
from public.trainings t
cross join (
  values
    ('Understand key concepts and theoretical foundations', 1),
    ('Develop practical skills through interactive exercises', 2),
    ('Apply evidence-based strategies in real-world scenarios', 3),
    ('Build confidence in handling challenging situations', 4),
    ('Create sustainable action plans for implementation', 5)
) as v(objective, sort_order)
where not exists (
  select 1 from public.training_objectives existing where existing.training_id = t.id
);

insert into public.training_outline_items (training_id, title, sort_order)
select t.id, v.title, v.sort_order
from public.trainings t
cross join (
  values
    ('Introduction and Foundation Concepts', 1),
    ('Core Principles and Framework', 2),
    ('Practical Application and Skills Practice', 3),
    ('Case Studies and Group Discussion', 4),
    ('Action Planning and Integration', 5)
) as v(title, sort_order)
where not exists (
  select 1 from public.training_outline_items existing where existing.training_id = t.id
);

insert into public.training_testimonials (training_id, client_name, client_role, content, rating, sort_order)
select t.id, v.client_name, v.client_role, v.content, v.rating, v.sort_order
from public.trainings t
cross join (
  values
    ('Anna Rodriguez', 'Team Leader, ABC Corporation', 'This training exceeded our expectations. Highly practical and immediately applicable.', 5, 1),
    ('Michael Tan', 'HR Manager, XYZ Inc.', 'The facilitators were excellent. Our team gained valuable insights and tools.', 5, 2)
) as v(client_name, client_role, content, rating, sort_order)
where t.slug = 'mental-health-first-aid-workplace'
  and not exists (
    select 1 from public.training_testimonials existing where existing.training_id = t.id
  );

-- After creating your first admin user in Supabase Auth, run this separately:
-- update public.profiles set role = 'admin' where email = 'your-admin-email@example.com';

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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'speaker-profiles',
  'speaker-profiles',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

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

drop policy if exists "public_read_speaker_profile_images" on storage.objects;
create policy "public_read_speaker_profile_images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'speaker-profiles');

drop policy if exists "admins_insert_speaker_profile_images" on storage.objects;
create policy "admins_insert_speaker_profile_images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'speaker-profiles' and public.is_admin());

drop policy if exists "admins_update_speaker_profile_images" on storage.objects;
create policy "admins_update_speaker_profile_images"
on storage.objects for update
to authenticated
using (bucket_id = 'speaker-profiles' and public.is_admin())
with check (bucket_id = 'speaker-profiles' and public.is_admin());

drop policy if exists "admins_delete_speaker_profile_images" on storage.objects;
create policy "admins_delete_speaker_profile_images"
on storage.objects for delete
to authenticated
using (bucket_id = 'speaker-profiles' and public.is_admin());

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

alter table public.trainings
add column if not exists image_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'training-images',
  'training-images',
  true,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public_read_training_images" on storage.objects;
create policy "public_read_training_images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'training-images');

drop policy if exists "admins_insert_training_images" on storage.objects;
create policy "admins_insert_training_images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'training-images' and public.is_admin());

drop policy if exists "admins_update_training_images" on storage.objects;
create policy "admins_update_training_images"
on storage.objects for update
to authenticated
using (bucket_id = 'training-images' and public.is_admin())
with check (bucket_id = 'training-images' and public.is_admin());

drop policy if exists "admins_delete_training_images" on storage.objects;
create policy "admins_delete_training_images"
on storage.objects for delete
to authenticated
using (bucket_id = 'training-images' and public.is_admin());
