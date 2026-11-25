create type endereco_finalidade as enum ('cobranca', 'entrega');

alter table endereco_aluno
  add column finalidade endereco_finalidade;

update endereco_aluno set finalidade = 'entrega' where finalidade is null;

alter table endereco_aluno
  alter column finalidade set not null;

alter table endereco_aluno drop constraint endereco_aluno_pkey;

insert into endereco_aluno (aluno_id, cep, logradouro, numero, complemento, bairro, cidade, uf, finalidade)
select aluno_id, cep, logradouro, numero, complemento, bairro, cidade, uf, 'cobranca'::endereco_finalidade
from endereco_aluno
where finalidade = 'entrega';

alter table endereco_aluno add primary key (aluno_id, finalidade);

create or replace function criar_endereco_aluno()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into endereco_aluno (aluno_id, finalidade)
  values
    (new.id, 'entrega'),
    (new.id, 'cobranca')
  on conflict (aluno_id, finalidade) do nothing;
  return new;
end;
$$;