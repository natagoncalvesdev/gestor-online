alter table materia add column if not exists prova_duracao_minutos integer not null default 60
  check (prova_duracao_minutos >= 5 and prova_duracao_minutos <= 240);

create table if not exists prova_andamento (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references aluno (id) on delete cascade,
  questionario_id uuid not null references questionario (id) on delete cascade,
  iniciada_em timestamptz not null default now(),
  expira_em timestamptz not null,
  respostas jsonb not null default '[]'::jsonb,
  entregue_em timestamptz
);

create unique index if not exists prova_andamento_aberta
  on prova_andamento (aluno_id, questionario_id)
  where entregue_em is null;

create index if not exists idx_prova_andamento_aluno on prova_andamento (aluno_id, questionario_id);

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

drop trigger if exists trg_prova_andamento_protege on prova_andamento;
create trigger trg_prova_andamento_protege
  before update on prova_andamento
  for each row
  execute function public.prova_andamento_protege();

alter table prova_andamento enable row level security;

drop policy if exists prova_andamento_select on prova_andamento;
create policy prova_andamento_select on prova_andamento for select to authenticated
  using (aluno_id = auth.uid() or public.is_interno());

drop policy if exists prova_andamento_insert on prova_andamento;
create policy prova_andamento_insert on prova_andamento for insert to authenticated
  with check (aluno_id = auth.uid());

drop policy if exists prova_andamento_update on prova_andamento;
create policy prova_andamento_update on prova_andamento for update to authenticated
  using (aluno_id = auth.uid())
  with check (aluno_id = auth.uid());

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
    if not exists (
      select 1
      from prova_andamento
      where aluno_id = auth.uid()
        and questionario_id = p_questionario_id
        and entregue_em is null
    ) then
      raise exception 'prova nao iniciada';
    end if;
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
