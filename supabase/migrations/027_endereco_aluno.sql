create table if not exists endereco_aluno (
  aluno_id uuid primary key references aluno (id) on delete cascade,
  cep text not null default '',
  logradouro text not null default '',
  numero text not null default '',
  complemento text not null default '',
  bairro text not null default '',
  cidade text not null default '',
  uf char(2) not null default ''
);

insert into endereco_aluno (aluno_id, cep, logradouro, numero, complemento, bairro, cidade, uf)
select id, cep, logradouro, numero, complemento, bairro, cidade, uf
from aluno
on conflict (aluno_id) do nothing;

alter table aluno
  drop column if exists cep,
  drop column if exists logradouro,
  drop column if exists numero,
  drop column if exists complemento,
  drop column if exists bairro,
  drop column if exists cidade,
  drop column if exists uf;

create or replace function criar_endereco_aluno()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into endereco_aluno (aluno_id)
  values (new.id)
  on conflict (aluno_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_endereco_aluno on aluno;
create trigger trg_endereco_aluno
after insert on aluno
for each row execute function criar_endereco_aluno();

alter table endereco_aluno enable row level security;

create policy endereco_aluno_select on endereco_aluno for select to authenticated
using (aluno_id = auth.uid() or public.is_interno());

create policy endereco_aluno_insert on endereco_aluno for insert to authenticated
with check (aluno_id = auth.uid() or public.is_interno());

create policy endereco_aluno_update on endereco_aluno for update to authenticated
using (aluno_id = auth.uid() or public.is_interno())
with check (aluno_id = auth.uid() or public.is_interno());