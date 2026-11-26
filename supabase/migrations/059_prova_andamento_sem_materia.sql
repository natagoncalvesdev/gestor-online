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

create or replace function public.montar_prova_andamento(p_andamento uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aluno uuid;
  v_materia uuid;
  v_questionario uuid;
  v_ids uuid[];
  v_id uuid;
  v_ordem integer := 0;
  v_pq uuid;
begin
  select p.aluno_id, q.materia_id, p.questionario_id
  into v_aluno, v_materia, v_questionario
  from prova_andamento p
  join questionario q on q.id = p.questionario_id
  where p.id = p_andamento;
  if v_aluno is null then
    return;
  end if;
  if exists (select 1 from prova_questao where prova_andamento_id = p_andamento) then
    return;
  end if;

  v_ids := public.ids_questoes_prova(v_questionario, v_materia, v_aluno);
  foreach v_id in array v_ids loop
    v_ordem := v_ordem + 1;
    insert into prova_questao (prova_andamento_id, questao_id, ordem, enunciado)
    select p_andamento, q.id, v_ordem, q.enunciado
    from questao q
    where q.id = v_id
    returning id into v_pq;

    insert into prova_questao_alternativa (prova_questao_id, alternativa_id, texto, correta, ordem)
    select v_pq, a.id, a.texto, a.correta, a.ordem
    from alternativa a
    where a.questao_id = v_id
    order by a.ordem;
  end loop;
end;
$$;

revoke all on function public.montar_prova_andamento(uuid) from public;
grant execute on function public.montar_prova_andamento(uuid) to service_role;

alter table prova_andamento drop column if exists materia_id;
