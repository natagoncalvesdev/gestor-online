alter type materia_acesso_status add value if not exists 'desmatriculada';

create or replace function public.liberar_proximas(p_matricula_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limite integer;
  v_abertas integer;
  v_slots integer;
begin
  select p.materias_simultaneas into v_limite
  from matricula m
  join produto p on p.id = m.produto_id
  where m.id = p_matricula_id;

  if v_limite is null then
    return;
  end if;

  select count(*) into v_abertas
  from matricula_materia
  where matricula_id = p_matricula_id and status = 'liberada';

  v_slots := greatest(v_limite - v_abertas, 0);

  if v_slots > 0 then
    update matricula_materia
    set status = 'liberada', liberada_em = now()
    where id in (
      select id from matricula_materia
      where matricula_id = p_matricula_id and status = 'bloqueada'
      order by ordem
      limit v_slots
    );
  end if;

  if not exists (
    select 1 from matricula_materia
    where matricula_id = p_matricula_id and status in ('bloqueada', 'liberada')
  ) and exists (
    select 1 from matricula_materia
    where matricula_id = p_matricula_id and status = 'concluida'
  ) then
    update matricula set status = 'concluida' where id = p_matricula_id and status = 'ativa';
  end if;
end;
$$;

create or replace function public.marcar_progresso_materia_completo(
  p_aluno_id uuid,
  p_materia_id uuid,
  p_matricula_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into aula_progresso (aluno_id, aula_id, video_concluido, atualizado_em)
  select p_aluno_id, a.id, true, now()
  from aula a
  where a.materia_id = p_materia_id
  on conflict (aluno_id, aula_id) do update
    set video_concluido = true, atualizado_em = now();

  insert into topico_progresso (aluno_id, topico_id, video_concluido, atualizado_em)
  select p_aluno_id, t.id, true, now()
  from topico t
  join aula a on a.id = t.aula_id
  where a.materia_id = p_materia_id
  on conflict (aluno_id, topico_id) do update
    set video_concluido = true, atualizado_em = now();

  insert into tentativa_prova (aluno_id, materia_id, matricula_id, nota, aprovado, acertos, total, questionario_id)
  select
    p_aluno_id,
    p_materia_id,
    p_matricula_id,
    10,
    true,
    coalesce((select count(*)::integer from questao q where q.questionario_id = qz.id), 1),
    greatest(coalesce((select count(*)::integer from questao q where q.questionario_id = qz.id), 1), 1),
    qz.id
  from questionario qz
  where qz.materia_id = p_materia_id
    and not exists (
      select 1 from tentativa_prova t
      where t.aluno_id = p_aluno_id
        and t.questionario_id = qz.id
        and t.aprovado
    );
end;
$$;

create or replace function public.concluir_materia_matricula(
  p_matricula_materia_id uuid,
  p_aluno_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_matricula uuid;
  v_materia_id uuid;
  v_atualizadas integer;
begin
  if not public.is_interno() then
    raise exception 'sem permissao';
  end if;

  select m.id, mm.materia_id into v_matricula, v_materia_id
  from matricula_materia mm
  join matricula m on m.id = mm.matricula_id
  where mm.id = p_matricula_materia_id
    and m.aluno_id = p_aluno_id
    and m.status = 'ativa'
  limit 1;

  if v_matricula is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_encontrada');
  end if;

  perform public.marcar_progresso_materia_completo(p_aluno_id, v_materia_id, v_matricula);

  update matricula_materia
  set status = 'concluida',
      concluida_em = now()
  where id = p_matricula_materia_id
    and matricula_id = v_matricula
    and status = 'liberada';

  get diagnostics v_atualizadas = row_count;
  if v_atualizadas = 0 then
    return jsonb_build_object('ok', false, 'motivo', 'nao_liberada');
  end if;

  perform public.liberar_proximas(v_matricula);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.desmatricular_materia_matricula(
  p_matricula_materia_id uuid,
  p_aluno_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_matricula uuid;
  v_status materia_acesso_status;
  v_atualizadas integer;
begin
  if not public.is_interno() then
    raise exception 'sem permissao';
  end if;

  select m.id, mm.status into v_matricula, v_status
  from matricula_materia mm
  join matricula m on m.id = mm.matricula_id
  where mm.id = p_matricula_materia_id
    and m.aluno_id = p_aluno_id
    and m.status <> 'cancelada'
  limit 1;

  if v_matricula is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_encontrada');
  end if;

  if v_status = 'desmatriculada' then
    return jsonb_build_object('ok', false, 'motivo', 'ja_desmatriculada');
  end if;

  update matricula_materia
  set status = 'desmatriculada',
      liberada_em = null,
      concluida_em = null
  where id = p_matricula_materia_id
    and matricula_id = v_matricula;

  get diagnostics v_atualizadas = row_count;
  if v_atualizadas = 0 then
    return jsonb_build_object('ok', false, 'motivo', 'nao_encontrada');
  end if;

  if v_status = 'liberada' then
    perform public.liberar_proximas(v_matricula);
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.marcar_progresso_materia_completo(uuid, uuid, uuid) from public;
grant execute on function public.marcar_progresso_materia_completo(uuid, uuid, uuid) to service_role;