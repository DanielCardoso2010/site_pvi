-- =========================================================
-- QuestãoCerta — banco de dados (Supabase / PostgreSQL)
--
-- Como usar: Supabase > SQL Editor > New query > cole TUDO > Run.
-- Pode rodar de novo sem problemas (não apaga dados).
--
-- Regras de acesso (RLS) — quem pode o quê:
--   questionários e matérias : qualquer pessoa LOGADA vê todos;
--                              só quem criou pode editar ou excluir.
--   perfil                   : cada pessoa vê e edita só o seu;
--                              os outros veem apenas o nome (view perfis_publicos).
--   salvos e histórico       : privados de cada pessoa.
-- =========================================================

-- ---------- Perfis ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nome        text not null check (char_length(nome) between 1 and 60),
  curso       text not null default '' check (char_length(curso) <= 80),
  instituicao text not null default '' check (char_length(instituicao) <= 80),
  objetivo    text not null default '' check (char_length(objetivo) <= 80),
  meta_diaria int  not null default 10 check (meta_diaria between 1 and 500),
  foto        text not null default '' check (char_length(foto) <= 200000),
  criado_em   timestamptz not null default now()
);

-- Cria o perfil automaticamente quando alguém cria a conta
-- (os dados vêm do formulário de cadastro, em raw_user_meta_data).
create or replace function public.criar_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, curso, instituicao, objetivo)
  values (
    new.id,
    left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1), 'Usuário'), 60),
    left(coalesce(new.raw_user_meta_data ->> 'curso', ''), 80),
    left(coalesce(new.raw_user_meta_data ->> 'instituicao', ''), 80),
    left(coalesce(new.raw_user_meta_data ->> 'objetivo', ''), 80)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil();

-- Nome público (para mostrar "criado por ..."). Não expõe curso, foto etc.
create or replace view public.perfis_publicos as
  select id, nome from public.profiles;

-- ---------- Matérias (compartilhadas) ----------
create table if not exists public.materias (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null check (char_length(btrim(nome)) between 1 and 40),
  descricao  text not null default '' check (char_length(descricao) <= 140),
  cor        text not null default '#4f46e5' check (cor ~ '^#[0-9a-fA-F]{6}$'),
  criado_por uuid default auth.uid() references auth.users (id) on delete set null,
  criado_em  timestamptz not null default now()
);
create unique index if not exists materias_nome_unico on public.materias (lower(btrim(nome)));

-- ---------- Questionários (compartilhados) ----------
create table if not exists public.questionarios (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null check (char_length(btrim(titulo)) between 1 and 80),
  materia_id    uuid not null references public.materias (id) on delete restrict,
  dificuldade   text not null default 'Médio' check (dificuldade in ('Fácil', 'Médio', 'Difícil')),
  descricao     text not null default '' check (char_length(descricao) <= 140),
  tempo         int  not null default 10 check (tempo between 1 and 600),
  questoes      jsonb not null check (
                  jsonb_typeof(questoes) = 'array'
                  and jsonb_array_length(questoes) between 1 and 200
                  and octet_length(questoes::text) <= 500000),
  criado_por    uuid default auth.uid() references auth.users (id) on delete set null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists questionarios_materia_idx on public.questionarios (materia_id);
create index if not exists questionarios_autor_idx on public.questionarios (criado_por);

-- ---------- Salvos (privado) ----------
create table if not exists public.salvos (
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  questionario_id uuid not null references public.questionarios (id) on delete cascade,
  criado_em       timestamptz not null default now(),
  primary key (user_id, questionario_id)
);

-- ---------- Histórico de respostas (privado) ----------
create table if not exists public.tentativas (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  questionario_id uuid references public.questionarios (id) on delete set null,
  titulo          text not null check (char_length(titulo) <= 80),
  materia         text not null default '' check (char_length(materia) <= 40),
  dificuldade     text not null default 'Médio' check (dificuldade in ('Fácil', 'Médio', 'Difícil')),
  data            timestamptz not null default now(),
  acertos         int not null check (acertos >= 0),
  total           int not null check (total > 0),
  segundos        int not null default 0 check (segundos >= 0),
  respostas       jsonb not null default '[]'::jsonb,
  check (acertos <= total)
);
create index if not exists tentativas_usuario_idx on public.tentativas (user_id, data);

-- ---------- Segurança por linha (RLS) ----------
alter table public.profiles      enable row level security;
alter table public.materias      enable row level security;
alter table public.questionarios enable row level security;
alter table public.salvos        enable row level security;
alter table public.tentativas    enable row level security;

-- perfis: só o próprio
drop policy if exists "perfil: ver o meu"     on public.profiles;
drop policy if exists "perfil: criar o meu"   on public.profiles;
drop policy if exists "perfil: editar o meu"  on public.profiles;
create policy "perfil: ver o meu"    on public.profiles for select to authenticated using (id = auth.uid());
create policy "perfil: criar o meu"  on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "perfil: editar o meu" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- matérias: todos veem; só o criador altera
drop policy if exists "materias: todos veem"        on public.materias;
drop policy if exists "materias: criar"             on public.materias;
drop policy if exists "materias: criador edita"     on public.materias;
drop policy if exists "materias: criador exclui"    on public.materias;
create policy "materias: todos veem"     on public.materias for select to authenticated using (true);
create policy "materias: criar"          on public.materias for insert to authenticated with check (criado_por = auth.uid());
create policy "materias: criador edita"  on public.materias for update to authenticated using (criado_por = auth.uid()) with check (criado_por = auth.uid());
create policy "materias: criador exclui" on public.materias for delete to authenticated using (criado_por = auth.uid());

-- questionários: todos veem; só o criador altera
drop policy if exists "questionarios: todos veem"     on public.questionarios;
drop policy if exists "questionarios: criar"          on public.questionarios;
drop policy if exists "questionarios: criador edita"  on public.questionarios;
drop policy if exists "questionarios: criador exclui" on public.questionarios;
create policy "questionarios: todos veem"     on public.questionarios for select to authenticated using (true);
create policy "questionarios: criar"          on public.questionarios for insert to authenticated with check (criado_por = auth.uid());
create policy "questionarios: criador edita"  on public.questionarios for update to authenticated using (criado_por = auth.uid()) with check (criado_por = auth.uid());
create policy "questionarios: criador exclui" on public.questionarios for delete to authenticated using (criado_por = auth.uid());

-- salvos e histórico: só o próprio
drop policy if exists "salvos: ver os meus"      on public.salvos;
drop policy if exists "salvos: salvar"           on public.salvos;
drop policy if exists "salvos: remover os meus"  on public.salvos;
create policy "salvos: ver os meus"     on public.salvos for select to authenticated using (user_id = auth.uid());
create policy "salvos: salvar"          on public.salvos for insert to authenticated with check (user_id = auth.uid());
create policy "salvos: remover os meus" on public.salvos for delete to authenticated using (user_id = auth.uid());

drop policy if exists "tentativas: ver as minhas"     on public.tentativas;
drop policy if exists "tentativas: registrar"         on public.tentativas;
drop policy if exists "tentativas: apagar as minhas"  on public.tentativas;
create policy "tentativas: ver as minhas"    on public.tentativas for select to authenticated using (user_id = auth.uid());
create policy "tentativas: registrar"        on public.tentativas for insert to authenticated with check (user_id = auth.uid());
create policy "tentativas: apagar as minhas" on public.tentativas for delete to authenticated using (user_id = auth.uid());

-- ---------- Permissões das tabelas ----------
-- Visitantes sem login (anon) não acessam nada.
revoke all on public.profiles, public.materias, public.questionarios, public.salvos, public.tentativas from anon;
revoke all on public.perfis_publicos from anon;
grant select, insert, update          on public.profiles      to authenticated;
grant select, insert, update, delete  on public.materias      to authenticated;
grant select, insert, update, delete  on public.questionarios to authenticated;
grant select, insert, delete          on public.salvos        to authenticated;
grant select, insert, delete          on public.tentativas    to authenticated;
grant select                          on public.perfis_publicos to authenticated;

-- ---------- Excluir a própria conta ----------
-- Apaga a conta e o que é privado (perfil, salvos, histórico).
-- Questionários e matérias criados continuam no ar, sem autor.
create or replace function public.excluir_minha_conta()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'É preciso estar logado.';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.excluir_minha_conta() from public, anon;
grant execute on function public.excluir_minha_conta() to authenticated;
