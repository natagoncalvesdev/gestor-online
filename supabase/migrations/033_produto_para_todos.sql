alter table produto add column if not exists gratuita boolean not null default false;
alter table produto add column if not exists para_todos boolean not null default false;

update produto p
set para_todos = true
where exists (
  select 1
  from produto_materia pm
  join materia m on m.id = pm.materia_id
  where pm.produto_id = p.id
    and m.para_todos
);

update produto p
set gratuita = true
where exists (
  select 1
  from produto_materia pm
  join materia m on m.id = pm.materia_id
  where pm.produto_id = p.id
    and m.gratuita
);

create or replace function public.materia_para_todos(p_materia_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from produto_materia pm
    join produto p on p.id = pm.produto_id
    join materia m on m.id = pm.materia_id
    where pm.materia_id = p_materia_id
      and p.para_todos
      and p.ativo
      and m.ativo
  );
$$;

revoke all on function public.materia_para_todos(uuid) from public;
grant execute on function public.materia_para_todos(uuid) to authenticated, anon, service_role;

drop policy if exists aula_select on aula;
create policy aula_select on aula for select to authenticated
using (
  public.is_interno()
  or public.materia_para_todos(aula.materia_id)
  or exists (
    select 1
    from matricula_materia mm
    join matricula m on m.id = mm.matricula_id
    where mm.materia_id = aula.materia_id
      and m.aluno_id = auth.uid()
      and mm.status in ('liberada', 'concluida')
      and m.status <> 'cancelada'
  )
);

drop policy if exists aula_topico_select on aula_topico;
create policy aula_topico_select on aula_topico for select to authenticated
using (
  public.is_interno()
  or public.materia_para_todos(aula_topico.materia_id)
  or exists (
    select 1
    from matricula_materia mm
    join matricula m on m.id = mm.matricula_id
    where mm.materia_id = aula_topico.materia_id
      and m.aluno_id = auth.uid()
      and mm.status in ('liberada', 'concluida')
      and m.status <> 'cancelada'
  )
);

drop policy if exists topico_select on topico;
create policy topico_select on topico for select to authenticated
using (
  public.is_interno()
  or exists (
    select 1
    from aula
    where aula.id = topico.aula_id
      and public.materia_para_todos(aula.materia_id)
  )
  or exists (
    select 1
    from aula
    join matricula_materia mm on mm.materia_id = aula.materia_id
    join matricula m on m.id = mm.matricula_id
    where aula.id = topico.aula_id
      and m.aluno_id = auth.uid()
      and mm.status in ('liberada', 'concluida')
      and m.status <> 'cancelada'
  )
);

drop policy if exists questionario_select on questionario;
create policy questionario_select on questionario for select to authenticated
using (
  public.is_interno()
  or public.materia_para_todos(questionario.materia_id)
  or exists (
    select 1
    from matricula_materia mm
    join matricula m on m.id = mm.matricula_id
    where mm.materia_id = questionario.materia_id
      and m.aluno_id = auth.uid()
      and mm.status in ('liberada', 'concluida')
      and m.status <> 'cancelada'
  )
);

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
    where q.questionario_id = p_questionario_id
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
    select encerra_materia, coalesce(nota_minima, (select nota_minima from materia where id = p_materia_id))
    into v_encerra, v_min
    from questionario
    where id = v_questionario and materia_id = p_materia_id;
    if v_min is null then
      raise exception 'questionario nao encontrado';
    end if;
  else
    select nota_minima into v_min from materia where id = p_materia_id;
    v_encerra := true;
  end if;

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
    select count(*) into v_total from questao where questionario_id = v_questionario;
  else
    select count(*) into v_total from questao where materia_id = p_materia_id;
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

alter table materia drop column if exists gratuita;
alter table materia drop column if exists para_todos;
