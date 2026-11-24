-- Gestor Online CETADEB
-- Execute no SQL Editor do Supabase (uma vez por projeto).

create extension if not exists pgcrypto;

create type interno_papel as enum ('admin', 'secretaria');
create type interno_status as enum ('ativo', 'inativo');
create type aluno_status as enum ('ativo', 'inativo');
create type matricula_origem as enum ('compra', 'manual');
create type matricula_status as enum ('ativa', 'concluida', 'cancelada');
create type materia_acesso_status as enum ('bloqueada', 'liberada', 'concluida');
create type pedido_status as enum ('pendente', 'pago', 'cancelado', 'recusado');

create sequence numero_aluno_seq start 100001;

create table usuario_interno (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null unique,
  papel interno_papel not null default 'secretaria',
  status interno_status not null default 'ativo',
  data_criacao timestamptz not null default now()
);

create table aluno (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null unique,
  cpf text not null unique,
  data_nascimento date not null,
  telefone text not null default '',
  numero_aluno text not null unique,
  cep text not null default '',
  logradouro text not null default '',
  numero text not null default '',
  complemento text not null default '',
  bairro text not null default '',
  cidade text not null default '',
  uf char(2) not null default '',
  status aluno_status not null default 'ativo',
  data_cadastro timestamptz not null default now()
);

create table materia (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo text not null unique,
  descricao text not null default '',
  carga_horaria integer not null default 0,
  nota_minima numeric(3,1) not null default 7 check (nota_minima >= 0 and nota_minima <= 10),
  ativo boolean not null default true,
  data_criacao timestamptz not null default now()
);

create table aula (
  id uuid primary key default gen_random_uuid(),
  materia_id uuid not null references materia (id) on delete cascade,
  titulo text not null,
  ordem integer not null,
  bunny_video_id text,
  epub_path text,
  epub_nome text,
  unique (materia_id, ordem)
);

create index idx_aula_materia on aula (materia_id);

create table questao (
  id uuid primary key default gen_random_uuid(),
  materia_id uuid not null references materia (id) on delete cascade,
  enunciado text not null,
  ordem integer not null,
  unique (materia_id, ordem)
);

create index idx_questao_materia on questao (materia_id);

create table alternativa (
  id uuid primary key default gen_random_uuid(),
  questao_id uuid not null references questao (id) on delete cascade,
  texto text not null,
  correta boolean not null default false,
  ordem integer not null
);

create index idx_alternativa_questao on alternativa (questao_id);

create table curso (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  descricao text not null default '',
  materias_simultaneas integer not null default 1 check (materias_simultaneas between 1 and 3),
  ativo boolean not null default true,
  data_criacao timestamptz not null default now()
);

create table curso_materia (
  curso_id uuid not null references curso (id) on delete cascade,
  materia_id uuid not null references materia (id),
  ordem integer not null,
  primary key (curso_id, materia_id),
  unique (curso_id, ordem)
);

create table produto (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  descricao text not null default '',
  preco numeric(10,2) not null check (preco >= 0),
  curso_id uuid references curso (id) on delete set null,
  ativo boolean not null default true,
  data_criacao timestamptz not null default now()
);

create index idx_produto_curso on produto (curso_id);

create table produto_variacao (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produto (id) on delete cascade,
  nome text not null,
  preco numeric(10,2) not null check (preco >= 0),
  ordem integer not null default 1,
  ativo boolean not null default true
);

create index idx_variacao_produto on produto_variacao (produto_id);

create table pedido (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references aluno (id) on delete cascade,
  status pedido_status not null default 'pendente',
  valor_total numeric(10,2) not null default 0,
  mp_preference_id text,
  mp_payment_id text,
  data_criacao timestamptz not null default now()
);

create index idx_pedido_aluno on pedido (aluno_id);
create unique index uq_pedido_mp_payment on pedido (mp_payment_id) where mp_payment_id is not null;

create table pedido_item (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedido (id) on delete cascade,
  produto_id uuid references produto (id) on delete set null,
  variacao_id uuid references produto_variacao (id) on delete set null,
  nome text not null,
  preco numeric(10,2) not null,
  curso_id uuid references curso (id) on delete set null
);

create index idx_pedido_item_pedido on pedido_item (pedido_id);

create table matricula (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references aluno (id) on delete cascade,
  curso_id uuid not null references curso (id),
  origem matricula_origem not null,
  pedido_id uuid references pedido (id) on delete set null,
  status matricula_status not null default 'ativa',
  data_criacao timestamptz not null default now()
);

create unique index uq_matricula_aberta on matricula (aluno_id, curso_id) where status <> 'cancelada';
create index idx_matricula_aluno on matricula (aluno_id);

create table matricula_materia (
  id uuid primary key default gen_random_uuid(),
  matricula_id uuid not null references matricula (id) on delete cascade,
  materia_id uuid not null references materia (id),
  ordem integer not null,
  status materia_acesso_status not null default 'bloqueada',
  liberada_em timestamptz,
  concluida_em timestamptz,
  liberacao_manual boolean not null default false,
  unique (matricula_id, materia_id)
);

create index idx_mm_matricula on matricula_materia (matricula_id);

create table tentativa_prova (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references aluno (id) on delete cascade,
  materia_id uuid not null references materia (id),
  matricula_id uuid not null references matricula (id) on delete cascade,
  nota numeric(3,1) not null,
  aprovado boolean not null,
  acertos integer not null,
  total integer not null,
  data_criacao timestamptz not null default now()
);

create index idx_tentativa_aluno on tentativa_prova (aluno_id, materia_id);

create table aula_progresso (
  aluno_id uuid not null references aluno (id) on delete cascade,
  aula_id uuid not null references aula (id) on delete cascade,
  video_concluido boolean not null default false,
  ebook_cfi text,
  atualizado_em timestamptz not null default now(),
  primary key (aluno_id, aula_id)
);

create table documento_emitido (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references aluno (id) on delete cascade,
  tipo text not null,
  informacao text not null default '',
  codigo text not null default '',
  arquivo_path text,
  arquivo_nome text,
  data_emissao date not null default current_date,
  data_criacao timestamptz not null default now()
);

create index idx_documento_aluno on documento_emitido (aluno_id);

create or replace function set_numero_aluno()
returns trigger
language plpgsql
as $$
begin
  if new.numero_aluno is null or btrim(new.numero_aluno) = '' then
    new.numero_aluno := lpad(nextval('numero_aluno_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

create trigger trg_numero_aluno
before insert on aluno
for each row execute function set_numero_aluno();

create or replace function public.is_interno()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from usuario_interno
    where id = auth.uid() and status = 'ativo'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from usuario_interno
    where id = auth.uid() and status = 'ativo' and papel = 'admin'
  );
$$;

create or replace function public.liberar_proximas(p_matricula_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limite integer;
  v_abertas integer;
  v_slots integer;
begin
  select c.materias_simultaneas into v_limite
  from matricula m
  join curso c on c.id = m.curso_id
  where m.id = p_matricula_id;

  if v_limite is null then
    return;
  end if;

  select count(*) into v_abertas
  from matricula_materia
  where matricula_id = p_matricula_id and status = 'liberada';

  v_slots := greatest(v_limite - v_abertas, 0);

  if v_slots > 0 then
    update matricula_materia
    set status = 'liberada', liberada_em = now()
    where id in (
      select id from matricula_materia
      where matricula_id = p_matricula_id and status = 'bloqueada'
      order by ordem
      limit v_slots
    );
  end if;

  if not exists (
    select 1 from matricula_materia
    where matricula_id = p_matricula_id and status in ('bloqueada', 'liberada')
  ) then
    update matricula set status = 'concluida' where id = p_matricula_id;
  end if;
end;
$$;

create or replace function public.criar_matricula(
  p_aluno_id uuid,
  p_curso_id uuid,
  p_origem text,
  p_pedido_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_matricula uuid;
  v_limite integer;
begin
  if auth.uid() is not null and not public.is_interno() then
    raise exception 'sem permissao';
  end if;

  select id into v_matricula
  from matricula
  where aluno_id = p_aluno_id and curso_id = p_curso_id and status <> 'cancelada'
  limit 1;

  if v_matricula is not null then
    return jsonb_build_object('id', v_matricula, 'criada', false);
  end if;

  insert into matricula (aluno_id, curso_id, origem, pedido_id)
  values (p_aluno_id, p_curso_id, p_origem::matricula_origem, p_pedido_id)
  returning id into v_matricula;

  select materias_simultaneas into v_limite from curso where id = p_curso_id;

  insert into matricula_materia (matricula_id, materia_id, ordem, status, liberada_em)
  select
    v_matricula,
    cm.materia_id,
    cm.ordem,
    case when cm.seq <= v_limite then 'liberada'::materia_acesso_status else 'bloqueada'::materia_acesso_status end,
    case when cm.seq <= v_limite then now() else null end
  from (
    select
      materia_id,
      ordem,
      row_number() over (order by ordem) as seq
    from curso_materia
    where curso_id = p_curso_id
  ) cm;

  return jsonb_build_object('id', v_matricula, 'criada', true);
end;
$$;

create or replace function public.liberar_materia(
  p_aluno_id uuid,
  p_curso_id uuid,
  p_materia_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_matricula uuid;
  v_atualizadas integer;
begin
  if not public.is_interno() then
    raise exception 'sem permissao';
  end if;

  if not exists (
    select 1 from curso_materia
    where curso_id = p_curso_id and materia_id = p_materia_id
  ) then
    raise exception 'materia nao pertence ao curso';
  end if;

  select id into v_matricula
  from matricula
  where aluno_id = p_aluno_id and curso_id = p_curso_id and status <> 'cancelada'
  limit 1;

  if v_matricula is null then
    insert into matricula (aluno_id, curso_id, origem)
    values (p_aluno_id, p_curso_id, 'manual')
    returning id into v_matricula;

    insert into matricula_materia (matricula_id, materia_id, ordem, status)
    select v_matricula, cm.materia_id, cm.ordem, 'bloqueada'
    from curso_materia cm
    where cm.curso_id = p_curso_id;
  end if;

  update matricula_materia
  set status = 'liberada',
      liberada_em = coalesce(liberada_em, now()),
      liberacao_manual = true
  where matricula_id = v_matricula
    and materia_id = p_materia_id
    and status = 'bloqueada';

  get diagnostics v_atualizadas = row_count;

  return jsonb_build_object('id', v_matricula, 'liberada', v_atualizadas > 0);
end;
$$;

create or replace function public.questoes_da_materia(p_materia_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
  v_resultado jsonb;
begin
  if auth.uid() is null then
    raise exception 'nao autenticado';
  end if;

  if public.is_interno() then
    v_ok := true;
  else
    select exists (
      select 1
      from matricula_materia mm
      join matricula m on m.id = mm.matricula_id
      where m.aluno_id = auth.uid()
        and mm.materia_id = p_materia_id
        and mm.status in ('liberada', 'concluida')
        and m.status <> 'cancelada'
    ) into v_ok;
  end if;

  if not v_ok then
    raise exception 'materia nao liberada';
  end if;

  select coalesce(jsonb_agg(item order by ordem), '[]'::jsonb)
  into v_resultado
  from (
    select
      q.ordem,
      jsonb_build_object(
        'id', q.id,
        'enunciado', q.enunciado,
        'ordem', q.ordem,
        'alternativas', coalesce((
          select jsonb_agg(
            jsonb_build_object('id', a.id, 'texto', a.texto, 'ordem', a.ordem)
            order by a.ordem
          )
          from alternativa a
          where a.questao_id = q.id
        ), '[]'::jsonb)
      ) as item
    from questao q
    where q.materia_id = p_materia_id
  ) q;

  return v_resultado;
end;
$$;

create or replace function public.submeter_prova(p_materia_id uuid, p_respostas jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aluno uuid := auth.uid();
  v_mm_id uuid;
  v_matricula uuid;
  v_total integer;
  v_acertos integer := 0;
  v_nota numeric(3,1);
  v_min numeric(3,1);
  v_aprovado boolean;
  r jsonb;
  v_alt uuid;
  v_correta boolean;
begin
  if v_aluno is null or public.is_interno() then
    raise exception 'apenas o aluno envia a prova';
  end if;

  select mm.id, mm.matricula_id
  into v_mm_id, v_matricula
  from matricula_materia mm
  join matricula m on m.id = mm.matricula_id
  where m.aluno_id = v_aluno
    and mm.materia_id = p_materia_id
    and mm.status = 'liberada'
    and m.status = 'ativa'
  order by mm.liberada_em desc nulls last
  limit 1;

  if v_mm_id is null then
    raise exception 'materia nao liberada';
  end if;

  select count(*) into v_total from questao where materia_id = p_materia_id;
  if v_total = 0 then
    raise exception 'prova sem questoes';
  end if;

  for r in select value from jsonb_array_elements(coalesce(p_respostas, '[]'::jsonb))
  loop
    v_alt := (r->>'alternativa_id')::uuid;
    select a.correta into v_correta
    from alternativa a
    join questao q on q.id = a.questao_id
    where a.id = v_alt
      and q.id = (r->>'questao_id')::uuid
      and q.materia_id = p_materia_id;
    if v_correta then
      v_acertos := v_acertos + 1;
    end if;
  end loop;

  v_nota := round((v_acertos::numeric / v_total) * 10, 1);
  select nota_minima into v_min from materia where id = p_materia_id;
  v_aprovado := v_nota >= v_min;

  insert into tentativa_prova (aluno_id, materia_id, matricula_id, nota, aprovado, acertos, total)
  values (v_aluno, p_materia_id, v_matricula, v_nota, v_aprovado, v_acertos, v_total);

  if v_aprovado then
    update matricula_materia
    set status = 'concluida', concluida_em = now()
    where id = v_mm_id;
    perform public.liberar_proximas(v_matricula);
  end if;

  return jsonb_build_object(
    'nota', v_nota,
    'aprovado', v_aprovado,
    'acertos', v_acertos,
    'total', v_total
  );
end;
$$;

revoke all on function public.is_interno() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.liberar_proximas(uuid) from public;
revoke all on function public.criar_matricula(uuid, uuid, text, uuid) from public;
revoke all on function public.liberar_materia(uuid, uuid, uuid) from public;
revoke all on function public.questoes_da_materia(uuid) from public;
revoke all on function public.submeter_prova(uuid, jsonb) from public;

grant execute on function public.is_interno() to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.liberar_proximas(uuid) to service_role;
grant execute on function public.criar_matricula(uuid, uuid, text, uuid) to authenticated, service_role;
grant execute on function public.liberar_materia(uuid, uuid, uuid) to authenticated;
grant execute on function public.questoes_da_materia(uuid) to authenticated;
grant execute on function public.submeter_prova(uuid, jsonb) to authenticated;

alter table usuario_interno enable row level security;
alter table aluno enable row level security;
alter table materia enable row level security;
alter table aula enable row level security;
alter table questao enable row level security;
alter table alternativa enable row level security;
alter table curso enable row level security;
alter table curso_materia enable row level security;
alter table produto enable row level security;
alter table produto_variacao enable row level security;
alter table pedido enable row level security;
alter table pedido_item enable row level security;
alter table matricula enable row level security;
alter table matricula_materia enable row level security;
alter table tentativa_prova enable row level security;
alter table aula_progresso enable row level security;
alter table documento_emitido enable row level security;

create policy interno_select on usuario_interno for select to authenticated
using (id = auth.uid() or public.is_admin());
create policy interno_write on usuario_interno for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy aluno_select on aluno for select to authenticated
using (id = auth.uid() or public.is_interno());
create policy aluno_update on aluno for update to authenticated
using (id = auth.uid() or public.is_interno())
with check (id = auth.uid() or public.is_interno());
create policy aluno_insert on aluno for insert to authenticated
with check (id = auth.uid() or public.is_interno());

create policy materia_select on materia for select
using (ativo or public.is_interno());
create policy materia_write on materia for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy aula_select on aula for select to authenticated
using (
  public.is_interno()
  or exists (
    select 1
    from matricula_materia mm
    join matricula m on m.id = mm.matricula_id
    where mm.materia_id = aula.materia_id
      and m.aluno_id = auth.uid()
      and mm.status in ('liberada', 'concluida')
      and m.status <> 'cancelada'
  )
);
create policy aula_write on aula for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy questao_select on questao for select to authenticated
using (public.is_interno());
create policy questao_write on questao for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy alternativa_select on alternativa for select to authenticated
using (public.is_interno());
create policy alternativa_write on alternativa for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy curso_select on curso for select
using (ativo or public.is_interno());
create policy curso_write on curso for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy curso_materia_select on curso_materia for select
using (
  public.is_interno()
  or exists (select 1 from curso c where c.id = curso_materia.curso_id and c.ativo)
);
create policy curso_materia_write on curso_materia for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy produto_select on produto for select
using (ativo or public.is_interno());
create policy produto_write on produto for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy variacao_select on produto_variacao for select
using (
  public.is_interno()
  or (
    ativo and exists (
      select 1 from produto p where p.id = produto_variacao.produto_id and p.ativo
    )
  )
);
create policy variacao_write on produto_variacao for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy pedido_select on pedido for select to authenticated
using (aluno_id = auth.uid() or public.is_interno());
create policy pedido_insert on pedido for insert to authenticated
with check (aluno_id = auth.uid());

create policy pedido_item_select on pedido_item for select to authenticated
using (
  exists (
    select 1 from pedido p
    where p.id = pedido_item.pedido_id
      and (p.aluno_id = auth.uid() or public.is_interno())
  )
);
create policy pedido_item_insert on pedido_item for insert to authenticated
with check (
  exists (
    select 1 from pedido p
    where p.id = pedido_item.pedido_id
      and p.aluno_id = auth.uid()
      and p.status = 'pendente'
  )
);

create policy matricula_select on matricula for select to authenticated
using (aluno_id = auth.uid() or public.is_interno());

create policy mm_select on matricula_materia for select to authenticated
using (
  public.is_interno()
  or exists (
    select 1 from matricula m
    where m.id = matricula_materia.matricula_id and m.aluno_id = auth.uid()
  )
);

create policy tentativa_select on tentativa_prova for select to authenticated
using (aluno_id = auth.uid() or public.is_interno());

create policy progresso_select on aula_progresso for select to authenticated
using (aluno_id = auth.uid() or public.is_interno());
create policy progresso_write on aula_progresso for all to authenticated
using (aluno_id = auth.uid() or public.is_interno())
with check (aluno_id = auth.uid());

create policy documento_select on documento_emitido for select to authenticated
using (aluno_id = auth.uid() or public.is_interno());
create policy documento_write on documento_emitido for all to authenticated
using (public.is_interno()) with check (public.is_interno());

insert into storage.buckets (id, name, public)
values ('ebooks', 'ebooks', false), ('documentos', 'documentos', false)
on conflict (id) do nothing;

-- Primeiro administrador:
-- 1. No Supabase, em Authentication, crie o usuário com e-mail e senha.
-- 2. Copie o UUID e rode, trocando os valores:
-- insert into public.usuario_interno (id, nome, email, papel)
-- values ('00000000-0000-0000-0000-000000000000', 'Administrador', 'admin@cetadeb.com.br', 'admin');
