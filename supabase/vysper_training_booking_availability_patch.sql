-- Training booking availability check.
-- Allows the app to prevent duplicate confirmed bookings for the same training/date.
-- Multiple different trainings may still be confirmed on the same calendar date.

create or replace function public.is_training_date_available(
  p_training_id uuid,
  p_preferred_date date,
  p_exclude_proposal_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.training_proposals p
    where p.training_id = p_training_id
      and p.preferred_date = p_preferred_date
      and p.status = 'accepted'
      and (p_exclude_proposal_id is null or p.id <> p_exclude_proposal_id)
  );
$$;

grant execute on function public.is_training_date_available(uuid, date, uuid) to anon, authenticated;

create or replace function public.get_unavailable_training_dates(
  p_training_id uuid,
  p_exclude_proposal_id uuid default null
)
returns table (booked_date date)
language sql
stable
security definer
set search_path = public
as $$
  select distinct p.preferred_date as booked_date
  from public.training_proposals p
  where p.training_id = p_training_id
    and p.preferred_date is not null
    and p.status = 'accepted'
    and (p_exclude_proposal_id is null or p.id <> p_exclude_proposal_id)
  order by p.preferred_date;
$$;

grant execute on function public.get_unavailable_training_dates(uuid, uuid) to anon, authenticated;
