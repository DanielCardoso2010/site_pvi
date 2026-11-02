/* =========================================================
   QuestãoCerta — tela Questionários Salvos
   ========================================================= */

(() => {
  "use strict";

  const { el, plural } = QC;

  Router.registrar("/salvos", "Questionários Salvos", (view) => {
    const salvos = Dados.questionarios.filter((q) => q.salvo);
    const lista = Componentes.filtrar(salvos);

    let conteudo;
    if (!salvos.length) {
      conteudo = Componentes.estadoVazio({
        icone: "marcador",
        titulo: "Nenhum questionário salvo",
        texto: "Toque no marcador de um questionário para guardá-lo aqui e achá-lo mais rápido.",
        acao: { texto: "Ver questionários", href: "#/" },
      });
    } else if (!lista.length) {
      conteudo = Componentes.estadoVazio({ icone: "busca", titulo: "Nada encontrado", texto: "Nenhum questionário salvo corresponde à busca." });
    } else {
      conteudo = el("div", { class: "grid" }, lista.map(Componentes.cardQuestionario));
    }

    view.append(el("div", { class: "page container" },
      Componentes.cabecalho({
        titulo: "Questionários salvos",
        descricao: salvos.length
          ? `${plural(salvos.length, "questionário salvo", "questionários salvos")} para acessar rápido.`
          : "Os questionários que você marcar aparecem aqui.",
      }),
      conteudo
    ));
  });
})();
