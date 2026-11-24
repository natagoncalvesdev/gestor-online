create table if not exists home_integracao (
  id int primary key default 1 check (id = 1),
  google_api_key text not null default '',
  google_place_id text not null default '',
  instagram_token text not null default ''
);

insert into home_integracao (id)
values (1)
on conflict (id) do nothing;

alter table home_integracao enable row level security;

create policy home_integracao_select on home_integracao for select to authenticated
using (public.is_admin());
create policy home_integracao_write on home_integracao for all to authenticated
using (public.is_admin()) with check (public.is_admin());
