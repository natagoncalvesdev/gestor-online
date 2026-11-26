alter table matricula_materia
  add column if not exists prova_nova_tentativa boolean not null default false;
