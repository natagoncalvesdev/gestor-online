create or replace function public.fn_prova_resposta_valida()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expira timestamptz;
  v_entregue timestamptz;
  v_aluno uuid;
begin
  if not exists (
    select 1
    from prova_questao_alternativa a
    where a.id = new.alternativa_id
      and a.prova_questao_id = new.prova_questao_id
  ) then
    raise exception 'alternativa nao pertence a questao';
  end if;

  select p.expira_em, p.entregue_em, p.aluno_id
  into v_expira, v_entregue, v_aluno
  from prova_questao q
  join prova_andamento p on p.id = q.prova_andamento_id
  where q.id = new.prova_questao_id;

  if v_aluno is distinct from auth.uid() and not public.is_interno() then
    raise exception 'A prova nao esta em andamento';
  end if;
  if v_entregue is not null then
    raise exception 'A prova nao esta em andamento';
  end if;
  if v_expira is not null and now() >= v_expira then
    raise exception 'O tempo da prova terminou';
  end if;
  return new;
end;
$$;

create or replace function public.salvar_resposta_prova(
  p_questionario_id uuid,
  p_prova_questao_id uuid,
  p_alternativa_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_andamento uuid;
begin
  if auth.uid() is null then
    raise exception 'nao autenticado';
  end if;

  select p.id into v_andamento
  from prova_andamento p
  join prova_questao q on q.prova_andamento_id = p.id
  where p.aluno_id = auth.uid()
    and p.questionario_id = p_questionario_id
    and p.entregue_em is null
    and q.id = p_prova_questao_id
    and p.expira_em > now();

  if v_andamento is null then
    raise exception 'A prova nao esta em andamento';
  end if;

  if not exists (
    select 1
    from prova_questao_alternativa a
    where a.id = p_alternativa_id
      and a.prova_questao_id = p_prova_questao_id
  ) then
    raise exception 'alternativa nao pertence a questao';
  end if;

  delete from prova_resposta where prova_questao_id = p_prova_questao_id;
  insert into prova_resposta (prova_questao_id, alternativa_id, respondida_em)
  values (p_prova_questao_id, p_alternativa_id, now());
end;
$$;

revoke all on function public.salvar_resposta_prova(uuid, uuid, uuid) from public;
grant execute on function public.salvar_resposta_prova(uuid, uuid, uuid) to authenticated;
