/* =========================================================
   QuestãoCerta — tela Responder questionário
   Uma questão por vez: escolher, confirmar, ver o gabarito e
   a explicação, e no final o resultado com a revisão.
   O desempenho entra no histórico (Minhas estatísticas).
   ========================================================= */

(() => {
  "use strict";

  const { el, ico, plural, fmtRelogio, fmtDuracao } = QC;
  const LETRAS = ["A", "B", "C", "D", "E"];

  Router.registrar("/responder/([^/]+)", "Responder questionário", (view, [id]) => {
    const q = Dados.questionarios.find((x) => x.id === id);

    if (!q) {
      view.append(el("div", { class: "page container" },
        Componentes.estadoVazio({
          titulo: "Questionário não encontrado",
          texto: "Ele pode ter sido excluído. Escolha outro na tela inicial.",
          acao: { texto: "Ir para o início", href: "#/" },
        })));
      return;
    }

    const n = q.questoes.length;
    let st;          // estado da tentativa em andamento
    let timer = null;

    const novo = () => {
      st = {
        i: 0,
        resp: Array(n).fill(null),     // alternativa escolhida em cada questão
        conf: Array(n).fill(false),    // questão já confirmada?
        inicio: Date.now(),
        fim: null, acertos: 0, seg: 0,
      };
    };

    const respondidas = () => st.resp.filter((r) => r !== null).length;
    const segundos = () => Math.floor(((st.fim || Date.now()) - st.inicio) / 1000);

    const guarda = () => !st.resp.some((r) => r !== null) ||
      confirm("Sair agora? Seu progresso neste questionário será perdido.");

    function iniciarTimer() {
      clearInterval(timer);
      timer = setInterval(() => {
        const rel = view.querySelector(".relogio");
        if (rel) rel.textContent = fmtRelogio(segundos());
      }, 1000);
    }

    /** Redesenha a tela e devolve o foco para o elemento indicado. */
    function desenhar(foco) {
      view.replaceChildren(el("div", { class: "page container page-estreita quiz" },
        st.fim ? telaResultado() : telaQuestao()));
      if (foco) {
        const alvo = view.querySelector(foco);
        if (alvo) alvo.focus({ preventScroll: true });
      }
    }

    /* ===================== Ações ===================== */
    function escolher(j) {
      if (st.conf[st.i]) return;
      st.resp[st.i] = j;
      desenhar(".opcao.sel");
    }

    function confirmar() {
      if (st.resp[st.i] === null || st.conf[st.i]) return;
      st.conf[st.i] = true;
      desenhar(".js-proxima");
    }

    function proxima() {
      if (st.i < n - 1) {
        st.i++;
        desenhar(".quiz-enun");
      } else {
        tentarFinalizar();
      }
    }

    function tentarFinalizar() {
      const faltam = n - respondidas();
      if (faltam > 0 && !confirm(`Faltam ${plural(faltam, "questão", "questões")} sem resposta. Elas contam como erro. Finalizar mesmo assim?`)) return;
      finalizar();
    }

    function finalizar() {
      st.fim = Date.now();
      st.seg = Math.round((st.fim - st.inicio) / 1000);
      st.acertos = q.questoes.filter((qu, k) => st.resp[k] === qu.correta).length;
      clearInterval(timer);
      Router.guarda = null;

      Dados.adicionarTentativa({
        questionarioId: q.id,
        titulo: q.titulo,
        materia: q.materia,
        dificuldade: q.dificuldade,
        data: st.fim,
        acertos: st.acertos,
        total: n,
        segundos: st.seg,
        respostas: st.resp.slice(),
      }).then((r) => {
        if (r.erro) QC.toast(`Seu resultado não foi salvo no histórico. ${r.erro}`);
      });

      desenhar(".resultado h1");
      window.scrollTo(0, 0);
    }

    function refazer() {
      novo();
      Router.guarda = guarda;
      iniciarTimer();
      desenhar(".quiz-enun");
      window.scrollTo(0, 0);
    }

    /* ===================== Tela da questão ===================== */
    function telaQuestao() {
      const i = st.i;
      const qu = q.questoes[i];
      const conf = st.conf[i];
      const esc = st.resp[i];
      const feitas = respondidas();

      const topo = el("div", { class: "quiz-top" },
        el("a", { class: "btn btn-ghost btn-sm", href: "#/" }, ico("voltar", 16), "Sair"),
        el("div", { class: "quiz-title" },
          el("h1", { text: q.titulo }),
          el("span", { class: "tag" }, Componentes.pontoCor(q.materia), el("span", { text: q.materia }))
        ),
        el("div", { class: "quiz-clock", title: "Tempo decorrido" },
          ico("relogio", 16),
          el("span", { class: "relogio", text: fmtRelogio(segundos()) }),
          el("small", { text: `de ~${q.tempo} min` })
        )
      );

      const progresso = el("div", { class: "quiz-progress" },
        el("div", { class: "quiz-progress-txt" },
          el("strong", { text: `Questão ${i + 1} de ${n}` }),
          el("span", { text: `${feitas} de ${n} respondidas` })
        ),
        el("div", { class: "progresso", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(n), "aria-valuenow": String(feitas) },
          el("span", { style: `width:${(feitas / n) * 100}%` }))
      );

      const opcoes = el("div", { class: "opcoes", role: "group", "aria-label": "Alternativas" },
        qu.alternativas.map((texto, j) => {
          let classe = "opcao";
          if (conf) {
            if (j === qu.correta) classe += " certa";
            else if (j === esc) classe += " errada";
          } else if (j === esc) {
            classe += " sel";
          }
          const marca = conf && j === qu.correta ? ico("check", 18) : conf && j === esc ? ico("x", 18) : null;
          return el("button", {
            class: classe, type: "button", disabled: conf, "aria-pressed": String(j === esc),
            onclick: () => escolher(j),
          },
            el("span", { class: "letra", text: LETRAS[j] }),
            el("span", { class: "opcao-txt", text: texto }),
            marca
          );
        })
      );

      let retorno = null;
      if (conf) {
        const acertou = esc === qu.correta;
        retorno = el("div", { class: `feedback ${acertou ? "ok" : "erro"}`, role: "status" },
          el("strong", { text: acertou ? "Resposta correta!" : `Resposta incorreta. A correta é a alternativa ${LETRAS[qu.correta]}.` }),
          qu.explicacao ? el("p", { text: qu.explicacao }) : null
        );
      }

      const ultima = i === n - 1;
      const acoes = el("div", { class: "quiz-acoes" },
        i > 0 ? el("button", { class: "btn btn-ghost", type: "button", onclick: () => { st.i--; desenhar(".quiz-enun"); } },
          ico("voltar", 16), "Anterior") : null,
        el("span", { class: "espaco" }),
        !conf
          ? el("button", { class: "btn btn-primary js-confirmar", type: "button", disabled: esc === null, onclick: confirmar }, "Confirmar resposta")
          : el("button", { class: "btn btn-primary js-proxima", type: "button", onclick: proxima },
              ultima ? "Ver resultado" : "Próxima questão", ico("proximo", 16))
      );

      const navegador = el("nav", { class: "quiz-nav", "aria-label": "Ir para a questão" },
        q.questoes.map((qq, k) => {
          let classe = "qn";
          if (st.conf[k]) classe += st.resp[k] === qq.correta ? " certa" : " errada";
          else if (st.resp[k] !== null) classe += " sel";
          if (k === i) classe += " atual";
          return el("button", {
            class: classe, type: "button", "aria-label": `Questão ${k + 1}`, "aria-current": k === i ? "step" : null,
            onclick: () => { st.i = k; desenhar(".quiz-enun"); },
          }, String(k + 1));
        }),
        el("button", { class: "btn btn-ghost btn-sm finalizar", type: "button", onclick: tentarFinalizar }, "Finalizar agora")
      );

      return el("div", {},
        topo,
        progresso,
        el("section", { class: "quiz-card" },
          el("h2", { class: "quiz-enun", tabindex: "-1", text: qu.enunciado }),
          opcoes, retorno, acoes
        ),
        navegador
      );
    }

    /* ===================== Tela do resultado ===================== */
    function telaResultado() {
      const { acertos } = st;
      const p = Math.round((acertos / n) * 100);
      const brancos = st.resp.filter((r) => r === null).length;
      const erros = n - acertos - brancos;
      const faixa = p >= 70 ? "bom" : p >= 50 ? "medio" : "ruim";
      const mensagem = p >= 80 ? "Excelente! Você domina esse conteúdo."
        : p >= 60 ? "Bom resultado. Revise as questões que errou."
        : "Vale revisar o conteúdo e tentar de novo.";

      const botaoSalvar = el("button", { class: "btn btn-ghost", type: "button" });
      const rotularSalvar = () => botaoSalvar.replaceChildren(ico("marcador", 16, !!q.salvo), q.salvo ? "Salvo" : "Salvar questionário");
      rotularSalvar();
      botaoSalvar.addEventListener("click", async () => {
        const r = await Dados.alternarSalvo(q.id);
        rotularSalvar();
        QC.toast(r.erro || (r.salvo ? "Questionário salvo." : "Removido dos salvos."));
      });

      const revisao = q.questoes.map((qu, k) => {
        const r = st.resp[k];
        const status = r === null ? "branco" : r === qu.correta ? "certa" : "errada";
        const rotulo = { certa: "Certa", errada: "Errada", branco: "Em branco" }[status];
        return el("details", { class: `rev ${status}`, open: status !== "certa" },
          el("summary", {},
            el("span", { class: "rev-n", text: String(k + 1) }),
            el("span", { class: "rev-enun", text: qu.enunciado }),
            el("span", { class: `rev-status ${status}`, text: rotulo })
          ),
          el("div", { class: "rev-corpo" },
            el("ul", { class: "ver-alts" },
              qu.alternativas.map((a, j) =>
                el("li", { class: j === qu.correta ? "correta" : j === r ? "errada" : "" },
                  el("b", { text: `${LETRAS[j]})` }),
                  el("span", { text: a }),
                  j === qu.correta ? el("span", { class: "gabarito", text: "Gabarito" })
                    : j === r ? el("span", { class: "gabarito", text: "Sua resposta" }) : null
                )
              )
            ),
            qu.explicacao ? el("p", { class: "ver-exp" }, el("b", { text: "Explicação: " }), qu.explicacao) : null
          )
        );
      });

      return el("section", { class: "resultado" },
        el("div", { class: "resultado-topo" },
          el("div", { class: `anel ${faixa}`, style: `--p:${p}`, role: "img", "aria-label": `${p}% de acertos` },
            el("div", {}, el("strong", { text: `${p}%` }), el("small", { text: "de acertos" }))
          ),
          el("div", { class: "resultado-texto" },
            el("h1", { tabindex: "-1", text: `Você acertou ${acertos} de ${n}` }),
            el("p", { text: mensagem }),
            el("p", { class: "muted", text: `${q.titulo} · ${q.materia}` })
          )
        ),
        el("div", { class: "stats" },
          Componentes.stat("check", "green", acertos, "Acertos"),
          Componentes.stat("x", "red", erros, "Erros"),
          Componentes.stat("ajuda", "amber", brancos, "Em branco"),
          Componentes.stat("relogio", "blue", fmtDuracao(st.seg), "Tempo gasto")
        ),
        el("div", { class: "resultado-acoes" },
          el("button", { class: "btn btn-primary", type: "button", onclick: refazer }, ico("repetir", 16), "Refazer"),
          botaoSalvar,
          el("a", { class: "btn btn-ghost", href: "#/estatisticas" }, ico("grafico", 16), "Ver estatísticas"),
          el("a", { class: "btn btn-ghost", href: "#/" }, "Voltar ao início")
        ),
        el("h2", { class: "section-title", text: "Revisão das questões" }),
        el("div", { class: "revisao" }, revisao)
      );
    }

    /* ===================== Teclado ===================== */
    function teclado(e) {
      if (st.fim || e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.querySelector("dialog[open]") || document.querySelector("#drawer.open")) return;
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;

      const qu = q.questoes[st.i];
      const j = LETRAS.map((l) => l.toLowerCase()).indexOf(e.key.toLowerCase());
      if (j >= 0 && j < qu.alternativas.length) { escolher(j); return; }

      const semFoco = !document.activeElement || document.activeElement === document.body;
      if (e.key === "Enter" && semFoco) {
        if (st.conf[st.i]) proxima();
        else confirmar();
      }
    }

    /* ===================== Início ===================== */
    novo();
    Router.guarda = guarda;
    iniciarTimer();
    document.addEventListener("keydown", teclado);
    desenhar();

    return () => {
      clearInterval(timer);
      document.removeEventListener("keydown", teclado);
      Router.guarda = null;
    };
  });
})();
