create table if not exists aula_topico (
  id uuid primary key default gen_random_uuid(),
  materia_id uuid not null references materia (id) on delete cascade,
  titulo text not null,
  ordem int not null,
  unique (materia_id, ordem)
);

alter table aula add column if not exists topico_id uuid references aula_topico (id) on delete set null;
alter table aula add column if not exists youtube_id text;

alter table aula_topico enable row level security;

create policy aula_topico_select on aula_topico for select to authenticated
using (
  public.is_interno()
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

create policy aula_topico_write on aula_topico for all to authenticated
using (public.is_admin()) with check (public.is_admin());
