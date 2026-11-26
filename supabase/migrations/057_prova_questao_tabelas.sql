alter table prova_andamento drop column if exists respostas;

create table if not exists prova_questao (
  id uuid primary key default gen_random_uuid(),
  prova_andamento_id uuid not null references prova_andamento (id) on delete cascade,
  questao_id uuid references questao (id) on delete set null,
  ordem integer not null check (ordem >= 1),
  enunciado text not null,
  unique (prova_andamento_id, ordem)
);

create index if not exists idx_prova_questao_andamento on prova_questao (prova_andamento_id);

create table if not exists prova_questao_alternativa (
  id uuid primary key default gen_random_uuid(),
  prova_questao_id uuid not null references prova_questao (id) on delete cascade,
  alternativa_id uuid references alternativa (id) on delete set null,
  texto text not null,
  correta boolean not null default false,
  ordem integer not null check (ordem >= 1)
);

create index if not exists idx_prova_alt_questao on prova_questao_alternativa (prova_questao_id);

create table if not exists prova_resposta (
  id uuid primary key default gen_random_uuid(),
  prova_questao_id uuid not null unique references prova_questao (id) on delete cascade,
  alternativa_id uuid not null references prova_questao_alternativa (id) on delete cascade,
  respondida_em timestamptz not null default now()
);

grant select on prova_questao to authenticated;
grant select, insert, update on prova_resposta to authenticated;

create or replace function public.fn_prova_resposta_valida()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_expira timestamptz;
  v_entregue timestamptz;
begin
  if not exists (
    select 1
    from prova_questao_alternativa a
    where a.id = new.alternativa_id
      and a.prova_questao_id = new.prova_questao_id
  ) then
    raise exception 'alternativa nao pertence a questao';
  end if;

  select p.expira_em, p.entregue_em
  into v_expira, v_entregue
  from prova_questao q
  join prova_andamento p on p.id = q.prova_andamento_id
  where q.id = new.prova_questao_id;

  if v_entregue is not null then
    raise exception 'A prova nao esta em andamento';
  end if;
  if v_expira is not null and now() >= v_expira then
    raise exception 'O tempo da prova terminou';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prova_resposta_valida on prova_resposta;
create trigger trg_prova_resposta_valida
  before insert or update on prova_resposta
  for each row
  execute function public.fn_prova_resposta_valida();

alter table prova_questao enable row level security;
alter table prova_questao_alternativa enable row level security;
alter table prova_resposta enable row level security;

drop policy if exists prova_questao_select on prova_questao;
create policy prova_questao_select on prova_questao for select to authenticated
  using (
    exists (
      select 1 from prova_andamento p
      where p.id = prova_andamento_id and (p.aluno_id = auth.uid() or public.is_interno())
    )
  );

drop policy if exists prova_resposta_select on prova_resposta;
create policy prova_resposta_select on prova_resposta for select to authenticated
  using (
    exists (
      select 1
      from prova_questao q
      join prova_andamento p on p.id = q.prova_andamento_id
      where q.id = prova_questao_id and (p.aluno_id = auth.uid() or public.is_interno())
    )
  );

drop policy if exists prova_resposta_ins on prova_resposta;
create policy prova_resposta_ins on prova_resposta for insert to authenticated
  with check (
    exists (
      select 1
      from prova_questao q
      join prova_andamento p on p.id = q.prova_andamento_id
      where q.id = prova_questao_id and p.aluno_id = auth.uid() and p.entregue_em is null
    )
  );

drop policy if exists prova_resposta_upd on prova_resposta;
create policy prova_resposta_upd on prova_resposta for update to authenticated
  using (
    exists (
      select 1
      from prova_questao q
      join prova_andamento p on p.id = q.prova_andamento_id
      where q.id = prova_questao_id and p.aluno_id = auth.uid() and p.entregue_em is null
    )
  );

revoke all on prova_questao_alternativa from public, authenticated;
grant select, insert, update, delete on prova_questao_alternativa to postgres;

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

create or replace function public.questoes_do_andamento(p_andamento uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_resultado jsonb;
begin
  if not exists (
    select 1 from prova_andamento
    where id = p_andamento and (aluno_id = auth.uid() or public.is_interno())
  ) then
    raise exception 'prova nao iniciada';
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
          from prova_questao_alternativa a
          where a.prova_questao_id = q.id
        ), '[]'::jsonb)
      ) as item
    from prova_questao q
    where q.prova_andamento_id = p_andamento
  ) q;

  return v_resultado;
end;
$$;

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
      and entregue_em is null;
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

grant execute on function public.questoes_do_andamento(uuid) to authenticated;

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
  v_andamento uuid;
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

  if v_encerra then
    select id into v_andamento
    from prova_andamento
    where aluno_id = v_aluno
      and questionario_id = v_questionario
      and entregue_em is null
    order by iniciada_em desc
    limit 1;
    if v_andamento is null then
      raise exception 'prova nao iniciada';
    end if;
    perform public.montar_prova_andamento(v_andamento);

    for r in select value from jsonb_array_elements(coalesce(p_respostas, '[]'::jsonb))
    loop
      if exists (
        select 1 from prova_andamento
        where id = v_andamento and now() >= expira_em
      ) then
        exit;
      end if;
      v_questao := (r->>'questao_id')::uuid;
      v_alt := (r->>'alternativa_id')::uuid;
      if exists (
        select 1 from prova_questao q
        where q.id = v_questao and q.prova_andamento_id = v_andamento
      ) and exists (
        select 1 from prova_questao_alternativa a
        where a.id = v_alt and a.prova_questao_id = v_questao
      ) then
        insert into prova_resposta (prova_questao_id, alternativa_id, respondida_em)
        values (v_questao, v_alt, now())
        on conflict (prova_questao_id)
        do update set alternativa_id = excluded.alternativa_id, respondida_em = now();
      end if;
    end loop;

    select count(*) into v_total from prova_questao where prova_andamento_id = v_andamento;
    if coalesce(v_total, 0) = 0 then
      raise exception 'prova sem questoes';
    end if;

    select count(*) into v_acertos
    from prova_resposta r
    join prova_questao q on q.id = r.prova_questao_id
    join prova_questao_alternativa a on a.id = r.alternativa_id
    where q.prova_andamento_id = v_andamento
      and a.correta;
  else
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
        and q.questionario_id = v_questionario;
      if v_correta then
        v_acertos := v_acertos + 1;
      end if;
    end loop;
  end if;

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

