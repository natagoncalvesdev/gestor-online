alter table produto add column if not exists imagem_zoom numeric(4, 2) not null default 1;
alter table produto add column if not exists imagem_x numeric(6, 2) not null default 0;
alter table produto add column if not exists imagem_y numeric(6, 2) not null default 0;

alter table produto drop constraint if exists produto_imagem_zoom_check;
alter table produto add constraint produto_imagem_zoom_check check (imagem_zoom >= 1 and imagem_zoom <= 3);
