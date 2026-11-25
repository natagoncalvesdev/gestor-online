-- PostgREST resolve RPC por ordem alfabética dos parâmetros: p_aluno_id antes de p_matricula_materia_id.

drop function if exists public.concluir_materia_matricula(uuid, uuid);

create or replace function public.concluir_materia_matricula(
  p_aluno_id uuid,
  p_matricula_materia_id uuid
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

drop function if exists public.desmatricular_materia_matricula(uuid, uuid);

create or replace function public.desmatricular_materia_matricula(
  p_aluno_id uuid,
  p_matricula_materia_id uuid
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

revoke all on function public.concluir_materia_matricula(uuid, uuid) from public;
revoke all on function public.desmatricular_materia_matricula(uuid, uuid) from public;
grant execute on function public.concluir_materia_matricula(uuid, uuid) to authenticated, service_role;
grant execute on function public.desmatricular_materia_matricula(uuid, uuid) to authenticated, service_role;