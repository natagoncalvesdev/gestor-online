create or replace function public.reiniciar_materia_matricula(
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
  v_status_inicial materia_acesso_status;
  v_limite integer;
  v_liberadas integer;
  v_novo_status materia_acesso_status;
begin
  if not public.is_interno() then
    raise exception 'sem permissao';
  end if;

  select m.id, mm.materia_id, mm.status into v_matricula, v_materia_id, v_status_inicial
  from matricula_materia mm
  join matricula m on m.id = mm.matricula_id
  where mm.id = p_matricula_materia_id
    and m.aluno_id = p_aluno_id
    and mm.status in ('desmatriculada', 'concluida')
  limit 1;

  if v_matricula is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_encontrada');
  end if;

  update aula_progresso ap
  set video_concluido = false,
      atualizado_em = now()
  from aula a
  where ap.aluno_id = p_aluno_id
    and ap.aula_id = a.id
    and a.materia_id = v_materia_id;

  if v_status_inicial = 'desmatriculada' then
    update matricula
    set data_criacao = now(),
        status = 'ativa'
    where id = v_matricula;

    update matricula_materia mm
    set data_expiracao = ((now() at time zone 'America/Sao_Paulo')::date + mt.validade_dias)
    from materia mt
    where mm.matricula_id = v_matricula
      and mm.materia_id = mt.id
      and mt.validade_dias is not null;
  else
    update matricula set status = 'ativa' where id = v_matricula and status = 'concluida';

    update matricula_materia mm
    set data_expiracao = (
      (ma.data_criacao at time zone 'America/Sao_Paulo')::date + mt.validade_dias
    )
    from matricula ma, materia mt
    where mm.id = p_matricula_materia_id
      and ma.id = v_matricula
      and mm.materia_id = mt.id
      and mt.validade_dias is not null;
  end if;

  select p.materias_simultaneas into v_limite
  from matricula m
  join produto p on p.id = m.produto_id
  where m.id = v_matricula;

  select count(*) into v_liberadas
  from matricula_materia
  where matricula_id = v_matricula
    and status = 'liberada';

  if v_liberadas < greatest(coalesce(v_limite, 1), 1) then
    v_novo_status := 'liberada';
  else
    v_novo_status := 'bloqueada';
  end if;

  update matricula_materia
  set status = v_novo_status,
      liberada_em = case when v_novo_status = 'liberada' then now() else null end,
      concluida_em = null,
      conclusao_manual = false
  where id = p_matricula_materia_id;

  if v_novo_status = 'liberada' then
    perform public.liberar_proximas(v_matricula);
  end if;

  return jsonb_build_object('ok', true, 'status', v_novo_status::text);
end;
$$;
