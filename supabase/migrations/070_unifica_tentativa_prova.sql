alter table tentativa_prova
  alter column matricula_id drop not null,
  add column if not exists iniciada_em timestamptz,
  add column if not exists expira_em timestamptz,
  add column if not exists entregue_em timestamptz,
  add column if not exists codigo text;

alter table tentativa_prova drop constraint if exists tentativa_prova_codigo_formato;
alter table tentativa_prova add constraint tentativa_prova_codigo_formato
  check (codigo is null or codigo ~ '^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$');

insert into tentativa_prova (
  id, aluno_id, materia_id, matricula_id, questionario_id,
  nota, aprovado, acertos, total, data_criacao,
  iniciada_em, expira_em, entregue_em, codigo
)
select
  pa.id,
  pa.aluno_id,
  q.materia_id,
  (
    select mm.matricula_id
    from matricula_materia mm
    join matricula m on m.id = mm.matricula_id
    where m.aluno_id = pa.aluno_id
      and mm.materia_id = q.materia_id
    order by mm.liberada_em desc nulls last
    limit 1
  ),
  pa.questionario_id,
  pa.nota,
  pa.aprovado,
  pa.acertos,
  pa.total,
  pa.iniciada_em,
  pa.iniciada_em,
  pa.expira_em,
  pa.entregue_em,
  pa.codigo
from prova_andamento pa
join questionario q on q.id = pa.questionario_id
where not exists (select 1 from tentativa_prova t where t.id = pa.id);

delete from tentativa_prova t
where t.iniciada_em is null
  and t.nota is not null
  and exists (
    select 1
    from tentativa_prova t2
    where t2.id is distinct from t.id
      and t2.aluno_id = t.aluno_id
      and t2.questionario_id is not distinct from t.questionario_id
      and t2.iniciada_em is not null
  );

alter table prova_questao drop constraint if exists prova_questao_prova_andamento_id_fkey;

drop trigger if exists trg_prova_andamento_protege on prova_andamento;
drop trigger if exists trg_prova_andamento_codigo on prova_andamento;
drop trigger if exists trg_prova_andamento_conclui_conteudo on prova_andamento;

drop policy if exists prova_questao_select on prova_questao;
drop policy if exists prova_resposta_select on prova_resposta;
drop policy if exists prova_resposta_ins on prova_resposta;
drop policy if exists prova_resposta_upd on prova_resposta;

drop table if exists prova_andamento;

alter table prova_questao
  add constraint prova_questao_prova_andamento_id_fkey
  foreign key (prova_andamento_id) references tentativa_prova (id) on delete cascade;

create unique index if not exists tentativa_prova_aberta
  on tentativa_prova (aluno_id, questionario_id)
  where entregue_em is null and questionario_id is not null;

create unique index if not exists tentativa_prova_codigo_uidx
  on tentativa_prova (codigo)
  where codigo is not null;

create index if not exists idx_tentativa_questionario on tentativa_prova (aluno_id, questionario_id);

drop policy if exists tentativa_insert_interno on tentativa_prova;
drop policy if exists tentativa_insert on tentativa_prova;
create policy tentativa_insert on tentativa_prova for insert to authenticated
  with check (aluno_id = auth.uid() or public.is_interno());

drop policy if exists tentativa_update on tentativa_prova;
create policy tentativa_update on tentativa_prova for update to authenticated
  using (aluno_id = auth.uid() or public.is_interno())
  with check (aluno_id = auth.uid() or public.is_interno());

grant select, insert, update, delete on tentativa_prova to authenticated;

create or replace function public.fn_gerar_codigo_prova()
returns text
language plpgsql
as $$
declare
  alfabeto constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  gerado text;
  i int;
  pos int;
begin
  loop
    gerado := '';
    for i in 1..12 loop
      pos := 1 + floor(random() * length(alfabeto))::int;
      gerado := gerado || substr(alfabeto, pos, 1);
      if i in (4, 8) then
        gerado := gerado || '-';
      end if;
    end loop;
    exit when not exists (select 1 from tentativa_prova where codigo = gerado);
  end loop;
  return gerado;
end;
$$;

create or replace function public.fn_tentativa_prova_codigo()
returns trigger
language plpgsql
as $$
begin
  if new.iniciada_em is null then
    return new;
  end if;
  if new.codigo is null or btrim(new.codigo) = '' then
    new.codigo := public.fn_gerar_codigo_prova();
  end if;
  new.codigo := upper(new.codigo);
  return new;
end;
$$;

drop trigger if exists trg_tentativa_prova_codigo on tentativa_prova;
create trigger trg_tentativa_prova_codigo
  before insert or update of iniciada_em, codigo on tentativa_prova
  for each row
  execute function public.fn_tentativa_prova_codigo();

create or replace function public.tentativa_prova_protege()
returns trigger
language plpgsql
as $$
begin
  if old.aluno_id is distinct from new.aluno_id then
    raise exception 'nao permitido';
  end if;
  if old.iniciada_em is not null and new.iniciada_em is distinct from old.iniciada_em then
    raise exception 'nao permitido';
  end if;
  if old.expira_em is not null and new.expira_em is distinct from old.expira_em then
    raise exception 'nao permitido';
  end if;
  if old.questionario_id is not null and new.questionario_id is distinct from old.questionario_id then
    raise exception 'nao permitido';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tentativa_prova_protege on tentativa_prova;
create trigger trg_tentativa_prova_protege
  before update on tentativa_prova
  for each row
  execute function public.tentativa_prova_protege();

drop trigger if exists trg_prova_andamento_conclui_conteudo on tentativa_prova;
create trigger trg_prova_andamento_conclui_conteudo
  after update of entregue_em on tentativa_prova
  for each row
  execute function public.fn_prova_andamento_conclui_conteudo();

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
  select t.aluno_id, coalesce(t.materia_id, q.materia_id), t.questionario_id
  into v_aluno, v_materia, v_questionario
  from tentativa_prova t
  left join questionario q on q.id = t.questionario_id
  where t.id = p_andamento;
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
    select 1 from tentativa_prova
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

create or replace function public.fn_prova_resposta_valida()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expira timestamptz;
  v_entregue timestamptz;
  v_aluno uuid;
begin
  if not exists (
    select 1
    from prova_questao_alternativa a
    where a.id = new.alternativa_id
      and a.prova_questao_id = new.prova_questao_id
  ) then
    raise exception 'alternativa nao pertence a questao';
  end if;

  select t.expira_em, t.entregue_em, t.aluno_id
  into v_expira, v_entregue, v_aluno
  from prova_questao q
  join tentativa_prova t on t.id = q.prova_andamento_id
  where q.id = new.prova_questao_id;

  if v_aluno is distinct from auth.uid() and not public.is_interno() then
    raise exception 'A prova nao esta em andamento';
  end if;
  if v_entregue is not null then
    raise exception 'A prova nao esta em andamento';
  end if;
  if v_expira is not null and now() >= v_expira then
    raise exception 'O tempo da prova terminou';
  end if;
  return new;
end;
$$;

create or replace function public.salvar_resposta_prova(
  p_questionario_id uuid,
  p_prova_questao_id uuid,
  p_alternativa_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_andamento uuid;
begin
  if auth.uid() is null then
    raise exception 'nao autenticado';
  end if;

  select t.id into v_andamento
  from tentativa_prova t
  join prova_questao q on q.prova_andamento_id = t.id
  where t.aluno_id = auth.uid()
    and t.questionario_id = p_questionario_id
    and t.entregue_em is null
    and t.iniciada_em is not null
    and q.id = p_prova_questao_id
    and t.expira_em > now();

  if v_andamento is null then
    raise exception 'A prova nao esta em andamento';
  end if;

  if not exists (
    select 1
    from prova_questao_alternativa a
    where a.id = p_alternativa_id
      and a.prova_questao_id = p_prova_questao_id
  ) then
    raise exception 'alternativa nao pertence a questao';
  end if;

  delete from prova_resposta where prova_questao_id = p_prova_questao_id;
  insert into prova_resposta (prova_questao_id, alternativa_id, respondida_em)
  values (p_prova_questao_id, p_alternativa_id, now());
end;
$$;

drop policy if exists prova_questao_select on prova_questao;
create policy prova_questao_select on prova_questao for select to authenticated
  using (
    exists (
      select 1 from tentativa_prova t
      where t.id = prova_andamento_id and (t.aluno_id = auth.uid() or public.is_interno())
    )
  );

drop policy if exists prova_resposta_select on prova_resposta;
create policy prova_resposta_select on prova_resposta for select to authenticated
  using (
    exists (
      select 1
      from prova_questao q
      join tentativa_prova t on t.id = q.prova_andamento_id
      where q.id = prova_questao_id and (t.aluno_id = auth.uid() or public.is_interno())
    )
  );

drop policy if exists prova_resposta_ins on prova_resposta;
create policy prova_resposta_ins on prova_resposta for insert to authenticated
  with check (
    exists (
      select 1
      from prova_questao q
      join tentativa_prova t on t.id = q.prova_andamento_id
      where q.id = prova_questao_id and t.aluno_id = auth.uid() and t.entregue_em is null
    )
  );

drop policy if exists prova_resposta_upd on prova_resposta;
create policy prova_resposta_upd on prova_resposta for update to authenticated
  using (
    exists (
      select 1
      from prova_questao q
      join tentativa_prova t on t.id = q.prova_andamento_id
      where q.id = prova_questao_id and t.aluno_id = auth.uid() and t.entregue_em is null
    )
  );

create or replace function public.concluir_materia_se_conteudo_e_prova(
  p_aluno_id uuid,
  p_materia_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mm_id uuid;
  v_matricula uuid;
  v_questionario uuid;
  v_aulas integer;
  v_feitas integer;
  v_prova boolean := false;
  v_atualizadas integer;
begin
  if p_aluno_id is null or p_materia_id is null then
    return false;
  end if;

  select count(*) into v_aulas from aula where materia_id = p_materia_id;
  if coalesce(v_aulas, 0) = 0 then
    return false;
  end if;

  select count(*) into v_feitas
  from aula a
  join aula_progresso ap on ap.aula_id = a.id
  where a.materia_id = p_materia_id
    and ap.aluno_id = p_aluno_id
    and ap.video_concluido;
  if v_feitas < v_aulas then
    return false;
  end if;

  select id into v_questionario
  from questionario
  where materia_id = p_materia_id
    and encerra_materia
  order by posicao
  limit 1;
  if v_questionario is null then
    return false;
  end if;

  select exists (
    select 1
    from tentativa_prova
    where aluno_id = p_aluno_id
      and questionario_id = v_questionario
      and (entregue_em is not null or nota is not null)
  ) into v_prova;
  if not v_prova then
    return false;
  end if;

  select mm.id, mm.matricula_id
  into v_mm_id, v_matricula
  from matricula_materia mm
  join matricula m on m.id = mm.matricula_id
  where m.aluno_id = p_aluno_id
    and mm.materia_id = p_materia_id
    and mm.status = 'liberada'
    and m.status = 'ativa'
  order by mm.liberada_em desc nulls last
  limit 1;

  if v_mm_id is null then
    return false;
  end if;

  update matricula_materia
  set status = 'concluida',
      concluida_em = now(),
      conclusao_manual = false
  where id = v_mm_id
    and status = 'liberada';
  get diagnostics v_atualizadas = row_count;
  if v_atualizadas = 0 then
    return false;
  end if;

  perform public.liberar_proximas(v_matricula);
  return true;
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

  if v_encerra and v_status is distinct from 'liberada' and v_status is distinct from 'concluida' then
    raise exception 'materia nao liberada';
  end if;

  if v_encerra then
    select id into v_andamento
    from tentativa_prova
    where aluno_id = v_aluno
      and questionario_id = v_questionario
      and entregue_em is null
      and iniciada_em is not null
    order by iniciada_em desc
    limit 1;
    if v_andamento is null then
      raise exception 'prova nao iniciada';
    end if;
    perform public.montar_prova_andamento(v_andamento);

    for r in select value from jsonb_array_elements(coalesce(p_respostas, '[]'::jsonb))
    loop
      if exists (
        select 1 from tentativa_prova
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

  if v_andamento is not null then
    update tentativa_prova
    set nota = v_nota,
        aprovado = v_aprovado,
        acertos = v_acertos,
        total = v_total,
        entregue_em = coalesce(entregue_em, now()),
        matricula_id = coalesce(matricula_id, v_matricula),
        materia_id = coalesce(materia_id, p_materia_id)
    where id = v_andamento;
  elsif v_matricula is not null then
    insert into tentativa_prova (aluno_id, materia_id, matricula_id, nota, aprovado, acertos, total, questionario_id, entregue_em)
    values (v_aluno, p_materia_id, v_matricula, v_nota, v_aprovado, v_acertos, v_total, v_questionario, now());
  end if;

  if v_aprovado and v_encerra and v_mm_id is not null and v_status = 'liberada' then
    update matricula_materia
    set status = 'concluida', concluida_em = now()
    where id = v_mm_id
      and status = 'liberada';
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
    from tentativa_prova
    where aluno_id = auth.uid()
      and questionario_id = p_questionario_id
      and iniciada_em is not null
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

drop function if exists public.prova_andamento_protege();
