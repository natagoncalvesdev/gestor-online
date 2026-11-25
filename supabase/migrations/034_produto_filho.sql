create table if not exists produto_filho (
  produto_id uuid not null references produto (id) on delete cascade,
  filho_id uuid not null references produto (id) on delete cascade,
  ordem integer not null,
  primary key (produto_id, filho_id),
  constraint produto_filho_distinto check (produto_id <> filho_id)
);

create index if not exists idx_produto_filho_filho on produto_filho (filho_id);

alter table produto_filho enable row level security;

drop policy if exists produto_filho_select on produto_filho;
drop policy if exists produto_filho_write on produto_filho;

create policy produto_filho_select on produto_filho for select to authenticated
using (
  public.is_interno()
  or exists (
    select 1 from produto p
    where p.id = produto_filho.produto_id
      and p.ativo
  )
);

create policy produto_filho_write on produto_filho for all to authenticated
using (public.is_admin()) with check (public.is_admin());
