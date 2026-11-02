/* =========================================================
   QuestãoCerta — tela Configurações
   Perfil (nome, e-mail, curso, foto...), aparência (claro/
   escuro), segurança (senha) e seus dados.
   ========================================================= */

(() => {
  "use strict";

  const { el, ico } = QC;
  const TAMANHO_MAX_FOTO = 8 * 1024 * 1024; // 8 MB antes de reduzir

  /** Corta a imagem em quadrado e reduz para 256 px (economiza espaço no servidor). */
  function prepararFoto(arquivo) {
    return new Promise((resolver, rejeitar) => {
      const leitor = new FileReader();
      leitor.onerror = () => rejeitar(new Error("Não foi possível ler o arquivo."));
      leitor.onload = () => {
        const img = new Image();
        img.onerror = () => rejeitar(new Error("Esse arquivo não parece ser uma imagem válida."));
        img.onload = () => {
          const lado = Math.min(img.width, img.height);
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 256;
          canvas.getContext("2d").drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 256, 256);
          resolver(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.src = leitor.result;
      };
      leitor.readAsDataURL(arquivo);
    });
  }

  function baixarArquivo(nome, conteudo) {
    const url = URL.createObjectURL(new Blob([conteudo], { type: "application/json" }));
    const a = el("a", { href: url, download: nome });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function campo(id, rotulo, { span, ...atributos } = {}, dica = "") {
    return el("div", { class: `field${span ? " span-2" : ""}` },
      el("label", { for: id }, rotulo),
      el("input", { id, name: id, type: "text", ...atributos }),
      dica ? el("small", { class: "dica", text: dica }) : null
    );
  }

  /** Desativa o botão enquanto a ação roda. */
  async function ocupado(botao, rotuloOcupado, acao) {
    const rotulo = botao.textContent;
    botao.disabled = true;
    botao.textContent = rotuloOcupado;
    try { return await acao(); } finally { botao.disabled = false; botao.textContent = rotulo; }
  }

  Router.registrar("/configuracoes", "Configurações", (view) => {
    const p = Dados.perfil;

    /* ===================== Perfil ===================== */
    const avatarGrande = el("div", { class: "foto-atual" });
    const desenharFoto = () => avatarGrande.replaceChildren(QC.avatar(Dados.perfil, "avatar xl"));
    desenharFoto();

    const inputFoto = el("input", { type: "file", accept: "image/*", class: "visualmente-oculto", id: "f-foto" });
    const botaoRemover = el("button", { class: "btn btn-ghost btn-sm", type: "button", hidden: !p.foto }, "Remover foto");

    inputFoto.addEventListener("change", async () => {
      const arquivo = inputFoto.files[0];
      inputFoto.value = "";
      if (!arquivo) return;
      if (!arquivo.type.startsWith("image/")) { QC.toast("Escolha um arquivo de imagem."); return; }
      if (arquivo.size > TAMANHO_MAX_FOTO) { QC.toast("A imagem é grande demais. Use uma de até 8 MB."); return; }
      try {
        const r = await Dados.salvarFoto(await prepararFoto(arquivo));
        if (r.erro) { QC.toast(r.erro); return; }
        desenharFoto();
        botaoRemover.hidden = false;
        Layout.atualizar();
        QC.toast("Foto atualizada.");
      } catch (err) {
        QC.toast(err.message);
      }
    });

    botaoRemover.addEventListener("click", async () => {
      const r = await Dados.salvarFoto("");
      if (r.erro) { QC.toast(r.erro); return; }
      desenharFoto();
      botaoRemover.hidden = true;
      Layout.atualizar();
      QC.toast("Foto removida.");
    });

    const erroPerfil = el("p", { class: "form-error", role: "alert", hidden: true });
    const botaoPerfil = el("button", { class: "btn btn-primary", type: "submit" }, "Salvar perfil");
    const formPerfil = el("form", { class: "panel", novalidate: true },
      el("h2", { class: "panel-title", text: "Perfil" }),
      el("p", { class: "panel-sub", text: "Seu nome aparece como autor dos questionários que você publicar. Curso, instituição e e-mail são só seus." }),
      el("div", { class: "foto-row" },
        avatarGrande,
        el("div", { class: "foto-acoes" },
          el("div", { class: "foto-botoes" },
            el("label", { class: "btn btn-ghost btn-sm", for: "f-foto" }, ico("camera", 16), "Alterar foto"),
            botaoRemover
          ),
          el("small", { class: "dica", text: "JPG, PNG ou WebP. A imagem é cortada em quadrado." })
        ),
        inputFoto
      ),
      el("div", { class: "form-grid" },
        campo("c-nome", "Nome", { maxlength: "60", autocomplete: "name", value: p.nome }),
        campo("c-email", "E-mail", { type: "email", maxlength: "120", autocomplete: "email", value: p.email, placeholder: "voce@exemplo.com" },
          "Ao trocar, enviamos um link de confirmação para o novo e-mail."),
        campo("c-curso", "Curso ou área", { maxlength: "80", value: p.curso, placeholder: "Ex.: Direito" }),
        campo("c-instituicao", "Instituição", { maxlength: "80", value: p.instituicao, placeholder: "Ex.: Universidade Federal" }),
        campo("c-objetivo", "Objetivo de estudo", { maxlength: "80", value: p.objetivo, placeholder: "Ex.: Concurso do TRT, OAB", span: true }),
        campo("c-meta", "Meta diária de questões", { type: "number", min: "1", max: "500", value: String(p.metaDiaria) },
          "Usada na tela Minhas estatísticas.")
      ),
      erroPerfil,
      el("div", { class: "form-acoes" }, botaoPerfil)
    );

    formPerfil.addEventListener("submit", async (e) => {
      e.preventDefault();
      const v = (id) => formPerfil.querySelector(`#${id}`).value.trim();
      const mostrar = (msg, foco) => {
        erroPerfil.textContent = msg;
        erroPerfil.hidden = false;
        formPerfil.querySelector(`#${foco}`).focus();
      };
      if (v("c-nome").length < 2) return mostrar("Informe seu nome.", "c-nome");
      const meta = parseInt(v("c-meta"), 10);
      if (!(meta >= 1 && meta <= 500)) return mostrar("A meta diária deve ficar entre 1 e 500 questões.", "c-meta");
      erroPerfil.hidden = true;

      await ocupado(botaoPerfil, "Salvando…", async () => {
        const r = await Dados.salvarPerfil({
          nome: v("c-nome"), curso: v("c-curso"), instituicao: v("c-instituicao"), objetivo: v("c-objetivo"), metaDiaria: meta,
        });
        if (r.erro) return mostrar(r.erro, "c-nome");

        let aviso = "Perfil salvo.";
        if (v("c-email").toLowerCase() !== Dados.perfil.email.toLowerCase()) {
          const re = await Auth.atualizarEmail(v("c-email"));
          if (re.erro) { Layout.atualizar(); return mostrar(`Perfil salvo, mas o e-mail não mudou: ${re.erro}`, "c-email"); }
          if (re.mudou) aviso = "Perfil salvo. Enviamos um link de confirmação para o novo e-mail.";
        }
        Layout.atualizar();
        QC.toast(aviso);
      });
    });

    /* ===================== Aparência (só neste aparelho) ===================== */
    const TEMAS = [
      { valor: "claro", nome: "Claro", icone: "sol" },
      { valor: "escuro", nome: "Escuro", icone: "lua" },
      { valor: "sistema", nome: "Automático", icone: "monitor" },
    ];
    const cartoes = TEMAS.map((t) => {
      const radio = el("input", { type: "radio", name: "tema", value: t.valor });
      radio.checked = Tema.modo() === t.valor;
      const cartao = el("label", { class: `tema-card${radio.checked ? " on" : ""}` },
        radio,
        el("span", { class: `tema-prev ${t.valor}` }),
        el("span", { class: "tema-nome" }, ico(t.icone, 16), t.nome)
      );
      radio.addEventListener("change", () => {
        cartoes.forEach((c) => c.classList.toggle("on", c.querySelector("input").checked));
        Tema.aplicar(t.valor);
        QC.toast(`Tema: ${t.nome.toLowerCase()}.`);
      });
      return cartao;
    });

    const aparencia = el("section", { class: "panel" },
      el("h2", { class: "panel-title", text: "Aparência" }),
      el("p", { class: "panel-sub", text: "Vale para este aparelho. Automático acompanha o modo do sistema." }),
      el("div", { class: "tema-opcoes", role: "radiogroup", "aria-label": "Tema" }, cartoes)
    );

    /* ===================== Segurança ===================== */
    const erroSenha = el("p", { class: "form-error", role: "alert", hidden: true });
    const botaoSenha = el("button", { class: "btn btn-primary", type: "submit" }, "Alterar senha");
    const formSenha = el("form", { class: "panel", novalidate: true },
      el("h2", { class: "panel-title", text: "Segurança" }),
      el("p", { class: "panel-sub", text: "Troque a senha da sua conta. Mínimo de 8 caracteres, com letras e números." }),
      el("div", { class: "form-grid one" },
        Componentes.campoSenha("s-atual", "Senha atual", "current-password"),
        Componentes.campoSenha("s-nova", "Nova senha", "new-password"),
        Componentes.campoSenha("s-nova2", "Confirmar nova senha", "new-password")
      ),
      erroSenha,
      el("div", { class: "form-acoes" }, botaoSenha)
    );
    formSenha.addEventListener("submit", async (e) => {
      e.preventDefault();
      const v = (id) => formSenha.querySelector(`#${id}`).value;
      const falhar = (msg, foco) => {
        erroSenha.textContent = msg;
        erroSenha.hidden = false;
        formSenha.querySelector(`#${foco}`).focus();
      };
      if (!v("s-atual")) return falhar("Informe a senha atual.", "s-atual");
      if (v("s-nova") !== v("s-nova2")) return falhar("As novas senhas não são iguais.", "s-nova2");
      await ocupado(botaoSenha, "Alterando…", async () => {
        const r = await Auth.alterarSenha(v("s-atual"), v("s-nova"));
        if (r.erro) return falhar(r.erro, r.campo === "nova" ? "s-nova" : "s-atual");
        erroSenha.hidden = true;
        formSenha.reset();
        QC.toast("Senha alterada.");
      });
    });

    /* ===================== Meus dados ===================== */
    const inputBackup = el("input", { type: "file", accept: "application/json,.json", class: "visualmente-oculto", id: "f-backup" });
    inputBackup.addEventListener("change", async () => {
      const arquivo = inputBackup.files[0];
      inputBackup.value = "";
      if (!arquivo) return;
      let obj;
      try { obj = JSON.parse(await arquivo.text()); } catch (err) { QC.toast("Esse arquivo não é um backup válido."); return; }
      if (!confirm("Os questionários do arquivo serão publicados na sua conta e ficarão visíveis para todas as contas. Continuar?")) return;
      QC.toast("Enviando…");
      const r = await Dados.importarBackup(obj);
      if (r.erro) { QC.toast(r.erro); return; }
      QC.aoAlterar();
      QC.toast(`${r.total} questionário(s) importado(s).`);
    });

    const linha = (titulo, texto, ...acoes) =>
      el("div", { class: "dados-linha" },
        el("div", {}, el("strong", { text: titulo }), el("p", { text: texto })),
        el("div", { class: "dados-acoes" }, acoes)
      );

    const senhaExcluir = el("input", {
      type: "password", class: "input-inline", placeholder: "Sua senha",
      autocomplete: "current-password", "aria-label": "Senha para excluir a conta",
    });
    const botaoExcluir = el("button", { class: "btn btn-ghost btn-sm btn-danger", type: "button" }, "Excluir conta");
    botaoExcluir.addEventListener("click", async () => {
      if (!senhaExcluir.value) { QC.toast("Digite sua senha para excluir a conta."); senhaExcluir.focus(); return; }
      if (!confirm("Excluir sua conta definitivamente? Seu perfil, salvos e histórico serão apagados. Os questionários que você publicou continuam disponíveis para os outros. Não há como desfazer.")) return;
      await ocupado(botaoExcluir, "Excluindo…", async () => {
        const r = await Auth.excluirConta(senhaExcluir.value);
        if (r.erro) { QC.toast(r.erro); senhaExcluir.focus(); return; }
        QC.busca = "";
        Layout.atualizar();
        Router.ir("/entrar");
        QC.toast("Conta excluída.");
      });
    });

    const dados = el("section", { class: "panel" },
      el("h2", { class: "panel-title", text: "Meus dados" }),
      el("p", { class: "panel-sub", text: "Backup dos questionários que você criou e opções de limpeza." }),
      linha("Exportar backup", "Baixa um arquivo com os questionários que você criou e o seu histórico.",
        el("button", {
          class: "btn btn-ghost btn-sm", type: "button",
          onclick: () => baixarArquivo(`questaocerta-backup-${new Date().toLocaleDateString("sv-SE")}.json`, JSON.stringify(Dados.exportar(), null, 2)),
        }, ico("download", 16), "Exportar")),
      linha("Importar questionários", "Publica na sua conta os questionários de um arquivo de backup (inclusive de versões antigas do site).",
        el("label", { class: "btn btn-ghost btn-sm", for: "f-backup" }, ico("upload", 16), "Importar"), inputBackup),
      linha("Limpar histórico de respostas", "Zera as suas estatísticas. Os questionários continuam.",
        el("button", {
          class: "btn btn-ghost btn-sm btn-danger", type: "button",
          onclick: async (e) => {
            if (!Dados.tentativas.length) { QC.toast("Não há histórico para limpar."); return; }
            if (!confirm("Apagar todo o seu histórico de respostas? Esta ação não pode ser desfeita.")) return;
            const r = await ocupado(e.currentTarget, "Limpando…", () => Dados.limparHistorico());
            QC.toast(r.erro || "Histórico apagado.");
          },
        }, "Limpar")),
      linha("Apagar os questionários que criei", "Remove, para todos, os questionários publicados por você. Matérias e perfil continuam.",
        el("button", {
          class: "btn btn-ghost btn-sm btn-danger", type: "button",
          onclick: async (e) => {
            const meus = Dados.questionarios.filter(Dados.sou).length;
            if (!meus) { QC.toast("Você ainda não criou questionários."); return; }
            if (!confirm(`Apagar os seus ${meus} questionário(s) para TODAS as contas? Esta ação não pode ser desfeita.`)) return;
            const r = await ocupado(e.currentTarget, "Apagando…", () => Dados.apagarMeusQuestionarios());
            if (!r.erro) QC.aoAlterar();
            QC.toast(r.erro || "Questionários apagados.");
          },
        }, "Apagar")),
      linha("Excluir minha conta", "Apaga a conta, o perfil, os salvos e o histórico. Confirme com a sua senha.",
        el("div", { class: "excluir-conta" }, senhaExcluir, botaoExcluir))
    );

    view.append(el("div", { class: "page container page-estreita" },
      Componentes.cabecalho({ titulo: "Configurações", descricao: "Ajuste seu perfil, a aparência e seus dados." }),
      formPerfil, aparencia, formSenha, dados
    ));
  });
})();
