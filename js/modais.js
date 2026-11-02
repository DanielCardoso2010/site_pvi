/* =========================================================
   QuestãoCerta — janelas (modais)
   Criar/editar questionário, criar/editar matéria,
   visualizar questões e escolher um questionário para responder.
   ========================================================= */

const Modais = (() => {
  "use strict";

  const { $, $$, el, svg, plural, toast } = QC;
  const MIN_ALT = 2;
  const MAX_ALT = 5;
  const LETRAS = ["A", "B", "C", "D", "E"];
  let contadorRadio = 0;

  /* =======================================================
     Questionário: criar / editar
     ======================================================= */
  const dlgForm = $("#dlg-form");
  const form = $("#form-questionario");
  const boxQuestoes = $("#questions");
  let editandoId = null;

  function atualizarQuestoes() {
    const blocos = $$(".q-block", boxQuestoes);
    blocos.forEach((b, i) => {
      $("h4", b).textContent = `Questão ${i + 1}`;
      $(".btn-remover-q", b).disabled = blocos.length === 1;
    });
    $("#q-count").textContent = plural(blocos.length, "questão", "questões");
  }

  function atualizarAlternativas(bloco) {
    const linhas = $$(".alt-row", bloco);
    linhas.forEach((l, i) => {
      $(".alt-letter", l).textContent = LETRAS[i];
      $("input[type=text]", l).setAttribute("aria-label", `Alternativa ${LETRAS[i]}`);
      $(".btn-remover-alt", l).disabled = linhas.length <= MIN_ALT;
    });
    $(".add-alt", bloco).hidden = linhas.length >= MAX_ALT;
  }

  function criarAlternativa(bloco, nomeRadio, texto = "", correta = false) {
    const radio = el("input", { type: "radio", name: nomeRadio, "aria-label": "Marcar como correta", title: "Marcar como correta" });
    radio.checked = correta;
    const campo = el("input", { type: "text", maxlength: "300", placeholder: "Texto da alternativa" });
    campo.value = texto;
    const linha = el("div", { class: "alt-row" },
      radio,
      el("span", { class: "alt-letter" }),
      campo,
      el("button", {
        class: "icon-btn sm btn-remover-alt", type: "button", "aria-label": "Remover alternativa", html: svg("x", 16),
        onclick: () => { linha.remove(); atualizarAlternativas(bloco); },
      })
    );
    return linha;
  }

  function adicionarQuestao(dados) {
    const nomeRadio = `correta-${++contadorRadio}`;
    const bloco = el("section", { class: "q-block" });
    const alts = el("div", { class: "alts" });
    const textos = dados ? dados.alternativas : ["", "", "", ""];
    textos.forEach((t, i) => alts.append(criarAlternativa(bloco, nomeRadio, t, !!dados && dados.correta === i)));

    const enunciado = el("textarea", { id: `enun-${contadorRadio}`, maxlength: "2000", placeholder: "Digite o enunciado da questão" });
    enunciado.value = dados ? dados.enunciado : "";
    const explicacao = el("input", { id: `exp-${contadorRadio}`, type: "text", maxlength: "500", placeholder: "Por que esta alternativa é a correta?" });
    explicacao.value = dados ? dados.explicacao || "" : "";

    bloco.append(
      el("div", { class: "q-block-head" },
        el("h4"),
        el("button", {
          class: "btn btn-ghost btn-sm btn-remover-q", type: "button",
          onclick: () => { bloco.remove(); atualizarQuestoes(); },
        }, "Remover questão")
      ),
      el("div", { class: "field" }, el("label", { for: enunciado.id, text: "Enunciado" }), enunciado),
      el("div", {},
        el("p", { class: "alts-label", text: "Alternativas" }),
        el("p", { class: "alts-hint", text: "Marque o círculo da alternativa correta." }),
        alts,
        el("button", {
          class: "add-alt", type: "button", text: "+ Adicionar alternativa",
          onclick: () => { alts.append(criarAlternativa(bloco, nomeRadio)); atualizarAlternativas(bloco); },
        })
      ),
      el("div", { class: "field" },
        el("label", { for: explicacao.id }, "Explicação ", el("span", { class: "opt", text: "(opcional)" })),
        explicacao)
    );

    boxQuestoes.append(bloco);
    atualizarAlternativas(bloco);
    atualizarQuestoes();
    return bloco;
  }

  function mostrarErro(msg) {
    const box = $("#form-error");
    box.textContent = msg || "";
    box.hidden = !msg;
  }

  function abrirFormQuestionario(id = null, materiaPadrao = "") {
    const alvo = id ? Dados.questionarios.find((i) => i.id === id) : null;
    if (id && (!alvo || !Dados.sou(alvo))) { toast("Só quem criou o questionário pode editá-lo."); return; }
    editandoId = id;
    form.reset();
    boxQuestoes.replaceChildren();
    mostrarErro("");
    $("#lista-materias").replaceChildren(...Dados.materias.map((m) => el("option", { value: m.nome })));

    const item = id ? Dados.questionarios.find((i) => i.id === id) : null;
    $("#dlg-form-title").textContent = item ? "Editar questionário" : "Novo questionário";
    $("#btn-salvar").textContent = item ? "Salvar alterações" : "Salvar questionário";

    if (item) {
      $("#f-titulo").value = item.titulo;
      $("#f-materia").value = item.materia;
      $("#f-dificuldade").value = item.dificuldade;
      $("#f-descricao").value = item.descricao;
      $("#f-tempo").value = item.tempo;
      item.questoes.forEach(adicionarQuestao);
    } else {
      $("#f-materia").value = materiaPadrao;
      adicionarQuestao();
    }

    dlgForm.showModal();
    $("#f-titulo").focus();
    $(".dlg-body", dlgForm).scrollTop = 0;
  }

  function lerFormulario() {
    const titulo = $("#f-titulo").value.trim();
    const materia = $("#f-materia").value.trim();
    if (!titulo) return { erro: "Informe o título do questionário.", foco: $("#f-titulo") };
    if (!materia) return { erro: "Informe a matéria.", foco: $("#f-materia") };

    const blocos = $$(".q-block", boxQuestoes);
    if (!blocos.length) return { erro: "Adicione pelo menos uma questão." };

    const questoes = [];
    for (let n = 0; n < blocos.length; n++) {
      const bloco = blocos[n];
      const rotulo = `Questão ${n + 1}`;
      const textarea = $("textarea", bloco);
      const enunciado = textarea.value.trim();
      if (!enunciado) return { erro: `${rotulo}: escreva o enunciado.`, foco: textarea };

      const linhas = $$(".alt-row", bloco);
      const alternativas = [];
      let correta = -1;
      for (const linha of linhas) {
        const campo = $("input[type=text]", linha);
        const marcada = $("input[type=radio]", linha).checked;
        const texto = campo.value.trim();
        if (!texto) {
          if (marcada) return { erro: `${rotulo}: a alternativa correta está vazia.`, foco: campo };
          continue; // ignora alternativas em branco
        }
        if (marcada) correta = alternativas.length;
        alternativas.push(texto);
      }
      if (alternativas.length < MIN_ALT) return { erro: `${rotulo}: preencha pelo menos ${MIN_ALT} alternativas.`, foco: $("input[type=text]", linhas[0]) };
      if (correta === -1) return { erro: `${rotulo}: marque qual alternativa é a correta.`, foco: $("input[type=radio]", linhas[0]) };

      questoes.push({ enunciado, alternativas, correta, explicacao: $("input[id^=exp-]", bloco).value.trim() });
    }

    const tempoInformado = parseInt($("#f-tempo").value, 10);
    return {
      dados: {
        titulo,
        materia,
        dificuldade: $("#f-dificuldade").value,
        descricao: $("#f-descricao").value.trim(),
        tempo: tempoInformado > 0 ? tempoInformado : Math.max(1, questoes.length * 2),
        questoes,
      },
    };
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const { dados, erro, foco } = lerFormulario();
    if (erro) {
      mostrarErro(erro);
      if (foco) foco.focus();
      return;
    }

    const editando = editandoId;
    const botao = $("#btn-salvar");
    const rotulo = botao.textContent;
    botao.disabled = true;
    botao.textContent = "Salvando…";
    const r = await Dados.salvarQuestionario(dados, editando);
    botao.disabled = false;
    botao.textContent = rotulo;

    if (r.erro) { mostrarErro(r.erro); return; }
    dlgForm.close();
    QC.aoAlterar();
    toast(editando ? "Alterações salvas." : "Questionário publicado para todos.");
  });

  $("#btn-add-questao").addEventListener("click", () => {
    const bloco = adicionarQuestao();
    bloco.scrollIntoView({ behavior: "smooth", block: "center" });
    $("textarea", bloco).focus({ preventScroll: true });
  });

  async function excluirQuestionario(id) {
    const item = Dados.questionarios.find((i) => i.id === id);
    if (!item) return;
    if (!Dados.sou(item)) { toast("Só quem criou o questionário pode excluí-lo."); return; }
    if (!confirm(`Excluir o questionário "${item.titulo}" para todos? Esta ação não pode ser desfeita.`)) return;
    const r = await Dados.excluirQuestionario(id);
    if (r.erro) { toast(r.erro); return; }
    QC.aoAlterar();
    toast("Questionário excluído.");
  }

  /* =======================================================
     Visualizar questões
     ======================================================= */
  const dlgVer = $("#dlg-ver");

  function abrirVisualizar(id) {
    const item = Dados.questionarios.find((i) => i.id === id);
    if (!item) return;
    $("#ver-titulo").textContent = item.titulo;
    $("#ver-meta").textContent =
      `${item.materia} · ${item.dificuldade} · ${plural(item.questoes.length, "questão", "questões")} · ${item.tempo} min`;

    $("#ver-corpo").replaceChildren(
      ...item.questoes.map((q, i) =>
        el("div", { class: "ver-q" },
          el("h4", {}, el("b", { text: `${i + 1}.` }), q.enunciado),
          el("ul", { class: "ver-alts" },
            q.alternativas.map((a, j) =>
              el("li", { class: j === q.correta ? "correta" : "" },
                el("b", { text: `${LETRAS[j]})` }),
                el("span", { text: a }),
                j === q.correta ? el("span", { class: "gabarito", text: "Gabarito" }) : null
              )
            )
          ),
          q.explicacao ? el("p", { class: "ver-exp" }, el("b", { text: "Explicação: " }), q.explicacao) : null
        )
      )
    );
    dlgVer.showModal();
    $(".dlg-body", dlgVer).scrollTop = 0;
  }

  /* =======================================================
     Matéria: criar / editar / excluir
     ======================================================= */
  const dlgMat = $("#dlg-materia");
  const formMat = $("#form-materia");
  let editandoMateriaId = null;
  let aoCriarMateria = null;

  function erroMateria(msg) {
    const box = $("#form-materia-error");
    box.textContent = msg || "";
    box.hidden = !msg;
  }

  function desenharCores(selecionada) {
    $("#f-mat-cores").replaceChildren(
      ...Dados.CORES.map((cor) => {
        const radio = el("input", { type: "radio", name: "cor", value: cor, "aria-label": `Cor ${cor}` });
        radio.checked = cor === selecionada;
        return el("label", { class: "swatch", style: `--cor:${cor}` }, radio, el("span"));
      })
    );
  }

  function abrirFormMateria(id = null, aoSalvar = null) {
    const alvo = id ? Dados.materiaPorId(id) : null;
    if (id && (!alvo || !Dados.sou(alvo))) { toast("Só quem criou a matéria pode editá-la."); return; }
    editandoMateriaId = id;
    aoCriarMateria = aoSalvar;
    formMat.reset();
    erroMateria("");
    const m = id ? Dados.materiaPorId(id) : null;
    $("#dlg-materia-titulo").textContent = m ? "Editar matéria" : "Nova matéria";
    $("#btn-salvar-materia").textContent = m ? "Salvar alterações" : "Criar matéria";
    desenharCores(m ? m.cor : Dados.CORES[Dados.materias.length % Dados.CORES.length]);
    $("#f-mat-nome").value = m ? m.nome : "";
    $("#f-mat-desc").value = m ? m.descricao : "";
    dlgMat.showModal();
    $("#f-mat-nome").focus();
  }

  formMat.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = $("#f-mat-nome").value.trim();
    if (!nome) { erroMateria("Informe o nome da matéria."); $("#f-mat-nome").focus(); return; }
    const repetida = Dados.materiaPorNome(nome);
    if (repetida && repetida.id !== editandoMateriaId) {
      erroMateria("Já existe uma matéria com esse nome.");
      $("#f-mat-nome").focus();
      return;
    }

    const marcada = $("input[name=cor]:checked", formMat);
    const editando = editandoMateriaId;
    const botao = $("#btn-salvar-materia");
    const rotulo = botao.textContent;
    botao.disabled = true;
    botao.textContent = "Salvando…";
    const r = await Dados.salvarMateria({
      nome, descricao: $("#f-mat-desc").value.trim(), cor: marcada ? marcada.value : Dados.CORES[0],
    }, editando);
    botao.disabled = false;
    botao.textContent = rotulo;

    if (r.erro) { erroMateria(r.erro); return; }
    dlgMat.close();
    QC.aoAlterar();
    toast(editando ? "Matéria atualizada." : "Matéria criada.");
    if (!editando && aoCriarMateria) aoCriarMateria(r.materia);
  });

  async function excluirMateria(id) {
    const m = Dados.materiaPorId(id);
    if (!m) return;
    if (!Dados.sou(m)) { toast("Só quem criou a matéria pode excluí-la."); return; }
    const qs = Dados.questionariosDa(m.nome);
    if (qs.length) {
      toast(`Esta matéria tem ${plural(qs.length, "questionário", "questionários")}. Só dá para excluir matérias vazias.`);
      return;
    }
    if (!confirm(`Excluir a matéria "${m.nome}"?`)) return;
    const r = await Dados.excluirMateria(id);
    if (r.erro) { toast(r.erro); return; }
    if (Router.atual().startsWith("/materias/")) Router.ir("/materias");
    QC.aoAlterar();
    toast("Matéria excluída.");
  }

  /* =======================================================
     Escolher questionário para responder
     ======================================================= */
  const dlgEscolher = $("#dlg-escolher");

  function escolherQuestionario() {
    const lista = $("#escolher-lista");
    if (!Dados.questionarios.length) {
      lista.replaceChildren(
        el("p", { class: "muted", text: "Você ainda não criou nenhum questionário." }),
        el("button", {
          class: "btn btn-primary", type: "button", text: "Criar questionário",
          onclick: () => { dlgEscolher.close(); abrirFormQuestionario(); },
        })
      );
    } else {
      lista.replaceChildren(
        ...Dados.questionarios.map((q) =>
          el("button", {
            class: "escolha", type: "button",
            onclick: () => { dlgEscolher.close(); Router.ir(`/responder/${q.id}`); },
          },
            el("span", { class: "escolha-titulo", text: q.titulo }),
            el("span", { class: "escolha-meta", text: `${q.materia} · ${plural(q.questoes.length, "questão", "questões")} · ${q.tempo} min` })
          )
        )
      );
    }
    dlgEscolher.showModal();
  }

  /* ---------- Fechar janelas (botão X, Cancelar ou clique no fundo) ---------- */
  $$("dialog.dlg").forEach((dlg) => {
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg || e.target.closest("[data-fechar]")) dlg.close();
    });
  });

  return {
    abrirFormQuestionario, excluirQuestionario, abrirVisualizar,
    abrirFormMateria, excluirMateria, escolherQuestionario,
  };
})();
