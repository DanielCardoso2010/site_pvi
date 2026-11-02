/* =========================================================
   QuestãoCerta — tema claro/escuro
   Carregado no <head> para aplicar o tema antes da página
   aparecer (evita o "piscar" de claro para escuro).
   A escolha é guardada no navegador (vale também na tela de login).
   ========================================================= */

const Tema = (() => {
  "use strict";

  const CHAVE = "questaocerta:tema";
  const consulta = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function modoSalvo() {
    try {
      const modo = JSON.parse(localStorage.getItem(CHAVE));
      return ["claro", "escuro", "sistema"].includes(modo) ? modo : "sistema";
    } catch (err) {
      return "sistema";
    }
  }

  let atual = modoSalvo();

  function resolver(modo) {
    if (modo === "claro" || modo === "escuro") return modo;
    return consulta && consulta.matches ? "escuro" : "claro";
  }

  function aplicar(modo) {
    atual = ["claro", "escuro", "sistema"].includes(modo) ? modo : "sistema";
    document.documentElement.setAttribute("data-tema", resolver(atual));
    try { localStorage.setItem(CHAVE, JSON.stringify(atual)); } catch (err) { /* sem espaço: ignora */ }
  }

  document.documentElement.setAttribute("data-tema", resolver(atual));

  if (consulta && consulta.addEventListener) {
    consulta.addEventListener("change", () => {
      if (atual === "sistema") aplicar("sistema");
    });
  }

  return { aplicar, modo: () => atual };
})();
