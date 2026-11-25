create or replace function public.alterar_data_matricula(
  p_matricula_id uuid,
  p_data timestamptz
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

  update matricula
  set data_criacao = p_data
  where id = p_matricula_id;

  if not found then
    raise exception 'matricula nao encontrada';
  end if;

  update matricula_materia mm
  set data_expiracao = ((p_data at time zone 'America/Sao_Paulo')::date + mt.validade_dias)
  from materia mt
  where mm.matricula_id = p_matricula_id
    and mm.materia_id = mt.id
    and mt.validade_dias is not null;
end;
$$;

revoke all on function public.alterar_data_matricula(uuid, timestamptz) from public;
grant execute on function public.alterar_data_matricula(uuid, timestamptz) to authenticated, service_role;