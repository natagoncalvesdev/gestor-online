update produto_categoria
set nome = 'Cursos Teológicos'
where slug = 'cursos-de-teologia'
  and pai_id is null;

update produto_categoria
set nome = 'Especialização'
where slug = 'especializacoes'
  and pai_id is null;

insert into produto_categoria (nome, slug, descricao, pai_id, ordem, ativo, sistema)
select v.nome, v.slug, '', pai.id, v.ordem, true, false
from (values
  ('Básico', 'basico', 1),
  ('Médio', 'medio', 2),
  ('Avançado', 'avancado', 3)
) as v(nome, slug, ordem)
inner join produto_categoria pai on pai.slug = 'cursos-de-teologia' and pai.pai_id is null
on conflict (slug) do update
set nome = excluded.nome,
    pai_id = excluded.pai_id,
    ordem = excluded.ordem,
    ativo = true;

insert into produto_categoria (nome, slug, descricao, pai_id, ordem, ativo, sistema)
select v.nome, v.slug, '', pai.id, v.ordem, true, false
from (values
  ('CFO', 'cfo', 1),
  ('Capelania', 'capelania', 2)
) as v(nome, slug, ordem)
inner join produto_categoria pai on pai.slug = 'especializacoes' and pai.pai_id is null
on conflict (slug) do update
set nome = excluded.nome,
    pai_id = excluded.pai_id,
    ordem = excluded.ordem,
    ativo = true;

insert into produto_categoria_produto (produto_id, categoria_id)
select pcp.produto_id, novo.id
from produto_categoria_produto pcp
inner join produto_categoria antigo on antigo.id = pcp.categoria_id
inner join produto_categoria novo on novo.slug = case antigo.slug
  when 'nivel-basico' then 'basico'
  when 'basico-completo' then 'basico'
  when 'nivel-medio' then 'medio'
  when 'medio-completo' then 'medio'
  when 'nivel-avancado' then 'avancado'
  when 'avancado-completo' then 'avancado'
  when 'hibrido' then 'cfo'
  else null
end
where novo.slug is not null
on conflict do nothing;