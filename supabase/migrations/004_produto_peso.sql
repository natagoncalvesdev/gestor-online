alter table produto add column if not exists peso_gramas integer not null default 0 check (peso_gramas >= 0);
