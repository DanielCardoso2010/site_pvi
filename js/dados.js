/* =========================================================
   QuestãoCerta — dados do aplicativo (Supabase)

   Guarda uma cópia em memória do que o servidor devolveu
   (matérias e questionários de TODOS, mais os salvos, o
   histórico e o perfil da pessoa logada). As telas leem
   esta cópia; as funções async abaixo gravam no servidor e
   atualizam a cópia. Todas devolvem { ok } ou { erro }.
   ========================================================= */

const Dados = (() => {
  "use strict";

  const CORES = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#14b8a6"];
  const DIFICULDADES = ["Fácil", "Médio", "Difícil"];
  const TAMANHO_PAGINA = 1000;
  const PERFIL_VAZIO = { nome: "", email: "", curso: "", instituicao: "", objetivo: "", metaDiaria: 10, foto: "" };

  const D = {
    CORES,
    DIFICULDADES,
    perfil: { ...PERFIL_VAZIO },
    perfis: new Map(),     // id -> nome (público) de quem criou conteúdo
    materias: [],
    questionarios: [],
    tentativas: [],
    ultimaCarga: 0,
  };

  const sb = () => Api.sb;
  const falha = (error) => ({ erro: Api.traduzir(error) });
  const semPermissao = (o) => ({ erro: `Você não tem permissão para ${o}.` });
  const texto = (v, max) => String(v == null ? "" : v).slice(0, max);
  const num = (v, padrao = 0) => (Number.isFinite(Number(v)) ? Number(v) : padrao);
  const meuId = () => (Auth.usuario() ? Auth.usuario().id : null);

  /* ---------- Validação (dados vindos do servidor ou de um arquivo) ---------- */
  /** Aceita só questões bem formadas, para dados estranhos nunca quebrarem a tela. */
  function limparQuestoes(lista) {
    if (!Array.isArray(lista) || !lista.length) return null;
    const saida = [];
    for (const qu of lista) {
      if (!qu || typeof qu.enunciado !== "string" || !Array.isArray(qu.alternativas)) return null;
      if (qu.alternativas.length < 2 || !qu.alternativas.every((a) => typeof a === "string")) return null;
      if (!Number.isInteger(qu.correta) || qu.correta < 0 || qu.correta >= qu.alternativas.length) return null;
      saida.push({
        enunciado: qu.enunciado,
        alternativas: qu.alternativas.slice(0, 5),
        correta: qu.correta,
        explicacao: texto(qu.explicacao, 500),
      });
    }
    return saida;
  }

  function limparQuestionarioBackup(q) {
    if (!q || typeof q.titulo !== "string" || typeof q.materia !== "string") return null;
    const questoes = limparQuestoes(q.questoes);
    if (!questoes || questoes.some((x) => x.correta >= x.alternativas.length)) return null;
    return {
      titulo: texto(q.titulo, 80).trim() || "Sem título",
      materia: texto(q.materia, 40).trim() || "Geral",
      dificuldade: DIFICULDADES.includes(q.dificuldade) ? q.dificuldade : "Médio",
      descricao: texto(q.descricao, 140),
      tempo: Math.min(600, Math.max(1, Math.round(num(q.tempo, questoes.length * 2)))),
      questoes: questoes.slice(0, 200),
    };
  }

  /* ---------- Conversão servidor -> cópia local ---------- */
  const paraMateria = (r) => ({
    id: r.id, nome: r.nome, descricao: r.descricao || "", cor: QC.corSegura(r.cor),
    criadoPor: r.criado_por || null, criadoEm: Date.parse(r.criado_em) || Date.now(),
  });

  function paraQuestionario(r, salvo = false) {
    const questoes = limparQuestoes(r.questoes);
    const materia = D.materiaPorId(r.materia_id);
    if (!questoes || !materia) return null;
    return {
      id: r.id, titulo: r.titulo, materiaId: r.materia_id, materia: materia.nome,
      dificuldade: DIFICULDADES.includes(r.dificuldade) ? r.dificuldade : "Médio",
      descricao: r.descricao || "", tempo: r.tempo, questoes,
      criadoPor: r.criado_por || null,
      autor: r.criado_por ? D.perfis.get(r.criado_por) || "Alguém" : "Ex-usuário",
      criadoEm: Date.parse(r.criado_em) || Date.now(),
      salvo,
    };
  }

  const paraTentativa = (r) => ({
    id: r.id, questionarioId: r.questionario_id || "", titulo: r.titulo, materia: r.materia || "",
    dificuldade: r.dificuldade, data: Date.parse(r.data) || Date.now(),
    acertos: r.acertos, total: r.total, segundos: r.segundos, respostas: Array.isArray(r.respostas) ? r.respostas : [],
  });

  const paraPerfil = (r, email) => ({
    nome: r.nome, email, curso: r.curso || "", instituicao: r.instituicao || "", objetivo: r.objetivo || "",
    metaDiaria: r.meta_diaria || 10, foto: r.foto || "",
  });

  /** Busca todas as linhas, página por página (o servidor devolve no máximo 1000 por vez). */
  async function todos(tabela, colunas, ordem) {
    const linhas = [];
    for (let ini = 0; ; ini += TAMANHO_PAGINA) {
      const { data, error } = await sb().from(tabela).select(colunas)
        .order(ordem, { ascending: true }).order("id", { ascending: true })
        .range(ini, ini + TAMANHO_PAGINA - 1);
      if (error) throw error;
      linhas.push(...data);
      if (data.length < TAMANHO_PAGINA) break;
    }
    return linhas;
  }

  /* ---------- Carregar / descarregar ---------- */
  D.carregar = async () => {
    const eu = Auth.usuario();
    if (!eu) throw new Error("Nenhuma pessoa logada.");

    const [rPerfil, rPublicos, linhasMaterias, linhasQuest, rSalvos, linhasTent] = await Promise.all([
      sb().from("profiles").select("*").eq("id", eu.id).maybeSingle(),
      sb().from("perfis_publicos").select("id,nome"),
      todos("materias", "*", "criado_em"),
      todos("questionarios", "id,titulo,materia_id,dificuldade,descricao,tempo,questoes,criado_por,criado_em", "criado_em"),
      sb().from("salvos").select("questionario_id"),
      todos("tentativas", "*", "data"),
    ]);
    for (const r of [rPerfil, rPublicos, rSalvos]) if (r.error) throw r.error;

    let linhaPerfil = rPerfil.data;
    if (!linhaPerfil) { // conta criada antes do gatilho existir: cria o perfil agora
      const nomePadrao = (eu.email.split("@")[0] || "Usuário").slice(0, 60);
      const ins = await sb().from("profiles").insert({ id: eu.id, nome: nomePadrao }).select().single();
      if (ins.error) throw ins.error;
      linhaPerfil = ins.data;
    }

    D.perfil = paraPerfil(linhaPerfil, eu.email);
    D.perfis = new Map(rPublicos.data.map((p) => [p.id, p.nome]));
    D.materias = linhasMaterias.map(paraMateria);
    const salvos = new Set(rSalvos.data.map((s) => s.questionario_id));
    D.questionarios = linhasQuest.map((r) => paraQuestionario(r, salvos.has(r.id))).filter(Boolean)
      .sort((a, b) => b.criadoEm - a.criadoEm);
    D.tentativas = linhasTent.map(paraTentativa);
    D.ultimaCarga = Date.now();
  };

  /** Esvazia a memória ao sair da conta. */
  D.descarregar = () => {
    D.perfil = { ...PERFIL_VAZIO };
    D.perfis = new Map();
    D.materias = [];
    D.questionarios = [];
    D.tentativas = [];
    D.ultimaCarga = 0;
  };

  /* ---------- Consultas (sem rede) ---------- */
  D.materiaPorId = (id) => D.materias.find((m) => m.id === id);

  D.materiaPorNome = (nome) => {
    const alvo = QC.normalizar(nome).trim();
    return D.materias.find((m) => QC.normalizar(m.nome).trim() === alvo);
  };

  D.corMateria = (nome) => {
    const m = D.materiaPorNome(nome);
    return QC.corSegura(m ? m.cor : "#4f46e5");
  };

  /** Este item (questionário ou matéria) foi criado pela pessoa logada? */
  D.sou = (item) => !!item && !!item.criadoPor && item.criadoPor === meuId();

  D.questionariosDa = (nomeMateria) => D.questionarios.filter((q) => q.materia === nomeMateria);

  D.resumoMateria = (m) => {
    const qs = D.questionariosDa(m.nome);
    return { questionarios: qs.length, questoes: qs.reduce((s, q) => s + q.questoes.length, 0) };
  };

  D.nomeAutor = (id) => (id ? D.perfis.get(id) || "Alguém" : "Ex-usuário");

  D.estatisticas = (itens = D.tentativas) => {
    const soma = (campo) => itens.reduce((s, t) => s + (Number(t[campo]) || 0), 0);
    const questoes = soma("total");
    const acertos = soma("acertos");
    return {
      n: itens.length, questoes, acertos, segundos: soma("segundos"),
      taxa: questoes ? Math.round((acertos / questoes) * 100) : null,
    };
  };

  const chaveDia = (ts) => new Date(ts).toLocaleDateString("sv-SE"); // AAAA-MM-DD (hora local)

  D.respondidasHoje = () => {
    const hoje = chaveDia(Date.now());
    return D.tentativas.filter((t) => chaveDia(t.data) === hoje).reduce((s, t) => s + (Number(t.total) || 0), 0);
  };

  /** Dias seguidos estudando (conta a partir de hoje ou de ontem). */
  D.sequencia = () => {
    const dias = new Set(D.tentativas.map((t) => chaveDia(t.data)));
    const dia = new Date();
    if (!dias.has(chaveDia(dia))) dia.setDate(dia.getDate() - 1);
    let n = 0;
    while (dias.has(chaveDia(dia))) { n++; dia.setDate(dia.getDate() - 1); }
    return n;
  };

  /* ---------- Matérias ---------- */
  async function recarregarMaterias() {
    D.materias = (await todos("materias", "*", "criado_em")).map(paraMateria);
  }

  /** Devolve a matéria com esse nome; cria no servidor se ainda não existir. */
  async function garantirMateria(nome, extra = {}) {
    nome = String(nome).trim();
    const existente = D.materiaPorNome(nome);
    if (existente) return { materia: existente };

    const { data, error } = await sb().from("materias")
      .insert({ nome, descricao: texto(extra.descricao, 140), cor: extra.cor ? QC.corSegura(extra.cor) : CORES[D.materias.length % CORES.length] })
      .select().single();
    if (error) {
      if (error.code === "23505") { // alguém criou ao mesmo tempo
        try { await recarregarMaterias(); } catch (e) { return falha(e); }
        const m = D.materiaPorNome(nome);
        if (m) return { materia: m };
      }
      return falha(error);
    }
    const m = paraMateria(data);
    D.materias.push(m);
    return { materia: m };
  }

  D.salvarMateria = async ({ nome, descricao, cor }, id = null) => {
    const campos = { nome: texto(nome, 40).trim(), descricao: texto(descricao, 140), cor: QC.corSegura(cor) };
    const q = id
      ? sb().from("materias").update(campos).eq("id", id).select().single()
      : sb().from("materias").insert(campos).select().single();
    const { data, error } = await q;
    if (error) {
      if (error.code === "23505") return { erro: "Já existe uma matéria com esse nome." };
      if (error.code === "PGRST116" && id) return semPermissao("editar esta matéria");
      return falha(error);
    }
    const m = paraMateria(data);
    if (id) {
      const i = D.materias.findIndex((x) => x.id === id);
      if (i >= 0) D.materias[i] = m;
      D.questionarios.forEach((qu) => { if (qu.materiaId === id) qu.materia = m.nome; });
    } else {
      D.materias.push(m);
    }
    return { ok: true, materia: m };
  };

  D.excluirMateria = async (id) => {
    const { data, error } = await sb().from("materias").delete().eq("id", id).select("id");
    if (error) {
      if (error.code === "23503") return { erro: "Essa matéria ainda tem questionários. Só dá para excluir matérias vazias." };
      return falha(error);
    }
    if (!data.length) return semPermissao("excluir esta matéria");
    D.materias = D.materias.filter((m) => m.id !== id);
    return { ok: true };
  };

  /* ---------- Questionários ---------- */
  D.salvarQuestionario = async (dados, id = null) => {
    const r = await garantirMateria(dados.materia);
    if (r.erro) return r;

    const campos = {
      titulo: dados.titulo, materia_id: r.materia.id, dificuldade: dados.dificuldade,
      descricao: dados.descricao, tempo: dados.tempo, questoes: dados.questoes,
    };
    const q = id
      ? sb().from("questionarios").update({ ...campos, atualizado_em: new Date().toISOString() }).eq("id", id).select().single()
      : sb().from("questionarios").insert(campos).select().single();
    const { data, error } = await q;
    if (error) {
      if (error.code === "PGRST116" && id) return semPermissao("editar este questionário");
      return falha(error);
    }

    const antigo = D.questionarios.find((x) => x.id === data.id);
    const item = paraQuestionario(data, antigo ? antigo.salvo : false);
    if (!item) return { erro: "O servidor devolveu um questionário inválido." };
    if (!D.perfis.has(item.criadoPor) && item.criadoPor === meuId()) { item.autor = D.perfil.nome; D.perfis.set(item.criadoPor, D.perfil.nome); }
    D.questionarios = [item, ...D.questionarios.filter((x) => x.id !== item.id)];
    return { ok: true, questionario: item };
  };

  D.excluirQuestionario = async (id) => {
    const { data, error } = await sb().from("questionarios").delete().eq("id", id).select("id");
    if (error) return falha(error);
    if (!data.length) return semPermissao("excluir este questionário");
    D.questionarios = D.questionarios.filter((q) => q.id !== id);
    return { ok: true };
  };

  /** Marca/desmarca como salvo (a tela atualiza na hora; desfaz se o servidor recusar). */
  D.alternarSalvo = async (id) => {
    const q = D.questionarios.find((x) => x.id === id);
    if (!q) return { erro: "Questionário não encontrado." };
    const novo = !q.salvo;
    q.salvo = novo;
    const { error } = novo
      ? await sb().from("salvos").insert({ questionario_id: id })
      : await sb().from("salvos").delete().eq("questionario_id", id);
    if (error && !(novo && error.code === "23505")) {
      q.salvo = !novo;
      return falha(error);
    }
    return { ok: true, salvo: novo };
  };

  /* ---------- Histórico ---------- */
  D.adicionarTentativa = async (t) => {
    const existe = D.questionarios.some((q) => q.id === t.questionarioId);
    const { data, error } = await sb().from("tentativas").insert({
      questionario_id: existe ? t.questionarioId : null,
      titulo: texto(t.titulo, 80), materia: texto(t.materia, 40), dificuldade: t.dificuldade,
      data: new Date(t.data).toISOString(), acertos: t.acertos, total: t.total, segundos: t.segundos,
      respostas: t.respostas,
    }).select().single();
    if (error) return falha(error);
    D.tentativas.push(paraTentativa(data));
    return { ok: true };
  };

  D.limparHistorico = async () => {
    const { error } = await sb().from("tentativas").delete().eq("user_id", meuId());
    if (error) return falha(error);
    D.tentativas = [];
    return { ok: true };
  };

  /* ---------- Perfil ---------- */
  async function atualizarPerfil(campos) {
    const { data, error } = await sb().from("profiles").update(campos).eq("id", meuId()).select().single();
    if (error) return falha(error);
    D.perfil = paraPerfil(data, D.perfil.email);
    D.perfis.set(meuId(), D.perfil.nome);
    D.questionarios.forEach((q) => { if (q.criadoPor === meuId()) q.autor = D.perfil.nome; });
    return { ok: true };
  }

  D.salvarPerfil = ({ nome, curso, instituicao, objetivo, metaDiaria }) =>
    atualizarPerfil({
      nome: texto(nome, 60).trim(), curso: texto(curso, 80).trim(), instituicao: texto(instituicao, 80).trim(),
      objetivo: texto(objetivo, 80).trim(), meta_diaria: metaDiaria,
    });

  D.salvarFoto = (foto) => atualizarPerfil({ foto: foto || "" });

  /* ---------- Meus dados: apagar, exportar, importar ---------- */
  D.apagarMeusQuestionarios = async () => {
    const { data, error } = await sb().from("questionarios").delete().eq("criado_por", meuId()).select("id");
    if (error) return falha(error);
    const ids = new Set(data.map((r) => r.id));
    D.questionarios = D.questionarios.filter((q) => !ids.has(q.id));
    return { ok: true, total: ids.size };
  };

  D.exportar = () => ({
    versao: 2,
    exportadoEm: new Date().toISOString(),
    materias: D.materias.map((m) => ({ nome: m.nome, descricao: m.descricao, cor: m.cor })),
    questionarios: D.questionarios.filter(D.sou).map((q) => ({
      titulo: q.titulo, materia: q.materia, dificuldade: q.dificuldade,
      descricao: q.descricao, tempo: q.tempo, questoes: q.questoes,
    })),
    tentativas: D.tentativas,
  });

  /** Envia para a sua conta os questionários de um arquivo de backup (como se você os tivesse criado). */
  D.importarBackup = async (obj) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { erro: "Arquivo de backup inválido." };
    const validos = (Array.isArray(obj.questionarios) ? obj.questionarios : [])
      .map(limparQuestionarioBackup).filter(Boolean).slice(0, 200);
    if (!validos.length) return { erro: "Nenhum questionário válido foi encontrado nesse arquivo." };

    const infoMaterias = new Map(
      (Array.isArray(obj.materias) ? obj.materias : [])
        .filter((m) => m && typeof m.nome === "string")
        .map((m) => [QC.normalizar(m.nome).trim(), m])
    );

    const linhas = [];
    for (const q of validos) {
      const r = await garantirMateria(q.materia, infoMaterias.get(QC.normalizar(q.materia).trim()) || {});
      if (r.erro) return r;
      linhas.push({
        titulo: q.titulo, materia_id: r.materia.id, dificuldade: q.dificuldade,
        descricao: q.descricao, tempo: q.tempo, questoes: q.questoes,
      });
    }

    let enviados = 0;
    for (let i = 0; i < linhas.length; i += 25) {
      const { data, error } = await sb().from("questionarios").insert(linhas.slice(i, i + 25)).select();
      if (error) return { erro: `${Api.traduzir(error)} (${enviados} de ${linhas.length} enviados)` };
      for (const r of data) {
        const item = paraQuestionario(r, false);
        if (item) { item.autor = D.perfil.nome; D.questionarios.unshift(item); }
      }
      enviados += data.length;
    }
    return { ok: true, total: enviados };
  };

  return D;
})();
