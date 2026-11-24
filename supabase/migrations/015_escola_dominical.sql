alter table produto add column if not exists escola_dominical boolean not null default false;

create table if not exists ebd_licao (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produto (id) on delete cascade,
  ordem int not null,
  titulo text not null default '',
  youtube_url text not null default '',
  pdf_exibir_path text not null default '',
  libera_em timestamptz,
  unique (produto_id, ordem)
);

create table if not exists ebd_anexo (
  id uuid primary key default gen_random_uuid(),
  licao_id uuid not null references ebd_licao (id) on delete cascade,
  nome text not null,
  path text not null
);

alter table ebd_licao enable row level security;
alter table ebd_anexo enable row level security;

create policy ebd_licao_select on ebd_licao for select to authenticated
using (public.is_interno());
create policy ebd_licao_write on ebd_licao for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy ebd_anexo_select on ebd_anexo for select to authenticated
using (public.is_interno());
create policy ebd_anexo_write on ebd_anexo for all to authenticated
using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('ebd', 'ebd', false)
on conflict (id) do nothing;
