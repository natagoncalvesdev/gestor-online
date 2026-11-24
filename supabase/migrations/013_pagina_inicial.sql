create table if not exists home_banner (
  id uuid primary key default gen_random_uuid(),
  imagem_path text not null,
  imagem_zoom numeric(4, 2) not null default 1,
  imagem_x numeric(6, 2) not null default 0,
  imagem_y numeric(6, 2) not null default 0,
  link text not null default '',
  ordem int not null default 1,
  ativo boolean not null default true,
  constraint home_banner_zoom_check check (imagem_zoom >= 1 and imagem_zoom <= 3)
);

create table if not exists home_avaliacao_config (
  id int primary key default 1 check (id = 1),
  titulo text not null default 'O que falam sobre o CETADEB',
  nota numeric(2, 1) not null default 4.9,
  resumo text not null default '100+ avaliações no Google',
  link text not null default ''
);

insert into home_avaliacao_config (id)
values (1)
on conflict (id) do nothing;

create table if not exists home_avaliacao (
  id uuid primary key default gen_random_uuid(),
  autor text not null,
  texto text not null,
  estrelas int not null default 5,
  ordem int not null default 1,
  ativo boolean not null default true,
  constraint home_avaliacao_estrelas_check check (estrelas between 1 and 5)
);

create table if not exists home_instagram (
  id uuid primary key default gen_random_uuid(),
  imagem_path text not null,
  imagem_zoom numeric(4, 2) not null default 1,
  imagem_x numeric(6, 2) not null default 0,
  imagem_y numeric(6, 2) not null default 0,
  link text not null default '',
  ordem int not null default 1,
  ativo boolean not null default true,
  constraint home_instagram_zoom_check check (imagem_zoom >= 1 and imagem_zoom <= 3)
);

alter table home_banner enable row level security;
alter table home_avaliacao_config enable row level security;
alter table home_avaliacao enable row level security;
alter table home_instagram enable row level security;

create policy home_banner_select on home_banner for select
using (ativo or public.is_interno());
create policy home_banner_write on home_banner for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy home_avaliacao_config_select on home_avaliacao_config for select
using (true);
create policy home_avaliacao_config_write on home_avaliacao_config for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy home_avaliacao_select on home_avaliacao for select
using (ativo or public.is_interno());
create policy home_avaliacao_write on home_avaliacao for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy home_instagram_select on home_instagram for select
using (ativo or public.is_interno());
create policy home_instagram_write on home_instagram for all to authenticated
using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('site', 'site', true)
on conflict (id) do nothing;
