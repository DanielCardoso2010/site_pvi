/* =========================================================
   QuestãoCerta — roteador
   Troca de tela sem recarregar a página, usando o # da URL:
   #/  #/materias  #/materias/ID  #/estatisticas  #/salvos
   #/configuracoes  #/responder/ID
   ========================================================= */

const Router = (() => {
  "use strict";

  const rotas = [];
  let limpar = null;      // função de limpeza da tela atual
  let anterior = null;    // caminho da tela atual
  let ignorar = false;

  const api = {
    /** Se definida e retornar false, impede a saída da tela atual. */
    guarda: null,
    /** Recebe o caminho e devolve outro caminho para redirecionar (ou null). */
    acesso: null,
    /** O boot (login/dados) terminou? Antes disso o roteador não navega. */
    pronto: false,
  };

  const atual = () => location.hash.replace(/^#/, "") || "/";

  api.registrar = (padrao, titulo, fn) => {
    rotas.push({ re: new RegExp(`^${padrao}$`), titulo, fn });
  };

  function desenhar(manterScroll) {
    const caminho = atual();
    const y = window.scrollY;

    const desvio = api.acesso ? api.acesso(caminho) : null;
    if (desvio && desvio !== caminho) {
      location.replace(`#${desvio}`);
      return;
    }

    if (typeof limpar === "function") limpar();
    limpar = null;
    api.guarda = null;

    const view = QC.$("#view");
    view.replaceChildren();

    for (const rota of rotas) {
      const m = caminho.match(rota.re);
      if (!m) continue;
      limpar = rota.fn(view, m.slice(1).map(decodeURIComponent));
      document.title = `${rota.titulo} — QuestãoCerta`;
      window.scrollTo(0, manterScroll ? y : 0);
      anterior = caminho;
      document.dispatchEvent(new CustomEvent("rota", { detail: { caminho } }));
      return;
    }
    location.replace("#/"); // rota desconhecida
  }

  window.addEventListener("hashchange", () => {
    if (!api.pronto) return;
    if (ignorar) { ignorar = false; return; }
    if (api.guarda && anterior !== null && !api.guarda()) {
      ignorar = true;
      location.replace(`#${anterior}`);
      return;
    }
    desenhar(false);
  });

  api.resolver = () => desenhar(false);
  api.atualizar = () => desenhar(true);
  api.atual = atual;
  api.ir = (caminho) => {
    if (atual() === caminho) desenhar(false);
    else location.hash = `#${caminho}`;
  };
  /** Telas em que a busca do cabeçalho filtra o conteúdo. */
  api.usaBusca = (caminho) => /^\/(materias(\/.*)?|salvos)?$/.test(caminho);

  return api;
})();
