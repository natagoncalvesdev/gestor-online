create or replace function public.criar_matricula(
  p_aluno_id uuid,
  p_produto_id uuid,
  p_origem text,
  p_pedido_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_matricula uuid;
  v_limite integer;
  v_novo_agrupador boolean;
begin
  if auth.uid() is not null and not public.is_interno() then
    raise exception 'sem permissao';
  end if;

  if not exists (select 1 from produto_materia where produto_id = p_produto_id) then
    return jsonb_build_object('id', null, 'criada', false, 'motivo', 'sem_materias');
  end if;

  select coalesce(p.agrupador, false) into v_novo_agrupador from produto p where p.id = p_produto_id;

  if v_novo_agrupador and exists (
    select 1
    from matricula m
    join produto p on p.id = m.produto_id
    where m.aluno_id = p_aluno_id
      and m.status = 'ativa'
      and coalesce(p.agrupador, false)
  ) then
    return jsonb_build_object('id', null, 'criada', false, 'motivo', 'sequencia_ativa');
  end if;

  select id into v_matricula
  from matricula
  where aluno_id = p_aluno_id and produto_id = p_produto_id and status <> 'cancelada'
  limit 1;

  if v_matricula is not null then
    return jsonb_build_object('id', v_matricula, 'criada', false);
  end if;

  insert into matricula (aluno_id, produto_id, origem, pedido_id)
  values (p_aluno_id, p_produto_id, p_origem::matricula_origem, p_pedido_id)
  returning id into v_matricula;

  select materias_simultaneas into v_limite from produto where id = p_produto_id;

  insert into matricula_materia (matricula_id, materia_id, ordem, status, liberada_em, data_expiracao)
  select
    v_matricula,
    pm.materia_id,
    pm.ordem,
    case when pm.seq <= v_limite then 'liberada'::materia_acesso_status else 'bloqueada'::materia_acesso_status end,
    case when pm.seq <= v_limite then now() else null end,
    case when mt.validade_dias is null then null else (current_date + mt.validade_dias) end
  from (
    select
      materia_id,
      ordem,
      row_number() over (order by ordem) as seq
    from produto_materia
    where produto_id = p_produto_id
  ) pm
  join materia mt on mt.id = pm.materia_id;

  return jsonb_build_object('id', v_matricula, 'criada', true);
end;
$$;