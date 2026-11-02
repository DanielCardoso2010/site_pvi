/* =========================================================
   QuestãoCerta — contas de usuário (Supabase Auth)
   Cadastro, login, sessão, recuperação e troca de senha/e-mail.

   As senhas NÃO ficam no navegador nem neste código: o Supabase
   guarda tudo no servidor. Aqui só enviamos e recebemos pedidos.
   ========================================================= */

const Auth = (() => {
  "use strict";

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const MSG_EMAIL = "Esse e-mail não parece válido. Confira se tem @ e um domínio.";

  let atual = null;          // { id, email, criadoEm } da pessoa logada
  let recuperando = false;   // chegou por um link de "esqueci minha senha"

  const sb = () => Api.sb;
  const normalizarEmail = (e) => String(e || "").trim().toLowerCase();
  /** Endereço da própria página (sem o #), para onde os links dos e-mails devolvem. */
  const base = () => location.origin + location.pathname;
  const publico = (u) => (u ? { id: u.id, email: u.email || "", criadoEm: Date.parse(u.created_at) || Date.now() } : null);

  function validarSenha(senha) {
    if (senha.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
    if (senha.length > 72) return "A senha pode ter no máximo 72 caracteres.";
    if (!/[A-Za-zÀ-ÿ]/.test(senha) || !/\d/.test(senha)) return "Use letras e números na senha.";
    return "";
  }

  /** Reabre a sessão guardada no navegador (e trata links de e-mail). */
  async function iniciar() {
    // registrar o ouvinte ANTES de getSession para não perder o evento de recuperação
    sb().auth.onAuthStateChange((evento, sessao) => {
      if (evento === "PASSWORD_RECOVERY") recuperando = true;

      if (evento === "USER_UPDATED" && sessao && atual) {
        atual = publico(sessao.user);
        Dados.perfil.email = atual.email;
        setTimeout(() => Layout.atualizar(), 0);
      }

      // saiu em outra aba, ou a sessão expirou de vez
      if (evento === "SIGNED_OUT" && atual) {
        atual = null;
        setTimeout(() => {
          Dados.descarregar();
          Layout.atualizar();
          Router.ir("/entrar");
        }, 0);
      }
    });

    const { data, error } = await sb().auth.getSession();
    if (error) throw error;
    atual = publico(data.session && data.session.user);
  }

  /* ---------- Cadastro ---------- */
  async function cadastrar({ nome, email, senha, curso = "", instituicao = "", objetivo = "" }) {
    nome = String(nome || "").trim();
    email = normalizarEmail(email);
    if (nome.length < 2) return { erro: "Informe seu nome.", campo: "nome" };
    if (!EMAIL_RE.test(email)) return { erro: MSG_EMAIL, campo: "email" };
    const erroSenha = validarSenha(String(senha || ""));
    if (erroSenha) return { erro: erroSenha, campo: "senha" };

    const { data, error } = await sb().auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo: base(),
        // o gatilho do banco usa isto para criar o perfil
        data: { nome, curso: String(curso).trim(), instituicao: String(instituicao).trim(), objetivo: String(objetivo).trim() },
      },
    });
    if (error) {
      const msg = Api.traduzir(error);
      return { erro: msg, campo: /e-mail/i.test(msg) ? "email" : /senha/i.test(msg) ? "senha" : undefined };
    }

    // com confirmação de e-mail ligada, e-mail já cadastrado volta sem erro e sem identidades
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { erro: "Já existe uma conta com esse e-mail. Tente entrar.", campo: "email" };
    }

    // o projeto exige confirmar o e-mail antes de entrar
    if (!data.session) return { ok: true, confirmar: true, email };

    atual = publico(data.user);
    try {
      await Dados.carregar();
    } catch (err) {
      return { erro: Api.traduzir(err) };
    }
    return { ok: true };
  }

  /* ---------- Login ---------- */
  async function entrar(email, senha) {
    const { data, error } = await sb().auth.signInWithPassword({ email: normalizarEmail(email), password: String(senha || "") });
    if (error) return { erro: Api.traduzir(error) };
    atual = publico(data.user);
    try {
      await Dados.carregar();
    } catch (err) {
      const msg = Api.traduzir(err);
      atual = null;
      await sb().auth.signOut();
      return { erro: `Você entrou, mas não foi possível carregar seus dados. ${msg}` };
    }
    return { ok: true };
  }

  async function sair() {
    atual = null;
    Dados.descarregar();
    await sb().auth.signOut();
  }

  /* ---------- Esqueci a senha ---------- */
  async function esqueciSenha(email) {
    email = normalizarEmail(email);
    if (!EMAIL_RE.test(email)) return { erro: MSG_EMAIL };
    const { error } = await sb().auth.resetPasswordForEmail(email, { redirectTo: base() });
    if (error) return { erro: Api.traduzir(error) };
    return { ok: true }; // mesma resposta exista a conta ou não
  }

  /** Usada depois de abrir o link do e-mail de recuperação. */
  async function definirNovaSenha(nova) {
    const erro = validarSenha(String(nova || ""));
    if (erro) return { erro, campo: "nova" };
    const { error } = await sb().auth.updateUser({ password: nova });
    if (error) return { erro: Api.traduzir(error), campo: "nova" };
    recuperando = false;
    return { ok: true };
  }

  /* ---------- Gerenciar a própria conta ---------- */
  async function confirmarSenha(senha) {
    if (!atual) return { erro: "Você precisa entrar primeiro." };
    const { error } = await sb().auth.signInWithPassword({ email: atual.email, password: String(senha || "") });
    return error ? { erro: "Senha incorreta." } : { ok: true };
  }

  async function alterarSenha(senhaAtual, novaSenha) {
    const conf = await confirmarSenha(senhaAtual);
    if (conf.erro) return { erro: "A senha atual está incorreta.", campo: "atual" };
    if (novaSenha === senhaAtual) return { erro: "A nova senha precisa ser diferente da atual.", campo: "nova" };
    return definirNovaSenha(novaSenha);
  }

  /** O Supabase envia um link de confirmação para o novo e-mail; só muda depois de confirmar. */
  async function atualizarEmail(novo) {
    novo = normalizarEmail(novo);
    if (!EMAIL_RE.test(novo)) return { erro: MSG_EMAIL, campo: "email" };
    if (!atual || novo === atual.email) return { ok: true, mudou: false };
    const { error } = await sb().auth.updateUser({ email: novo }, { emailRedirectTo: base() });
    if (error) return { erro: Api.traduzir(error), campo: "email" };
    return { ok: true, mudou: true };
  }

  async function excluirConta(senha) {
    const conf = await confirmarSenha(senha);
    if (conf.erro) return conf;
    const { error } = await sb().rpc("excluir_minha_conta");
    if (error) return { erro: Api.traduzir(error) };
    atual = null;
    Dados.descarregar();
    await sb().auth.signOut();
    return { ok: true };
  }

  return {
    iniciar, cadastrar, entrar, sair,
    esqueciSenha, definirNovaSenha, alterarSenha, atualizarEmail, excluirConta,
    usuario: () => atual,
    recuperando: () => recuperando,
    validarSenha,
  };
})();
