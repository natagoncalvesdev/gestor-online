alter table matricula_materia add column if not exists conclusao_manual boolean not null default false;

create or replace function public.marcar_progresso_materia_completo(
  p_aluno_id uuid,
  p_materia_id uuid,
  p_matricula_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into aula_progresso (aluno_id, aula_id, video_concluido, atualizado_em)
  select p_aluno_id, a.id, true, now()
  from aula a
  where a.materia_id = p_materia_id
  on conflict (aluno_id, aula_id) do update
    set video_concluido = true, atualizado_em = now();

  insert into topico_progresso (aluno_id, topico_id, video_concluido, atualizado_em)
  select p_aluno_id, t.id, true, now()
  from topico t
  join aula a on a.id = t.aula_id
  where a.materia_id = p_materia_id
  on conflict (aluno_id, topico_id) do update
    set video_concluido = true, atualizado_em = now();
end;
$$;

create or replace function public.concluir_materia_matricula(
  p_aluno_id uuid,
  p_matricula_materia_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_matricula uuid;
  v_materia_id uuid;
  v_atualizadas integer;
begin
  if not public.is_interno() then
    raise exception 'sem permissao';
  end if;

  select m.id, mm.materia_id into v_matricula, v_materia_id
  from matricula_materia mm
  join matricula m on m.id = mm.matricula_id
  where mm.id = p_matricula_materia_id
    and m.aluno_id = p_aluno_id
    and m.status = 'ativa'
  limit 1;

  if v_matricula is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_encontrada');
  end if;

  perform public.marcar_progresso_materia_completo(p_aluno_id, v_materia_id, v_matricula);

  update matricula_materia
  set status = 'concluida',
      concluida_em = now(),
      conclusao_manual = true
  where id = p_matricula_materia_id
    and matricula_id = v_matricula
    and status = 'liberada';

  get diagnostics v_atualizadas = row_count;
  if v_atualizadas = 0 then
    return jsonb_build_object('ok', false, 'motivo', 'nao_liberada');
  end if;

  perform public.liberar_proximas(v_matricula);
  return jsonb_build_object('ok', true);
end;
$$;

update matricula_materia mm
set conclusao_manual = true
where mm.status = 'concluida'
  and mm.conclusao_manual = false
  and not exists (
    select 1
    from tentativa_prova t
    where t.matricula_id = mm.matricula_id
      and t.materia_id = mm.materia_id
      and t.data_criacao < mm.concluida_em - interval '10 seconds'
  );

delete from tentativa_prova t
using matricula_materia mm
where t.matricula_id = mm.matricula_id
  and t.materia_id = mm.materia_id
  and mm.conclusao_manual = true;