/* =========================================================
   QuestãoCerta — utilitários compartilhados (objeto global QC)
   ========================================================= */

const QC = (() => {
  "use strict";

  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));

  /** Cria um elemento. Textos sempre entram como texto puro (seguro). */
  function el(tag, props = {}, ...filhos) {
    const no = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "class") no.className = v;
      else if (k === "text") no.textContent = v;
      else if (k === "html") no.innerHTML = v; // somente para ícones fixos
      else if (k.startsWith("on")) no.addEventListener(k.slice(2), v);
      else if (v === true) no.setAttribute(k, "");
      else no.setAttribute(k, v);
    }
    for (const f of filhos.flat()) if (f != null && f !== false) no.append(f);
    return no;
  }

  /* ---------- Ícones ---------- */
  const ICONES = {
    logo: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    busca: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    mais: '<path d="M12 5v14M5 12h14"/>',
    maisCirculo: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    ajuda: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/>',
    relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    olho: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    lapis: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    lixo: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5"/>',
    play: '<path d="M7 5v14l11-7Z"/>',
    marcador: '<path d="M6 4h12v17l-6-4-6 4Z"/>',
    voltar: '<path d="M19 12H5M12 5l-7 7 7 7"/>',
    proximo: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    seta: '<path d="m9 6 6 6-6 6"/>',
    livro: '<path d="M4 19V5a2 2 0 0 1 2-2h14v14H6a2 2 0 0 0-2 2Zm0 0a2 2 0 0 0 2 2h14"/>',
    lista: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    grade: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2"/>',
    grafico: '<path d="M6 20v-7M12 20V5M18 20v-10"/>',
    engrenagem: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
    sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4Z"/><circle cx="12" cy="13" r="3.5"/>',
    sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    lua: '<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10Z"/>',
    monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    alvo: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    repetir: '<path d="M20 11a8 8 0 0 0-14.9-3M4 5v4h4M4 13a8 8 0 0 0 14.9 3M20 19v-4h-4"/>',
    raio: '<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>',
    usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  };

  function svg(nome, tam = 18, preenchido = false) {
    return `<svg viewBox="0 0 24 24" width="${tam}" height="${tam}" fill="${preenchido ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome] || ""}</svg>`;
  }
  const ico = (nome, tam, preenchido) => el("span", { class: "ico", "aria-hidden": "true", html: svg(nome, tam, preenchido) });

  /* ---------- Texto e formatação ---------- */
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

  const normalizar = (s) =>
    String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const comparar = (a, b) => String(a).localeCompare(String(b), "pt-BR");

  function gerarId() {
    return (window.crypto && crypto.randomUUID && crypto.randomUUID()) ||
      `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  const corSegura = (c) => (/^#[0-9a-f]{6}$/i.test(c) ? c : "#4f46e5");

  function fmtDuracao(seg) {
    seg = Math.max(0, Math.round(seg));
    if (seg < 60) return `${seg} s`;
    const m = Math.round(seg / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h} h ${String(r).padStart(2, "0")} min` : `${h} h`;
  }

  function fmtRelogio(seg) {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function fmtData(ts) {
    const d = new Date(ts);
    const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const hoje = new Date();
    const ontem = new Date();
    ontem.setDate(hoje.getDate() - 1);
    if (d.toDateString() === hoje.toDateString()) return `Hoje, ${hora}`;
    if (d.toDateString() === ontem.toDateString()) return `Ontem, ${hora}`;
    return `${d.toLocaleDateString("pt-BR")}, ${hora}`;
  }

  function iniciais(nome) {
    const partes = String(nome || "").trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return "?";
    const a = partes[0][0];
    const b = partes.length > 1 ? partes[partes.length - 1][0] : "";
    return (a + b).toUpperCase();
  }

  /** Avatar do perfil: foto, se houver, ou as iniciais. */
  function avatar(perfil, classe = "avatar") {
    if (perfil.foto) return el("img", { class: `${classe} avatar-img`, src: perfil.foto, alt: "" });
    return el("span", { class: classe, "aria-hidden": "true", text: iniciais(perfil.nome) });
  }

  /* ---------- Aviso ---------- */
  let temporizador;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(temporizador);
    temporizador = setTimeout(() => t.classList.remove("show"), 2800);
  }

  return {
    $, $$, el, svg, ico, plural, normalizar, comparar, gerarId, corSegura,
    fmtDuracao, fmtRelogio, fmtData, iniciais, avatar, toast,
    busca: "",          // termo da busca do cabeçalho
    aoAlterar: () => {} // definido em layout.js
  };
})();
