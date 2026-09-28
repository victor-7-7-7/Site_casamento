-- Execute uma vez no SQL Editor de um novo projeto Supabase.
-- Configuração explícita de privilégios: visitantes inserem, nunca leem.
begin;
create table public.wedding_rsvps (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null check (
    char_length(btrim(full_name)) between 5 and 120
    and btrim(full_name) ~ '[^[:space:]]+[[:space:]]+[^[:space:]]+'
  ),
  normalized_name text generated always as (
    lower(regexp_replace(btrim(full_name), '[[:space:]]+', ' ', 'g'))
  ) stored,
  phone text not null check (phone ~ '^\+[1-9][0-9]{9,14}$'),
  attending boolean not null,
  companion_count smallint not null default 0 check (companion_count between 0 and 6),
  companions text[] not null default '{}',
  notes text not null default '' check (char_length(notes) <= 1000),
  consent boolean not null check (consent = true),
  constraint wedding_companions_consistent check (
    cardinality(companions) = companion_count
    and (attending or companion_count = 0)
    and array_position(companions, null) is null
    and array_position(companions, '') is null
    and char_length(array_to_string(companions, '')) <= 720
  ),
  constraint wedding_one_response unique (phone, normalized_name)
);
alter table public.wedding_rsvps enable row level security;
revoke all on public.wedding_rsvps from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant insert (full_name, phone, attending, companion_count, companions, notes, consent)
  on public.wedding_rsvps to anon, authenticated;
grant all on public.wedding_rsvps to service_role;
create policy wedding_submit_response on public.wedding_rsvps
  for insert to anon, authenticated
  with check (consent = true);
comment on table public.wedding_rsvps is
  'Respostas privadas do casamento. Sem leitura, alteração ou exclusão pela API pública.';
commit;
