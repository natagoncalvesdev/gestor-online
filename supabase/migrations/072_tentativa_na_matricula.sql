create or replace function public.criar_tentativa_prova_na_matricula(
  p_aluno_id uuid,
  p_matricula_id uuid,
  p_materia_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_questionario uuid;
begin
  if p_aluno_id is null or p_matricula_id is null or p_materia_id is null then
    return;
  end if;

  select id into v_questionario
  from questionario
  where materia_id = p_materia_id
    and encerra_materia
  order by posicao
  limit 1;
  if v_questionario is null then
    return;
  end if;

  if exists (
    select 1
    from tentativa_prova
    where aluno_id = p_aluno_id
      and matricula_id = p_matricula_id
      and materia_id = p_materia_id
  ) then
    return;
  end if;

  if exists (
    select 1
    from tentativa_prova
    where aluno_id = p_aluno_id
      and questionario_id = v_questionario
      and entregue_em is null
  ) then
    return;
  end if;

  insert into tentativa_prova (aluno_id, materia_id, matricula_id, questionario_id)
  values (p_aluno_id, p_materia_id, p_matricula_id, v_questionario);
end;
$$;

create or replace function public.fn_matricula_materia_cria_tentativa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aluno uuid;
begin
  if new.status = 'desmatriculada' then
    return new;
  end if;
  select aluno_id into v_aluno from matricula where id = new.matricula_id;
  perform public.criar_tentativa_prova_na_matricula(v_aluno, new.matricula_id, new.materia_id);
  return new;
end;
$$;

drop trigger if exists trg_matricula_materia_cria_tentativa on matricula_materia;
create trigger trg_matricula_materia_cria_tentativa
  after insert or update of status on matricula_materia
  for each row
  execute function public.fn_matricula_materia_cria_tentativa();

insert into tentativa_prova (aluno_id, materia_id, matricula_id, questionario_id)
select m.aluno_id, mm.materia_id, mm.matricula_id, q.id
from matricula_materia mm
join matricula m on m.id = mm.matricula_id
join lateral (
  select id
  from questionario
  where materia_id = mm.materia_id
    and encerra_materia
  order by posicao
  limit 1
) q on true
where mm.status <> 'desmatriculada'
  and m.status <> 'cancelada'
  and not exists (
    select 1
    from tentativa_prova t
    where t.aluno_id = m.aluno_id
      and t.matricula_id = mm.matricula_id
      and t.materia_id = mm.materia_id
  )
  and not exists (
    select 1
    from tentativa_prova t
    where t.aluno_id = m.aluno_id
      and t.questionario_id = q.id
      and t.entregue_em is null
  );
