-- Transportation fee fields for client-site training quotations.
-- First 3 km can be free in the application, with excess distance computed into transport_fee.

alter table public.training_proposals
add column if not exists venue_address text,
add column if not exists distance_km numeric(8,2) not null default 0 check (distance_km >= 0),
add column if not exists transport_fee numeric(12,2) not null default 0 check (transport_fee >= 0);
