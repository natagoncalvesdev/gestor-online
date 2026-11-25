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
  v_limite integer;
  v_liberadas integer;
  v_novo_status materia_acesso_status;
begin
  if not public.is_interno() then
    raise exception 'sem permissao';
  end if;

  select m.id, mm.materia_id into v_matricula, v_materia_id
  from matricula_materia mm
  join matricula m on m.id = mm.matricula_id
  where mm.id = p_matricula_materia_id
    and m.aluno_id = p_aluno_id
    and mm.status = 'desmatriculada'
  limit 1;

  if v_matricula is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_encontrada');
  end if;

  delete from aula_progresso ap
  using aula a
  where ap.aluno_id = p_aluno_id
    and ap.aula_id = a.id
    and a.materia_id = v_materia_id;

  delete from topico_progresso tp
  using topico t
  join aula a on a.id = t.aula_id
  where tp.aluno_id = p_aluno_id
    and tp.topico_id = t.id
    and a.materia_id = v_materia_id;

  delete from tentativa_prova
  where aluno_id = p_aluno_id
    and matricula_id = v_matricula
    and materia_id = v_materia_id;

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

revoke all on function public.reiniciar_materia_matricula(uuid, uuid) from public;
grant execute on function public.reiniciar_materia_matricula(uuid, uuid) to authenticated, service_role;