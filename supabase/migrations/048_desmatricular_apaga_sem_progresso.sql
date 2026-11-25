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
  v_materia_id uuid;
  v_status materia_acesso_status;
  v_feitas integer := 0;
  v_n integer;
  v_restantes integer;
begin
  if not public.is_interno() then
    raise exception 'sem permissao';
  end if;

  select m.id, mm.materia_id, mm.status into v_matricula, v_materia_id, v_status
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

  select count(*) into v_n
  from aula_progresso ap
  join aula a on a.id = ap.aula_id
  where ap.aluno_id = p_aluno_id
    and a.materia_id = v_materia_id
    and ap.video_concluido;
  v_feitas := v_feitas + coalesce(v_n, 0);

  select count(*) into v_n
  from topico_progresso tp
  join topico t on t.id = tp.topico_id
  join aula a on a.id = t.aula_id
  where tp.aluno_id = p_aluno_id
    and a.materia_id = v_materia_id
    and tp.video_concluido;
  v_feitas := v_feitas + coalesce(v_n, 0);

  select count(*) into v_n
  from tentativa_prova t
  where t.aluno_id = p_aluno_id
    and t.matricula_id = v_matricula
    and t.materia_id = v_materia_id
    and t.aprovado;
  v_feitas := v_feitas + coalesce(v_n, 0);

  if v_feitas = 0 then
    delete from matricula_materia where id = p_matricula_materia_id;

    if v_status = 'liberada' then
      perform public.liberar_proximas(v_matricula);
    end if;

    select count(*) into v_restantes from matricula_materia where matricula_id = v_matricula;
    if v_restantes = 0 then
      update matricula set status = 'cancelada' where id = v_matricula;
      return jsonb_build_object('ok', true, 'removida', true, 'matricula_cancelada', true);
    end if;

    return jsonb_build_object('ok', true, 'removida', true, 'matricula_cancelada', false);
  end if;

  update matricula_materia
  set status = 'desmatriculada',
      liberada_em = null,
      concluida_em = null,
      conclusao_manual = false
  where id = p_matricula_materia_id
    and matricula_id = v_matricula;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'nao_encontrada');
  end if;

  if v_status = 'liberada' then
    perform public.liberar_proximas(v_matricula);
  end if;

  return jsonb_build_object('ok', true, 'removida', false);
end;
$$;