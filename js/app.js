/* =========================================================
   QuestãoCerta — inicialização
   1) confere se o servidor (Supabase) foi configurado
   2) reabre a sessão e baixa os dados
   3) define quem pode ver cada tela e abre a tela atual
   ========================================================= */

(async () => {
  "use strict";

  const TELAS_PUBLICAS = ["/entrar", "/cadastro", "/esqueci"];
  const carregando = document.getElementById("carregando");
  const view = document.getElementById("view");

  // sem conta logada só as telas públicas; logado, nunca elas
  Router.acesso = (caminho) => {
    const logado = !!Auth.usuario();
    const publica = TELAS_PUBLICAS.includes(caminho);
    if (!logado && !publica) return "/entrar";
    if (logado && publica) return "/";
    return null;
  };

  function aviso(titulo, ...filhos) {
    carregando.hidden = true;
    view.replaceChildren(QC.el("div", { class: "aviso-config" }, QC.el("h1", { text: titulo }), ...filhos));
  }

  /* ----- servidor não configurado ----- */
  if (!Api.bibliotecaOk) {
    aviso("Não foi possível carregar o aplicativo",
      QC.el("p", { text: "O arquivo js/vendor/supabase.js não foi encontrado ou foi bloqueado. Confira se a pasta js/vendor foi enviada junto." }));
    return;
  }
  if (!Api.configurado) {
    aviso("Falta conectar o servidor",
      QC.el("p", { text: "Este site guarda contas e questionários no Supabase (grátis). Para ligar:" }),
      QC.el("ol", {},
        QC.el("li", {}, "Crie um projeto em supabase.com."),
        QC.el("li", {}, "No SQL Editor, rode o arquivo banco/schema.sql."),
        QC.el("li", {}, "Em Project Settings > API, copie a Project URL e a chave anon public."),
        QC.el("li", {}, "Cole os dois valores no arquivo js/config.js e publique de novo.")),
      QC.el("p", { class: "muted", text: "O passo a passo completo está no arquivo COMO-PUBLICAR.md." }));
    return;
  }

  /* ----- sessão e dados ----- */
  Layout.iniciar();
  try {
    await Auth.iniciar();
    if (Auth.usuario()) await Dados.carregar();
  } catch (err) {
    console.error(err);
    aviso("Não foi possível conectar ao servidor",
      QC.el("p", { text: `${Api.traduzir(err)} Se o problema continuar, confira a URL e a chave em js/config.js.` }),
      QC.el("button", { class: "btn btn-primary", type: "button", onclick: () => location.reload() }, "Tentar de novo"));
    return;
  }

  carregando.hidden = true;
  Layout.atualizar();
  if (Auth.recuperando()) location.hash = "#/nova-senha"; // veio do link "esqueci minha senha"
  Router.pronto = true;
  Router.resolver();

  /* ----- traz novidades dos outros usuários ao voltar para a aba ----- */
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState !== "visible" || !Auth.usuario()) return;
    if (Date.now() - Dados.ultimaCarga < 120000) return;
    if (Router.atual().startsWith("/responder/")) return; // não interrompe um questionário
    try {
      await Dados.carregar();
      QC.aoAlterar();
    } catch (err) {
      console.warn("Não foi possível atualizar:", err);
    }
  });
})();
