/* =========================================================
   QuestãoCerta — tela Minhas Estatísticas
   Tudo é calculado a partir do histórico de respostas.
   ========================================================= */

(() => {
  "use strict";

  const { el, ico, plural, comparar, fmtDuracao, fmtData } = QC;

  const pct = (acertos, total) => (total ? Math.round((acertos / total) * 100) : 0);
  const faixa = (p) => (p >= 70 ? "bom" : p >= 50 ? "medio" : "ruim");

  Router.registrar("/estatisticas", "Minhas Estatísticas", (view) => {
    const cab = Componentes.cabecalho({
      titulo: "Minhas estatísticas",
      descricao: "Seu desempenho nos questionários que você respondeu.",
    });

    if (!Dados.tentativas.length) {
      view.append(el("div", { class: "page container" }, cab,
        Componentes.estadoVazio({
          icone: "grafico",
          titulo: "Ainda não há respostas para mostrar",
          texto: "Responda um questionário até o fim e seu desempenho aparece aqui.",
          acao: { texto: "Ver questionários", href: "#/" },
        })));
      return;
    }

    const T = Dados.tentativas;
    const geral = Dados.estatisticas();

    /* ----- Números gerais ----- */
    const numeros = el("div", { class: "stats" },
      Componentes.stat("lista", "indigo", geral.n, geral.n === 1 ? "Questionário respondido" : "Questionários respondidos"),
      Componentes.stat("ajuda", "green", geral.questoes, "Questões respondidas"),
      Componentes.stat("alvo", "blue", `${geral.taxa}%`, "Taxa de acerto"),
      Componentes.stat("relogio", "amber", fmtDuracao(geral.segundos), "Tempo de estudo")
    );

    /* ----- Evolução (últimas 12 tentativas) ----- */
    const ultimas = T.slice(-12);
    const barras = el("div", { class: "barras", role: "img", "aria-label": "Taxa de acerto das últimas respostas" },
      ultimas.map((t) => {
        const p = pct(t.acertos, t.total);
        const dia = new Date(t.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        return el("div", { class: "barra-col", title: `${t.titulo}: ${t.acertos}/${t.total} (${p}%)` },
          el("span", { class: "barra-valor", text: `${p}%` }),
          el("div", { class: "barra-trilho" }, el("div", { class: `barra ${faixa(p)}`, style: `height:${Math.max(p, 3)}%` })),
          el("span", { class: "barra-rotulo", text: dia })
        );
      })
    );
    const evolucao = el("section", { class: "panel" },
      el("h2", { class: "panel-title", text: "Evolução" }),
      el("p", { class: "panel-sub", text: `Taxa de acerto das últimas ${plural(ultimas.length, "resposta", "respostas")}.` }),
      barras
    );

    /* ----- Meta de hoje e sequência ----- */
    const meta = Math.max(1, Number(Dados.perfil.metaDiaria) || 10);
    const hoje = Dados.respondidasHoje();
    const seq = Dados.sequencia();
    const rotina = el("section", { class: "panel" },
      el("h2", { class: "panel-title", text: "Meta de hoje" }),
      el("p", { class: "panel-sub", text: `${hoje} de ${plural(meta, "questão", "questões")}` }),
      el("div", { class: "progresso", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(Math.min(100, Math.round((hoje / meta) * 100))) },
        el("span", { style: `width:${Math.min(100, (hoje / meta) * 100)}%` })),
      el("p", { class: "panel-nota", text: hoje >= meta ? "Meta cumprida. Bom trabalho!" : `Faltam ${plural(meta - hoje, "questão", "questões")} para a sua meta.` }),
      el("div", { class: "sequencia" },
        el("span", { class: "stat-icon amber" }, ico("raio", 20)),
        el("div", {},
          el("strong", { text: plural(seq, "dia seguido", "dias seguidos") }),
          el("small", { text: seq ? "estudando sem parar" : "Responda hoje para começar uma sequência" })
        )
      )
    );

    /* ----- Por matéria ----- */
    const grupos = new Map();
    for (const t of T) {
      const g = grupos.get(t.materia) || { materia: t.materia, acertos: 0, total: 0, n: 0 };
      g.acertos += Number(t.acertos) || 0;
      g.total += Number(t.total) || 0;
      g.n += 1;
      grupos.set(t.materia, g);
    }
    const porMateria = [...grupos.values()].sort((a, b) => pct(b.acertos, b.total) - pct(a.acertos, a.total) || comparar(a.materia, b.materia));
    const materias = el("section", { class: "panel" },
      el("h2", { class: "panel-title", text: "Desempenho por matéria" }),
      el("p", { class: "panel-sub", text: "Da matéria em que você mais acerta para a que precisa de mais atenção." }),
      el("div", { class: "hbarras" },
        porMateria.map((g) => {
          const p = pct(g.acertos, g.total);
          return el("div", { class: "hbarra" },
            el("div", { class: "hbarra-topo" },
              el("span", { class: "hbarra-nome" }, Componentes.pontoCor(g.materia), g.materia),
              el("span", { class: "hbarra-valor", text: `${p}% · ${g.acertos}/${g.total}` })
            ),
            el("div", { class: "progresso", role: "progressbar", "aria-label": g.materia, "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(p) },
              el("span", { class: faixa(p), style: `width:${Math.max(p, 2)}%` }))
          );
        })
      )
    );

    /* ----- Histórico recente ----- */
    const recentes = [...T].reverse().slice(0, 8);
    const historico = el("section", { class: "panel" },
      el("h2", { class: "panel-title", text: "Respostas recentes" }),
      el("ul", { class: "historico" },
        recentes.map((t) => {
          const p = pct(t.acertos, t.total);
          const existe = Dados.questionarios.some((q) => q.id === t.questionarioId);
          return el("li", {},
            el("div", { class: "historico-info" },
              el("strong", { text: t.titulo }),
              el("small", {}, Componentes.pontoCor(t.materia), `${t.materia} · ${fmtData(t.data)} · ${fmtDuracao(t.segundos)}`)
            ),
            el("span", { class: `nota ${faixa(p)}`, text: `${t.acertos}/${t.total} · ${p}%` }),
            existe
              ? el("a", { class: "btn btn-ghost btn-sm", href: `#/responder/${encodeURIComponent(t.questionarioId)}` }, ico("repetir", 15), "Refazer")
              : null
          );
        })
      )
    );

    view.append(el("div", { class: "page container" },
      cab, numeros,
      el("div", { class: "painel-grid" }, evolucao, rotina),
      materias,
      historico
    ));
  });
})();
