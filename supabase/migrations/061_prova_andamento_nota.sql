alter table prova_andamento
  add column if not exists nota numeric(3,1),
  add column if not exists acertos integer,
  add column if not exists total integer,
  add column if not exists aprovado boolean;

create or replace function public.questoes_do_questionario(p_questionario_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_materia uuid;
  v_encerra boolean := false;
  v_ok boolean;
  v_andamento uuid;
  v_resultado jsonb;
  v_ids uuid[];
begin
  if auth.uid() is null then
    raise exception 'nao autenticado';
  end if;

  select materia_id, coalesce(encerra_materia, false)
  into v_materia, v_encerra
  from questionario
  where id = p_questionario_id;
  if v_materia is null then
    raise exception 'questionario nao encontrado';
  end if;

  if public.is_interno() then
    v_ok := true;
  else
    select exists (
      select 1
      from matricula_materia mm
      join matricula m on m.id = mm.matricula_id
      where m.aluno_id = auth.uid()
        and mm.materia_id = v_materia
        and mm.status in ('liberada', 'concluida')
        and m.status <> 'cancelada'
    ) or public.materia_para_todos(v_materia) into v_ok;
  end if;

  if not v_ok then
    raise exception 'materia nao liberada';
  end if;

  if v_encerra and not public.is_interno() then
    select id into v_andamento
    from prova_andamento
    where aluno_id = auth.uid()
      and questionario_id = p_questionario_id
    order by case when entregue_em is null then 0 else 1 end, iniciada_em desc
    limit 1;
    if v_andamento is null then
      raise exception 'prova nao iniciada';
    end if;
    return public.questoes_do_andamento(v_andamento);
  end if;

  v_ids := public.ids_questoes_prova(p_questionario_id, v_materia, auth.uid());

  select coalesce(jsonb_agg(item order by ordem), '[]'::jsonb)
  into v_resultado
  from (
    select
      q.ordem,
      jsonb_build_object(
        'id', q.id,
        'enunciado', q.enunciado,
        'ordem', q.ordem,
        'alternativas', coalesce((
          select jsonb_agg(
            jsonb_build_object('id', a.id, 'texto', a.texto, 'ordem', a.ordem)
            order by a.ordem
          )
          from alternativa a
          where a.questao_id = q.id
        ), '[]'::jsonb)
      ) as item
    from questao q
    where q.id = any(v_ids)
  ) q;

  return v_resultado;
end;
$$;
