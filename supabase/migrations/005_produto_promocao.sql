alter table produto add column if not exists preco_promocional numeric(10,2) check (preco_promocional is null or preco_promocional >= 0);
alter table produto add column if not exists promocao_ate date;
