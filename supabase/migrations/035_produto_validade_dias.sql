alter table produto add column if not exists validade_dias integer;

alter table produto drop constraint if exists produto_validade_dias_check;
alter table produto add constraint produto_validade_dias_check check (validade_dias is null or validade_dias > 0);
