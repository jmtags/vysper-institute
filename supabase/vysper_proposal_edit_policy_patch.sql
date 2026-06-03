-- Proposal editing rules for the MVP dashboard.
-- Users can update their own proposals unless accepted/archived.
-- Admins keep full proposal management through the existing admin policy.

drop policy if exists "users_update_own_draft_training_proposals" on public.training_proposals;
create policy "users_update_own_open_training_proposals"
on public.training_proposals for update
to authenticated
using (user_id = auth.uid() and status not in ('accepted', 'archived'))
with check (user_id = auth.uid() and status not in ('accepted', 'archived'));

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
