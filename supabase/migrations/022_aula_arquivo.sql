create table if not exists aula_arquivo (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null references aula (id) on delete cascade,
  nome text not null,
  path text not null,
  mime text not null default 'application/octet-stream',
  visualizar boolean not null default false,
  baixar boolean not null default true,
  criado_em timestamptz not null default now()
);

alter table aula_arquivo enable row level security;

create policy aula_arquivo_select on aula_arquivo for select to authenticated
using (public.is_interno());
create policy aula_arquivo_write on aula_arquivo for all to authenticated
using (public.is_admin()) with check (public.is_admin());
