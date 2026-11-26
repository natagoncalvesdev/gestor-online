create or replace function public.fn_prova_andamento_conclui_conteudo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_materia uuid;
  v_matricula uuid;
begin
  if old.entregue_em is not null or new.entregue_em is null then
    return new;
  end if;

  select q.materia_id into v_materia
  from questionario q
  where q.id = new.questionario_id;

  if v_materia is null then
    return new;
  end if;

  select mm.matricula_id into v_matricula
  from matricula_materia mm
  join matricula m on m.id = mm.matricula_id
  where m.aluno_id = new.aluno_id
    and mm.materia_id = v_materia
    and mm.status in ('liberada', 'concluida')
    and m.status = 'ativa'
  order by case when mm.status = 'liberada' then 0 else 1 end, mm.liberada_em desc nulls last
  limit 1;

  perform public.marcar_progresso_materia_completo(new.aluno_id, v_materia, coalesce(v_matricula, new.aluno_id));
  return new;
end;
$$;

drop trigger if exists trg_prova_andamento_conclui_conteudo on prova_andamento;
create trigger trg_prova_andamento_conclui_conteudo
  after update of entregue_em on prova_andamento
  for each row
  execute function public.fn_prova_andamento_conclui_conteudo();

insert into aula_progresso (aluno_id, aula_id, video_concluido, atualizado_em)
select pa.aluno_id, a.id, true, now()
from prova_andamento pa
join questionario q on q.id = pa.questionario_id
join aula a on a.materia_id = q.materia_id
where pa.entregue_em is not null
on conflict (aluno_id, aula_id) do update
  set video_concluido = true, atualizado_em = now();

insert into topico_progresso (aluno_id, topico_id, video_concluido, atualizado_em)
select pa.aluno_id, t.id, true, now()
from prova_andamento pa
join questionario q on q.id = pa.questionario_id
join aula a on a.materia_id = q.materia_id
join topico t on t.aula_id = a.id
where pa.entregue_em is not null
on conflict (aluno_id, topico_id) do update
  set video_concluido = true, atualizado_em = now();
