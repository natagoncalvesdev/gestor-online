create table if not exists produto_info (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produto (id) on delete cascade,
  nome text not null,
  valor text not null default '',
  ordem integer not null default 1
);

create index if not exists idx_produto_info_produto on produto_info (produto_id);

alter table produto_info enable row level security;

drop policy if exists produto_info_select on produto_info;
drop policy if exists produto_info_write on produto_info;

create policy produto_info_select on produto_info for select
using (
  public.is_interno()
  or exists (select 1 from produto p where p.id = produto_info.produto_id and p.ativo)
);

create policy produto_info_write on produto_info for all to authenticated
using (public.is_admin()) with check (public.is_admin());