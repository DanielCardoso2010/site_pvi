/* =========================================================
   QuestãoCerta — estrutura fixa da página
   Cabeçalho, busca, avatar e menu lateral (com animação).
   ========================================================= */

const Layout = (() => {
  "use strict";

  const { $, $$ } = QC;
  const drawer = $("#drawer");
  const overlay = $("#drawer-overlay");
  const btnMenu = $("#btn-menu");

  /* ---------- Menu lateral ---------- */
  function alternarMenu(abrir, devolverFoco = true) {
    if (drawer.classList.contains("open") === abrir) return;
    drawer.classList.toggle("open", abrir);
    overlay.classList.toggle("open", abrir);
    drawer.toggleAttribute("inert", !abrir);
    btnMenu.setAttribute("aria-expanded", String(abrir));
    btnMenu.setAttribute("aria-label", abrir ? "Fechar menu" : "Abrir menu");
    document.body.classList.toggle("no-scroll", abrir);
    if (abrir) $("#drawer-close").focus();
    else if (devolverFoco) btnMenu.focus();
  }

  const ACOES = {
    criar: () => { alternarMenu(false, false); Modais.abrirFormQuestionario(); },
    responder: () => { alternarMenu(false, false); Modais.escolherQuestionario(); },
    sair: async () => {
      if (Router.guarda && !Router.guarda()) return; // questionário em andamento
      Router.guarda = null;
      alternarMenu(false, false);
      await Auth.sair();
      QC.busca = "";
      $("#busca").value = "";
      atualizar();
      Router.ir("/entrar");
      QC.toast("Você saiu da conta.");
    },
  };

  /* ---------- Perfil no cabeçalho e no menu ---------- */
  function atualizar() {
    document.body.classList.toggle("deslogado", !Auth.usuario());
    const p = Dados.perfil;
    $("#avatar-btn").replaceChildren(QC.avatar(p, "avatar sm"));
    $("#user-avatar").replaceChildren(QC.avatar(p, "avatar"));
    $("#user-nome").textContent = p.nome;
    $("#user-curso").textContent = p.curso || p.email;
  }

  /** Marca no menu a tela em que a pessoa está. */
  function marcarMenu(caminho) {
    $$("[data-rota]").forEach((a) => {
      const rota = a.dataset.rota;
      const ativo = caminho === rota || (rota !== "/" && caminho.startsWith(`${rota}/`));
      a.classList.toggle("active", ativo);
      if (ativo) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  function iniciar() {
    // ícones declarados no HTML com data-icone
    $$("[data-icone]").forEach((n) => {
      n.innerHTML = QC.svg(n.dataset.icone, Number(n.dataset.tam) || 20);
    });

    btnMenu.addEventListener("click", () => alternarMenu(true));
    $("#drawer-close").addEventListener("click", () => alternarMenu(false));
    overlay.addEventListener("click", () => alternarMenu(false));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && drawer.classList.contains("open")) alternarMenu(false);
    });

    drawer.addEventListener("click", (e) => {
      const botao = e.target.closest("[data-acao]");
      if (botao) { ACOES[botao.dataset.acao]?.(); return; }
      if (e.target.closest("a[href]")) alternarMenu(false, false);
    });

    $("#btn-criar").addEventListener("click", () => Modais.abrirFormQuestionario());

    $("#busca").addEventListener("input", (e) => {
      QC.busca = e.target.value;
      if (Router.usaBusca(Router.atual())) Router.atualizar();
      else Router.ir("/");
    });

    document.addEventListener("rota", (e) => {
      document.body.classList.toggle("deslogado", !Auth.usuario());
      marcarMenu(e.detail.caminho);
    });
    atualizar();
  }

  /** Chamada sempre que os dados mudam (criar, editar, excluir...). */
  QC.aoAlterar = () => {
    atualizar();
    // não reinicia o questionário em andamento
    if (!Router.atual().startsWith("/responder/")) Router.atualizar();
  };

  return { iniciar, atualizar, fecharMenu: () => alternarMenu(false) };
})();
