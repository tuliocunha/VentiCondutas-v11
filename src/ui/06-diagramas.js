/* ============================================================
   VENTCONDUTAS V10.1.0 · 06-diagramas (Clean + Painel Contextual)
   ============================================================ */
(function () {
'use strict';
const VC = window.VC;
window.VC6 = window.VC6 || {};
const VC6 = window.VC6;
VC._boot.partes.push('06-diagramas');

/* v11.1: removido o bloco 'VC.graficos = VC.graficos || {…}' (Dashboard V11). Nunca era usado:
   VC.graficos já está definido em 01-fundamentos.js, por isso o '||' anulava-o. */

VC6.diagrama = {
  NIVEIS: { atmosfera:0, uta:1, r1:2, r2:3, r3:4, r4:5, espaco:6, retorno:7 },
  ICONES_SOLUCAO: {
    difusor_teto:        { simbolo: '⌂', cor: '#6d8fb0', categoria: 'insuflacao' },
    difusor_parede:      { simbolo: '⌂', cor: '#6d8fb0', categoria: 'insuflacao' },
    grelha_insuflacao:   { simbolo: '▤', cor: '#6d8fb0', categoria: 'insuflacao' },
    grelha_transferencia:{ simbolo: '▓', cor: '#c9a876', categoria: 'transferencia' },
    fresta_porta:        { simbolo: '═', cor: '#c9a876', categoria: 'transferencia' },
    grelha_extracao:     { simbolo: '⊞', cor: '#7fa88b', categoria: 'extracao' },
    boca_extracao:       { simbolo: '⊗', cor: '#7fa88b', categoria: 'extracao' },
    coifa:               { simbolo: '⌂', cor: '#c88a8a', categoria: 'coifa' }
  },
  _zoom: 1, _offsetX: 0, _offsetY: 0, _filtro: 'tudo',
  _utasExpandidas: new Set(), _pisosExpandidos: new Set(), _utaAtiva: null,
  _grafoCache: null, _layoutCache: null, _selecionado: null,
  _arrastando: false, _ultimoX: 0, _ultimoY: 0,
  _autoZoom: true, _resizeTimer: null, _resizeLigado: false,
  construirGrafo() {
    const nos = []; const arestas = []; const utas = VC.dados.utas || [];
    const ramais = VC.dados.ramais || []; const espacos = VC.dados.espacos || [];
    const transferencias = VC.dados.transferencias || []; const byNome = {};
    ramais.forEach(r => { byNome[r.nome] = r; });
    let utasRelevantes = utas.slice();
    if (this._utaAtiva) utasRelevantes = utas.filter(u => 'UTA-' + u.id === this._utaAtiva);
    if (this._filtro === 'insuflacao') utasRelevantes = utasRelevantes.filter(u => u.rede === 'insuflacao');
    if (this._filtro === 'extracao') utasRelevantes = utasRelevantes.filter(u => u.rede === 'extracao' || u.rede === 'extracao_suja');
    if (this._filtro === 'extracao_suja') utasRelevantes = utasRelevantes.filter(u => u.rede === 'extracao_suja');
    if (this._filtro === 'transferencias') utasRelevantes = [];
    utasRelevantes.forEach(u => {
      nos.push({ id: 'UTA-' + u.id, tipo: 'uta', nome: u.nome, nivel: 'uta', nivelNumero: 1, rede: u.rede, _dados: u, Q: (u.Q || 0) * 3600, dp: (u.dpExt || 0) + (u.dpInt || 0), status: u.status || 'OK', utaRef: u.id });
    });
    const utasIds = new Set(utasRelevantes.map(u => u.id));
    let ramaisFiltrados = ramais.filter(r => {
      if (this._filtro === 'insuflacao') return r.rede === 'insuflacao';
      if (this._filtro === 'extracao') return r.rede === 'extracao' || r.rede === 'extracao_suja';
      if (this._filtro === 'extracao_suja') return r.rede === 'extracao_suja';
      if (this._filtro === 'transferencias') return false;
      return true;
    });
    if (this._utaAtiva) {
      ramaisFiltrados = ramaisFiltrados.filter(r => {
        let at = r.nome, guard = 0, utaRef = r.utaRef;
        while (!utaRef && at && byNome[at] && byNome[at].parente && guard++ < 20) { at = byNome[at].parente; utaRef = byNome[at] ? byNome[at].utaRef : null; }
        return utaRef && utasIds.has(utaRef);
      });
    }
    ramaisFiltrados.forEach(r => {
      const nivelNum = r.nivelNumero || VC.utils.nivelTextoParaNumero(r.nivel || (r.tipo === 'Principal' ? 'primario' : 'secundario'));
      nos.push({ id: 'RAMAL-' + r.id, tipo: 'ramal', nome: r.nome, nivel: 'r' + nivelNum, nivelNumero: nivelNum, rede: r.rede || 'insuflacao', _dados: r, Q: r.Q || 0, v: r.v || 0, dp: r.deltaPtotal || 0, Dcom: r.Dcom, L: r.L, zeta: r.zeta, status: r.status || 'PENDENTE', utaRef: r.utaRef || null });
    });
    const gruposPiso = {};
    espacos.forEach(e => {
      const loc = e.localizacao || {}; const chave = (loc.piso || '?') + '-' + (loc.ala || '?');
      if (!gruposPiso[chave]) gruposPiso[chave] = { piso: loc.piso || '?', ala: loc.ala || '?', espacos: [], Q_ins: 0, Q_out: 0, residuo: 0, comConforto: 0, comQAI: 0, QAI_total: 0 };
      gruposPiso[chave].espacos.push(e);
      const b = e.balanco || {};
      gruposPiso[chave].Q_ins += b.Q_in_direto || 0; gruposPiso[chave].Q_out += b.Q_out_direto || 0; gruposPiso[chave].residuo += b.residuo || 0;
      if ((Number(e.Q_ConTerm) || 0) > 0) gruposPiso[chave].comConforto++;
      const qai = Number(e.QAI_projeto) || 0; if (qai > 0) { gruposPiso[chave].comQAI++; gruposPiso[chave].QAI_total += qai; }
    });
    Object.keys(gruposPiso).forEach(chave => {
      const g = gruposPiso[chave]; const expandido = this._pisosExpandidos.has(chave);
      if (expandido) {
        g.espacos.forEach(e => {
          const b = e.balanco || {}; let status = 'OK';
          if (b.estado === 'DESEQUILIBRIO_LEVE') status = 'ATENÇÃO'; else if (b.estado === 'DESEQUILIBRIO_GRAVE') status = 'NÃO CONF.';
          nos.push({ id: 'ESP-' + e.id, tipo: 'espaco', nome: e.nome, nivel: 'espaco', nivelNumero: 7, _dados: e, Q_in: b.Q_in_direto || 0, Q_out: b.Q_out_direto || 0, Q_transf_in: b.Q_transf_in || 0, Q_transf_out: b.Q_transf_out || 0, residuo: b.residuo || 0, dp_rel: b.pressao_relativa_Pa || 0, status, grupoPiso: chave, Q: b.Q_in_direto || b.Q_out_direto || 0, rede: e.tipoCaudal === 'EXTRACAO' ? 'extracao' : 'insuflacao', rphAplicado: Number(e.rphAplicado) || 0, rphOrigem: e.rphOrigem || 'norma', Q_ConTerm: Number(e.Q_ConTerm) || 0, QAI_aplicado: Number(e.QAI_projeto) || 0, QAI_rede: e.QAI_rede || 'insuflacao', QAI_motivo: e.QAI_projeto_motivo || '', QAI_origem: e.QAI_projeto_origem || 'norma', g: e.g || 0 });
        });
      } else {
        nos.push({ id: 'GRP-' + chave, tipo: 'grupo-piso', nome: g.piso + ' · ' + g.ala, nivel: 'espaco', nivelNumero: 7, _dados: g, Q_in: g.Q_ins, Q_out: g.Q_out, residuo: g.residuo, nEspacos: g.espacos.length, grupoPiso: chave, Q: g.Q_ins + g.Q_out, rede: g.Q_ins > g.Q_out ? 'insuflacao' : 'extracao', status: Math.abs(g.residuo) <= 5 ? 'OK' : (Math.abs(g.residuo) <= 10 ? 'ATENÇÃO' : 'NÃO CONF.'), nComConforto: g.comConforto, temConforto: g.comConforto > 0, nComQAI: g.comQAI, QAI_total: g.QAI_total, temQAI: g.comQAI > 0 });
      }
    });
    if (this._filtro !== 'transferencias') {
      const ramaisVisiveis = new Set(nos.filter(n => n.tipo === 'ramal').map(n => n._dados.nome));
      utasRelevantes.forEach(u => { ramaisFiltrados.forEach(r => { if (r.utaRef === u.id && (!r.parente || !ramaisVisiveis.has(r.parente))) { arestas.push({ de: 'UTA-' + u.id, para: 'RAMAL-' + r.id, tipo: 'tronco', Q: r.Q || 0, dp: r.deltaPtotal || 0 }); } }); });
      ramaisFiltrados.forEach(r => { if (r.parente && byNome[r.parente] && ramaisVisiveis.has(r.parente)) { arestas.push({ de: 'RAMAL-' + byNome[r.parente].id, para: 'RAMAL-' + r.id, tipo: 'derivacao', Q: r.Q || 0, dp: r.deltaPtotal || 0 }); } });
      const terminaisByRamal = {};
      VC.dados.terminais.forEach(t => { if (!t.ramalRef) return; if (!terminaisByRamal[t.ramalRef]) terminaisByRamal[t.ramalRef] = []; terminaisByRamal[t.ramalRef].push(t); });
      ramaisFiltrados.forEach(r => {
        const terminais = terminaisByRamal[r.nome] || []; const grupos = {};
        terminais.forEach(t => {
          (t.espacos || []).forEach(esp => {
            const e = espacos.find(x => x.nome === esp.nome); if (!e) return;
            const loc = e.localizacao || {}; const chave = (loc.piso || '?') + '-' + (loc.ala || '?');
            const destId = this._pisosExpandidos.has(chave) ? 'ESP-' + e.id : 'GRP-' + chave;
            if (!grupos[destId]) grupos[destId] = 0; grupos[destId] += Number(esp.Q_parcela) || 0;
          });
        });
        Object.keys(grupos).forEach(destId => { if (!nos.find(n => n.id === destId)) return; arestas.push({ de: 'RAMAL-' + r.id, para: destId, tipo: 'entrega', Q: grupos[destId], dp: 0 }); });
      });
    }
    if (this._filtro === 'tudo' || this._filtro === 'transferencias') {
      transferencias.forEach(t => {
        const deEsp = espacos.find(e => e.id === t.deId); const paraEsp = espacos.find(e => e.id === t.paraId); if (!deEsp || !paraEsp) return;
        const trfNo = { id: 'TRF-' + t.id, tipo: 'transferencia', nome: deEsp.nome + ' → ' + paraEsp.nome, nivel: 'espaco', nivelNumero: 7, _dados: t, Q: t.Q || 0, dp: t.dP_Pa || 2, area_cm2: t.area_cm2 || 0, status: 'OK', deNome: deEsp.nome, paraNome: paraEsp.nome, rede: 'transferencia' };
        if (!nos.find(n => n.id === trfNo.id)) nos.push(trfNo);
        const deLoc = deEsp.localizacao || {}; const chaveDe = (deLoc.piso || '?') + '-' + (deLoc.ala || '?');
        const deId = this._pisosExpandidos.has(chaveDe) ? 'ESP-' + deEsp.id : 'GRP-' + chaveDe;
        if (nos.find(n => n.id === deId)) arestas.push({ de: deId, para: trfNo.id, tipo: 'transferencia', Q: t.Q || 0, dp: t.dP_Pa || 2 });
      });
    }
    const redesPorEspaco = {};
    arestas.forEach(a => {
      if (a.tipo !== 'entrega' && a.tipo !== 'tronco' && a.tipo !== 'derivacao') return;
      if (!a.para) return; const nA = nos.find(n => n.id === a.de); if (!nA) return;
      const rede = nA.rede || 'insuflacao';
      if (!redesPorEspaco[a.para]) redesPorEspaco[a.para] = new Set(); redesPorEspaco[a.para].add(rede);
    });
    nos.forEach(n => {
      if (n.tipo === 'espaco' || n.tipo === 'grupo-piso') {
        const redes = redesPorEspaco[n.id]; if (redes && redes.size > 1) { n.multiRede = true; n.redesRecebidas = Array.from(redes); }
      }
    });
    if (this._filtro === 'desequilibrios') {
      const filtrados = nos.filter(n => { if (n.tipo === 'espaco' || n.tipo === 'grupo-piso') return Math.abs(n.residuo || 0) > 5; return true; });
      const ids = new Set(filtrados.map(n => n.id));
      this._grafoCache = { nos: filtrados, arestas: arestas.filter(a => ids.has(a.de) && ids.has(a.para)) }; return this._grafoCache;
    }
    this._grafoCache = { nos, arestas }; return this._grafoCache;
  },
  calcularLayout(grafo) {
    grafo = grafo || this.construirGrafo(); const layout = {}; if (!grafo.nos.length) return layout;
    const LARGURA_NO = 18, ESPACO_IRMAOS = 3, MARGEM_TOPO = 100; const utas = grafo.nos.filter(n => n.tipo === 'uta'); if (!utas.length) return layout;
    const niveisPresentes = [];
    if (grafo.nos.some(n => n.tipo === 'uta')) niveisPresentes.push('uta');
    if (grafo.nos.some(n => n.tipo === 'ramal' && n.nivelNumero === 1)) niveisPresentes.push('r1');
    if (grafo.nos.some(n => n.tipo === 'ramal' && n.nivelNumero === 2)) niveisPresentes.push('r2');
    if (grafo.nos.some(n => n.tipo === 'ramal' && n.nivelNumero === 3)) niveisPresentes.push('r3');
    if (grafo.nos.some(n => n.tipo === 'ramal' && n.nivelNumero === 4)) niveisPresentes.push('r4');
    if (grafo.nos.some(n => n.tipo === 'espaco' || n.tipo === 'grupo-piso' || n.tipo === 'transferencia')) niveisPresentes.push('espaco');
    const janelaW = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : 1400;
    const X_INICIO = 80; const X_FIM = 120; const X_UTIL = Math.max(800, janelaW - X_INICIO - X_FIM);
    const nColunas = niveisPresentes.length; const espacamento = nColunas > 1 ? X_UTIL / (nColunas - 1) : X_UTIL;
    const OFFSET_REDE = { 'insuflacao': -18, 'extracao': 0, 'extracao_suja': 18, 'transferencia': 0 };
    const COL_X = {}; niveisPresentes.forEach((nivel, idx) => { COL_X[nivel] = X_INICIO + idx * espacamento; });
    ['uta', 'r1', 'r2', 'r3', 'r4', 'espaco'].forEach(nivel => { if (COL_X[nivel] == null) COL_X[nivel] = 0; });
    const janelaH = (typeof window !== 'undefined' && window.innerHeight) ? window.innerHeight : 900;
    const margemVertical = 60; const H_UTIL_LIVRE = Math.max(300, janelaH - 320 - margemVertical);
    const nUtas = utas.length; const H_POR_UTA = H_UTIL_LIVRE / nUtas;
    const ALTURA_UTA_MAX = Math.min(320, Math.max(60, H_POR_UTA * 0.70));
    const espacoEntreUtas = Math.max(10, Math.min(40, H_POR_UTA * 0.30));
    let yBase = MARGEM_TOPO;
    utas.forEach(uta => {
      const nosDesta = this._nosDaUta(uta, grafo); const Quta = uta.Q || 1;
      const alturaUta = Math.max(50, (Quta / Math.max(this._QmaxGrafo(grafo), 1)) * ALTURA_UTA_MAX);
      const redeUta = uta.rede || 'insuflacao'; const offsetUta = OFFSET_REDE[redeUta] || 0;
      layout[uta.id] = { x: COL_X.uta + offsetUta, y: yBase, largura: LARGURA_NO, altura: alturaUta, Q: Quta, coluna: 'uta', rede: redeUta };
      const porNivel = { r1: [], r2: [], r3: [], r4: [], espaco: [] };
      nosDesta.forEach(n => {
        if (n.tipo === 'ramal') { const nivelKey = 'r' + (n.nivelNumero || 2); if (porNivel[nivelKey]) porNivel[nivelKey].push(n); }
        else if (n.tipo === 'espaco' || n.tipo === 'grupo-piso' || n.tipo === 'transferencia') { porNivel.espaco.push(n); }
      });
      const expandida = this._utasExpandidas.has(uta.id);
      const niveisParaMostrar = ['r1', 'r2']; if (expandida) niveisParaMostrar.push('r3', 'r4'); niveisParaMostrar.push('espaco');
      let alturaNivelAnterior = alturaUta; let yNivelAnterior = yBase;
      niveisParaMostrar.forEach(nivel => {
        const lista = porNivel[nivel] || []; if (!lista.length) return;
        const Qsoma = lista.reduce((s, n) => s + (n.Q || 0), 0) || 1;
        const alturaDisponivel = Math.max(40, (Qsoma / Quta) * alturaUta);
        const somaEspacos = ESPACO_IRMAOS * (lista.length - 1);
        const alturaUtil = Math.max(20, alturaDisponivel - somaEspacos);
        const fatorAltura = alturaUtil / Qsoma; let somaAlturas = 0;
        lista.forEach(n => { somaAlturas += Math.max(6, (n.Q || 1) * fatorAltura); });
        somaAlturas += somaEspacos;
        const centroAnterior = yNivelAnterior + alturaNivelAnterior / 2; let yCursor = centroAnterior - somaAlturas / 2;
        lista.forEach(n => {
          const alturaNo = Math.max(6, (n.Q || 1) * fatorAltura); const redeNo = n.rede || 'insuflacao'; const offsetNo = OFFSET_REDE[redeNo] || 0;
          layout[n.id] = { x: COL_X[nivel] + offsetNo, y: yCursor, largura: LARGURA_NO, altura: alturaNo, Q: n.Q || 0, coluna: nivel, rede: redeNo };
          yCursor += alturaNo + ESPACO_IRMAOS;
        });
        if (lista.length) { const primeiro = layout[lista[0].id]; const ultimo = layout[lista[lista.length - 1].id]; yNivelAnterior = primeiro.y; alturaNivelAnterior = (ultimo.y + ultimo.altura) - primeiro.y; }
      });
      const alturaTotal = this._alturaDaUta(layout, uta.id, nosDesta); yBase += Math.max(alturaTotal, alturaUta) + espacoEntreUtas;
    });
    const nosTRF = grafo.nos.filter(n => n.tipo === 'transferencia' && !layout[n.id]);
    if (nosTRF.length > 0) {
      const colunaEspaco = Object.keys(layout).find(k => layout[k].coluna === 'espaco');
      const xBase = colunaEspaco ? layout[colunaEspaco].x + 130 : COL_X.espaco + 130;
      let yTRF = 60; const alturaTRF = 14; const gapTRF = 6;
      nosTRF.forEach(n => { layout[n.id] = { x: xBase, y: yTRF, largura: 16, altura: alturaTRF, Q: n.Q || 0, coluna: 'espaco', rede: 'transferencia' }; yTRF += alturaTRF + gapTRF; });
    }
    this._layoutCache = layout; return layout;
  },
  _alturaDaUta(layout, utaId, nos) {
    let minY = Infinity, maxY = -Infinity; const ids = [utaId].concat(nos.map(n => n.id));
    ids.forEach(id => { const p = layout[id]; if (!p) return; minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y + p.altura); });
    if (!isFinite(minY)) return 80; return maxY - minY;
  },
  _QmaxGrafo(grafo) { return Math.max.apply(null, [1].concat(grafo.nos.filter(n => n.tipo === 'uta').map(n => n.Q || 0))); },
  _nosDaUta(uta, grafo) {
    const nos = grafo.nos; const ramais = nos.filter(n => n.tipo === 'ramal'); const byName = {};
    ramais.forEach(r => { byName[r._dados.nome] = r; }); const utaIdNum = uta._dados ? uta._dados.id : null;
    const ligadosDireto = ramais.filter(r => { if (r.utaRef === utaIdNum) return true; if (r.utaRef === uta.id) return true; if (r._dados && r._dados.utaRef === utaIdNum) return true; return false; });
    const todos = new Set(ligadosDireto); let mudou = true;
    while (mudou) {
      mudou = false;
      ramais.forEach(r => { if (todos.has(r)) return; const pai = r._dados.parente ? byName[r._dados.parente] : null; if (pai && todos.has(pai)) { todos.add(r); mudou = true; } });
    }
    const espacos = nos.filter(n => n.tipo === 'espaco' || n.tipo === 'grupo-piso' || n.tipo === 'transferencia');
    const espacosLigados = new Set();
    grafo.arestas.forEach(a => {
      if (a.tipo !== 'entrega' && a.tipo !== 'transferencia') return;
      const origem = Array.from(todos).find(r => 'RAMAL-' + r._dados.id === a.de); if (!origem) return;
      const dest = espacos.find(e => e.id === a.para); if (dest) espacosLigados.add(dest);
    });
    return Array.from(todos).concat(Array.from(espacosLigados));
  },
  _calcularZoomAuto(W, H) { if (!this._autoZoom) return 1; const janelaW = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : 1400; const ecraW = janelaW - 80; const fatorW = ecraW / W; return Math.max(0.6, Math.min(1, fatorW)); },
  toggleAutoZoom() { this._autoZoom = !this._autoZoom; this._zoom = 1; this.render(); if (VC.ui && VC.ui.toast) VC.ui.toast('Auto-zoom ' + (this._autoZoom ? 'ON' : 'OFF')); },
  _calcularFatias(grafo, layout) {
    const fatiasSaida = {}; const fatiasEntrada = {}; const saidasPorNo = {}; const entradasPorNo = {};
    grafo.arestas.forEach(a => { if (!layout[a.de] || !layout[a.para]) return; if (!saidasPorNo[a.de]) saidasPorNo[a.de] = []; saidasPorNo[a.de].push(a); if (!entradasPorNo[a.para]) entradasPorNo[a.para] = []; entradasPorNo[a.para].push(a); });
    Object.keys(saidasPorNo).forEach(idNo => {
      const p = layout[idNo]; if (!p) return; const arestas = saidasPorNo[idNo].slice();
      arestas.sort((a, b) => { const pA = layout[a.para]; const pB = layout[b.para]; if (!pA || !pB) return 0; return (pA.y + pA.altura / 2) - (pB.y + pB.altura / 2); });
      const Qtotal = arestas.reduce((s, a) => s + (a.Q || 0), 0); const n = arestas.length; const gap = n > 1 ? 1.5 : 0;
      const alturaUtil = Math.max(4, p.altura - gap * (n - 1)); const fator = Qtotal > 0 ? alturaUtil / Qtotal : alturaUtil / n;
      let yCursor = p.y; const fatias = [];
      arestas.forEach(a => { const h = Qtotal > 0 ? Math.max(2, (a.Q || 0) * fator) : alturaUtil / n; fatias.push({ arestaId: a.de + '→' + a.para, paraId: a.para, Q: a.Q || 0, y: yCursor, altura: h }); yCursor += h + gap; });
      fatiasSaida[idNo] = fatias;
    });
    Object.keys(entradasPorNo).forEach(idNo => {
      const p = layout[idNo]; if (!p) return; const arestas = entradasPorNo[idNo].slice();
      arestas.sort((a, b) => { const pA = layout[a.de]; const pB = layout[b.de]; if (!pA || !pB) return 0; return (pA.y + pA.altura / 2) - (pB.y + pB.altura / 2); });
      const Qtotal = arestas.reduce((s, a) => s + (a.Q || 0), 0); const n = arestas.length; const gap = n > 1 ? 1.5 : 0;
      const alturaUtil = Math.max(4, p.altura - gap * (n - 1)); const fator = Qtotal > 0 ? alturaUtil / Qtotal : alturaUtil / n;
      let yCursor = p.y; const fatias = [];
      arestas.forEach(a => { const h = Qtotal > 0 ? Math.max(2, (a.Q || 0) * fator) : alturaUtil / n; fatias.push({ arestaId: a.de + '→' + a.para, deId: a.de, Q: a.Q || 0, y: yCursor, altura: h }); yCursor += h + gap; });
      fatiasEntrada[idNo] = fatias;
    });
    return { fatiasSaida, fatiasEntrada };
  },
  renderSVG(escalaExportacao) {
    const grafo = this.construirGrafo(); const layout = this.calcularLayout(grafo); const nos = grafo.nos; const arestas = grafo.arestas;
    if (!Object.keys(layout).length) return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="800" height="400"><rect width="800" height="400" fill="#fff"/><text x="400" y="200" text-anchor="middle" fill="#94a3b8" font-size="14">Sem dados para mostrar.</text></svg>';
    const { fatiasSaida, fatiasEntrada } = this._calcularFatias(grafo, layout);
    let xMax = 300, yMax = 200, xMin = Infinity, yMin = Infinity;
    Object.keys(layout).forEach(id => { const p = layout[id]; xMin = Math.min(xMin, p.x); xMax = Math.max(xMax, p.x + 280); yMin = Math.min(yMin, p.y - 40); yMax = Math.max(yMax, p.y + p.altura + 80); });
    if (!isFinite(xMin)) xMin = 0; if (!isFinite(yMin)) yMin = 0; yMin = Math.max(0, yMin - 20);
    const W = Math.max(xMax + 40, (typeof window !== 'undefined' ? window.innerWidth : 1400)); const H = yMax - yMin + 20;
    const zoomEfetivo = escalaExportacao ? 1 : (this._autoZoom ? this._calcularZoomAuto(W, H) : this._zoom);
    let svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ' + yMin + ' ' + W + ' ' + H + '" width="' + (W * zoomEfetivo) + '" height="' + (H * zoomEfetivo) + '" style="display:block;background:#ffffff" preserveAspectRatio="xMinYMin meet">';
    svg += '<rect x="0" y="' + yMin + '" width="' + W + '" height="' + H + '" fill="#ffffff"/>';
    const utasMostrar = nos.filter(n => n.tipo === 'uta');
    utasMostrar.forEach(u => { const p = layout[u.id]; if (!p) return; const cor = this._corUta(u); if (!cor || !cor.sobreTom) return; svg += '<rect x="0" y="' + (p.y - 30) + '" width="' + W + '" height="' + (p.altura + 60) + '" fill="' + cor.sobreTom + '" fill-opacity="0.06"/>'; });
    svg += '<defs>';
    svg += '<marker id="seta-ins" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L6,4 L0,8 Z" fill="#4a7aa8"/></marker>';
    svg += '<marker id="seta-ext" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L6,4 L0,8 Z" fill="#5a8a6a"/></marker>';
    svg += '</defs>';
    const COLUNAS = ['uta', 'r1', 'r2', 'r3', 'r4', 'espaco'];
    const LABELS = { uta: 'UTA', r1: 'R1', r2: 'R2', r3: 'R3', r4: 'R4', espaco: 'Espaços' };
    COLUNAS.forEach(col => { const chave = Object.keys(layout).find(k => layout[k].coluna === col); if (!chave) return; const x = layout[chave].x; svg += '<text x="' + (x + 9) + '" y="' + (yMin + 20) + '" text-anchor="middle" style="font-size:10px;font-weight:900;fill:#94a3b8;letter-spacing:1px">' + LABELS[col] + '</text>'; svg += '<line x1="' + (x + 9) + '" y1="' + (yMin + 26) + '" x2="' + (x + 9) + '" y2="' + (yMax - 20) + '" stroke="#e3e8ee" stroke-width="0.5" stroke-dasharray="3 3"/>'; });
    const arestasVisiveis = arestas.filter(a => layout[a.de] && layout[a.para]);
    arestasVisiveis.forEach(a => { const nA = nos.find(n => n.id === a.de); const nB = nos.find(n => n.id === a.para); if (!nA || !nB) return; svg += this._renderFaixa(a, nA, nB, layout, grafo, fatiasSaida, fatiasEntrada); });
    nos.forEach(n => { const p = layout[n.id]; if (!p) return; svg += this._renderBarraSankey(n, p, grafo); });
    svg += this._renderLegenda(W, H, yMin, yMax); svg += this._renderKpis(grafo, W, yMin); svg += '</svg>'; return svg;
  },
  _renderFaixa(a, nA, nB, layout, grafo, fatiasSaida, fatiasEntrada) {
    const pA = layout[a.de]; const pB = layout[a.para]; if (!pA || !pB) return ''; const Q = a.Q || 0;
    let fatiaA = null; if (fatiasSaida && fatiasSaida[a.de]) { const chave = a.de + '→' + a.para; fatiaA = fatiasSaida[a.de].find(f => f.arestaId === chave && f.paraId === a.para); }
    const y1 = fatiaA ? (fatiaA.y + fatiaA.altura / 2) : (pA.y + pA.altura / 2);
    const espessuraA = fatiaA ? Math.max(1.5, fatiaA.altura) : Math.max(1.5, Q * (pA.altura / Math.max(pA.Q, 1)) * 0.9);
    let fatiaB = null; if (fatiasEntrada && fatiasEntrada[a.para]) { const chave = a.de + '→' + a.para; fatiaB = fatiasEntrada[a.para].find(f => f.arestaId === chave && f.deId === a.de); }
    const y2 = fatiaB ? (fatiaB.y + fatiaB.altura / 2) : (pB.y + pB.altura / 2);
    const espessuraB = fatiaB ? Math.max(1.5, fatiaB.altura) : Math.max(1.5, Q * (pB.altura / Math.max(pB.Q, 1)) * 0.9);
    const x1 = pA.x + pA.largura; const x2 = pB.x; const cx1 = x1 + (x2 - x1) * 0.5; const cx2 = x2 - (x2 - x1) * 0.5;
    const topPath = 'M' + x1 + ',' + (y1 - espessuraA / 2) + ' C' + cx1 + ',' + (y1 - espessuraA / 2) + ' ' + cx2 + ',' + (y2 - espessuraB / 2) + ' ' + x2 + ',' + (y2 - espessuraB / 2);
    const botPath = ' L' + x2 + ',' + (y2 + espessuraB / 2) + ' C' + cx2 + ',' + (y2 + espessuraB / 2) + ' ' + cx1 + ',' + (y1 + espessuraA / 2) + ' ' + x1 + ',' + (y1 + espessuraA / 2) + ' Z';
    const cor = this._corUta(nA) || { fill: '#94a3b8', stroke: '#64748b', texto: '#ffffff' };
    let svg = '<path d="' + topPath + botPath + '" fill="' + cor.fill + '" fill-opacity="0.55" stroke="' + cor.stroke + '" stroke-width="0.5" stroke-opacity="0.4"/>';
    if (espessuraA >= 10) { const mx = (x1 + x2) / 2; const my = (y1 + y2) / 2; const rotulo = 'Q=' + VC.utils.fmt(Q, 0) + (a.dp ? ' · dp=' + VC.utils.fmt(a.dp, 0) : ''); const lw = rotulo.length * 5.4 + 8; svg += '<rect x="' + (mx - lw / 2) + '" y="' + (my - 8) + '" width="' + lw + '" height="13" rx="3" fill="#ffffff" fill-opacity="0.92" stroke="' + cor.stroke + '" stroke-width="0.5"/>'; svg += '<text x="' + mx + '" y="' + (my + 2) + '" text-anchor="middle" style="font-size:9.5px;font-weight:700;fill:' + cor.texto + ';font-family:ui-monospace,monospace">' + rotulo + '</text>'; }
    return svg;
  },
  _renderBarraSankey(n, p, grafo) {
    const cor = this._corUta(n) || { fill: '#94a3b8', stroke: '#64748b', texto: '#ffffff' }; const selecionado = this._selecionado === n.id;
    let corBorda = cor.stroke; let espBorda = 1; let corFundo = cor.fill;
    if (n.tipo === 'espaco' || n.tipo === 'grupo-piso') { if (n.status === 'NÃO CONF.') { corBorda = '#c88a8a'; espBorda = 2.5; corFundo = '#faeeee'; } else if (n.status === 'ATENÇÃO') { corBorda = '#c9a876'; espBorda = 2; corFundo = '#faf5eb'; } }
    if (selecionado) { corBorda = '#2c3e50'; espBorda = 3; } const x = p.x, y = p.y, w = p.largura, h = p.altura;
    let svg = '<g class="v6-diag-caixa ' + n.tipo + (selecionado ? ' selecionado' : '') + '" data-id="' + n.id + '" data-tipo="' + n.tipo + '" style="cursor:pointer">';
    svg += '<title>' + VC.utils.esc(this._tooltipTexto(n)) + '</title>'; svg += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="3" fill="' + corFundo + '" stroke="' + corBorda + '" stroke-width="' + espBorda + '"/>';
    const rotulo = n.tipo === 'uta' ? n.nome : (n.nome.length > 20 ? n.nome.substring(0, 18) + '…' : n.nome);
    if (n.tipo === 'uta' || n.tipo === 'ramal') { svg += '<text x="' + (x + w / 2) + '" y="' + (y - 4) + '" text-anchor="middle" style="font-size:10px;font-weight:800;fill:' + cor.texto + '">' + VC.utils.esc(rotulo) + '</text>'; svg += '<text x="' + (x + w / 2) + '" y="' + (y + h + 12) + '" text-anchor="middle" style="font-size:9.5px;font-family:ui-monospace,monospace;fill:#5a6b7c">Q ' + VC.utils.fmt(n.Q, 0) + '</text>'; if (n.tipo === 'ramal' && n.Dcom) svg += '<text x="' + (x + w / 2) + '" y="' + (y + h + 22) + '" text-anchor="middle" style="font-size:9px;font-family:ui-monospace,monospace;fill:#94a3b8">Ø' + n.Dcom + '</text>'; }
    else if (n.tipo === 'espaco' || n.tipo === 'grupo-piso') {
      const temConf = (n.Q_ConTerm && n.Q_ConTerm > 0) || (n.temConforto && n.nComConforto > 0); const temQAI = (n.QAI_aplicado && n.QAI_aplicado > 0) || (n.temQAI && n.nComQAI > 0);
      const temMultiRede = !!n.multiRede; let badge = ''; let badgeY = y + h / 2 - 22;
      if (temConf) { const origem = n.rphOrigem || 'norma'; const icone = origem === 'utilizador' ? '👤' : '📘'; const corBadge = origem === 'utilizador' ? '#6d8fb0' : '#7fa88b'; const bgBadge = origem === 'utilizador' ? '#eaf1f7' : '#eef5f0'; badge += '<g transform="translate(' + (x + w + 4) + ',' + badgeY + ')"><rect x="0" y="0" width="18" height="14" rx="3" fill="' + bgBadge + '" stroke="' + corBadge + '" stroke-width="0.8"/><text x="9" y="10" text-anchor="middle" style="font-size:9px">' + icone + '</text></g>'; badgeY += 16; }
      if (temQAI) { const origemQAI = n.QAI_origem || 'norma'; const iconeQAI = origemQAI === 'utilizador' ? '👷' : '📘'; const corBadgeQ = origemQAI === 'utilizador' ? '#b88a4a' : '#7fa88b'; const bgBadgeQ = origemQAI === 'utilizador' ? '#faf3e8' : '#eef5f0'; badge += '<g transform="translate(' + (x + w + 4) + ',' + badgeY + ')"><rect x="0" y="0" width="18" height="14" rx="3" fill="' + bgBadgeQ + '" stroke="' + corBadgeQ + '" stroke-width="0.8"/><text x="9" y="10" text-anchor="middle" style="font-size:9px">' + iconeQAI + '</text></g>'; badgeY += 16; }
      if (temMultiRede) { badge += '<g transform="translate(' + (x + w + 4) + ',' + badgeY + ')"><rect x="0" y="0" width="18" height="14" rx="3" fill="#faf5eb" stroke="#c9a876" stroke-width="0.8"/><text x="9" y="10" text-anchor="middle" style="font-size:9px">⚠️</text></g>'; badgeY += 16; }
      svg += badge; let linhaMet = 'Q ' + VC.utils.fmt(n.Q, 0) + ' · dQ ' + VC.utils.fmt(n.residuo || 0, 1);
      if (temConf) linhaMet += ' · RPH ' + (n.rphAplicado || n.nComConforto); if (temMultiRede) linhaMet += ' · ' + (n.redesRecebidas || []).length + ' redes';
      svg += '<text x="' + (x + w + 4) + '" y="' + (y + h / 2 + 3) + '" style="font-size:10px;font-weight:700;fill:#2c3e50">' + VC.utils.esc(rotulo) + '</text>'; svg += '<text x="' + (x + w + 4) + '" y="' + (y + h / 2 + 15) + '" style="font-size:9px;font-family:ui-monospace,monospace;fill:#5a6b7c">' + linhaMet + '</text>';
      if (temQAI) { const qaiTxt = 'QAI ' + VC.utils.fmt(n.QAI_aplicado || n.QAI_total || 0, 0) + ' m³/h · ' + (n.QAI_rede || 'insuflacao'); svg += '<text x="' + (x + w + 4) + '" y="' + (y + h / 2 + 26) + '" style="font-size:9px;font-family:ui-monospace,monospace;fill:#b88a4a;font-weight:700">' + qaiTxt + '</text>'; }
      if (temMultiRede) { const redesTxt = (n.redesRecebidas || []).join(' + '); svg += '<text x="' + (x + w + 4) + '" y="' + (y + h / 2 + (temQAI ? 37 : 26)) + '" style="font-size:9px;font-family:ui-monospace,monospace;fill:#9e8256;font-weight:700">⚠ ' + VC.utils.esc(redesTxt) + '</text>'; }
    } else if (n.tipo === 'transferencia') { svg += '<text x="' + (x + w + 4) + '" y="' + (y + h / 2 + 3) + '" style="font-size:10px;font-weight:700;fill:#7a5c2e">' + VC.utils.esc(rotulo) + '</text>'; svg += '<text x="' + (x + w + 4) + '" y="' + (y + h / 2 + 15) + '" style="font-size:9px;font-family:ui-monospace,monospace;fill:#7a5c2e">' + VC.utils.fmt(n.Q, 0) + ' m³/h · A ' + VC.utils.fmt(n.area_cm2 || 0, 0) + ' cm²</text>'; }
    svg += '</g>'; return svg;
  },
  _corUta(n) {
    if (!n) return { fill: '#94a3b8', stroke: '#64748b', sobreTom: '#64748b', texto: '#ffffff' };
    const rede = n.rede || (n._dados && n._dados.rede) || 'insuflacao'; let idxUta = 0;
    const extrairIdx = (id) => { const m = String(id || '').match(/(\d+)/); return m ? parseInt(m[1], 10) : 0; };
    if (n.tipo === 'uta') idxUta = n._dados ? extrairIdx(n._dados.id) : 0;
    else { const utaRef = n.utaRef; if (utaRef) { const u = VC.dados.utas.find(x => x.id === utaRef); idxUta = u ? extrairIdx(u.id) : 0; } }
    if (rede === 'transferencia' || n.tipo === 'transferencia') return { fill: '#e5c89a', stroke: '#c9975a', sobreTom: '#c9975a', texto: '#7a5c2e' };
    if (rede === 'extracao_suja') return { fill: '#bcb0d4', stroke: '#7a6aa8', sobreTom: '#7a6aa8', texto: '#554a80' };
    if (rede === 'insuflacao') { const tons = [ { fill: '#a8c5dd', stroke: '#4a7aa8', sobreTom: '#4a7aa8', texto: '#2c5278' }, { fill: '#7fa3c4', stroke: '#3a5e88', sobreTom: '#3a5e88', texto: '#1f3d5c' }, { fill: '#5d84a8', stroke: '#2c4a6e', sobreTom: '#2c4a6e', texto: '#ffffff' } ]; return tons[idxUta % tons.length] || tons[0]; }
    const tons = [ { fill: '#a8cdb5', stroke: '#5a8a6a', sobreTom: '#5a8a6a', texto: '#3d6647' }, { fill: '#82b090', stroke: '#3d6647', sobreTom: '#3d6647', texto: '#ffffff' }, { fill: '#5d8469', stroke: '#2c4a34', sobreTom: '#2c4a34', texto: '#ffffff' } ]; return tons[idxUta % tons.length] || tons[0];
  },
  _renderLegenda(W, H, yMin, yMax) {
    const x = 20; const y = yMax - 165;
    let svg = '<rect x="' + x + '" y="' + y + '" width="200" height="145" rx="5" fill="#ffffff" fill-opacity="0.95" stroke="#cdd5df" stroke-width="1"/>';
    svg += '<text x="' + (x + 10) + '" y="' + (y + 16) + '" style="font-size:9.5px;font-weight:900;fill:#94a3b8;letter-spacing:.5px">LEGENDA</text>';
    const itens = [ { cor: '#a8c5dd', txt: 'Insuflação' }, { cor: '#a8cdb5', txt: 'Extração' }, { cor: '#bcb0d4', txt: 'Extração suja' }, { cor: '#e5c89a', txt: 'Transferência' } ];
    itens.forEach((it, i) => { const yy = y + 32 + i * 16; svg += '<rect x="' + (x + 10) + '" y="' + (yy - 8) + '" width="18" height="10" rx="2" fill="' + it.cor + '"/>'; svg += '<text x="' + (x + 34) + '" y="' + yy + '" style="font-size:10px;fill:#5a6b7c">' + it.txt + '</text>'; });
    svg += '<line x1="' + (x + 10) + '" y1="' + (y + 96) + '" x2="' + (x + 190) + '" y2="' + (y + 96) + '" stroke="#e3e8ee" stroke-width="0.5"/>';
    svg += '<text x="' + (x + 10) + '" y="' + (y + 108) + '" style="font-size:9.5px;fill:#5a6b7c">📘 RPH norma · 👤 RPH utilizador</text>';
    svg += '<text x="' + (x + 10) + '" y="' + (y + 120) + '" style="font-size:9.5px;fill:#5a6b7c">📘 QAI norma · 👷 QAI engenheiro</text>';
    svg += '<text x="' + (x + 10) + '" y="' + (y + 134) + '" style="font-size:9px;fill:#94a3b8;font-style:italic">⚠️ Espaço com 2+ redes · Espessura ∝ caudal Q</text>';
    return svg;
  },
  _renderKpis(grafo, W, yMin) {
    const x = W - 215; const y = yMin + 40;
    const ins = VC.dados.terminais.reduce((s, t) => s + (t.rede !== 'extracao' && t.rede !== 'extracao_suja' ? (Number(t.Q) || 0) : 0), 0);
    const ext = VC.dados.terminais.reduce((s, t) => s + (t.rede === 'extracao' || t.rede === 'extracao_suja' ? (Number(t.Q) || 0) : 0), 0);
    const bal = ins - ext; const xc = VC.calculo.ultimo || {}; const dpMax = xc.maxPerda || 0; const sfp = xc.sfpInt || 0; const sfpClasse = xc.sfpClass ? xc.sfpClass.classe : '—';
    const nComConforto = (VC.dados.espacos || []).filter(e => (Number(e.Q_ConTerm) || 0) > 0).length; const nComQAI = (VC.dados.espacos || []).filter(e => (Number(e.QAI_projeto) || 0) > 0).length; const qaiTotal = (VC.dados.espacos || []).reduce((s, e) => s + (Number(e.QAI_projeto) || 0), 0);
    let svg = ''; const nLinhas = 5 + (nComConforto > 0 ? 1 : 0) + (nComQAI > 0 ? 2 : 0) + 1; const alturaKpi = 22 + nLinhas * 13 + 10;
    svg += '<rect x="' + x + '" y="' + y + '" width="200" height="' + alturaKpi + '" rx="5" fill="#ffffff" fill-opacity="0.95" stroke="#cdd5df" stroke-width="1"/>';
    svg += '<text x="' + (x + 10) + '" y="' + (y + 16) + '" style="font-size:9.5px;font-weight:900;fill:#94a3b8;letter-spacing:.5px">KPIs GLOBAIS</text>';
    const linhas = [ { l: 'Q insuflação', v: VC.utils.fmt(ins, 0) + ' m³/h' }, { l: 'Q extração', v: VC.utils.fmt(ext, 0) + ' m³/h' }, { l: 'Balanço', v: (bal >= 0 ? '+' : '') + VC.utils.fmt(bal, 0) + ' m³/h' }, { l: 'dp crítico', v: VC.utils.fmt(dpMax, 0) + ' Pa' }, { l: 'SFPint', v: VC.utils.fmt(sfp, 0) + ' · Cl. ' + sfpClasse } ];
    if (nComConforto > 0) linhas.push({ l: 'Espaços c/ RPH', v: nComConforto });
    if (nComQAI > 0) { linhas.push({ l: 'Espaços c/ QAI', v: nComQAI }); linhas.push({ l: 'QAI total', v: VC.utils.fmt(qaiTotal, 0) + ' m³/h' }); }
    linhas.push({ l: 'Auto-zoom', v: this._autoZoom ? 'ON' : 'OFF' });
    linhas.forEach((l, i) => { const yy = y + 32 + i * 13; svg += '<text x="' + (x + 10) + '" y="' + yy + '" style="font-size:10px;fill:#5a6b7c">' + l.l + '</text>'; svg += '<text x="' + (x + 190) + '" y="' + yy + '" text-anchor="end" style="font-size:10px;font-weight:800;font-family:ui-monospace,monospace;fill:#2c3e50">' + l.v + '</text>'; });
    return svg;
  },
  _ligarResize() { if (this._resizeLigado) return; this._resizeLigado = true; const self = this; window.addEventListener('resize', () => { clearTimeout(self._resizeTimer); self._resizeTimer = setTimeout(() => { if (VC._modoAtivo === 'diagrama-rede' && document.getElementById('diagramaSVG')) self.render(); }, 200); }); },
  render() {
    const svgContainer = document.getElementById('diagramaSVG'); if (!svgContainer) return;
    try { this._ligarResize(); this.construirGrafo(); const svgStr = this.renderSVG(); const parser = new DOMParser(); const doc = parser.parseFromString(svgStr, 'image/svg+xml'); const novoSVG = doc.documentElement; novoSVG.setAttribute('id', 'diagramaSVG'); svgContainer.parentNode.replaceChild(novoSVG, svgContainer); this._ligarInteratividade(novoSVG); this._atualizarStatus(); } catch (e) { VC.debug.erro(e); }
  },
  _ligarInteratividade(svg) {
    const self = this;
    svg.querySelectorAll('g[data-id]').forEach(g => {
      g.addEventListener('click', (ev) => { ev.stopPropagation(); const id = g.getAttribute('data-id'); self._selecionado = id; self._mostrarDetalhe(id); self.render(); });
      g.addEventListener('mouseenter', (ev) => { const id = g.getAttribute('data-id'); const no = (self._grafoCache || { nos: [] }).nos.find(x => x.id === id); if (!no) return; self._mostrarTooltip(ev, no); });
      g.addEventListener('mouseleave', () => { self._esconderTooltip(); });
    });
    const canvas = document.getElementById('diagramaCanvas');
    if (canvas && !canvas._ligadoSankey) {
      canvas._ligadoSankey = true;
      canvas.addEventListener('mousedown', (ev) => { if (ev.target.closest('g[data-id]')) return; self._arrastando = true; self._ultimoX = ev.clientX; self._ultimoY = ev.clientY; canvas.classList.add('arrastando'); });
      window.addEventListener('mousemove', (ev) => { if (!self._arrastando) return; const dx = ev.clientX - self._ultimoX; const dy = ev.clientY - self._ultimoY; self._ultimoX = ev.clientX; self._ultimoY = ev.clientY; canvas.scrollLeft -= dx; canvas.scrollTop -= dy; });
      window.addEventListener('mouseup', () => { self._arrastando = false; if (canvas) canvas.classList.remove('arrastando'); });
      canvas.addEventListener('wheel', (ev) => { ev.preventDefault(); if (self._autoZoom) return; if (ev.deltaY < 0) self.zoomIn(); else self.zoomOut(); }, { passive: false });
    }
  },
  _mostrarTooltip(ev, no) {
    const popup = document.getElementById('ttPopup'); if (!popup) return;
    let html = '<div class="tt-tipo"><i class="fa-solid fa-circle-info"></i> ' + this._tipoLabel(no) + '</div>'; html += '<div class="tt-titulo">' + VC.utils.esc(no.nome) + '</div>';
    if (no.tipo === 'uta') { const u = no._dados || {}; html += '<div class="tt-desc">Q <b>' + VC.utils.fmt((u.Q || 0) * 3600, 0) + ' m³/h</b><br>dp <b>' + VC.utils.fmt(no.dp || 0, 0) + ' Pa</b><br>SFPint <b>' + VC.utils.fmt(u.sfpInt || 0, 0) + '</b></div>'; }
    else if (no.tipo === 'ramal') { html += '<div class="tt-desc">Ø <b>' + (no.Dcom || '—') + ' mm</b> · Q <b>' + VC.utils.fmt(no.Q || 0, 0) + ' m³/h</b><br>v <b>' + VC.utils.fmt(no.v || 0, 2) + ' m/s</b> · dp <b>' + VC.utils.fmt(no.dp || 0, 0) + ' Pa</b></div>'; }
    else if (no.tipo === 'espaco' || no.tipo === 'grupo-piso') { html += '<div class="tt-desc">Q_in <b>' + VC.utils.fmt(no.Q_in || 0, 0) + '</b> · Q_out <b>' + VC.utils.fmt(no.Q_out || 0, 0) + '</b><br>dQ <b>' + VC.utils.fmt(no.residuo || 0, 1) + ' m³/h</b></div>'; if (no.multiRede) html += '<div class="tt-desc" style="background:#faf5eb;border-left:3px solid #c9a876;padding:6px 8px;margin-top:6px;color:#9e8256;font-weight:700">⚠️ Recebe <b>' + (no.redesRecebidas || []).length + ' redes</b>: ' + (no.redesRecebidas || []).join(' + ') + '</div>'; const temConf = (no.Q_ConTerm && no.Q_ConTerm > 0) || (no.temConforto && no.nComConforto > 0); if (temConf) { const origem = no.rphOrigem || 'norma'; const icone = origem === 'utilizador' ? '👤' : '📘'; const label = origem === 'utilizador' ? 'utilizador' : 'norma'; if (no.tipo === 'espaco') html += '<div class="tt-desc" style="border-top:1px dashed #475569;padding-top:6px;margin-top:6px">' + icone + ' RPH <b>' + (no.rphAplicado || 0) + ' h⁻¹</b> · ' + label + '<br>Q_ConTerm <b>' + VC.utils.fmt(no.Q_ConTerm || 0, 0) + ' m³/h</b></div>'; else html += '<div class="tt-desc" style="border-top:1px dashed #475569;padding-top:6px;margin-top:6px">' + icone + ' <b>' + (no.nComConforto || 0) + '</b> espaço(s) com RPH</div>'; } const temQAI = (no.QAI_aplicado && no.QAI_aplicado > 0) || (no.temQAI && no.nComQAI > 0); if (temQAI) { const origemQ = no.QAI_origem || 'norma'; const iconeQ = origemQ === 'utilizador' ? '👷' : '📘'; const labelQ = origemQ === 'utilizador' ? 'engenheiro' : 'norma'; if (no.tipo === 'espaco') html += '<div class="tt-desc" style="border-top:1px dashed #475569;padding-top:6px;margin-top:6px;color:#b88a4a">' + iconeQ + ' QAI <b>' + VC.utils.fmt(no.QAI_aplicado || 0, 0) + ' m³/h</b> · ' + labelQ + '<br>Rede: <b>' + (no.QAI_rede || '—') + '</b>' + (no.QAI_motivo ? '<br>Motivo: <i>' + VC.utils.esc(no.QAI_motivo) + '</i>' : '') + '</div>'; else html += '<div class="tt-desc" style="border-top:1px dashed #475569;padding-top:6px;margin-top:6px;color:#b88a4a">' + iconeQ + ' <b>' + (no.nComQAI || 0) + '</b> espaço(s) com QAI · total <b>' + VC.utils.fmt(no.QAI_total || 0, 0) + ' m³/h</b></div>'; } }
    else if (no.tipo === 'transferencia') html += '<div class="tt-desc">' + VC.utils.esc(no.deNome || '?') + ' → ' + VC.utils.esc(no.paraNome || '?') + '<br>Q <b>' + VC.utils.fmt(no.Q || 0, 0) + ' m³/h</b></div>';
    popup.className = 'tt-popup on tt-tecnico-v6'; popup.innerHTML = html; popup.style.left = Math.min(ev.clientX + 12, window.innerWidth - 320) + 'px'; popup.style.top = Math.min(ev.clientY + 12, window.innerHeight - 200) + 'px';
  },
  _esconderTooltip() { const popup = document.getElementById('ttPopup'); if (popup) popup.classList.remove('on'); },
  _atualizarStatus() { const el = document.getElementById('diagramaStatus'); if (!el) return; const g = this._grafoCache || { nos: [], arestas: [] }; const utaAtiva = this._utaAtiva ? (VC.dados.utas.find(u => 'UTA-' + u.id === this._utaAtiva) || {}).nome : 'Todas'; const autoZoomTxt = this._autoZoom ? 'auto-zoom' : 'zoom ' + Math.round(this._zoom * 100) + '%'; el.textContent = g.nos.length + ' nós · ' + g.arestas.length + ' arestas · ' + utaAtiva + ' · ' + autoZoomTxt; },
  _tooltipTexto(n) {
    if (n.tipo === 'uta') return n.nome + '\nQ = ' + VC.utils.fmt((n._dados.Q || 0) * 3600, 0) + ' m³/h\ndp = ' + VC.utils.fmt(n.dp || 0, 0) + ' Pa';
    if (n.tipo === 'ramal') return n.nome + '\nØ ' + (n.Dcom || '—') + ' mm\nQ = ' + VC.utils.fmt(n.Q || 0, 0) + ' m³/h\nv = ' + VC.utils.fmt(n.v || 0, 2) + ' m/s\ndp = ' + VC.utils.fmt(n.dp || 0, 0) + ' Pa';
    if (n.tipo === 'espaco' || n.tipo === 'grupo-piso') { let s = n.nome + '\nQ_in = ' + VC.utils.fmt(n.Q_in || 0, 0) + '\nQ_out = ' + VC.utils.fmt(n.Q_out || 0, 0) + '\ndQ = ' + VC.utils.fmt(n.residuo || 0, 1); if (n.multiRede) s += '\n⚠️ Recebe ' + (n.redesRecebidas || []).length + ' redes: ' + (n.redesRecebidas || []).join(' + '); if (n.Q_ConTerm > 0 || n.nComConforto > 0) { const icone = n.rphOrigem === 'utilizador' ? '👤' : '📘'; s += '\n' + icone + ' RPH = ' + (n.rphAplicado || n.nComConforto || 0); if (n.Q_ConTerm > 0) s += '\nQ_ConTerm = ' + VC.utils.fmt(n.Q_ConTerm, 0) + ' m³/h'; } if (n.QAI_aplicado > 0 || n.nComQAI > 0) { const iconeQ = n.QAI_origem === 'utilizador' ? '👷' : '📘'; s += '\n' + iconeQ + ' QAI = ' + VC.utils.fmt(n.QAI_aplicado || n.QAI_total || 0, 0) + ' m³/h'; if (n.QAI_rede) s += '\nrede = ' + n.QAI_rede; if (n.QAI_motivo) s += '\nmotivo = ' + n.QAI_motivo; } return s; }
    if (n.tipo === 'transferencia') return n.nome + '\nQ = ' + VC.utils.fmt(n.Q || 0, 0) + ' m³/h'; return n.nome;
  },
  _tipoLabel(no) { if (no.tipo === 'uta') return 'UTA · ' + (no.rede === 'insuflacao' ? 'Insuflação' : (no.rede === 'extracao_suja' ? 'Extração suja' : 'Extração')); if (no.tipo === 'ramal') return 'Ramal R' + no.nivelNumero; if (no.tipo === 'espaco') return 'Espaço' + (no.multiRede ? ' ⚠️ Multi-rede' : ''); if (no.tipo === 'grupo-piso') return 'Grupo · ' + (no.nEspacos || 0) + ' espaços' + (no.multiRede ? ' ⚠️ Multi-rede' : ''); if (no.tipo === 'transferencia') return 'Transferência'; return ''; },
  abrirPainelLateral(id) { const no = (this._grafoCache || { nos: [] }).nos.find(n => n.id === id); if (!no) return; const painel = document.getElementById('diagPainelLateral'); const wrap = document.getElementById('diagramaWrap'); if (!painel || !wrap) return; painel.classList.add('on'); wrap.classList.add('com-painel'); },
  fecharPainelLateral() { const painel = document.getElementById('diagPainelLateral'); const wrap = document.getElementById('diagramaWrap'); if (painel) painel.classList.remove('on'); if (wrap) wrap.classList.remove('com-painel'); this._selecionado = null; this.render(); },
  _mostrarDetalhe(id) { },
  zoomIn() { this._zoom = Math.min(2.5, this._zoom * 1.15); this.render(); },
  zoomOut() { this._zoom = Math.max(0.3, this._zoom / 1.15); this.render(); },
  resetZoom() { this._zoom = 1; this.render(); },
  autoLayout() { this._zoom = 1; this.render(); },
  expandirTudo() { this._utasExpandidas.clear(); this._pisosExpandidos.clear(); (VC.dados.utas || []).forEach(u => this._utasExpandidas.add('UTA-' + u.id)); (VC.dados.espacos || []).forEach(e => { const loc = e.localizacao || {}; this._pisosExpandidos.add((loc.piso || '?') + '-' + (loc.ala || '?')); }); this._zoom = Math.max(0.35, this._zoom * 0.7); this.render(); },
  colapsarTudo() { this._utasExpandidas.clear(); this._pisosExpandidos.clear(); this._zoom = Math.min(1.5, this._zoom * 1.3); this.render(); },
  toggleUta(id) { if (this._utasExpandidas.has(id)) this._utasExpandidas.delete(id); else this._utasExpandidas.add(id); this.render(); },
  togglePiso(chave) { if (this._pisosExpandidos.has(chave)) this._pisosExpandidos.delete(chave); else this._pisosExpandidos.add(chave); this.render(); },
  setUtaAtiva(id) { this._utaAtiva = id || null; this._selecionado = null; this.render(); this._atualizarStatus(); },
  getUtaAtiva() { return this._utaAtiva; },
  setFiltro(filtro) { this._filtro = filtro; document.querySelectorAll('.v6-diag-filtro').forEach(b => { b.classList.toggle('ativo', b.dataset.filtro === filtro); }); this.render(); },
  filtrarNos(nos, filtro) { if (!filtro || filtro === 'tudo') return nos; if (filtro === 'desequilibrios') return nos.filter(n => !n.residuo || Math.abs(n.residuo) > 5 || n.tipo === 'ramal' || n.tipo === 'uta'); return nos.filter(n => n.rede === filtro || n.tipo === 'grupo-piso' || n.tipo === 'espaco' || n.tipo === 'transferencia' || n.tipo === 'uta'); },
  abrirIntegracaoRelatorio() { const modal = document.getElementById('modalGenerico'); const cont = document.getElementById('modalGenericoConteudo'); if (!modal || !cont) return; const svg = this.renderSVG(true); cont.innerHTML = '<div class="modal-cabecalho"><h3><i class="fa-solid fa-file-lines"></i> Diagrama Sankey</h3><button class="fechar" onclick="VC.ui.fecharModal(\'modalGenerico\')">x</button></div><div class="modal-corpo"><p style="font-size:11.5px;color:var(--texto-med);margin-bottom:12px">Pré-visualização do diagrama (escala 100%).</p><div style="background:#fff;border:1px solid var(--borda);border-radius:6px;padding:8px;overflow:auto;max-height:500px">' + svg + '</div></div><div class="modal-rodape"><button class="btn" onclick="VC.ui.fecharModal(\'modalGenerico\')">Fechar</button><button class="btn verde" onclick="VC6.diagrama.exportarSVG()"><i class="fa-solid fa-file-code"></i> SVG</button></div>'; modal.classList.add('on'); },
  integrarRelatorio() { return '<div style="height:auto;max-height:720px">' + this.renderSVG(true) + '</div>'; },
  integrarPDF() { try { const g = this.construirGrafo(); return { nos: g.nos.length, arestas: g.arestas.length }; } catch (e) { return null; } },
  integrarCaderno() { return '<div><h4>Diagrama de rede de ar</h4>' + this.integrarRelatorio() + '</div>'; },
  exportarSVG() { try { const svg = this.renderSVG(true); VC.utils.download('VentCondutas_v' + VC.versaoCurta + '_Rede_Ar_' + new Date().toISOString().slice(0, 10) + '.svg', svg, 'image/svg+xml'); VC.ui.toast('SVG exportado (escala 100%).'); } catch (e) { VC.debug.erro(e); VC.ui.toast('Erro SVG.'); } },
  exportarPNG() { try { const svg = this.renderSVG(true); const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }); const url = URL.createObjectURL(blob); const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); canvas.width = img.width || 2400; canvas.height = img.height || 1800; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0); canvas.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'VentCondutas_v' + VC.versaoCurta + '_Rede_Ar_' + new Date().toISOString().slice(0, 10) + '.png'; a.click(); }, 'image/png'); URL.revokeObjectURL(url); VC.ui.toast('PNG exportado (escala 100%).'); }; img.onerror = () => { URL.revokeObjectURL(url); VC.ui.toast('Erro PNG.'); }; img.src = url; } catch (e) { VC.debug.erro(e); VC.ui.toast('Erro PNG.'); } },
  renderCaixaUTA(u) { if (!u) return ''; const d = u._dados || u; return '<div class="v6-diag-caixa uta" data-tipo="uta"><div class="v6-diag-texto titulo">' + VC.utils.esc(d.nome) + '</div><div class="v6-diag-texto metrica">Q: ' + VC.utils.fmt((d.Q || 0) * 3600, 0) + ' m³/h</div><div class="v6-diag-texto metrica">dp ext: ' + VC.utils.fmt(d.dpExt, 0) + ' Pa</div><div class="v6-diag-texto metrica">dp int: ' + VC.utils.fmt(d.dpInt, 0) + ' Pa</div><div class="v6-diag-texto metrica">SFPint: ' + VC.utils.fmt(d.sfpInt, 0) + ' · Cl. ' + (d.sfpClass ? d.sfpClass.classe : '—') + '</div></div>'; },
  renderCaixaRamal(r) { if (!r) return ''; const d = r._dados || r; const espacos = VC.calculo.espacosServidosPorRamal ? VC.calculo.espacosServidosPorRamal(d.nome) : []; const terminais = VC.dados.terminais.filter(t => t.ramalRef === d.nome); return '<div class="v6-diag-caixa ramal r' + (d.nivelNumero || 2) + '" data-tipo="ramal"><div class="v6-diag-texto titulo">' + VC.utils.esc(d.nome) + '</div><div class="v6-diag-texto sub">Ø ' + (d.Dcom || '—') + ' mm</div><div class="v6-diag-texto metrica">Q: ' + VC.utils.fmt(d.Q, 0) + ' m³/h</div><div class="v6-diag-texto metrica">v: ' + VC.utils.fmt(d.v, 2) + ' m/s</div><div class="v6-diag-texto metrica">dp: ' + VC.utils.fmt(d.deltaPtotal, 0) + ' Pa</div><div class="v6-diag-texto sub">Espaços: ' + espacos.length + ' · Terminais: ' + terminais.length + '</div></div>'; },
  renderCaixaEspaco(e) { if (!e) return ''; const d = e._dados || e; const b = d.balanco || {}; const r = b.residuo || 0; const temConf = (Number(d.Q_ConTerm) || 0) > 0; const temQAI = (Number(d.QAI_projeto) || 0) > 0; const badgeRPH = temConf ? (d.rphOrigem === 'utilizador' ? '👤' : '📘') : ''; const badgeQAI = temQAI ? (d.QAI_projeto_origem === 'utilizador' ? '👷' : '📘') : ''; const badges = [badgeRPH, badgeQAI].filter(Boolean).join(' '); let h = '<div class="v6-diag-caixa espaco ' + (Math.abs(r) > 5 ? 'desequilibrio' : '') + '" data-tipo="espaco">'; h += '<div class="v6-diag-texto titulo">' + (badges ? badges + ' ' : '') + VC.utils.esc(d.nome) + '</div>'; h += '<div class="v6-diag-texto metrica">Q_in: ' + VC.utils.fmt(b.Q_in_direto || 0, 0) + ' m³/h</div>'; h += '<div class="v6-diag-texto metrica">Q_out: ' + VC.utils.fmt(b.Q_out_direto || 0, 0) + ' m³/h</div>'; h += '<div class="v6-diag-texto metrica">dQ: ' + (r >= 0 ? '+' : '') + VC.utils.fmt(r, 1) + ' m³/h</div>'; if (temConf) h += '<div class="v6-diag-texto metrica" style="color:var(--primario-esc)">RPH: ' + (d.rphAplicado || 0) + ' h⁻¹ · Q_ConTerm: ' + VC.utils.fmt(d.Q_ConTerm, 0) + '</div>'; if (temQAI) h += '<div class="v6-diag-texto metrica" style="color:#b88a4a">QAI: ' + VC.utils.fmt(d.QAI_projeto, 0) + ' m³/h · rede ' + (d.QAI_rede || '—') + (d.QAI_projeto_motivo ? '<br><span style="font-style:italic;font-size:9px">' + VC.utils.esc(d.QAI_projeto_motivo) + '</span>' : '') + '</div>'; h += '</div>'; return h; },
  renderCaixaAtmosfera(a) { if (!a) return ''; const d = a._dados || {}; return '<div class="v6-diag-caixa atmosfera" data-tipo="atmosfera"><div class="v6-diag-texto titulo">ATMOSFERA</div><div class="v6-diag-texto metrica">Ar novo: ' + VC.utils.fmt(d.Q_ar_novo || 0, 0) + ' m³/h</div><div class="v6-diag-texto metrica">Exaustão: ' + VC.utils.fmt(d.Q_exaustao || 0, 0) + ' m³/h</div></div>'; },
  renderTransferencia(t) { if (!t) return ''; return '<div class="v6-diag-transf" data-tipo="transferencia"><div class="v6-diag-texto sub">' + VC.utils.esc(t.deNome || '?') + ' → ' + VC.utils.esc(t.paraNome || '?') + '</div><div class="v6-diag-texto metrica">' + VC.utils.fmt(t.Q, 0) + ' m³/h · A ' + VC.utils.fmt(t.area_cm2, 0) + ' cm²</div></div>'; },
  classeEstadoEspaco(esp) { if (!esp || !esp.balanco) return 'v6-diag-caixa espaco'; const r = Math.abs(esp.balanco.residuo || 0); if (r <= 5) return 'v6-diag-caixa espaco'; if (r <= 10) return 'v6-diag-caixa espaco leve'; return 'v6-diag-caixa espaco desequilibrio grave'; }
};

/* ============================================================
   VENTCONDUTAS V11.0.0 · Subgrupos de Auditoria e Relatórios
   ============================================================ */
window.VC6 = window.VC6 || {};
window.VC6.subgruposAuditoria = {
    _subgrupoAtivo: 'relatorios',   // v11.1: abre nos relatórios (os gráficos ainda estão a ser implementados)
    _etapaAtiva: 'parametros',

    mudarSubgrupo(sub) {
        this._subgrupoAtivo = sub;
        const container = document.getElementById('conteudoPasso');
        if (container) container.innerHTML = this.renderizarPainelAuditoria();
    },

    mudarEtapa(etapa) {
        this._etapaAtiva = etapa;
        const container = document.getElementById('conteudoPasso');
        if (container) container.innerHTML = this.renderizarPainelAuditoria();
    },

    renderizarPainelAuditoria() {
        let h = '<div class="cartao-titulo"><i class="fa-solid fa-chart-pie"></i> Auditoria e Documentação Técnica (V11)</div>';
        h += '<p style="font-size:11.5px;color:var(--texto-med);margin-bottom:12px">Painel unificado com separação em subgrupos cronológicos (Parâmetros → Entrega) e cartões visuais de grande formato.</p>';

        h += '<div style="display:flex; gap:8px; margin-bottom:16px;">';
        h += '<button class="btn ' + (this._subgrupoAtivo === 'graficos' ? 'primario' : '') + '" onclick="VC6.subgruposAuditoria.mudarSubgrupo(\'graficos\')"><i class="fa-solid fa-chart-column"></i> Subgrupo: Gráficos (Auditoria Visual)</button>';
        h += '<button class="btn ' + (this._subgrupoAtivo === 'relatorios' ? 'primario' : '') + '" onclick="VC6.subgruposAuditoria.mudarSubgrupo(\'relatorios\')"><i class="fa-solid fa-file-lines"></i> Subgrupo: Relatórios (Documentação Técnica)</button>';
        h += '</div>';

        const etapas = [
            { id: 'parametros', nome: '1. Parâmetros' },
            { id: 'ambientes', nome: '2. Ambientes' },
            { id: 'especificacoes', nome: '3. Especificações' },
            { id: 'topologia', nome: '4. Topologia' },
            { id: 'verificacao', nome: '5. Verificação' },
            { id: 'entrega', nome: '6. Relatórios / Entrega' }
        ];

        h += '<div style="display:flex; gap:4px; margin-bottom:16px; flex-wrap:wrap; border-bottom:1px solid var(--borda); padding-bottom:8px;">';
        etapas.forEach(e => {
            const ativo = this._etapaAtiva === e.id ? 'font-weight:bold; border-bottom:2px solid var(--primario); color:var(--primario-esc);' : 'color:var(--texto-med);';
            h += '<button class="btn" style="background:var(--superf2); font-size:11.5px; ' + ativo + '" onclick="VC6.subgruposAuditoria.mudarEtapa(\'' + e.id + '\')">' + e.nome + '</button>';
        });
        h += '</div>';

        h += '<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap:16px;">';
        
        if (this._subgrupoAtivo === 'graficos') {
            if (this._etapaAtiva === 'parametros') {
                h += this._cartaoVisualCard('Origem / Caudal', 'Norma vs Conforto vs QAI', 'Distribuição comparativa de caudais por critério de projeto.', 'fa-chart-pie', 'VC.graficos.renderG_OrigemCaudal()');
                h += this._cartaoVisualCard('Caudal / UTA', 'Carga Volumétrica Global', 'Avaliação da capacidade total agregada por unidade de tratamento de ar.', 'fa-wind', 'VC.graficos.renderG_CaudalUTA()');
            } else if (this._etapaAtiva === 'ambientes') {
                h += this._cartaoVisualCard('Equilíbrio / Espaço', 'Qin vs Qout por Compartimento', 'Verificação do balanço volumétrico direto em cada espaço.', 'fa-scale-balanced', 'VC.graficos.renderG_EquilibrioEspaco()');
                h += this._cartaoVisualCard('Fugas / Pressurização', 'Resíduo dQ e Diferencial de Pressão', 'Análise de estanquidade e sobrepressão relativa em Cascata.', 'fa-gauge-high', 'VC.graficos.renderG_Pressurizacao()');
            } else if (this._etapaAtiva === 'especificacoes') {
                h += this._cartaoVisualCard('Cobertura / Terminais', 'Rácio de Seleção (95% - 105%)', 'Desvio percentual entre caudal debitado e caudal exigido nos difusores.', 'fa-bullseye', 'VC.graficos.renderG_CoberturaTerminais()');
                h += this._cartaoVisualCard('Desvios / Dimensionamento', 'Sobre-serviço e Sub-serviço', 'Identificação de terminais fora dos limiares de tolerância regulamentar.', 'fa-triangle-exclamation', 'VC.graficos.renderG_DesviosDimensionamento()');
            } else if (this._etapaAtiva === 'topologia') {
                h += this._cartaoVisualCard('Distribuição / Ar', 'Grafo Sankey da Rede de Condutas', 'Visualização hierárquica UTA → Ramais → Espaços com largura proporcional a Q.', 'fa-network-wired', 'VC6.diagrama.renderSVG()');
                h += this._cartaoVisualCard('Estabilidade / Reynolds', 'Regimes de Escoamento Crítico', 'Validação do número de Reynolds e rugosidade relativa nas tubagens.', 'fa-water', 'VC.graficos.renderG_Reynolds()');
            } else if (this._etapaAtiva === 'verificacao') {
                h += this._cartaoVisualCard('Velocidade / Ruído', 'Limites VDI 2081 por Ramal', 'Auditoria acústica e dinâmica de velocidades nas secções principais.', 'fa-volume-high', 'VC.graficos.renderG_VelocidadeRuido()');
                h += this._cartaoVisualCard('Eficiência / SFPint', 'Conformidade Ecodesign / ErP', 'Potência específica global dos ventiladores face aos limites EN 16798-3.', 'fa-bolt', 'VC.graficos.renderG_SFPint()');
                h += this._cartaoVisualCard('Acústica / Terminais', 'Avaliação de Lw vs Curvas NR', 'Dispersão acústica do ruído regenerado nos difusores.', 'fa-headphones', 'VC.graficos.renderG_AcusticaTerminais()');
            } else if (this._etapaAtiva === 'entrega') {
                h += this._cartaoVisualCard('Consolidação Global', 'Painel Resumo de Auditoria', 'Visão sintética consolidada de todos os indicadores críticos do projeto.', 'fa-clipboard-check', 'VC.graficos.renderG_Consolidado()');
            }
        } else {
            if (this._etapaAtiva === 'parametros') {
                h += this._cartaoRelatorioCard('Premissas de Projeto', 'Condições Climáticas e Fatores Base', 'Relatório formal de pressões barométricas, altitude, densidades e premissas ISA.', 'fa-file-lines');
            } else if (this._etapaAtiva === 'ambientes') {
                h += this._cartaoRelatorioCard('Caracterização Espacial', 'Mapa de Caudais por Compartimento', 'Listagem exaustiva de áreas, pés-direitos, ocupação e renovações exigidas.', 'fa-table-cells');
            } else if (this._etapaAtiva === 'especificacoes') {
                h += this._cartaoRelatorioCard('Requisitos QAI & Conforto', 'F-RPH e Especificações de Terminais', 'Documento técnico com os critérios de qualidade do ar interior e conforto térmico.', 'fa-book-open');
            } else if (this._etapaAtiva === 'topologia') {
                h += this._cartaoRelatorioCard('Topologia de Redes e Ramais', 'Mapeamento de Condutas e Diâmetros', 'Tabela completa de ramais, comprimentos equivalentes, zetas e diâmetros comerciais.', 'fa-sitemap');
            } else if (this._etapaAtiva === 'verificacao') {
                h += this._cartaoRelatorioCard('Conformidade P138', 'Verificação de Caudais Mínimos Regulamentares', 'Tabela de verificação e barras sobrepostas com as exigências da Portaria 138-I.', 'fa-square-check');
                h += this._cartaoRelatorioCard('Caminho Crítico e Perdas', 'Relatório de Perdas de Carga Totais', 'Demonstração detalhada da perda de carga acumulada no trajeto mais desfavorável.', 'fa-route');
            } else if (this._etapaAtiva === 'entrega') {
                h += this._cartaoRelatorioCard('Memória Descritiva de Cálculo', 'Peça Escrita Completa (ISA / Sutherland)', 'Documento formal pronto para submissão regulamentar e licenciamento.', 'fa-file-pdf');
                h += this._cartaoRelatorioCard('Caderno de Encargos Parametrizado', 'Especificações Técnicas para Empreiteiro', 'Caderno descritivo detalhado com as exigências de materiais e montagem.', 'fa-file-contract');
                h += this._cartaoRelatorioCard('Comissionamento e TAB', 'Ficha de Validação de Obra', 'Protocolo de ensaios e balanceamento para testes in loco (Test, Adjust, Balance).', 'fa-clipboard-list');
            }
        }

        h += '</div>';
        return h;
    },

    _cartaoVisualCard(titulo, subtitulo, desc, icone, funcaoClick) {
        // v11.1: o cartão só fica ativo se a função que chama existir; senão aparece "Em desenvolvimento"
        const alvo = String(funcaoClick || '').split('(')[0].trim();
        const existe = typeof alvo.split('.').reduce((o, k) => (o == null ? undefined : o[k]), window) === 'function';
        const botao = existe
            ? '<button class="btn primario" style="width:100%; justify-content:center;" onclick="' + funcaoClick + '"><i class="fa-solid fa-eye"></i> Visualizar Gráfico</button>'
            : '<button class="btn" style="width:100%; justify-content:center; opacity:.6; cursor:not-allowed;" disabled title="Gráfico ainda não implementado"><i class="fa-solid fa-person-digging"></i> Em desenvolvimento</button>';
        return '<div style="background:var(--superf); border:1px solid var(--borda); border-radius:10px; padding:20px; box-shadow:var(--sombra-1); display:flex; flex-direction:column; justify-content:space-between; transition:all 0.2s;">' +
               '<div>' +
               '<div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">' +
               '<div style="width:44px; height:44px; border-radius:10px; background:var(--primario-soft); color:var(--primario-esc); display:flex; align-items:center; justify-content:center; font-size:20px;"><i class="fa-solid ' + icone + '"></i></div>' +
               '<div><h4 style="font-size:14px; font-weight:800; color:var(--texto); margin:0;">' + titulo + '</h4><span style="font-size:11px; color:var(--texto-suave); font-weight:600;">' + subtitulo + '</span></div>' +
               '</div>' +
               '<p style="font-size:12px; color:var(--texto-med); line-height:1.5; margin-bottom:16px;">' + desc + '</p>' +
               '</div>' +
               botao +
               '</div>';
    },

    _cartaoRelatorioCard(titulo, subtitulo, desc, icone) {
        return '<div style="background:var(--superf); border:1px solid var(--borda); border-radius:10px; padding:20px; box-shadow:var(--sombra-1); display:flex; flex-direction:column; justify-content:space-between; transition:all 0.2s;">' +
               '<div>' +
               '<div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">' +
               '<div style="width:44px; height:44px; border-radius:10px; background:var(--verde-soft); color:var(--verde-esc); display:flex; align-items:center; justify-content:center; font-size:20px;"><i class="fa-solid ' + icone + '"></i></div>' +
               '<div><h4 style="font-size:14px; font-weight:800; color:var(--texto); margin:0;">' + titulo + '</h4><span style="font-size:11px; color:var(--texto-suave); font-weight:600;">' + subtitulo + '</span></div>' +
               '</div>' +
               '<p style="font-size:12px; color:var(--texto-med); line-height:1.5; margin-bottom:16px;">' + desc + '</p>' +
               '</div>' +
               '<div style="display:flex; gap:8px;">' +
               '<button class="btn" style="flex:1; justify-content:center;" onclick="VC.ui.toast(\'A gerar visualização...\')"><i class="fa-solid fa-file-lines"></i> Ver</button>' +
               '<button class="btn verde" style="flex:1; justify-content:center;" onclick="VC.ui.toast(\'Relatório exportado!\')"><i class="fa-solid fa-download"></i> Exportar</button>' +
               '</div>' +
               '</div>';
    }
};

window.renderDiagramaRedeV6 = function () {
    if (window.VC6 && window.VC6.subgruposAuditoria) {
        return window.VC6.subgruposAuditoria.renderizarPainelAuditoria();
    }
 let h = '<div class="cartao-titulo"><i class="fa-solid fa-network-wired"></i> Diagrama Rede de Ar</div>';
  h += '<p style="font-size:11.5px;color:var(--texto-med);margin-bottom:10px">Sankey horizontal com <b>árvore hierárquica</b>. Colunas dinâmicas · fatias distribuídas · offset por rede · auto-zoom.</p>';
  h += '<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">';
  h += '<button class="btn primario" onclick="VC.modos.set(\'diagrama-rede\')"><i class="fa-solid fa-expand"></i> Abrir diagrama</button>';
  h += '<button class="btn" onclick="VC6.diagrama.toggleAutoZoom()"><i class="fa-solid fa-magnifying-glass"></i> Auto-zoom</button>';
  h += '<button class="btn" onclick="VC6.diagrama.exportarSVG()">SVG</button>';
  h += '<button class="btn" onclick="VC6.diagrama.exportarPNG()">PNG</button>';
  h += '</div>';
  const g = VC6.diagrama.construirGrafo();
  let resumo = '<b>Resumo:</b> ' + g.nos.length + ' nós · ' + g.arestas.length + ' arestas · ' + g.nos.filter(n => n.tipo === 'uta').length + ' UTAs · ' + g.nos.filter(n => n.tipo === 'ramal').length + ' ramais';
  h += '<div style="background:var(--superf2);padding:10px 12px;border-radius:6px;font-size:11px;color:var(--texto-med)">' + resumo + '</div>';
  return h;
};

VC.ui.abrirBalanco = function () {
  const m = document.getElementById('modalBalanco');
  const c = document.getElementById('modalBalancoConteudo');
  if (!m || !c) return;
  c.innerHTML = '<div class="modal-cabecalho"><h3><i class="fa-solid fa-scale-balanced"></i> Balanço de Ar</h3><button class="fechar" onclick="VC.ui.fecharModal(\'modalBalanco\')">x</button></div><div class="modal-corpo">' + window.renderBalancoV6() + '</div><div class="modal-rodape"><button class="btn" onclick="VC.ui.fecharModal(\'modalBalanco\')">Fechar</button></div>';
  m.classList.add('on');
};

VC.ui.abrirTestes = function () {
  const m = document.getElementById('modalTestes');
  const c = document.getElementById('modalTestesConteudo');
  if (!m || !c) return;
  const r = VC6.testes.correr();
  let h = '<div class="modal-cabecalho"><h3><i class="fa-solid fa-vial"></i> Testes · ' + r.total + '</h3><button class="fechar" onclick="VC.ui.fecharModal(\'modalTestes\')">x</button></div><div class="modal-corpo">';
  h += VC.ui_comp.kpiGrid([
    { l: 'Total', v: r.total, cor: 'primario' },
    { l: 'Passados', v: r.pass, cor: 'verde' },
    { l: 'Falhados', v: r.fail, cor: 'coral' },
    { l: 'Taxa', v: Math.round(r.pass / r.total * 100) + ' %', cor: 'violeta' }
  ], 4);
  const nuc = {};
  r.detalhe.forEach(t => { if (!nuc[t.nucleo]) nuc[t.nucleo] = { pass: 0, fail: 0, testes: [] }; nuc[t.nucleo][t.estado]++; nuc[t.nucleo].testes.push(t); });
  h += '<div style="border:1px solid var(--borda);border-radius:8px;overflow:hidden">';
  Object.keys(nuc).sort().forEach(n => {
    const g = nuc[n];
    h += '<div style="border-bottom:1px solid var(--borda)"><div style="padding:8px 14px;background:var(--superf3);display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-size:11.5px;font-weight:800" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'block\'?\'none\':\'block\'"><span>' + n + '</span><span style="font-size:10.5px;font-family:ui-monospace,monospace"><span style="color:var(--verde-esc)">OK ' + g.pass + '</span> <span style="color:var(--coral-esc)">FAIL ' + g.fail + '</span></span></div><div style="display:none">';
    g.testes.forEach(t => {
      h += '<div style="display:grid;grid-template-columns:70px 1fr 70px;gap:10px;padding:5px 14px;font-size:11px;border-bottom:1px solid var(--borda);align-items:center"><span style="font-family:ui-monospace,monospace;font-weight:800;color:var(--primario-esc);font-size:10px">' + t.id + '</span><span>' + VC.utils.esc(t.nome) + '</span><span style="text-align:right;font-weight:800;color:' + (t.estado === 'pass' ? 'var(--verde-esc)' : 'var(--coral-esc)') + '">' + (t.estado === 'pass' ? 'OK' : 'FAIL') + '</span></div>';
    });
    h += '</div></div>';
  });
  h += '</div></div>';
  h += '<div class="modal-rodape"><button class="btn" onclick="VC.ui.fecharModal(\'modalTestes\')">Fechar</button></div>';
  c.innerHTML = h;
  m.classList.add('on');
};

VC.glossarioVivo = {
  contrato(passo) {
    const c = (VC.conhecimento.contratoLegendas || {})[passo] || [];
    return c.filter(k => VC.tooltips.dicionario[k]);
  },
  extrairSimbolosDoPasso() {
    const container = document.getElementById('conteudoPasso');
    if (!container) return [];
    const simbolos = new Set();
    const dic = VC.tooltips.dicionario || {};
    const ignorarChave = (k) => !k || k.indexOf('input') === 0 || k.indexOf('ctx') === 0;
    container.querySelectorAll('[data-tt-simbolo]').forEach(el => {
      const k = el.getAttribute('data-tt-simbolo');
      if (!ignorarChave(k)) simbolos.add(k);
    });
    container.querySelectorAll('[data-tt]').forEach(el => {
      const chave = el.getAttribute('data-tt');
      const info = dic[chave];
      if (info && info.tipo === 'tecnico' && info.simbolo && !ignorarChave(chave)) simbolos.add(chave);
    });
    container.querySelectorAll('.label-unidade').forEach(el => {
      const un = el.textContent.trim().replace(/[()]/g, '');
      if (!un) return;
      Object.keys(dic).forEach(k => { const info = dic[k]; if (info.unidade === un && info.tipo === 'tecnico') simbolos.add(k); });
    });
    container.querySelectorAll('table .valor-derivado').forEach(el => {
      const tt = el.getAttribute('data-tt');
      if (tt && !ignorarChave(tt)) simbolos.add(tt);
    });
    const chavesPorSimbolo = {};
    const chavesPorUnidade = {};
    Object.keys(dic).forEach(k => {
      const info = dic[k];
      if (!info || info.tipo !== 'tecnico') return;
      if (info.simbolo) { const s = String(info.simbolo).trim(); if (!chavesPorSimbolo[s]) chavesPorSimbolo[s] = k; }
      if (info.unidade) { const u = String(info.unidade).trim(); if (!chavesPorUnidade[u]) chavesPorUnidade[u] = k; }
    });
    const encontrarPorTexto = (texto) => {
      if (!texto) return null;
      const t = String(texto).replace(/\s+/g, ' ').trim();
      const m1 = t.match(/^([A-Za-z_Δ][A-Za-z0-9_]*)\s*\(([^)]+)\)/);
      if (m1) {
        const sim = m1[1]; const un = m1[2].trim();
        if (chavesPorSimbolo[sim]) return chavesPorSimbolo[sim];
        if (chavesPorUnidade[un]) return chavesPorUnidade[un];
      }
      const m2 = t.match(/^([A-Za-z_Δ][A-Za-z0-9_]*)$/);
      if (m2 && chavesPorSimbolo[m2[1]]) return chavesPorSimbolo[m2[1]];
      if (dic[t] && dic[t].tipo === 'tecnico') return t;
      return null;
    };
    container.querySelectorAll('th').forEach(el => { const chave = encontrarPorTexto(el.textContent); if (chave) simbolos.add(chave); });
    container.querySelectorAll('label').forEach(el => { const chave = encontrarPorTexto(el.textContent); if (chave && !ignorarChave(chave)) simbolos.add(chave); });
    return Array.from(simbolos).filter(k => { if (ignorarChave(k)) return false; const info = dic[k]; return info && info.tipo === 'tecnico'; });
  },
  validar(passo) {
    const contrato = this.contrato(passo);
    const dom = this.extrairSimbolosDoPasso();
    const soContrato = contrato.filter(k => dom.indexOf(k) < 0);
    const soDom = dom.filter(k => contrato.indexOf(k) < 0);
    return { contrato, dom, soContrato, soDom };
  },
  render(passo) {
    const info = this.validar(passo);
    if (VC._debugGlossario && (info.soContrato.length || info.soDom.length)) {
      console.warn('[Glossário Vivo] Divergência em «' + passo + '»:', { declaradoSemDOM: info.soContrato, domSemDeclaracao: info.soDom });
    }
    const todos = info.contrato.length > 0 ? info.contrato : info.dom;
    return this._renderTabela(todos);
  },
  _renderTabela(chaves) {
    const dic = VC.tooltips.dicionario;
    if (!chaves.length) return '<div style="padding:14px 12px;color:var(--texto-suave);font-style:italic;font-size:11px">Sem símbolos relevantes nesta aba.</div>';
    let h = '<table class="legenda-tabela"><thead><tr><th>Símbolo</th><th>Significado</th><th>Unidade</th></tr></thead><tbody>';
    chaves.sort().forEach(k => {
      const info = dic[k];
      if (!info) return;
      const sim = info.simbolo || info.titulo || k;
      const nome = info.titulo || '—';
      const un = info.unidade || '—';
      h += '<tr><td class="leg-sim">' + VC.utils.esc(sim) + '</td><td class="leg-nome">' + VC.utils.esc(nome) + '</td><td class="leg-un">' + VC.utils.esc(un) + '</td></tr>';
    });
    h += '</tbody></table>';
    return h;
  }
};

VC.passos = VC.passos || {};
VC.passos.render = function (passo) {
  VC._passoAtivo = passo;
  const meta = VC.passosCatalogo.find(p => p.id === passo);
  if (meta) {
    const g = document.getElementById('cabecalhoGrupo');
    const t = document.getElementById('cabecalhoTitulo');
    const s = document.getElementById('cabecalhoSub');
    const bp = document.getElementById('breadcrumbPasso');
    const bg = document.querySelector('#breadcrumb b');
    if (g) g.textContent = meta.grupoNome + (meta.subgrupoNome ? ' > ' + meta.subgrupoNome : '');
    if (t) t.innerHTML = '<i class="fa-solid ' + meta.icone + '"></i> <span>' + meta.titulo + '</span>';
    if (s) s.textContent = meta.sub;
    if (bp) bp.textContent = meta.titulo;
    if (bg) bg.textContent = meta.grupoNome;
  }
  const el = document.getElementById('conteudoPasso');
  if (!el) return;
  try {
    if (passo === 'balanco') el.innerHTML = window.renderBalancoV6();
    else if (passo === 'transferencias') el.innerHTML = window.renderTransferenciasV6();
    else if (passo === 'diagrama-rede') el.innerHTML = window.renderDiagramaRedeV6();
    else if (passo === 'setup' && window.renderSetup) el.innerHTML = window.renderSetup();
    else if (passo === 'levantamento' && VC.editorEspacos) el.innerHTML = VC.editorEspacos.render();
    else if (passo === 'classificacao' && window.renderCaudalEspaco) el.innerHTML = window.renderCaudalEspaco();
    else if (passo === 'requisitos' && VC.requisitos) el.innerHTML = VC.requisitos.render();
    else if (passo === 'terminais' && VC.editorTerminais) el.innerHTML = VC.editorTerminais.render();
    else if (passo === 'associacao' && VC.associacao) el.innerHTML = VC.associacao.renderVisaoGeral();
    else if (passo === 'rede' && VC.editorRamais) el.innerHTML = VC.editorRamais.render();
    else if (passo === 'utas' && VC.editorUtas) el.innerHTML = VC.editorUtas.render();
    else if (passo === 'otimizacao' && window.renderOtimizacao) el.innerHTML = window.renderOtimizacao();
    else if (passo === 'normativa' && window.renderNormativa) el.innerHTML = window.renderNormativa();
    else if (passo === 'diagnostico' && window.renderDiagnostico) el.innerHTML = window.renderDiagnostico();
    else if (passo === 'relatorios' && window.renderRelatoriosAtalho) el.innerHTML = window.renderRelatoriosAtalho();
    else if (passo === 'caderno' && window.renderCaderno) el.innerHTML = window.renderCaderno();
    else if (passo === 'configuracoes' && window.renderConfig) el.innerHTML = window.renderConfig();
    else el.innerHTML = '<div class="vazio"><i class="fa-solid fa-hourglass-half"></i><div class="vazio-titulo">Passo: ' + VC.utils.esc(passo) + '</div></div>';
  } catch (e) { VC.debug.erro(e); el.innerHTML = '<div class="vazio"><i class="fa-solid fa-triangle-exclamation"></i><div class="vazio-titulo">Erro: ' + VC.utils.esc(passo) + '</div><div>' + VC.utils.esc(e.message) + '</div></div>'; }
  if (VC.ui && typeof VC.ui.renderPainelInferior === 'function') VC.ui.renderPainelInferior(passo);
  // v11.1: removida a chamada a VC.ui.atualizarSidebar (função inexistente; nunca corria)
  if (VC.tooltips && typeof VC.tooltips.reinstalar === 'function') {
    setTimeout(() => VC.tooltips.reinstalar(), 10);
  }
};

VC.ui = VC.ui || {};
VC.ui.renderPainelInferior = function (passo) {
  const el = document.getElementById('painelInferior');
  if (!el) return;
  if (VC.flags.painel2x3 === false) { el.innerHTML = ''; return; }
  const ctx = VC.conhecimento.painelContexto[passo] || VC.conhecimento.painelContexto['setup'];
  const mostrarArHumido = ['setup', 'utas', 'relatorios'].indexOf(passo) >= 0;
  const props = VC.fisica.propriedadesArHumido();
  const legendaHTML = VC.glossarioVivo._renderTabela(ctx.legenda || []);
  let formulasHTML = '';
  if (ctx.formulas.length === 0) {
    formulasHTML = '<div style="color:var(--texto-suave);font-style:italic;padding:8px 0;font-size:11px">Nesta aba não há fórmulas aplicáveis.</div>';
  } else {
    ctx.formulas.forEach(f => {
      formulasHTML += '<div class="formula-ativa" style="margin-bottom:12px; background:var(--superf2); padding:8px; border-radius:6px; border-left:3px solid var(--primario)"><div style="font-weight:800; font-size:11.5px; color:var(--primario-esc); margin-bottom:4px">' + f.t + '</div><div style="font-family:\'Cambria Math\', serif; font-size:13px; color:var(--texto); margin-bottom:4px">' + f.e + '</div><div style="font-size:10.5px; color:var(--texto-med); font-style:italic">' + f.d + '</div><div style="font-size:10px; color:var(--texto-suave); margin-top:4px; text-transform:uppercase; font-weight:800">Unidade: ' + f.u + '</div></div>';
    });
  }
  let usoHTML = '';
  ctx.uso.forEach(u => {
    usoHTML += '<li style="margin-bottom:6px; font-size:11.5px"><b style="color:var(--texto)">' + u.b + '</b> <span style="color:var(--texto-med)">' + u.t + '</span></li>';
  });
  let h = '<div class="painel-grid-2x3' + (mostrarArHumido ? '' : ' sem-ar-humido') + '">';
  h += '<div class="bloco-info bloco-1"><div class="bloco-info-cab"><i class="fa-solid fa-lightbulb"></i> Conceito Técnico <span class="bloco-num">1</span></div><div class="bloco-info-corpo"><p style="font-size:12px; line-height:1.6">' + ctx.conceito + '</p></div></div>';
  h += '<div class="bloco-info bloco-2"><div class="bloco-info-cab"><i class="fa-solid fa-diagram-project"></i> Como os dados são usados <span class="bloco-num">2</span></div><div class="bloco-info-corpo"><ul class="uso-dados" style="padding-left:16px; margin:0">' + usoHTML + '</ul></div></div>';
  h += '<div class="bloco-info bloco-3"><div class="bloco-info-cab"><i class="fa-solid fa-book"></i> Legenda de Variáveis <span class="bloco-num">3</span></div><div class="bloco-info-corpo" style="padding:0">' + legendaHTML + '</div></div>';
  h += '<div class="bloco-info bloco-4"><div class="bloco-info-cab"><i class="fa-solid fa-square-root-variable"></i> Equações Aplicadas <span class="bloco-num">4</span></div><div class="bloco-info-corpo">' + formulasHTML + '</div></div>';
  if (mostrarArHumido) {
    h += '<div class="bloco-info bloco-5"><div class="bloco-info-cab"><i class="fa-solid fa-droplet"></i> Propriedades do Ar Húmido <span class="bloco-num">5</span></div><div class="bloco-info-corpo"><div class="ar-humido-grade">';
    h += '<div class="ar-humido-item"><div class="lbl">Altitude</div><div class="val">' + VC.utils.fmt(props.altitude, 0) + '<span class="un">m</span></div></div>';
    h += '<div class="ar-humido-item"><div class="lbl">Temperatura</div><div class="val">' + VC.utils.fmt(props.T, 1) + '<span class="un">°C</span></div></div>';
    h += '<div class="ar-humido-item"><div class="lbl">Humidade</div><div class="val">' + VC.utils.fmt(props.RH, 0) + '<span class="un">%</span></div></div>';
    h += '<div class="ar-humido-item"><div class="lbl">Pressão</div><div class="val">' + VC.utils.fmt(props.p, 0) + '<span class="un">Pa</span></div></div>';
    h += '<div class="ar-humido-item"><div class="lbl">Massa Vol. (ρ)</div><div class="val">' + VC.utils.fmt(props.rho, 4) + '<span class="un">kg/m³</span></div></div>';
    h += '<div class="ar-humido-item"><div class="lbl">Visc. Cin. (ν)</div><div class="val">' + VC.utils.fmtCientifico(props.nu, 3) + '<span class="un">m²/s</span></div></div>';
    h += '</div></div></div>';
  }
  h += '</div>';
  el.innerHTML = h;
};

/* v11.1: removida a chamada a VC6.diagrama._renderSeletorUta (função inexistente) */

console.log('%c[VentCondutas V11.0.0] 06-diagramas carregado · Sankey + Painel 2x3 Contextual', 'color:#6d8fb0;font-weight:bold;background:#eaf1f7;padding:3px 6px;border-radius:3px');

})();
