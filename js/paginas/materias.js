/* =========================================================
   QuestãoCerta — telas de Matérias
   /materias        lista de matérias + criar nova
   /materias/ID     questionários de uma matéria
   ========================================================= */

(() => {
  "use strict";

  const { el, ico, plural, comparar, normalizar } = QC;

  /* ---------- Lista de matérias ---------- */
  Router.registrar("/materias", "Matérias", (view) => {
    const termo = normalizar(QC.busca.trim());
    const todas = [...Dados.materias].sort((a, b) => comparar(a.nome, b.nome));
    const lista = termo ? todas.filter((m) => normalizar(`${m.nome} ${m.descricao}`).includes(termo)) : todas;

    const botaoNova = el("button", { class: "btn btn-primary", type: "button", onclick: () => Modais.abrirFormMateria() },
      ico("mais", 18), "Nova matéria");

    let conteudo;
    if (!todas.length) {
      conteudo = Componentes.estadoVazio({
        icone: "livro",
        titulo: "Nenhuma matéria ainda",
        texto: "Crie matérias como Português ou Direito Administrativo para separar seus questionários por assunto.",
        acao: { texto: "Criar matéria", aoClicar: () => Modais.abrirFormMateria() },
      });
    } else if (!lista.length) {
      conteudo = Componentes.estadoVazio({
        icone: "busca", titulo: "Nada encontrado", texto: "Nenhuma matéria corresponde à busca.",
      });
    } else {
      conteudo = el("div", { class: "grid grid-materias" },
        lista.map((m) => {
          const r = Dados.resumoMateria(m);
          return el("a", { class: "materia-card", href: `#/materias/${encodeURIComponent(m.id)}`, style: `--cor:${QC.corSegura(m.cor)}` },
            el("span", { class: "materia-icon", "aria-hidden": "true", text: m.nome.charAt(0).toUpperCase() }),
            el("div", { class: "materia-corpo" },
              el("h3", { text: m.nome }),
              el("p", { text: m.descricao || "Sem descrição" }),
              el("small", { text: `${plural(r.questionarios, "questionário", "questionários")} · ${plural(r.questoes, "questão", "questões")}` }),
              el("small", { class: "materia-autor", text: Dados.sou(m) ? "Criada por você" : `Criada por ${Dados.nomeAutor(m.criadoPor)}` })
            ),
            ico("seta", 18)
          );
        }),
        !termo ? el("button", { class: "materia-novo", type: "button", onclick: () => Modais.abrirFormMateria() },
          ico("mais", 22), el("span", { text: "Nova matéria" })) : null
      );
    }

    view.append(el("div", { class: "page container" },
      Componentes.cabecalho({
        titulo: "Matérias",
        descricao: "Matérias organizam os questionários por assunto e são compartilhadas por todas as contas.",
        acoes: [botaoNova],
      }),
      conteudo
    ));
  });

  /* ---------- Dentro de uma matéria ---------- */
  Router.registrar("/materias/([^/]+)", "Matéria", (view, [id]) => {
    const m = Dados.materiaPorId(id);
    if (!m) {
      view.append(el("div", { class: "page container" },
        Componentes.estadoVazio({
          icone: "livro", titulo: "Matéria não encontrada", texto: "Ela pode ter sido excluída.",
          acao: { texto: "Voltar para Matérias", href: "#/materias" },
        })));
      return;
    }

    document.title = `${m.nome} — QuestãoCerta`;
    const todos = Dados.questionariosDa(m.nome);
    const lista = Componentes.filtrar(todos);
    const r = Dados.resumoMateria(m);
    const desempenho = Dados.estatisticas(Dados.tentativas.filter((t) => t.materia === m.nome));

    const cabecalho = el("div", { class: "page-head", style: `--cor:${QC.corSegura(m.cor)}` },
      el("a", { class: "page-back", href: "#/materias" }, ico("voltar", 16), "Matérias"),
      el("div", { class: "page-head-row" },
        el("div", { class: "materia-titulo" },
          el("span", { class: "materia-icon lg", "aria-hidden": "true", text: m.nome.charAt(0).toUpperCase() }),
          el("div", {},
            el("h1", { text: m.nome }),
            el("p", { text: m.descricao || (Dados.sou(m) ? "Sem descrição. Use Editar para adicionar uma." : "Sem descrição.") }),
            el("p", { class: "materia-autor", text: Dados.sou(m) ? "Criada por você" : `Criada por ${Dados.nomeAutor(m.criadoPor)}` })
          )
        ),
        el("div", { class: "page-actions" },
          el("button", { class: "btn btn-primary", type: "button", onclick: () => Modais.abrirFormQuestionario(null, m.nome) },
            ico("mais", 18), "Novo questionário"),
          Dados.sou(m) ? el("button", { class: "btn btn-ghost", type: "button", onclick: () => Modais.abrirFormMateria(m.id) },
            ico("lapis", 16), "Editar") : null,
          Dados.sou(m) ? el("button", { class: "btn btn-ghost btn-danger", type: "button", onclick: () => Modais.excluirMateria(m.id) },
            ico("lixo", 16), "Excluir") : null
        )
      )
    );

    const numeros = el("div", { class: "stats stats-3" },
      Componentes.stat("lista", "indigo", r.questionarios, "Questionários"),
      Componentes.stat("ajuda", "green", r.questoes, "Questões"),
      Componentes.stat("alvo", "blue", desempenho.taxa == null ? "—" : `${desempenho.taxa}%`, "Taxa de acerto")
    );

    let conteudo;
    if (!todos.length) {
      conteudo = Componentes.estadoVazio({
        titulo: "Esta matéria ainda não tem questionários",
        texto: "Crie o primeiro e ele já fica separado aqui.",
        acao: { texto: "Criar questionário", aoClicar: () => Modais.abrirFormQuestionario(null, m.nome) },
      });
    } else if (!lista.length) {
      conteudo = Componentes.estadoVazio({ icone: "busca", titulo: "Nada encontrado", texto: "Nenhum questionário corresponde à busca." });
    } else {
      conteudo = el("div", { class: "grid" }, lista.map(Componentes.cardQuestionario));
    }

    view.append(el("div", { class: "page container" },
      cabecalho,
      numeros,
      el("h2", { class: "section-title", text: "Questionários desta matéria" }),
      conteudo
    ));
  });
})();
