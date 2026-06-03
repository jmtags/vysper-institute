-- Quotation review fields for admin notes and user-visible decline reasons.

alter table public.training_proposals
add column if not exists admin_notes text,
add column if not exists decline_reason text;
