/* ============================================================
   VentiCondutas v11.3 · Planta para a rede (PR 3)
   ------------------------------------------------------------
   Acrescenta à planta (18-planta.js):
   · Terminais: "Distribuir" coloca os terminais de cada sala dentro do
     desenho; depois arrastam-se. Avisa se um terminal fica numa sala que
     não serve.
   · Transferências: arrastar de uma sala para outra cria a transferência,
     com o caudal sugerido pelo balanço do destino; as existentes
     aparecem como setas.
   · Corrigir um desenho: com a sala selecionada, arrastar os cantos.
   · Planta em PDF: lê a página escolhida (pdf.js, carregado só quando é preciso).
   · Vista Planta também em Terminais, Balanço e Transferências.
   · Plantas na Entrega: salas por grupo com o caudal, terminais e setas.
   Posições: terminal.planta = { pisoId, x, y } (píxeis da imagem).
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('19-planta-rede');
const P = VC.planta;
if (!P) return;
const esc = s => VC.utils.esc(s);
const fmt = (n, d) => VC.utils.fmt(n, d == null ? 0 : d);
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';

P.FERRAMENTAS.push(['trf', 'fa-right-left', 'Transferência']);
P.DICAS.sel = 'Clique numa sala para a selecionar; arraste os cantos da sala selecionada para corrigir o desenho. Os terminais (I, E) também se arrastam.';
P.DICAS.trf = 'Arraste de uma sala para outra (por exemplo, do corredor para a casa de banho). O caudal sugerido equilibra o destino.';
P.pendenteTrf = null;

/* ── geometria ───────────────────────────── */
P.dentro = function ([x, y], pts) {   // ponto dentro do polígono (raio horizontal)
  let d = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) d = !d;
  }
  return d;
};
/* o ponto dentro da sala mais perto de q (procura numa grelha de 24×24 sobre a sala) */
P.pontoDentro = function (q, pts) {
  if (this.dentro(q, pts)) return q;
  const xs = pts.map(a => a[0]), ys = pts.map(a => a[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  let melhor = null, d = Infinity;
  for (let i = 0; i <= 24; i++) for (let j = 0; j <= 24; j++) {
    const c = [x0 + (x1 - x0) * (i + 0.5) / 25, y0 + (y1 - y0) * (j + 0.5) / 25];
    if (!this.dentro(c, pts)) continue;
    const dd = (c[0] - q[0]) ** 2 + (c[1] - q[1]) ** 2;
    if (dd < d) { d = dd; melhor = c; }
  }
  return melhor || q;
};
P.salaEm = function (q, piso) { return this.espacosDoPiso(piso || this.pisoAtual()).find(e => this.dentro(q, e.planta.pts)) || null; };
P.terminaisDe = function (e) { return (VC.dados.terminais || []).filter(t => (t.espacos || []).some(x => String(x.id) === String(e.id) || x.nome === e.nome)); };
P._letra = t => (t.rede === 'insuflacao' ? 'I' : 'E');
P._corTerm = t => (t.rede === 'insuflacao' ? '#4f6d8c' : (t.rede === 'extracao_suja' ? '#a14b4b' : '#3f7a52'));

/* coloca os terminais de um espaço numa grelha dentro do desenho (insuflação em cima, extração em baixo) */
P.distribuir = function (e, todos) {
  const p = this.pisoAtual(); if (!e || !e.planta || !p) return 0;
  const pts = e.planta.pts, xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  let n = 0;
  [['insuflacao', 0.16], ['outra', 0.86]]   /* junto às paredes: o nome da sala fica livre no centro */.forEach(([rede, fy]) => {
    const lista = this.terminaisDe(e).filter(t => (rede === 'insuflacao') === (t.rede === 'insuflacao')).filter(t => todos || !(t.planta && t.planta.pisoId === p.id));
    lista.forEach((t, i) => {
      let q = [x0 + (x1 - x0) * (i + 1) / (lista.length + 1), y0 + (y1 - y0) * fy];
      q = this.pontoDentro(q, pts);   // numa sala em L o ponto previsto (e até o centro) pode cair fora
      t.planta = { pisoId: p.id, x: Math.round(q[0] * 10) / 10, y: Math.round(q[1] * 10) / 10 };
      n++;
    });
  });
  return n;
};
P.distribuirTodos = function () {
  if (this._bloqueado()) return;
  const p = this.pisoAtual(); let n = 0;
  this.espacosDoPiso(p).forEach(e => { n += this.distribuir(e, false); });
  if (VC.historico && VC.historico.push) VC.historico.push('terminais distribuídos na planta');
  VC.ui.toast(n ? n + ' terminais colocados nas salas de ' + p.nome + '. Arraste para ajustar.' : 'Todos os terminais das salas desenhadas já estão na planta.');
  this.redesenhar();
};
P.redistribuir = function (idEsp) {
  const e = (VC.dados.espacos || []).find(x => String(x.id) === String(idEsp)); if (!e || this._bloqueado()) return;
  const n = this.distribuir(e, true); VC.ui.toast(n + ' terminais recolocados em «' + e.nome + '».'); this.redesenhar();
};

/* ── transferências ──────────────────────── */
P._sugerirQ = function (deId, paraId) {
  const B = (VC6.balanco && VC6.balanco.todos ? VC6.balanco.todos() : []);
  const r = id => { const b = B.find(x => String(x.id) === String(id)); return b ? Number(b.residuo) || 0 : 0; };
  const falta = -r(paraId), sobra = r(deId);   // resíduo = entra − sai
  if (falta > 0 && sobra > 0) return Math.round(Math.min(falta, sobra));
  if (falta > 0) return Math.round(falta);
  return sobra > 0 ? Math.round(sobra) : 0;
};
P.criarTransferencia = function (Q, tipo, dp) {
  const t = this.pendenteTrf; if (!t || this._bloqueado()) return;
  Q = VC.utils.num(Q); dp = VC.utils.num(dp) || 2;
  if (!(Q > 0)) { VC.ui.toast('Escreva o caudal a transferir (m³/h).'); return; }
  const r = VC6.transferencias.criar(Number(t.deId), Number(t.paraId), Q, tipo || 'grelha_transferencia');
  if (!r || !r.ok) { VC.ui.toast((r && r.erro) || 'Não foi possível criar a transferência.'); return; }
  r.transferencia.dP_Pa = dp;
  if (VC6.transferencias.dimensionarArea) r.transferencia.area_cm2 = VC6.transferencias.dimensionarArea(Q, dp);
  this.pendenteTrf = null;
  if (VC.historico && VC.historico.push) VC.historico.push('transferência na planta');
  VC.estado.forcarSync();
  VC.ui.toast('Transferência ' + r.transferencia.deNome + ' → ' + r.transferencia.paraNome + ': ' + fmt(Q) + ' m³/h, ' + fmt(r.transferencia.area_cm2) + ' cm².');
  this.redesenhar();
};
const cancelarBase = P.cancelar;
P.cancelar = function () { this.pendenteTrf = null; return cancelarBase.apply(this, arguments); };
const setFerrBase = P.setFerramenta;
P.setFerramenta = function () { this.pendenteTrf = null; return setFerrBase.apply(this, arguments); };

/* ── desenho: setas, terminais e cantos ──── */
const svgBase = P._svg;
P._svg = function (p) {
  const s = svgBase.call(this, p), z = this.zoom || 1;
  let x = '<defs><marker id="plantaSeta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#9a6a12"/></marker></defs>';
  const salas = this.espacosDoPiso(p), porId = {}; salas.forEach(e => { porId[e.id] = e; });
  (VC.dados.transferencias || []).forEach(t => {
    const a = porId[t.deId], b = porId[t.paraId]; if (!a || !b) return;
    const [ax, ay] = this.centro(a.planta.pts), [bx, by] = this.centro(b.planta.pts);
    const k = 0.22, x1 = ax + (bx - ax) * k, y1 = ay + (by - ay) * k, x2 = bx - (bx - ax) * k, y2 = by - (by - ay) * k;
    x += '<g class="planta-trf"><line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#9a6a12" stroke-width="3" vector-effect="non-scaling-stroke" marker-end="url(#plantaSeta)"/>'
      + '<text x="' + (x1 + x2) / 2 + '" y="' + ((y1 + y2) / 2 - 6 / z) + '" font-size="' + 12 / z + '" text-anchor="middle" font-weight="700" fill="#7a5a1e">' + fmt(t.Q) + ' m³/h</text></g>';
  });
  (VC.dados.terminais || []).forEach(t => {
    if (!t.planta || t.planta.pisoId !== p.id) return;
    const r = 10 / z, c = this._corTerm(t);
    x += '<g class="planta-term" data-t="' + esc(t.id) + '"><title>' + esc(t.nome || t.id) + ' · ' + esc(t.tipo || '') + ' · ' + fmt(t.Q) + ' m³/h</title><circle cx="' + t.planta.x + '" cy="' + t.planta.y + '" r="' + r + '" fill="' + c + '" stroke="#fff" stroke-width="2" vector-effect="non-scaling-stroke"/>'
      + '<text x="' + t.planta.x + '" y="' + (t.planta.y + 4 / z) + '" font-size="' + 11 / z + '" text-anchor="middle" font-weight="800" fill="#fff">' + this._letra(t) + '</text></g>';
  });
  const sel = this.ferramenta === 'sel' && salas.find(e => String(e.id) === String(this.selecionado));
  if (sel) x += sel.planta.pts.map((q, i) => '<circle class="planta-vert" data-i="' + i + '" cx="' + q[0] + '" cy="' + q[1] + '" r="' + 7 / z + '" fill="#fff" stroke="#4f6d8c" stroke-width="2.5" vector-effect="non-scaling-stroke"/>').join('');
  x += '<line id="plantaTrfLinha" x1="0" y1="0" x2="0" y2="0" stroke="#9a6a12" stroke-width="3" stroke-dasharray="6 4" vector-effect="non-scaling-stroke" marker-end="url(#plantaSeta)" visibility="hidden"/>';
  return s.replace(/<\/svg>$/, x + '</svg>');
};

/* ── painel: transferência pendente e terminais da sala ── */
const painelBase = P._painel;
P._painel = function (p) {
  let h = painelBase.call(this, p);
  if (this.pendenteTrf) {
    const de = VC.dados.espacos.find(e => String(e.id) === String(this.pendenteTrf.deId)), para = VC.dados.espacos.find(e => String(e.id) === String(this.pendenteTrf.paraId));
    const Q = this._sugerirQ(this.pendenteTrf.deId, this.pendenteTrf.paraId);
    h = '<div class="planta-card destaque"><div class="planta-card-t">Nova transferência</div><p><b>' + esc(de && de.nome) + '</b> → <b>' + esc(para && para.nome) + '</b></p>'
      + '<label for="plantaTrfQ">Caudal (m³/h)</label><input id="plantaTrfQ" type="number" min="0" step="1" value="' + (Q || '') + '"' + (Q ? '' : ' placeholder="caudal"') + '>'
      + (Q ? '<p class="planta-meta">Sugerido pelo balanço: o que falta no destino.</p>' : '<p class="planta-meta">O balanço não pede caudal entre estas salas; escreva o valor.</p>')
      + '<label for="plantaTrfTipo">Tipo</label><select id="plantaTrfTipo"><option value="grelha_transferencia">Grelha de transferência</option><option value="fresta_porta">Fresta sob porta</option><option value="abertura_natural">Abertura natural</option></select>'
      + '<label for="plantaTrfDp">ΔP (Pa)</label><input id="plantaTrfDp" type="number" min="0.5" step="0.5" value="2">'
      + '<div class="planta-acoes"><button class="btn primario" onclick="VC.planta.criarTransferencia(document.getElementById(\'plantaTrfQ\').value, document.getElementById(\'plantaTrfTipo\').value, document.getElementById(\'plantaTrfDp\').value)">Criar transferência</button><button class="btn" onclick="VC.planta.cancelar()">Cancelar</button></div></div>' + h;
  }
  const e = !this.pendente && !this.pendenteTrf && (VC.dados.espacos || []).find(x => String(x.id) === String(this.selecionado));
  if (e && e.planta) {
    const T = this.terminaisDe(e), fora = T.filter(t => !(t.planta && t.planta.pisoId === p.id));
    const bloco = '<div class="planta-card"><div class="planta-card-t">Terminais de ' + esc(e.nome) + ' (' + T.length + ')</div>'
      + (T.length ? '<div class="planta-terms">' + T.map(t => '<span class="planta-tchip" style="border-color:' + this._corTerm(t) + '"><b style="background:' + this._corTerm(t) + '">' + this._letra(t) + '</b>' + esc(t.nome || t.id) + ' · ' + fmt(t.Q) + ' m³/h' + (t.planta && t.planta.pisoId === p.id ? '' : ' · <i>por colocar</i>') + '</span>').join('') + '</div>' : '<p class="planta-meta">Sem terminais. Os terminais vêm do passo Terminais.</p>')
      + (T.length ? '<div class="planta-acoes"><button class="btn" onclick="VC.planta.redistribuir(' + e.id + ')">' + (fora.length ? 'Colocar na sala' : 'Recolocar na sala') + '</button></div>' : '') + '</div>';
    h = h.replace('<div class="planta-lista-t">', bloco + '<div class="planta-lista-t">');
  }
  return h.replace('<div class="planta-acoes planta-rodape">', '<div class="planta-acoes planta-rodape"><button class="btn btn-mini primario" onclick="VC.planta.distribuirTodos()">Distribuir terminais</button>');
};

/* ── interação: cantos, terminais e setas ── */
const ligarBase = P.ligar;
P.ligar = function () {
  ligarBase.apply(this, arguments);
  const svg = document.getElementById('plantaSVG'); if (!svg) return;
  let arr = null;
  svg.addEventListener('pointerdown', ev => {
    if (ev.button !== 0) return;
    const vert = ev.target.closest('.planta-vert'), term = ev.target.closest('.planta-term');
    if (this.ferramenta === 'sel' && (vert || term)) {
      if (this._bloqueado()) return;
      arr = vert ? { tipo: 'vert', i: Number(vert.dataset.i), el: vert } : { tipo: 'term', id: term.dataset.t, el: term };
    } else if (this.ferramenta === 'trf') {
      const q = this._ponto(ev), de = this.salaEm(q);
      if (!de) { VC.ui.toast('Comece dentro de uma sala desenhada.'); ev.stopImmediatePropagation(); return; }
      arr = { tipo: 'trf', de, q0: this.centro(de.planta.pts) };
    } else return;
    ev.stopImmediatePropagation(); ev.preventDefault();
    try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* captura opcional */ }
  }, true);
  svg.addEventListener('pointermove', ev => {
    if (!arr) return;
    const q = this._ponto(ev);
    if (arr.tipo === 'vert') {
      const e = VC.dados.espacos.find(x => String(x.id) === String(this.selecionado)); if (!e) return;
      e.planta.pts[arr.i] = [Math.round(q[0] * 10) / 10, Math.round(q[1] * 10) / 10]; arr.mudou = true;
      arr.el.setAttribute('cx', q[0]); arr.el.setAttribute('cy', q[1]);
      const pol = svg.querySelector('.planta-sala[data-esp="' + e.id + '"] polygon'); if (pol) pol.setAttribute('points', e.planta.pts.map(a => a.join(',')).join(' '));
    } else if (arr.tipo === 'term') {
      arr.q = q; arr.el.querySelector('circle').setAttribute('cx', q[0]); arr.el.querySelector('circle').setAttribute('cy', q[1]);
      const tx = arr.el.querySelector('text'); tx.setAttribute('x', q[0]); tx.setAttribute('y', q[1] + 4 / (this.zoom || 1));
    } else if (arr.tipo === 'trf') {
      const l = document.getElementById('plantaTrfLinha');
      if (l) { l.setAttribute('x1', arr.q0[0]); l.setAttribute('y1', arr.q0[1]); l.setAttribute('x2', q[0]); l.setAttribute('y2', q[1]); l.setAttribute('visibility', 'visible'); }
    }
  }, true);
  svg.addEventListener('pointerup', ev => {
    if (!arr) return;
    const a = arr; arr = null; ev.stopImmediatePropagation();
    const q = this._ponto(ev), p = this.pisoAtual();
    if (a.tipo === 'vert') { if (a.mudou && VC.historico && VC.historico.push) VC.historico.push('desenho corrigido'); this.redesenhar(); return; }
    if (a.tipo === 'term') {
      const t = (VC.dados.terminais || []).find(x => String(x.id) === String(a.id));
      if (t && a.q) {
        t.planta = { pisoId: p.id, x: Math.round(a.q[0] * 10) / 10, y: Math.round(a.q[1] * 10) / 10 };
        const sala = this.salaEm(a.q);
        const serve = sala && (t.espacos || []).some(x => String(x.id) === String(sala.id) || x.nome === sala.nome);
        if (sala && !serve) VC.ui.toast('Atenção: «' + (t.nome || t.id) + '» serve ' + (t.espacos || []).map(x => x.nome).join(', ') + ', não «' + sala.nome + '».');
        if (VC.historico && VC.historico.push) VC.historico.push('terminal movido');
      }
      this.redesenhar(); return;
    }
    if (a.tipo === 'trf') {
      const para = this.salaEm(q);
      if (!para || String(para.id) === String(a.de.id)) { VC.ui.toast('Largue dentro de outra sala desenhada.'); this.redesenhar(); return; }
      this.pendenteTrf = { deId: a.de.id, paraId: para.id }; this.selecionado = null; this.redesenhar();
    }
  }, true);
};

/* ── PDF (pdf.js só é carregado quando um PDF é escolhido) ── */
P.escolherImagem = function () {
  if (this._bloqueado()) return;
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/png,image/jpeg,application/pdf';
  inp.onchange = e => { const f = e.target.files && e.target.files[0]; if (f) this.lerImagem(f); };
  inp.click();
};
const lerBase = P.lerImagem;
P.lerImagem = function (f) { return /pdf$/i.test(f.type || '') || /\.pdf$/i.test(f.name || '') ? this.lerPDF(f) : lerBase.call(this, f); };
P._carregarPdfjs = function () {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  return new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = PDFJS + 'pdf.min.js';
    s.onload = () => { if (!window.pdfjsLib) return rej(new Error('pdf.js não carregou')); window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; res(window.pdfjsLib); };
    s.onerror = () => rej(new Error('sem acesso a ' + PDFJS));
    document.head.appendChild(s);
  });
};
P.lerPDF = async function (f) {
  try {
    VC.ui.toast('A ler o PDF…');
    const lib = await this._carregarPdfjs();
    const doc = await lib.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise;
    let n = 1;
    if (doc.numPages > 1) { n = parseInt(window.prompt('O PDF tem ' + doc.numPages + ' páginas. Qual é a planta deste piso?', '1'), 10) || 1; n = Math.max(1, Math.min(doc.numPages, n)); }
    const pag = await doc.getPage(n), v1 = pag.getViewport({ scale: 1 });
    const k = 2400 / Math.max(v1.width, v1.height), vp = pag.getViewport({ scale: k });
    const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    await pag.render({ canvasContext: g, viewport: vp }).promise;
    return this.usarImagem(c.toDataURL('image/png'));
  } catch (e) {
    VC.debug.erro(e);
    VC.ui.toast('Não foi possível ler o PDF (' + e.message + '). Exporte a página como imagem PNG/JPG.');
    return null;
  }
};

/* ── ao entrar na vista: cor e ferramenta próprias do passo ── */
const mostrarBase = P.mostrar;
P.mostrar = function (el) {
  const passo = VC._passoAtivo;
  if (this._passoVisto !== passo) {
    this._passoVisto = passo;
    this.corPor = (passo === 'balanco' || passo === 'transferencias') ? 'balanco' : 'grupo';
    this.ferramenta = passo === 'transferencias' ? 'trf' : 'sel';
    this.pendente = null; this.pendenteTrf = null;
  }
  return mostrarBase.call(this, el);
};

/* ── plantas na Entrega (só leitura) ─────── */
P.svgEstatico = function (piso, largura) {
  const guard = { zoom: this.zoom, selecionado: this.selecionado, rascunho: this.rascunho, pendente: this.pendente, escalaPts: this.escalaPts, corPor: this.corPor, ferramenta: this.ferramenta };
  try {
    Object.assign(this, { zoom: largura / piso.w, selecionado: null, rascunho: [], pendente: null, escalaPts: [], corPor: 'grupo', ferramenta: 'ver', _rotuloQ: true });
    return this._svg(piso).replace(/^<svg [^>]*>/, '<svg class="planta-estatica" viewBox="0 0 ' + piso.w + ' ' + piso.h + '" role="img" aria-label="Planta de ' + esc(piso.nome) + '">').replace('<polyline id="plantaRascunho" points="" fill="none" stroke="#4f6d8c" stroke-width="2.5" vector-effect="non-scaling-stroke"/>', '').replace(/<line id="plantaTrfLinha"[^>]*\/>/, '');
  } finally { Object.assign(this, guard); this._rotuloQ = false; }
};
if (VC.entrega && VC.entrega.render) {
  const entregaBase = VC.entrega.render;
  VC.entrega.render = function () {
    const h = entregaBase.apply(this, arguments);
    const pisos = (VC.dados.plantas || []).filter(p => p.imagem && P.espacosDoPiso(p).length);
    if (!pisos.length) return h;
    const sec = '<section aria-label="Plantas"><h3 class="entrega-h">Plantas de ventilação <small>salas por grupo com Q_total · I insuflação · E extração · setas = transferências</small></h3><div class="entrega-plantas">'
      + pisos.map(p => '<figure class="entrega-planta">' + P.svgEstatico(p, 760) + '<figcaption>' + esc(p.nome) + ' · ' + P.espacosDoPiso(p).length + ' espaços desenhados</figcaption></figure>').join('') + '</div></section>';
    return h.replace('<section aria-label="Entregar por destinatário">', sec + '<section aria-label="Entregar por destinatário">');
  };
}
})();
