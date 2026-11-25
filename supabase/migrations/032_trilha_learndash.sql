-- Trilha no estilo LearnDash, dentro da matéria:
-- seção (aula_topico) agrupa lições; lição (aula) pode ter texto;
-- tópico é página filha da lição; questionário entra na sequência.

alter table aula add column if not exists conteudo text not null default '';

create table if not exists topico (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null references aula (id) on delete cascade,
  titulo text not null,
  conteudo text not null default '',
  posicao integer not null,
  bunny_video_id text,
  youtube_id text,
  epub_path text,
  epub_nome text,
  libera_em timestamptz,
  unique (aula_id, posicao)
);

create index if not exists idx_topico_aula on topico (aula_id);

create table if not exists questionario (
  id uuid primary key default gen_random_uuid(),
  materia_id uuid not null references materia (id) on delete cascade,
  aula_id uuid references aula (id) on delete cascade,
  titulo text not null,
  posicao integer not null,
  nota_minima numeric(3,1),
  encerra_materia boolean not null default false,
  constraint questionario_nota_minima_check check (nota_minima is null or (nota_minima >= 0 and nota_minima <= 10))
);

create index if not exists idx_questionario_materia on questionario (materia_id);
create index if not exists idx_questionario_aula on questionario (aula_id);

alter table questao add column if not exists questionario_id uuid references questionario (id) on delete cascade;
create index if not exists idx_questao_questionario on questao (questionario_id);

alter table tentativa_prova add column if not exists questionario_id uuid references questionario (id) on delete set null;

alter table aula_arquivo add column if not exists topico_id uuid references topico (id) on delete cascade;
create index if not exists idx_aula_arquivo_topico on aula_arquivo (topico_id);

create table if not exists topico_progresso (
  aluno_id uuid not null references aluno (id) on delete cascade,
  topico_id uuid not null references topico (id) on delete cascade,
  video_concluido boolean not null default false,
  ebook_cfi text,
  atualizado_em timestamptz not null default now(),
  primary key (aluno_id, topico_id)
);

insert into questionario (materia_id, titulo, posicao, encerra_materia)
select distintas.materia_id,
  'Prova',
  coalesce((
    select max(posicao)
    from (
      select posicao from aula where materia_id = distintas.materia_id
      union all
      select posicao from aula_topico where materia_id = distintas.materia_id
    ) posicoes
  ), 0) + 1,
  true
from (select distinct materia_id from questao where questionario_id is null) distintas
where not exists (
  select 1 from questionario q
  where q.materia_id = distintas.materia_id and q.encerra_materia and q.aula_id is null
);

update questao qs
set questionario_id = (
  select q.id
  from questionario q
  where q.materia_id = qs.materia_id and q.encerra_materia
  order by q.posicao
  limit 1
)
where qs.questionario_id is null;

update tentativa_prova t
set questionario_id = (
  select q.id
  from questionario q
  where q.materia_id = t.materia_id and q.encerra_materia
  order by q.posicao
  limit 1
)
where t.questionario_id is null;

alter table topico enable row level security;
alter table questionario enable row level security;
alter table topico_progresso enable row level security;

drop policy if exists topico_select on topico;
create policy topico_select on topico for select to authenticated
using (
  public.is_interno()
  or exists (
    select 1
    from aula
    join materia on materia.id = aula.materia_id
    where aula.id = topico.aula_id
      and materia.para_todos
      and materia.ativo
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

drop policy if exists topico_write on topico;
create policy topico_write on topico for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists questionario_select on questionario;
create policy questionario_select on questionario for select to authenticated
using (
  public.is_interno()
  or exists (
    select 1 from materia
    where materia.id = questionario.materia_id
      and materia.para_todos
      and materia.ativo
  )
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

drop policy if exists questionario_write on questionario;
create policy questionario_write on questionario for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists topico_progresso_select on topico_progresso;
create policy topico_progresso_select on topico_progresso for select to authenticated
using (aluno_id = auth.uid() or public.is_interno());

drop policy if exists topico_progresso_write on topico_progresso;
create policy topico_progresso_write on topico_progresso for all to authenticated
using (aluno_id = auth.uid() or public.is_interno())
with check (aluno_id = auth.uid());

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
    ) or exists (
      select 1 from materia
      where id = v_materia and para_todos and ativo
    ) into v_ok;
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

drop function if exists public.submeter_prova(uuid, jsonb);

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
    if exists (select 1 from materia where id = p_materia_id and para_todos and ativo) and not v_encerra then
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

revoke all on function public.questoes_do_questionario(uuid) from public;
revoke all on function public.submeter_prova(uuid, jsonb, uuid) from public;
grant execute on function public.questoes_do_questionario(uuid) to authenticated;
grant execute on function public.submeter_prova(uuid, jsonb, uuid) to authenticated;
