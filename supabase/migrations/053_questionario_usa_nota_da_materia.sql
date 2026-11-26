update questionario set nota_minima = null where nota_minima is not null;

create or replace function public.submeter_prova(
  p_materia_id uuid,
  p_respostas jsonb,
  p_questionario_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aluno uuid := auth.uid();
  v_mm_id uuid;
  v_matricula uuid;
  v_status materia_acesso_status;
  v_questionario uuid := p_questionario_id;
  v_encerra boolean := true;
  v_total integer;
  v_acertos integer := 0;
  v_nota numeric(3,1);
  v_min numeric(3,1);
  v_aprovado boolean;
  r jsonb;
  v_alt uuid;
  v_correta boolean;
begin
  if v_aluno is null or public.is_interno() then
    raise exception 'apenas o aluno envia a prova';
  end if;

  if v_questionario is null then
    select id into v_questionario
    from questionario
    where materia_id = p_materia_id and encerra_materia
    order by posicao
    limit 1;
  end if;

  if v_questionario is not null then
    select encerra_materia
    into v_encerra
    from questionario
    where id = v_questionario and materia_id = p_materia_id;
    if not found then
      raise exception 'questionario nao encontrado';
    end if;
  else
    v_encerra := true;
  end if;

  select nota_minima into v_min from materia where id = p_materia_id;

  select mm.id, mm.matricula_id, mm.status
  into v_mm_id, v_matricula, v_status
  from matricula_materia mm
  join matricula m on m.id = mm.matricula_id
  where m.aluno_id = v_aluno
    and mm.materia_id = p_materia_id
    and mm.status in ('liberada', 'concluida')
    and m.status = 'ativa'
  order by case when mm.status = 'liberada' then 0 else 1 end, mm.liberada_em desc nulls last
  limit 1;

  if v_mm_id is null then
    if public.materia_para_todos(p_materia_id) and not v_encerra then
      v_matricula := null;
    else
      raise exception 'materia nao liberada';
    end if;
  end if;

  if v_encerra and v_status is distinct from 'liberada' then
    raise exception 'materia nao liberada';
  end if;

  if v_questionario is not null then
    select count(*) into v_total from questao where questionario_id = v_questionario and ativo;
  else
    select count(*) into v_total from questao where materia_id = p_materia_id and ativo;
  end if;

  if v_total = 0 then
    raise exception 'prova sem questoes';
  end if;

  for r in select value from jsonb_array_elements(coalesce(p_respostas, '[]'::jsonb))
  loop
    v_alt := (r->>'alternativa_id')::uuid;
    select a.correta into v_correta
    from alternativa a
    join questao q on q.id = a.questao_id
    where a.id = v_alt
      and q.id = (r->>'questao_id')::uuid
      and q.ativo
      and (
        (v_questionario is not null and q.questionario_id = v_questionario)
        or (v_questionario is null and q.materia_id = p_materia_id)
      );
    if v_correta then
      v_acertos := v_acertos + 1;
    end if;
  end loop;

  v_nota := round((v_acertos::numeric / v_total) * 10, 1);
  v_aprovado := v_nota >= v_min;

  if v_matricula is not null then
    insert into tentativa_prova (aluno_id, materia_id, matricula_id, nota, aprovado, acertos, total, questionario_id)
    values (v_aluno, p_materia_id, v_matricula, v_nota, v_aprovado, v_acertos, v_total, v_questionario);
  end if;

  if v_aprovado and v_encerra and v_mm_id is not null then
    update matricula_materia
    set status = 'concluida', concluida_em = now()
    where id = v_mm_id;
    perform public.liberar_proximas(v_matricula);
  end if;

  return jsonb_build_object(
    'nota', v_nota,
    'aprovado', v_aprovado,
    'acertos', v_acertos,
    'total', v_total,
    'encerra', v_encerra
  );
end;
$$;
