update produto p
set agrupador = true
where agrupador = false
  and exists (select 1 from produto_filho pf where pf.produto_id = p.id);