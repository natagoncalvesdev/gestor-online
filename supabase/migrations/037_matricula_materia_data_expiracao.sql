alter table matricula_materia add column if not exists data_expiracao date;

update matricula_materia mm
set data_expiracao = ((ma.data_criacao at time zone 'America/Sao_Paulo')::date + mt.validade_dias)
from matricula ma, materia mt
where mm.matricula_id = ma.id
  and mm.materia_id = mt.id
  and mt.validade_dias is not null
  and mm.data_expiracao is null;

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
begin
  if auth.uid() is not null and not public.is_interno() then
    raise exception 'sem permissao';
  end if;

  if not exists (select 1 from produto_materia where produto_id = p_produto_id) then
    return jsonb_build_object('id', null, 'criada', false, 'motivo', 'sem_materias');
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

create or replace function public.liberar_materia(
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
  v_atualizadas integer;
begin
  if not public.is_interno() then
    raise exception 'sem permissao';
  end if;

  if not exists (
    select 1 from produto_materia
    where produto_id = p_produto_id and materia_id = p_materia_id
  ) then
    raise exception 'materia nao pertence ao produto';
  end if;

  select id into v_matricula
  from matricula
  where aluno_id = p_aluno_id and produto_id = p_produto_id and status <> 'cancelada'
  limit 1;

  if v_matricula is null then
    insert into matricula (aluno_id, produto_id, origem)
    values (p_aluno_id, p_produto_id, 'manual')
    returning id into v_matricula;

    insert into matricula_materia (matricula_id, materia_id, ordem, status, data_expiracao)
    select
      v_matricula,
      pm.materia_id,
      pm.ordem,
      'bloqueada',
      case when mt.validade_dias is null then null else (current_date + mt.validade_dias) end
    from produto_materia pm
    join materia mt on mt.id = pm.materia_id
    where pm.produto_id = p_produto_id;
  end if;

  update matricula_materia
  set status = 'liberada',
      liberada_em = coalesce(liberada_em, now()),
      liberacao_manual = true
  where matricula_id = v_matricula
    and materia_id = p_materia_id
    and status = 'bloqueada';

  get diagnostics v_atualizadas = row_count;

  return jsonb_build_object('id', v_matricula, 'liberada', v_atualizadas > 0);
end;
$$;

create or replace function public.definir_data_expiracao(
  p_matricula_materia_id uuid,
  p_data date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'sem permissao';
  end if;

  update matricula_materia
  set data_expiracao = p_data
  where id = p_matricula_materia_id;

  if not found then
    raise exception 'matricula nao encontrada';
  end if;
end;
$$;

revoke all on function public.definir_data_expiracao(uuid, date) from public;
grant execute on function public.definir_data_expiracao(uuid, date) to authenticated, service_role;
