-- ═══════════════════════════════════════════════════════════════
-- DROBE · ESQUEMA COMPLETO
-- ───────────────────────────────────────────────────────────────
-- SEGURO DE EJECUTAR EN PRODUCCIÓN. No borra ninguna tabla ni
-- ninguna fila. Todo es `if not exists` / `add column if not exists`,
-- así que se puede lanzar tantas veces como haga falta.
--
-- (La versión anterior empezaba con `drop table ... cascade` bajo el
-- comentario "aún no hay datos de producción". Ya no es cierto, y por
-- eso se ha eliminado ese bloque.)
--
-- Cubre las 9 tablas que usa lib/supabase.js. Las 7 que faltaban
-- —tickets, maletas, wishlist, social_profiles, friendships,
-- messages, search_cache— provocaban escrituras que Supabase
-- rechazaba en silencio.
--
-- Cómo se ejecuta: Supabase → SQL Editor → pegar → Run.
-- ═══════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ───────────────────────── PROFILES ─────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  created_at timestamptz default now()
);
alter table profiles add column if not exists email text;
alter table profiles add column if not exists name text;
alter table profiles add column if not exists age int;
alter table profiles add column if not exists sex text;
alter table profiles add column if not exists city text;
alter table profiles add column if not exists country text;
-- consentimiento explícito (RGPD)
alter table profiles add column if not exists consent_data_b2b boolean default false;
alter table profiles add column if not exists consent_analytics boolean default false;
alter table profiles add column if not exists consent_marketing boolean default false;
alter table profiles add column if not exists consent_at timestamptz;
-- perfil de estilo calculado en cliente
alter table profiles add column if not exists style_dna jsonb default '{}'::jsonb;
alter table profiles add column if not exists measures jsonb default '{}'::jsonb;
alter table profiles add column if not exists brand_sizes jsonb default '{}'::jsonb;
alter table profiles add column if not exists avg_price_per_item numeric;
alter table profiles add column if not exists total_wardrobe_value numeric;
alter table profiles add column if not exists segment text;
alter table profiles add column if not exists drobe_score int default 0;
alter table profiles add column if not exists garment_count int default 0;
alter table profiles add column if not exists active_days int default 0;
alter table profiles add column if not exists last_active_at timestamptz;
alter table profiles add column if not exists updated_at timestamptz default now();

-- ───────────────────────── GARMENTS ─────────────────────────
create table if not exists garments (
  id text primary key,
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now()
);
alter table garments add column if not exists brand text;
alter table garments add column if not exists name text;
alter table garments add column if not exists cat text;
alter table garments add column if not exists cat_group text;
alter table garments add column if not exists fit text;
alter table garments add column if not exists color text;
alter table garments add column if not exists colors text[];
alter table garments add column if not exists material text;
alter table garments add column if not exists size text;
alter table garments add column if not exists season text;
alter table garments add column if not exists formality text;
alter table garments add column if not exists price numeric default 0;
alter table garments add column if not exists store text;
alter table garments add column if not exists bought_at text;
alter table garments add column if not exists cond text;
alter table garments add column if not exists worn int default 0;
alter table garments add column if not exists last_worn text;
alter table garments add column if not exists days_since_last_use int;
alter table garments add column if not exists status text default 'uso';
alter table garments add column if not exists img text;
alter table garments add column if not exists sku text;
alter table garments add column if not exists fit_feedback text;
alter table garments add column if not exists context text default 'calle';
alter table garments add column if not exists sport text;
alter table garments add column if not exists km numeric;
alter table garments add column if not exists photos text[];
alter table garments add column if not exists updated_at timestamptz default now();
-- BORRADO SUAVE: sin esta columna, borrar una prenda en un móvil no la borraba
-- en los demás. lib/supabase.js tenía un apaño para sobrevivir sin ella.
alter table garments add column if not exists deleted_at timestamptz;

-- columnas derivadas (solo si no existen ya)
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_name='garments' and column_name='cost_per_wear') then
    alter table garments add column cost_per_wear numeric
      generated always as (case when worn > 0 then price / worn else price end) stored;
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_name='garments' and column_name='is_dead') then
    alter table garments add column is_dead boolean
      generated always as (worn <= 3) stored;
  end if;
end $$;

create index if not exists garments_user_idx on garments(user_id);
create index if not exists garments_status_idx on garments(status) where status = 'venta';
create index if not exists garments_live_idx on garments(user_id) where deleted_at is null;

-- ───────────────────────── TICKETS ─────────────────────────
create table if not exists tickets (
  id text primary key,
  user_id uuid references profiles(id) on delete cascade,
  store text,
  date text,
  total numeric default 0,
  return_days int,
  warranty_months int,
  img text,
  garment_ids text[] default '{}',
  items jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);
create index if not exists tickets_user_idx on tickets(user_id, created_at desc);

-- ───────────────────────── MALETAS ─────────────────────────
create table if not exists maletas (
  id text primary key,
  user_id uuid references profiles(id) on delete cascade,
  name text,
  dest text,
  days int,
  plan text,
  items jsonb default '[]'::jsonb,
  looks jsonb,
  weight numeric,
  created_at timestamptz default now()
);
create index if not exists maletas_user_idx on maletas(user_id, created_at desc);

-- ───────────────────────── WISHLIST ─────────────────────────
create table if not exists wishlist (
  id text primary key,
  user_id uuid references profiles(id) on delete cascade,
  description text,
  brand text,
  tipo text,
  query text,
  target_price numeric,
  last_price numeric,
  last_link text,
  last_source text,
  thumbnail text,
  created_at timestamptz default now()
);
create index if not exists wishlist_user_idx on wishlist(user_id, created_at desc);

-- ───────────────────── SOCIAL PROFILES ─────────────────────
create table if not exists social_profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  display_name text,
  avatar text,
  public boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists social_username_idx on social_profiles(lower(username));
create index if not exists social_public_idx on social_profiles(id) where public = true;

-- ───────────────────────── FRIENDSHIPS ─────────────────────
create table if not exists friendships (
  id text primary key,
  requester_id uuid references auth.users on delete cascade,
  addressee_id uuid references auth.users on delete cascade,
  status text default 'pending',   -- 'pending' | 'accepted'
  created_at timestamptz default now(),
  unique (requester_id, addressee_id)
);
create index if not exists friendships_req_idx on friendships(requester_id);
create index if not exists friendships_addr_idx on friendships(addressee_id);

-- ───────────────────────── MESSAGES ─────────────────────────
create table if not exists messages (
  id text primary key,
  sender_id uuid references auth.users on delete cascade,
  recipient_id uuid references auth.users on delete cascade,
  type text default 'text',        -- 'text' | 'look' | ...
  body text,
  payload jsonb,
  read boolean default false,
  created_at timestamptz default now()
);
create index if not exists messages_pair_idx on messages(sender_id, recipient_id, created_at);
create index if not exists messages_unread_idx on messages(recipient_id) where read = false;

-- ─────────────────────── SEARCH CACHE ───────────────────────
-- Caché compartida de resultados de SerpApi (24 h). Multiplica la cuota:
-- la misma búsqueda de cualquier usuario se sirve sin gastar créditos.
create table if not exists search_cache (
  key text primary key,
  payload jsonb,
  created_at timestamptz default now()
);
create index if not exists search_cache_age_idx on search_cache(created_at);

-- ─────────────── EVENTOS (analítica y B2B) ───────────────
create table if not exists scan_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  query text,
  brand text,
  product_name text,
  price_seen numeric,
  action text,              -- 'bought' | 'saved' | 'rejected' | 'compared'
  rejection_reason text,    -- 'already_have' | 'too_expensive' | 'wrong_fit' | 'wrong_color' | 'user_choice'
  store_name text,
  lat numeric, lon numeric,
  session_id text,
  created_at timestamptz default now()
);
create index if not exists scan_events_user_idx on scan_events(user_id, created_at desc);

create table if not exists purchase_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  garment_id text references garments(id) on delete set null,
  brand text, store text,
  price numeric, discount numeric,
  bought_at text,
  channel text,             -- 'physical' | 'online' | 'secondhand'
  created_at timestamptz default now()
);
create index if not exists purchase_events_user_idx on purchase_events(user_id, created_at desc);

-- ═══════════════════════════════════════════════════════════════
-- RLS
-- Las políticas se recrean siempre (drop policy if exists + create)
-- para que este fichero sea la única fuente de verdad.
-- ═══════════════════════════════════════════════════════════════

alter table profiles        enable row level security;
alter table garments        enable row level security;
alter table tickets         enable row level security;
alter table maletas         enable row level security;
alter table wishlist        enable row level security;
alter table social_profiles enable row level security;
alter table friendships     enable row level security;
alter table messages        enable row level security;
alter table search_cache    enable row level security;
alter table scan_events     enable row level security;
alter table purchase_events enable row level security;

-- ── datos estrictamente propios ──
drop policy if exists "own profile"   on profiles;
create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own tickets"   on tickets;
create policy "own tickets" on tickets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own maletas"   on maletas;
create policy "own maletas" on maletas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own wishlist"  on wishlist;
create policy "own wishlist" on wishlist
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own scans"     on scan_events;
create policy "own scans" on scan_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own purchases" on purchase_events;
create policy "own purchases" on purchase_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── GARMENTS ──
-- Escritura: solo el dueño.
-- Lectura: el dueño, sus amigos aceptados y cualquiera si el armario es
-- público. Antes la política era solo-dueño, así que "ver el armario de un
-- amigo" y el armario público por ?u=usuario devolvían siempre vacío.
drop policy if exists "users own garments" on garments;
drop policy if exists "garments readable"  on garments;
drop policy if exists "garments insert"    on garments;
drop policy if exists "garments update"    on garments;
drop policy if exists "garments delete"    on garments;

create policy "garments readable" on garments for select using (
  auth.uid() = user_id
  or exists (
    select 1 from friendships f
    where f.status = 'accepted'
      and ( (f.requester_id = auth.uid() and f.addressee_id = garments.user_id)
         or (f.addressee_id = auth.uid() and f.requester_id = garments.user_id) )
  )
  or exists (
    select 1 from social_profiles sp
    where sp.id = garments.user_id and sp.public = true
  )
);
create policy "garments insert" on garments for insert with check (auth.uid() = user_id);
create policy "garments update" on garments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "garments delete" on garments for delete using (auth.uid() = user_id);

-- ── SOCIAL PROFILES ──
-- Legible por cualquiera (hace falta para buscar gente y para el armario
-- público sin sesión); escribible solo por su dueño.
drop policy if exists "social readable" on social_profiles;
drop policy if exists "social insert"   on social_profiles;
drop policy if exists "social update"   on social_profiles;
create policy "social readable" on social_profiles for select using (true);
create policy "social insert"   on social_profiles for insert with check (auth.uid() = id);
create policy "social update"   on social_profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- ── FRIENDSHIPS ──
drop policy if exists "friendship visible" on friendships;
drop policy if exists "friendship create"  on friendships;
drop policy if exists "friendship update"  on friendships;
drop policy if exists "friendship delete"  on friendships;
create policy "friendship visible" on friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "friendship create" on friendships for insert
  with check (auth.uid() = requester_id);
-- solo el destinatario puede aceptar una solicitud
create policy "friendship update" on friendships for update
  using (auth.uid() = addressee_id) with check (auth.uid() = addressee_id);
create policy "friendship delete" on friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- ── MESSAGES ──
drop policy if exists "message visible" on messages;
drop policy if exists "message send"    on messages;
drop policy if exists "message read"    on messages;
create policy "message visible" on messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "message send" on messages for insert
  with check (auth.uid() = sender_id);
-- marcar como leído: solo el destinatario
create policy "message read" on messages for update
  using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

-- ── SEARCH CACHE ──
-- Compartida a propósito: es lo que estira la cuota de SerpApi.
-- No contiene datos personales, solo resultados públicos de Google Shopping.
drop policy if exists "cache read"  on search_cache;
drop policy if exists "cache write" on search_cache;
create policy "cache read"  on search_cache for select using (auth.role() = 'authenticated');
create policy "cache write" on search_cache for all    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ═══════════════════════════════════════════════════════════════
-- STORAGE
-- El bucket se llama 'tickets' (guarda imágenes de tickets Y avatares).
-- El README antiguo hablaba de un bucket 'garments' que el código no usa.
-- ═══════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('tickets', 'tickets', true)
on conflict (id) do update set public = true;

drop policy if exists "tickets public read"  on storage.objects;
drop policy if exists "tickets owner write"  on storage.objects;
drop policy if exists "tickets owner update" on storage.objects;
drop policy if exists "tickets owner delete" on storage.objects;

create policy "tickets public read" on storage.objects for select
  using (bucket_id = 'tickets');
-- cada usuario escribe solo dentro de su propia carpeta: <uid>/…
create policy "tickets owner write" on storage.objects for insert
  with check (bucket_id = 'tickets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "tickets owner update" on storage.objects for update
  using (bucket_id = 'tickets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "tickets owner delete" on storage.objects for delete
  using (bucket_id = 'tickets' and (storage.foldername(name))[1] = auth.uid()::text);

-- ═══════════════════════════════════════════════════════════════
-- LIMPIEZA DE LA CACHÉ
-- La caché de búsquedas crece sin límite. Esto la poda.
-- Opcional: programarlo desde Supabase → Database → Cron.
--   select cron.schedule('drobe-cache', '0 4 * * *',
--                        $$select drobe_prune_cache()$$);
-- ═══════════════════════════════════════════════════════════════
create or replace function drobe_prune_cache() returns void
language sql security definer as $$
  delete from search_cache where created_at < now() - interval '3 days';
$$;

-- ═══════════════════════════════════════════════════════════════
-- COMPROBACIÓN
-- Ejecuta esto después para confirmar que están las 11 tablas.
-- ═══════════════════════════════════════════════════════════════
-- select table_name from information_schema.tables
--  where table_schema='public' order by table_name;
