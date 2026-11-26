alter table materia add column if not exists escola_dominical boolean not null default false;

create unique index if not exists uq_materia_escola_dominical
  on materia (escola_dominical)
  where escola_dominical;

alter table ebd_licao add column if not exists materia_id uuid references materia (id) on delete cascade;

do $$
declare
  materia_ebd uuid;
  produto_ebd uuid;
begin
  select id into materia_ebd from materia where escola_dominical limit 1;
  select id into produto_ebd from produto where escola_dominical limit 1;

  if materia_ebd is null and produto_ebd is not null then
    insert into materia (nome, slug, descricao, escola_dominical, ordem)
    values ('Escola Bíblica Dominical', 'EBD', 'Material gratuito para todos os alunos.', true, 0)
    returning id into materia_ebd;
  end if;

  if materia_ebd is not null then
    update ebd_licao
    set materia_id = materia_ebd
    where materia_id is null
      and produto_id = produto_ebd;
  end if;
end $$;

delete from ebd_licao where materia_id is null;

alter table ebd_licao drop constraint if exists ebd_licao_produto_id_ordem_key;
alter table ebd_licao drop column if exists produto_id;
alter table ebd_licao alter column materia_id set not null;
alter table ebd_licao drop constraint if exists ebd_licao_materia_id_ordem_key;
alter table ebd_licao add constraint ebd_licao_materia_id_ordem_key unique (materia_id, ordem);

alter table produto drop column if exists escola_dominical;
