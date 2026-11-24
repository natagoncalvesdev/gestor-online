alter table produto add column if not exists ordem integer not null default 1;

update produto p
set ordem = n.n
from (
  select id, row_number() over (order by nome) as n
  from produto
) n
where p.id = n.id;
