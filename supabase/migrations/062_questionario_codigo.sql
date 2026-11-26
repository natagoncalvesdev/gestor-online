alter table questionario add column if not exists codigo text;

alter table questionario drop constraint if exists questionario_codigo_formato;
alter table questionario add constraint questionario_codigo_formato
  check (codigo is null or codigo ~ '^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$');

create unique index if not exists questionario_codigo_uidx
  on questionario (codigo)
  where codigo is not null;

create or replace function public.fn_gerar_codigo_questionario()
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
    exit when not exists (select 1 from questionario where codigo = gerado);
  end loop;
  return gerado;
end;
$$;

create or replace function public.fn_questionario_codigo()
returns trigger
language plpgsql
as $$
begin
  if new.codigo is null or btrim(new.codigo) = '' then
    new.codigo := public.fn_gerar_codigo_questionario();
  end if;
  new.codigo := upper(new.codigo);
  return new;
end;
$$;

drop trigger if exists trg_questionario_codigo on questionario;
create trigger trg_questionario_codigo
  before insert on questionario
  for each row
  execute function public.fn_questionario_codigo();

update questionario
set codigo = public.fn_gerar_codigo_questionario()
where codigo is null;
