/* ============================================================
   VENTCONDUTAS V9.0 · 02-biblioteca
   §7 Catálogo + §8 Curvas Fabricantes
   N3 Balanço de Ar + N5 Transferências
   §9 Dados V9 + §10 Migrador

   ALTERAÇÕES V9.0 (Fase 1):
   - VERSAO_ALVO: 'V8' → 'V9'                            // ← V9
   - Novo método migrarV8paraV9(dados)                    // ← V9
   - executar() encadeia V8→V9                            // ← V9
   - Restante código inalterado face ao V8.0.1

   ALTERAÇÕES V8.0.1:
   - QInDireto()  → soma QAI_projeto quando rede = 'insuflacao'
   - QOutDireto() → soma QAI_projeto quando rede = 'extracao'/'extracao_suja'
   - propagar()   → regista QAI_aplicado no balanço
   - todos()      → devolve QAI_aplicado
   - resumo()     → distingue Q_normas_total / Q_ConTerm_total / QAI_total
   - Migração QAI_projeto_* (normativo + migrador)

   ALTERAÇÕES V8.0.1-N (PERFORMANCE):
   - Interpolação de curvas otimizada com indexação O(1)/O(log n)
   - Pré-processamento de curvas no init (Qmin/Qmax/curva ordenada)
   - Restante código inalterado

   DEPENDE DE: 01-fundamentos.js + conhecimento/catalogo.js
   ============================================================ */
(function () {
'use strict';
const VC = window.VC;
window.VC6 = window.VC6 || {};
const VC6 = window.VC6;
VC._boot = VC._boot || { partes: [] };
VC._boot.partes.push('02-biblioteca');

/* ============================================================
   §7 · CATÁLOGO DE TERMINAIS
   ============================================================ */
const TIPOS_PRODUTO = VC.conhecimento.tiposProduto || [];

function catalogoExemplo() {
  return VC.conhecimento.catalogoTerminais || [];
}

VC.catalogo = {
  hierarquia: [],
  adHoc: [],
  STORAGE_KEY: 'VC_catalogo_v6',
  TIPOS: TIPOS_PRODUTO,
  _iniciado: false,

  init() {
    if (this._iniciado) return;
    this._iniciado = true;
    try {
      const s = localStorage.getItem(this.STORAGE_KEY);
      if (s) {
        const p = JSON.parse(s);
        if (p.hierarquia && p.adHoc) {
          this.hierarquia = p.hierarquia;
          this.adHoc = p.adHoc;
          this._registarAtivos();
          this._indexarTodasCurvas();
          return;
        }
      }
    } catch (e) {}
    this.hierarquia = catalogoExemplo();
    this.adHoc = [];
    this.save();
    this._registarAtivos();
    this._indexarTodasCurvas();
  },

  save: (function () {
    let timer = null;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
            hierarquia: this.hierarquia,
            adHoc: this.adHoc
          }));
        } catch (e) {}
      }, 500);
    };
  })(),

  reset() {
    this.hierarquia = catalogoExemplo();
    this.adHoc = [];
    this.save();
    this._registarAtivos();
    this._indexarTodasCurvas();
  },

  _registarAtivos() {
    const ativos = [];
    this.hierarquia.forEach(g => {
      g.fabricantes.forEach(f => {
        ativos.push({
          id: (g.tipo + '_' + f.nome).toLowerCase().replace(/\W+/g, '_'),
          tipo: g.tipo, fabricante: f.nome, ativo: true,
          fonte: 'catálogo V8', versao: '2026'
        });
      });
    });
    if (this.adHoc.length) {
      ativos.push({ id: 'adhoc', tipo: 'Ad Hoc', fabricante: 'Ad Hoc', ativo: true, fonte: 'utilizador', versao: 'V8' });
    }
    if (VC.dados) VC.dados.catalogosAtivos = ativos;
  },

  /* ────────────────────────────────────────────────
     V8.0.1-N · INDEXAÇÃO DE CURVAS (PERFORMANCE)
     ──────────────────────────────────────────────── */
  _curvasIndexadas: {},
  _chavePorCurva: new WeakMap(),

  _indexarCurva(curva) {
    if (!curva || curva.length < 2) return null;
    const chave = Object.keys(curva[0]).find(k => k !== 'Q');
    if (!chave) return null;
    const pts = curva
      .filter(p => p.Q != null && p[chave] != null)
      .map(p => ({ Q: Number(p.Q), v: Number(p[chave]) }))
      .sort((a, b) => a.Q - b.Q);
    if (pts.length < 2) return null;
    return {
      chave, pts,
      Qmin: pts[0].Q,
      Qmax: pts[pts.length - 1].Q,
      vMin: pts[0].v,
      vMax: pts[pts.length - 1].v,
      n: pts.length
    };
  },

  _indexarTodasCurvas() {
    this._curvasIndexadas = {};
    (this.hierarquia || []).forEach(g => {
      (g.fabricantes || []).forEach(f => {
        (f.familias || []).forEach(fa => {
          (fa.tamanhos || []).forEach(t => {
            ['curvaDP', 'curvaLw', 'curvaThrow'].forEach(k => {
              if (t[k]) {
                const id = (g.tipo + '|' + f.nome + '|' + fa.nome + '|' + t.nome + '|' + k).toLowerCase();
                const idx = this._indexarCurva(t[k]);
                if (idx) this._curvasIndexadas[id] = idx;
              }
            });
          });
        });
      });
    });
    (this.adHoc || []).forEach(a => {
      ['curvaDP', 'curvaLw', 'curvaThrow'].forEach(k => {
        if (a[k]) {
          const id = (a.tipo + '|ad hoc|' + a.nome + '|' + a.tamanho + '|' + k).toLowerCase();
          const idx = this._indexarCurva(a[k]);
          if (idx) this._curvasIndexadas[id] = idx;
        }
      });
    });
  },

  getTipos() { return this.TIPOS; },

  getFabricantes(tipo) {
    const g = this.hierarquia.find(x => x.tipo === tipo);
    if (!g) return ['⭐ Catálogo Ad Hoc'];
    return g.fabricantes.map(f => f.nome).concat(['⭐ Catálogo Ad Hoc']);
  },

  getFamilias(tipo, fab) {
    if (fab === '⭐ Catálogo Ad Hoc') {
      return this.adHoc.filter(a => a.tipo === tipo).map(a => a.nome);
    }
    const g = this.hierarquia.find(x => x.tipo === tipo);
    if (!g) return [];
    const f = g.fabricantes.find(x => x.nome === fab);
    return f ? f.familias.map(fam => fam.nome) : [];
  },

  getTamanhos(tipo, fab, fam) {
    if (fab === '⭐ Catálogo Ad Hoc') {
      const it = this.adHoc.find(a => a.tipo === tipo && a.nome === fam);
      return it ? [it.tamanho] : [];
    }
    const g = this.hierarquia.find(x => x.tipo === tipo);
    if (!g) return [];
    const f = g.fabricantes.find(x => x.nome === fab);
    if (!f) return [];
    const fa = f.familias.find(x => x.nome === fam);
    return fa ? fa.tamanhos.map(t => t.nome) : [];
  },

  getProduto(tipo, fab, fam, tam) {
    if (fab === '⭐ Catálogo Ad Hoc') {
      const it = this.adHoc.find(a => a.tipo === tipo && a.nome === fam && a.tamanho === tam);
      if (!it) return null;
      return Object.assign({ fabricante: 'Ad Hoc', familia: it.nome, tamanho: it.tamanho, adHoc: true }, it);
    }
    const g = this.hierarquia.find(x => x.tipo === tipo);
    if (!g) return null;
    const f = g.fabricantes.find(x => x.nome === fab);
    if (!f) return null;
    const fa = f.familias.find(x => x.nome === fam);
    if (!fa) return null;
    const t = fa.tamanhos.find(x => x.nome === tam);
    if (!t) return null;
    return Object.assign({ fabricante: fab, familia: fam, tamanho: tam, adHoc: false }, t);
  },

  /* ────────────────────────────────────────────────
     V8.0.1-N · INTERPOLAR (OTIMIZADO)
     ──────────────────────────────────────────────── */
  interpolar(curva, Q) {
    if (!curva || curva.length < 2) return null;
    Q = Number(Q);
    if (!isFinite(Q)) return null;

    let idx = this._chavePorCurva.get(curva);
    if (!idx) {
      idx = this._indexarCurva(curva);
      if (idx) this._chavePorCurva.set(curva, idx);
    }
    if (idx) {
      if (Q <= idx.Qmin) return idx.vMin;
      if (Q >= idx.Qmax) return idx.vMax;
      const pts = idx.pts;
      let lo = 0, hi = pts.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (pts[mid].Q <= Q) lo = mid; else hi = mid;
      }
      const a = pts[lo], b = pts[hi];
      const t = (Q - a.Q) / (b.Q - a.Q);
      return a.v + t * (b.v - a.v);
    }

    const chave = Object.keys(curva[0]).find(k => k !== 'Q');
    if (!chave) return null;
    const pts = curva.filter(p => p.Q != null && p[chave] != null).sort((a, b) => a.Q - b.Q);
    if (pts.length < 2) return null;
    if (Q <= pts[0].Q) return pts[0][chave];
    if (Q >= pts[pts.length - 1].Q) return pts[pts.length - 1][chave];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if (Q >= a.Q && Q <= b.Q) {
        const t = (Q - a.Q) / (b.Q - a.Q);
        return a[chave] + t * (b[chave] - a[chave]);
      }
    }
    return null;
  },

  adicionarAdHoc(produto) {
    if (!produto || !produto.nome || !produto.tipo || !produto.tamanho) return false;
    if (this.adHoc.find(a => a.tipo === produto.tipo && a.nome === produto.nome)) return false;
    this.adHoc.push(produto);
    this.save();
    this._registarAtivos();
    this._indexarTodasCurvas();
    return true;
  },

  removerAdHoc(tipo, nome) {
    this.adHoc = this.adHoc.filter(a => !(a.tipo === tipo && a.nome === nome));
    this.save();
    this._registarAtivos();
    this._indexarTodasCurvas();
  },

  contarPorCatalogo() {
    const out = [];
    this.hierarquia.forEach(g => {
      g.fabricantes.forEach(f => {
        let produtos = 0, tamanhos = 0;
        f.familias.forEach(fa => {
          produtos += fa.tamanhos.length;
          tamanhos += fa.tamanhos.length;
        });
        out.push({
          tipo: g.tipo, fabricante: f.nome,
          modelos: f.familias.length, tamanhos, produtos
        });
      });
    });
    return out;
  }
};

/* ============================================================
   §8 · CURVAS DE FABRICANTES
   ============================================================ */
VC.curvasFabricantes = {
  _base: [],
  _iniciado: false,

  init() {
    if (this._iniciado) return;
    this._iniciado = true;
    this._base = VC.conhecimento.curvasFabricantes || [];
    this._indexar();
  },

  _indexado: {},
  _indexar() {
    this._indexado = {};
    this._base.forEach(c => {
      if (!c.pontos || c.pontos.length < 2) return;
      const pts = c.pontos
        .filter(p => p.Q != null && p.dP != null)
        .map(p => ({ Q: Number(p.Q), dP: Number(p.dP) }))
        .sort((a, b) => a.Q - b.Q);
      if (pts.length < 2) return;
      const id = c.fabricante + '|' + c.serie + '|' + c.modelo;
      this._indexado[id] = {
        pts,
        Qmin: pts[0].Q,
        Qmax: pts[pts.length - 1].Q,
        dPmin: pts[0].dP,
        dPmax: pts[pts.length - 1].dP,
        n: pts.length
      };
    });
  },

  fabricantes() { return Array.from(new Set(this._base.map(c => c.fabricante))); },
  series(fabricante) { return Array.from(new Set(this._base.filter(c => c.fabricante === fabricante).map(c => c.serie))); },
  modelos(fabricante, serie) { return this._base.filter(c => c.fabricante === fabricante && c.serie === serie).map(c => c.modelo); },
  todas(rede) { if (!rede) return this._base.slice(); return this._base.filter(c => c.rede === rede); },
  get(fabricante, serie, modelo) { return this._base.find(c => c.fabricante === fabricante && c.serie === serie && c.modelo === modelo) || null; },

  compativeisCom(rede, Qmh) {
    const lista = this.todas(rede);
    if (!Qmh || Qmh <= 0) return lista.slice();
    return lista.filter(c => {
      const qMin = (c.pontos[0] || {}).Q || 0;
      const qMax = (c.pontos[c.pontos.length - 1] || {}).Q || c.Q_nom * 2;
      return Qmh >= qMin * 0.7 && Qmh <= qMax * 1.2;
    });
  },

  interpolar(curva, Qmh) {
    if (!curva || !curva.pontos || curva.pontos.length < 2) return null;
    Qmh = Number(Qmh);
    if (!isFinite(Qmh)) return null;

    const id = curva.fabricante + '|' + curva.serie + '|' + curva.modelo;
    const idx = this._indexado[id];
    if (idx) {
      if (Qmh <= idx.Qmin) return idx.dPmin;
      if (Qmh >= idx.Qmax) return idx.dPmax;
      const pts = idx.pts;
      let lo = 0, hi = pts.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (pts[mid].Q <= Qmh) lo = mid; else hi = mid;
      }
      const a = pts[lo], b = pts[hi];
      const t = (Qmh - a.Q) / Math.max(b.Q - a.Q, 0.0001);
      return a.dP + t * (b.dP - a.dP);
    }

    const pts = curva.pontos;
    if (Qmh <= pts[0].Q) return pts[0].dP;
    if (Qmh >= pts[pts.length - 1].Q) return pts[pts.length - 1].dP;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if (Qmh >= a.Q && Qmh <= b.Q) {
        const t = (Qmh - a.Q) / Math.max(b.Q - a.Q, 0.0001);
        return a.dP + t * (b.dP - a.dP);
      }
    }
    return null;
  },

  paraCurvaUTA(fabricante, serie, modelo) {
    const c = this.get(fabricante, serie, modelo);
    if (!c) return null;
    return c.pontos.map(p => ({ Q: p.Q, dP: p.dP }));
  },

  paraDropdown(rede) {
    const out = {};
    this.todas(rede).forEach(c => {
      if (!out[c.fabricante]) out[c.fabricante] = {};
      if (!out[c.fabricante][c.serie]) out[c.fabricante][c.serie] = [];
      out[c.fabricante][c.serie].push(c.modelo);
    });
    return out;
  },

  aplicarNaUTA(uta, fabricante, serie, modelo) {
    if (!uta) return false;
    const curva = this.paraCurvaUTA(fabricante, serie, modelo);
    if (!curva) return false;
    uta.curva = curva;
    uta.curvaFabricante = { fabricante, serie, modelo };
    const meta = this.get(fabricante, serie, modelo);
    if (meta) {
      uta.Q_nom = meta.Q_nom;
      uta.dP_nom = meta.dP_nom;
      uta.rpm_max = meta.rpm_max;
      uta.P_max = meta.P_max;
      uta.eta = meta.eta_max;
    }
    return true;
  }
};
VC.curvasFabricantes.init();

/* ============================================================
   N3 · BALANÇO DE AR
   Nomenclatura V8: Q_normas (antes Q_reg)
   V8.0.1: inclui QAI_projeto (insuflação ou extração)
   ============================================================ */
VC6.balanco = {
  TOLERANCIA: 5,

  _qaiInfo(esp) {
    if (!VC.flags || VC.flags.qaiProjeto === false) return { QAI_aplicado: 0, rede: 'insuflacao' };
    if (VC.calculo && VC.calculo.calcularQAI) {
      const q = VC.calculo.calcularQAI(esp);
      return { QAI_aplicado: q.QAI_projeto, rede: q.rede };
    }
    const v = Math.max(0, Number(esp.QAI_projeto) || 0);
    let rede = esp.QAI_projeto_rede || 'auto';
    if (rede === 'auto') {
      const def = VC.normas.getDef(esp.tipo);
      const g = esp.grupoForcado || def.g || 1;
      const tabela = VC.conhecimento.qaiProjetoRedeDefault || VC._normativo.qaiProjetoRedeDefault || {};
      rede = tabela[g] || 'insuflacao';
    }
    return { QAI_aplicado: v, rede };
  },

  QInDireto(esp) {
    const qDireto = (esp.definicoes || [])
      .filter(d => d.rede === 'insuflacao')
      .reduce((s, d) => s + (Number(d.Q_total) || 0), 0);
    const g = esp.g || (VC.normas.getDef(esp.tipo).g);
    const qConforto = (g === 4) ? 0 : (Number(esp.Q_ConTerm) || 0);
    const qai = this._qaiInfo(esp);
    const qAI_in = (qai.rede === 'insuflacao') ? qai.QAI_aplicado : 0;
    return qDireto + qConforto + qAI_in;
  },

  QOutDireto(esp) {
    const qDireto = (esp.definicoes || [])
      .filter(d => d.rede === 'extracao' || d.rede === 'extracao_suja')
      .reduce((s, d) => s + (Number(d.Q_total) || 0), 0);
    const g = esp.g || (VC.normas.getDef(esp.tipo).g);
    const qConforto = (g === 4) ? (Number(esp.Q_ConTerm) || 0) : 0;
    const qai = this._qaiInfo(esp);
    const qAI_out = (qai.rede === 'extracao' || qai.rede === 'extracao_suja') ? qai.QAI_aplicado : 0;
    return qDireto + qConforto + qAI_out;
  },

  QTransfIn(esp, transferencias) {
    transferencias = transferencias || (VC.dados && VC.dados.transferencias) || [];
    return transferencias.filter(t => t.paraId === esp.id).reduce((s, t) => s + (Number(t.Q) || 0), 0);
  },

  QTransfOut(esp, transferencias) {
    transferencias = transferencias || (VC.dados && VC.dados.transferencias) || [];
    return transferencias.filter(t => t.deId === esp.id).reduce((s, t) => s + (Number(t.Q) || 0), 0);
  },

  residuo(esp, transferencias) {
    return (this.QInDireto(esp) + this.QTransfIn(esp, transferencias))
         - (this.QOutDireto(esp) + this.QTransfOut(esp, transferencias));
  },

  pressaoRelativa(esp, deltaQ) {
    const A = Math.max(Number(esp.A) || 20, 5);
    return 0.5 * Math.sign(deltaQ) * Math.sqrt(Math.abs(deltaQ)) * 100 / A;
  },

  validarEspaco(esp, transferencias) {
    const r = this.residuo(esp, transferencias);
    const g = esp.g || VC.normas.getDef(esp.tipo).g;
    const qConforto = Number(esp.Q_ConTerm) || 0;
    if (g === 2 && qConforto === 0) return { ok: true, residuo: 0, msg: 'Isento (G2 sem conforto)' };
    if (Math.abs(r) <= this.TOLERANCIA) return { ok: true, residuo: r, msg: 'OK' };
    if (Math.abs(r) <= this.TOLERANCIA * 2) return { ok: false, residuo: r, msg: 'DESEQUILIBRIO_LEVE' };
    return { ok: false, residuo: r, msg: 'DESEQUILIBRIO_GRAVE' };
  },

  detetarCiclos(transferencias) {
    transferencias = transferencias || (VC.dados && VC.dados.transferencias) || [];
    const adj = {};
    transferencias.forEach(t => {
      if (!adj[t.deId]) adj[t.deId] = [];
      adj[t.deId].push(t.paraId);
    });
    const visitados = new Set(), pilha = new Set(), ciclos = [];
    const dfs = (no, caminho) => {
      if (pilha.has(no)) { ciclos.push(caminho.slice(caminho.indexOf(no))); return; }
      if (visitados.has(no)) return;
      visitados.add(no); pilha.add(no);
      (adj[no] || []).forEach(viz => dfs(viz, caminho.concat([no])));
      pilha.delete(no);
    };
    Object.keys(adj).forEach(no => dfs(no, []));
    return ciclos;
  },

  propagar() {
    const espacos = (VC.dados && VC.dados.espacos) || [];
    const transferencias = (VC.dados && VC.dados.transferencias) || [];
    const resultado = [];
    espacos.forEach(esp => {
      const g = esp.g || VC.normas.getDef(esp.tipo).g;
      const qConforto = Number(esp.Q_ConTerm) || 0;
      const qConfortoIn = (g === 4) ? 0 : qConforto;
      const qConfortoOut = (g === 4) ? qConforto : 0;

      const qai = this._qaiInfo(esp);

      const inD = this.QInDireto(esp);
      const outD = this.QOutDireto(esp);
      const inT = this.QTransfIn(esp, transferencias);
      const outT = this.QTransfOut(esp, transferencias);
      const r = (inD + inT) - (outD + outT);
      const pressao = this.pressaoRelativa(esp, r);

      let estado = 'OK';
      if (Math.abs(r) > this.TOLERANCIA * 2) estado = 'DESEQUILIBRIO_GRAVE';
      else if (Math.abs(r) > this.TOLERANCIA) estado = 'DESEQUILIBRIO_LEVE';

      esp.balanco = {
        Q_in_direto: inD,
        Q_out_direto: outD,
        Q_conforto_in: qConfortoIn,
        Q_conforto_out: qConfortoOut,
        QAI_aplicado: qai.QAI_aplicado,
        QAI_rede: qai.rede,
        Q_transf_in: inT,
        Q_transf_out: outT,
        exfiltracao: 0,
        residuo: r,
        pressao_relativa_Pa: pressao,
        estado: estado
      };
      esp.transferencias = transferencias.filter(t => t.deId === esp.id || t.paraId === esp.id);
      resultado.push({
        id: esp.id, nome: esp.nome, g,
        Q_in_direto: inD, Q_out_direto: outD,
        Q_conforto_in: qConfortoIn, Q_conforto_out: qConfortoOut,
        QAI_aplicado: qai.QAI_aplicado, QAI_rede: qai.rede,
        Q_transf_in: inT, Q_transf_out: outT,
        residuo: r, pressao_relativa_Pa: pressao, estado
      });
    });
    return resultado;
  },

  validarSistema(espacos, transferencias) {
    espacos = espacos || (VC.dados && VC.dados.espacos) || [];
    transferencias = transferencias || (VC.dados && VC.dados.transferencias) || [];
    const falhas = [];
    espacos.forEach(esp => {
      const v = this.validarEspaco(esp, transferencias);
      if (!v.ok) falhas.push({ espaco: esp.nome, espacoId: esp.id, residuo: v.residuo, msg: v.msg });
    });
    const ciclos = this.detetarCiclos(transferencias);
    if (ciclos.length) falhas.push({ tipo: 'CICLOS', detalhe: ciclos, count: ciclos.length });
    return { ok: falhas.length === 0, falhas };
  },

  sugerirCorrecao(esp, transferencias) {
    const r = this.residuo(esp, transferencias);
    if (Math.abs(r) <= this.TOLERANCIA) return { ok: true, sugestao: 'Balanço OK', acao: null };
    const g = esp.g || VC.normas.getDef(esp.tipo).g;
    if (r > 0) return { ok: false, sugestao: 'Adicionar extração de ' + r.toFixed(1) + ' m³/h', acao: 'adicionar_extracao', delta: r };
    if (r < 0) {
      if (g === 4) return { ok: false, sugestao: 'Adicionar make-up de ' + Math.abs(r).toFixed(1) + ' m³/h via transferência', acao: 'adicionar_transferencia', delta: Math.abs(r) };
      return { ok: false, sugestao: 'Reduzir extração ou adicionar insuflação', acao: 'adicionar_insuflacao', delta: Math.abs(r) };
    }
    return { ok: true, sugestao: 'Balanço OK', acao: null };
  },

  todos() {
    return (VC.dados && VC.dados.espacos || []).map(e => e.balanco || {
      id: e.id, nome: e.nome, g: e.g || 1,
      Q_in_direto: 0, Q_out_direto: 0,
      Q_conforto_in: 0, Q_conforto_out: 0,
      QAI_aplicado: 0, QAI_rede: 'insuflacao',
      Q_transf_in: 0, Q_transf_out: 0,
      residuo: 0, pressao_relativa_Pa: 0, estado: 'PENDENTE'
    });
  },

  resumo() {
    const balancos = this.todos();
    const total = balancos.length;
    const ok = balancos.filter(b => b.estado === 'OK').length;
    const leve = balancos.filter(b => b.estado === 'DESEQUILIBRIO_LEVE').length;
    const grave = balancos.filter(b => b.estado === 'DESEQUILIBRIO_GRAVE').length;
    const isentos = (VC.dados && VC.dados.espacos || []).filter(e => {
      const g = e.g || VC.normas.getDef(e.tipo).g;
      return g === 2 && (Number(e.Q_ConTerm) || 0) === 0;
    }).length;
    const comConforto = (VC.dados && VC.dados.espacos || []).filter(e => (Number(e.Q_ConTerm) || 0) > 0).length;
    const comQAI = (VC.dados && VC.dados.espacos || []).filter(e => (Number(e.QAI_projeto) || 0) > 0).length;
    const somaAbsResiduo = balancos.reduce((s, b) => s + Math.abs(b.residuo), 0);
    let Q_normas_total = 0, Q_ConTerm_total = 0, QAI_total = 0, Q_total_geral = 0;
    (VC.dados && VC.dados.espacos || []).forEach(e => {
      Q_normas_total += Number(e.Q_normas) || 0;
      Q_ConTerm_total += Number(e.Q_ConTerm) || 0;
      QAI_total += Number(e.QAI_projeto) || 0;
      Q_total_geral += Number(e.Q_total || e.Q_espaco) || 0;
    });
    return {
      total, ok, leve, grave, isentos, comConforto, comQAI,
      somaAbsResiduo, residuoGlobal: somaAbsResiduo,
      Q_normas_total, Q_ConTerm_total, QAI_total, Q_total_geral
    };
  }
};

/* ============================================================
   N5 · TRANSFERÊNCIAS
   ============================================================ */
VC6.transferencias = {
  CATALOGO: VC.conhecimento.tiposTransferencia || [],

  dimensionarArea(Q, dP_Pa) {
    Q = Number(Q) || 0;
    dP_Pa = Math.max(Number(dP_Pa) || 1, 0.01);
    return Q / (0.36 * Math.sqrt(dP_Pa));
  },

  dimensionarDeltaP(Q, A) {
    Q = Number(Q) || 0;
    A = Math.max(Number(A) || 1, 0.01);
    return Math.pow(Q / (0.36 * A), 2);
  },

  sugerirSolucao(tipoEspaco, direcao) {
    const g = VC.normas.getDef(tipoEspaco).g;
    if (g === 4) return direcao === 'entrada' ? 'fresta_porta' : 'grelha_extracao';
    if (g === 2) return 'grelha_transferencia';
    return 'grelha_transferencia';
  },

  criar(deId, paraId, Q, tipo) {
    const espacos = (VC.dados && VC.dados.espacos) || [];
    const de = espacos.find(e => e.id === deId);
    const para = espacos.find(e => e.id === paraId);
    if (!de || !para) return { ok: false, erro: 'Espaços inválidos' };
    if (Number(Q) <= 0) return { ok: false, erro: 'Q deve ser > 0' };

    const existentes = (VC.dados && VC.dados.transferencias) || [];
    const hipoteticas = existentes.concat([{ deId, paraId }]);
    const adj = {};
    hipoteticas.forEach(t => {
      if (!adj[t.deId]) adj[t.deId] = [];
      adj[t.deId].push(t.paraId);
    });
    const visitados = new Set(), pilha = new Set();
    let temCiclo = false;
    const dfs = (no) => {
      if (temCiclo) return;
      if (pilha.has(no)) { temCiclo = true; return; }
      if (visitados.has(no)) return;
      visitados.add(no); pilha.add(no);
      (adj[no] || []).forEach(dfs);
      pilha.delete(no);
    };
    Object.keys(adj).forEach(dfs);
    if (temCiclo) return { ok: false, erro: 'Cria ciclo A→B→A' };

    const trf = {
      id: 'TRF-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4),
      deId, paraId, deNome: de.nome, paraNome: para.nome,
      Q: Number(Q) || 0,
      tipo: tipo || 'grelha_transferencia',
      area_cm2: this.dimensionarArea(Q, 2),
      dP_Pa: 2
    };
    if (!VC.dados.transferencias) VC.dados.transferencias = [];
    VC.dados.transferencias.push(trf);
    return { ok: true, transferencia: trf };
  },

  remover(id) {
    if (!VC.dados.transferencias) return false;
    const antes = VC.dados.transferencias.length;
    VC.dados.transferencias = VC.dados.transferencias.filter(t => t.id !== id);
    return VC.dados.transferencias.length < antes;
  },

  validar(trf) {
    if (!trf) return { ok: false, erro: 'Transferência nula' };
    if (!trf.deId || !trf.paraId) return { ok: false, erro: 'IDs inválidos' };
    if (Number(trf.Q) <= 0) return { ok: false, erro: 'Q ≤ 0' };
    const espacos = (VC.dados && VC.dados.espacos) || [];
    if (!espacos.find(e => e.id === trf.deId)) return { ok: false, erro: 'Espaço de origem inexistente' };
    if (!espacos.find(e => e.id === trf.paraId)) return { ok: false, erro: 'Espaço de destino inexistente' };
    return { ok: true };
  },

  detetarCiclos() { return VC6.balanco ? VC6.balanco.detetarCiclos() : []; },

  sugerirAutoBalanco() {
    const espacos = (VC.dados && VC.dados.espacos) || [];
    const sugestoes = [];
    const gOrdem = { 4: 0, 2: 1, 3: 2, 1: 3 };
    const lista = espacos.slice().sort((a, b) => {
      const ga = VC.normas.getDef(a.tipo).g, gb = VC.normas.getDef(b.tipo).g;
      return (gOrdem[ga] || 9) - (gOrdem[gb] || 9);
    });
    lista.forEach(esp => {
      const r = VC6.balanco.residuo(esp);
      if (Math.abs(r) <= VC6.balanco.TOLERANCIA) return;
      const g = esp.g || VC.normas.getDef(esp.tipo).g;
      if (r < 0 && g === 4) {
        const vizinhos = lista.filter(e => e.id !== esp.id && e.tipo === 'Circulação');
        if (vizinhos.length) {
          const candidato = vizinhos[0];
          const rViz = VC6.balanco.residuo(candidato);
          if (rViz > 0) {
            const Qsug = Math.min(Math.abs(r), rViz);
            sugestoes.push({
              deId: candidato.id, deNome: candidato.nome,
              paraId: esp.id, paraNome: esp.nome,
              Q: Qsug, tipo: this.sugerirSolucao(esp.tipo, 'entrada'),
              motivo: esp.nome + ' em depressão'
            });
          }
        }
      } else if (r > 0 && g === 1) {
        const vizinhos = lista.filter(e => e.id !== esp.id && e.tipo === 'Circulação');
        if (vizinhos.length) {
          const candidato = vizinhos[0];
          const rViz = VC6.balanco.residuo(candidato);
          if (rViz < 0) {
            const Qsug = Math.min(r, Math.abs(rViz));
            sugestoes.push({
              deId: esp.id, deNome: esp.nome,
              paraId: candidato.id, paraNome: candidato.nome,
              Q: Qsug, tipo: this.sugerirSolucao(esp.tipo, 'saida'),
              motivo: esp.nome + ' com excesso'
            });
          }
        }
      }
    });
    return sugestoes;
  },

  todas() {
    const espacos = (VC.dados && VC.dados.espacos) || [];
    const byId = {};
    espacos.forEach(e => { byId[e.id] = e; });
    return ((VC.dados && VC.dados.transferencias) || []).map(t => {
      const de = byId[t.deId];
      const para = byId[t.paraId];
      return Object.assign({}, t, {
        deNome: de ? de.nome : (t.deNome || '?'),
        paraNome: para ? para.nome : (t.paraNome || '?'),
        deTipo: de ? de.tipo : '',
        paraTipo: para ? para.tipo : '',
        area_cm2: t.area_cm2 || this.dimensionarArea(t.Q, t.dP_Pa || 2)
      });
    });
  },

  aplicarSugestao(sug) { return this.criar(sug.deId, sug.paraId, sug.Q, sug.tipo); },

  aplicarTodasSugestoes() {
    const sugestoes = this.sugerirAutoBalanco();
    let n = 0;
    sugestoes.forEach(s => {
      const r = this.aplicarSugestao(s);
      if (r.ok) n++;
    });
    if (VC6.balanco) VC6.balanco.propagar();
    return n;
  }
};

/* ============================================================
   §9 · DADOS V9
   ============================================================ */
VC.dados = VC.dados || {};
Object.assign(VC.dados, {
    _versao: 'V9',                                            // ← V9
  _migradoEm: null,
  _migradoDe: null,
  _backupDisponivel: false,
  _mapaRenomeacao: VC.dados._mapaRenomeacao || {},
  metadados: VC.dados.metadados || {
    nome: 'Degrade Torres Vedras 18out26',
    cliente: '', local: 'Torres Vedras, Portugal', autor: '', revisao: '01'
  },
  params: VC.dados.params || { altitude: 150, temperatura: 22, humidade: 50, rugosidade: 0.15 },
  tipologia: VC.dados.tipologia || 'publico',
  restricaoH: VC.dados.restricaoH || 250,
  eficaciaRemocao: VC.dados.eficaciaRemocao || 1.0,
  classeEnergetica: VC.dados.classeEnergetica || 'B',
  tipoSistemaResidencial: VC.dados.tipoSistemaResidencial || 'vmc_simples',
  serieDiametros: VC.dados.serieDiametros || 'S1',
  metodoCalculo: VC.dados.metodoCalculo || { metodo: 'loss', label: 'Perda de carga constante' },
  estanquidade: VC.dados.estanquidade || { classe: 'B' },
  filtros: VC.dados.filtros || { modo: 'sujo' },
  custoEnergetico: VC.dados.custoEnergetico || { horasAno: 2500, precoKwh: 0.18, fatorCarga: 0.65 },
  dilatacao: VC.dados.dilatacao || { tempFunc: 22, tempInst: 12, alphaAco: 12e-6 },
  acessibilidade: VC.dados.acessibilidade || { espacoTetoMin: 500, acessoFiltroMin: 600 },
  velocidadeMax: VC.dados.velocidadeMax || {
    tabela: {
      'Escritório': 4.0, 'Sala de reuniões': 4.0, 'Receção': 4.5, 'Sala de aula': 4.5,
      'Consulta': 3.5, 'Internamento': 3.5, 'Restauração': 5.0, 'Cozinha': 6.0,
      'Garagem': 10.0, 'Circulação': 5.0, 'Escadas': 5.0, 'Sanitários': 5.0,
      'Laboratório': 6.0, 'Auditório': 4.0, 'default': 6.0
    }
  },
  compartimentos: VC.dados.compartimentos || [
    { id: 'CF-P0', nome: 'Piso 0', RF: 60, piso: 'P0', ativo: true },
    { id: 'CF-P1', nome: 'Piso 1', RF: 60, piso: 'P1', ativo: true }
  ],
  espacos: VC.dados.espacos || [],
  ramais: VC.dados.ramais || [],
  terminais: VC.dados.terminais || [],
  nos: VC.dados.nos || [],
  trechos: VC.dados.trechos || [],
  elementosRede: VC.dados.elementosRede || [],
  utas: VC.dados.utas || [],
  transferencias: VC.dados.transferencias || [],
  catalogosAtivos: VC.dados.catalogosAtivos || [],
  selecionado: VC.dados.selecionado || { tipo: null, id: null },
  congelado: VC.dados.congelado || false,
  caminhoEntrada: VC.dados.caminhoEntrada || 'tabela',
  espacoExpandido: VC.dados.espacoExpandido || null,
  ramalTopologiaAtivo: VC.dados.ramalTopologiaAtivo || null,
  arvoreEstado: VC.dados.arvoreEstado || { expandidos: {}, selecionado: null, filtro: 'tudo' },
  historicoConvergencia: VC.dados.historicoConvergencia || [],
  nextId: VC.dados.nextId || {
    espaco: 1, ramal: 1, terminal: 1, componente: 1, uta: 1,
    no: 1, trecho: 1, elemento: 1, definicao: 1, transferencia: 1
  }
});

/* ============================================================
   §10 · MIGRADOR
   Cadeia completa: V3 → V5 → V6 → V8 → V9
   ============================================================ */
VC.migrador = {
    VERSAO_ALVO: 'V9',                                        // ← V9

  precisaMigrar(projeto) {
    if (!projeto) return false;
    if (!projeto._versao) return true;
    const v = projeto._versao;
    if (v === 'V3' || v === 'V4' || v === 'V5' || v === 'V6' || v === 'V8') return true;
    return v !== this.VERSAO_ALVO;
  },

  backupAntes(projeto) {
    try {
      if (projeto && projeto.dados) {
        VC._backup_anterior = VC.utils.clonar({
          _versao: projeto._versao || '?',
          _migradoEm: new Date().toISOString(),
          metadados: projeto.metadados,
          dados: projeto.dados,
          flags: projeto.flags
        });
        return true;
      }
    } catch (e) { VC.debug && VC.debug.erro && VC.debug.erro(e); }
    return false;
  },

  migrarEspacos(dados) {
    let n = 0;
    (dados.espacos || []).forEach(e => {
      if (e.requisitosTerminais && !e.definicoes) {
        e.definicoes = e.requisitosTerminais;
        delete e.requisitosTerminais;
        n++;
      }
      if (!Array.isArray(e.definicoes)) e.definicoes = [];
      if (!e.localizacao) e.localizacao = VC.utils.parseZona(e.zona || '');
      if (e.Q_espaco == null) e.Q_espaco = 0;
      if (e.rphDefault == null) e.rphDefault = 0;
      if (e.rphAplicado == null) e.rphAplicado = 0;
      if (e.rphOrigem == null) e.rphOrigem = 'norma';
      if (e.Q_ConTerm == null) e.Q_ConTerm = 0;
      if (e.Q_total_espaco == null) e.Q_total_espaco = 0;
      if (e.QAI_projeto == null) e.QAI_projeto = 0;
      if (e.QAI_projeto_origem == null) e.QAI_projeto_origem = 'norma';
      if (e.QAI_projeto_motivo == null) e.QAI_projeto_motivo = '';
      if (e.QAI_projeto_rede == null) e.QAI_projeto_rede = 'auto';
    });
    return n;
  },

  migrarRamais(dados) {
    let n = 0;
    (dados.ramais || []).forEach(r => {
      if ('Qefetivo' in r) delete r.Qefetivo;
      if ('espacosServidos' in r) delete r.espacosServidos;
      if (r.lock) r.lock = { D: !!r.lock.D }; else r.lock = { D: false };
      if (!r.nivel) r.nivel = (r.tipo === 'Principal' ? 'primario' : 'secundario');
      if (!r.nivelNumero) r.nivelNumero = VC.utils.nivelTextoParaNumero(r.nivel);
      if (!r.localizacao) r.localizacao = { piso: null, ala: null, cota: null };
      if (!r.geometriaInput) r.geometriaInput = {
        material: 'Aço galvanizado',
        rugosidade: Number(VC.dados.params.rugosidade) || 0.15,
        forma: 'circular',
        H_max: Number(VC.dados.restricaoH) || 250
      };
      if (r.Q_proprio == null) r.Q_proprio = 0;
      if (r.Q_filhos == null) r.Q_filhos = 0;
      if (r.utaRef == null) r.utaRef = null;
    });
    return n;
  },

  migrarTerminais(dados) {
    let n = 0;
    (dados.terminais || []).forEach(t => {
      if (t.requisitoRef && !t.definicaoRef) {
        t.definicaoRef = t.requisitoRef;
        delete t.requisitoRef;
        n++;
      }
      if (!t.definicaoRef) t.definicaoRef = null;
      if (!Array.isArray(t.espacos)) t.espacos = [];
      if (t.Q_medido === undefined) t.Q_medido = null;
      t.Q = t.espacos.reduce((s, e) => s + (Number(e.Q_parcela) || 0), 0);
    });
    return n;
  },

  migrarAssociacoes(projetoV3, dadosV4) {
    let n = 0;
    const ramaisV3 = (projetoV3.dados && projetoV3.dados.ramais) || [];
    const terminais = dadosV4.terminais || [];
    ramaisV3.forEach(rV3 => {
      const servidos = rV3.espacosServidos || [];
      if (!servidos.length) return;
      servidos.forEach(es => {
        const nomeEspaco = es.nome;
        const redeRamal = rV3.rede || 'insuflacao';
        terminais.forEach(t => {
          if (t.ramalRef) return;
          const temEspaco = Array.isArray(t.espacos) && t.espacos.some(e => e.nome === nomeEspaco);
          if (!temEspaco) return;
          if (t.rede && t.rede !== redeRamal) return;
          t.ramalRef = rV3.nome;
          n++;
        });
      });
    });
    return n;
  },

  migrarV4paraV5(dados) {
    let n = 0;
    (dados.espacos || []).forEach(e => {
      if (e.ramalRefInsuflacao == null) e.ramalRefInsuflacao = '';
      if (e.ramalRefExtracao == null) e.ramalRefExtracao = '';
      if (e.Q_espaco == null) e.Q_espaco = 0;
      n++;
    });
    (dados.ramais || []).forEach(r => {
      if (r.utaRef == null) r.utaRef = null;
      if (!r.utaRef && r.tipo === 'Principal' && dados.utas && dados.utas.length) {
        const utasRede = dados.utas.filter(u => u.rede === (r.rede || 'insuflacao'));
        if (utasRede.length === 1) r.utaRef = utasRede[0].id;
      }
      if (r.Q_proprio == null) r.Q_proprio = 0;
      if (r.Q_filhos == null) r.Q_filhos = 0;
      if (r.Q == null) r.Q = 0;
    });
    (dados.terminais || []).forEach(t => {
      if (!t.ramalRef && t.definicaoRef && t.definicaoRef.espacoId && dados.espacos) {
        const esp = dados.espacos.find(e => e.id === t.definicaoRef.espacoId);
        if (esp) {
          const rede = t.rede || 'insuflacao';
          t.ramalRef = (rede === 'extracao' || rede === 'extracao_suja')
            ? (esp.ramalRefExtracao || '')
            : (esp.ramalRefInsuflacao || '');
        }
      }
    });
    return n;
  },

  migrarV5paraV6(dados) {
    let n = 0;
    const mapa = {};
    const ramais = dados.ramais || [];
    const byParente = {};
    ramais.forEach(r => {
      const p = r.parente || '';
      if (!byParente[p]) byParente[p] = [];
      byParente[p].push(r);
    });

    const ordenarIrmaos = (lista) => lista.slice().sort((a, b) => {
      const pa = (a.localizacao && a.localizacao.piso) || '';
      const pb = (b.localizacao && b.localizacao.piso) || '';
      if (pa !== pb) return pa.localeCompare(pb);
      const aa = (a.localizacao && a.localizacao.ala) || '';
      const ab = (b.localizacao && b.localizacao.ala) || '';
      if (aa !== ab) return aa.localeCompare(ab);
      return String(a.nome).localeCompare(String(b.nome));
    });

    const fila = [''];
    const visitados = new Set();
    const indicesPorNivel = {};

    while (fila.length) {
      const pai = fila.shift();
      const irmaos = ordenarIrmaos(byParente[pai] || []);
      irmaos.forEach((r, i) => {
        const nivelNum = VC.utils.nivelTextoParaNumero(
          r.nivel || (r.tipo === 'Principal' ? 'primario' : 'secundario')
        );
        if (!indicesPorNivel[nivelNum]) indicesPorNivel[nivelNum] = 0;
        indicesPorNivel[nivelNum]++;
        let nomeNovo;
        if (nivelNum === 1) {
          nomeNovo = 'R1.' + indicesPorNivel[1];
        } else {
          const nomePai = r.parente ? (mapa[r.parente] || r.parente) : null;
          if (nomePai) nomeNovo = nomePai + '.' + (i + 1);
          else nomeNovo = 'R' + nivelNum + '.' + indicesPorNivel[nivelNum];
        }
        mapa[r.nome] = nomeNovo;
        r.nomeAntigo = r.nome;
        r.nome = nomeNovo;
        r.nivelNumero = nivelNum;
        n++;
        if (!visitados.has(r.nomeAntigo)) {
          visitados.add(r.nomeAntigo);
          fila.push(r.nomeAntigo);
        }
      });
    }

    (dados.terminais || []).forEach(t => { if (t.ramalRef && mapa[t.ramalRef]) t.ramalRef = mapa[t.ramalRef]; });
    (dados.espacos || []).forEach(e => {
      if (e.ramalRefInsuflacao && mapa[e.ramalRefInsuflacao]) e.ramalRefInsuflacao = mapa[e.ramalRefInsuflacao];
      if (e.ramalRefExtracao && mapa[e.ramalRefExtracao]) e.ramalRefExtracao = mapa[e.ramalRefExtracao];
    });
    (dados.trechos || []).forEach(tr => { if (tr.ramalRef && mapa[tr.ramalRef]) tr.ramalRef = mapa[tr.ramalRef]; });
    (dados.nos || []).forEach(no => { if (no.ramalRef && mapa[no.ramalRef]) no.ramalRef = mapa[no.ramalRef]; });

    dados._mapaRenomeacao = mapa;
    return n;
  },

  migrarV6paraV8(dados) {
    let n = 0;
    (dados.espacos || []).forEach(e => {
      if (e.Q_conforto != null && e.Q_ConTerm == null) { e.Q_ConTerm = e.Q_conforto; n++; }
      if (e.Q_ConTerm == null) e.Q_ConTerm = 0;
      if (e.Q_espaco_regulamentar != null && e.Q_normas == null) { e.Q_normas = e.Q_espaco_regulamentar; }
      if (e.Q_normas == null) e.Q_normas = 0;
      if (e.QAI_projeto == null) e.QAI_projeto = 0;
      if (e.QAI_projeto_origem == null) e.QAI_projeto_origem = 'norma';
      if (e.QAI_projeto_motivo == null) e.QAI_projeto_motivo = '';
      if (e.QAI_projeto_rede == null) e.QAI_projeto_rede = 'auto';
    });
    if (!Array.isArray(dados.transferencias)) dados.transferencias = [];
    (dados.espacos || []).forEach(e => {
      if (!e.balanco) e.balanco = {
        Q_in_direto: 0, Q_out_direto: 0,
        Q_conforto_in: 0, Q_conforto_out: 0,
        QAI_aplicado: 0, QAI_rede: 'insuflacao',
        Q_transf_in: 0, Q_transf_out: 0,
        exfiltracao: 0, residuo: 0,
        pressao_relativa_Pa: 0, estado: 'PENDENTE'
      };
      if (!Array.isArray(e.transferencias)) e.transferencias = [];
    });
    return n;
  },

  /* ────────────────────────────────────────────────
     V9 · NOVO — facetas nos ramais
     ──────────────────────────────────────────────── */
  migrarV8paraV9(dados) {
    let n = 0;
    if (!window.VC || !VC.topologia || !VC.topologia.facetas) {
      // 09-topologia.js ainda não carregou — adiar
      console.warn('[V9 · Migrador] 09-topologia.js não disponível — facetas não aplicadas');
      return 0;
    }
    (dados.ramais || []).forEach(r => {
      if (!r.meta) {
        const meta = VC.topologia.facetas.derivarDoRamal(r);
        if (meta) { r.meta = meta; n++; }
      }
    });
    return n;
  },

  executar(projeto) {
    if (!projeto || !projeto.dados) return projeto;
    const backup = this.backupAntes(projeto);
    const dados = projeto.dados;
    const versaoOrigem = projeto._versao || 'desconhecida';
    let nV5 = 0, nV6 = 0, nV8 = 0, nV9 = 0;

    try {
      if (versaoOrigem === 'V3' || versaoOrigem === 'V4') {
        nV5 = this.migrarV4paraV5(dados);
      }
      if (versaoOrigem !== 'V8' && versaoOrigem !== 'V9') {
        nV6 = this.migrarV5paraV6(dados);
      }
      nV8 = this.migrarV6paraV8(dados);
      nV9 = this.migrarV8paraV9(dados);                     // ← V9

      projeto._versao = this.VERSAO_ALVO;
      projeto._migradoEm = new Date().toISOString();
      projeto._migradoDe = versaoOrigem;
      projeto._backupDisponivel = backup;

      if (VC.debug && VC.debug.info) {
        VC.debug.info('[Migrador V9] ' + versaoOrigem + ' → V9 · ' +
          'V5:' + nV5 + ' · V6:' + nV6 + ' · V8:' + nV8 + ' · V9:' + nV9);
      }
    } catch (e) {
      VC.debug && VC.debug.erro && VC.debug.erro(e);
      if (backup && VC._backup_anterior && VC._backup_anterior.dados) {
        Object.assign(dados, VC._backup_anterior.dados);
      }
    }
    return projeto;
  },

  prepararParaImportar(p) {
    if (!p || !p.dados) throw new Error('Estrutura inválida');
    if (this.precisaMigrar(p)) this.executar(p);
    if (VC.rph && VC.rph.aplicarATodos) VC.rph.aplicarATodos();
    if (VC.qai && VC.qai.aplicarATodos) VC.qai.aplicarATodos();
    if (VC.topologia && VC.topologia.facetas && VC.topologia.facetas.aplicarATodos) {
      VC.topologia.facetas.aplicarATodos();                 // ← V9
    }
    return p;
  },

  nomeAntigo(nomeNovo) {
    const mapa = (VC.dados && VC.dados._mapaRenomeacao) || {};
    for (const antigo in mapa) {
      if (mapa[antigo] === nomeNovo) return antigo;
    }
    return nomeNovo;
  }
};

console.log(
    '%c[VentCondutas V11.0.0] 02-biblioteca carregado · catálogo + curvas (indexadas) + N3 balanço (com QAI) + N5 transferências + migrador V3→V9',
  'color:#6d8fb0;font-weight:bold;background:#eaf1f7;padding:3px 6px;border-radius:3px'
);

})();