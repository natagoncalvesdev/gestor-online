alter table aula add column if not exists posicao int;
alter table aula_topico add column if not exists posicao int;

update aula set posicao = ordem where posicao is null;
update aula_topico set posicao = ordem where posicao is null;
