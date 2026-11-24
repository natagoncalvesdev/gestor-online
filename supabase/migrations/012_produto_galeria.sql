create table if not exists produto_imagem (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produto (id) on delete cascade,
  path text not null,
  ordem integer not null default 1,
  imagem_zoom numeric(4, 2) not null default 1,
  imagem_x numeric(6, 2) not null default 0,
  imagem_y numeric(6, 2) not null default 0
);

create index if not exists idx_produto_imagem_produto on produto_imagem (produto_id);

insert into produto_imagem (produto_id, path, ordem, imagem_zoom, imagem_x, imagem_y)
select p.id, p.imagem_path, 1, p.imagem_zoom, p.imagem_x, p.imagem_y
from produto p
where p.imagem_path is not null
  and not exists (select 1 from produto_imagem g where g.produto_id = p.id and g.path = p.imagem_path);

alter table produto_imagem enable row level security;

drop policy if exists produto_imagem_select on produto_imagem;
drop policy if exists produto_imagem_write on produto_imagem;

create policy produto_imagem_select on produto_imagem for select
using (
  public.is_interno()
  or exists (select 1 from produto p where p.id = produto_imagem.produto_id and p.ativo)
);

create policy produto_imagem_write on produto_imagem for all to authenticated
using (public.is_admin()) with check (public.is_admin());

alter table produto_imagem drop constraint if exists produto_imagem_zoom_check;
alter table produto_imagem add constraint produto_imagem_zoom_check check (imagem_zoom >= 1 and imagem_zoom <= 3);