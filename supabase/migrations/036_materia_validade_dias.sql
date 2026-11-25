alter table materia add column if not exists validade_dias integer;

alter table materia drop constraint if exists materia_validade_dias_check;
alter table materia add constraint materia_validade_dias_check check (validade_dias is null or validade_dias > 0);

alter table produto drop constraint if exists produto_validade_dias_check;
alter table produto drop column if exists validade_dias;
