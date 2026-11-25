drop policy if exists matricula_write on matricula;
create policy matricula_write on matricula for update to authenticated
using (public.is_interno())
with check (public.is_interno());

drop policy if exists mm_write on matricula_materia;
create policy mm_write on matricula_materia for update to authenticated
using (public.is_interno())
with check (public.is_interno());

create or replace function public.desmatricular_matricula(
  p_matricula_id uuid,
  p_aluno_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_interno() then
    raise exception 'sem permissao';
  end if;

  update matricula
  set status = 'cancelada'
  where id = p_matricula_id
    and aluno_id = p_aluno_id
    and status <> 'cancelada';

  if not found then
    raise exception 'matricula nao encontrada';
  end if;
end;
$$;

revoke all on function public.desmatricular_matricula(uuid, uuid) from public;
grant execute on function public.desmatricular_matricula(uuid, uuid) to authenticated, service_role;