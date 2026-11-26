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
end;
$$;

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

  delete from aula_progresso ap
  using aula a
  where ap.aluno_id = p_aluno_id
    and ap.aula_id = a.id
    and a.materia_id = v_materia_id;

  delete from tentativa_prova
  where aluno_id = p_aluno_id
    and matricula_id = v_matricula
    and materia_id = v_materia_id;

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

drop table if exists topico_progresso cascade;
