alter table produto add column if not exists materias_simultaneas integer not null default 1;
alter table produto drop constraint if exists produto_materias_simultaneas_check;
alter table produto add constraint produto_materias_simultaneas_check check (materias_simultaneas between 1 and 3);
alter table produto add column if not exists comprimento_cm integer not null default 0 check (comprimento_cm >= 0);
alter table produto add column if not exists largura_cm integer not null default 0 check (largura_cm >= 0);
alter table produto add column if not exists altura_cm integer not null default 0 check (altura_cm >= 0);
alter table produto add column if not exists curso_origem uuid;

update produto set curso_origem = curso_id where curso_id is not null and curso_origem is null;

insert into produto (nome, slug, descricao, preco, materias_simultaneas, ativo, curso_origem)
select
  c.nome,
  case
    when exists (select 1 from produto p where p.slug = c.slug) then c.slug || '-estudo'
    else c.slug
  end,
  c.descricao,
  0,
  c.materias_simultaneas,
  c.ativo,
  c.id
from curso c
where not exists (select 1 from produto p where p.curso_origem = c.id);

create table if not exists produto_materia (
  produto_id uuid not null references produto (id) on delete cascade,
  materia_id uuid not null references materia (id),
  ordem integer not null,
  primary key (produto_id, materia_id),
  unique (produto_id, ordem)
);

insert into produto_materia (produto_id, materia_id, ordem)
select p.id, cm.materia_id, cm.ordem
from produto p
join curso_materia cm on cm.curso_id = p.curso_origem
on conflict do nothing;

alter table matricula add column if not exists produto_id uuid references produto (id);
update matricula m
set produto_id = (
  select p.id from produto p where p.curso_origem = m.curso_id order by p.data_criacao limit 1
)
where m.produto_id is null;

delete from matricula where produto_id is null;

drop index if exists uq_matricula_aberta;
alter table matricula drop column curso_id;
alter table matricula alter column produto_id set not null;
create unique index uq_matricula_aberta on matricula (aluno_id, produto_id) where status <> 'cancelada';

alter table pedido_item drop column if exists curso_id;
drop index if exists idx_produto_curso;
alter table produto drop column if exists curso_id;

drop policy if exists curso_select on curso;
drop policy if exists curso_write on curso;
drop policy if exists curso_materia_select on curso_materia;
drop policy if exists curso_materia_write on curso_materia;
drop table if exists curso_materia;
drop table if exists curso;
alter table produto drop column if exists curso_origem;

alter table produto_materia enable row level security;
drop policy if exists produto_materia_select on produto_materia;
drop policy if exists produto_materia_write on produto_materia;
create policy produto_materia_select on produto_materia for select
using (
  public.is_interno()
  or exists (select 1 from produto p where p.id = produto_materia.produto_id and p.ativo)
);
create policy produto_materia_write on produto_materia for all to authenticated
using (public.is_admin()) with check (public.is_admin());

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
  ) then
    update matricula set status = 'concluida' where id = p_matricula_id;
  end if;
end;
$$;

drop function if exists public.criar_matricula(uuid, uuid, text, uuid);
create function public.criar_matricula(
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

  insert into matricula_materia (matricula_id, materia_id, ordem, status, liberada_em)
  select
    v_matricula,
    pm.materia_id,
    pm.ordem,
    case when pm.seq <= v_limite then 'liberada'::materia_acesso_status else 'bloqueada'::materia_acesso_status end,
    case when pm.seq <= v_limite then now() else null end
  from (
    select
      materia_id,
      ordem,
      row_number() over (order by ordem) as seq
    from produto_materia
    where produto_id = p_produto_id
  ) pm;

  return jsonb_build_object('id', v_matricula, 'criada', true);
end;
$$;

drop function if exists public.liberar_materia(uuid, uuid, uuid);
create function public.liberar_materia(
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

    insert into matricula_materia (matricula_id, materia_id, ordem, status)
    select v_matricula, pm.materia_id, pm.ordem, 'bloqueada'
    from produto_materia pm
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

revoke all on function public.criar_matricula(uuid, uuid, text, uuid) from public;
revoke all on function public.liberar_materia(uuid, uuid, uuid) from public;
grant execute on function public.criar_matricula(uuid, uuid, text, uuid) to authenticated, service_role;
grant execute on function public.liberar_materia(uuid, uuid, uuid) to authenticated;
