/* =========================================================
   QuestãoCerta — componentes reutilizáveis
   ========================================================= */

const Componentes = (() => {
  "use strict";

  const { el, ico, plural, normalizar } = QC;
  const CLASSE_DIFICULDADE = { "Fácil": "facil", "Médio": "medio", "Difícil": "dificil" };

  /** Bolinha com a cor da matéria. */
  function pontoCor(nomeMateria) {
    return el("i", { class: "dot", style: `background:${Dados.corMateria(nomeMateria)}` });
  }

  /** Aplica o termo digitado na busca do cabeçalho. */
  function filtrar(itens) {
    const termo = normalizar(QC.busca.trim());
    if (!termo) return itens;
    return itens.filter((i) => normalizar(`${i.titulo} ${i.materia} ${i.descricao}`).includes(termo));
  }

  function ferramenta(icone, rotulo, aoClicar, { ativo = false, perigo = false, preenchido = false } = {}) {
    return el("button", {
      class: `icon-btn sm${ativo ? " on" : ""}${perigo ? " danger" : ""}`,
      type: "button", title: rotulo, "aria-label": rotulo,
      "aria-pressed": ativo !== undefined && icone === "marcador" ? String(ativo) : null,
      onclick: aoClicar,
    }, ico(icone, 16, preenchido));
  }

  function cardQuestionario(item) {
    const salvo = !!item.salvo;
    return el("article", { class: "card" },
      el("div", { class: "card-top" },
        el("span", { class: "tag", title: item.materia }, pontoCor(item.materia), el("span", { text: item.materia })),
        el("span", { class: `badge ${CLASSE_DIFICULDADE[item.dificuldade] || "medio"}`, text: item.dificuldade })
      ),
      el("h3", { text: item.titulo }),
      el("p", { class: "card-desc", text: item.descricao || "" }),
      el("p", { class: "card-autor" }, ico("usuario", 13), Dados.sou(item) ? "Criado por você" : `Criado por ${item.autor}`),
      el("div", { class: "card-meta" },
        el("div", { class: "card-info" },
          el("span", {}, ico("ajuda", 15), plural(item.questoes.length, "questão", "questões")),
          el("span", {}, ico("relogio", 15), `${item.tempo} min`)
        ),
        el("div", { class: "card-tools" },
          ferramenta("olho", "Ver questões", () => Modais.abrirVisualizar(item.id)),
          ferramenta("marcador", salvo ? "Remover dos salvos" : "Salvar questionário", async () => {
            const r = await Dados.alternarSalvo(item.id);
            QC.toast(r.erro || (r.salvo ? "Questionário salvo." : "Removido dos salvos."));
            QC.aoAlterar();
          }, { ativo: salvo, preenchido: salvo }),
          // só quem criou pode editar ou excluir
          Dados.sou(item) ? ferramenta("lapis", "Editar", () => Modais.abrirFormQuestionario(item.id)) : null,
          Dados.sou(item) ? ferramenta("lixo", "Excluir", () => Modais.excluirQuestionario(item.id), { perigo: true }) : null
        )
      ),
      el("a", { class: "btn btn-primary btn-full", href: `#/responder/${item.id}` },
        ico("play", 16), "Responder questionário")
    );
  }

  /** Bloco para telas sem conteúdo: explica e convida a agir. */
  function estadoVazio({ icone = "lista", titulo, texto, acao }) {
    let botao = null;
    if (acao) {
      botao = acao.href
        ? el("a", { class: "btn btn-primary", href: acao.href }, acao.texto)
        : el("button", { class: "btn btn-primary", type: "button", onclick: acao.aoClicar }, acao.texto);
    }
    return el("div", { class: "empty" },
      el("div", { class: "empty-icon" }, ico(icone, 30)),
      el("h3", { text: titulo }),
      el("p", { text: texto }),
      botao
    );
  }

  /** Título da tela com descrição e botões de ação. */
  function cabecalho({ titulo, descricao, acoes = [], voltar = null }) {
    return el("div", { class: "page-head" },
      voltar ? el("a", { class: "page-back", href: voltar.href }, ico("voltar", 16), voltar.texto) : null,
      el("div", { class: "page-head-row" },
        el("div", {},
          el("h1", { text: titulo }),
          descricao ? el("p", { text: descricao }) : null
        ),
        acoes.length ? el("div", { class: "page-actions" }, acoes) : null
      )
    );
  }

  function stat(icone, cor, valor, rotulo) {
    return el("div", { class: "stat" },
      el("span", { class: `stat-icon ${cor}` }, ico(icone, 20)),
      el("div", {}, el("strong", { text: String(valor) }), el("small", { text: rotulo }))
    );
  }

  /** Campo de senha com botão Mostrar/Ocultar. */
  function campoSenha(id, rotulo, autocomplete, dica = "") {
    const input = el("input", { id, name: id, type: "password", autocomplete, maxlength: "128" });
    const alternar = el("button", {
      class: "senha-toggle", type: "button", "aria-label": "Mostrar senha",
      onclick: () => {
        const mostrando = input.type === "password";
        input.type = mostrando ? "text" : "password";
        alternar.textContent = mostrando ? "Ocultar" : "Mostrar";
        alternar.setAttribute("aria-label", mostrando ? "Ocultar senha" : "Mostrar senha");
      },
    }, "Mostrar");
    return el("div", { class: "field" },
      el("label", { for: id, text: rotulo }),
      el("div", { class: "senha-wrap" }, input, alternar),
      dica ? el("small", { class: "dica", text: dica }) : null
    );
  }

  return { pontoCor, filtrar, cardQuestionario, estadoVazio, cabecalho, stat, campoSenha };
})();
