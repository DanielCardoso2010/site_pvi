/* =========================================================
   QuestãoCerta — tela Início
   Mostra os questionários de TODAS as contas. Dá para filtrar
   por matéria e ver só os que você criou.
   ========================================================= */

(() => {
  "use strict";

  const { el, ico, plural, comparar } = QC;
  let filtro = "Todos";   // matéria selecionada nos chips
  let soMeus = false;     // só os criados por mim

  Router.registrar("/", "Início", (view) => {
    const itens = Dados.questionarios;
    const meus = itens.filter(Dados.sou);
    const resumo = Dados.estatisticas();
    const totalQuestoes = itens.reduce((s, q) => s + q.questoes.length, 0);

    /* ----- Destaque + números ----- */
    const hero = el("section", { class: "hero" },
      el("div", { class: "container" },
        el("h1", { text: "Explore e Crie Questionários com a Comunidade" }),
        el("p", { class: "hero-sub", text: "Todos os questionários publicados ficam disponíveis para todas as contas. Responda os dos outros ou crie os seus." }),
        el("div", { class: "stats", "aria-label": "Resumo do banco de questões" },
          Componentes.stat("lista", "indigo", itens.length, "Questionários"),
          Componentes.stat("ajuda", "green", totalQuestoes, "Questões"),
          Componentes.stat("livro", "amber", Dados.materias.length, "Matérias"),
          Componentes.stat("alvo", "blue", resumo.taxa == null ? "—" : `${resumo.taxa}%`, "Sua média de acertos")
        )
      )
    );

    /* ----- Filtros ----- */
    const base = soMeus ? meus : itens;
    const nomes = [...new Set(base.map((i) => i.materia))].sort(comparar);
    if (filtro !== "Todos" && !nomes.includes(filtro)) filtro = "Todos";
    const lista = Componentes.filtrar(base.filter((i) => filtro === "Todos" || i.materia === filtro));

    const segmento = el("div", { class: "segmento", role: "group", "aria-label": "Quais questionários mostrar" },
      [["Todos", false], ["Criados por mim", true]].map(([rotulo, valor]) =>
        el("button", {
          type: "button", "aria-pressed": String(soMeus === valor), text: rotulo,
          onclick: () => { soMeus = valor; Router.atualizar(); },
        }))
    );

    const atualizar = el("button", { class: "btn btn-ghost btn-sm", type: "button", title: "Buscar questionários novos" },
      ico("repetir", 15), "Atualizar");
    atualizar.addEventListener("click", async () => {
      atualizar.disabled = true;
      try {
        await Dados.carregar();
        QC.aoAlterar();
        QC.toast("Lista atualizada.");
      } catch (err) {
        QC.toast(Api.traduzir(err));
        atualizar.disabled = false;
      }
    });

    const chips = nomes.length > 1
      ? ["Todos", ...nomes].map((nome) =>
          el("button", {
            class: "chip", type: "button", role: "tab", "aria-selected": String(nome === filtro), text: nome,
            onclick: () => { filtro = nome; Router.atualizar(); },
          }))
      : [];

    let descricao;
    if (!itens.length) descricao = "Ninguém publicou questionários ainda.";
    else if (!lista.length) descricao = "Nenhum questionário corresponde aos filtros.";
    else descricao = `${plural(lista.length, "questionário", "questionários")} — use a busca e os filtros para encontrar o que precisa.`;

    let conteudo;
    if (!itens.length) {
      conteudo = Componentes.estadoVazio({
        titulo: "Seja o primeiro a publicar",
        texto: "Ainda não há questionários. O que você criar fica disponível para todas as contas.",
        acao: { texto: "Criar questionário", aoClicar: () => Modais.abrirFormQuestionario() },
      });
    } else if (soMeus && !meus.length) {
      conteudo = Componentes.estadoVazio({
        titulo: "Você ainda não criou questionários",
        texto: "Crie o primeiro e ele aparece aqui e para todas as outras contas.",
        acao: { texto: "Criar questionário", aoClicar: () => Modais.abrirFormQuestionario() },
      });
    } else if (!lista.length) {
      conteudo = Componentes.estadoVazio({
        icone: "busca", titulo: "Nada encontrado",
        texto: "Tente outra palavra na busca ou escolha outra matéria.",
      });
    } else {
      conteudo = el("div", { class: "grid" }, lista.map(Componentes.cardQuestionario));
    }

    view.append(
      hero,
      el("section", { class: "listing" },
        el("div", { class: "container" },
          el("div", { class: "listing-head" },
            el("div", {}, el("h2", { text: soMeus ? "Seus questionários" : "Questionários" }), el("p", { text: descricao })),
            el("div", { class: "listing-tools" }, segmento, atualizar)
          ),
          chips.length ? el("div", { class: "chips chips-linha", role: "tablist", "aria-label": "Filtrar por matéria" }, chips) : null,
          conteudo
        )
      )
    );
  });
})();
