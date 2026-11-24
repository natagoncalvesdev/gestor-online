alter table materia add column if not exists gratuita boolean not null default false;
alter table materia add column if not exists para_todos boolean not null default false;

update materia set para_todos = true, gratuita = true where escola_dominical;

drop index if exists uq_materia_escola_dominical;
alter table materia drop column if exists escola_dominical;
