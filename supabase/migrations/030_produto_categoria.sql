create table if not exists produto_categoria (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null,
  descricao text not null default '',
  imagem_path text,
  pai_id uuid references produto_categoria (id) on delete restrict,
  ordem integer not null default 1,
  ativo boolean not null default true,
  sistema boolean not null default false,
  data_criacao timestamptz not null default now(),
  constraint produto_categoria_slug_key unique (slug)
);

create index if not exists idx_produto_categoria_pai on produto_categoria (pai_id);
create index if not exists idx_produto_categoria_pai_ordem on produto_categoria (pai_id, ordem);

create table if not exists produto_categoria_produto (
  produto_id uuid not null references produto (id) on delete cascade,
  categoria_id uuid not null references produto_categoria (id) on delete restrict,
  primary key (produto_id, categoria_id)
);

create index if not exists idx_produto_categoria_produto_categoria on produto_categoria_produto (categoria_id);

create or replace function public.produto_categoria_validar_hierarquia()
returns trigger
language plpgsql
as $$
declare
  atual uuid;
  profundidade integer := 0;
begin
  if new.pai_id is null then
    return new;
  end if;

  if new.pai_id = new.id then
    raise exception 'A categoria não pode ser pai de si mesma.';
  end if;

  atual := new.pai_id;
  while atual is not null and profundidade < 24 loop
    if atual = new.id then
      raise exception 'Hierarquia inválida: ciclo detectado.';
    end if;
    select pai_id into atual from public.produto_categoria where id = atual;
    profundidade := profundidade + 1;
  end loop;

  if profundidade >= 24 then
    raise exception 'A hierarquia de categorias ultrapassa o limite permitido.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_produto_categoria_hierarquia on produto_categoria;
create trigger trg_produto_categoria_hierarquia
  before insert or update of pai_id on produto_categoria
  for each row
  execute function public.produto_categoria_validar_hierarquia();

create or replace function public.produto_categoria_ids_descendentes(p_raiz uuid)
returns setof uuid
language sql
stable
as $$
  with recursive arvore as (
    select c.id
    from public.produto_categoria c
    where c.id = p_raiz
    union all
    select filho.id
    from public.produto_categoria filho
    inner join arvore on filho.pai_id = arvore.id
  )
  select id from arvore;
$$;

create or replace function public.produto_categoria_ids_por_slug_raiz(p_slug text)
returns setof uuid
language sql
stable
as $$
  select public.produto_categoria_ids_descendentes(raiz.id)
  from public.produto_categoria raiz
  where raiz.slug = p_slug and raiz.pai_id is null;
$$;

alter table produto_categoria enable row level security;
alter table produto_categoria_produto enable row level security;

drop policy if exists produto_categoria_select on produto_categoria;
drop policy if exists produto_categoria_write on produto_categoria;
drop policy if exists produto_categoria_produto_select on produto_categoria_produto;
drop policy if exists produto_categoria_produto_write on produto_categoria_produto;

create policy produto_categoria_select on produto_categoria for select
using (true);

create policy produto_categoria_write on produto_categoria for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy produto_categoria_produto_select on produto_categoria_produto for select
using (
  public.is_interno()
  or exists (
    select 1
    from produto p
    where p.id = produto_categoria_produto.produto_id
      and p.ativo
  )
);

create policy produto_categoria_produto_write on produto_categoria_produto for all to authenticated
using (public.is_admin()) with check (public.is_admin());

insert into produto_categoria (nome, slug, descricao, pai_id, ordem, ativo, sistema)
values
  ('Especializações', 'especializacoes', '', null, 1, true, false),
  ('Sem categoria', 'sem-categoria', 'Produtos ainda não classificados.', null, 2, true, true),
  ('Assinatura', 'assinatura', '', null, 3, true, false),
  ('Cursos de Teologia', 'cursos-de-teologia', '', null, 4, true, false),
  ('Livraria', 'livraria', '', null, 5, true, false)
on conflict (slug) do nothing;

insert into produto_categoria (nome, slug, descricao, pai_id, ordem, ativo, sistema)
select v.nome, v.slug, '', pai.id, v.ordem, true, false
from (values
  ('especializacoes', 'Híbrido', 'hibrido', 1)
) as v(pai_slug, nome, slug, ordem)
inner join produto_categoria pai on pai.slug = v.pai_slug and pai.pai_id is null
on conflict (slug) do nothing;

insert into produto_categoria (nome, slug, descricao, pai_id, ordem, ativo, sistema)
select v.nome, v.slug, '', pai.id, v.ordem, true, false
from (values
  ('cursos-de-teologia', 'Avançado Completo', 'avancado-completo', 1),
  ('cursos-de-teologia', 'Bacharel Livre', 'bacharel-livre', 2),
  ('cursos-de-teologia', 'Básico Completo', 'basico-completo', 3),
  ('cursos-de-teologia', 'Médio Completo', 'medio-completo', 4),
  ('cursos-de-teologia', 'Nível Avançado', 'nivel-avancado', 5),
  ('cursos-de-teologia', 'Nível Básico', 'nivel-basico', 6),
  ('cursos-de-teologia', 'Nível Médio', 'nivel-medio', 7)
) as v(pai_slug, nome, slug, ordem)
inner join produto_categoria pai on pai.slug = v.pai_slug and pai.pai_id is null
on conflict (slug) do nothing;

insert into produto_categoria (nome, slug, descricao, pai_id, ordem, ativo, sistema)
select v.nome, v.slug, '', pai.id, v.ordem, true, false
from (values
  ('bacharel-livre', 'Bacharel Completo', 'bacharel-completo', 1)
) as v(pai_slug, nome, slug, ordem)
inner join produto_categoria pai on pai.slug = v.pai_slug
on conflict (slug) do nothing;

insert into produto_categoria_produto (produto_id, categoria_id)
select p.id, c.id
from produto p
inner join produto_categoria c on c.slug = case p.categoria
  when 'especializacao' then 'especializacoes'
  when 'livraria' then 'livraria'
  else 'cursos-de-teologia'
end
where not exists (
  select 1 from produto_categoria_produto vinculo where vinculo.produto_id = p.id
);

insert into produto_categoria_produto (produto_id, categoria_id)
select p.id, c.id
from produto p
cross join produto_categoria c
where c.slug = 'sem-categoria'
  and not exists (
    select 1 from produto_categoria_produto vinculo where vinculo.produto_id = p.id
  );

alter table produto drop constraint if exists produto_categoria_check;
alter table produto drop column if exists categoria;

grant execute on function public.produto_categoria_ids_descendentes(uuid) to authenticated, anon, service_role;
grant execute on function public.produto_categoria_ids_por_slug_raiz(text) to authenticated, anon, service_role;