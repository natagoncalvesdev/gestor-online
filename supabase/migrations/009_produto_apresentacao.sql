alter table produto add column if not exists imagem_path text;
alter table produto add column if not exists apresentacao text not null default '';

insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', true)
on conflict (id) do nothing;
