drop trigger if exists trg_questionario_codigo on questionario;
drop function if exists public.fn_questionario_codigo();
drop function if exists public.fn_gerar_codigo_questionario();
alter table questionario drop constraint if exists questionario_codigo_formato;
drop index if exists questionario_codigo_uidx;
alter table questionario drop column if exists codigo;

alter table prova_andamento add column if not exists codigo text;

alter table prova_andamento drop constraint if exists prova_andamento_codigo_formato;
alter table prova_andamento add constraint prova_andamento_codigo_formato
  check (codigo is null or codigo ~ '^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$');

create unique index if not exists prova_andamento_codigo_uidx
  on prova_andamento (codigo)
  where codigo is not null;

create or replace function public.fn_gerar_codigo_prova()
returns text
language plpgsql
as $$
declare
  alfabeto constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  gerado text;
  i int;
  pos int;
begin
  loop
    gerado := '';
    for i in 1..12 loop
      pos := 1 + floor(random() * length(alfabeto))::int;
      gerado := gerado || substr(alfabeto, pos, 1);
      if i in (4, 8) then
        gerado := gerado || '-';
      end if;
    end loop;
    exit when not exists (select 1 from prova_andamento where codigo = gerado);
  end loop;
  return gerado;
end;
$$;

create or replace function public.fn_prova_andamento_codigo()
returns trigger
language plpgsql
as $$
begin
  if new.codigo is null or btrim(new.codigo) = '' then
    new.codigo := public.fn_gerar_codigo_prova();
  end if;
  new.codigo := upper(new.codigo);
  return new;
end;
$$;

drop trigger if exists trg_prova_andamento_codigo on prova_andamento;
create trigger trg_prova_andamento_codigo
  before insert on prova_andamento
  for each row
  execute function public.fn_prova_andamento_codigo();

update prova_andamento
set codigo = public.fn_gerar_codigo_prova()
where codigo is null;
