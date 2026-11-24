-- Campos e observações da ficha do aluno na secretaria.

alter table aluno add column if not exists atendente text not null default '';
alter table aluno add column if not exists indicador text not null default '';

create table if not exists observacao_aluno (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references aluno (id) on delete cascade,
  texto text not null,
  autor_nome text not null,
  destaque boolean not null default false,
  data_criacao timestamptz not null default now()
);

create index if not exists idx_observacao_aluno on observacao_aluno (aluno_id);

alter table observacao_aluno enable row level security;

drop policy if exists observacao_interna on observacao_aluno;
create policy observacao_interna on observacao_aluno
for all to authenticated
using (public.is_interno())
with check (public.is_interno());
