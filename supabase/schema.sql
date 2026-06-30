-- Drobe · Supabase Schema v2 · B2B ready
-- Run in Supabase SQL Editor

-- Limpieza de tablas v1 (seguro: aún no hay datos de producción).
-- El orden importa por las foreign keys.
drop table if exists scan_events cascade;
drop table if exists purchase_events cascade;
drop table if exists style_events cascade;
drop table if exists brand_signals cascade;
drop table if exists garments cascade;
drop table if exists profiles cascade;

-- PROFILES: datos de usuario enriquecidos para B2B
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  name text,
  age int,
  sex text,
  city text,
  country text,
  -- consentimiento explícito (GDPR)
  consent_data_b2b boolean default false,  -- datos anónimos para marcas
  consent_analytics boolean default false, -- analytics de uso
  consent_marketing boolean default false, -- comunicaciones
  consent_at timestamptz,
  -- ADN de estilo (calculado en cliente, guardado para B2B)
  style_dna jsonb default '{}'::jsonb,
  -- medidas físicas
  measures jsonb default '{}'::jsonb,
  -- tallas por marca (derivadas del armario)
  brand_sizes jsonb default '{}'::jsonb,
  -- presupuesto inferido
  avg_price_per_item numeric,
  total_wardrobe_value numeric,
  -- segmento calculado
  segment text, -- 'premium','mid','budget','unknown'
  -- engagement
  drobe_score int default 0,
  garment_count int default 0,
  active_days int default 0,
  last_active_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- GARMENTS: prendas con todos los datos de comportamiento
create table if not exists garments (
  id text primary key,
  user_id uuid references profiles(id) on delete cascade,
  brand text, name text, cat text, cat_group text,
  fit text, color text, colors text[],
  material text, size text, season text,
  formality text, price numeric, store text,
  bought_at text, cond text,
  worn int default 0, last_worn text,
  status text default 'uso',
  img text, sku text,
  -- datos B2B clave
  cost_per_wear numeric generated always as (
    case when worn > 0 then price / worn else price end
  ) stored,
  -- señales de comportamiento
  days_since_last_use int,
  is_dead boolean generated always as (worn <= 3) stored,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- SCAN EVENTS: cada vez que el usuario escanea algo en tienda
-- Dato B2B de MÁXIMO valor: intención de compra real
create table if not exists scan_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  query text not null,          -- qué buscó
  brand text,                   -- marca escaneada
  product_name text,
  price_seen numeric,           -- precio en tienda
  action text,                  -- 'bought','saved','rejected','compared'
  rejection_reason text,        -- 'already_have','too_expensive','wrong_fit','wrong_color'
  store_name text,
  lat numeric, lon numeric,     -- localización (con permiso)
  session_id text,
  created_at timestamptz default now()
);

-- PURCHASE EVENTS: compras registradas (tickets)
create table if not exists purchase_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  garment_id text references garments(id) on delete set null,
  brand text, store text,
  price numeric, discount numeric,
  bought_at text,
  channel text, -- 'physical','online','secondhand'
  created_at timestamptz default now()
);

-- STYLE_EVENTS: cada uso registrado (hábito diario)
create table if not exists style_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  garment_ids text[],           -- prendas del look
  occasion text,                -- 'work','casual','sport','event'
  weather_temp numeric,
  weather_condition text,
  city text,
  worn_at date default current_date,
  created_at timestamptz default now()
);

-- BRAND_SIGNALS: señales agregadas por marca (vista B2B)
-- Esta tabla se actualiza con una función en el backend
create table if not exists brand_signals (
  brand text not null,
  -- métricas de uso
  total_items int default 0,
  total_users int default 0,
  avg_cost_per_wear numeric,
  avg_price_paid numeric,
  avg_worn_count numeric,
  dead_item_rate numeric,        -- % prendas sin usar
  -- demografía (anonimizada)
  top_age_segment text,
  top_city text,
  top_size text,
  -- comportamiento de compra
  avg_days_to_first_wear numeric,
  repurchase_rate numeric,
  -- actualizado
  computed_at timestamptz default now(),
  primary key (brand)
);

-- RLS
alter table profiles enable row level security;
alter table garments enable row level security;
alter table scan_events enable row level security;
alter table purchase_events enable row level security;
alter table style_events enable row level security;

create policy "users own profiles" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "users own garments" on garments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own scans" on scan_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own purchases" on purchase_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own styles" on style_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- brand_signals solo lectura para usuarios autenticados
create policy "brand signals readable" on brand_signals for select using (auth.role() = 'authenticated');
