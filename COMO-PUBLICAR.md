# Como colocar o QuestãoCerta no ar (GitHub + Supabase)

Tempo: cerca de 20 minutos. Tudo grátis. Você vai usar duas contas: **Supabase** (guarda contas e
questionários) e **GitHub** (hospeda o site).

---

## Parte 1 — Supabase (o servidor)

1. Entre em **supabase.com**, crie uma conta e clique em **New project**.
   Escolha um nome, anote a senha do banco em lugar seguro e escolha a região mais próxima (ex.: *South America*).
   Aguarde o projeto ficar pronto (1–2 min).

2. Menu **SQL Editor** → **New query** → abra o arquivo `banco/schema.sql`, copie **tudo**, cole e clique **Run**.
   Deve aparecer "Success". (Pode rodar de novo sem problema.)

3. Menu **Authentication → Providers → Email**: confira que está ligado e decida:
   - **Confirm email DESLIGADO** (recomendado para grupos pequenos): a pessoa cria a conta e já entra.
   - **Confirm email LIGADO**: a pessoa precisa clicar num link recebido por e-mail.
     ⚠️ O envio de e-mails padrão do Supabase é **muito limitado** (poucos e-mails por hora). Com várias
     pessoas se cadastrando, vai travar. Para isso funcionar bem é preciso configurar um provedor de
     e-mail próprio (Project Settings → Authentication → SMTP). A recuperação de senha usa o mesmo envio.

4. Menu **Project Settings → API**. Copie dois valores:
   - **Project URL** (algo como `https://abcdefgh.supabase.co`)
   - **anon public** key (um texto longo começando com `eyJ...`)

   ⚠️ **Nunca** use a chave `service_role`: essa é secreta e dá acesso total.

---

## Parte 2 — GitHub (o site)

1. Em **github.com**, crie uma conta e um repositório **público** (ex.: `questaocerta`).
2. Envie os arquivos para o repositório: **Add file → Upload files** e arraste **o conteúdo da pasta**
   (para que `index.html` fique na raiz do repositório, junto das pastas `html`, `css`, `js`, `banco`).
   Confirme com **Commit changes**.
3. Abra o arquivo `js/config.js` no GitHub, clique no lápis (editar) e troque:
   ```js
   SUPABASE_URL: "https://abcdefgh.supabase.co",
   SUPABASE_ANON_KEY: "eyJ...sua chave anon public...",
   ```
   Clique **Commit changes**.
4. Vá em **Settings → Pages**. Em *Build and deployment*, escolha **Deploy from a branch**,
   branch **main**, pasta **/ (root)** e salve.
5. Espere 1–2 minutos. O endereço aparece no topo da página, no formato
   `https://SEU-USUARIO.github.io/questaocerta/`.

---

## Parte 3 — Voltar ao Supabase (liberar o endereço)

Menu **Authentication → URL Configuration**:
- **Site URL**: `https://SEU-USUARIO.github.io/questaocerta/`
- **Redirect URLs** → *Add URL*: `https://SEU-USUARIO.github.io/questaocerta/**`

Sem isso, os links de e-mail (confirmar conta, "esqueci minha senha") não voltam para o seu site.

---

## Parte 4 — Testar

1. Abra o endereço do site e **crie uma conta**.
2. Publique um questionário.
3. Abra o site em **outro navegador** (ou aba anônima), crie **outra conta**: o questionário da primeira
   conta deve aparecer, com o nome de quem criou, e **sem** os botões de editar/excluir.
4. Compartilhe o endereço com quem quiser usar. Quem entrar vê os questionários de todo mundo.

---

## Quero trazer os questionários que fiz na versão antiga

Na versão antiga do site (a que guardava tudo só no navegador): **Configurações → Exportar backup**.
Na versão nova, já logado: **Configurações → Meus dados → Importar questionários** e escolha o arquivo.
Eles passam a ser seus e ficam visíveis para todas as contas.

---

## Boa prática e limites (leia)

- **A chave `anon` pode ficar no GitHub.** Ela é pública por design; quem protege os dados são as regras
  do banco (`schema.sql`). Já a `service_role` nunca pode ir para o repositório.
- **Qualquer pessoa pode criar conta e publicar.** Não há moderação: quem criou um questionário pode apagá-lo,
  mas você (dono do projeto) é quem remove conteúdo indevido, pelo painel do Supabase (**Table Editor**).
  Se quiser um grupo fechado, desligue novos cadastros em *Authentication → Sign In / Providers*
  (“Allow new users to sign up”) e convide as pessoas pelo painel.
- **O plano grátis do Supabase pausa o projeto após cerca de 1 semana sem uso.** Entre no painel e clique em
  *Restore* para reativar; os dados são mantidos. Não conte com backups automáticos no plano grátis:
  cada pessoa pode usar **Exportar backup** em Configurações.
- **Atualizar o site**: edite os arquivos no GitHub e dê *Commit*; o Pages republica sozinho.
- Para testar no seu computador, sirva a pasta com um servidor local (ex.: `python3 -m http.server`) e abra
  `http://localhost:8000/`. Abrir o `index.html` direto (file://) até funciona para entrar, mas os links de e-mail não.
