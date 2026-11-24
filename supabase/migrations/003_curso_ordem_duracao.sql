alter table curso add column if not exists ordem integer not null default 1;
alter table curso add column if not exists duracao text not null default '';

with numerado as (
  select id, row_number() over (order by nome) as n
  from curso
)
update curso
set ordem = numerado.n
from numerado
where curso.id = numerado.id
  and curso.ordem = 1;
