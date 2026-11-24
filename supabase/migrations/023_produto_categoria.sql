alter table produto add column if not exists categoria text not null default 'teologia';

alter table produto drop constraint if exists produto_categoria_check;
alter table produto add constraint produto_categoria_check
  check (categoria in ('teologia', 'especializacao', 'livraria'));

update produto
set categoria = 'livraria'
where peso_gramas > 0
   or comprimento_cm > 0
   or largura_cm > 0
   or altura_cm > 0;

update produto
set categoria = 'especializacao'
where categoria = 'teologia'
  and (nome ilike '%especial%' or slug ilike '%especial%');
