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
  v_status materia_acesso_status;
  v_atualizadas integer;
begin
  if not public.is_interno() then
    raise exception 'sem permissao';
  end if;

  select m.id, mm.materia_id, mm.status
  into v_matricula, v_materia_id, v_status
  from matricula_materia mm
  join matricula m on m.id = mm.matricula_id
  where mm.id = p_matricula_materia_id
    and m.aluno_id = p_aluno_id
    and m.status = 'ativa'
  limit 1;

  if v_matricula is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_encontrada');
  end if;

  if v_status is distinct from 'liberada' and v_status is distinct from 'concluida' then
    return jsonb_build_object('ok', false, 'motivo', 'nao_liberada');
  end if;

  perform public.marcar_progresso_materia_completo(p_aluno_id, v_materia_id, v_matricula);

  update matricula_materia
  set status = 'concluida',
      concluida_em = coalesce(concluida_em, now()),
      conclusao_manual = true
  where id = p_matricula_materia_id
    and matricula_id = v_matricula
    and status in ('liberada', 'concluida');

  get diagnostics v_atualizadas = row_count;
  if v_atualizadas = 0 then
    return jsonb_build_object('ok', false, 'motivo', 'nao_liberada');
  end if;

  perform public.liberar_proximas(v_matricula);
  return jsonb_build_object('ok', true);
end;
$$;
