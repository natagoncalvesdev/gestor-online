alter table materia add column if not exists prova_quantidade integer
  check (prova_quantidade is null or (prova_quantidade >= 1 and prova_quantidade <= 100));

create or replace function public.ids_questoes_prova(
  p_questionario_id uuid,
  p_materia_id uuid,
  p_aluno uuid
)
returns uuid[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_encerra boolean := true;
  v_limite integer;
  v_tentativas integer := 0;
  v_ids uuid[];
begin
  if p_questionario_id is not null then
    select coalesce(encerra_materia, false) into v_encerra
    from questionario
    where id = p_questionario_id;
  end if;

  if v_encerra then
    select prova_quantidade into v_limite from materia where id = p_materia_id;
  end if;

  if p_aluno is not null and v_limite is not null then
    select count(*) into v_tentativas
    from tentativa_prova
    where aluno_id = p_aluno
      and materia_id = p_materia_id
      and questionario_id is not distinct from p_questionario_id;
  end if;

  select coalesce(array_agg(s.id order by s.seq), '{}')
  into v_ids
  from (
    select q.id, row_number() over () as seq
    from questao q
    where q.ativo
      and (
        (p_questionario_id is not null and q.questionario_id = p_questionario_id)
        or (p_questionario_id is null and q.materia_id = p_materia_id)
      )
    order by
      case
        when v_limite is null then lpad(q.ordem::text, 8, '0')
        else md5(q.id::text || coalesce(p_aluno::text, '') || v_tentativas::text)
      end,
      q.ordem
    limit v_limite
  ) s;

  return v_ids;
end;
$$;

revoke all on function public.ids_questoes_prova(uuid, uuid, uuid) from public;

create or replace function public.questoes_do_questionario(p_questionario_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_materia uuid;
  v_ok boolean;
  v_resultado jsonb;
  v_ids uuid[];
begin
  if auth.uid() is null then
    raise exception 'nao autenticado';
  end if;

  select materia_id into v_materia from questionario where id = p_questionario_id;
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
  v_ids uuid[];
  r jsonb;
  v_alt uuid;
  v_correta boolean;
  v_questao uuid;
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

  v_ids := public.ids_questoes_prova(v_questionario, p_materia_id, v_aluno);
  v_total := coalesce(cardinality(v_ids), 0);

  if v_total = 0 then
    raise exception 'prova sem questoes';
  end if;

  for r in select value from jsonb_array_elements(coalesce(p_respostas, '[]'::jsonb))
  loop
    v_alt := (r->>'alternativa_id')::uuid;
    v_questao := (r->>'questao_id')::uuid;
    if v_questao <> all(v_ids) then
      continue;
    end if;
    select a.correta into v_correta
    from alternativa a
    join questao q on q.id = a.questao_id
    where a.id = v_alt
      and q.id = v_questao
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
