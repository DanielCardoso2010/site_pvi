/* =========================================================
   QuestãoCerta — tela Meu Perfil
   Mostra os dados informados no cadastro e nas configurações.
   ========================================================= */

(() => {
  "use strict";

  const { el, ico, plural } = QC;

  Router.registrar("/perfil", "Meu Perfil", (view) => {
    const p = Dados.perfil;
    const conta = Auth.usuario();
    const resumo = Dados.estatisticas();
    const meus = Dados.questionarios.filter(Dados.sou);
    const totalQuestoes = meus.reduce((s, q) => s + q.questoes.length, 0);
    const desde = new Date(conta.criadoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

    const item = (rotulo, valor) =>
      el("div", { class: "perfil-item" },
        el("dt", { text: rotulo }),
        valor ? el("dd", { text: valor }) : el("dd", { class: "vazio", text: "Não informado" })
      );

    const editar = el("a", { class: "btn btn-primary", href: "#/configuracoes" }, ico("lapis", 16), "Editar perfil");

    view.append(el("div", { class: "page container page-estreita" },
      Componentes.cabecalho({ titulo: "Meu perfil", descricao: "Suas informações e um resumo do seu estudo.", acoes: [editar] }),

      el("section", { class: "panel perfil-card" },
        el("div", { class: "perfil-topo" },
          QC.avatar(p, "avatar xl"),
          el("div", { class: "perfil-nome" },
            el("h2", { text: p.nome }),
            el("p", { text: p.email }),
            p.objetivo ? el("span", { class: "tag" }, ico("alvo", 13), el("span", { text: p.objetivo })) : null
          )
        ),
        el("dl", { class: "perfil-dados" },
          item("Curso ou área", p.curso),
          item("Instituição", p.instituicao),
          item("E-mail", p.email),
          item("Meta diária", plural(p.metaDiaria, "questão", "questões")),
          item("Membro desde", desde)
        )
      ),

      el("div", { class: "stats" },
        Componentes.stat("lista", "indigo", meus.length, "Questionários criados"),
        Componentes.stat("ajuda", "green", totalQuestoes, "Questões criadas"),
        Componentes.stat("alvo", "blue", resumo.taxa == null ? "—" : `${resumo.taxa}%`, "Taxa de acerto"),
        Componentes.stat("raio", "amber", Dados.sequencia(), "Dias seguidos")
      )
    ));
  });
})();
