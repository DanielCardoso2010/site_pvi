/* =========================================================
   QuestãoCerta — telas Entrar, Criar conta, Esqueci a senha
   e Nova senha
   ========================================================= */

(() => {
  "use strict";

  const { el, ico } = QC;

  function marca() {
    return el("div", { class: "brand" },
      el("span", { class: "brand-mark" }, ico("logo", 20)),
      el("span", { class: "brand-name" }, "Questão", el("span", { text: "Certa" }))
    );
  }

  function campo(id, rotulo, { opcional = false, dica = "", span = false, ...atributos } = {}) {
    return el("div", { class: `field${span ? " span-2" : ""}` },
      el("label", { for: id }, rotulo, opcional ? el("span", { class: "opt", text: " (opcional)" }) : null),
      el("input", { id, name: id, type: "text", ...atributos }),
      dica ? el("small", { class: "dica", text: dica }) : null
    );
  }

  const primeiroNome = (nome) => String(nome || "").trim().split(/\s+/)[0] || "";

  /** Depois de entrar: atualiza o menu e abre o início. */
  function concluir(mensagem) {
    Layout.atualizar();
    Router.ir("/");
    QC.toast(mensagem);
  }

  /** Liga um formulário assíncrono ao botão (desativa enquanto processa). */
  function ligar(form, botao, rotuloBotao, rotuloOcupado, erroBox, processar) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      erroBox.hidden = true;
      const mostrar = (msg, foco) => {
        erroBox.textContent = msg;
        erroBox.hidden = false;
        const alvo = foco && form.querySelector(`#${foco}`);
        if (alvo) alvo.focus();
      };
      botao.disabled = true;
      botao.textContent = rotuloOcupado;
      try {
        await processar(mostrar);
      } catch (err) {
        console.error(err);
        mostrar(Api.traduzir(err));
      } finally {
        botao.disabled = false;
        botao.textContent = rotuloBotao;
      }
    });
  }

  const cartao = (larga, ...filhos) =>
    el("div", { class: "auth" }, el("div", { class: `auth-card${larga ? " larga" : ""}` }, marca(), ...filhos));

  /* ===================== Entrar ===================== */
  Router.registrar("/entrar", "Entrar", (view) => {
    const erro = el("p", { class: "form-error", role: "alert", hidden: true });
    const botao = el("button", { class: "btn btn-primary btn-full", type: "submit" }, "Entrar");

    const form = el("form", { class: "auth-form", novalidate: true },
      campo("a-email", "E-mail", { type: "email", autocomplete: "email", placeholder: "voce@exemplo.com", maxlength: "120" }),
      Componentes.campoSenha("a-senha", "Senha", "current-password"),
      el("a", { class: "auth-link", href: "#/esqueci", text: "Esqueci minha senha" }),
      erro,
      botao
    );

    ligar(form, botao, "Entrar", "Entrando…", erro, async (mostrar) => {
      const email = form.querySelector("#a-email").value.trim();
      const senha = form.querySelector("#a-senha").value;
      if (!email) return mostrar("Informe seu e-mail.", "a-email");
      if (!senha) return mostrar("Informe sua senha.", "a-senha");
      const r = await Auth.entrar(email, senha);
      if (r.erro) {
        form.querySelector("#a-senha").value = "";
        return mostrar(r.erro, "a-senha");
      }
      concluir(`Bem-vindo(a) de volta, ${primeiroNome(Dados.perfil.nome)}!`);
    });

    view.append(cartao(false,
      el("h1", { text: "Entrar na sua conta" }),
      el("p", { class: "auth-sub", text: "Acesse os questionários da comunidade e os seus." }),
      form,
      el("p", { class: "auth-rodape" }, "Ainda não tem conta? ", el("a", { href: "#/cadastro", text: "Criar conta" }))
    ));
    setTimeout(() => form.querySelector("#a-email")?.focus(), 0);
  });

  /* ===================== Criar conta ===================== */
  Router.registrar("/cadastro", "Criar conta", (view) => {
    const erro = el("p", { class: "form-error", role: "alert", hidden: true });
    const botao = el("button", { class: "btn btn-primary btn-full", type: "submit" }, "Criar conta");

    const form = el("form", { class: "auth-form", novalidate: true },
      el("div", { class: "form-grid" },
        campo("a-nome", "Nome completo", { span: true, autocomplete: "name", maxlength: "60", placeholder: "Como você quer ser chamado(a)", dica: "É o nome que aparece nos questionários que você publicar." }),
        campo("a-email", "E-mail", { span: true, type: "email", autocomplete: "email", maxlength: "120", placeholder: "voce@exemplo.com", dica: "Você vai usar este e-mail para entrar. Ele não aparece para os outros." }),
        campo("a-curso", "Curso ou área", { maxlength: "80", placeholder: "Ex.: Direito" }),
        campo("a-instituicao", "Instituição", { opcional: true, maxlength: "80", placeholder: "Ex.: Universidade Federal" }),
        campo("a-objetivo", "Objetivo de estudo", { opcional: true, span: true, maxlength: "80", placeholder: "Ex.: Concurso do TRT, OAB, ENEM" }),
        Componentes.campoSenha("a-senha", "Senha", "new-password", "Mínimo de 8 caracteres, com letras e números."),
        Componentes.campoSenha("a-senha2", "Confirmar senha", "new-password")
      ),
      erro,
      botao
    );

    ligar(form, botao, "Criar conta", "Criando conta…", erro, async (mostrar) => {
      const v = (id) => form.querySelector(`#${id}`).value;
      if (v("a-senha") !== v("a-senha2")) return mostrar("As senhas não são iguais.", "a-senha2");

      const r = await Auth.cadastrar({
        nome: v("a-nome"), email: v("a-email"), senha: v("a-senha"),
        curso: v("a-curso"), instituicao: v("a-instituicao"), objetivo: v("a-objetivo"),
      });
      if (r.erro) return mostrar(r.erro, { nome: "a-nome", email: "a-email", senha: "a-senha" }[r.campo]);

      if (r.confirmar) { // o projeto exige confirmar o e-mail
        view.replaceChildren(cartao(false,
          el("h1", { text: "Confirme seu e-mail" }),
          el("p", { class: "auth-sub", text: `Enviamos um link para ${r.email}. Abra o e-mail, clique no link e depois entre na sua conta. Se não achar, olhe a caixa de spam.` }),
          el("a", { class: "btn btn-primary btn-full", href: "#/entrar" }, "Ir para o login")
        ));
        return;
      }
      concluir(`Conta criada. Bem-vindo(a), ${primeiroNome(Dados.perfil.nome)}!`);
    });

    view.append(cartao(true,
      el("h1", { text: "Crie sua conta" }),
      el("p", { class: "auth-sub", text: "Leva menos de um minuto. Seu perfil aparece na tela Meu Perfil." }),
      form,
      el("p", { class: "auth-rodape" }, "Já tem conta? ", el("a", { href: "#/entrar", text: "Entrar" }))
    ));
    setTimeout(() => form.querySelector("#a-nome")?.focus(), 0);
  });

  /* ===================== Esqueci a senha ===================== */
  Router.registrar("/esqueci", "Recuperar senha", (view) => {
    const erro = el("p", { class: "form-error", role: "alert", hidden: true });
    const botao = el("button", { class: "btn btn-primary btn-full", type: "submit" }, "Enviar link");
    const form = el("form", { class: "auth-form", novalidate: true },
      campo("a-email", "E-mail da conta", { type: "email", autocomplete: "email", placeholder: "voce@exemplo.com", maxlength: "120" }),
      erro,
      botao
    );

    ligar(form, botao, "Enviar link", "Enviando…", erro, async (mostrar) => {
      const email = form.querySelector("#a-email").value.trim();
      const r = await Auth.esqueciSenha(email);
      if (r.erro) return mostrar(r.erro, "a-email");
      view.replaceChildren(cartao(false,
        el("h1", { text: "Verifique seu e-mail" }),
        el("p", { class: "auth-sub", text: "Se existir uma conta com esse e-mail, enviamos um link para criar uma nova senha. Abra o link neste mesmo navegador." }),
        el("a", { class: "btn btn-ghost btn-full", href: "#/entrar" }, "Voltar ao login")
      ));
    });

    view.append(cartao(false,
      el("h1", { text: "Recuperar senha" }),
      el("p", { class: "auth-sub", text: "Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha." }),
      form,
      el("p", { class: "auth-rodape" }, el("a", { href: "#/entrar", text: "Voltar ao login" }))
    ));
    setTimeout(() => form.querySelector("#a-email")?.focus(), 0);
  });

  /* ===================== Nova senha (depois do link do e-mail) ===================== */
  Router.registrar("/nova-senha", "Nova senha", (view) => {
    const erro = el("p", { class: "form-error", role: "alert", hidden: true });
    const botao = el("button", { class: "btn btn-primary btn-full", type: "submit" }, "Salvar nova senha");
    const form = el("form", { class: "auth-form", novalidate: true },
      Componentes.campoSenha("a-senha", "Nova senha", "new-password", "Mínimo de 8 caracteres, com letras e números."),
      Componentes.campoSenha("a-senha2", "Confirmar nova senha", "new-password"),
      erro,
      botao
    );

    ligar(form, botao, "Salvar nova senha", "Salvando…", erro, async (mostrar) => {
      const v = (id) => form.querySelector(`#${id}`).value;
      if (v("a-senha") !== v("a-senha2")) return mostrar("As senhas não são iguais.", "a-senha2");
      const r = await Auth.definirNovaSenha(v("a-senha"));
      if (r.erro) return mostrar(r.erro, "a-senha");
      try { await Dados.carregar(); } catch (err) { return mostrar(Api.traduzir(err)); }
      concluir("Senha alterada. Você já está dentro da conta.");
    });

    view.append(cartao(false,
      el("h1", { text: "Crie uma nova senha" }),
      el("p", { class: "auth-sub", text: "Escolha uma senha nova para a sua conta." }),
      form
    ));
    setTimeout(() => form.querySelector("#a-senha")?.focus(), 0);
  });
})();
