-- Drobe · esquema Supabase (ejecútalo en el SQL Editor del proyecto)
-- Modelo: cada usuario gestiona sus prendas; las puestas en venta son visibles para todos.

-- 1) Perfiles (ligado a auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  city text default 'Barcelona',
  created_at timestamptz default now()
);

-- 2) Prendas del armario
create table if not exists public.garments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand text,
  name text not null,
  category text,
  color text,
  size text,
  condition text,
  purchase_price numeric(10,2) default 0,
  resale_price numeric(10,2),
  status text not null default 'uso',     -- 'uso' | 'venta' | 'vendida'
  image_url text,
  worn int default 0,
  created_at timestamptz default now()
);
create index if not exists garments_user_idx on public.garments(user_id);
create index if not exists garments_status_idx on public.garments(status);

-- 3) Tickets escaneados (trazabilidad del alta automática)
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_text text,
  parsed jsonb,
  created_at timestamptz default now()
);

-- 4) RLS
alter table public.profiles enable row level security;
alter table public.garments enable row level security;
alter table public.tickets  enable row level security;

-- profiles: cada uno gestiona el suyo
create policy "perfil propio (select)" on public.profiles for select using (auth.uid() = id);
create policy "perfil propio (upsert)" on public.profiles for insert with check (auth.uid() = id);
create policy "perfil propio (update)" on public.profiles for update using (auth.uid() = id);

-- garments: dueño gestiona todo; las 'venta' son visibles para cualquiera autenticado (marketplace)
create policy "armario propio" on public.garments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mercado segunda mano (lectura)" on public.garments
  for select using (status = 'venta');

-- tickets: solo el dueño
create policy "tickets propios" on public.tickets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5) Storage para fotos de prendas (crea el bucket 'garments' como público en el panel de Storage)
-- y aplica políticas de subida solo al dueño desde la sección Storage > Policies.
