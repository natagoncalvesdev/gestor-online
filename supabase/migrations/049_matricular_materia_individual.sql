create or replace function public.matricular_materia_aluno(
  p_aluno_id uuid,
  p_produto_id uuid,
  p_materia_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_matricula uuid;
  v_limite integer;
  v_liberadas integer;
  v_ordem integer;
  v_status materia_acesso_status;
  v_mm_id uuid;
  v_mm_status materia_acesso_status;
begin
  if not public.is_interno() then
    raise exception 'sem permissao';
  end if;

  if exists (select 1 from produto where id = p_produto_id and agrupador) then
    return jsonb_build_object('ok', false, 'motivo', 'produto_agrupador');
  end if;

  select pm.ordem into v_ordem
  from produto_materia pm
  join produto p on p.id = pm.produto_id
  where pm.produto_id = p_produto_id
    and pm.materia_id = p_materia_id
    and p.ativo;

  if v_ordem is null then
    return jsonb_build_object('ok', false, 'motivo', 'materia_invalida');
  end if;

  select id into v_matricula
  from matricula
  where aluno_id = p_aluno_id
    and produto_id = p_produto_id
    and status <> 'cancelada'
  limit 1;

  if v_matricula is null then
    insert into matricula (aluno_id, produto_id, origem)
    values (p_aluno_id, p_produto_id, 'manual')
    returning id into v_matricula;
  end if;

  select mm.id, mm.status into v_mm_id, v_mm_status
  from matricula_materia mm
  where mm.matricula_id = v_matricula
    and mm.materia_id = p_materia_id
  limit 1;

  if v_mm_id is not null and v_mm_status <> 'desmatriculada' then
    return jsonb_build_object('ok', false, 'motivo', 'ja_matriculada');
  end if;

  select coalesce(p.materias_simultaneas, 1) into v_limite from produto p where p.id = p_produto_id;

  select count(*) into v_liberadas
  from matricula_materia
  where matricula_id = v_matricula
    and status = 'liberada';

  if v_liberadas < greatest(v_limite, 1) then
    v_status := 'liberada';
  else
    v_status := 'bloqueada';
  end if;

  if v_mm_id is not null then
    update matricula_materia
    set status = v_status,
        ordem = v_ordem,
        liberada_em = case when v_status = 'liberada' then now() else null end,
        concluida_em = null,
        conclusao_manual = false,
        data_expiracao = case
          when (select validade_dias from materia where id = p_materia_id) is null then null
          else (current_date + (select validade_dias from materia where id = p_materia_id))
        end
    where id = v_mm_id;
  else
    insert into matricula_materia (matricula_id, materia_id, ordem, status, liberada_em, data_expiracao)
    values (
      v_matricula,
      p_materia_id,
      v_ordem,
      v_status,
      case when v_status = 'liberada' then now() else null end,
      case
        when (select validade_dias from materia where id = p_materia_id) is null then null
        else (current_date + (select validade_dias from materia where id = p_materia_id))
      end
    );
  end if;

  if v_status = 'liberada' then
    perform public.liberar_proximas(v_matricula);
  end if;

  return jsonb_build_object('ok', true, 'matricula_id', v_matricula, 'status', v_status::text);
end;
$$;

revoke all on function public.matricular_materia_aluno(uuid, uuid, uuid) from public;
grant execute on function public.matricular_materia_aluno(uuid, uuid, uuid) to authenticated, service_role;