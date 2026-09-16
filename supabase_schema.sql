-- ESTAR POS - Esquema para Supabase (PostgreSQL)
-- Ejecuta este archivo completo en el SQL Editor de Supabase (Database -> SQL Editor -> New query).

create table if not exists public.roles (
    id bigint generated always as identity primary key,
    name text unique not null,
    description text,
    permissions text not null default ''
);

create table if not exists public.users (
    id bigint generated always as identity primary key,
    username text unique not null,
    password text not null,
    role text not null default 'seller',
    full_name text,
    avatar_url text,
    created_at timestamptz not null default now()
);

create table if not exists public.products (
    id bigint generated always as identity primary key,
    name text not null,
    sku text,
    stock integer not null default 0,
    cost_price numeric(12,2) not null default 0,
    price numeric(12,2) not null default 0,
    category text,
    created_at timestamptz not null default now()
);

create table if not exists public.clients (
    id bigint generated always as identity primary key,
    name text not null,
    phone text,
    email text,
    created_at timestamptz not null default now()
);

create table if not exists public.company_profile (
    id bigint generated always as identity primary key,
    name text not null,
    document text,
    phone text,
    email text,
    address text,
    logo_url text,
    created_at timestamptz not null default now()
);

create table if not exists public.orders (
    id bigint generated always as identity primary key,
    client_name text not null,
    description text,
    product_id bigint references public.products(id),
    quantity integer not null default 1,
    unit_price numeric(12,2) not null default 0,
    total numeric(12,2) not null default 0,
    deposit numeric(12,2) not null default 0,
    paid_amount numeric(12,2) not null default 0,
    status text not null default 'pendiente',
    created_at timestamptz not null default now()
);

create table if not exists public.sales (
    id bigint generated always as identity primary key,
    product_id bigint not null references public.products(id),
    client_id bigint references public.clients(id),
    order_id bigint references public.orders(id),
    quantity integer not null,
    unit_price numeric(12,2) not null,
    total numeric(12,2) not null,
    created_at timestamptz not null default now()
);

create table if not exists public.sale_items (
    id bigint generated always as identity primary key,
    sale_id bigint not null references public.sales(id),
    product_id bigint not null references public.products(id),
    quantity integer not null default 1,
    unit_price numeric(12,2) not null default 0,
    total numeric(12,2) not null default 0,
    created_at timestamptz not null default now()
);

create table if not exists public.expenses (
    id bigint generated always as identity primary key,
    description text not null,
    amount numeric(12,2) not null,
    category text,
    created_at timestamptz not null default now()
);

-- Seguridad: la app usa su propio login (tabla users), por lo que se habilita RLS
-- con una política permisiva para la llave publishable (anon).
do $$
declare
    t text;
begin
    foreach t in array array['roles','users','products','clients','company_profile','orders','sales','sale_items','expenses'] loop
        execute format('alter table public.%I enable row level security', t);
        if not exists (
            select 1 from pg_policies
            where schemaname = 'public' and tablename = t and policyname = 'estar_full_access'
        ) then
            execute format(
                'create policy estar_full_access on public.%I for all to anon, authenticated using (true) with check (true)',
                t
            );
        end if;
    end loop;
end $$;

-- Datos iniciales
insert into public.roles (name, description, permissions) values
    ('admin', 'Rol admin', 'dashboard,products,sales,clients,expenses,orders,reports,users,roles,company,profile'),
    ('seller', 'Rol seller', 'dashboard,products,sales,clients,orders,profile'),
    ('accountant', 'Rol accountant', 'dashboard,clients,expenses,orders,reports,company,profile')
on conflict (name) do nothing;

insert into public.users (username, password, role, full_name, avatar_url)
select 'admin', 'admin123', 'admin', 'Administrador', ''
where not exists (select 1 from public.users where username = 'admin');

insert into public.company_profile (name, document, phone, email, address, logo_url)
select 'ESTAR', 'NIT: 900000000-1', '+57 300 000 0000', 'soporte@estar.local', 'Calle Principal 123, Medellín', ''
where not exists (select 1 from public.company_profile);
