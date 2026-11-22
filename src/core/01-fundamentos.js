/* ============================================================
   VENTICONDUTAS · 01-fundamentos
   ============================================================ */
(function () {
'use strict';
window.VC = window.VC || {};
window.VC6 = window.VC6 || {};
const VC = window.VC;

/* ── INICIALIZAÇÃO DE NAMESPACES (FIX PARA O 06-DIAGRAMAS) ── */
VC.ui = VC.ui || {};
VC.passos = VC.passos || {};
VC.modos = VC.modos || {};
VC.calculo = VC.calculo || {};
VC.exportacoes = VC.exportacoes || {};

VC.versao = 'VentiCondutas v11.1.0';   // única fonte do número de versão
VC.versaoCurta = (function () {
  const m = String(VC.versao).match(/(\d+\.\d+\.\d+)/);
  return m ? m[1] : '0.0.0';
})();
VC.atualizarVersaoNaUI = function () {
  var v = VC.versao || '';
  if (!v) return;
  if (document.title) {
    var m = document.title.match(/·\s*(.+)$/);
    var sufixo = m ? ' · ' + m[1] : '';
    document.title = v + sufixo;
  }
  var badge = document.getElementById('badgeVersaoTopo');
  if (badge) badge.textContent = v;
  document.querySelectorAll('[data-versao]').forEach(function (el) { el.textContent = v; });
};
VC._boot = VC._boot || { inicio: new Date().toISOString(), partes: [] };
VC._boot.partes.push('01-fundamentos');

VC.dados = VC.dados || {};
VC.flags = Object.assign({
  topologiaFacetada: true,
  moduloBOM: true,
  construtorTopologico: true,
  campoQMedido: true,
  nomenclaturaUnificadaV10: true,
  layoutV2: false,
  layoutV2Estrito: false,
  layoutV2Lente: 'visual'
}, VC.flags || {});

/* ── Regra única de compatibilidade de redes (contrato I5 · auditoria A3) ──
   Decisão do autor: a extração sanitária ("extração suja": casas de banho,
   G4) tem rede e ventilador próprios. Um terminal só se liga a um ramal da
   MESMA rede, e um ramal só pertence a uma UTA da mesma rede. Toda a app
   (Topologia, Associação, planta, verificação) usa estas funções. */
VC.redes = {
  LISTA: [['insuflacao', 'insuflação'], ['extracao', 'extração'], ['extracao_suja', 'extração suja']],
  normalizar(r) { return r || 'insuflacao'; },
  rotulo(r) { const x = this.LISTA.find(l => l[0] === this.normalizar(r)); return x ? x[1] : String(r); },
  ehExtracao(r) { return r === 'extracao' || r === 'extracao_suja'; },
  compativeis(a, b) { return this.normalizar(a) === this.normalizar(b); },
  /* rede da extração de um espaço (o campo ramalRefExtracao é um só): suja se alguma definição ou terminal de extração for suja */
  extracaoDe(esp) {
    if (!esp) return 'extracao';
    if ((esp.definicoes || []).some(d => d.rede === 'extracao_suja')) return 'extracao_suja';
    const T = (typeof VC !== 'undefined' && VC.dados && VC.dados.terminais) || [];
    if (T.some(t => t.rede === 'extracao_suja' && (t.espacos || []).some(x => x.nome === esp.nome || String(x.id) === String(esp.id)))) return 'extracao_suja';
    return 'extracao';
  }
};

VC.utils = {
  fmt(v, d) { d = (d === undefined) ? 0 : d; if (typeof v === 'number' && isFinite(v)) return v.toFixed(d); return '—'; },
  fmtSI(v, d, un) { d = (d === undefined) ? 0 : d; un = un || ''; if (typeof v !== 'number' || !isFinite(v)) return '—'; return v.toFixed(d) + (un ? ' ' + un : ''); },
  fmtCientifico(v, d) { d = (d === undefined) ? 3 : d; if (typeof v !== 'number' || !isFinite(v)) return '—'; return v.toExponential(d); },
  safe(v, fb) { return (typeof v === 'number' && isFinite(v)) ? v : (fb === undefined ? 0 : fb); },
  esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); },
  num(v) { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(n) ? 0 : n; },
  uid(prefixo) { return (prefixo || 'ID') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); },
  clonar(o) {
    if (o === null || typeof o !== 'object') return o;
    if (typeof structuredClone === 'function') { try { return structuredClone(o); } catch (e) { /* objeto não clonável: segue para a cópia JSON */ } }
    return JSON.parse(JSON.stringify(o));
  },
  soma(arr, campo) { return (arr || []).reduce((s, x) => s + (Number(x[campo]) || 0), 0); },
  download(nome, conteudo, mime) {
    const blob = new Blob([conteudo], { type: mime || 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nome;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  downloadJSON(nome, obj) { this.download(nome, JSON.stringify(obj, null, 2), 'application/json'); },
  guardarComEscolha: async function (nomeSugerido, conteudo, mime, extensao) {
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: nomeSugerido,
          types: [{ description: 'Ficheiro VentCondutas', accept: { [mime]: ['.' + extensao] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(conteudo);
        await writable.close();
        return { ok: true, metodo: 'picker' };
      } catch (e) {
        if (e.name === 'AbortError') return { ok: false, cancelado: true };
      }
    }
    this.download(nomeSugerido, conteudo, mime);
    return { ok: true, metodo: 'download' };
  },
  downloadCSV(nome, linhas) {
    const csv = '\ufeff' + linhas.map(r => r.map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(';')).join('\r\n');
    this.download(nome, csv, 'text/csv;charset=utf-8');
  },
  parseZona(zona) {
    const s = String(zona || '').trim();
    if (!s) return { piso: null, ala: null, compartimento: null };
    const out = { piso: null, ala: null, compartimento: null };
    const mPiso = s.match(/piso\s*(\d+)|p(\d+)/i);
    if (mPiso) out.piso = 'P' + (mPiso[1] || mPiso[2]);
    // pisos sem número, com os mesmos códigos da topologia (VC.topologia._pisoDe): Mezanino → MEZ, Átrio → ATRIO
    else if (/mezz?anin|\bmez\b/i.test(s)) out.piso = 'MEZ';
    else if (/[áa]trio/i.test(s)) out.piso = 'ATRIO';
    const mAla = s.match(/norte|sul|este|oeste|centro|nascente|poente/i);
    if (mAla) out.ala = mAla[0].charAt(0).toUpperCase() + mAla[0].slice(1).toLowerCase();
    const mComp = s.match(/-\s*(.+)$/);
    if (mComp && !out.ala) out.compartimento = mComp[1].trim();
    return out;
  },
  hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
    return (h >>> 0).toString(36);
  },
  nomeRamalR(nivel, indice, subIndice) {
    const n = Math.max(1, Math.min(4, Number(nivel) || 1));
    const i = Math.max(1, Number(indice) || 1);
    if (n === 1) return 'R1.' + i;
    if (subIndice != null) return 'R' + n + '.' + i + '.' + subIndice;
    return 'R' + n + '.' + i;
  },
  /* v11.1: rótulo do NÍVEL do ramal (N1–N4). Não usar 'R1…R4': nos nomes dos ramais
     (R1.1, R2.1…) o primeiro número é a REDE/UTA, o que tornava 'R1' ambíguo. */
  nivelRotulo(n, longo) {
    n = Number(n) || 2;
    const nomes = { 1: 'Principal', 2: 'Secundário', 3: 'Terciário', 4: 'Terminal' };
    return 'N' + n + (longo ? ' · ' + (nomes[n] || '') : '');
  },
  nivelTextoParaNumero(nivel) {
    const mapa = { 'primario': 1, 'secundario': 2, 'terciario': 3, 'quaternario': 4, 'r1': 1, 'r2': 2, 'r3': 3, 'r4': 4 };
    return mapa[String(nivel || '').toLowerCase()] || 2;
  },
  numeroParaNivelTexto(n) {
    n = Math.max(1, Math.min(4, Number(n) || 2));
    return ['primario', 'secundario', 'terciario', 'quaternario'][n - 1];
  }
};

VC.ids = {
  novo(prefixo) {
    return (prefixo || 'ID') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  },
  gerarParaEspacos(lista) {
    let max = 0;
    lista.forEach(e => { if (Number(e.id) > max) max = Number(e.id); });
    return max + 1;
  },
  gerarParaTerminais(lista) {
    let max = 0;
    lista.forEach(t => { if (Number(t.id) > max) max = Number(t.id); });
    return max + 1;
  }
};

VC.ids.normalizar = function (dados) {
  if (!dados) return;
  if (dados.espacos) {
    dados.espacos.forEach(e => { if (!e.id) e.id = VC.ids.novo('ESP'); });
  }
  if (dados.terminais) {
    const usados = new Set();
    dados.terminais.forEach(t => {
      if (!t.id || usados.has(String(t.id))) {
        t.id = VC.ids.novo('T');
      }
      usados.add(String(t.id));
    });
  }
};

VC.invariantes = {
  validarEspacos() {
    const ids = new Set();
    for (const e of (VC.dados.espacos || [])) {
      if (ids.has(e.id)) return { ok: false, erro: 'Espaço duplicado: ' + e.id };
      ids.add(e.id);
    }
    return { ok: true };
  },
  validarTerminais() {
    const ids = new Set();
    for (const t of (VC.dados.terminais || [])) {
      if (ids.has(t.id)) return { ok: false, erro: 'Terminal duplicado: ' + t.id };
      ids.add(t.id);
    }
    return { ok: true };
  },
  validarTransferencias() {
    const espacosIds = new Set((VC.dados.espacos || []).map(e => e.id));
    for (const trf of (VC.dados.transferencias || [])) {
      if (trf.deId && !espacosIds.has(trf.deId)) return { ok: false, erro: 'Transferência órfã (origem): ' + trf.id };
      if (trf.paraId && !espacosIds.has(trf.paraId)) return { ok: false, erro: 'Transferência órfã (destino): ' + trf.id };
    }
    return { ok: true };
  },
  validarTudo() {
    const v1 = this.validarEspacos();
    if (!v1.ok) return v1;
    const v2 = this.validarTerminais();
    if (!v2.ok) return v2;
    const v3 = this.validarTransferencias();
    if (!v3.ok) return v3;
    return { ok: true };
  }
};

VC.cores = {
  lerpCor(c1, c2, t) {
    t = Math.max(0, Math.min(1, t));
    const r1 = parseInt(c1.substr(1, 2), 16), g1 = parseInt(c1.substr(3, 2), 16), b1 = parseInt(c1.substr(5, 2), 16);
    const r2 = parseInt(c2.substr(1, 2), 16), g2 = parseInt(c2.substr(3, 2), 16), b2 = parseInt(c2.substr(5, 2), 16);
    const r = Math.round(r1 + (r2 - r1) * t), g = Math.round(g1 + (g2 - g1) * t), b = Math.round(b1 + (b2 - b1) * t);
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  },
  porDp(dp, dpMax) {
    const t = Math.min(1, (dp || 0) / Math.max(dpMax || 1, 1));
    if (t < 0.25) return this.lerpCor('#f0f7f3', '#d1e0d6', t / 0.25);
    if (t < 0.5) return this.lerpCor('#d1e0d6', '#f5ecd4', (t - 0.25) / 0.25);
    if (t < 0.75) return this.lerpCor('#f5ecd4', '#e8d9a8', (t - 0.5) / 0.25);
    return this.lerpCor('#e8d9a8', '#f5dada', (t - 0.75) / 0.25);
  },
  porV(v, vMax) {
    const t = Math.min(1, (v || 0) / Math.max(vMax || 1, 1));
    if (t < 0.33) return this.lerpCor('#a7c3db', '#6d8fb0', t / 0.33);
    if (t < 0.66) return this.lerpCor('#6d8fb0', '#c9a876', (t - 0.33) / 0.33);
    return this.lerpCor('#c9a876', '#c88a8a', (t - 0.66) / 0.34);
  },
  porEstado(estado) {
    const mapa = { ok: '#7fa88b', atencao: '#c9a876', erro: '#c88a8a', pendente: '#94a3b8' };
    return mapa[estado] || '#94a3b8';
  },
  grafico: ['#6d8fb0', '#7fa88b', '#c9a876', '#9488b8', '#c88a8a', '#8eb8b8', '#a7c0d6', '#5f7a9c'],
  nivelR: { 1: '#5f7a9c', 2: '#7fa0c4', 3: '#a7c0d6', 4: '#c8d8e6' },
  balanco: { ok: '#7fa88b', leve: '#c9a876', grave: '#c88a8a', isento: '#94a3b8' },
  transferencia: { grelha_transferencia: '#c9a876', fresta_porta: '#c9a876', grelha_parede: '#c9a876', abertura_natural: '#8eb8b8' },
  solucao: {
    difusor_teto: '#6d8fb0', difusor_parede: '#6d8fb0',
    grelha_insuflacao: '#6d8fb0',
    grelha_transferencia: '#c9a876', fresta_porta: '#c9a876',
    grelha_extracao: '#7fa88b', boca_extracao: '#7fa88b',
    coifa: '#c88a8a'
  }
};

VC.escalas = {
  raioPorQ(Q, Qmax, min, max) {
    min = min == null ? 12 : min; max = max == null ? 42 : max;
    if (!Qmax || Qmax <= 0) return min;
    return min + (max - min) * Math.sqrt(Math.max(0, Q) / Qmax);
  },
  bordaPorV(v, vMax) { if (!vMax || vMax <= 0) return 1; return 1 + 4 * Math.min(1, (v || 0) / vMax); },
  saturPorZeta(zeta, zetaMax) { if (!zetaMax || zetaMax <= 0) return 0.5; return 0.4 + 0.6 * Math.min(1, (zeta || 0) / zetaMax); },
  arestaPorDp(dp, dpMax) { if (!dpMax || dpMax <= 0) return 1.5; return 1 + 9 * Math.pow(Math.min(1, (dp || 0) / dpMax), 0.7); },
  animacaoPorV(v) { if (v < 1) return 'parada'; if (v < 3) return 'lenta'; if (v < 6) return 'rapida'; return 'pulsante'; }
};

VC.arcos = {
  cores: { ok: '#7fa88b', atencao: '#c9a876', erro: '#c88a8a', pendente: '#94a3b8' },
  quadrantes: { ok: { ini: 270, fim: 360 }, atencao: { ini: 0, fim: 90 }, erro: { ini: 90, fim: 180 }, pendente: { ini: 180, fim: 270 } },
  path(quadrante, rOuter, rInner) {
    const q = this.quadrantes[quadrante];
    if (!q) return '';
    const rad1 = (q.ini - 90) * Math.PI / 180, rad2 = (q.fim - 90) * Math.PI / 180;
    const x1o = rOuter * Math.cos(rad1), y1o = rOuter * Math.sin(rad1);
    const x2o = rOuter * Math.cos(rad2), y2o = rOuter * Math.sin(rad2);
    const x1i = rInner * Math.cos(rad2), y1i = rInner * Math.sin(rad2);
    const x2i = rInner * Math.cos(rad1), y2i = rInner * Math.sin(rad1);
    return 'M' + x1o.toFixed(2) + ',' + y1o.toFixed(2) + ' A' + rOuter.toFixed(2) + ',' + rOuter.toFixed(2) + ' 0 0 1 ' + x2o.toFixed(2) + ',' + y2o.toFixed(2) + ' L' + x1i.toFixed(2) + ',' + y1i.toFixed(2) + ' A' + rInner.toFixed(2) + ',' + rInner.toFixed(2) + ' 0 0 0 ' + x2i.toFixed(2) + ',' + y2i.toFixed(2) + ' Z';
  },
  calcularEstado(no) {
    const st = { ok: 0, atencao: 0, erro: 0, pendente: 0 };
    const findings = (no.findings || []);
    if (findings.length) {
      findings.forEach(f => {
        if (f.severidade === 'ERRO' || f.estado === 'ERRO') st.erro++;
        else if (f.severidade === 'ATENÇÃO' || f.estado === 'ATENCAO') st.atencao++;
        else if (f.severidade === 'PENDENTE' || f.estado === 'PENDENTE') st.pendente++;
        else st.ok++;
      });
    } else {
      const s = no.status;
      if (s === 'OK' || s === 'CONFORME') st.ok = 1;
      else if (s === 'ATENÇÃO') st.atencao = 1;
      else if (s === 'NÃO CONF.' || s === 'NÃO CONFORME') st.erro = 1;
      else st.pendente = 1;
    }
    return st;
  }
};

VC.graficos = {
  barrasHorizontais(itens, opts) {
    opts = opts || {};
    if (!itens || !itens.length) return '<div class="vazio" style="padding:20px">Sem dados.</div>';
    const W = opts.width || 620;
    const maxValor = Math.max.apply(null, itens.map(i => Number(i.valor) || 0)) || 1;
    const linhaAlt = opts.linhaAlt || 22;
    const gap = opts.gap || 6;
    const labelW = opts.labelW || 160;
    const valorW = 70;
    const graficoW = W - labelW - valorW - 20;
    const H = itens.length * (linhaAlt + gap) + 20;
    let h = '<svg class="grafico-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">';
    itens.forEach((it, i) => {
      const y = 10 + i * (linhaAlt + gap);
      const w = graficoW * ((Number(it.valor) || 0) / maxValor);
      const cor = it.cor || VC.cores.grafico[i % VC.cores.grafico.length];
      h += '<text x="0" y="' + (y + linhaAlt * 0.7) + '" class="rotulo-eixo" text-anchor="start">' + VC.utils.esc(String(it.nome).substring(0, 24)) + '</text>';
      h += '<rect class="barra" x="' + labelW + '" y="' + y + '" width="' + graficoW + '" height="' + linhaAlt + '" fill="var(--superf3)" rx="3"/>';
      h += '<rect class="barra" x="' + labelW + '" y="' + y + '" width="' + Math.max(2, w).toFixed(1) + '" height="' + linhaAlt + '" fill="' + cor + '" rx="3"/>';
      h += '<text x="' + (W - 4) + '" y="' + (y + linhaAlt * 0.7) + '" class="rotulo-valor" text-anchor="end">' + (it.valorFormatado || VC.utils.fmt(it.valor, opts.decimais == null ? 0 : opts.decimais)) + (opts.unidade ? ' ' + opts.unidade : '') + '</text>';
    });
    h += '</svg>';
    if (opts.titulo) h = '<div class="grafico-titulo"><i class="fa-solid fa-chart-bar"></i> ' + VC.utils.esc(opts.titulo) + (opts.nota ? '<span class="grafico-nota">' + VC.utils.esc(opts.nota) + '</span>' : '') + '</div>' + h;
    return '<div class="grafico-wrap">' + h + '</div>';
  },
  curvas(series, opts) {
    opts = opts || {};
    if (!series || !series.length) return '<div class="vazio" style="padding:20px">Sem dados.</div>';
    const W = opts.width || 620;
    const H = opts.height || 320;
    const ml = 58, mr = 20, mt = 20, mb = 46;
    const pontos = series.flatMap(s => s.pontos || []);
    if (!pontos.length) return '<div class="vazio" style="padding:20px">Sem pontos.</div>';
    const xMin = opts.xMin != null ? opts.xMin : Math.min.apply(null, pontos.map(p => p.x));
    const xMax = opts.xMax != null ? opts.xMax : Math.max.apply(null, pontos.map(p => p.x));
    const yMin = opts.yMin != null ? opts.yMin : 0;
    const yMax = opts.yMax != null ? opts.yMax : Math.max.apply(null, pontos.map(p => p.y));
    const cx = x => ml + (W - ml - mr) * (x - xMin) / Math.max(xMax - xMin, 0.0001);
    const cy = y => H - mb - (H - mt - mb) * (y - yMin) / Math.max(yMax - yMin, 0.0001);
    let h = '<svg class="grafico-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">';
    const nGridY = 5;
    for (let i = 0; i <= nGridY; i++) {
      const y = yMin + (yMax - yMin) * i / nGridY;
      const py = cy(y);
      h += '<line class="gridline" x1="' + ml + '" y1="' + py.toFixed(1) + '" x2="' + (W - mr) + '" y2="' + py.toFixed(1) + '"/>';
      h += '<text x="' + (ml - 6) + '" y="' + (py + 3).toFixed(1) + '" text-anchor="end" class="rotulo-eixo">' + VC.utils.fmt(y, 0) + '</text>';
    }
    const nGridX = 5;
    for (let i = 0; i <= nGridX; i++) {
      const x = xMin + (xMax - xMin) * i / nGridX;
      const px = cx(x);
      h += '<line class="gridline" x1="' + px.toFixed(1) + '" y1="' + mt + '" x2="' + px.toFixed(1) + '" y2="' + (H - mb) + '"/>';
      h += '<text x="' + px.toFixed(1) + '" y="' + (H - mb + 14) + '" text-anchor="middle" class="rotulo-eixo">' + VC.utils.fmt(x, 0) + '</text>';
    }
    h += '<line class="eixo" x1="' + ml + '" y1="' + (H - mb) + '" x2="' + (W - mr) + '" y2="' + (H - mb) + '"/>';
    h += '<line class="eixo" x1="' + ml + '" y1="' + mt + '" x2="' + ml + '" y2="' + (H - mb) + '"/>';
    series.forEach((s, si) => {
      const cor = s.cor || VC.cores.grafico[si % VC.cores.grafico.length];
      const pts = (s.pontos || []).sort((a, b) => a.x - b.x);
      if (pts.length < 2) return;
      const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + cx(p.x).toFixed(1) + ',' + cy(p.y).toFixed(1)).join(' ');
      h += '<path class="linha-serie" d="' + d + '" stroke="' + cor + '"/>';
      pts.forEach(p => { h += '<circle class="ponto-serie" cx="' + cx(p.x).toFixed(1) + '" cy="' + cy(p.y).toFixed(1) + '" r="3" fill="' + cor + '"/>'; });
    });
    h += '</svg>';
    let legend = '';
    if (series.length > 1 || opts.legenda) {
      legend = '<div class="grafico-legend">' + series.map((s, si) => '<div class="grafico-legend-item"><span class="grafico-legend-linha" style="border-top-color:' + (s.cor || VC.cores.grafico[si % VC.cores.grafico.length]) + '"></span>' + VC.utils.esc(s.nome) + '</div>').join('') + '</div>';
    }
    const titulo = opts.titulo ? '<div class="grafico-titulo"><i class="fa-solid fa-chart-line"></i> ' + VC.utils.esc(opts.titulo) + (opts.nota ? '<span class="grafico-nota">' + VC.utils.esc(opts.nota) + '</span>' : '') + '</div>' : '';
    return '<div class="grafico-wrap">' + titulo + h + legend + '</div>';
  },
  barrasVerticais(grupos, series, opts) {
    opts = opts || {};
    if (!grupos || !series || !series.length) return '<div class="vazio" style="padding:20px">Sem dados.</div>';
    const W = opts.width || 620;
    const H = opts.height || 300;
    const ml = 58, mr = 20, mt = 20, mb = 50;
    const todos = series.flatMap(s => s.valores || []);
    const yMax = opts.yMax != null ? opts.yMax : Math.max.apply(null, todos.map(v => Number(v.valor) || 0)) * 1.1 || 1;
    const yMin = 0;
    const cy = y => H - mb - (H - mt - mb) * (y - yMin) / Math.max(yMax - yMin, 0.0001);
    const grupoW = (W - ml - mr) / grupos.length;
    const barraW = Math.min(40, (grupoW - 12) / series.length);
    let h = '<svg class="grafico-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">';
    const nGridY = 5;
    for (let i = 0; i <= nGridY; i++) {
      const y = yMin + (yMax - yMin) * i / nGridY;
      const py = cy(y);
      h += '<line class="gridline" x1="' + ml + '" y1="' + py.toFixed(1) + '" x2="' + (W - mr) + '" y2="' + py.toFixed(1) + '"/>';
      h += '<text x="' + (ml - 6) + '" y="' + (py + 3).toFixed(1) + '" text-anchor="end" class="rotulo-eixo">' + VC.utils.fmt(y, 0) + '</text>';
    }
    h += '<line class="eixo" x1="' + ml + '" y1="' + (H - mb) + '" x2="' + (W - mr) + '" y2="' + (H - mb) + '"/>';
    h += '<line class="eixo" x1="' + ml + '" y1="' + mt + '" x2="' + ml + '" y2="' + (H - mb) + '"/>';
    grupos.forEach((g, gi) => {
      const xGrupo = ml + gi * grupoW;
      const totalBarras = series.length * barraW + (series.length - 1) * 4;
      const inicio = xGrupo + (grupoW - totalBarras) / 2;
      series.forEach((s, si) => {
        const val = s.valores[gi] ? Number(s.valores[gi].valor) || 0 : 0;
        const x = inicio + si * (barraW + 4);
        const y = cy(val);
        const alt = H - mb - y;
        const cor = s.cor || VC.cores.grafico[si % VC.cores.grafico.length];
        h += '<rect class="barra" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + barraW.toFixed(1) + '" height="' + Math.max(0, alt).toFixed(1) + '" fill="' + cor + '" rx="2"/>';
      });
      h += '<text x="' + (xGrupo + grupoW / 2).toFixed(1) + '" y="' + (H - mb + 16) + '" text-anchor="middle" class="rotulo-eixo">' + VC.utils.esc(String(g).substring(0, 14)) + '</text>';
    });
    h += '</svg>';
    let legend = '';
    if (series.length > 1) {
      legend = '<div class="grafico-legend">' + series.map((s, si) => '<div class="grafico-legend-item"><span class="grafico-legend-cor" style="background:' + (s.cor || VC.cores.grafico[si % VC.cores.grafico.length]) + '"></span>' + VC.utils.esc(s.nome) + '</div>').join('') + '</div>';
    }
    const titulo = opts.titulo ? '<div class="grafico-titulo"><i class="fa-solid fa-chart-column"></i> ' + VC.utils.esc(opts.titulo) + (opts.nota ? '<span class="grafico-nota">' + VC.utils.esc(opts.nota) + '</span>' : '') + '</div>' : '';
    return '<div class="grafico-wrap">' + titulo + h + legend + '</div>';
  },
  barras(itens, opts) {
    return this.barrasVerticais(itens.map(i => i.nome), [{ nome: opts && opts.serie ? opts.serie : 'Valor', valores: itens.map(i => ({ label: i.nome, valor: i.valor })) }], opts);
  },
  balancoPorEspaco(balancos, opts) {
    opts = opts || {};
    if (!balancos || !balancos.length) return '<div class="vazio" style="padding:20px">Sem dados.</div>';
    const W = opts.width || 720;
    const linhaAlt = opts.linhaAlt || 24;
    const gap = opts.gap || 4;
    const labelW = opts.labelW || 220;
    const valorW = opts.valorW || 90;
    const graficoW = W - labelW - valorW - 20;
    const centroX = labelW + graficoW / 2;
    const H = balancos.length * (linhaAlt + gap) + 40;
    const maxAbs = Math.max.apply(null, [1].concat(balancos.map(b => Math.abs(Number(b.residuo) || 0))));
    const grupoDe = (b) => {
      try {
        const esp = (VC.dados.espacos || []).find(e => e.id === b.id) || (VC.dados.espacos || []).find(e => e.nome === b.nome);
        if (!esp) return null;
        const def = VC.normas.getDef(esp.tipo);
        return def ? 'G' + def.g : null;
      } catch (e) { return null; }
    };
    let h = '<svg class="grafico-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">';
    h += '<line class="eixo" x1="' + centroX.toFixed(1) + '" y1="10" x2="' + centroX.toFixed(1) + '" y2="' + (H - 20) + '"/>';
    h += '<text x="' + centroX.toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle" class="rotulo-eixo" style="font-weight:800">0</text>';
    balancos.forEach((b, i) => {
      const y = 10 + i * (linhaAlt + gap);
      const residuo = Number(b.residuo) || 0;
      const absR = Math.abs(residuo);
      const larg = (graficoW / 2) * Math.min(1, absR / maxAbs);
      let cor = VC.cores.balanco.ok;
      if (absR > 10) cor = VC.cores.balanco.grave;
      else if (absR > 5) cor = VC.cores.balanco.leve;
      const grupo = grupoDe(b);
      const nomeBase = String(b.nome || '?').substring(0, 28);
      const nomeCompleto = grupo ? nomeBase + ' (' + grupo + ')' : nomeBase;
      h += '<text x="0" y="' + (y + linhaAlt * 0.68).toFixed(1) + '" class="rotulo-eixo" text-anchor="start">' + VC.utils.esc(nomeCompleto) + '</text>';
      if (residuo >= 0) {
        h += '<rect class="barra" x="' + centroX.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + Math.max(1, larg).toFixed(1) + '" height="' + linhaAlt + '" fill="' + cor + '" rx="2"/>';
      } else {
        h += '<rect class="barra" x="' + (centroX - larg).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + Math.max(1, larg).toFixed(1) + '" height="' + linhaAlt + '" fill="' + cor + '" rx="2"/>';
      }
      const sinal = residuo >= 0 ? '+' : '';
      h += '<text x="' + (W - 4) + '" y="' + (y + linhaAlt * 0.68).toFixed(1) + '" class="rotulo-valor" text-anchor="end" style="font-family:ui-monospace,monospace">' + sinal + VC.utils.fmt(residuo, 1) + ' m³/h</text>';
    });
    h += '</svg>';
    const titulo = opts.titulo ? '<div class="grafico-titulo"><i class="fa-solid fa-scale-balanced"></i> ' + VC.utils.esc(opts.titulo) + (opts.nota ? '<span class="grafico-nota">' + VC.utils.esc(opts.nota) + '</span>' : '') + '</div>' : '';
    const legenda = '<div class="grafico-legend">' +
      '<div class="grafico-legend-item"><span class="grafico-legend-cor" style="background:' + VC.cores.balanco.ok + '"></span>OK (|ΔQ| ≤ 5)</div>' +
      '<div class="grafico-legend-item"><span class="grafico-legend-cor" style="background:' + VC.cores.balanco.leve + '"></span>Leve (5 < |ΔQ| ≤ 10)</div>' +
      '<div class="grafico-legend-item"><span class="grafico-legend-cor" style="background:' + VC.cores.balanco.grave + '"></span>Grave (|ΔQ| > 10)</div>' +
      '</div>';
    return '<div class="grafico-wrap">' + titulo + h + legenda + '</div>';
  },
  pressoesPorEspaco(balancos, opts) {
    opts = opts || {};
    if (!balancos || !balancos.length) return '<div class="vazio" style="padding:20px">Sem dados.</div>';
    const itens = balancos.map(b => ({ nome: b.nome, valor: b.pressao_relativa_Pa || 0 })).sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor));
    return this.barrasHorizontais(
      itens.map(i => ({
        nome: i.nome,
        valor: i.valor,
        valorFormatado: (i.valor >= 0 ? '+' : '') + VC.utils.fmt(i.valor, 2) + ' Pa',
        cor: Math.abs(i.valor) <= 5 ? VC.cores.balanco.ok : (Math.abs(i.valor) <= 15 ? VC.cores.balanco.leve : VC.cores.balanco.grave)
      })),
      Object.assign({ titulo: 'Pressão relativa por espaço (Pa)', width: 620, labelW: 200, linhaAlt: 20 }, opts)
    );
  }
};

VC.ui_comp = {
  kpiGrid(itens, colunas) {
    colunas = colunas || 4;
    return '<div style="display:grid;grid-template-columns:repeat(' + colunas + ',1fr);gap:8px;margin-bottom:14px">' +
      itens.map(i => '<div style="background:var(--superf2);border:1px solid var(--borda);border-left:3px solid var(--' + (i.cor || 'primario') + ');border-radius:5px;padding:8px 10px">' +
        '<div style="font-size:9.5px;font-weight:800;color:var(--texto-suave);text-transform:uppercase;letter-spacing:.3px">' + VC.utils.esc(i.l) + '</div>' +
        '<div style="font-size:16px;font-weight:900;color:var(--texto);line-height:1.15;margin-top:3px">' + i.v + (i.u ? ' <span style="font-size:10px;color:var(--texto-suave);font-weight:700">' + VC.utils.esc(i.u) + '</span>' : '') + '</div>' +
      '</div>').join('') + '</div>';
  },
  callout(texto, tipo) {
    const cores = {
      info: 'background:var(--primario-soft);border-left:3px solid var(--primario);color:var(--primario-esc)',
      ok: 'background:var(--verde-soft);border-left:3px solid var(--verde);color:var(--verde-esc)',
      atencao: 'background:var(--ambar-soft);border-left:3px solid var(--ambar);color:var(--ambar-esc)',
      erro: 'background:var(--coral-soft);border-left:3px solid var(--coral);color:var(--coral-esc)'
    };
    return '<div style="' + (cores[tipo] || cores.info) + ';padding:8px 12px;border-radius:var(--raio-2);font-size:11px;line-height:1.5;margin:8px 0">' + texto + '</div>';
  },
  badge(estado, texto) { return '<span class="badge ' + estado + '">' + VC.utils.esc(texto) + '</span>'; }
};

VC.perf = VC.perf || {};

VC.perf.debounce = function (fn, delay) {
  let timer = null;
  return function () {
    const args = arguments, ctx = this;
    clearTimeout(timer);
    timer = setTimeout(() => { try { fn.apply(ctx, args); } catch (e) { VC.debug && VC.debug.erro(e); } }, delay == null ? 120 : delay);
  };
};

VC.perf.throttleRAF = function (fn) {
  let pendente = false, argsUltimos = null, ctxUltimo = null;
  return function () {
    argsUltimos = arguments; ctxUltimo = this;
    if (pendente) return;
    pendente = true;
    requestAnimationFrame(() => {
      try { fn.apply(ctxUltimo, argsUltimos); } catch (e) { VC.debug && VC.debug.erro(e); }
      pendente = false;
    });
  };
};

VC.perf.raf = (function () {
  const fila = []; let agendado = false;
  function flush() { agendado = false; const copia = fila.slice(); fila.length = 0; for (let i = 0; i < copia.length; i++) { try { copia[i](); } catch (e) { VC.debug && VC.debug.erro(e); } } }
  return {
    agendar(fn) { if (typeof fn !== 'function') return; if (fila.indexOf(fn) >= 0) return; fila.push(fn); if (!agendado) { agendado = true; requestAnimationFrame(flush); } }
  };
})();

VC.perf.cache = function (ttlMs) {
  const mapa = new Map(); const TTL = ttlMs == null ? 5000 : ttlMs;
  return {
    get(chave, produtor) {
      const agora = Date.now(); const item = mapa.get(chave);
      if (item && (agora - item.t) < TTL) return item.v;
      const valor = produtor(); mapa.set(chave, { v: valor, t: agora }); return valor;
    },
    limpar(chave) { if (chave == null) mapa.clear(); else mapa.delete(chave); },
    invalidar() { mapa.clear(); }
  };
};

VC.perf.cacheCalculo = VC.perf.cache(500);

VC.perf.cacheFisica = (function () {
  let cacheRho = null, cacheNu = null, chave = null;
  return {
    rhoNu() {
      const p = VC.dados && VC.dados.params ? VC.dados.params : { altitude: 150, temperatura: 22, humidade: 50 };
      const k = p.altitude + '|' + p.temperatura + '|' + p.humidade;
      if (k !== chave) {
        cacheRho = VC.fisica.rho(p.temperatura, p.humidade, p.altitude);
        cacheNu = VC.fisica.nu(p.temperatura, p.humidade, p.altitude);
        chave = k;
      }
      return { rho: cacheRho, nu: cacheNu };
    },
    invalidar() { chave = null; cacheRho = null; cacheNu = null; }
  };
})();

VC.perf.cacheMaterializacao = (function () {
  let ultimoHash = null;
  return {
    precisaMaterializar() {
      const h = (VC.dados && VC.dados.espacos || []).map(e => {
        const defs = (e.definicoes || []).map(d => d.tipo + '|' + d.rede + '|' + d.quantidade + '|' + d.Q_total).join(',');
        return e.id + ':' + defs;
      }).join('#');
      if (h === ultimoHash) return false;
      ultimoHash = h;
      return true;
    },
    invalidar() { ultimoHash = null; }
  };
})();

VC.perf.ordenacaoTopologica = (function () {
  let cacheR = null, chave = null;
  return {
    ordenar() {
      const ramais = VC.dados && VC.dados.ramais || [];
      const k = ramais.map(r => r.nome + '|' + (r.parente || '')).join('#');
      // v11.1: a cache guarda só a ORDEM dos nomes e devolve sempre os objetos atuais
      // (antes devolvia objetos de uma lista de ramais entretanto substituída).
      if (k === chave && cacheR) { const atual = {}; ramais.forEach(r => { atual[r.nome] = r; }); return cacheR.map(n => atual[n]).filter(Boolean); }
      const byName = {};
      ramais.forEach(r => { byName[r.nome] = r; });
      const profundidade = (nome, guard) => {
        guard = guard || 0;
        if (guard > 100) return 0;
        const r = byName[nome];
        if (!r || !r.parente || !byName[r.parente]) return 0;
        return 1 + profundidade(r.parente, guard + 1);
      };
      const ordenados = ramais.slice().sort((a, b) => profundidade(b.nome) - profundidade(a.nome));
      cacheR = ordenados.map(r => r.nome);
      chave = k;
      return ordenados;
    },
    invalidar() { chave = null; cacheR = null; }
  };
})();

VC.perf.cacheBalanco = (function () {
  let ultimoHash = null, ultimoResultado = null;
  return {
    calcular(produtor) {
      const espacos = VC.dados && VC.dados.espacos || [];
      const transferencias = VC.dados && VC.dados.transferencias || [];
      const h = espacos.map(e => e.id + ':' + (e.definicoes || []).map(d => d.rede + d.Q_total).join(',') + ':' + (e.Q_exterior || 0)).join('#')
        + '||' + transferencias.map(t => t.deId + '>' + t.paraId + ':' + t.Q).join(',');
      if (h === ultimoHash && ultimoResultado) return ultimoResultado;
      ultimoResultado = produtor();
      ultimoHash = h;
      return ultimoResultado;
    },
    invalidar() { ultimoHash = null; ultimoResultado = null; }
  };
})();

VC.perf.dirty = {
  _flags: {
    calc: false, sidebar: false, passo: false, grafoCond: false, grafoConc: false,
    painel: false, relatorios: false, arvore: false, balanco: false, transferencias: false, diagrama: false
  },
  marcar(k) { if (k in this._flags) this._flags[k] = true; },
  marcarTudo() { for (const k in this._flags) this._flags[k] = true; },
  verificar(k) { return !!this._flags[k]; },
  limpar(k) { if (k in this._flags) this._flags[k] = false; },
  limparTudo() { for (const k in this._flags) this._flags[k] = false; },
  flush() {
    const modo = VC._modoAtivo || 'condutas';
    const passo = VC._passoAtivo;
    if (this._flags.calc && VC.calculo && VC.calculo.calcularTudo) { VC.calculo.calcularTudo(); this._flags.calc = false; }
    if (this._flags.sidebar && VC.ui && VC.ui.renderSidebar) { VC.ui.renderSidebar(); this._flags.sidebar = false; }
    if (this._flags.passo && modo === 'condutas' && VC.passos && VC.passos.render && passo) { VC.passos.render(passo); this._flags.passo = false; }
    if (this._flags.painel && modo === 'condutas' && VC.ui && VC.ui.renderPainelInferior && passo) { VC.ui.renderPainelInferior(passo); this._flags.painel = false; }
    if (this._flags.balanco && modo === 'condutas' && passo === 'balanco' && VC.passos && VC.passos.render) { VC.passos.render('balanco'); this._flags.balanco = false; }
    if (this._flags.transferencias && modo === 'condutas' && passo === 'transferencias' && VC.passos && VC.passos.render) { VC.passos.render('transferencias'); this._flags.transferencias = false; }
    if (this._flags.grafoCond && modo === 'grafico-condutas' && VC.grafoCondutas && VC.grafoCondutas.render) { VC.grafoCondutas.render(); this._flags.grafoCond = false; }
    if (this._flags.grafoConc && modo === 'grafico-conceitual' && VC.grafoConceitual && VC.grafoConceitual.render) { VC.grafoConceitual.render(); this._flags.grafoConc = false; }
    if (this._flags.diagrama && modo === 'diagrama-rede' && VC6 && VC6.diagrama && VC6.diagrama.render) { VC6.diagrama.render(); this._flags.diagrama = false; }
    if (this._flags.relatorios && modo === 'relatorios' && VC.modoRelatorios && VC.modoRelatorios.render) { VC.modoRelatorios.render(); this._flags.relatorios = false; }
    if (this._flags.arvore && modo === 'arvore' && VC.arvore && VC.arvore.render) { VC.arvore.render(); this._flags.arvore = false; }
    if (modo === 'construtor' && VC.topologia && VC.topologia.construtor && VC.topologia.construtor.render) { VC.topologia.construtor.render(); }
  }
};

VC.debug = {
  _log: [], _limite: 80,
  registar(tipo, msg) {
    this._log.push({ tipo, msg, t: new Date() });
    if (this._log.length > this._limite) this._log.shift();
    this._refrescarUI();
    if (tipo === 'erro') console.error(msg);
    else if (tipo === 'aviso') console.warn(msg);
  },
  erro(e) {
    const msg = (e && e.message) ? e.message : String(e);
    const stack = (e && e.stack) ? e.stack.split('\n')[1] || '' : '';
    this.registar('erro', msg + (stack ? ' · ' + stack.trim() : ''));
  },
  aviso(msg) { this.registar('aviso', msg); },
  info(msg) { this.registar('info', msg); },
  _refrescarUI() {
    const el = document.getElementById('debugPanelCorpo');
    if (!el) return;
    const ult = this._log.slice(-10).reverse();
    el.innerHTML = ult.map(l => {
      const cor = l.tipo === 'erro' ? 'err' : (l.tipo === 'aviso' ? 'warn' : '');
      const hora = l.t.getHours().toString().padStart(2, '0') + ':' + l.t.getMinutes().toString().padStart(2, '0') + ':' + l.t.getSeconds().toString().padStart(2, '0');
      return '<div class="' + cor + '"><b>' + hora + '</b> ' + VC.utils.esc(l.msg) + '</div>';
    }).join('');
  },
  mostrar() { const p = document.getElementById('debugPanel'); if (p) p.classList.add('on'); },
  esconder() { const p = document.getElementById('debugPanel'); if (p) p.classList.remove('on'); }
};

window.addEventListener('error', function (ev) { VC.debug.erro(ev.error || ev.message); });
window.addEventListener('unhandledrejection', function (ev) { VC.debug.erro(ev.reason); });

VC.eventos = VC.eventos || {
  _l: {},
  on(e, f) { (this._l[e] = this._l[e] || []).push(f); },
  emit(e, d) { (this._l[e] || []).forEach(f => { try { f(d); } catch (err) { VC.debug && VC.debug.erro && VC.debug.erro(err); } }); }
};

VC.estado = VC.estado || {};
VC.estado._ultimoHash = null;

VC.estado._hashEstado = function () {
  const partes = [];
  const p = VC.dados && VC.dados.params;
  if (p) partes.push(p.altitude + '|' + p.temperatura + '|' + p.humidade + '|' + p.rugosidade + '|' + (p.categoria || 'II') + '|' + (p.potenciaTermica == null ? '' : p.potenciaTermica) + '|' + (p.poluicaoEdificio || '') + '|' + (p.tExtInverno == null ? '' : p.tExtInverno) + '|' + (p.potenciaRejeitada == null ? '' : p.potenciaRejeitada) + '|' + (p.integracaoGT ? 1 : 0));
  partes.push(VC.dados && VC.dados.tipologia || '');
  partes.push(VC.dados && VC.dados.restricaoH || 0);
  partes.push(VC.dados && VC.dados.eficaciaRemocao || 1);
  // v11.1 (E1): opções que mudam o cálculo e não forçavam o recálculo
  partes.push((VC.dados && VC.dados.serieDiametros) || 'S1');
  partes.push((VC.dados && VC.dados.metodoCalculo && VC.dados.metodoCalculo.metodo) || 'loss');
  partes.push((VC.dados && VC.dados.filtros && VC.dados.filtros.modo) || 'sujo');
  partes.push((VC.dados && VC.dados.metodoCalculo && VC.dados.metodoCalculo.diametroUnico) ? 'D1' : 'Dt');   // Fase 2A
  const espacos = (VC.dados && VC.dados.espacos) || [];
  partes.push('E' + espacos.length);
  partes.push(espacos.map(e =>
    e.id + '|' + e.nome + '|' + e.tipo + '|' + (e.grupoForcado || 'auto') +
    '|' + (e.zona || '') + '|' + ((e.localizacao && e.localizacao.piso) || '') + '|' + ((e.localizacao && e.localizacao.ala) || '') +   // zona/piso: a associação automática e a topologia dependem deles
    '|' + (e.A || 0) + '|' + (e.H || 0) + '|' + (e.V || 0) + '|' + (e.N || 0) +
    '|' + (e.rphAplicado || 0) + '|' + (e.rphOrigem || 'norma') + '|' + (e.eficaciaRemocao == null ? '' : e.eficaciaRemocao) + '|' + (e.pressurizada ? JSON.stringify([e.deltaP, e.vPortaAberta, e.camaraCortaFogo, e.forcaPorta]) : '') + '|' + (e.desenfumagem || '') + (e.fumoExigido ? 'X' : '') + (e.up || '') + JSON.stringify((e.planta && e.planta.fumo) || '') +
    '|' + (e.QAI_projeto || 0) + '|' + (e.QAI_projeto_rede || 'auto') + '|' + (e.QAI_projeto_motivo || '') + '|' + (e.QAI_projeto_origem || 'norma') + '|' + (e.Q_exterior || 0) +
    '|' + ((e.definicoes || []).map(d => d.tipo + ':' + d.rede + ':' + d.quantidade + ':' + d.Q_total).join(','))
  ).join('#'));
  const ramais = (VC.dados && VC.dados.ramais) || [];
  partes.push('R' + ramais.length);
  partes.push(ramais.map(r =>
    r.id + '|' + r.nome + '|' + (r.parente || '') + '|' + (r.L || 0) + '|' + (r.zeta || 0) +
    '|' + (r.utaRef || '') + '|' + ((r.lock && r.lock.D) ? '1' : '0') + '|' + ((r.geometriaInput && r.geometriaInput.forma) || 'circular')   // v11.1: forma da secção
    + '|' + ((r.geometriaInput && r.geometriaInput.material) || '') + '|' + ((r.geometriaInput && r.geometriaInput.rugosidade) || '') + '|' + ((r.geometriaInput && r.geometriaInput.H_max) || '') + '|' + JSON.stringify((r.geometriaInput && r.geometriaInput.proprio) || {})   // v11.1 (E1) · v11.2: valores próprios
    + '|' + (r.sPai == null ? '' : r.sPai) + '|' + (r.planta ? r.planta.pisoId + ':' + JSON.stringify(r.planta.pts || []) : '')   // Fase 2A: posição no pai e traçado
    + '|' + JSON.stringify(r.especificacao || {}) + '|' + JSON.stringify(r.trocosFix || {}) + '|' + JSON.stringify(r.reducoes || {}) + '|' + (r.lock && r.lock.D ? r.Dcom : '')   // Fase 2 do desenho: especificação, Ø fixos e reduções
    + '|' + JSON.stringify(r.acessorios || []) + '|' + JSON.stringify(r.prumada || '')   // Fase 4: acessórios e prumada (posição da derivação)
  ).join('#'));
  const terminais = (VC.dados && VC.dados.terminais) || [];
  partes.push('Tm' + terminais.length);
  partes.push(terminais.map(t =>
    t.id + '|' + (t.ramalRef || '') + '|' + (t.Q_medido == null ? '' : t.Q_medido) + '|' + (t.sRamal == null ? '' : t.sRamal) + '|' + (t.planta ? t.planta.pisoId + ':' + t.planta.x + ',' + t.planta.y + ':' + (t.planta.dir || '') + ':' + (t.planta.vias || '') + ':' + (t.planta.comp || '') : '') + '|' + (t.tipo || '') + '|' + (t.v_saida || '') +   // Fase 2A · 5B: direção, vias, comprimento, tipo e v
    '|' + ((t.espacos || []).map(e => e.nome + ':' + e.Q_parcela).join(','))
  ).join('#'));
  const trf = (VC.dados && VC.dados.transferencias) || [];
  partes.push('T' + trf.length);
  partes.push(trf.map(t => t.deId + '>' + t.paraId + ':' + t.Q).join(','));
  const utas = (VC.dados && VC.dados.utas) || [];
  partes.push('U' + utas.length);
  partes.push(utas.map(u =>
    u.id + '|' + u.rede + '|' + (u.eta || 0) + '|' + (u.etaRec || 0) + '|' + (u.fs || 0) +
    '|' + (u.transmissao || 1) + '|' + (u.ativo === false ? '0' : '1') + '|' + (u.curvaFabricante ? (u.curvaFabricante.fabricante + '/' + u.curvaFabricante.modelo) : '') +
    '|' + (u.tipoUV || '') + '|' + (u.recuperadorAtivo === false ? '0' : '1')   // v11.1: tipo Ecodesign
    + '|' + (u.uvbPar || '') + '|' + (u.freeCooling ? 'fc' : '') + (u.tudoAr === false ? 'nta' : '') + '|' + (u.controloCaudal || '') + '|' + (u.componentes || []).map(c => (c.tipo || '') + ':' + c.deltaP + ':' + c.deltaP_final).join(',')   // Fase 3: par da UVB e componentes
    + '|' + JSON.stringify(u.exterior || '') + JSON.stringify(u.planta || '') + '|' + (u.recirculacao || '')   // Fase 3B: tomada / rejeição e posição (L da ligação)
  ).join('#'));
  partes.push((VC.flags && VC.flags.confortoTermico !== false) ? '1' : '0');
  partes.push((VC.flags && VC.flags.qaiProjeto !== false) ? '1' : '0');
  partes.push(VC._passoAtivo || 'setup');
  partes.push(VC._modoAtivo || 'condutas');
  return VC.utils.hash(partes.join('::'));
};

VC.estado.sincronizar = function (opcoes) {
  try { return VC.estado._sincronizar(opcoes); }
  finally {   // v11.1 (4.4): facetas da topologia depois de cada sincronização (antes um invólucro em 09-topologia)
    if (VC.flags && VC.flags.topologiaFacetada && VC.topologia && VC.topologia.facetas) {
      try { VC.topologia.facetas.aplicarATodos(); }
      catch (e) { VC.debug && VC.debug.erro && VC.debug.erro(e); }
    }
  }
};
VC.estado._sincronizar = function (opcoes) {
  opcoes = opcoes || {};
  if (!opcoes.force) {
    try {
      const hashAtual = VC.estado._hashEstado();
      if (hashAtual === VC.estado._ultimoHash) { return; }
      VC.estado._ultimoHash = hashAtual;
    } catch (e) {
      VC.estado._ultimoHash = null;
    }
  }
  VC.perf.cacheCalculo.invalidar();
  VC.perf.cacheFisica.invalidar();
  VC.perf.ordenacaoTopologica.invalidar();
  VC.perf.cacheBalanco.invalidar();
  if (opcoes.decompor && VC.decompor) VC.decompor.limpar();
  if (VC.eventos) VC.eventos.emit('calculo:inicio');
  try {
    if (VC.calculo && VC.calculo.calcularTudo) VC.calculo.calcularTudo();
    if (VC6 && VC6.balanco && VC6.balanco.propagar) VC6.balanco.propagar();
    if (opcoes.decompor && VC.decompor) VC.decompor.executar(true);
    if (VC.eventos) VC.eventos.emit('calculo:fim', VC.calculo ? VC.calculo.ultimo : null);
    VC.perf.dirty.marcarTudo();
    VC.perf.raf.agendar(() => VC.perf.dirty.flush());
  } catch (e) { VC.debug.erro(e); if (VC.eventos) VC.eventos.emit('calculo:fim', null); }
};

VC.estado.forcarSync = function (opcoes) {
  VC.estado._ultimoHash = null;
  VC.estado.sincronizar(Object.assign({}, opcoes || {}, { force: true }));
};

VC.estado.set = function (caminho, valor) {
  const partes = String(caminho).split('.');
  let obj = VC.dados;
  for (let i = 0; i < partes.length - 1; i++) { if (obj[partes[i]] == null) obj[partes[i]] = {}; obj = obj[partes[i]]; }
  obj[partes[partes.length - 1]] = valor;
  VC.estado._ultimoHash = null;
  VC.perf.dirty.marcarTudo();
};

VC.constantes = {
  // v11.1: velocidade máxima por nível do ramal (m/s): N1 principal · N2 secundário · N3 terciário · N4 terminal.
  // Usada no dimensionamento e na auditoria (antes: 6 m/s fixo só na auditoria).
  VMAX_NIVEL: { 1: 6.0, 2: 5.0, 3: 4.0, 4: 3.0 },
  // v11.1 (4.7): valores de projeto num só sítio.
  R_ALVO: 1.0,                 // Pa/m · perda de carga linear alvo no método de perda constante (prática ASHRAE/CIBSE)
  // Fase 2A · perdas localizadas nas derivações ao longo de um ramal (valores típicos, editáveis):
  //   passagem direta do tê: ζ = TE_PASSAGEM · (1 − v_jusante / v_montante)², referido a v_montante (Idelchik, tê divergente;
  //     na extração, tê convergente, usa-se a mesma expressão como aproximação conservadora);
  //   redução cónica (insuflação, fluxo para a secção menor): ζ = REDUCAO.contracao, referido a v na secção menor;
  //   ampliação cónica (extração, fluxo para a secção maior): ζ = REDUCAO.expansao · (1 − A_menor / A_maior)², referido a v na secção menor.
  ZETA_DERIVACAO: { TE_PASSAGEM: 0.4, REDUCAO: { contracao: 0.05, expansao: 0.3 } },
  TERMINAL: { vAtencao: 2.2, vMax: 2.5, LwAtencao: 35, LwMax: 40, dpAtencao: 60, expoenteLw: 50 },   // m/s no colo · dB(A) · critério de conforto (VDI 2081) · Fase 4: Δp > 60 Pa = atenção (boa prática); sem catálogo, Lw cresce com 50·log(Q/Q0) num tamanho fixo
  FUMO: { EFETIVO_RISCO_B: 500, ENTERRADO_EFETIVO: 200, ENTERRADO_AREA: 400, CANTAO_AREA: 1600, CANTAO_DIM: 60,
    ATIVA_POR_100M2: 1, ATIVA_MIN: 1.5, ATIVA_M2_POR_BOCA: 320, ADMISSAO_FRACAO: 0.6, ADMISSAO_V_MAX: 5,
    ATIVA_POR_UP: 0.5, ATIVA_DIST: 15, PASSIVA_POR_UP: 0.10, PASSIVA_DIST: 10, PASSIVA_ALCANCE_H: 7, PASSIVA_ALCANCE_MAX: 30 },
  /* Fase 5B · alcance (throw) L0,25 dos terminais de insuflação sem catálogo: jato livre v(x) = K·v0·√A0 / x
     (ASHRAE Fundamentals, cap. Space Air Diffusion; EN ISO 5219 / EN 12238 para o ensaio). K típico por tipo; vt = 0,25 m/s.
     Vias: jatos por terminal (difusor de teto 4, linear 1 ou 2, grelha e jato 1). Bom: 0,5 a 1,0 da distância à parede. */
  ALCANCE: { VT: 0.25, K: { 'Difusor': 1.2, 'Grelha Insuflação': 5.0, 'Difusor Linear': 3.5, 'Jato de Ar': 6.2 }, VIAS: { 'Difusor': 4, 'Grelha Insuflação': 1, 'Difusor Linear': 2, 'Jato de Ar': 1 }, CURTO: 0.5, LONGO: 1.0 },
  CD_TRANSFERENCIA: 0.61,       // Fase 4 · coeficiente de descarga de grelhas / frestas de transferência (orifício de arestas vivas)
  BALANCO_ESPACO: { sub: 0.90, sobre: 1.20 },                          // Q servido / Q necessário · tolerância da app
  MINIMO_LEGAL_ARREDONDAMENTO: 0.5,   // m³/h · folga de arredondamento ao m³/h na comparação servido ≥ mínimo legal (Fase 2)
  /* Fase 3B · tomadas de ar exterior (ODA) e rejeições (EHA) — EN 13779:2007, Anexo A.2 (retomado pela EN 16798-3):
     tomada não protegida a ≤ 2 m/s; rejeição na fachada com ≤ 0,5 m³/s por abertura e ≥ 5 m/s; rejeição a ≥ 2 m de uma
     tomada na mesma fachada; tomadas a ≥ 8 m de fontes poluidoras (ar sujo EHA 3/4: garagem, cozinha, IS → sai acima da cobertura). */
  EXTERIOR: {
    V_TOMADA_MAX: 2.0, V_REJEICAO_MIN: 5.0, Q_REJEICAO_FACHADA_MAX: 0.5, DIST_MIN: 2.0, DIST_MIN_SUJO: 8.0,
    ZETA_LIGACAO: 0.8,   // ligação equipamento ↔ grelha: uma curva + entrada no equipamento (referido à v na conduta)
    TIPOS: {
      grelha: { nome: 'grelha de fachada com rede', zeta: 1.5, livre: 0.6 },
      persiana: { nome: 'persiana anti-chuva', zeta: 2.5, livre: 0.45 },
      cobertura: { nome: 'saída / entrada na cobertura (chapéu)', zeta: 1.0, livre: 0.9 }
    }
  },
  /* Fase 4B · acessórios nas condutas: ζ típico (referido à velocidade do troço onde estão) ou o Δp do catálogo.
     Flexível: a perda linear do troço vezes fatorR no seu comprimento (corrugado). Curvas pela planta: ζ90 · ângulo/90. */
  ACESSORIOS: {
    registo: { nome: 'Registo de regulação', zeta: 0.3, nota: 'Aberto, lâminas opostas.' },
    cortafogo: { nome: 'Registo corta-fogo', zeta: 0.6, nota: 'EN 15650 · classe EI do compartimento (EN 1366-2).' },
    silenciador: { nome: 'Silenciador', zeta: 1.2, L: 1.0, nota: 'Use o Δp do catálogo para o caudal.' },
    flexivel: { nome: 'Conduta flexível', zeta: 0, L: 1.0, fatorR: 2.0, nota: 'Comprimento curto e esticado (≤ 1,5 m).' }
  },
  ZETA_CURVA_90: 0.25, ZETA_SAIDA_PAI: 0.3,
  /* Fase 3B · perdas térmicas pelas paredes das condutas (isolamento): U = 1/(1/hi + e/λ + 1/he) */
  TERMICA: { LAMBDA: 0.035, HI: 20, HE: 8, T_AR: 16, T_ENV: 26, HR_ENV: 60, CP: 1005, MARGEM_ORVALHO: 0.5 },
  V_ABERTURA_EXTERIOR: 2.0,    // m/s · velocidade de referência numa grelha de admissão natural para o exterior (dimensiona a área livre)
  BALANCO_RESIDUO: 5,          // m³/h · resíduo aceite no balanço de massa de um espaço (2× = desequilíbrio grave)
  EQUILIBRIO_REDE: 0.20,       // desvio máximo de Δp entre ramais após otimização (20 %)
  DL101D: { SGTC: 290000, SGT: 100000, INSPECAO: 70000 },             // W · DL 101-D/2020 (gestão técnica e inspeção)
  // Fase 5 · Portaria 138-I/2021, Anexo II: recuperação de energia (2.3 c), free-cooling (2.3 b), caudal variável (1.5 b), gestão técnica (1.5 c)
  P138_SISTEMAS: { REJEICAO_RECUPERACAO_W: 80000, ETA_RECUPERACAO_MIN: 0.5, FREE_COOLING_M3H: 10000, CAUDAL_VARIAVEL_W: 100000, GT_AR_NOVO_M3H: 3000 },
  // Fase 5 · escadas pressurizadas: RT-SCIE art. 161.º (velocidade na porta aberta) e EN 12101-13 (força de abertura)
  ESCADAS: { vPortaSemCamara: 0.5, vPortaComCamara: 1.0, forcaPortaMax: 100 },
  // materiais de conduta e rugosidade absoluta de referência (mm) · ASHRAE Handbook Fundamentals, cap. 21 (valores médios)
  MATERIAIS_CONDUTA: [
    { nome: 'Aço galvanizado', rugosidade: 0.15 },
    { nome: 'Aço inoxidável', rugosidade: 0.05 },
    { nome: 'Alumínio', rugosidade: 0.05 },
    { nome: 'PVC / plástico', rugosidade: 0.01 },
    { nome: 'Painel isolante (lã mineral, fibra)', rugosidade: 0.9 },
    { nome: 'Conduta flexível (esticada)', rugosidade: 3.0 }
  ],
  /* Tipos de sistema (designação do projeto de AVAC; em Portugal as siglas são da legenda de cada projeto,
     não há norma que as fixe). redes: as redes que o equipamento serve; a primeira é a de omissão.
     par: unidade de duplo fluxo (insuflação + extração, sem recirculação) — na app são duas UTAs em par UVB. */
  TIPOS_SISTEMA: [
    { codigo: 'VMC', nome: 'VMC · ventilação mecânica com recuperação (duplo fluxo)', redes: ['insuflacao', 'extracao'], tipoUV: 'BVU_HRS', par: true },
    { codigo: 'VCM', nome: 'VCM · ventilação controlada mecânica (duplo fluxo, sem recirculação)', redes: ['insuflacao', 'extracao', 'extracao_suja'], tipoUV: 'BVU_HRS', par: true },
    { codigo: 'VAN', nome: 'VAN · ventilador de ar novo (capta ar exterior e insufla)', redes: ['insuflacao'], tipoUV: 'UVU_FILTER' },
    { codigo: 'VIN', nome: 'VIN · ventilador de insuflação', redes: ['insuflacao'], tipoUV: 'UVU_FILTER' },
    { codigo: 'VEG', nome: 'VEG · ventilador de extração geral', redes: ['extracao'], tipoUV: 'UVU_SEM_FILTER' },
    { codigo: 'VEX', nome: 'VEX · ventilador de extração dedicada (garagem, cozinha)', redes: ['extracao_suja', 'extracao'], tipoUV: 'UVU_SEM_FILTER' },
    { codigo: 'VEIS', nome: 'VEIS · ventilador de extração das instalações sanitárias', redes: ['extracao_suja'], tipoUV: 'UVU_SEM_FILTER' }
  ],
  /* Cores das redes no desenho: as da EN 16798-3 (antiga EN 13779) e EN 12792 para os tipos de ar —
     ar exterior ODA verde, insuflação SUP azul, extração ETA amarelo, rejeição EHA castanho, transferência TRA cinzento.
     A norma não separa a extração de ar sujo: fica num amarelo mais escuro (mesma família ETA).
     O utilizador pode mudá-las (VC.dados.params.paletaRedes). */
  PALETA_REDES: { SUP: '#2f6fb5', ETA: '#c9a000', ETA_SUJO: '#8f7400', ODA: '#2e8b3e', EHA: '#7a4a24', TRA: '#7b8494' },
  GARAGEM_UT2_AREA_MIN: 200,   // m² · parque de estacionamento (UT II) só a partir de 200 m² de área bruta (ANEPC, Nota Técnica 01/2021)
  COMM_S1: [63, 80, 100, 125, 160, 200, 250, 315, 355, 400, 450, 500, 560, 630, 710, 800, 900, 1000, 1120, 1250, 1400, 1600, 1800, 2000],
  COMM_S2: [100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000],
  W1505: [100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000, 1200, 1400, 1600, 1800, 2000],
  H1505: [100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000]
};

VC.regulamento = {
  versao: 'V10',
  pais: 'PT',
  metodoLegal: 'P138',
  metodoReferencia: 'EN 16798',
  versaoNormas: VC.conhecimento.versaoNormas,
  isencoesArNovo: VC.conhecimento.isencoesArNovo,
  hierarquia: VC.conhecimento.hierarquia,
  principiosBalanco: VC.conhecimento.principiosBalanco,
  tiposTransferencia: VC.conhecimento.tiposTransferencia
};

VC.tiposEspaco = VC.conhecimento.tiposEspaco;
VC.tiposEspacoLista = Object.keys(VC.tiposEspaco);

VC.fisica = {
  isa(alt) {
    const T0 = 288.15, p0 = 101325, g = 9.80665, R = 287.058, L = 0.0065;
    return { p: p0 * Math.pow(1 - (L * alt) / T0, g / (R * L)), T: T0 - L * alt };
  },
  pressao(alt) { return this.isa(alt).p; },
  pSat(T) { return 611.21 * Math.exp((18.678 - T / 234.5) * (T / (257.14 + T))); },
  rho(T, RH, alt) {
    const p = this.isa(alt).p;
    const pv = (RH / 100) * this.pSat(T);
    return (p - pv) / (287.058 * (T + 273.15)) + pv / (461.495 * (T + 273.15));
  },
  mu(T) { const Ta = T + 273.15; return 1.716e-5 * Math.pow(Ta / 273.15, 1.5) * (273.15 + 110.4) / (Ta + 110.4); },
  nu(T, RH, alt) { return this.mu(T) / this.rho(T, RH, alt); },
  cp() { return 1.006; },
  zonaRe(Re) { if (Re < 2300) return 'Laminar'; if (Re < 4000) return 'Crítica ⚠'; return 'Turbulenta'; },
  fatorAtrito(Re, rel) {
    if (Re <= 0) return 0;
    if (Re < 2300) return 64 / Re;
    rel = rel || 0;
    const inv = -1.8 * Math.log10(Math.pow(rel / 3.7, 1.11) + 6.9 / Re);
    let f = 1 / (inv * inv);
    for (let i = 0; i < 30; i++) {
      const val = -2.0 * Math.log10((rel / 3.7) + (2.51 / (Re * Math.sqrt(f))));
      const fn = 1 / (val * val);
      if (Math.abs(fn - f) < 1e-9) { f = fn; break; }
      f = fn;
    }
    return f;
  },
  reZone(Re) { return this.zonaRe(Re); },
  friction(Re, rel) { return this.fatorAtrito(Re, rel); },
  pressure(alt) { return this.pressao(alt); },
  propriedadesArHumido() {
    const p = VC.dados && VC.dados.params ? VC.dados.params : { altitude: 150, temperatura: 22, humidade: 50 };
    const alt = p.altitude, T = p.temperatura, RH = p.humidade;
    const isa = this.isa(alt);
    const pSatVal = this.pSat(T);
    const pv = (RH / 100) * pSatVal;
    const rho = this.rho(T, RH, alt);
    const mu = this.mu(T);
    const nu = this.nu(T, RH, alt);
    return { altitude: alt, T: T, RH: RH, p: isa.p, T_isa: isa.T - 273.15, pSat: pSatVal, pv: pv, rho: rho, mu: mu, nu: nu, cp: this.cp() };
  }
};

VC.normas = {
  getDef(tipo) {
    // v11.1: categoria escolhida no Setup (antes estava fixa em 'II').
    // Valores EN 16798-1 (Anexo B): q por pessoa e q por m² para edifício pouco poluente.
    // A categoria é usada só para COMPARAÇÃO (Q_EN16798); o caudal de projeto segue a Portaria 138-I.
    // Fase 4: q_p e q_B da EN 16798-1 por categoria e por nível de poluição do edifício (Setup); a norma não os dá por tipo de espaço.
    const P = (VC.dados && VC.dados.params) || {};
    const cat = ['I', 'II', 'III', 'IV'].indexOf(P.categoria) >= 0 ? P.categoria : 'II';
    const EN = VC.conhecimento.tabelas.EN16798_1;
    const pol = EN.qB[P.poluicaoEdificio] ? P.poluicaoEdificio : 'pouco';
    const brp = EN.qp[cat], bra = EN.qB[pol][cat];
    const d = VC.conhecimento.tiposEspaco[tipo] || { g: 1, gn: 'Ocupação Permanente', rp: brp, ra: bra, t11: 24, t12: 3, ach: 6, desc: 'Fallback' };
    let rp = d.rp, ra = d.ra;
    if (d.g === 1) { rp = brp; ra = bra; }
    return { g: d.g, gn: d.gn, rp, ra, t11: d.t11, t12: d.t12, ach: d.ach, desc: d.desc, semArCedido: !!d.semArCedido, t13: !!d.t13, semT12: !!d.semT12 };   // semArCedido: Portaria 138-I, Anexo II, 1.2.2 f)
  },
  // v11.1: limites do Reg. (UE) 1253/2014 (Ecodesign) por tipo de unidade de ventilação.
  // qnom em m³/s; etaRec = eficiência térmica do recuperador (0–1).
  // classe 1–3 = ≤ 50 % / ≤ 75 % / ≤ 100 % do limite (escala interna da app); 4 = acima do limite.
  classificarSFP(uvType, sfpInt, qnom, etaRec, fCorrecao) {
    const lim = VC.conhecimento.tabelas.SFPint;
    const tipo = (VC.conhecimento.tabelas.SFP_TIPOS || {})[uvType] ? uvType : 'BVU_HRS';
    const QnomNum = Math.max(0, Number(qnom) || 0);
    const eta = Number(etaRec) || 0;
    const F = Math.max(0, Number(fCorrecao) || 0);   // Fase 3: correção dos filtros (0 = configuração de referência completa)
    const ref = 'Reg. (UE) 1253/2014 (Ecodesign)';
    let limite = null, nota, bonusE = 0, etaOK = true;
    if (tipo === 'UVU_FILTER') {
      limite = lim.UVU_FILTER;
      nota = ref + ': UVU com filtro, limite fixo.';
    } else if (tipo === 'UVU_SEM_FILTER') {
      nota = ref + ': UVU sem filtro não tem limite de SFPint (só requisitos do ventilador).';
    } else {
      const rac = tipo === 'BVU_RAC';
      const etaRef = rac ? lim.BVU_RAC_ETA_REF : lim.BVU_ETA_REF, etaMin = rac ? lim.BVU_RAC_ETA_MIN : lim.BVU_ETA_MIN;
      const base = rac ? lim.BVU_RAC_BASE : lim.BVU_BASE, basePeq = rac ? lim.BVU_RAC_BASE_PEQ : lim.BVU_BASE_PEQ;
      bonusE = eta > etaRef ? (eta - etaRef) * 3000 : 0;
      limite = (QnomNum < 2 ? basePeq + bonusE - 300 * QnomNum / 2 : base + bonusE) - F;
      etaOK = eta >= etaMin;
      nota = ref + ': UVB com ' + (rac ? 'recuperador de circuito (run-around)' : 'recuperador') + ', qnom ' + QnomNum.toFixed(2) + ' m³/s, bónus E ' + Math.round(bonusE) + ', correção dos filtros F = ' + Math.round(F) + (F ? '' : ' (filtros da configuração de referência)') + '.'
        + (etaOK ? '' : ' η recuperador ' + Math.round(eta * 100) + ' % < ' + Math.round(etaMin * 100) + ' % exigido.');
    }
    let classe = null;
    if (limite != null) {
      limite = Math.round(limite);
      classe = 4;
      if (sfpInt <= limite * 0.5) classe = 1;
      else if (sfpInt <= limite * 0.75) classe = 2;
      else if (sfpInt <= limite) classe = 3;
    }
    return {
      tipo, classe, sfpInt, limite,
      limiteBase: limite,
      qnom: QnomNum,
      bonusE: Math.round(bonusE),
      F,
      etaOK,
      conservador: false,
      nota,
      conforme: (classe == null || classe <= 3) && etaOK
    };
  },
  // v11.2: tipologia do edifício. Só 'comercio' (Portaria 138-I) está implementada; as outras estão em implementação.
  TIPOLOGIAS_EM_IMPLEMENTACAO: ['residencial', 'saude', 'industria'],
  tipologiaAtual() {
    const t = VC.dados && VC.dados.tipologia;
    return ['comercio', 'residencial', 'saude', 'industria'].indexOf(t) >= 0 ? t : 'comercio';   // 'publico' e vazio (projetos antigos) = comércio e serviços
  },
  rotuloTipologia(t) { return ({ comercio: 'Comércio e Serviços', residencial: 'Residencial', saude: 'Saúde', industria: 'Indústria' })[t] || t; },
  // Tipo Ecodesign por omissão de uma UTA, quando o utilizador não o escolheu.
  // Fase 5 · potência térmica rejeitada no ar de extração (Portaria 138-I, 2.3 c): a escrita no Setup ou, sem ela,
  // ρ·cp·Q_extração·(T_interior − T_exterior de projeto de inverno). null = por definir.
  potenciaRejeitadaW() {
    const p = (VC.dados && VC.dados.params) || {};
    if (p.potenciaRejeitada !== undefined && p.potenciaRejeitada !== null && p.potenciaRejeitada !== '' && isFinite(Number(p.potenciaRejeitada))) return Number(p.potenciaRejeitada) * 1000;
    if (p.tExtInverno === undefined || p.tExtInverno === null || p.tExtInverno === '' || !isFinite(Number(p.tExtInverno))) return null;
    const rho = VC.fisica.rho(p.temperatura, p.humidade, p.altitude), dT = Math.max(0, (Number(p.temperatura) || 20) - Number(p.tExtInverno));
    const Qext = (VC.dados.utas || []).filter(u => u.ativo !== false && VC.redes.ehExtracao(u.rede)).reduce((s, u) => s + (Number(u.Q) || 0), 0);
    return rho * VC.fisica.cp() * 1000 * Qext * dT;
  },
  potenciaTermicaW() {
    const p = VC.dados && VC.dados.params, kW = p ? p.potenciaTermica : null;
    return (kW === null || kW === undefined || kW === '' || !isFinite(Number(kW))) ? null : Number(kW) * 1000;
  },
  tipoUVPadrao(u) {
    if (!u) return 'BVU_HRS';
    if (u.tipoUV && (VC.conhecimento.tabelas.SFP_TIPOS || {})[u.tipoUV]) return u.tipoUV;
    if (u.rede === 'extracao_suja') return 'UVU_SEM_FILTER';
    if (u.recuperadorAtivo !== false) return 'BVU_HRS';
    return (u.componentes || []).some(c => /filtro/i.test(c.tipo || '')) ? 'UVU_FILTER' : 'UVU_SEM_FILTER';
  },
  // Fase 3: categoria SFP da EN 16798-3 (ventilador completo: potência elétrica / caudal)
  categoriaSFP(sfp) {
    const t = VC.conhecimento.tabelas.SFP_CATEGORIAS || [];
    const v = Number(sfp);
    if (!isFinite(v) || v < 0) return null;
    const c = t.find(x => v <= x.max);
    return c ? c.cat : null;
  },
  // Fase 3: correção F do Ecodesign a partir dos filtros de cada lado (fino na insuflação, médio na extração)
  _classeFiltro(c) {
    const s = String((c && (c.tipo || c.nome)) || '');
    if (!/filtro|filter/i.test(s)) return null;
    if (/\bF[7-9]\b|ePM\s*1\b|ePM1\b|\bE1[0-2]\b|\bH1[0-4]\b|HEPA/i.test(s)) return 'fino';
    if (/\bM[56]\b|\bF[56]\b|ePM\s*10\b|ePM10\b|ePM\s*2[,.]5|ePM2[,.]5/i.test(s)) return 'medio';
    return 'grosso';
  },
  correcaoFiltrosF(componentesIns, componentesExt) {
    const F = VC.conhecimento.tabelas.SFPint.F;
    const cls = l => (l || []).map(c => this._classeFiltro(c)).filter(Boolean);
    const fino = componentesIns == null ? true : cls(componentesIns).indexOf('fino') >= 0;
    const medio = componentesExt == null ? true : cls(componentesExt).some(k => k === 'medio' || k === 'fino');
    return fino && medio ? F.completo : (fino ? F.semMedio : (medio ? F.semFino : F.nenhum));
  },
  dl101D(potenciaW) {
    // Fase 3: a potência é a TÉRMICA nominal global (aquecimento ou arrefecimento), não a dos ventiladores.
    // null / vazio = por definir.
    if (potenciaW === null || potenciaW === undefined || potenciaW === '' || !isFinite(Number(potenciaW))) {
      return { potencia: null, porDefinir: true, sgtc: false, sgt: false, nivelGestao: null, inspecaoObrigatoria: false, bacsObrigatorio: false, descricao: 'Potência térmica nominal global por definir (Setup)' };
    }
    const P = Math.max(0, Number(potenciaW) || 0);
    const SGTC_LIMIAR = VC.constantes.DL101D.SGTC;
    const SGT_LIMIAR  = VC.constantes.DL101D.SGT;
    const INSPECAO_LIMIAR = VC.constantes.DL101D.INSPECAO;
    let nivelGestao = null;
    if (P >= SGTC_LIMIAR) nivelGestao = 'SGTC';
    else if (P >= SGT_LIMIAR) nivelGestao = 'SGT';
    const descricao = nivelGestao === 'SGTC'
      ? 'SGTC obrigatório (P ≥ 290 kW)'
      : (nivelGestao === 'SGT'
        ? 'SGT obrigatório (100 kW ≤ P < 290 kW)'
        : (P > INSPECAO_LIMIAR
          ? 'Sem requisito SGT/SGTC (P < 100 kW) · inspeção periódica obrigatória (P > 70 kW)'
          : 'Sem requisito SGT/SGTC (P < 100 kW)'));
    // potência térmica do Setup em kW → W (usado pela app inteira: quadro legal, caderno, avisos)
    return {
      potencia: P,
      sgtc: P >= SGTC_LIMIAR,
      sgt: P >= SGT_LIMIAR && P < SGTC_LIMIAR,
      nivelGestao,
      inspecaoObrigatoria: P > INSPECAO_LIMIAR,
      bacsObrigatorio: P >= SGTC_LIMIAR,
      descricao
    };
  },
  calcExtracaoSanitaria(esp) {
    const A = Number(esp.A) || 0;
    // Tabela 13 (Portaria 138-I): 4 linhas. O balneário é uma instalação pública (normal por omissão, ou intensiva),
    // e contam urinóis + sanitas + duches. Projetos antigos: «balneario» → pública normal.
    const T = VC.conhecimento.tabelas.T13.sanitarios;
    const pedido = esp.regimeSanitario === 'balneario' ? 'publico_normal' : esp.regimeSanitario;
    const regime = esp.tipo === 'Balneários'
      ? ((T[pedido] && T[pedido].publico) ? pedido : 'publico_normal')
      : (T[pedido] ? pedido : 'privado_continuo');
    const nAp = (Number(esp.numUrinois) || 0) + (Number(esp.numSanitas) || 0) + (Number(esp.numDuches) || 0);
    const cfg = T[regime] || T.privado_continuo;
    const q = Math.max(cfg.base, cfg.porAparelho * nAp, cfg.porArea * A, cfg.min);
    const metodo = 'P138 Tabela 13 · ' + (cfg.nome || regime.replace(/_/g, ' '));
    return { qExtracao: q, metodo, nAparelhos: nAp, regime };
  },
  limitesPressao(tipo) {
    const lim = VC.conhecimento.tabelas.pressaoLimites;
    return lim[tipo] || lim.default;
  },
  /* Fase 6B · controlo de fumo por desenfumagem (RT-SCIE, Portaria 1532/2008 alterada pela Portaria 135/2020):
       art. 135.º n.º 1 — exigido em locais de risco B com efetivo > 500 (al. e) e em pisos enterrados com > 200 pessoas ou > 400 m² (al. d);
       art. 152.º — cantões acima de 1600 m² ou de 60 m de dimensão;
       art. 153.º (passiva) — admissão entre ½ e 1 × a área de evacuação; qualquer ponto a ≤ 7 × pé-direito (máx. 30 m) de uma abertura;
       art. 154.º n.º 2 (ativa) — 1 boca de extração por 320 m², 1 m³/s por 100 m² (mínimo 1,5 m³/s); art. 145.º — admissão ≈ 60 % e < 5 m/s;
       art. 156.º/157.º (vias horizontais) — passiva ≤ 10 m entre aberturas (7 m não retilíneas), ≥ 0,10 m² por UP;
       ativa ≤ 15 m (10 m), ≥ 0,5 m³/s por UP. */
  desenfumagem(esp) {
    const F = VC.constantes.FUMO, A = Number(esp.A) || 0, N = Number(esp.N) || 0, H = Number(esp.H) || 0;
    const circ = /circula|corredor/i.test(String(esp.tipo || '') + ' ' + String(esp.nome || ''));
    const piso = (VC.dados.plantas || []).find(p => esp.planta && p.id === esp.planta.pisoId);
    const enterrado = !!(piso && piso.cota != null && Number(piso.cota) < 0);
    const motivos = [];
    if (N > F.EFETIVO_RISCO_B) motivos.push('efetivo ' + N + ' > ' + F.EFETIVO_RISCO_B + ' (local de risco B, art. 135.º, n.º 1, e)');
    if (enterrado && (N > F.ENTERRADO_EFETIVO || A > F.ENTERRADO_AREA)) motivos.push('piso enterrado com ' + (N > F.ENTERRADO_EFETIVO ? N + ' pessoas' : A + ' m²') + ' (art. 135.º, n.º 1, d)');
    if (esp.fumoExigido) motivos.push('marcado no projeto (via de evacuação enclausurada, câmara, etc.)');
    const metodo = esp.desenfumagem || '';
    const out = { exigido: motivos.length > 0, motivos, metodo, circ, A, H, falhas: [], porFazer: [], norma: 'RT-SCIE (Portaria 1532/2008, alt. 135/2020)' };
    if (A > F.CANTAO_AREA) out.falhas.push('área ' + VC.utils.fmt(A, 0) + ' m² > ' + F.CANTAO_AREA + ' m²: divida em cantões (art. 152.º)');
    if (out.exigido && !metodo) out.porFazer.push('escolher desenfumagem passiva ou ativa');
    if (metodo === 'ativa') {
      if (circ) { const up = Math.max(1, Number(esp.up) || 1); out.Qext = F.ATIVA_POR_UP * up; out.espMax = F.ATIVA_DIST; out.base = up + ' UP × ' + F.ATIVA_POR_UP + ' m³/s (art. 157.º, n.º 3)'; }
      else { out.Qext = Math.max(F.ATIVA_MIN, A / 100 * F.ATIVA_POR_100M2); out.bocas = Math.max(1, Math.ceil(A / F.ATIVA_M2_POR_BOCA)); out.base = 'máx(1,5; ' + VC.utils.fmt(A, 0) + '/100) m³/s · 1 boca por 320 m² (art. 154.º, n.º 2)'; }
      out.Qadm = out.Qext * F.ADMISSAO_FRACAO;
      out.Aadm = out.Qadm / F.ADMISSAO_V_MAX;   // m² de admissão para v < 5 m/s (art. 145.º)
    } else if (metodo === 'passiva') {
      if (H > 12) out.falhas.push('desenfumagem passiva não é permitida com mais de 12 m de altura (RT-SCIE, métodos de controlo de fumo)');
      if (circ) { const up = Math.max(1, Number(esp.up) || 1); out.Asaida = F.PASSIVA_POR_UP * up; out.espMax = F.PASSIVA_DIST; out.base = up + ' UP × ' + F.PASSIVA_POR_UP + ' m² por abertura (art. 156.º, n.º 4)'; }
      else { out.alcance = Math.min(F.PASSIVA_ALCANCE_MAX, F.PASSIVA_ALCANCE_H * (H || 3)); out.base = 'qualquer ponto a ≤ ' + VC.utils.fmt(out.alcance, 1) + ' m de uma abertura de evacuação (7 × pé-direito, máx. 30 m; art. 153.º, n.º 3); admissão entre ½ e 1 × a evacuação (n.º 2)'; }
    }
    return out;
  },
  verificarEscadaPressurizada(esp) {
    if (esp.tipo !== 'Escadas') return { ok: true, motivo: 'Não aplicável' };
    // RT-SCIE (Portaria 1532/2008), art. 161.º: entre 20 e 80 Pa face aos espaços adjacentes, com as portas fechadas
    const deltaP = Number(esp.deltaP) || 0;
    const lim = VC.conhecimento.tabelas.pressaoLimites.Escadas, E = VC.constantes.ESCADAS;
    const falhas = [];
    if (!(deltaP >= lim.min && deltaP <= lim.max)) falhas.push('ΔP = ' + deltaP + ' Pa fora de ' + lim.min + '–' + lim.max + ' Pa (RT-SCIE, art. 161.º, n.º 1)');
    // Fase 5: velocidade na porta aberta (art. 161.º, n.º 5) e força de abertura da porta (EN 12101-13)
    const vMin = esp.camaraCortaFogo ? E.vPortaComCamara : E.vPortaSemCamara;
    const temV = esp.vPortaAberta !== undefined && esp.vPortaAberta !== null && esp.vPortaAberta !== '';
    if (temV && Number(esp.vPortaAberta) < vMin) falhas.push('v na porta aberta ' + esp.vPortaAberta + ' m/s < ' + vMin + ' m/s (RT-SCIE, art. 161.º, n.º 5' + (esp.camaraCortaFogo ? ', com câmara corta-fogo' : '') + ')');
    const temF = esp.forcaPorta !== undefined && esp.forcaPorta !== null && esp.forcaPorta !== '';
    if (temF && Number(esp.forcaPorta) > E.forcaPortaMax) falhas.push('força de abertura da porta ' + esp.forcaPorta + ' N > ' + E.forcaPortaMax + ' N (EN 12101-13)');
    const porFazer = [];
    if (!temV) porFazer.push('velocidade na porta aberta');
    if (!temF) porFazer.push('força de abertura da porta');
    return { ok: falhas.length === 0, deltaP, minimo: lim.min, maximo: lim.max, vMin, falhas, porFazer, norma: 'RT-SCIE, Portaria 1532/2008, art. 161.º' };
  }
};

VC6.fisica = {
  isa: function (alt) { return VC.fisica.isa(alt); },
  pSat: function (T) { return VC.fisica.pSat(T); },
  rho: function (T, RH, alt) { return VC.fisica.rho(T, RH, alt); },
  mu: function (T) { return VC.fisica.mu(T); },
  nu: function (T, RH, alt) { return VC.fisica.nu(T, RH, alt); },
  fatorAtrito: function (Re, rel) { return VC.fisica.fatorAtrito(Re, rel); },
  zonaRe: function (Re) { return VC.fisica.zonaRe(Re); },
  propriedadesArHumido: function () { return VC.fisica.propriedadesArHumido(); }
};

VC6.tiposEspaco = VC.tiposEspaco;
VC6.normas = {
  getDef: function (tipo) { return VC.normas.getDef(tipo); },
  calcExtracaoSanitaria: function (esp) { return VC.normas.calcExtracaoSanitaria(esp); },
  classificarSFP: function (uvType, sfpInt, qnom, etaRec) { return VC.normas.classificarSFP(uvType, sfpInt, qnom, etaRec); },
  dl101D: function (potenciaW) { return VC.normas.dl101D(potenciaW); },
  limitesPressao: function (tipo) { return VC.normas.limitesPressao(tipo); },
  verificarEscadaPressurizada: function (esp) { return VC.normas.verificarEscadaPressurizada(esp); },
  isencoesArNovo: VC.regulamento.isencoesArNovo,
  P138: {
    Escritório: { g: 1, T11: 24, T12: 3, ACH: 6 },
    Circulação: { g: 2, T11: 24, T12: 0, ACH: 0 },
    Sanitários: { g: 4, T11: 0, T12: 0, ACH: 0 },
    Cozinha: { g: 4, T11: 0, T12: 0, ACH: 12 }
  },
  SFP_LIMITES: VC.conhecimento.tabelas.SFPint,
  BACS_LIMIAR: VC.conhecimento.tabelas.BACS_LIMIAR,
  ETA_REC_MIN: VC.conhecimento.tabelas.ETA_REC_MIN
};

console.log('%c[VentiCondutas] 01-fundamentos carregado · utils + perf + debug + estado (hash) + dirty (partial) + constantes + física + normas + Camadas 1-3', 'color:#6d8fb0;font-weight:bold;background:#eaf1f7;padding:3px 6px;border-radius:3px');

})();