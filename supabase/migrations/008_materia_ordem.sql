alter table materia add column if not exists ordem integer not null default 1;

update materia m
set ordem = n.n
from (
  select id, row_number() over (order by nome) as n
  from materia
) n
where m.id = n.id;
