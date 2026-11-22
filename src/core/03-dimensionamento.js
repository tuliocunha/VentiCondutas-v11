/* ============================================================
   VENTICONDUTAS · 03-dimensionamento
   §11 Cálculo 9 fases + §12 Topologia + §13 Decompor + §14 UTAs
   §19 Locks + §19b Optimizar · N4 reexport · N6 reexport

   ALTERAÇÕES V8.0.7:
   - Correcao da verificacao de ACH
   - ACH so se aplica a G3 e G4 (exceto Sanitorios)
   - G1: estado sempre OK (critério e T11/T12)
   - G2: estado sempre OK (isento)
   - G4 Sanitorios: estado sempre OK (criterio e T13)
   - G3 e G4 Cozinha/Garagem/Balnearios: verifica ACH

   DEPENDE DE: 01-fundamentos.js + 02-biblioteca.js
   ============================================================ */
(function () {
'use strict';
const VC = window.VC;
window.VC6 = window.VC6 || {};
const VC6 = window.VC6;
VC._boot.partes.push('03-dimensionamento');

/* ============================================================
   §11 · CÁLCULO
   ============================================================ */
VC.calculo = {
  COMM_S1: VC.constantes.COMM_S1,
  COMM_S2: VC.constantes.COMM_S2,
  W1505: VC.constantes.W1505,
  H1505: VC.constantes.H1505,
  ultimo: null,
  __mig: false,
  __migEsp: false,
  _autoAssoc: false,
  _emExecucao: false,

  diametroComercial(dmm, serieRamal) {
    const lista = this.listaSerie(serieRamal);
    return lista.filter(x => x >= dmm)[0] || dmm;
  },

  /* série de diâmetros: 'S1', 'S2' ou uma lista própria («100,125,160,…» ou um array) */
  listaSerie(serie) {
    if (Array.isArray(serie)) return serie.slice().sort((a, b) => a - b);
    if (typeof serie === 'string' && /^\s*\d+([\s,;]+\d+)+\s*$/.test(serie)) { const L = serie.split(/[,;\s]+/).map(Number).filter(x => x > 0).sort((a, b) => a - b); if (L.length) return L; }
    const s = serie || VC.dados.serieDiametros || 'S1';
    return s === 'S2' ? VC.constantes.COMM_S2 : VC.constantes.COMM_S1;
  },
  serieDe(r) { const s = this.specDe(r, 'serie', null); return s === 'propria' ? this.specDe(r, 'serieLista', null) : s; },
  dimensionarConduta(Qmh, opts) {
    opts = opts || {};
    const Q = VC.utils.num(Qmh) / 3600;
    const Vmax = Number(opts.vMax) || VC.constantes.VMAX_NIVEL[1], Ralvo = VC.constantes.R_ALVO;
    const eps = opts.eps || (VC.utils.num(VC.dados.params.rugosidade) || 0.15) / 1000;
    const rho = opts.rho || 1.2;
    const nu = opts.nu || 1.5e-5;
    const metodo = opts.metodo || (VC.dados.metodoCalculo && VC.dados.metodoCalculo.metodo) || 'loss';   // Fase 2C: critério por ramal
    const evalD = (D) => {
      const A = Math.PI * D * D / 4;
      const v = A > 0 ? Q / A : 0;
      const Re = v > 0 ? v * D / nu : 0;
      const f = VC.fisica.fatorAtrito(Re, eps / D);
      const pv = 0.5 * rho * v * v;
      const R = D > 0 ? f / D * pv : 0;
      return { D, A, v, Re, f, pv, R };
    };
    let ideal;
    if (!Q) ideal = evalD(0.1);
    else if (metodo === 'loss') {
      let lo = 0.03, hi = 3;
      for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (evalD(m).R > Ralvo) lo = m; else hi = m; }
      ideal = evalD(hi);
    } else {
      ideal = evalD(Math.max(Math.sqrt(4 * Q / (Math.PI * Vmax)), 0.03));
    }
    let Dc = this.diametroComercial(ideal.D * 1000, opts.serie);
    let final = evalD(Dc / 1000);
    // v11.1: o método 'perda constante' não limitava a velocidade (Q ≥ 10 000 m³/h → 7–9 m/s, que a
    // própria auditoria marcava como ERRO). Sobe na série comercial até v ≤ vMax do nível.
    for (let i = 0; i < 40 && Q && final.v > Vmax; i++) {
      const prox = this.diametroComercial(Dc + 1, opts.serie);
      if (prox <= Dc) break;
      Dc = prox; final = evalD(Dc / 1000);
    }
    return Object.assign({}, final, { Qmh, idealD: ideal.D * 1000, Dc, metodo, vMax: Vmax });
  },

  retangular(hmax, ratioMin, vMax, Qmh, opts) {
    ratioMin = ratioMin || 0.5;
    const Q = VC.utils.num(Qmh) / 3600;
    const W1505 = VC.constantes.W1505, H1505 = VC.constantes.H1505;
    const candidatos = W1505.reduce((acc, b) => acc.concat(H1505.filter(h => h <= hmax).map(h => ({ b, h }))), [])
      .filter(c => Math.min(c.b, c.h) / Math.max(c.b, c.h) >= ratioMin && (!(opts && opts.deitada) || c.b >= c.h))   // deitada: largura ≥ altura (a forma habitual no teto)
      .sort((a, b) => { const pa = 2 * (a.b + a.h), pb = 2 * (b.b + b.h); return pa !== pb ? pa - pb : a.b * a.h - b.b * b.h; });
    // Fase 4: no método de perda constante a secção retangular também tem de cumprir R ≤ R_ALVO (como a circular)
    const comR = opts && opts.rho && opts.nu && ((VC.dados.metodoCalculo && VC.dados.metodoCalculo.metodo) || 'loss') === 'loss';
    const Rde = c => {
      const a = c.b / 1000, b = c.h / 1000, De = 1.30 * Math.pow(a * b, 0.625) / Math.pow(a + b, 0.25);
      const v = Q / (Math.PI * De * De / 4), Re = v * De / opts.nu;
      return VC.fisica.fatorAtrito(Re, (opts.eps || 0.00015) / De) / De * 0.5 * opts.rho * v * v;
    };
    for (const c of candidatos) {
      const A = (c.b * c.h) / 1e6;
      if (Q / A <= vMax && (!comR || !Q || Rde(c) <= VC.constantes.R_ALVO)) return Object.assign({}, c, { A, v: Q / A });
    }
    return null;
  },

  qP138(esp, def, A, ev) {
    const t11 = Number(def.t11) || 0, t12 = Number(def.t12) || 0, N = Number(esp.N) || 0;
    return Math.max(t11 * N, t12 * A) / Math.max(Number(ev) || 1.0, 0.1);
  },

  qEN16798(esp, def, A) {
    // EN 16798-1: q_tot = n·q_p + A·q_B, e nunca menos de 4 l/s por pessoa (Fase 4)
    const N = Number(esp.N) || 0, rp = Number(def.rp) || 0, ra = Number(def.ra) || 0;
    const mt = (VC.conhecimento.tabelas.EN16798_1 || {}).minimoPorPessoa, min = mt == null ? 4 : Number(mt) || 0;
    return Math.max((rp * N * 3.6) + (ra * A * 3.6), min * N * 3.6);
  },
  /* Fase 4: eficácia de remoção do espaço (Manual SCE, Tabela 68) ou, sem ela, a do Setup */
  evDe(esp) {
    const v = esp && esp.eficaciaRemocao;
    if (v !== undefined && v !== null && v !== '' && Number(v) > 0) return Number(v);
    return Number(VC.dados.eficaciaRemocao) || 1.0;
  },

  qMinimo(esp) { return (Number(esp.N) || 0) * 35; },

  /* ────────────────────────────────────────────────
     calcularQ_normas — V8.0.7
     ACH so se aplica a G3 e G4 (exceto Sanitorios)
     ──────────────────────────────────────────────── */
  /* grupo efetivo do espaço: o forçado pelo projetista ou o do tipo (G1–G4) */
  grupoDe(esp) { return Number(esp && (esp.grupoForcado || (VC.normas.getDef(esp.tipo) || {}).g)) || 0; },

  /* N vazio (null, undefined ou '') = ocupação por definir; 0 é um valor escolhido */
  nVazio(esp) { return !esp || esp.N == null || String(esp.N).trim() === ''; },

  calcularQ_normas(esp) {
    const ev = this.evDe(esp);   // Fase 4: por espaço
    const met = esp.geometriaMetodo || 'V';
    let A = Number(esp.A) || 0, H = Number(esp.H) || 0, V = Number(esp.V) || 0;
    if (met === 'LCH') { const L = Number(esp.largura) || 0, C = Number(esp.comprimento) || 0; A = L * C; H = Number(esp.altura) || H || 0; V = A * H; }
    else if (met === 'AH') { V = A * H; }
    else if (met === 'V') { if (!V && A > 0 && H > 0) V = A * H; }
    if (!A && V) A = V / 3.0;
    const def = VC.normas.getDef(esp.tipo);
    const g = esp.grupoForcado || def.g;
    // Decisão do autor: N vazio = «por definir» (não N = 1). O ar novo de G1 é então só T12 × A, e a app avisa (por fazer).
    const nPorDefinir = g === 1 && VC.calculo.nVazio(esp);
    const N = (g === 2 || g === 3 || g === 4 || nPorDefinir) ? 0 : (Number(esp.N) || 0);
    const isento = VC.regulamento.isencoesArNovo.indexOf(esp.tipo) >= 0;
    let Q_renov = 0, Q_extracao = 0, metodoCaudal = '';
    if (g === 4) {
      if (esp.tipo === 'Sanitários' || esp.tipo === 'Balneários') {
        const xs = VC.normas.calcExtracaoSanitaria(Object.assign({}, esp, { A, H, V }));
        Q_extracao = xs.qExtracao; metodoCaudal = xs.metodo;
      } else { Q_extracao = V * def.ach; metodoCaudal = def.t13 ? 'P138 Tabela 13 · ' + def.ach + ' renovações/hora' : 'ACH ' + def.ach + ' (boa prática; não consta da Tabela 13)'; }
    } else if (g === 2 || isento) {
      Q_renov = 0; Q_extracao = 0; metodoCaudal = 'Isento (Portaria 138-I)';
    } else if (g === 3) {
      const achMin = Number(def.ach) || 0;
      const qT12 = (Number(def.t12) || 0) * A;
      const qAch = achMin * V;
      Q_renov = Math.max(qT12, qAch) / Math.max(ev, 0.1);
      metodoCaudal = achMin > 0 ? 'P138 T12 + ACH >= ' + achMin + ' (max)' : 'P138 T12 (diluicao basal)';
    } else {
      // Portaria 138-I, Anexo II, 1.2.2 b): nos espaços de sono aplica-se só o critério da ocupação (sem T12 × A)
      const t11 = Number(def.t11) || 0, t12 = def.semT12 ? 0 : (Number(def.t12) || 0);
      Q_renov = Math.max(t11 * N, t12 * A) / Math.max(ev, 0.1);
      metodoCaudal = def.semT12 ? (nPorDefinir ? 'P138 T11 (sono; N por definir)' : 'P138 T11 (sono: só ocupação)') : (nPorDefinir ? 'P138 T12 (N por definir)' : 'P138 T11/T12');
    }
    const qEN = this.qEN16798(esp, def, A);
    const ACH = V ? (Q_renov || Q_extracao) / V : 0;

    /* ═══════════════════════════════════════════════
       V8.0.7 · CORRECAO DA VERIFICACAO DE ACH
       ACH so se aplica a G3 e G4 (exceto Sanitorios)
       G1: OK (criterio e T11/T12)
       G2: OK (isento)
       G3: verifica ACH
       G4 Cozinha/Garagem/Balnearios: verifica ACH
       G4 Sanitorios: OK (criterio e T13)
       ═══════════════════════════════════════════════ */
    let status = 'OK';

    if (g === 3 && def.ach > 0 && ACH < def.ach) {
      status = 'NÃO CONF.';
    }

    if (g === 4 && def.ach > 0 && ACH < def.ach) {
      // Fase 2: sanitários e balneários seguem a Tabela 13 (legal); as renovações/hora de boa prática não os tornam não conformes
      if (esp.tipo !== 'Sanitários' && esp.tipo !== 'Balneários') {
        status = 'NÃO CONF.';
      }
    }

    return {
      V, A, H, N, nPorDefinir,
      geometriaMetodo: met,
      tipoCaudal: g === 4 ? 'EXTRACAO' : 'RENOVACAO',
      Q_renov, Q_extracao,
      Q_normas: Q_renov || Q_extracao,
      Q_EN16798: qEN,
      ACH, achMin: def.ach,
      metodoCaudal, status,
      isento, baseLegal: 'P138',
      g, gNome: def.gn, gDesc: def.desc,
      def_Rp: def.rp, def_Ra: def.ra, def_T11: def.t11, def_T12: def.t12,
      origem: esp.origem || 'Manual'
    };
  },

  calcularQAI(esp) {
    if (!VC.flags || VC.flags.qaiProjeto === false) {
      return { QAI_projeto: 0, rede: 'insuflacao', motivo: '', origem: 'norma', g: 1 };
    }
    const v = Math.max(0, Number(esp.QAI_projeto) || 0);
    const origem = esp.QAI_projeto_origem || 'norma';
    const motivo = esp.QAI_projeto_motivo || '';
    const def = VC.normas.getDef(esp.tipo);
    const g = esp.grupoForcado || def.g || 1;
    let rede = esp.QAI_projeto_rede || 'auto';
    if (rede === 'auto') {
      const tabela = VC.conhecimento.qaiProjetoRedeDefault || VC._normativo.qaiProjetoRedeDefault || {};
      rede = tabela[g] || 'insuflacao';
    }
    return { QAI_projeto: v, rede, motivo, origem, g };
  },

  calcularQEspaco(esp) {
    const base = this.calcularQ_normas(esp);

    if (VC.flags && VC.flags.confortoTermico !== false) {
      const rphInfo = VC.rph.calcularDefault(esp);
      esp.rphDefault = rphInfo.rph;
      esp.rphClasse = rphInfo.classe;
      esp.rphClasseNome = rphInfo.classeNome;
      esp.rphBase = rphInfo.base;
      if (!esp.rphOrigem) {
        esp.rphAplicado = rphInfo.rph;
        esp.rphOrigem = 'norma';
      }
      if (esp.rphAplicado == null) esp.rphAplicado = rphInfo.rph;
    }

    const Q_ConTerm = (VC.flags && VC.flags.confortoTermico !== false)
      ? (Number(esp.rphAplicado) || 0) * base.V
      : 0;

    const qai = this.calcularQAI(esp);
    const QAI_projeto = qai.QAI_projeto;
    const QAI_rede = qai.rede;
    const QAI_motivo = qai.motivo;
    const QAI_origem = qai.origem;

    const Q_normas = base.Q_normas;
    const Q_total = Q_normas + Q_ConTerm + QAI_projeto;
    const Q_espaco = Q_total;

    return Object.assign({}, esp, base, {
      Q_espaco,
      Q_normas,
      Q_ConTerm,
      QAI_projeto,
      QAI_rede,
      QAI_motivo,
      QAI_origem,
      Q_total,
      rphDefault: esp.rphDefault,
      rphAplicado: esp.rphAplicado,
      rphOrigem: esp.rphOrigem || 'norma',
      rphClasse: esp.rphClasse,
      rphClasseNome: esp.rphClasseNome,
      rphBase: esp.rphBase,
      temConforto: Q_ConTerm > 0,
      temQAI: QAI_projeto > 0
    });
  },

  calcEspaco(esp) { return this.calcularQEspaco(esp); },

  materializar(espIdx) {
    const e = VC.dados.espacos[espIdx];
    if (!e) return { criados: 0, removidos: 0, respeitados: 0 };
    const antes = VC.dados.terminais.length;

    const defIdsAtivos = new Set((e.definicoes || []).map(d => d.id).filter(Boolean));
    VC.dados.terminais = VC.dados.terminais.filter(t => {
      if (!t.definicaoRef || t.definicaoRef.espacoId !== e.id) return true;
      const defId = t.definicaoRef.definicaoId;
      if (!defId) return true;
      return defIdsAtivos.has(defId);
    });
    const removidos = antes - VC.dados.terminais.length;

    let criados = 0;
    let respeitados = 0;
    (e.definicoes || []).forEach(def => {
      const quantidade = Number(def.quantidade) || 0;
      const Q_total = Number(def.Q_total) || 0;
      if (quantidade <= 0) return;

      const existentes = VC.dados.terminais.filter(t =>
        t.definicaoRef &&
        t.definicaoRef.espacoId === e.id &&
        t.definicaoRef.definicaoId === def.id
      );
      const nExistentes = existentes.length;

      if (nExistentes >= quantidade) {
        respeitados += nExistentes;
        return;
      }

      if (nExistentes > 0) {
        respeitados += nExistentes;
        return;
      }

      const qUnidade = Q_total / quantidade;
      const curto = String(e.nome || 'ESP').replace(/[^A-Za-z0-9]/g, '').substring(0, 8).toUpperCase();
      const prefixos = { 'Difusor': 'DIF', 'Grelha Insuflação': 'GRI', 'Grelha Extração': 'GRE', 'Difusor Linear': 'DIFL', 'Jato de Ar': 'JAT', 'Válvula': 'VAL', 'Boca de Extração': 'BEX' };
      const prefixo = prefixos[def.tipo] || (def.rede === 'extracao' || def.rede === 'extracao_suja' ? 'EXT' : 'INS');
      for (let i = 1; i <= quantidade; i++) {
        const nomeBase = prefixo + '-' + curto + '-' + i;
        let nomeFinal = nomeBase;
        let guard = 0;
        while (VC.dados.terminais.some(t => t.nome === nomeFinal) && guard++ < 50) nomeFinal = nomeBase + '_' + (guard + 1);
        const redeDef = def.rede || 'insuflacao';
        const ramalHerdado = (redeDef === 'extracao' || redeDef === 'extracao_suja') ? (e.ramalRefExtracao || '') : (e.ramalRefInsuflacao || '');
        VC.dados.terminais.push({
          id: VC.dados.nextId.terminal++,
          nome: nomeFinal,
          tipo: def.tipo,
          rede: redeDef,
          espacos: [{ nome: e.nome, Q_parcela: qUnidade }],
          ramalRef: ramalHerdado,
          fabricante: '', familia: '', tamanho: '',
          v_saida: 2.0,
          Q: 0,
          definicaoRef: { espacoId: e.id, definicaoId: def.id || null }
        });
        criados++;
      }
    });
    return { criados, removidos, respeitados };
  },

  materializarTudo() {
    if (!VC.perf.cacheMaterializacao.precisaMaterializar()) return { criados: 0, removidos: 0, cache: true };
    let c = 0, r = 0, resp = 0;
    VC.dados.espacos.forEach((e, idx) => {
      const res = this.materializar(idx);
      c += res.criados;
      r += res.removidos;
      resp += res.respeitados || 0;
    });
    return { criados: c, removidos: r, respeitados: resp };
  },

  calcularQTerminais() {
    VC.dados.terminais.forEach(t => {
      t.Q = (t.espacos || []).reduce((s, e) => s + (Number(e.Q_parcela) || 0), 0);
    });
  },

  verificarTerminal(term) {
    const Q = Number(term.Q) || 0;
    let dP = null, Lw = null, throw_ = null, origem = 'Estimado', fonte = 'VDI 2081';
    if (term.fabricante && term.familia && term.tamanho) {
      const prod = VC.catalogo.getProduto(term.tipo, term.fabricante, term.familia, term.tamanho);
      if (prod) {
        dP = VC.catalogo.interpolar(prod.curvaDP, Q);
        Lw = VC.catalogo.interpolar(prod.curvaLw, Q);
        throw_ = VC.catalogo.interpolar(prod.curvaThrow, Q);
        origem = prod.adHoc ? 'Ad Hoc' : 'Real';
        fonte = term.fabricante + ' · ' + term.familia + ' · ' + term.tamanho;
      }
    }
    const fallback = [{ Lw0: 26, dP0: 30, Q0: 200, tipo: 'Difusor' }, { Lw0: 28, dP0: 28, Q0: 200, tipo: 'Grelha Extração' }];
    const fb = fallback.find(f => f.tipo === term.tipo) || fallback[0];
    const LT = VC.constantes.TERMINAL;
    if (dP === null) { dP = fb.dP0 * Math.pow(Q / fb.Q0, 2); origem = 'Estimado'; fonte = 'estimativa (sem catálogo)'; }
    // Fase 4: num terminal de tamanho fixo o ruído cresce cerca de 50·log(Q/Q0) (antes 10·log, que o subestimava)
    if (Lw === null) Lw = fb.Lw0 + LT.expoenteLw * Math.log10(Math.max(Q, 1) / fb.Q0);
    // Fase 4: velocidade no colo calculada a partir do Ø do produto do catálogo; sem catálogo fica o valor escrito
    let v = Number(term.v_saida) || 0, vOrigem = 'escrita';
    const prod2 = (term.fabricante && term.familia && term.tamanho && VC.catalogo.getProduto) ? VC.catalogo.getProduto(term.tipo, term.fabricante, term.familia, term.tamanho) : null;
    const dmm = prod2 && Number(prod2.diametro);
    if (dmm > 0 && Q > 0) { v = Q / 3600 / (Math.PI * Math.pow(dmm / 1000, 2) / 4); vOrigem = 'calculada (Ø' + dmm + ')'; }
    let status = 'OK';
    if (v > LT.vMax || Lw > LT.LwMax) status = 'NÃO CONF.';
    else if (v > LT.vAtencao || Lw > LT.LwAtencao || dP > LT.dpAtencao) status = 'ATENÇÃO';
    return Object.assign({}, term, { LwCalc: Lw, dPCalc: dP, throwCalc: throw_ || 0, status, origem, fonte, v, vOrigem });
  },

  calcularDimensionamentoTerminais() {
    VC.dados.terminais.forEach(t => {
      const v = this.verificarTerminal(t);
      t.dPCalc = v.dPCalc; t.LwCalc = v.LwCalc; t.throwCalc = v.throwCalc; t.status = v.status;
    });
  },

  propagarCaudal() {
    const byName = {};
    VC.dados.ramais.forEach(r => { byName[r.nome] = r; });
    VC.dados.ramais.forEach(r => { r.Q_proprio = 0; r.Q_filhos = 0; r.Q = 0; });
    VC.dados.terminais.forEach(t => {
      if (!t.ramalRef) return;
      const r = byName[t.ramalRef];
      if (!r) return;
      r.Q_proprio += Number(t.Q) || 0;
    });
    const ordenados = VC.perf.ordenacaoTopologica.ordenar();
    ordenados.forEach(r => {
      const filhos = VC.dados.ramais.filter(x => x.parente === r.nome);
      r.Q_filhos = filhos.reduce((s, f) => s + (Number(f.Q) || 0), 0);
      r.Q = r.Q_proprio + r.Q_filhos;
    });
    return ordenados;
  },

  calcularDeltaPTerminalPorRamal() {
    const byName = {};
    VC.dados.ramais.forEach(r => { byName[r.nome] = r; r.deltaP_terminal = 0; });
    VC.dados.terminais.forEach(t => {
      if (!t.ramalRef) return;
      const r = byName[t.ramalRef];
      if (!r) return;
      // v11.1: terminais do mesmo ramal estão em paralelo → conta o mais desfavorável, não a soma
      r.deltaP_terminal = Math.max(r.deltaP_terminal, Number(t.dPCalc) || 0);
    });
  },

  /* ── Fase 2A: caudal variável ao longo do ramal ─────────────────────────────
     Cada ramal divide-se em troços entre derivações consecutivas (terminais próprios e sub-ramais).
     O caudal de cada troço é o que segue para jusante; a secção é escolhida troço a troço.
     Posição de uma derivação (s, em m desde o início do ramal), por esta ordem:
       1) escrita pelo utilizador: terminal.sRamal ou subRamal.sPai;
       2) planta: projeção do terminal (ou do 1.º ponto do sub-ramal) no traçado do ramal, à escala de L;
       3) sem posição: no fim do ramal (s = L). Sem nenhuma posição o ramal é um só troço, como antes. */
  _projetarNoTracado(q, pts) {
    let tot = 0, melhor = null;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy, l = Math.sqrt(l2);
      const t = l2 > 0 ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2)) : 0;
      const d = Math.hypot(q[0] - (a[0] + t * dx), q[1] - (a[1] + t * dy));
      if (!melhor || d < melhor.d) melhor = { d, s: tot + t * l };
      tot += l;
    }
    return melhor && tot > 0 ? { frac: melhor.s / tot, d: melhor.d } : null;
  },
  posicaoNoRamal(x, ramal, ehTerminal) {
    const L = Math.max(0, Number(ramal && ramal.L) || 0);
    const escrito = ehTerminal ? x.sRamal : x.sPai;
    if (escrito !== undefined && escrito !== null && String(escrito).trim() !== '' && isFinite(Number(escrito)) && Number(escrito) >= 0) return { s: Math.min(Number(escrito), L), origem: 'utilizador' };
    const pr = ramal && ramal.planta, pts = pr && Array.isArray(pr.pts) ? pr.pts : null;
    const ponto = ehTerminal ? (x.planta && x.planta.pisoId === (pr && pr.pisoId) ? [x.planta.x, x.planta.y] : null)
      : (x.planta && x.planta.pisoId === (pr && pr.pisoId) && Array.isArray(x.planta.pts) && x.planta.pts.length ? x.planta.pts[0]
        : x.prumada && x.prumada.de && x.prumada.de.pisoId === (pr && pr.pisoId) ? [x.prumada.de.x, x.prumada.de.y] : null);   // Fase 4A: prumada que sai deste ramal
    if (pts && pts.length >= 2 && ponto) { const p = this._projetarNoTracado(ponto, pts); if (p) return { s: p.frac * L, origem: 'planta' }; }
    return { s: L, origem: 'fim' };
  },
  /* Fase 4A · comprimento de uma prumada: diferença das cotas dos dois pisos; sem cotas, o pé-direito do piso de baixo */
  comprimentoPrumada(r) {
    const x = r && r.prumada; if (!x || !x.de || !x.para) return null;
    const P = VC.dados.plantas || [], a = P.find(p => p.id === x.de.pisoId), b = P.find(p => p.id === x.para.pisoId);
    if (!a || !b) return null;
    const ca = Number(a.cota), cb = Number(b.cota);
    if (a.cota != null && b.cota != null && isFinite(ca) && isFinite(cb) && ca !== cb) return { L: Math.abs(cb - ca), origem: 'cotas' };
    const baixo = a.cota != null && b.cota != null && cb < ca ? b : a, H = Number(baixo.H);
    return H > 0 ? { L: H, origem: 'pé-direito' } : null;
  },
  /* derivações de um ramal, ordenadas ao longo do percurso */
  derivacoesDe(r) {
    const out = [];
    (VC.dados.terminais || []).forEach(t => { if (t.ramalRef === r.nome) { const p = this.posicaoNoRamal(t, r, true); out.push({ tipo: 'terminal', ref: t.nome || String(t.id), Q: Number(t.Q) || 0, s: p.s, origem: p.origem, dP: Number(t.dPCalc) || 0 }); } });
    (VC.dados.ramais || []).forEach(f => { if (f.parente === r.nome && f !== r) { const p = this.posicaoNoRamal(f, r, false); f.sNoPai = p.s; f.sNoPaiOrigem = p.origem; out.push({ tipo: 'ramal', ref: f.nome, Q: Number(f.Q) || 0, s: p.s, origem: p.origem }); } });
    return out.sort((a, b) => a.s - b.s);
  },
  /* troços: [de, ate] com o caudal que passa nesse troço */
  trocosDe(r, derivs) {
    const L = Math.max(0, Number(r.L) || 0), Qtot = Number(r.Q) || 0;
    const posicionado = derivs.some(d => d.origem !== 'fim' && d.s < L - 1e-6);
    if (!posicionado || !(L > 0)) return { modo: 'simplificado', trocos: [{ de: 0, ate: L, L, Q: Qtot }] };
    const trocos = []; let prev = 0, Qr = Qtot, i = 0;
    while (i < derivs.length) {
      const s = derivs[i].s; let q = 0;
      while (i < derivs.length && Math.abs(derivs[i].s - s) < 1e-6) { q += derivs[i].Q; i++; }
      if (s > prev + 1e-6) { trocos.push({ de: prev, ate: s, L: s - prev, Q: Math.max(0, Qr) }); prev = s; }
      Qr -= q;
    }
    if (!trocos.length) trocos.push({ de: 0, ate: L, L, Q: Qtot });
    return { modo: 'posicionado', trocos };
  },
  /* Fase 2 do desenho: regras do reajuste sobre os Ø calculados troço a troço (só condutas circulares).
     · Ø fixo num troço (r.trocosFix[chave] = Ø) manda sempre.
     · Uma redução só acontece se: não foi removida (r.reducoes[chave].removida), o troço que começa
       tem ≥ minL m e o Ø desce ≥ minSaltos tamanhos da série.
     · Máximo de reduções por ramal: removem-se primeiro as de menor salto.
     · Uma redução pode ser adiada para dentro do troço (r.reducoes[chave].s, em m): o troço divide-se.
     Os troços guardam Dnom (o cálculo) e motivo (porque ficou diferente). r.reducoesCalc lista as reduções. */
  _aplicarReajuste(r, regras, rho, nu, semRegras) {
    const T = r.trocos || [];
    r.reducoesCalc = [];
    if (!T.length) return;
    const fix = r.trocosFix || {}, red = r.reducoes || {};
    const serie = this.listaSerie(this.serieDe(r));
    const idx = d => { const i = serie.indexOf(d); return i >= 0 ? i : serie.filter(x => x < d).length; };
    const W = VC.constantes.W1505, H = VC.constantes.H1505, iw = b => W.filter(x => x < b).length, ih = h => H.filter(x => x < h).length;
    const nom = t => t.secNom || { forma: 'circular', D: t.Dnom };
    const area = s => (s.forma === 'retangular' ? s.b * s.h : Math.PI * s.D * s.D / 4);
    const perim = s => (s.forma === 'retangular' ? 2 * (s.b + s.h) : Math.PI * s.D);   // conduta gasta ∝ perímetro × L
    const igual = (a, b) => a.forma === b.forma && (a.forma === 'retangular' ? a.b === b.b && a.h === b.h : a.D === b.D);
    // salto em tamanhos: na série circular; nas retangulares, tamanhos EN 1505 da largura e da altura somados
    const passos = (a, b) => (a.forma === 'circular' && b.forma === 'circular' ? idx(a.D) - idx(b.D)
      : a.forma === 'retangular' && b.forma === 'retangular' ? (iw(a.b) - iw(b.b)) + (ih(a.h) - ih(b.h)) : (area(b) < area(a) ? Infinity : 0));
    const fixo = t => this.lerSeccao(fix[t.key]);
    const extra = new Set();
    const sequencia = () => {
      const S = [];
      T.forEach((t, i) => {
        t.motivo = '';
        const f = fixo(t); if (f) { S[i] = f; t.motivo = 'secção fixa'; return; }
        const n = nom(t);
        if (i === 0 || semRegras) { S[i] = n; return; }
        const prev = S[i - 1];
        if (!(area(n) < area(prev) - 1e-9) || prev.forma !== n.forma) { S[i] = n; return; }
        if (red[t.key] && red[t.key].removida) { S[i] = prev; t.motivo = 'redução removida'; return; }
        if (regras.modo === 'marcados' && !(red[t.key] && red[t.key].marcada)) { S[i] = prev; t.motivo = 'sem redução marcada'; return; }
        if (extra.has(i)) { S[i] = prev; t.motivo = 'máximo de reduções'; return; }
        if (regras.minL > 0 && t.L < regras.minL - 1e-9) { S[i] = prev; t.motivo = 'troço curto (< ' + regras.minL + ' m)'; return; }
        if (passos(prev, n) < regras.minSaltos) { S[i] = prev; t.motivo = 'salto menor que ' + regras.minSaltos + ' tamanhos'; return; }
        S[i] = n;
      });
      return S;
    };
    let S = sequencia();
    if (regras.maxReducoes != null && !semRegras) {
      // escolher as reduções a manter que gastam menos conduta (Σ perímetro × L), com a secção de cada grupo = a do seu início
      const B = []; for (let i = 1; i < T.length; i++) if (area(S[i]) < area(S[i - 1]) - 1e-9) B.push(i);
      if (B.length > regras.maxReducoes) {
        const forcadas = new Set(B.filter(i => fixo(T[i]) || fixo(T[i - 1])));
        const k = Math.max(regras.maxReducoes, forcadas.size), n = T.length;
        const cand = [0].concat(B);
        const custo = (a, b) => { let c = 0; for (let j = a; j < b; j++) c += perim(S[a]) * T[j].L; return c; };
        const best = cand.map(() => Array(k + 1).fill(Infinity)), de = cand.map(() => Array(k + 1).fill(-1));
        best[0][0] = 0;
        for (let j = 1; j < cand.length; j++) for (let c = 1; c <= k; c++) for (let i = 0; i < j; i++) {
          if (cand.slice(i + 1, j).some(x => forcadas.has(x))) continue;
          const v = best[i][c - 1] + custo(cand[i], cand[j]); if (v < best[j][c]) { best[j][c] = v; de[j][c] = i; }
        }
        let melhor = Infinity, jf = 0, cf = 0;
        for (let j = 0; j < cand.length; j++) for (let c = 0; c <= k; c++) {
          if (!isFinite(best[j][c]) || cand.slice(j + 1).some(x => forcadas.has(x))) continue;
          const v = best[j][c] + custo(cand[j], n); if (v < melhor) { melhor = v; jf = j; cf = c; }
        }
        const manter = new Set(); for (let j = jf, c = cf; j > 0; c--) { manter.add(cand[j]); j = de[j][c]; }
        B.forEach(i => { if (!manter.has(i)) extra.add(i); });
        S = sequencia();
      }
    }
    // secções finais e reduções adiadas (dividem o troço)
    const novo = [];
    T.forEach((t, i) => {
      const prevS = i ? novo[novo.length - 1].sec : null, sc = S[i];
      const mov = red[t.key] && Number(red[t.key].s);
      if (i && prevS && area(sc) < area(prevS) - 1e-9 && mov > t.de + 1e-6 && mov < t.ate - 1e-6) {
        novo.push(Object.assign({}, t, { ate: mov, L: mov - t.de, sec: prevS, motivo: 'redução adiada', parte: 1 }));
        novo.push(Object.assign({}, t, { de: mov, L: t.ate - mov, sec: sc, parte: 2 }));
      } else novo.push(Object.assign({}, t, { sec: sc }));
    });
    r.trocos = novo.map(t => {
      const sc = t.sec; delete t.sec;
      if (igual(sc, nom(t)) && !t.parte) return t;
      const sec = this._seccao(r, t.Q, rho, nu, sc);
      return Object.assign(t, { Dcom: sc.forma === 'circular' ? sc.D : t.Dcom, forma: sec.forma, b: sec.b, h: sec.h, De: sec.De, secao: sec.secaoCalc, v: sec.v, Re: sec.Re, R: sec.R, dpLin: (sec.R || 0) * t.L });
    });
    const larg = t => (t.forma === 'retangular' ? t.b : t.Dcom), rot = t => (t.forma === 'retangular' ? t.b + '×' + t.h : 'Ø' + t.Dcom);
    for (let i = 1; i < r.trocos.length; i++) {
      const a = r.trocos[i - 1], b = r.trocos[i];
      if (rot(a) !== rot(b)) r.reducoesCalc.push({ s: b.de, key: b.key, de: larg(a), para: larg(b), deTxt: rot(a), paraTxt: rot(b), movida: b.parte === 2, aumenta: (b.forma === 'retangular' ? b.b * b.h : Math.PI * b.Dcom * b.Dcom / 4) > (a.forma === 'retangular' ? a.b * a.h : Math.PI * a.Dcom * a.Dcom / 4) });
    }
  },

  /* secção de um troço com o caudal Q. Calcula sempre as duas sugestões — circular (Ø comercial) e retangular
     (EN 1505, h ≤ altura disponível) — e adota uma:
       · forcado número → circular com esse Ø; forcado { b, h } → retangular com essas medidas;
       · senão, a forma do ramal: circular, retangular, ou automática = circular (mais barata) e retangular
         só quando o Ø (com o isolamento) não cabe na altura disponível.
     Devolve v, Re, f, R da secção adotada, a forma, Dcom (Ø da sugestão circular), b × h e as duas sugestões. */
  _avaliarCirc(D, Q, rho, nu, eps) {
    const Dm = D / 1000, A = Math.PI * Dm * Dm / 4, v = A > 0 ? Q / 3600 / A : 0, Re = v > 0 ? v * Dm / nu : 0;
    const f = VC.fisica.fatorAtrito(Re, eps / Dm), R = Dm > 0 ? f / Dm * (0.5 * rho * v * v) : 0;
    return { forma: 'circular', D, v, Re, f, R, De: D, secao: 'Ø' + D };
  },
  _avaliarRect(b, h, Q, rho, nu, eps) {
    const a = b / 1000, c = h / 1000, De = 1.30 * Math.pow(a * c, 0.625) / Math.pow(a + c, 0.25);   // diâmetro equivalente (Huebscher)
    const vDe = Q / 3600 / (Math.PI * De * De / 4), Re = vDe * De / nu, f = VC.fisica.fatorAtrito(Re, eps / De);
    return { forma: 'retangular', b, h, v: Q / 3600 / (a * c), Re, f, R: De > 0 ? f / De * (0.5 * rho * vDe * vDe) : 0, De: Math.round(De * 1000), secao: b + '×' + h };
  },
  lerSeccao(x) {   // 250 → circular; '400×200' / '400x200' → retangular; o resto → null
    if (x == null || x === '') return null;
    if (typeof x === 'number' || /^\s*\d+\s*$/.test(String(x))) { const D = Number(x); return D > 0 ? { forma: 'circular', D } : null; }
    const m = String(x).match(/^\s*(\d+)\s*[x×X*]\s*(\d+)\s*$/); return m ? { forma: 'retangular', b: Number(m[1]), h: Number(m[2]) } : null;
  },
  _seccao(r, Q, rho, nu, forcado) {
    const eps = this.rugosidadeDe(r) / 1000, vMax = this.vMaxDe(r), hMax = this.hMaxDe(r);
    const iso = this.specDe(r, 'isolamento', '') ? (Number(this.specDe(r, 'isolEsp', 0)) || 0) : 0;
    const fx = typeof forcado === 'object' && forcado ? forcado : (Number(forcado) > 0 ? { forma: 'circular', D: Number(forcado) } : null);
    const z = this.dimensionarConduta(Q, { rho, nu, vMax, eps, serie: this.serieDe(r), metodo: this.specDe(r, 'criterio', null) });
    const Dmin = Number(this.specDe(r, 'Dmin', 0)) || 0;   // Ø mínimo da especificação (ex.: 125 em obra): o calculado nunca fica abaixo
    const Dsug = Dmin > z.Dc ? this.diametroComercial(Dmin, this.serieDe(r)) : z.Dc;
    const circ = this._avaliarCirc(fx && fx.forma === 'circular' ? fx.D : Dsug, Q, rho, nu, eps);
    // sugestão retangular: deitada, até 4:1 (a proporção máxima habitual), h ≤ altura disponível menos o isolamento
    const lados = Math.max(1, Number(this.specDe(r, 'ladosMax', 4)) || 4);   // relação de lados máxima (4:1 por omissão)
    const rq = this.retangular(Math.max(0, hMax - 2 * iso), 1 / lados, vMax, Q, { rho, nu, eps, deitada: true });
    const rect = rq ? this._avaliarRect(rq.b, rq.h, Q, rho, nu, eps) : null;
    const pedida = this.formaPedida(r);
    let adot, aviso = '';
    if (fx && fx.forma === 'retangular') adot = this._avaliarRect(fx.b, fx.h, Q, rho, nu, eps);
    else if (fx) adot = circ;
    else if (pedida === 'retangular') { adot = rect || circ; if (!rect) aviso = 'Sem secção retangular com h ≤ ' + (hMax - 2 * iso) + ' mm e v ≤ ' + vMax + ' m/s — calculado como circular Ø' + circ.D; }
    else if (pedida === 'auto' && circ.D + 2 * iso > hMax && rect) adot = rect;
    else adot = circ;
    if (adot.forma === 'circular' && adot.D + 2 * iso > hMax) aviso = 'Ø' + adot.D + ' mm' + (iso ? ' + isolamento' : '') + ' não cabe na altura disponível (' + hMax + ' mm)' + (rect ? ' — sugestão retangular ' + rect.secao : '');
    if (adot.forma === 'retangular' && adot.h + 2 * iso > hMax && !aviso) aviso = adot.secao + (iso ? ' + isolamento' : '') + ' não cabe na altura disponível (' + hMax + ' mm)';
    return { v: adot.v, Re: adot.Re, f: adot.f, R: adot.R, Dcom: circ.D, De: adot.De, secaoCalc: adot.secao, forma: adot.forma, b: adot.b, h: adot.h, aviso,
      sugCirc: { D: circ.D, v: circ.v, R: circ.R, cabe: circ.D + 2 * iso <= hMax }, sugRect: rect ? { b: rect.b, h: rect.h, v: rect.v, R: rect.R, De: rect.De } : null, formaPedida: pedida };
  },

  calcularCondutas(rho, nu) {
    const unico = !!(VC.dados.metodoCalculo && VC.dados.metodoCalculo.diametroUnico);   // opção: o mesmo Ø em todo o ramal
    VC.dados.ramais.forEach(r => {
      r.vMax = this.vMaxDe(r); r.avisoSecao = '';
      r.secaoAdotada = this.formaDe(r);
      const derivs = this.derivacoesDe(r);
      const T = this.trocosDe(r, derivs);
      const travado = (r.lock && r.lock.D && r.Dcom) ? r.Dcom : null;
      // troço inicial (caudal total do ramal): define o Ø, a v e a perda singular do ramal, como antes
      const s0 = this._seccao(r, Number(r.Q) || 0, rho, nu, travado);
      r.v = s0.v; r.Re = s0.Re; r.f = s0.f; r.R = s0.R; r.Dcom = s0.Dcom; r.De = s0.De; r.secaoCalc = s0.secaoCalc; r.avisoSecao = s0.aviso;
      r.secaoAdotada = s0.forma || this.formaDe(r); r.b = s0.b; r.h = s0.h; r.sugCirc = s0.sugCirc; r.sugRect = s0.sugRect;
      const regras = this.regrasReajuste(r), unicoR = unico || regras.modo === 'unico';
      r.trocos = T.trocos.map((t, i) => {
        const sec = (i === 0 && Math.abs(t.Q - (Number(r.Q) || 0)) < 1e-9) ? s0 : this._seccao(r, t.Q, rho, nu, travado || (unicoR ? s0.Dcom : null));
        if (sec.aviso && !r.avisoSecao) r.avisoSecao = sec.aviso;
        return { de: t.de, ate: t.ate, L: t.L, Q: t.Q, Dcom: sec.Dcom, Dnom: sec.Dcom, De: sec.De, secao: sec.secaoCalc, v: sec.v, Re: sec.Re, R: sec.R, dpLin: (sec.R || 0) * t.L, key: this.chaveTroco(t.de),
          forma: sec.forma, b: sec.b, h: sec.h, secNom: sec.forma === 'retangular' ? { forma: 'retangular', b: sec.b, h: sec.h } : { forma: 'circular', D: sec.Dcom }, sugCirc: sec.sugCirc, sugRect: sec.sugRect };
      });
      this._aplicarReajuste(r, regras, rho, nu, !!(travado || unicoR));
      r.modoTrocos = T.modo;
      r.derivacoes = derivs.map(d => ({ tipo: d.tipo, ref: d.ref, Q: d.Q, s: d.s, origem: d.origem, dP: d.dP || 0 }));
      r.vMaxTrocos = r.trocos.reduce((m, t) => Math.max(m, t.Q > 0 ? (t.v || 0) : 0), Number(r.v) || 0);
      r.deltaPlin = r.trocos.reduce((s, t) => s + t.dpLin, 0);
      r.deltaPsing = (Number(r.zeta) || 0) * 0.5 * rho * (Number(r.v) || 0) * (Number(r.v) || 0);
      // perdas nas derivações ao longo do ramal: passagem direta do tê + redução/ampliação, no início de cada troço i ≥ 1
      const ZD = VC.constantes.ZETA_DERIVACAO, ext = VC.redes.ehExtracao(r.rede);
      r.trocos.forEach((t, i) => {
        t.dpTe = 0; t.dpReducao = 0;
        if (i === 0 || !(t.Q > 0)) return;
        const m = r.trocos[i - 1], vm = Number(m.v) || 0, vj = Number(t.v) || 0;
        if (vm > 0 && t.parte !== 2) t.dpTe = ZD.TE_PASSAGEM * Math.pow(1 - vj / vm, 2) * 0.5 * rho * vm * vm;   // redução adiada: no ponto não há tê
        const Am = m.Q / 3600 / Math.max(vm, 1e-9), Aj = t.Q / 3600 / Math.max(vj, 1e-9);
        if (Am > Aj * (1 + 1e-6) && vj > 0) {   // a secção muda: Aj é a menor
          const tipo = ((r.reducoes || {})[t.key] || {}).tipo || 'gradual', k = 1 - Aj / Am;
          // gradual (concêntrica ou excêntrica, ~30°): ζ da biblioteca; brusca: Borda-Carnot (expansão) e 0,5·(1 − A2/A1) (contração)
          const z = this.zetaReducao(tipo, ext, Aj / Am);
          t.dpReducao = z * 0.5 * rho * vj * vj; t.zetaReducao = z; t.tipoReducao = tipo;
        }
      });
      r.deltaPderiv = r.trocos.reduce((s, t) => s + (t.dpTe || 0) + (t.dpReducao || 0), 0);
      // superfície de conduta (m²) = perímetro × L, troço a troço; secção que aumenta no sentido em que o caudal diminui
      r.trocos.forEach(t => { t.area_m2 = (t.forma === 'retangular' ? 2 * ((t.b || 0) + (t.h || 0)) : Math.PI * (t.Dcom || 0)) / 1000 * (t.L || 0); });
      r.superficie_m2 = r.trocos.reduce((s, t) => s + t.area_m2, 0);
      r.aumentaJusante = (r.reducoesCalc || []).filter(x => x.aumenta).map(x => x.deTxt + ' → ' + x.paraTxt + ' a ' + VC.utils.fmt(x.s, 1) + ' m');
      r.deltaPTroco = r.deltaPlin + r.deltaPsing + r.deltaPderiv;
    });
  },

  /* Fase 3B · tomada de ar exterior (insuflação: ODA) ou rejeição (extração: EHA) de um equipamento.
     u.exterior = { pisoId, x, y, tipo, b, h, L, dpFab }. Proposta: tomada a 2 m/s na face, rejeição a 5 m/s
     (b = 2h, passos de 50 mm). Δp = Δp da grelha (ζ·½ρv² na área livre, ou o do catálogo) + conduta até ela. */
  ladoExterior(u) { return VC.redes.ehExtracao(u.rede) ? 'EHA' : 'ODA'; },
  propostaGrelha(Q, lado, tipo) {
    const E = VC.constantes.EXTERIOR, T = E.TIPOS[tipo] || E.TIPOS.grelha;
    const A = lado === 'ODA' ? Q / E.V_TOMADA_MAX : Q / E.V_REJEICAO_MIN;   // área de face, m²
    const passo = 50, hRaw = Math.sqrt(Math.max(A, 1e-6) / 2) * 1000;
    let h = lado === 'ODA' ? Math.ceil(hRaw / passo) * passo : Math.floor(hRaw / passo) * passo;
    h = Math.max(100, h);
    let b = lado === 'ODA' ? Math.ceil(A * 1e6 / h / passo) * passo : Math.max(100, Math.floor(A * 1e6 / h / passo) * passo);
    b = Math.max(b, h);
    return { b, h, livre: T.livre };
  },
  exteriorDe(u, Qms, rho) {
    const x = u && u.exterior; if (!x || !(Qms > 0)) return null;
    const E = VC.constantes.EXTERIOR, tipo = E.TIPOS[x.tipo] ? x.tipo : 'grelha', T = E.TIPOS[tipo], lado = this.ladoExterior(u);
    const pr = this.propostaGrelha(Qms, lado, tipo);
    const b = Number(x.b) > 0 ? Number(x.b) : pr.b, h = Number(x.h) > 0 ? Number(x.h) : pr.h;
    const A = b * h / 1e6, Al = A * T.livre, vFace = Qms / A, vLivre = Qms / Al;
    const dpGrelha = Number(x.dpFab) > 0 ? Number(x.dpFab) : T.zeta * 0.5 * rho * vLivre * vLivre;
    // conduta equipamento → grelha: medida na planta (mesmo piso) ou escrita
    let L = Number(x.L) > 0 ? Number(x.L) : 0, Lorig = L ? 'escrito' : '';
    const pl = (VC.dados.plantas || []).find(p => p.id === x.pisoId);
    if (!L && u.planta && pl && pl.escala && u.planta.pisoId === x.pisoId) { L = Math.hypot(x.x - u.planta.x, x.y - u.planta.y) * pl.escala; Lorig = 'planta'; }
    const { nu } = VC.perf && VC.perf.cacheFisica ? VC.perf.cacheFisica.rhoNu() : { nu: 1.5e-5 };
    const c = this.dimensionarConduta(Qms * 3600, { rho, nu, vMax: VC.constantes.VMAX_NIVEL[1] });
    const dpLig = L > 0 ? c.R * L + E.ZETA_LIGACAO * 0.5 * rho * c.v * c.v : 0;
    return { lado, tipo, b, h, proposta: pr, bProposto: !(Number(x.b) > 0), A, Alivre: Al, vFace, vLivre, dpGrelha, dpFab: Number(x.dpFab) > 0,
      L, Lorig, D: c.Dc, vLig: c.v, dpLig, dp: dpGrelha + dpLig, Q: Qms, avisos: [] };
  },
  /* distâncias entre rejeições e tomadas (na planta, no mesmo piso) e as regras de cada abertura */
  verificarExteriores() {
    const E = VC.constantes.EXTERIOR, U = (VC.dados.utas || []).filter(u => u.ativo !== false && u.ext && u.exterior);
    const pl = id => (VC.dados.plantas || []).find(p => p.id === id);
    U.forEach(u => {
      const x = u.ext, av = x.avisos = [];
      x.distMin = null; x.outro = null; x.distLim = null;
      if (x.lado === 'ODA' && x.vFace > E.V_TOMADA_MAX + 1e-6) av.push('tomada a ' + VC.utils.fmt(x.vFace, 1) + ' m/s na face (máximo ' + E.V_TOMADA_MAX + ' m/s): aumente a grelha');
      if (x.lado === 'EHA' && x.tipo !== 'cobertura') {
        if (u.rede === 'extracao_suja') av.push('ar sujo (EHA 3/4) rejeitado na fachada: deve sair acima da cobertura');
        if (x.Q > E.Q_REJEICAO_FACHADA_MAX + 1e-9) av.push('rejeição na fachada com ' + VC.utils.fmt(x.Q, 2) + ' m³/s (máximo ' + E.Q_REJEICAO_FACHADA_MAX + ' m³/s por abertura): divida ou leve à cobertura');
        if (x.vFace < E.V_REJEICAO_MIN - 1e-6) av.push('rejeição a ' + VC.utils.fmt(x.vFace, 1) + ' m/s na face (mínimo ' + E.V_REJEICAO_MIN + ' m/s): reduza a grelha');
      }
    });
    // pares rejeição → tomada no mesmo piso
    U.filter(u => u.ext.lado === 'EHA').forEach(r => {
      const p = pl(r.exterior.pisoId); if (!p || !p.escala) return;
      const lim = r.rede === 'extracao_suja' ? E.DIST_MIN_SUJO : E.DIST_MIN;
      U.filter(t => t.ext.lado === 'ODA' && t.exterior.pisoId === r.exterior.pisoId).forEach(t => {
        const d = Math.hypot(t.exterior.x - r.exterior.x, t.exterior.y - r.exterior.y) * p.escala;
        [r, t].forEach(o => { if (o.ext.distMin == null || d < o.ext.distMin) { o.ext.distMin = d; o.ext.outro = (o === r ? t : r).nome; o.ext.distLim = lim; } });
        if (d < lim - 1e-6) {
          const m = 'rejeição de ' + r.nome + ' a ' + VC.utils.fmt(d, 1) + ' m da tomada de ' + t.nome + ' (mínimo ' + lim + ' m' + (lim > E.DIST_MIN ? ', ar sujo' : '') + ', medido na planta)';
          r.ext.avisos.push(m); t.ext.avisos.push(m);
        }
      });
    });
  },

  /* Fase 3B · ganhos / perdas térmicas pela parede da conduta e risco de condensação (insuflação).
     Ar na conduta a tAr, envolvente (teto falso, cobertura) a tEnv com HR hrEnv; isolamento de espessura e (λ 0,035).
       U = 1/(1/hi + e/λ + 1/he) · Φ = U·S·(tEnv − tAr) · ΔT = Φ/(ρ·cp·Q) · ts = tEnv − U·(tEnv − tAr)/he
     Condensação se ts < ponto de orvalho da envolvente (+0,5 K); eMin é a espessura que a evita. */
  pontoOrvalho(t, hr) { const g = Math.log(Math.max(1, hr) / 100) + 17.62 * t / (243.12 + t); return 243.12 * g / (17.62 - g); },
  calcularTermica(rho) {
    const K = VC.constantes.TERMICA;
    (VC.dados.ramais || []).forEach(r => {
      r.termica = null;
      if (VC.redes.ehExtracao(r.rede) || !(Number(r.Q) > 0) || !(Number(r.superficie_m2) > 0)) return;
      const tAr = Number(this.specDe(r, 'tAr', K.T_AR)), tEnv = Number(this.specDe(r, 'tEnv', K.T_ENV)), hr = Number(this.specDe(r, 'hrEnv', K.HR_ENV));
      const isol = this.specDe(r, 'isolamento', ''), e = isol && isol !== 'acustico' ? (Number(this.specDe(r, 'isolEsp', 0)) || 0) / 1000 : 0;
      const U = 1 / (1 / K.HI + e / K.LAMBDA + 1 / K.HE), S = Number(r.superficie_m2), dT0 = tEnv - tAr;
      const phi = U * S * dT0, dT = phi / (rho * K.CP * Number(r.Q) / 3600);
      const ts = tEnv - U * dT0 / K.HE, td = this.pontoOrvalho(tEnv, hr);
      const risco = dT0 > 0 && ts < td + K.MARGEM_ORVALHO;
      let eMin = null;
      if (risco) {
        const Umax = K.HE * (tEnv - td - K.MARGEM_ORVALHO) / dT0;
        eMin = Umax > 0 ? Math.ceil(Math.max(0, K.LAMBDA * (1 / Umax - 1 / K.HI - 1 / K.HE)) * 1000 / 5) * 5 : null;
      }
      r.termica = { tAr, tEnv, hr, e: e * 1000, U, phi, dT, ts, td, risco, eMin };
    });
  },

  /* Fase 2C: fugas nas condutas pela classe de estanquidade (EN 12237 / EN 1507; EN 16798-3 ATC):
       f = c · p^0,65 · 10⁻³  m³/(s·m²),  c = 0,027 (A) · 0,009 (B) · 0,003 (C) · 0,001 (D)
     p = pressão do percurso crítico que passa no ramal (majorante: é a pressão à saída do equipamento).
     Fugas do ramal = f × superfície de conduta; as do equipamento somam os ramais que serve. */
  /* ζ da mudança de secção, referido à velocidade da secção menor; ar = área menor / área maior.
     Extração: o ar passa do troço menor para o maior (expansão); insuflação: contração. */
  zetaReducao(tipo, ext, ar) {
    const ZD = VC.constantes.ZETA_DERIVACAO, k = Math.max(0, 1 - ar);
    if (tipo === 'brusca') return ext ? k * k : 0.5 * k;   // Borda-Carnot · contração brusca
    return ext ? ZD.REDUCAO.expansao * k * k : ZD.REDUCAO.contracao;   // gradual (~30°), concêntrica ou excêntrica
  },
  CLASSES_ESTANQUIDADE: { A: 0.027, B: 0.009, C: 0.003, D: 0.001 },
  calcularFugas() {
    const R = VC.dados.ramais || [], byName = {}; R.forEach(r => { byName[r.nome] = r; });
    const raiz = r => { let x = r, g = 0; while (x && x.parente && byName[x.parente] && g++ < 60) x = byName[x.parente]; return x; };
    (VC.dados.utas || []).forEach(u => { u.Q_fugas = 0; u.fugasDefinidas = 0; u.fugasRamais = 0; });
    R.forEach(r => {
      const cl = this.specDe(r, 'estanquidade', ''), c = this.CLASSES_ESTANQUIDADE[cl];
      r.classeEstanquidade = cl || ''; r.p_fugas = Math.max(0, Number(r.deltaPCritico) || 0);
      r.Q_fugas = c ? c * Math.pow(r.p_fugas, 0.65) * 1e-3 * (Number(r.superficie_m2) || 0) * 3600 : null;
      const u = (VC.dados.utas || []).find(x => x.id === (raiz(r) || {}).utaRef);
      if (u) { u.fugasRamais++; if (r.Q_fugas != null) { u.Q_fugas += r.Q_fugas; u.fugasDefinidas++; } }
    });
  },

  /* Δp do início do ramal até à posição s (perda singular de entrada + troços até s + tês e reduções antes de s) */
  dpAte(r, s) {
    const trocos = r.trocos || [{ de: 0, ate: Number(r.L) || 0, dpLin: Number(r.deltaPlin) || 0, L: Number(r.L) || 0 }];
    let dp = Number(r.deltaPsing) || 0;
    trocos.forEach(t => {
      const ov = Math.max(0, Math.min(s, t.ate) - t.de);
      if (ov > 0 && t.L > 0) dp += t.dpLin * ov / t.L;
      if (t.de < s - 1e-9) dp += (t.dpTe || 0) + (t.dpReducao || 0);   // a derivação no início do troço fica a montante de s
    });
    return dp;
  },

  calcularDeltaPAcumulado() {
    const byName = {};
    VC.dados.ramais.forEach(r => { byName[r.nome] = r; });
    // Δp da UTA até ao ponto onde o ramal sai do pai (sem posições: o fim do pai, como antes)
    const inicio = (r, guard) => {
      const pai = byName[r.parente];
      if (!pai || pai === r || (guard || 0) > 100) return 0;
      const s = (r.sNoPai != null && isFinite(r.sNoPai)) ? r.sNoPai : (Number(pai.L) || 0);
      return inicio(pai, (guard || 0) + 1) + this.dpAte(pai, s);
    };
    VC.dados.ramais.forEach(r => {
      const ini = inicio(r);
      r.deltaPInicio = ini;
      const acc = ini + (r.deltaPTroco || 0);
      r.deltaPAcumulado = acc;
      // terminais ao longo do ramal: Δp até à sua posição + Δp do terminal (o mais desfavorável)
      const term = (r.derivacoes || []).filter(d => d.tipo === 'terminal').reduce((m, d) => Math.max(m, this.dpAte(r, d.s) + (d.dP || 0)), 0);
      // (sem posições: todos os terminais no fim → acumulado + Δp do pior terminal, como antes)
      // Fase 2: filtro, bateria e recuperador são componentes da UTA (uta.componentes → Δp interno).
      // Os campos antigos do ramal (deltaP_filtro/_bateria/_recup) já não entram aqui: contavam-se duas vezes.
      // O registo de regulação do ramal é perda exterior à UTA e continua a contar.
      r.deltaPtotal = Math.max(0, ini + Math.max(r.deltaPTroco || 0, term)
        + (Number(r.deltaP_registo) || 0));
      r.status = r.deltaPtotal < 200 ? 'OK' : r.deltaPtotal < 300 ? 'ATENÇÃO' : 'NÃO CONF.';
    });
    // v11.1: Δp crítico a jusante = maior deltaPtotal na sub-árvore do ramal (incluindo o próprio).
    // É o valor que o ventilador tem de vencer a partir deste ramal; nunca é menor no pai do que num filho.
    // (deltaPtotal é a perda ACUMULADA desde a UTA e por isso cresce para jusante.)
    VC.dados.ramais.forEach(r => { r.deltaPCritico = r.deltaPtotal || 0; });
    const ordem = VC.dados.ramais.slice().sort((a, b) => this._profundidade(b, byName) - this._profundidade(a, byName));
    ordem.forEach(r => { const pai = byName[r.parente]; if (pai && pai !== r) pai.deltaPCritico = Math.max(pai.deltaPCritico || 0, r.deltaPCritico || 0); });
  },

  /* v11.1: parâmetros de cada ramal (forma, rugosidade, altura disponível, velocidade máxima) */
  /* forma pedida: 'circular', 'retangular' ou 'auto' (circular, que é mais barata; retangular só se a circular não couber) */
  formaPedida(r) { const f = r && r.geometriaInput && r.geometriaInput.forma; return f === 'retangular' || f === 'circular' ? f : 'auto'; },
  formaDe(r) { return this.formaPedida(r) === 'retangular' ? 'retangular' : 'circular'; },
  // v11.2: a rugosidade e a altura disponível vêm do Setup. Cada ramal guardava uma cópia (0,15 mm, 250 mm)
  // feita quando foi criado, e por isso mudar o Setup não tinha efeito. O valor do ramal só conta se for
  // marcado como próprio (geometriaInput.proprio.rugosidade / .H_max = true).
  _proprio(r, campo) {
    const g = r && r.geometriaInput;
    return !!(g && g.proprio && g.proprio[campo] && Number(g[campo]) > 0);
  },
  /* Fase 0 do desenho (E12, herança): o valor próprio de um ramal passa aos sub-ramais que não têm o seu.
     Devolve o ramal (ele próprio ou um antecessor) que define o campo, ou null (vale o Setup). */
  origemPropria(r, campo) {
    const R = (VC.dados && VC.dados.ramais) || [];
    let x = r, guard = 0;
    while (x && guard++ < 60) {
      if (this._proprio(x, campo)) return x;
      const pai = x.parente;
      x = pai ? R.find(y => y.nome === pai && y !== x) : null;
    }
    return null;
  },
  /* Fase 2 do desenho: especificação da conduta e regras do reajuste, herdadas do ramal-pai.
     r.especificacao = { serie, estanquidade, isolamento, isolEsp, reajuste, minL, maxReducoes, minSaltos } */
  origemSpec(r, campo) {
    const R = (VC.dados && VC.dados.ramais) || [];
    let x = r, guard = 0;
    while (x && guard++ < 60) {
      const e = x.especificacao;
      if (e && e[campo] !== undefined && e[campo] !== null && e[campo] !== '') return x;
      const pai = x.parente;
      x = pai ? R.find(y => y.nome === pai && y !== x) : null;
    }
    return null;
  },
  specDe(r, campo, omissao) { const o = this.origemSpec(r, campo); return o ? o.especificacao[campo] : omissao; },
  regrasReajuste(r) {
    const n = (c, d) => { const v = Number(this.specDe(r, c, d)); return isFinite(v) ? v : d; };
    return { modo: this.specDe(r, 'reajuste', 'derivacao'), minL: Math.max(0, n('minL', 0)), maxReducoes: this.specDe(r, 'maxReducoes', null) == null ? null : Math.max(0, Math.round(n('maxReducoes', 0))), minSaltos: Math.max(1, Math.round(n('minSaltos', 1))) };
  },
  chaveTroco(de) { return (Math.round((Number(de) || 0) * 100) / 100).toFixed(2); },
  rugosidadeDe(r) {
    const o = this.origemPropria(r, 'rugosidade');
    if (o) return Number(o.geometriaInput.rugosidade);
    return VC.utils.num(VC.dados.params && VC.dados.params.rugosidade) || 0.15;
  },
  hMaxDe(r) {
    const o = this.origemPropria(r, 'H_max');
    if (o) return Number(o.geometriaInput.H_max);
    return Number(VC.dados.restricaoH) || 250;
  },
  vMaxDe(r) {
    const n = (r && (r.nivelNumero || VC.utils.nivelTextoParaNumero(r.nivel))) || 2;
    const t = (VC.constantes && VC.constantes.VMAX_NIVEL) || {};
    return Number(t[n]) || 6;
  },

  _profundidade(r, byName) {
    let d = 0, p = r.parente, guard = 0;
    while (p && byName[p] && guard++ < 100) { d++; p = byName[p].parente; }
    return d;
  },

  calcularVentiladores() {
    const rho = VC.fisica.rho(VC.dados.params.temperatura, VC.dados.params.humidade, VC.dados.params.altitude);
    // v11.1: a rede decide (como no resto da app). O nome/tipo do terminal já não conta.
    const isExt = t => t.rede === 'extracao' || t.rede === 'extracao_suja';
    const ins = VC.dados.terminais.filter(t => !isExt(t)).reduce((s, t) => s + (Number(t.Q) || 0), 0);
    const ext = VC.dados.terminais.filter(isExt).reduce((s, t) => s + (Number(t.Q) || 0), 0);
    const porRede = { insuflacao: null, extracao: null };
    VC.dados.utas.forEach(uta => {
      if (uta.ativo === false) return;
      // v11.1: o caudal da UTA é a soma dos ramais RAIZ da sua rede. Cada ramal já inclui o
      // caudal dos filhos (propagarCaudal), por isso somar todos os níveis contava o ar várias vezes.
      let ramaisServidos = VC.dados.ramais.filter(r => r.utaRef === uta.id);
      if (!ramaisServidos.length) ramaisServidos = VC.dados.ramais.filter(r => r.tipo === 'Principal' && (r.rede || 'insuflacao') === uta.rede);
      const nomesServidos = new Set(ramaisServidos.map(r => r.nome));
      const raizes = ramaisServidos.filter(r => !r.parente || !nomesServidos.has(r.parente));
      const Qms = raizes.reduce((s, r) => s + (Number(r.Q) || 0), 0) / 3600;
      const dpRede = ramaisServidos.reduce((m, r) => Math.max(m, Number(r.deltaPtotal) || 0), 0);
      // Fase 3B: tomada / rejeição na fachada e a conduta até ela (só se estiver desenhada)
      uta.ext = this.exteriorDe(uta, Qms + (Number(uta.Q_fugas) || 0) / 3600, rho);
      const dpExt = dpRede + (uta.ext ? uta.ext.dp : 0);
      uta.dpRede = dpRede;
      const comps = uta.componentes || [];
      let dpInt = 0;
      comps.forEach(c => {
        if (/filtro/i.test(c.tipo || '')) {
          if (VC.dados.filtros.modo === 'sujo') dpInt += Number(c.deltaP_final != null ? c.deltaP_final : c.deltaP) || 0;
          else if (VC.dados.filtros.modo === 'medio') dpInt += ((Number(c.deltaP) || 0) + (Number(c.deltaP_final) || 0)) / 2;
          else dpInt += Number(c.deltaP) || 0;
        } else dpInt += Number(c.deltaP) || 0;
      });
      const eta = uta.eta || 0.65;
      const fs = uta.fs || 1.15;
      const trans = uta.transmissao || 1.0;
      const sfpInt = eta > 0 ? dpInt / eta : Infinity;
      // Fase 3 · o ventilador move o caudal servido + as fugas da rede (classe de estanquidade, calcularFugas)
      const Qvent = Qms + (Number(uta.Q_fugas) || 0) / 3600;
      uta.Q_ventilador_mh = Qvent * 3600;
      const P_eixo = Qvent * (dpInt + dpExt) / Math.max(eta, 0.01);
      const P_motor = P_eixo * fs / Math.max(trans, 0.01);
      uta.Q = Qms; uta.dpInt = dpInt; uta.dpExt = dpExt;
      uta.sfpInt = sfpInt; uta.P_motor = P_motor;
      // Fase 3 · Ecodesign: Δp interno de conformidade = só filtros (limpos) e recuperador; sem bateria, silenciador, etc.
      uta.dpIntEco = comps.reduce((s, c) => s + (/filtro|recupera/i.test((c.tipo || '') + ' ' + (c.nome || '')) && !/ventilador/i.test(c.tipo || '') ? (Number(c.deltaP) || 0) : 0), 0);
      uta.sfpIntEco = eta > 0 ? uta.dpIntEco / eta : Infinity;
      // Fase 3 · EN 16798-3: SFP_E do ventilador completo = potência elétrica / caudal (sem o fator de serviço)
      uta.sfpE = Qvent > 0 ? (dpInt + dpExt) / Math.max(eta, 0.01) / Math.max(trans, 0.01) : 0;   // P/Q com o caudal do ventilador
      uta.sfpCategoria = Qms > 0 ? VC.normas.categoriaSFP(uta.sfpE) : null;
      uta.sfpClass = VC.normas.classificarSFP(VC.normas.tipoUVPadrao(uta), uta.sfpIntEco, Qms, uta.etaRec, VC.normas.correcaoFiltrosF(uta.rede === 'insuflacao' ? comps : null, uta.rede === 'insuflacao' ? null : comps));
      uta.status = uta.sfpClass.conforme ? 'OK' : 'NÃO CONF.';
      if (uta.curva && uta.curva.length >= 2 && VC.uta && VC.uta.calcularPontoFuncionamento) uta.pontoFunc = VC.uta.calcularPontoFuncionamento(uta.rede, uta);
      const chaveRede = (uta.rede === 'insuflacao') ? 'insuflacao' : 'extracao';
      const atual = porRede[chaveRede];
      if (!atual || dpExt > atual.maxPerda) porRede[chaveRede] = { maxPerda: dpExt, Qnom: Qms };
    });
    this.classificarUVB();
    this.verificarExteriores();
    return { ins, ext, bal: ins - ext, porRede };
  },

  /* Fase 3 · Reg. (UE) 1253/2014: uma UVB (unidade bidirecional com recuperador) tem as duas metades — insuflação e
     extração — modeladas como duas UTAs. O SFPint e o limite são da unidade inteira:
       SFPint = Δp_int,ins / η_ins + Δp_int,ext / η_ext   (filtros limpos, só filtros e recuperador)
       limite com qnom = o maior dos dois caudais, η do recuperador da insuflação e F dos filtros dos dois lados.
     Par: uta.uvbPar (id da outra metade) ou, sem ele, a única UTA ativa do outro lado, com recuperador e a mesma zona. */
  parUVB(u) {
    const ehUVB = x => x && x.ativo !== false && /^BVU/.test(VC.normas.tipoUVPadrao(x));
    if (!ehUVB(u)) return null;
    const lado = x => x.rede === 'insuflacao' ? 'ins' : (x.rede === 'extracao' ? 'ext' : 'outro');
    const U = VC.dados.utas || [];
    const ladoPar = x => (x.rede === 'insuflacao' ? 'ins' : 'ext');   // par escolhido: a extração de ar sujo também é o lado da extração
    if (u.uvbPar) { const p = U.find(x => x.id === u.uvbPar); return (p && p !== u && ehUVB(p) && ladoPar(p) !== ladoPar(u)) ? p : null; }
    const pedidoPorOutra = U.find(x => x !== u && x.uvbPar === u.id && ehUVB(x));
    if (pedidoPorOutra) return ladoPar(pedidoPorOutra) !== ladoPar(u) ? pedidoPorOutra : null;
    if (lado(u) === 'outro' || !u.zona) return null;
    const cands = U.filter(x => x !== u && ehUVB(x) && !x.uvbPar && lado(x) !== 'outro' && lado(x) !== lado(u) && x.zona === u.zona);
    return cands.length === 1 ? cands[0] : null;
  },
  classificarUVB() {
    (VC.dados.utas || []).forEach(u => { u.uvbParNome = null; u.uvbSemPar = false; });
    (VC.dados.utas || []).forEach(u => {
      if (u.ativo === false || !/^BVU/.test(VC.normas.tipoUVPadrao(u))) return;
      const p = this.parUVB(u);
      if (!p) { u.uvbSemPar = true; return; }
      u.uvbSemPar = false;
      const ins = u.rede === 'insuflacao' ? u : p, ext = ins === u ? p : u;
      const sfp = (ins.sfpIntEco || 0) + (ext.sfpIntEco || 0);
      const F = VC.normas.correcaoFiltrosF(ins.componentes || [], ext.componentes || []);
      const c = VC.normas.classificarSFP(VC.normas.tipoUVPadrao(ins), sfp, Math.max(ins.Q || 0, ext.Q || 0), ins.etaRec, F);
      c.par = ins.nome + ' + ' + ext.nome;
      c.nota += ' Unidade inteira: ' + ins.nome + ' (' + Math.round(ins.sfpIntEco || 0) + ') + ' + ext.nome + ' (' + Math.round(ext.sfpIntEco || 0) + ') = ' + Math.round(sfp) + ' W/(m³/s).';
      u.sfpClass = c; u.uvbParNome = p.nome;
      u.status = c.conforme ? 'OK' : 'NÃO CONF.';
    });
  },

  calcularTudo() {
    if (this._emExecucao) { VC.debug && VC.debug.aviso && VC.debug.aviso('calcularTudo reentrada bloqueada'); return this.ultimo || {}; }
    this._emExecucao = true;
    try {
      const props = VC.perf.cacheFisica.rhoNu();
      const rho = props.rho;
      const nu = props.nu;
      this._normalizarReferencias();

      if (VC.flags && VC.flags.confortoTermico !== false && VC.rph && VC.rph.aplicarATodos) {
        VC.rph.aplicarATodos();
      }
      if (VC.flags && VC.flags.qaiProjeto !== false && VC.qai && VC.qai.aplicarATodos) {
        VC.qai.aplicarATodos();
      }

      if (!this._autoAssoc) {
        const inferir = (espaco, rede) => {
          const loc = espaco.localizacao || VC.utils.parseZona(espaco.zona || '');
          const piso = (loc.piso || 'P0').toLowerCase();
          const ala = (loc.ala || '').toLowerCase();
          let c = VC.dados.ramais.find(r => r.rede === rede && r.tipo === 'Sub-ramal' && r.nome.toLowerCase().includes(piso) && (ala ? r.nome.toLowerCase().includes(ala) : true));
          if (!c) c = VC.dados.ramais.find(r => r.rede === rede && r.tipo === 'Sub-ramal' && r.nome.toLowerCase().includes(piso));
          if (!c) c = VC.dados.ramais.find(r => r.rede === rede && r.tipo === 'Principal');
          return c ? c.nome : '';
        };
        VC.dados.espacos.forEach(e => {
          const c = this.calcularQEspaco(e);
          if (!c.Q_espaco || c.Q_espaco <= 0) return;
          if (c.tipoCaudal === 'EXTRACAO') {
            if (!e.ramalRefExtracao || !VC.dados.ramais.some(r => r.nome === e.ramalRefExtracao)) e.ramalRefExtracao = inferir(e, VC.redes.extracaoDe(e));
          } else {
            if (!e.ramalRefInsuflacao || !VC.dados.ramais.some(r => r.nome === e.ramalRefInsuflacao)) e.ramalRefInsuflacao = inferir(e, 'insuflacao');
          }
        });
      }

      VC.dados.espacos.forEach(e => {
        const c = this.calcularQEspaco(e);
        e.Q_espaco = c.Q_espaco;
        e.Q_normas = c.Q_normas;
        e.Q_ConTerm = c.Q_ConTerm;
        e.QAI_projeto = c.QAI_projeto;
        e.QAI_rede = c.QAI_rede;
        e.Q_total = c.Q_total;
        e.Q_renov = c.Q_renov;
        e.Q_extracao = c.Q_extracao;
        e.ACH = c.ACH;
        e.g = c.g;
        e.isento = c.isento;
        e.metodoCaudal = c.metodoCaudal;
        e.status = c.status;
        e.tipoCaudal = c.tipoCaudal;
        e.rphDefault = c.rphDefault;
        e.rphAplicado = c.rphAplicado;
        e.rphOrigem = c.rphOrigem;
        e.rphClasse = c.rphClasse;
        e.rphClasseNome = c.rphClasseNome;
        e.rphBase = c.rphBase;
        e.temConforto = c.temConforto;
        e.temQAI = c.temQAI;
      });

      this.materializarTudo();
      this.calcularQTerminais();
      this.calcularDimensionamentoTerminais();
      this.propagarCaudal();
      this.calcularDeltaPTerminalPorRamal();
      this.calcularCondutas(rho, nu);
      this.calcularDeltaPAcumulado();
      this.calcularTermica(rho);
      this.calcularFugas();   // antes dos ventiladores: o ventilador move o caudal servido + as fugas da rede
      const vent = this.calcularVentiladores();
      // Fase 4: área das grelhas de transferência sempre com o Cd atual (projetos antigos guardavam a área antiga)
      if (VC6.transferencias && VC6.transferencias.dimensionarArea) (VC.dados.transferencias || []).forEach(t => { if (!t.areaFixa && Number(t.Q) > 0) t.area_cm2 = VC6.transferencias.dimensionarArea(t.Q, t.dP_Pa || 2); });
      const findings = [];

      VC.dados.ramais.forEach(r => {
        if (r.Re >= 2300 && r.Re < 4000) findings.push({ severidade: 'ATENÇÃO', tipo: 'Reynolds crítico', elemento: r.nome, msg: 'Re=' + VC.utils.fmt(r.Re, 0) });
        const vMax = this.vMaxDe(r);   // v11.1: mesmo limite por nível que o dimensionamento
        const vPior = Math.max(Number(r.v) || 0, Number(r.vMaxTrocos) || 0);   // Fase 2A: o troço mais rápido do ramal
        if (vPior > vMax + 1e-6) findings.push({ severidade: 'ERRO', tipo: 'Velocidade excessiva', elemento: r.nome, msg: 'v=' + VC.utils.fmt(vPior, 2) + ' m/s > ' + vMax + ' m/s (' + VC.utils.nivelRotulo(r.nivelNumero, true) + ')' });
        if (r.avisoSecao) findings.push({ severidade: 'ATENÇÃO', tipo: 'Secção da conduta', elemento: r.nome, msg: r.avisoSecao });
      });

      // v11.1: um 'parente' que não corresponde a nenhum ramal faz o filho ser ignorado em silêncio
      // (o pai perde o caudal e a perda desse filho). Assinalar sempre.
      const nomesRamais = new Set(VC.dados.ramais.map(r => r.nome));
      VC.dados.ramais.forEach(r => {
        if (r.parente && !nomesRamais.has(r.parente)) findings.push({ severidade: 'ERRO', tipo: 'Ramal órfão', elemento: r.nome, msg: 'Pai "' + r.parente + '" não existe — caudal e Δp deste ramal não são somados ao pai' });
      });

      // auditoria A1/B2 · contrato I5: a rede tem de chegar a todos os terminais, na mesma rede (VC.redes).
      // Um terminal sem ramal não entra no caudal de nenhuma UTA: a entrega não pode dizer «sem avisos».
      const ramalPorNome = new Map(VC.dados.ramais.map(r => [r.nome, r]));
      const espDesenhado = new Set((VC.dados.espacos || []).filter(e => e.planta && e.planta.pts && e.planta.pts.length >= 3).map(e => e.nome));
      const temPlantas = (VC.dados.plantas || []).length > 0;
      VC.dados.terminais.forEach(t => {
        const nomeT = t.nome || String(t.id), q = VC.utils.fmt(Number(t.Q) || 0, 0), r = t.ramalRef ? ramalPorNome.get(t.ramalRef) : null;
        if (!r) findings.push({ severidade: 'ERRO', tipo: 'Terminal sem ramal', elemento: nomeT, msg: (t.ramalRef ? 'Ramal «' + t.ramalRef + '» não existe' : 'Não está ligado a nenhum ramal') + ': os ' + q + ' m³/h deste terminal não chegam a nenhuma UTA — ligue-o a um ramal de ' + VC.redes.rotulo(t.rede) });
        else if (!VC.redes.compativeis(t.rede, r.rede)) findings.push({ severidade: 'ERRO', tipo: 'Terminal noutra rede', elemento: nomeT, msg: 'Terminal de ' + VC.redes.rotulo(t.rede) + ' ligado ao ramal «' + r.nome + '», de ' + VC.redes.rotulo(r.rede) });
        if (temPlantas && !t.planta && (t.espacos || []).some(x => espDesenhado.has(x.nome))) findings.push({ severidade: 'ATENÇÃO', tipo: 'Terminal fora da planta', elemento: nomeT, msg: 'A sala está desenhada mas o terminal não: coloque-o com a ferramenta Terminal (D)' });
      });
      // A3 (rede própria): um ramal pertence à rede da sua UTA e do seu pai — redes misturadas somam ar que não se pode misturar
      const utaPorId = new Map((VC.dados.utas || []).map(u => [u.id, u]));
      VC.dados.ramais.forEach(r => {
        const u = r.utaRef ? utaPorId.get(r.utaRef) : null, pai = r.parente ? ramalPorNome.get(r.parente) : null;
        if (u && !VC.redes.compativeis(r.rede, u.rede)) findings.push({ severidade: 'ERRO', tipo: 'Ramal noutra rede', elemento: r.nome, msg: 'Ramal de ' + VC.redes.rotulo(r.rede) + ' servido pela UTA «' + u.nome + '», de ' + VC.redes.rotulo(u.rede) });
        else if (pai && !VC.redes.compativeis(r.rede, pai.rede)) findings.push({ severidade: 'ERRO', tipo: 'Ramal noutra rede', elemento: r.nome, msg: 'Ramal de ' + VC.redes.rotulo(r.rede) + ' com o pai «' + pai.nome + '», de ' + VC.redes.rotulo(pai.rede) });
      });
      // ── regras de exaustão (Portaria 138-I, Anexo II, 1.2.2 h; RT-SCIE, Portaria 1532/2008; SCE) ──
      const filhos = {}; VC.dados.ramais.forEach(r => { if (r.parente) (filhos[r.parente] = filhos[r.parente] || []).push(r); });
      const subarvore = raiz => { const out = [], pilha = [raiz]; while (pilha.length) { const r = pilha.pop(); out.push(r); (filhos[r.nome] || []).forEach(f => pilha.push(f)); } return out; };
      const espPorNome = new Map((VC.dados.espacos || []).map(e => [e.nome, e]));
      const ehSanitaria = e => !!e && /^(Sanitários|Balneários)$/.test(e.tipo);
      const espacosDaRede = ramaisDaRede => { const nomes = new Set(ramaisDaRede.map(r => r.nome)), out = new Map(); VC.dados.terminais.forEach(t => { if (nomes.has(t.ramalRef)) (t.espacos || []).forEach(x => { const e = espPorNome.get(x.nome); if (e) out.set(e.nome, e); }); }); return [...out.values()]; };
      // 3 · a rede de exaustão das instalações sanitárias é independente: não serve outros espaços (1.2.2 h)
      VC.dados.ramais.filter(r => !r.parente && VC.redes.ehExtracao(r.rede)).forEach(raiz => {
        const E = espacosDaRede(subarvore(raiz)), outros = E.filter(e => !ehSanitaria(e));
        if (E.some(ehSanitaria) && outros.length) findings.push({ severidade: 'ERRO', tipo: 'Exaustão sanitária partilhada', elemento: raiz.nome, msg: 'A rede ' + raiz.nome + ' extrai instalações sanitárias e também ' + outros.slice(0, 3).map(e => '«' + e.nome + '»').join(', ') + (outros.length > 3 ? ' e mais ' + (outros.length - 3) : '') + ': as instalações sanitárias têm condutas de exaustão independentes (Portaria 138-I, Anexo II, 1.2.2 h)' });
      });
      // 4 · recuperação de calor com ar das instalações sanitárias: admitida se o projetista garantir que o ar novo não é contaminado (SCE)
      VC.dados.utas.forEach(u => {
        if (u.ativo === false || !(u.componentes || []).some(c => /recupera/i.test(c.tipo || c.nome || ''))) return;
        let raizes = VC.dados.ramais.filter(r => r.utaRef === u.id && !r.parente);
        if (!raizes.length) raizes = VC.dados.ramais.filter(r => r.tipo === 'Principal' && (r.rede || 'insuflacao') === u.rede);
        const San = espacosDaRede([].concat(...raizes.map(subarvore))).filter(ehSanitaria);
        if (San.length) findings.push({ severidade: 'ATENÇÃO', tipo: 'Recuperação de calor com ar sanitário', elemento: u.nome, msg: 'A UTA ' + u.nome + ' tem recuperador e extrai ' + San.length + ' instalação(ões) sanitária(s): o projetista tem de garantir que o ar novo não é contaminado (SCE, Portaria 138-I)' });
      });
      // 2 · garagem: extração do RT-SCIE por veículo (controlo de CO); sem n.º de lugares fica por fazer.
      //     Só é parque de estacionamento (UT II, arts. 180.º–183.º) a partir de 200 m² de área bruta
      //     (ANEPC, Nota Técnica 01/2021); abaixo disso a garagem segue a UT onde está e os 300/600 m³/h
      //     por veículo ficam como referência de boa prática (aviso, não erro).
      (VC.dados.espacos || []).filter(e => e.tipo === 'Garagem').forEach(e => {
        const n = Number(e.lugares) || 0, qo = VC6.balanco && VC6.balanco.QOutDireto ? VC6.balanco.QOutDireto(e) : 0;
        const Amin = VC.constantes.GARAGEM_UT2_AREA_MIN, A = Number(e.A) || 0;
        if (A < Amin) {
          if (!(n > 0)) return;
          const nota = 'Garagem com ' + VC.utils.fmt(A, 1) + ' m² (< ' + Amin + ' m²): não é parque de estacionamento (UT II; ANEPC, Nota Técnica 01/2021, e RJ-SCIE art. 10.º, n.º 3, m)) e segue as regras da utilização-tipo onde está. Os 300/600 m³/h por veículo do RT-SCIE (art. 183.º) ficam como referência de boa prática';
          if (qo < 300 * n) findings.push({ severidade: 'ATENÇÃO', tipo: 'Garagem abaixo da boa prática', elemento: e.nome, msg: 'Extração ' + VC.utils.fmt(qo, 0) + ' m³/h < 300 × ' + n + ' = ' + VC.utils.fmt(300 * n, 0) + ' m³/h. ' + nota + '.' });
          else if (qo < 600 * n) findings.push({ severidade: 'ATENÇÃO', tipo: 'Garagem abaixo da boa prática', elemento: e.nome, msg: 'Extração ' + VC.utils.fmt(qo, 0) + ' m³/h cumpre 300 × ' + n + ' mas não 600 × ' + n + ' = ' + VC.utils.fmt(600 * n, 0) + ' m³/h. ' + nota + '.' });
          return;
        }
        if (!(n > 0)) { findings.push({ severidade: 'POR FAZER', tipo: 'Lugares da garagem por definir', elemento: e.nome, msg: 'Escreva o número de lugares: o RT-SCIE pede 300 m³/h por veículo a 50 ppm de CO e 600 m³/h por veículo a 100 ppm' }); return; }
        if (qo < 300 * n) findings.push({ severidade: 'ERRO', tipo: 'Garagem abaixo do RT-SCIE', elemento: e.nome, msg: 'Extração ' + VC.utils.fmt(qo, 0) + ' m³/h < 300 × ' + n + ' = ' + VC.utils.fmt(300 * n, 0) + ' m³/h (1.º patamar, 50 ppm de CO; Portaria 1532/2008)' });
        else if (qo < 600 * n) findings.push({ severidade: 'ERRO', tipo: 'Garagem abaixo do RT-SCIE', elemento: e.nome, msg: 'Extração ' + VC.utils.fmt(qo, 0) + ' m³/h cumpre o 1.º patamar (300 × ' + n + ') mas não o 2.º, a 100 ppm de CO: 600 × ' + n + ' = ' + VC.utils.fmt(600 * n, 0) + ' m³/h. O sistema tem de garantir os dois patamares (RT-SCIE, art. 183.º)' });
      });
      // higiene do ar: nenhuma transferência leva ar de um espaço sujo para um mais limpo (regra de VC6.transferencias)
      if (window.VC6 && VC6.transferencias && VC6.transferencias.direcaoValida) {
        const espPorId = new Map((VC.dados.espacos || []).map(e => [e.id, e]));
        // G4 em depressão (princípio P4; Portaria 138-I, Anexo II, 1.2.2 h): extração direta > insuflação direta
        (VC.dados.espacos || []).forEach(e => {
          if (this.grupoDe(e) !== 4 || !VC6.balanco || !VC6.balanco.QOutDireto) return;
          const qi = VC6.balanco.QInDireto(e), qo = VC6.balanco.QOutDireto(e);
          const fonte = /^(Sanitários|Balneários)$/.test(e.tipo) ? 'Portaria 138-I, Anexo II, 1.2.2 h)' : 'G4 «Extração Dedicada», princípio P4 e limites de pressão da app';
          if ((qi > 0 || qo > 0) && qo <= qi) findings.push({ severidade: 'ERRO', tipo: 'G4 sem depressão', elemento: e.nome, msg: 'Extração ' + VC.utils.fmt(qo, 0) + ' m³/h ≤ insuflação ' + VC.utils.fmt(qi, 0) + ' m³/h: o espaço tem de estar em depressão, com o ar a entrar por transferência (' + fonte + ')' });
        });
        (VC.dados.transferencias || []).forEach(t => {
          const de = espPorId.get(t.deId), para = espPorId.get(t.paraId);
          if (de && para && !VC6.transferencias.direcaoValida(de, para).ok) findings.push({ severidade: 'ERRO', tipo: 'Transferência de espaço sujo', elemento: de.nome + ' → ' + para.nome, msg: 'O ar de um espaço sujo não pode passar para um espaço mais limpo: inverta a direção ou remova a transferência' });
        });
      }
      VC.dados.ramais.forEach(r => {
        if (!(Number(r.Q) > 0)) findings.push({ severidade: 'ATENÇÃO', tipo: 'Ramal sem caudal', elemento: r.nome, msg: 'Q = 0 m³/h: nenhum terminal ligado a este ramal nem aos seus sub-ramais' });
      });

      const totalPower = VC.dados.utas.reduce((s, u) => s + (Number(u.P_motor) || 0), 0);
      // v11.2: tipologia ainda não implementada (Residencial, Saúde, Indústria)
      if (VC.normas.TIPOLOGIAS_EM_IMPLEMENTACAO.indexOf(VC.normas.tipologiaAtual()) >= 0) findings.push({ severidade: 'ATENÇÃO', tipo: 'Tipologia em implementação', elemento: 'Sistema', msg: VC.normas.rotuloTipologia(VC.normas.tipologiaAtual()) + ': a app ainda só aplica as regras de Comércio e Serviços (Portaria 138-I). Confirmar os caudais com o regulamento desta tipologia.' });
      // v11.1 (E3): ventilador escolhido não chega ao caudal de projeto
      VC.dados.utas.forEach(u => {
        const pf = u.pontoFunc;
        if (u.ativo !== false && pf && pf.foraDaCurva) findings.push({ severidade: 'ATENÇÃO', tipo: 'Ventilador fora da curva', elemento: u.nome, msg: 'Q de projeto ' + VC.utils.fmt(pf.QprojMh, 0) + ' m³/h > fim da curva ' + VC.utils.fmt(pf.QmaxCurva, 0) + ' m³/h' + (u.curvaFabricante ? ' (' + u.curvaFabricante.modelo + ')' : '') + ' — escolher um ventilador maior' });
      });
      // Fase 3: o DL 101-D (SACE ≥ 290 kW) aplica-se à potência TÉRMICA nominal global, não à dos ventiladores
      const pTerm = VC.normas.potenciaTermicaW();
      if (pTerm != null && pTerm >= VC.constantes.DL101D.SGTC) findings.push({ severidade: 'ATENÇÃO', tipo: 'BACS', elemento: 'Sistema', msg: 'Potência térmica ' + VC.utils.fmt(pTerm / 1000, 0) + ' kW ≥ ' + VC.constantes.DL101D.SGTC / 1000 + ' kW: sistema de automatização e controlo (SACE) obrigatório (DL 101-D/2020)' });
      // ── Fase 5 · Portaria 138-I, Anexo II: requisitos dos sistemas ──
      const PS = VC.constantes.P138_SISTEMAS, ativas = VC.dados.utas.filter(u => u.ativo !== false);
      const insU = ativas.filter(u => u.rede === 'insuflacao'), QinsTot = insU.reduce((s, u) => s + (Number(u.Q) || 0) * 3600, 0);
      const temRec = u => (u.componentes || []).some(c => /recupera/i.test((c.tipo || '') + ' ' + (c.nome || ''))) && u.recuperadorAtivo !== false;
      // 2.3 c) recuperação de energia ≥ 50 % no ar de rejeição quando a potência térmica rejeitada > 80 kW
      const pRej = VC.normas.potenciaRejeitadaW();
      if (pRej != null && pRej > PS.REJEICAO_RECUPERACAO_W) ativas.filter(u => VC.redes.ehExtracao(u.rede)).forEach(u => {
        const etaR = Number(u.etaRec) || 0;
        if (!temRec(u) || etaR < PS.ETA_RECUPERACAO_MIN) findings.push({ severidade: u.rede === 'extracao_suja' ? 'ATENÇÃO' : 'ERRO', tipo: 'Recuperação de calor obrigatória', elemento: u.nome, msg: 'Potência térmica rejeitada ' + VC.utils.fmt(pRej / 1000, 0) + ' kW > ' + PS.REJEICAO_RECUPERACAO_W / 1000 + ' kW: o ar de rejeição tem de ter recuperação de energia com η ≥ ' + Math.round(PS.ETA_RECUPERACAO_MIN * 100) + ' % no aquecimento (Portaria 138-I, Anexo II, 2.3 c)' + (temRec(u) ? '; η do recuperador = ' + Math.round(etaR * 100) + ' %' : '; esta UTA não tem recuperador') + (u.rede === 'extracao_suja' ? '. Extração sanitária: a recuperação é admitida se o ar novo não for contaminado.' : '') });
      });
      // 2.3 b) free-cooling nos sistemas tudo-ar com caudal de insuflação somado > 10 000 m³/h
      if (QinsTot > PS.FREE_COOLING_M3H) insU.forEach(u => { if (!u.freeCooling && u.tudoAr !== false) findings.push({ severidade: 'ATENÇÃO', tipo: 'Free-cooling', elemento: u.nome, msg: 'Insuflação somada ' + VC.utils.fmt(QinsTot, 0) + ' m³/h > ' + VC.utils.fmt(PS.FREE_COOLING_M3H, 0) + ' m³/h: num sistema tudo-ar o free-cooling é obrigatório (Portaria 138-I, Anexo II, 2.3 b). Marque «Free-cooling» na UTA ou «não é tudo-ar».' }); });
      // 1.5 b) i) caudal de ar novo variável (CO₂ e/ou presença) com potência de climatização > 100 kW
      if (pTerm != null && pTerm > PS.CAUDAL_VARIAVEL_W) insU.forEach(u => { if (!u.controloCaudal) findings.push({ severidade: 'ATENÇÃO', tipo: 'Caudal variável de ar novo', elemento: u.nome, msg: 'Potência de climatização ' + VC.utils.fmt(pTerm / 1000, 0) + ' kW > ' + PS.CAUDAL_VARIAVEL_W / 1000 + ' kW: se a ocupação média for < 50 % da máxima, o caudal de ar novo tem de variar com CO₂ e/ou presença (Portaria 138-I, Anexo II, 1.5 b). Indique o controlo na UTA.' }); });
      // 1.5 c) ventilação com ar novo ≥ 3000 m³/h integrável num sistema de gestão técnica
      if (QinsTot >= PS.GT_AR_NOVO_M3H && !(VC.dados.params && VC.dados.params.integracaoGT)) findings.push({ severidade: 'ATENÇÃO', tipo: 'Integração em gestão técnica', elemento: 'Sistema', msg: 'Ar novo ' + VC.utils.fmt(QinsTot, 0) + ' m³/h ≥ ' + VC.utils.fmt(PS.GT_AR_NOVO_M3H, 0) + ' m³/h: a ventilação tem de ser integrável num sistema de gestão técnica (Portaria 138-I, Anexo II, 1.5 c). Confirme no Setup.' });
      // Fase 5 · escadas pressurizadas (RT-SCIE, art. 161.º; EN 12101-13)
      (VC.dados.espacos || []).filter(e => e.tipo === 'Escadas' && e.pressurizada).forEach(e => {
        const r = VC.normas.verificarEscadaPressurizada(e);
        if (e.deltaP === undefined || e.deltaP === null || e.deltaP === '') { findings.push({ severidade: 'POR FAZER', tipo: 'Escada pressurizada por definir', elemento: e.nome, msg: 'Indique a sobrepressão com as portas fechadas (20–80 Pa), a velocidade na porta aberta e a força de abertura da porta.' }); return; }
        r.falhas.forEach(f => findings.push({ severidade: 'ERRO', tipo: 'Escada pressurizada', elemento: e.nome, msg: f }));
        if (r.porFazer.length) findings.push({ severidade: 'POR FAZER', tipo: 'Escada pressurizada por definir', elemento: e.nome, msg: 'Falta: ' + r.porFazer.join(' e ') + ' (RT-SCIE, art. 161.º; EN 12101-13).' });
      });
      VC.dados.utas.forEach(u => { if (u.ativo !== false && u.ext) u.ext.avisos.forEach(m => findings.push({ severidade: 'ATENÇÃO', tipo: u.ext.lado === 'ODA' ? 'Tomada de ar exterior' : 'Rejeição para o exterior', elemento: u.nome, msg: m + ' (EN 13779, A.2; EN 16798-3).' })); });
      VC.dados.ramais.forEach(r => { if (r.termica && r.termica.risco) findings.push({ severidade: 'ATENÇÃO', tipo: 'Risco de condensação', elemento: r.nome, msg: 'superfície a ' + VC.utils.fmt(r.termica.ts, 1) + ' °C, abaixo do ponto de orvalho ' + VC.utils.fmt(r.termica.td, 1) + ' °C da envolvente: isolamento térmico ≥ ' + r.termica.eMin + ' mm.' }); });
      VC.dados.utas.forEach(u => {
        if (u.ativo !== false && u.uvbSemPar && /^BVU/.test(VC.normas.tipoUVPadrao(u)) && (u.rede === 'insuflacao' || u.rede === 'extracao')) findings.push({ severidade: 'ATENÇÃO', tipo: 'UVB sem par', elemento: u.nome, msg: 'Unidade bidirecional com recuperador: o SFPint do Ecodesign é da unidade inteira, mas não se encontrou a UTA do outro lado (mesma zona ou campo «Par UVB»). Só esta metade foi verificada.' });
        // ar sujo (copa, IS) a passar num recuperador: só sem transferência entre circuitos
        if (u.ativo !== false && u.rede === 'extracao_suja' && /^BVU/.test(VC.normas.tipoUVPadrao(u)) && u.recuperadorAtivo !== false) findings.push({ severidade: 'ATENÇÃO', tipo: 'Recuperador com ar sujo', elemento: u.nome, msg: 'A extração de ar sujo passa no recuperador desta unidade: use recuperador de placas ou de fluxos cruzados, estanque entre circuitos (sem roda entálpica), para não devolver cheiros e gorduras à insuflação.' });
      });

      // instalações sanitárias: regime da Tabela 13 e aparelhos (pública) por definir → «por fazer»
      VC.dados.espacos.forEach(e => {
        const nAp = (Number(e.numUrinois) || 0) + (Number(e.numSanitas) || 0) + (Number(e.numDuches) || 0);
        // balneário = instalação pública da Tabela 13 (normal por omissão; intensiva em teatros, cinemas, escolas, desporto)
        if (e.tipo === 'Balneários') { if (!nAp) findings.push({ severidade: 'POR FAZER', tipo: 'Aparelhos do balneário por definir', elemento: e.nome, msg: 'Indique o n.º de urinóis, sanitas e duches (Tabela 13, instalação pública: Máx(90 ou 125 × aparelhos; 10 × A)). Até lá conta só 10 × A' }); return; }
        if (e.tipo !== 'Sanitários') return;
        if (!e.regimeSanitario) findings.push({ severidade: 'POR FAZER', tipo: 'Regime da instalação sanitária por definir', elemento: e.nome, msg: 'Escolha o regime da Tabela 13 (privada contínua, privada não contínua, pública normal ou pública intensiva). Até lá, calcula-se como privada com funcionamento contínuo: Máx(45; 10 × A)' });
        else if (/^publico/.test(e.regimeSanitario) && !nAp) findings.push({ severidade: 'POR FAZER', tipo: 'Aparelhos sanitários por definir', elemento: e.nome, msg: 'Instalação pública: indique o n.º de urinóis, sanitas e duches (Tabela 13: 90 m³/h por aparelho, 125 no funcionamento intensivo). Até lá conta só 10 × A' });
      });
      // caudal por boa prática (G4 fora da Tabela 13: cozinha, vestiário, garagem): alerta até o projetista o confirmar
      VC.dados.espacos.forEach(e => {
        if (this.grupoDe(e) !== 4 || /^(Sanitários|Balneários)$/.test(e.tipo) || e.boaPraticaConfirmada) return;
        const def = VC.normas.getDef(e.tipo) || {};
        if (def.t13 || !(Number(def.ach) > 0)) return;
        findings.push({ severidade: 'ATENÇÃO', tipo: 'Caudal de boa prática por confirmar', elemento: e.nome, msg: e.tipo + ': ' + def.ach + ' renovações/hora é boa prática de projeto, não consta da Tabela 13 da Portaria 138-I. Confirme o valor (ou aplique a norma específica) no cartão da sala.' });
      });
      // N por definir: aviso cinzento «por fazer» (não é erro; o caudal fica só por T12 × A)
      VC.dados.espacos.forEach(e => {
        const c = this.calcularQEspaco(e);
        if (c.nPorDefinir) findings.push({ severidade: 'POR FAZER', tipo: 'Ocupação por definir', elemento: e.nome, msg: (VC.normas.getDef(e.tipo).semT12 ? 'N vazio: num espaço de sono o ar novo vem só de T11 × N (Portaria 138-I, 1.2.2 b), por isso está a 0 m³/h. Escreva o número de pessoas.' : 'N vazio: o ar novo é calculado só por T12 × A (' + VC.utils.fmt(c.Q_normas, 0) + ' m³/h). Escreva o número de pessoas para comparar com T11 × N.') });
      });
      VC.dados.espacos.forEach(e => {
        const b = this.balancoEspaco(e.nome);
        // auditoria B5: um espaço ainda sem terminais é trabalho por fazer (cinzento), não um erro (vermelho) a meio do projeto
        if (b.estado === 'ORFAO') findings.push({ severidade: 'POR FAZER', tipo: 'Terminais por criar', elemento: e.nome, msg: '0 terminais para Q_espaco=' + VC.utils.fmt(b.Q_nec, 0) + ' m³/h: crie-os no passo Definição de Terminais ou na planta (Terminal, D)' });
        else if (b.estado === 'SUB') findings.push({ severidade: 'ATENÇÃO', tipo: 'Balanço terminal ↔ espaço', elemento: e.nome, msg: 'Sub-servido — ' + VC.utils.fmt(b.Q_servido, 0) + ' / ' + VC.utils.fmt(b.Q_nec, 0) + ' m³/h' });
        else if (b.estado === 'SOBRE') findings.push({ severidade: 'ATENÇÃO', tipo: 'Balanço terminal ↔ espaço', elemento: e.nome, msg: 'Sobre-servido — ' + VC.utils.fmt(b.Q_servido, 0) + ' / ' + VC.utils.fmt(b.Q_nec, 0) + ' m³/h' });
      });

      if (window.VC6 && VC6.balanco && VC6.balanco.propagar) {
        try {
          const balancos = VC6.balanco.propagar();
          balancos.forEach(b => {
            if (b.estado === 'DESEQUILIBRIO_GRAVE') findings.push({ severidade: 'ERRO', tipo: 'Balanço de ar', elemento: b.nome, msg: 'Resíduo ' + VC.utils.fmt(b.residuo, 1) + ' m³/h' });
            else if (b.estado === 'DESEQUILIBRIO_LEVE') findings.push({ severidade: 'ATENÇÃO', tipo: 'Balanço de ar', elemento: b.nome, msg: 'Resíduo ' + VC.utils.fmt(b.residuo, 1) + ' m³/h' });
          });
          const ciclos = VC6.balanco.detetarCiclos();
          if (ciclos.length) findings.push({ severidade: 'ERRO', tipo: 'Ciclo de transferências', elemento: 'Sistema', msg: ciclos.length + ' ciclo(s) detetado(s)' });
        } catch (e) { VC.debug && VC.debug.erro && VC.debug.erro(e); }
      }

      // verificadores registados por outros módulos (ex.: coerência desenho ↔ tabelas, VC.planta.coerencia)
      (this.verificadores || []).forEach(v => { try { (v() || []).forEach(f => findings.push(f)); } catch (e) { VC.debug && VC.debug.erro && VC.debug.erro(e); } });

      const max = Math.max.apply(null, [0].concat(VC.dados.ramais.map(r => r.deltaPtotal || 0)));
      const critical = VC.dados.ramais.reduce((a, b) => (b.deltaPtotal || 0) > ((a && a.deltaPtotal) || 0) ? b : a, null);
      const sfpIntGlobal = VC.dados.utas.length > 0 ? Math.max.apply(null, VC.dados.utas.map(u => u.sfpInt || 0)) : 0;
      // v11.1: o resultado global é o da UTA mais desfavorável (maior SFPint face ao seu limite).
      const _rel = u => (u.sfpClass && u.sfpClass.limite) ? (u.sfpInt || 0) / u.sfpClass.limite : (u.sfpClass && u.sfpClass.conforme === false ? Infinity : -1);
      const _pior = VC.dados.utas.filter(u => u.ativo !== false && u.sfpClass).reduce((a, u) => (!a || _rel(u) > _rel(a)) ? u : a, null);
      const sfpClassGlobal = _pior
        ? Object.assign({}, _pior.sfpClass, { uta: _pior.nome, conforme: VC.dados.utas.every(u => u.ativo === false || !u.sfpClass || u.sfpClass.conforme) })
        : VC.normas.classificarSFP('BVU_HRS', sfpIntGlobal, 0, 0.75);

      const resultado = {
        rho, nu,
        ramais: VC.dados.ramais.slice(),
        ins: vent.ins, ext: vent.ext, bal: vent.bal,
        maxPerda: max, critical,
        sfpInt: sfpIntGlobal, sfpClass: sfpClassGlobal,
        power: totalPower,
        findings,
        porRede: {
          insuflacao: { maxPerda: vent.porRede.insuflacao ? vent.porRede.insuflacao.maxPerda : 0, Qnom: vent.porRede.insuflacao ? vent.porRede.insuflacao.Qnom : 0 },
          extracao: { maxPerda: vent.porRede.extracao ? vent.porRede.extracao.maxPerda : 0, Qnom: vent.porRede.extracao ? vent.porRede.extracao.Qnom : 0 }
        },
        // «por fazer» (ex.: N por definir) não é conformidade provada: o estado global fica ATENÇÃO (os ecrãs mostram-no a cinzento)
        overall: findings.some(f => f.severidade === 'ERRO') ? 'NÃO CONFORME' : findings.length ? 'ATENÇÃO' : 'CONFORME'
      };
      this.ultimo = resultado;
      if (VC.perf && VC.perf.cacheBalanco) VC.perf.cacheBalanco.invalidar();
      return resultado;
    } finally { this._emExecucao = false; }
  },

  calcularParcial() { return this.calcularTudo(); },

  /* v11.1: as ligações entre ramais, terminais e espaços são feitas pelo NOME. Um espaço a mais
     (ex.: 'R1.1 ' importado de outro programa) quebrava a ligação sem aviso. */
  _normalizarReferencias() {
    const limpa = v => (typeof v === 'string' ? v.trim() : v);
    (VC.dados.ramais || []).forEach(r => { r.nome = limpa(r.nome); r.parente = limpa(r.parente); });
    (VC.dados.terminais || []).forEach(t => { t.ramalRef = limpa(t.ramalRef); });
    (VC.dados.espacos || []).forEach(e => { e.ramalRefInsuflacao = limpa(e.ramalRefInsuflacao); e.ramalRefExtracao = limpa(e.ramalRefExtracao); });
  },

  terminaisQueServem(nomeEspaco) {
    if (!nomeEspaco) return [];
    return (VC.dados.terminais || []).filter(t => Array.isArray(t.espacos) && t.espacos.some(e => e.nome === nomeEspaco));
  },

  /* v11.1: rede "base" de um terminal (extração suja conta como extração) */
  _redeBase(t) {
    const r = (t && t.rede) || 'insuflacao';
    return r === 'extracao_suja' ? 'extracao' : r;
  },

  /* Caudal entregue ao espaço pelos terminais. Com `rede`, conta só os terminais dessa
     rede (v11.1: antes somava insuflação + extração e comparava com o caudal de uma só rede). */
  QservidoAoEspaco(nomeEspaco, rede) {
    if (!nomeEspaco) return 0;
    let soma = 0;
    (VC.dados.terminais || []).forEach(t => {
      if (!Array.isArray(t.espacos)) return;
      if (rede && this._redeBase(t) !== rede) return;
      t.espacos.forEach(e => { if (e.nome === nomeEspaco) soma += Number(e.Q_parcela) || 0; });
    });
    return soma;
  },

  balancoEspaco(nomeEspaco) {
    const esp = (VC.dados.espacos || []).find(e => e.nome === nomeEspaco);
    if (!esp) return { Q_nec: 0, Q_servido: 0, delta: 0, estado: 'NAO_EXISTE', nTerminais: 0 };
    const c = this.calcularQEspaco(esp);
    // v11.1: compara a necessidade com os terminais da rede que a satisfaz
    // (G4 → extração; restantes → insuflação/renovação)
    const rede = c.tipoCaudal === 'EXTRACAO' ? 'extracao' : 'insuflacao';
    // v11.1 (3.10): o ar que o espaço transfere para outros (ex.: compensação de sanitários)
    // também tem de ser insuflado nele.
    const Q_transf_out = rede === 'insuflacao'
      ? (VC.dados.transferencias || []).filter(t => t.deId === esp.id).reduce((s, t) => s + (Number(t.Q) || 0), 0)
      : 0;
    const Q_nec = c.Q_espaco + Q_transf_out;
    const Q_servido = this.QservidoAoEspaco(nomeEspaco, rede);
    const nTerminais = this.terminaisQueServem(nomeEspaco).filter(t => this._redeBase(t) === rede).length;
    const delta = Q_servido - Q_nec;
    let estado = 'OK';
    // Fase 2: só G2 (zona de transferência) fica isento; G3 compara a insuflação e G4 a extração com o caudal exigido
    if (c.g === 2) estado = 'ISENTO';
    else if (nTerminais === 0 && Q_nec > 0) estado = 'ORFAO';
    else if (Q_nec > 0) {
      const ratio = Q_servido / Q_nec;
      if (ratio < VC.constantes.BALANCO_ESPACO.sub) estado = 'SUB';
      else if (ratio > VC.constantes.BALANCO_ESPACO.sobre) estado = 'SOBRE';
      else estado = 'OK';
    }
    return { Q_nec, Q_servido, delta, estado, nTerminais, rede, g: c.g, isento: c.isento, Q_transf_out };
  },

  espacosServidosPorRamal(ramalNome) {
    if (!ramalNome) return [];
    const mapa = {};
    VC.dados.terminais
      .filter(t => t.ramalRef === ramalNome)
      .forEach(t => {
        (t.espacos || []).forEach(e => {
          if (!mapa[e.nome]) {
            const esp = VC.dados.espacos.find(x => x.nome === e.nome);
            mapa[e.nome] = { espacoId: esp ? esp.id : null, nome: e.nome, quantidadeTerminais: 0, Q_parcela: 0 };
          }
          mapa[e.nome].quantidadeTerminais++;
          mapa[e.nome].Q_parcela += Number(e.Q_parcela) || 0;
        });
      });
    return Object.values(mapa);
  },

  migrarRedes() {
    if (this.__mig) return;
    VC.dados.ramais.forEach(r => { if (!r.rede) { const s = ((r.nome || '') + ' ' + (r.tipo || '')).toLowerCase(); r.rede = /extra|retorno|exaust/.test(s) ? 'extracao' : 'insuflacao'; } });
    VC.dados.terminais.forEach(t => { if (!t.rede) { const s = ((t.tipo || '') + ' ' + (t.nome || '')).toLowerCase(); t.rede = /extra|retorno|exaust/.test(s) ? 'extracao' : 'insuflacao'; } });
    this.__mig = true;
  }
};

VC6.calculo = {
  dimensionarConduta: function (Qmh, opts) { return VC.calculo.dimensionarConduta(Qmh, opts); },
  retangular: function (hmax, ratio, vMax, Q) { return VC.calculo.retangular(hmax, ratio, vMax, Q); },
  diametroComercial: function (dmm) { return VC.calculo.diametroComercial(dmm); },
  propagarCaudal: function () { return VC.calculo.propagarCaudal(); },
  calcularDeltaPTerminalPorRamal: function () { return VC.calculo.calcularDeltaPTerminalPorRamal(); },
  calcularCondutas: function (rho, nu) { return VC.calculo.calcularCondutas(rho, nu); },
  calcularDeltaPAcumulado: function () { return VC.calculo.calcularDeltaPAcumulado(); },
  espacosServidosPorRamal: function (nome) { return VC.calculo.espacosServidosPorRamal(nome); },
  verificarTerminal: function (t) { return VC.calculo.verificarTerminal(t); },
  balancoEspaco: function (nome) { return VC.calculo.balancoEspaco(nome); },
  calcularQEspaco: function (e) { return VC.calculo.calcularQEspaco(e); },
  calcularQ_normas: function (e) { return VC.calculo.calcularQ_normas(e); },
  calcularQAI: function (e) { return VC.calculo.calcularQAI(e); }
};

/* ============================================================
   §12 · TOPOLOGIA
   ============================================================ */
VC.topologia = {
  bibliotecaZeta: {
    'Curva 90°': [{ d:'R/D = 0,5', z:0.71 },{ d:'R/D = 1,0', z:0.33 },{ d:'R/D = 1,5', z:0.22 },{ d:'R/D = 2,0', z:0.15 },{ d:'R/D = 3,0', z:0.10 }],
    'Curva 45°': [{ d:'R/D = 0,5', z:0.50 },{ d:'R/D = 1,0', z:0.20 },{ d:'R/D = 1,5', z:0.14 }],
    'Tê direto': [{ d:'Q ramo/Q principal = 0,2', z:0.10 },{ d:'Q ramo/Q principal = 0,4', z:0.20 },{ d:'Q ramo/Q principal = 0,6', z:0.35 }],
    'Tê lateral': [{ d:'Q ramo/Q principal = 0,2', z:1.40 },{ d:'Q ramo/Q principal = 0,4', z:1.00 },{ d:'Q ramo/Q principal = 0,6', z:0.70 }],
    'Redução': [{ d:'Ângulo 15°', z:0.10 },{ d:'Ângulo 30°', z:0.25 },{ d:'Ângulo 45°', z:0.50 },{ d:'Ângulo 60°', z:0.90 }],
    'Expansão': [{ d:'Ângulo 15°', z:0.20 },{ d:'Ângulo 30°', z:0.55 },{ d:'Ângulo 45°', z:1.10 }],
    'Transição': [{ d:'Retangular → circular', z:0.30 },{ d:'Circular → retangular', z:0.30 }],
    'Registo': [{ d:'Borboleta aberto', z:0.20 },{ d:'Borboleta 45°', z:1.50 },{ d:'Guilhotina aberto', z:0.15 }],
    'Silenciador': [{ d:'Dados do fabricante preferíveis', z:0.60 }],
    'Grelha intermédia': [{ d:'Dados do fabricante preferíveis', z:0.80 }],
    'Outro': [{ d:'Valor manual', z:1.00 }]
  },
  tiposElemento() { return Object.keys(this.bibliotecaZeta); },
  criarNo(nome, tipo, ramalRef, x, y) {
    const n = { id: 'NO-' + (VC.dados.nextId.no++), nome: nome || 'Nó', tipo: tipo || 'Derivação', ramalRef: ramalRef || '', x: Number(x) || 0, y: Number(y) || 0, Q_acumulado: 0, ligacoes: [] };
    VC.dados.nos.push(n);
    return n;
  },
  porRamal(ramalRef) { return VC.dados.nos.filter(n => n.ramalRef === ramalRef); },
  porTipo(tipo) { return VC.dados.nos.filter(n => n.tipo === tipo); },
  adicionarElemento(trechoId, tipo, zeta, descricao) {
    const tr = VC.dados.trechos.find(t => t.id === trechoId);
    if (!tr) return null;
    const el = { id: 'EL-' + (VC.dados.nextId.elemento++), trechoId, tipo: tipo || 'Curva 90°', descricao: descricao || '', zeta: Number(zeta) || 0.5, modo: 'zeta', deltaP_manual: 0, ativo: true, origemZeta: 'biblioteca' };
    VC.dados.elementosRede.push(el);
    return el;
  },
  removerElemento(id) { VC.dados.elementosRede = VC.dados.elementosRede.filter(e => e.id !== id); },
  elementosPorTrecho(trechoId) { return VC.dados.elementosRede.filter(e => e.trechoId === trechoId && e.ativo !== false); },
  zetaTipico(tipo) { const lib = this.bibliotecaZeta[tipo]; if (!lib || !lib.length) return null; return lib.reduce((s, x) => s + x.z, 0) / lib.length; },
  calcularDpElementos(trecho, rho, v) {
    const els = this.elementosPorTrecho(trecho.id);
    let dp = 0;
    const detalhe = [];
    els.forEach(e => {
      let dpi = 0;
      if (e.modo === 'manual') dpi = Number(e.deltaP_manual) || 0;
      else dpi = (Number(e.zeta) || 0) * 0.5 * rho * v * v;
      dp += dpi;
      detalhe.push({ id: e.id, tipo: e.tipo, zeta: e.zeta, dp: dpi });
    });
    return { total: dp, detalhe };
  }
};

/* ============================================================
   §13 · DECOMPOR
   ============================================================ */
VC.decompor = {
  _cacheKey: null,
  limpar() {
    VC.dados.nos = []; VC.dados.trechos = []; VC.dados.elementosRede = [];
    VC.dados.nextId.no = 1; VC.dados.nextId.trecho = 1; VC.dados.nextId.elemento = 1;
    this._cacheKey = null;
  },
  _hashTopologia() {
    return VC.dados.ramais.map(r => r.nome + '|' + (r.parente || '') + '|' + (r.utaRef || '')).join('#').length
      + '#' + VC.dados.ramais.length
      + '#' + VC.dados.terminais.map(t => t.ramalRef).join(',').length;
  },
  executar(silencioso) {
    if (!silencioso) { if (!confirm('Decompor os ramais atuais em nós + trechos + elementos?')) return null; }
    const hash = this._hashTopologia();
    if (silencioso && this._cacheKey === hash && VC.dados.nos.length > 0) return { criados: VC.dados.trechos.length, nos: VC.dados.nos.length, elementos: VC.dados.elementosRede.length, cache: true };
    this.limpar();
    const ramais = VC.dados.ramais.slice();
    if (!ramais.length) return { criados: 0, nos: 0, elementos: 0 };
    const nosUTA = {};
    const redesPresentes = Array.from(new Set(ramais.map(r => r.rede || 'insuflacao')));
    redesPresentes.forEach(rede => {
      const uta = VC.dados.utas.find(u => u.rede === rede);
      const nomeUTA = uta ? uta.nome : ('UTA ' + rede);
      const n = VC.topologia.criarNo(nomeUTA, 'UTA', '', 60, rede === 'insuflacao' ? 60 : 260);
      n.rede = rede;
      n.utaRef = uta ? uta.id : null;
      nosUTA[rede] = n;
    });
    const nosRamal = {};
    ramais.forEach(r => {
      const nivelNum = r.nivelNumero || VC.utils.nivelTextoParaNumero(r.nivel || (r.tipo === 'Principal' ? 'primario' : 'secundario'));
      const tipo = nivelNum === 1 ? 'Derivação' : (nivelNum <= 3 ? 'Derivação' : 'Extremidade');
      const n = VC.topologia.criarNo('Nó ' + r.nome, tipo, r.nome, 0, 0);
      n.rede = r.rede || 'insuflacao';
      n.nivel = r.nivel || 'secundario';
      n.nivelNumero = nivelNum;
      nosRamal[r.nome] = n;
    });
    ramais.forEach(r => {
      const n = nosRamal[r.nome];
      const rPai = r.parente ? nosRamal[r.parente] : null;
      if (rPai) { n.ligacoes.push(rPai.id); rPai.ligacoes.push(n.id); }
      else {
        let utaAlvo = null;
        if (r.utaRef) utaAlvo = VC.dados.utas.find(u => u.id === r.utaRef);
        if (!utaAlvo) utaAlvo = VC.dados.utas.find(u => u.rede === (r.rede || 'insuflacao'));
        const noUTA = utaAlvo ? nosUTA[utaAlvo.rede] : nosUTA[r.rede || 'insuflacao'];
        if (noUTA) { n.ligacoes.push(noUTA.id); noUTA.ligacoes.push(n.id); }
      }
    });
    VC.dados.nos.forEach(n => {
      if (n.ligacoes && n.ligacoes.length) { n.ligacoes = Array.from(new Set(n.ligacoes)); n.ligacoes = n.ligacoes.filter(id => id !== n.id); }
    });
    let nTrechos = 0, nElementos = 0;
    ramais.forEach(r => {
      const n = nosRamal[r.nome];
      const rPai = r.parente ? nosRamal[r.parente] : null;
      let nA = null;
      if (rPai) nA = rPai;
      else {
        let utaAlvo = null;
        if (r.utaRef) utaAlvo = VC.dados.utas.find(u => u.id === r.utaRef);
        if (!utaAlvo) utaAlvo = VC.dados.utas.find(u => u.rede === (r.rede || 'insuflacao'));
        nA = utaAlvo ? nosUTA[utaAlvo.rede] : nosUTA[r.rede || 'insuflacao'];
      }
      const tr = {
        id: 'TR-' + (VC.dados.nextId.trecho++),
        nome: r.nome,
        ramalRef: r.nome,
        noA: nA ? nA.id : '',
        noB: n.id,
        rede: r.rede || 'insuflacao',
        L_reto: Number(r.L) || 0,
        L_elementos: 0,
        L_total: Number(r.L) || 0,
        secao: r.secaoCalc || (r.Dcom ? 'Ø' + r.Dcom : ''),
        material: 'Aço galvanizado',
        rugosidade: Number(VC.dados.params.rugosidade) || 0.15,
        Q_adotado: Number(r.Q) || 0,
        elementos: [],
        origem: 'Decomposição automática',
        dp_linear: 0,
        dp_elementos: 0,
        dp_total_calculado: 0,
        nElementos: 0
      };
      VC.dados.trechos.push(tr);
      nTrechos++;
      if (r.zeta && Number(r.zeta) > 0) { VC.topologia.adicionarElemento(tr.id, 'Outro', Number(r.zeta), 'Singularidades agregadas'); nElementos++; }
    });
    this._cacheKey = hash;
    return { criados: nTrechos, nos: VC.dados.nos.length, elementos: nElementos };
  },
  garantir() { if (VC.dados.trechos.length === 0 && VC.dados.ramais.length > 0) this.executar(true); }
};

/* ============================================================
   §14 · UTAs
   ============================================================ */
VC.uta = {
  criar(nome, rede, zona) {
    const u = {
      id: 'UTA-' + String(VC.dados.nextId.uta++).padStart(2, '0'),
      nome: nome || 'UTA',
      rede: rede || 'insuflacao',
      zona: zona || '',
      componentes: [],
      curva: [],
      curvaFabricante: null,
      eta: 0.65,
      etaRec: 0.75,
      fs: 1.15,
      transmissao: 1.0,
      classeIE: 'IE3',
      recuperadorAtivo: true,
      tipoUV: rede === 'extracao_suja' ? 'UVU_SEM_FILTER' : 'BVU_HRS',
      ativo: true,
      Q: 0,
      dpInt: 0,
      dpExt: 0,
      sfpInt: 0,
      P_motor: 0,
      sfpClass: null,
      status: 'PENDENTE',
      pontoFunc: null
    };
    VC.dados.utas.push(u);
    return u;
  },
  porRede(rede) { return VC.dados.utas.filter(u => u.rede === rede && u.ativo !== false); },
  /* Tipo de sistema (VMC, VAN, VIN, VEG, VEX, VEI): o escolhido ou, sem ele, o prefixo do nome («VEG P0 N» → VEG) */
  tipoSistemaDe(u) {
    if (!u) return null;
    const T = VC.constantes.TIPOS_SISTEMA, porCod = c => T.find(t => t.codigo === c) || null;
    const alias = c => (c === 'VEI' ? 'VEIS' : c);   // VEI (versão anterior) = VEIS
    if (u.tipoSistema) return porCod(alias(u.tipoSistema));
    // legenda de siglas do projeto: o prefixo mais comprido que começa o nome (VEISP0 → VEIS, «VCM Refeitório» → VCM)
    const nome = String(u.nome || '').toUpperCase().replace(/\s+/g, ' ').trim();
    const leg = (this.siglasProjeto() || []).filter(x => x.prefixo && nome.indexOf(x.prefixo) === 0).sort((a, b) => b.prefixo.length - a.prefixo.length)[0];
    if (leg) return porCod(alias(leg.tipo));
    const m = String(u.nome || '').toUpperCase().match(/^(VMC|VCM|VAN|VIN|VEG|VEX|VEIS|VEI)(?![A-Za-z]{3})/);
    return m ? porCod(alias(m[1])) : null;
  },
  tipoSistemaProprio(u) { return !!(u && u.tipoSistema); },
  /* legenda de siglas do projeto: [{ prefixo: 'VEISP', tipo: 'VEIS' }] em VC.dados.params.siglasEquip */
  siglasProjeto() {
    const L = VC.dados.params && VC.dados.params.siglasEquip;
    return Array.isArray(L) ? L.map(x => ({ prefixo: String(x.prefixo || '').toUpperCase().replace(/\s+/g, ' ').trim(), tipo: x.tipo })).filter(x => x.prefixo && x.tipo) : [];
  },
  definirSigla(prefixo, tipo) {
    const P = String(prefixo || '').toUpperCase().replace(/\s+/g, ' ').trim(); if (!P) return false;
    const L = (VC.dados.params.siglasEquip || []).filter(x => String(x.prefixo || '').toUpperCase().trim() !== P);
    if (tipo) { if (!VC.constantes.TIPOS_SISTEMA.some(t => t.codigo === tipo)) return false; L.push({ prefixo: P, tipo }); }
    VC.dados.params.siglasEquip = L;
    return true;
  },
  /* escolher o tipo: guarda-o e acerta o tipo Ecodesign (UVU/UVB) ao do sistema. Devolve false se a rede da UTA
     não é servida por esse tipo (ex.: VEI numa UTA de insuflação). Código vazio = volta ao do nome. */
  definirTipoSistema(u, codigo) {
    if (!u) return false;
    if (!codigo) { delete u.tipoSistema; return true; }
    const t = VC.constantes.TIPOS_SISTEMA.find(x => x.codigo === codigo);
    if (!t || t.redes.indexOf(u.rede) < 0) return false;
    u.tipoSistema = t.codigo; u.tipoUV = t.tipoUV;
    return true;
  },
  /* criar um equipamento de um tipo: VMC cria as duas metades (insuflação e extração) em par UVB.
     Devolve a UTA da rede pedida (a outra metade fica em u.uvbPar). */
  criarDeTipo(codigo, nome, rede, zona) {
    const t = VC.constantes.TIPOS_SISTEMA.find(x => x.codigo === codigo);
    if (!t) { const u = this.criar(nome, rede, zona); u.componentes = rede === 'insuflacao' ? this.componentesPadrao() : this.componentesExtracao(); return u; }
    rede = t.redes.indexOf(rede) >= 0 ? rede : t.redes[0];
    const fazer = (n, r) => { const u = this.criar(n, r, zona); u.componentes = r === 'insuflacao' ? this.componentesPadrao() : this.componentesExtracao(); u.tipoSistema = t.codigo; u.tipoUV = t.tipoUV; return u; };
    if (!t.par) return fazer(nome, rede);
    const ladoExt = VC.redes.ehExtracao(rede) ? rede : 'extracao';   // VCM: a extração pode ser de ar sujo (copa)
    const ins = fazer(nome + ' (insuflação)', 'insuflacao'), ext = fazer(nome + ' (extração)', ladoExt);
    ins.uvbPar = ext.id; ext.uvbPar = ins.id;
    return VC.redes.ehExtracao(rede) ? ext : ins;
  },
  componentesPadrao() {
    return [
      { id: VC.utils.uid('COMP'), nome: 'Pré-filtro G4', tipo: 'Filtro G4', deltaP: 35, deltaP_final: 90, zeta: 2.0, obs: 'ISO 16890' },
      { id: VC.utils.uid('COMP'), nome: 'Filtro fino F7', tipo: 'Filtro F7', deltaP: 55, deltaP_final: 160, zeta: 2.5, obs: 'ISO 16890' },
      { id: VC.utils.uid('COMP'), nome: 'Recuperador', tipo: 'Recuperador', deltaP: 115, deltaP_final: 130, zeta: 1.2, obs: 'η 75%' },
      { id: VC.utils.uid('COMP'), nome: 'Bateria aquecimento', tipo: 'Bateria Aquec.', deltaP: 45, deltaP_final: 50, zeta: 0.8, obs: '' },
      { id: VC.utils.uid('COMP'), nome: 'Ventilador', tipo: 'Ventilador', deltaP: 0, deltaP_final: 0, zeta: 0, obs: 'IE3' }
    ];
  },
  componentesExtracao() {
    return [
      { id: VC.utils.uid('COMP'), nome: 'Pré-filtro G4', tipo: 'Filtro G4', deltaP: 35, deltaP_final: 90, zeta: 2.0, obs: 'ISO 16890' },
      { id: VC.utils.uid('COMP'), nome: 'Recuperador', tipo: 'Recuperador', deltaP: 115, deltaP_final: 130, zeta: 1.2, obs: 'η 75%' },
      { id: VC.utils.uid('COMP'), nome: 'Ventilador', tipo: 'Ventilador', deltaP: 0, deltaP_final: 0, zeta: 0, obs: 'IE3' }
    ];
  },
  // v11.1 (E2): aceita a UTA concreta. Sem ela usa a 1.ª da rede (comportamento antigo,
  // que dava a todas as UTAs da mesma rede o ponto de funcionamento da primeira).
  calcularPorRede(rede, utaAlvo) {
    const lista = this.porRede(rede);
    if (!lista.length && !utaAlvo) return null;
    const u = utaAlvo || lista[0];
    return {
      uta: u, Q: u.Q, dpExt: u.dpExt, dpInt: u.dpInt, sfpInt: u.sfpInt,
      sfpExt: u.Q > 0 ? u.dpExt / u.Q : Infinity,
      sfpTotal: u.sfpInt + (u.Q > 0 ? u.dpExt / u.Q : 0),
      P_eixo: u.Q * (u.dpInt + u.dpExt) / Math.max(u.eta, 0.01),
      P_motor: u.P_motor, eta: u.eta, etaRec: u.etaRec, fs: u.fs, trans: u.transmissao,
      classeIE: u.classeIE,
      // V9.1.2 · ETA_REC_MIN dinâmico (UE 1253/2014): 0.73 se Q ≥ 0.75 m³/s, senão 0.68
      recOK: !u.recuperadorAtivo || u.etaRec >= ((u.Q >= 0.75) ? VC.conhecimento.tabelas.ETA_REC_MIN : 0.68),
      componentes: u.componentes || []
    };
  },
  calcularPontoFuncionamento(rede, utaAlvo) {
    const r = this.calcularPorRede(rede, utaAlvo);
    if (!r) return null;
    const uta = r.uta;
    const Qms = r.Q, dp = r.dpExt + r.dpInt;
    if (!uta.curva || uta.curva.length < 2) return { modo: 'estimativa', Qmh: Qms * 3600, dP: dp, P_eixo: r.P_eixo, P_motor: r.P_motor, fs: r.fs, eta: r.eta };
    const K = Qms > 0 ? dp / (Qms * Qms) : 0;
    const Qmax = Math.max.apply(null, uta.curva.map(p => p.Q)) / 3600;
    let qLo = 0.001, qHi = Math.max(Qmax * 1.2, 0.01), qSol = (qLo + qHi) / 2, iter = 0;
    const curvaVent = Q => {
      const p = uta.curva;
      if (p.length < 2) return null;
      if (Q <= p[0].Q) return p[0].dP;
      if (Q >= p[p.length - 1].Q) return p[p.length - 1].dP;
      for (let i = 0; i < p.length - 1; i++) {
        const a = p[i], b = p[i + 1];
        if (Q >= a.Q && Q <= b.Q) { const t = (Q - a.Q) / (b.Q - a.Q); return a.dP + t * (b.dP - a.dP); }
      }
      return null;
    };
    while (iter++ < 60) {
      qSol = (qLo + qHi) / 2;
      const qmh = qSol * 3600;
      const dpVent = curvaVent(qmh);
      const dpRede = K * qSol * qSol;
      if (dpVent == null) break;
      if (dpVent > dpRede) qLo = qSol; else qHi = qSol;
      if (Math.abs(qHi - qLo) < 0.0001) break;
    }
    const qmh = qSol * 3600;
    const dpVent = curvaVent(qmh) || K * qSol * qSol;
    const dpRede = K * qSol * qSol;
    const dpUsar = Math.min(dpVent, dpRede);
    const P_eixo = qSol * dpUsar / Math.max(r.eta, 0.01);
    const P_motor = P_eixo * r.fs / Math.max(r.trans, 0.01);
    // v11.1 (E3): o caudal de projeto está para lá do fim da curva do ventilador escolhido
    const QmaxCurva = Qmax * 3600;
    const foraDaCurva = Qms * 3600 > QmaxCurva;
    return { modo: 'curva', foraDaCurva, QmaxCurva, QprojMh: Qms * 3600, Q: qSol, Qmh: qmh, dP: dpUsar, dPVent: dpVent, dPRede: dpRede, K, P_eixo, P_motor, fs: r.fs, eta: r.eta, curvaFabricante: uta.curvaFabricante || null };
  },
  atualizar(rede, campo, valor) {
    let u = this.porRede(rede)[0];
    if (!u) u = this.criar('UTA ' + rede, rede);
    if (['eta', 'etaRec', 'transmissao', 'fs'].indexOf(campo) >= 0) u[campo] = Number(valor) || 0;
    else u[campo] = valor;
  },
  aplicarCurvaFabricante(utaId, fabricante, serie, modelo) {
    const u = VC.dados.utas.find(x => x.id === utaId);
    if (!u) return false;
    const ok = VC.curvasFabricantes.aplicarNaUTA(u, fabricante, serie, modelo);
    if (ok) { VC.estado.sincronizar(); return true; }
    return false;
  }
};

VC6.uta = {
  criar: function (nome, rede, zona) { return VC.uta.criar(nome, rede, zona); },
  porRede: function (rede) { return VC.uta.porRede(rede); },
  componentesPadrao: function () { return VC.uta.componentesPadrao(); },
  componentesExtracao: function () { return VC.uta.componentesExtracao(); },
  calcularPorRede: function (rede, uta) { return VC.uta.calcularPorRede(rede, uta); },
  calcularPontoFuncionamento: function (rede, uta) { return VC.uta.calcularPontoFuncionamento(rede, uta); },
  aplicarCurvaFabricante: function (utaId, fab, serie, mod) { return VC.uta.aplicarCurvaFabricante(utaId, fab, serie, mod); }
};
VC6.curvasFabricantes = VC.curvasFabricantes;

/* ============================================================
   §19 · LOCKS
   ============================================================ */
VC.locks = {
  toggleD(ramalNome) {
    const r = VC.dados.ramais.find(x => x.nome === ramalNome);
    if (!r) return;
    if (!r.lock) r.lock = { D: false };
    r.lock.D = !r.lock.D;
    VC.estado.sincronizar();
    if (VC.arvore && VC.arvore._selecionado && VC.arvore._selecionado.nome === ramalNome) {
      VC.arvore._selecionado = VC.arvore._nos.find(n => n.nome === ramalNome) || VC.arvore._selecionado;
      VC.arvore.render();
    }
    VC.ui.toast('Lock de Ø ' + (r.lock.D ? 'ON' : 'OFF') + ' em «' + ramalNome + '».');
  },
  ativo(ramal) { return !!(ramal && ramal.lock && ramal.lock.D); },
  limparTudo() { (VC.dados.ramais || []).forEach(r => { r.lock = { D: false }; }); VC.estado.sincronizar(); }
};

/* ============================================================
   §19b · OPTIMIZAR
   ============================================================ */
VC.optimizar = {
  MAX_ITER: 10,
  R_ALVO: VC.constantes.R_ALVO,
  TOLERANCIA_EQUILIBRIO: VC.constantes.EQUILIBRIO_REDE,
  executar() {
    if (!VC.dados.ramais.length) { VC.ui.toast('Sem ramais para otimizar.'); return; }
    if (!confirm('Executar ciclo de otimização automática?\n\n[1] Ajustar Ø para R = 1 Pa/m\n[2] Corrigir Ø onde v > limite\n[3] Ajustar ζ nos ramais mais curtos\n[4] Máximo ' + this.MAX_ITER + ' iterações\n\nOs ramais com lock de Ø não serão alterados.')) return;
    const historia = [];
    VC.dados.historicoConvergencia = historia;
    let iter = 0, convergiu = false;
    while (iter < this.MAX_ITER && !convergiu) {
      iter++;
      const antes = this._snapshot();
      const acoes = [];
      let nAjustados = 0;
      VC.dados.ramais.forEach(r => {
        if (VC.locks.ativo(r)) return;
        const Qef = Number(r.Q || 0);
        if (Qef <= 0) return;
        const z = VC.calculo.dimensionarConduta(Qef, { vMax: VC.calculo.vMaxDe(r) });   // v11.1: limite por nível
        if (z.Dc && z.Dc !== r.Dcom) { r.Dcom = z.Dc; nAjustados++; }
      });
      if (nAjustados) acoes.push('Fase 1: ' + nAjustados + ' Ø ajustados');
      VC.calculo.calcularTudo();
      let nVel = 0;
      VC.dados.ramais.forEach(r => {
        if (VC.locks.ativo(r)) return;
        const vLim = VC.calculo.vMaxDe(r);   // v11.1: o mesmo limite por nível do dimensionamento (3.5)
        if ((Number(r.v) || 0) > vLim) {
          const Qef = Number(r.Q || 0);
          let lo = r.Dcom || 100, hi = 3000, Dc = lo;
          for (let i = 0; i < 40; i++) {
            const m = (lo + hi) / 2;
            const A = Math.PI * (m / 1000) * (m / 1000) / 4;
            const vTest = Qef / 3600 / A;
            if (vTest > vLim) lo = m; else { hi = m; Dc = m; }
          }
          const novo = VC.calculo.diametroComercial(Dc);
          if (novo !== r.Dcom) { r.Dcom = novo; nVel++; }
        }
      });
      if (nVel) acoes.push('Fase 2: ' + nVel + ' Ø aumentados');
      VC.calculo.calcularTudo();
      const criticos = VC.dados.ramais.slice().sort((a, b) => (b.deltaPtotal || 0) - (a.deltaPtotal || 0));
      const caminhoCritico = criticos[0];
      if (caminhoCritico && caminhoCritico.deltaPtotal > 0) {
        const alvoDP = caminhoCritico.deltaPtotal;
        let nZ = 0;
        VC.dados.ramais.forEach(r => {
          if (r === caminhoCritico) return;
          if ((Number(r.L) || 0) > 15) return;
          const dpAtual = r.deltaPtotal || 0;
          if (dpAtual <= 0) return;
          if (dpAtual / alvoDP < 0.85) {
            const falta = alvoDP - dpAtual;
            const v = Number(r.v) || 1;
            const rho = VC.calculo.ultimo ? VC.calculo.ultimo.rho : 1.2;
            const meiaRhoV2 = 0.5 * rho * v * v;
            if (meiaRhoV2 > 0) { r.zeta = Number(Math.min(3.5, (Number(r.zeta) || 0) + falta / meiaRhoV2).toFixed(3)); nZ++; }
          }
        });
        if (nZ) acoes.push('Fase 3: ζ ajustado em ' + nZ + ' ramais');
        VC.calculo.calcularTudo();
      }
      const depois = this._snapshot();
      const maxDP = Math.max.apply(null, [0].concat(VC.dados.ramais.map(r => r.deltaPtotal || 0)));
      const desvios = VC.dados.ramais.map(r => (r.deltaPtotal == null || maxDP <= 0) ? 0 : Math.abs(r.deltaPtotal / maxDP - 1));
      const maxDesvio = Math.max.apply(null, [0].concat(desvios));
      const cumpreEquilibrio = maxDesvio <= this.TOLERANCIA_EQUILIBRIO;
      const semAlteracoes = JSON.stringify(antes) === JSON.stringify(depois);
      convergiu = cumpreEquilibrio || semAlteracoes;
      historia.push({ iter, acoes: acoes.slice(), maxDP, maxDesvio, cumpreEquilibrio, convergiu, timestamp: new Date().toISOString() });
    }
    if (VC.arvore && VC._modoAtivo === 'arvore') VC.arvore.render();
    VC.perf.dirty.marcarTudo();
    VC.perf.raf.agendar(() => VC.perf.dirty.flush());
    this._mostrarRelatorio(historia, convergiu);
  },
  _snapshot() { return VC.dados.ramais.map(r => ({ nome: r.nome, Dcom: r.Dcom, zeta: r.zeta, Q: r.Q })); },
  _mostrarRelatorio(historia, convergiu) {
    const modal = document.getElementById('modalConvergencia');
    const cont = document.getElementById('modalConvergenciaConteudo');
    if (!modal || !cont) return;
    let h = '<div class="modal-cabecalho"><h3>Histórico de Optimização</h3><button class="fechar" onclick="VC.ui.fecharModal(\'modalConvergencia\')">x</button></div>';
    h += '<div class="modal-corpo">';
    h += '<div style="padding:10px 14px;border-radius:6px;background:var(--' + (convergiu ? 'verde-soft' : 'ambar-soft') + ');border-left:3px solid var(--' + (convergiu ? 'verde' : 'ambar') + ');color:var(--' + (convergiu ? 'verde-esc' : 'ambar-esc') + ');font-weight:700;font-size:12px;margin-bottom:12px">' + (convergiu ? 'Convergiu em ' : 'Nao convergiu em ') + historia.length + ' iteracoes.</div>';
    h += '<div class="convergencia-historico"><div class="convergencia-historico-cab"><span>Iteracoes</span><span>' + historia.length + ' / ' + this.MAX_ITER + '</span></div>';
    historia.forEach(it => {
      const corDesv = it.cumpreEquilibrio ? 'ok' : (it.maxDesvio <= 0.35 ? 'atencao' : 'erro');
      h += '<div class="convergencia-iteracao"><span class="iter">#' + it.iter + '</span><span class="msg">' + (it.acoes.join(' - ') || 'Sem alteracoes') + '</span><span class="val">dp max ' + VC.utils.fmt(it.maxDP, 0) + ' Pa</span><span class="val ' + corDesv + '">Desvio ' + Math.round(it.maxDesvio * 100) + '%</span><span class="val">' + (it.convergiu ? 'OK' : '...') + '</span></div>';
    });
    h += '</div></div>';
    h += '<div class="modal-rodape"><button class="btn" onclick="VC.ui.fecharModal(\'modalConvergencia\')">Fechar</button></div>';
    cont.innerHTML = h;
    modal.classList.add('on');
  }
};

console.log('%c[VentiCondutas] 03-dimensionamento carregado - correcao ACH (so G3 e G4 exceto Sanitorios)', 'color:#6d8fb0;font-weight:bold;background:#eaf1f7;padding:3px 6px;border-radius:3px');

})();