alter table materia rename column codigo to slug;

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'materia_codigo_key') then
    alter table materia rename constraint materia_codigo_key to materia_slug_key;
  end if;
end $$;

comment on column materia.slug is 'Identificador público da matéria.';
