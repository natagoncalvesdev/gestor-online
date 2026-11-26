create or replace function public.concluir_materia_se_conteudo_e_prova(
  p_aluno_id uuid,
  p_materia_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mm_id uuid;
  v_matricula uuid;
  v_questionario uuid;
  v_aulas integer;
  v_feitas integer;
  v_prova boolean := false;
  v_atualizadas integer;
begin
  if p_aluno_id is null or p_materia_id is null then
    return false;
  end if;

  select count(*) into v_aulas
  from aula
  where materia_id = p_materia_id;
  if coalesce(v_aulas, 0) = 0 then
    return false;
  end if;

  select count(*) into v_feitas
  from aula a
  join aula_progresso ap on ap.aula_id = a.id
  where a.materia_id = p_materia_id
    and ap.aluno_id = p_aluno_id
    and ap.video_concluido;
  if v_feitas < v_aulas then
    return false;
  end if;

  select id into v_questionario
  from questionario
  where materia_id = p_materia_id
    and encerra_materia
  order by posicao
  limit 1;
  if v_questionario is null then
    return false;
  end if;

  select exists (
    select 1
    from prova_andamento
    where aluno_id = p_aluno_id
      and questionario_id = v_questionario
      and entregue_em is not null
  ) or exists (
    select 1
    from tentativa_prova
    where aluno_id = p_aluno_id
      and questionario_id = v_questionario
  ) into v_prova;
  if not v_prova then
    return false;
  end if;

  select mm.id, mm.matricula_id
  into v_mm_id, v_matricula
  from matricula_materia mm
  join matricula m on m.id = mm.matricula_id
  where m.aluno_id = p_aluno_id
    and mm.materia_id = p_materia_id
    and mm.status = 'liberada'
    and m.status = 'ativa'
  order by mm.liberada_em desc nulls last
  limit 1;

  if v_mm_id is null then
    return false;
  end if;

  update matricula_materia
  set status = 'concluida',
      concluida_em = now(),
      conclusao_manual = false
  where id = v_mm_id
    and status = 'liberada';
  get diagnostics v_atualizadas = row_count;
  if v_atualizadas = 0 then
    return false;
  end if;

  perform public.liberar_proximas(v_matricula);
  return true;
end;
$$;

revoke all on function public.concluir_materia_se_conteudo_e_prova(uuid, uuid) from public;
grant execute on function public.concluir_materia_se_conteudo_e_prova(uuid, uuid) to authenticated, service_role;

create or replace function public.fn_aula_progresso_tenta_concluir_materia()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_materia uuid;
begin
  if not new.video_concluido then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.video_concluido then
    return new;
  end if;
  select materia_id into v_materia from aula where id = new.aula_id;
  if v_materia is not null then
    perform public.concluir_materia_se_conteudo_e_prova(new.aluno_id, v_materia);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_aula_progresso_tenta_concluir_materia on aula_progresso;
create trigger trg_aula_progresso_tenta_concluir_materia
  after insert or update of video_concluido on aula_progresso
  for each row
  execute function public.fn_aula_progresso_tenta_concluir_materia();
