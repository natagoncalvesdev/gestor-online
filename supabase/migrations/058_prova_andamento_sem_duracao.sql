create or replace function public.prova_andamento_protege()
returns trigger
language plpgsql
as $$
begin
  if new.expira_em is distinct from old.expira_em
    or new.iniciada_em is distinct from old.iniciada_em
    or new.aluno_id is distinct from old.aluno_id
    or new.questionario_id is distinct from old.questionario_id then
    raise exception 'nao permitido';
  end if;
  return new;
end;
$$;

alter table prova_andamento drop column if exists duracao_minutos;
