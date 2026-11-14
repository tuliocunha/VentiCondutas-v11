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

  diametroComercial(dmm) {
    const serie = VC.dados.serieDiametros || 'S1';
    const lista = serie === 'S2' ? VC.constantes.COMM_S2 : VC.constantes.COMM_S1;
    return lista.filter(x => x >= dmm)[0] || dmm;
  },

  dimensionarConduta(Qmh, opts) {
    opts = opts || {};
    const Q = VC.utils.num(Qmh) / 3600;
    const Vmax = Number(opts.vMax) || VC.constantes.VMAX_NIVEL[1], Ralvo = VC.constantes.R_ALVO;
    const eps = opts.eps || (VC.utils.num(VC.dados.params.rugosidade) || 0.15) / 1000;
    const rho = opts.rho || 1.2;
    const nu = opts.nu || 1.5e-5;
    const metodo = (VC.dados.metodoCalculo && VC.dados.metodoCalculo.metodo) || 'loss';
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
    let Dc = this.diametroComercial(ideal.D * 1000);
    let final = evalD(Dc / 1000);
    // v11.1: o método 'perda constante' não limitava a velocidade (Q ≥ 10 000 m³/h → 7–9 m/s, que a
    // própria auditoria marcava como ERRO). Sobe na série comercial até v ≤ vMax do nível.
    for (let i = 0; i < 40 && Q && final.v > Vmax; i++) {
      const prox = this.diametroComercial(Dc + 1);
      if (prox <= Dc) break;
      Dc = prox; final = evalD(Dc / 1000);
    }
    return Object.assign({}, final, { Qmh, idealD: ideal.D * 1000, Dc, metodo, vMax: Vmax });
  },

  retangular(hmax, ratioMin, vMax, Qmh) {
    ratioMin = ratioMin || 0.5;
    const Q = VC.utils.num(Qmh) / 3600;
    const W1505 = VC.constantes.W1505, H1505 = VC.constantes.H1505;
    const candidatos = W1505.reduce((acc, b) => acc.concat(H1505.filter(h => h <= hmax).map(h => ({ b, h }))), [])
      .filter(c => Math.min(c.b, c.h) / Math.max(c.b, c.h) >= ratioMin)
      .sort((a, b) => { const pa = 2 * (a.b + a.h), pb = 2 * (b.b + b.h); return pa !== pb ? pa - pb : a.b * a.h - b.b * b.h; });
    for (const c of candidatos) {
      const A = (c.b * c.h) / 1e6;
      if (Q / A <= vMax) return Object.assign({}, c, { A, v: Q / A });
    }
    return null;
  },

  qP138(esp, def, A, ev) {
    const t11 = Number(def.t11) || 0, t12 = Number(def.t12) || 0, N = Number(esp.N) || 0;
    return Math.max(t11 * N, t12 * A) / Math.max(Number(ev) || 1.0, 0.1);
  },

  qEN16798(esp, def, A) {
    const N = Number(esp.N) || 0, rp = Number(def.rp) || 0, ra = Number(def.ra) || 0;
    return (rp * N * 3.6) + (ra * A * 3.6);
  },

  qMinimo(esp) { return (Number(esp.N) || 0) * 35; },

  /* ────────────────────────────────────────────────
     calcularQ_normas — V8.0.7
     ACH so se aplica a G3 e G4 (exceto Sanitorios)
     ──────────────────────────────────────────────── */
  calcularQ_normas(esp) {
    const ev = Number(VC.dados.eficaciaRemocao) || 1.0;
    const met = esp.geometriaMetodo || 'V';
    let A = Number(esp.A) || 0, H = Number(esp.H) || 0, V = Number(esp.V) || 0;
    if (met === 'LCH') { const L = Number(esp.largura) || 0, C = Number(esp.comprimento) || 0; A = L * C; H = Number(esp.altura) || H || 0; V = A * H; }
    else if (met === 'AH') { V = A * H; }
    else if (met === 'V') { if (!V && A > 0 && H > 0) V = A * H; }
    if (!A && V) A = V / 3.0;
    const def = VC.normas.getDef(esp.tipo);
    const g = esp.grupoForcado || def.g;
    const N = (g === 2 || g === 3 || g === 4) ? 0 : (esp.N != null ? Number(esp.N) : 1);
    const isento = VC.regulamento.isencoesArNovo.indexOf(esp.tipo) >= 0;
    let Q_renov = 0, Q_extracao = 0, metodoCaudal = '';
    if (g === 4) {
      if (esp.tipo === 'Sanitários' || esp.tipo === 'Balneários') {
        const xs = VC.normas.calcExtracaoSanitaria(Object.assign({}, esp, { A, H, V }));
        Q_extracao = xs.qExtracao; metodoCaudal = xs.metodo;
      } else { Q_extracao = V * def.ach; metodoCaudal = 'P138 ACH ' + def.ach; }
    } else if (g === 2 || isento) {
      Q_renov = 0; Q_extracao = 0; metodoCaudal = 'Isento (Portaria 138-I)';
    } else if (g === 3) {
      const achMin = Number(def.ach) || 0;
      const qT12 = (Number(def.t12) || 0) * A;
      const qAch = achMin * V;
      Q_renov = Math.max(qT12, qAch) / Math.max(ev, 0.1);
      metodoCaudal = achMin > 0 ? 'P138 T12 + ACH >= ' + achMin + ' (max)' : 'P138 T12 (diluicao basal)';
    } else {
      const t11 = Number(def.t11) || 0, t12 = Number(def.t12) || 0;
      Q_renov = Math.max(t11 * N, t12 * A) / Math.max(ev, 0.1);
      metodoCaudal = 'P138 T11/T12';
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
      if (esp.tipo !== 'Sanitários') {
        status = 'NÃO CONF.';
      }
    }

    return {
      V, A, H, N,
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
    if (dP === null) { dP = fb.dP0 * Math.pow(Q / fb.Q0, 2); origem = 'Estimado'; fonte = 'VDI 2081 (fallback)'; }
    if (Lw === null) Lw = fb.Lw0 + 10 * Math.log10(Math.max(Q, 1) / fb.Q0);
    const v = Number(term.v_saida) || 0;
    let status = 'OK';
    const LT = VC.constantes.TERMINAL;
    if (v > LT.vMax || Lw > LT.LwMax) status = 'NÃO CONF.';
    else if (v > LT.vAtencao || Lw > LT.LwAtencao) status = 'ATENÇÃO';
    return Object.assign({}, term, { LwCalc: Lw, dPCalc: dP, throwCalc: throw_ || 0, status, origem, fonte, v });
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

  calcularCondutas(rho, nu) {
    VC.dados.ramais.forEach(r => {
      const Qef = Number(r.Q) || 0;
      const eps = this.rugosidadeDe(r) / 1000;     // v11.1: uma só fonte de rugosidade (3.7)
      const vMax = this.vMaxDe(r);                 // v11.1: limite por nível (3.5)
      const hMax = this.hMaxDe(r);
      r.vMax = vMax; r.avisoSecao = '';
      if (r.lock && r.lock.D && r.Dcom) {
        const D = r.Dcom / 1000;
        const A = Math.PI * D * D / 4;
        const v = A > 0 ? Qef / 3600 / A : 0;
        const Re = v > 0 ? v * D / nu : 0;
        r.v = v; r.Re = Re;
        r.f = VC.fisica.fatorAtrito(Re, eps / D);
        r.R = D > 0 ? r.f / D * (0.5 * rho * v * v) : 0;
      } else {
        const z = this.dimensionarConduta(Qef, { rho, nu, vMax, eps });
        r.v = z.v; r.Re = z.Re; r.f = z.f; r.R = z.R; r.Dcom = z.Dc;
      }
      // v11.1 (3.6): a forma da secção é escolha do utilizador (geometriaInput.forma).
      // A app calcula a secção escolhida e só AVISA quando não cabe na altura disponível.
      const rect = this.retangular(hMax, 0.5, vMax, Qef);
      r.secaoAdotada = this.formaDe(r);
      if (r.secaoAdotada === 'retangular') {
        if (rect) {
          const a = rect.b / 1000, b = rect.h / 1000;
          const De = 1.30 * Math.pow(a * b, 0.625) / Math.pow(a + b, 0.25);      // diâmetro equivalente (Huebscher)
          const vDe = Qef / 3600 / (Math.PI * De * De / 4);
          r.v = Qef / 3600 / (a * b);                                             // velocidade real na secção
          r.Re = vDe * De / nu;
          r.f = VC.fisica.fatorAtrito(r.Re, eps / De);
          r.R = De > 0 ? r.f / De * (0.5 * rho * vDe * vDe) : 0;
          r.De = Math.round(De * 1000);
          r.secaoCalc = rect.b + '×' + rect.h;
        } else {
          r.secaoCalc = r.Dcom ? 'Ø' + r.Dcom : '';
          r.avisoSecao = 'Sem secção retangular com h ≤ ' + hMax + ' mm e v ≤ ' + vMax + ' m/s — calculado como circular Ø' + r.Dcom;
        }
      } else {
        r.secaoCalc = r.Dcom ? 'Ø' + r.Dcom : '';
        r.De = r.Dcom;
        if (r.Dcom && r.Dcom > hMax) r.avisoSecao = 'Ø' + r.Dcom + ' mm não cabe na altura disponível (' + hMax + ' mm)' + (rect ? ' — sugestão retangular ' + rect.b + '×' + rect.h : '');
      }
      r.deltaPlin = (Number(r.R) || 0) * (Number(r.L) || 0);
      r.deltaPsing = (Number(r.zeta) || 0) * 0.5 * rho * (Number(r.v) || 0) * (Number(r.v) || 0);
      r.deltaPTroco = r.deltaPlin + r.deltaPsing;
    });
  },

  calcularDeltaPAcumulado() {
    const byName = {};
    VC.dados.ramais.forEach(r => { byName[r.nome] = r; });
    VC.dados.ramais.forEach(r => {
      let acc = r.deltaPTroco || 0;
      let p = r.parente, guard = 0;
      while (p && byName[p] && guard++ < 100) { acc += byName[p].deltaPTroco || 0; p = byName[p].parente; }
      r.deltaPAcumulado = acc;
      r.deltaPtotal = Math.max(0, acc
        + (Number(r.deltaP_terminal) || 0)
        + (Number(r.deltaP_filtro) || 0)
        + (Number(r.deltaP_bateria) || 0)
        + (Number(r.deltaP_recup) || 0)
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
  formaDe(r) { return (r && r.geometriaInput && r.geometriaInput.forma === 'retangular') ? 'retangular' : 'circular'; },
  // v11.2: a rugosidade e a altura disponível vêm do Setup. Cada ramal guardava uma cópia (0,15 mm, 250 mm)
  // feita quando foi criado, e por isso mudar o Setup não tinha efeito. O valor do ramal só conta se for
  // marcado como próprio (geometriaInput.proprio.rugosidade / .H_max = true).
  _proprio(r, campo) {
    const g = r && r.geometriaInput;
    return !!(g && g.proprio && g.proprio[campo] && Number(g[campo]) > 0);
  },
  rugosidadeDe(r) {
    if (this._proprio(r, 'rugosidade')) return Number(r.geometriaInput.rugosidade);
    return VC.utils.num(VC.dados.params && VC.dados.params.rugosidade) || 0.15;
  },
  hMaxDe(r) {
    if (this._proprio(r, 'H_max')) return Number(r.geometriaInput.H_max);
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
      const dpExt = ramaisServidos.reduce((m, r) => Math.max(m, Number(r.deltaPtotal) || 0), 0);
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
      const P_eixo = Qms * (dpInt + dpExt) / Math.max(eta, 0.01);
      const P_motor = P_eixo * fs / Math.max(trans, 0.01);
      uta.Q = Qms; uta.dpInt = dpInt; uta.dpExt = dpExt;
      uta.sfpInt = sfpInt; uta.P_motor = P_motor;
      uta.sfpClass = VC.normas.classificarSFP(VC.normas.tipoUVPadrao(uta), sfpInt, Qms, uta.etaRec);
      uta.status = uta.sfpClass.conforme ? 'OK' : 'NÃO CONF.';
      if (uta.curva && uta.curva.length >= 2 && VC.uta && VC.uta.calcularPontoFuncionamento) uta.pontoFunc = VC.uta.calcularPontoFuncionamento(uta.rede, uta);
      const chaveRede = (uta.rede === 'insuflacao') ? 'insuflacao' : 'extracao';
      const atual = porRede[chaveRede];
      if (!atual || dpExt > atual.maxPerda) porRede[chaveRede] = { maxPerda: dpExt, Qnom: Qms };
    });
    return { ins, ext, bal: ins - ext, porRede };
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
      const vent = this.calcularVentiladores();
      const findings = [];

      VC.dados.ramais.forEach(r => {
        if (r.Re >= 2300 && r.Re < 4000) findings.push({ severidade: 'ATENÇÃO', tipo: 'Reynolds crítico', elemento: r.nome, msg: 'Re=' + VC.utils.fmt(r.Re, 0) });
        const vMax = this.vMaxDe(r);   // v11.1: mesmo limite por nível que o dimensionamento
        if (r.v > vMax + 1e-6) findings.push({ severidade: 'ERRO', tipo: 'Velocidade excessiva', elemento: r.nome, msg: 'v=' + VC.utils.fmt(r.v, 2) + ' m/s > ' + vMax + ' m/s (' + VC.utils.nivelRotulo(r.nivelNumero, true) + ')' });
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
      if (totalPower > VC.constantes.DL101D.SGTC) findings.push({ severidade: 'ATENÇÃO', tipo: 'BACS', elemento: 'Sistema', msg: 'P > ' + VC.constantes.DL101D.SGTC / 1000 + ' kW' });

      VC.dados.espacos.forEach(e => {
        const b = this.balancoEspaco(e.nome);
        if (b.estado === 'ORFAO') findings.push({ severidade: 'ERRO', tipo: 'Balanço terminal ↔ espaço', elemento: e.nome, msg: '0 terminais para Q_espaco=' + VC.utils.fmt(b.Q_nec, 0) + ' m³/h' });
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
    if (c.g === 2 || c.g === 3 || c.g === 4) estado = 'ISENTO';
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