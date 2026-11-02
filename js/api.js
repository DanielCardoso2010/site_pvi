/* =========================================================
   QuestãoCerta — conexão com o servidor (Supabase)
   Cria o cliente uma única vez e traduz erros para português.
   ========================================================= */

const Api = (() => {
  "use strict";

  const cfg = window.QC_CONFIG || {};
  const preenchido = (v) => typeof v === "string" && v.trim() && !/^COLE_AQUI/i.test(v.trim());

  const configurado = preenchido(cfg.SUPABASE_URL) && preenchido(cfg.SUPABASE_ANON_KEY);
  const bibliotecaOk = !!(window.supabase && window.supabase.createClient);

  const sb = configurado && bibliotecaOk
    ? window.supabase.createClient(cfg.SUPABASE_URL.trim(), cfg.SUPABASE_ANON_KEY.trim(), {
        auth: {
          flowType: "pkce",          // links de e-mail voltam com ?code= (não conflita com o #/rota)
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

  /** Converte erros do Supabase em mensagens para a pessoa. */
  function traduzir(err) {
    if (err) console.error(err);
    const msg = String((err && err.message) || "");
    const codigo = err && err.code;
    if (codigo === "23505") return "Já existe um item com esse nome.";
    if (codigo === "23503") return "Não dá para excluir: ainda há itens ligados a este.";
    if (codigo === "42501" || /row-level security|permission denied/i.test(msg)) return "Você não tem permissão para fazer isso.";
    if (/failed to fetch|networkerror|load failed|fetch failed/i.test(msg)) return "Sem conexão com o servidor. Verifique sua internet e tente de novo.";
    if (/invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos.";
    if (/email not confirmed/i.test(msg)) return "Confirme seu e-mail antes de entrar: procure o link na sua caixa de entrada.";
    if (/already registered|already been registered/i.test(msg)) return "Já existe uma conta com esse e-mail. Tente entrar.";
    if (/rate limit|too many|security purposes/i.test(msg) || (err && err.status === 429)) return "Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo.";
    if (/password/i.test(msg) && /(least|short|weak|characters)/i.test(msg)) return "A senha é fraca demais. Use pelo menos 8 caracteres, com letras e números.";
    if (/same password|different from the old/i.test(msg)) return "A nova senha precisa ser diferente da atual.";
    return "Não foi possível concluir. Tente novamente em instantes.";
  }

  return { configurado, bibliotecaOk, sb, traduzir };
})();
