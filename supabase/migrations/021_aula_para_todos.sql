drop policy if exists aula_select on aula;
create policy aula_select on aula for select to authenticated
using (
  public.is_interno()
  or exists (
    select 1 from materia
    where materia.id = aula.materia_id
      and materia.para_todos
      and materia.ativo
  )
  or exists (
    select 1
    from matricula_materia mm
    join matricula m on m.id = mm.matricula_id
    where mm.materia_id = aula.materia_id
      and m.aluno_id = auth.uid()
      and mm.status in ('liberada', 'concluida')
      and m.status <> 'cancelada'
  )
);

drop policy if exists aula_topico_select on aula_topico;
create policy aula_topico_select on aula_topico for select to authenticated
using (
  public.is_interno()
  or exists (
    select 1 from materia
    where materia.id = aula_topico.materia_id
      and materia.para_todos
      and materia.ativo
  )
  or exists (
    select 1
    from matricula_materia mm
    join matricula m on m.id = mm.matricula_id
    where mm.materia_id = aula_topico.materia_id
      and m.aluno_id = auth.uid()
      and mm.status in ('liberada', 'concluida')
      and m.status <> 'cancelada'
  )
);
