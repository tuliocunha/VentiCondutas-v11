/* ============================================================
   VentiCondutas · Planta: edição da geometria (Fase 1 do plano de desenho)
   ------------------------------------------------------------
   Com a ferramenta Selecionar (V), a sala ou o ramal selecionado mostra:
     ● vértices      arrastar = mover; clique = selecionar (Delete apaga)
     ○ meio da aresta arrastar ou clicar = acrescentar um vértice
     aresta          arrastar = mover o segmento inteiro; duplo clique = vértice nesse ponto
     interior da sala arrastar = mover a sala (os terminais dela vão junto)
   Shift ao arrastar: ângulos retos com os vértices vizinhos.
   Nos ramais, o vértice encaixa noutros ramais e nos terminais (Alt desliga).
   Cada edição é uma entrada do desfazer. A área (sala) e o L (ramal) da tabela
   acompanham o desenho quando já eram iguais à medida antes da edição.
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('31-planta-edicao');
const P = VC.planta;
if (!P || !P._svg || !P.ligar || !P._estado) return;
const porId = (lista, id) => (VC.dados[lista] || []).find(x => String(x.id) === String(id));
const r1 = v => Math.round(v * 10) / 10;
const copia = pts => pts.map(q => [q[0], q[1]]);

P.vertSel = null;   // { tipo: 'sala'|'ramal', id, i }

/* objeto em edição: a sala ou o ramal selecionado neste piso, com a ferramenta Selecionar e nada a meio */
P._emEdicao = function (p) {
  p = p || this.pisoAtual();
  if (!p || this.ferramenta !== 'sel' || this.pendente || this.pendenteRamal || this.pendenteTrf || this.pendenteTerm) return null;
  if (this.ramalSel != null) { const r = porId('ramais', this.ramalSel); if (r && r.planta && r.planta.pisoId === p.id) return { tipo: 'ramal', o: r, pts: r.planta.pts, fechado: false }; }
  if (this.selecionado != null) { const e = porId('espacos', this.selecionado); if (e && e.planta && e.planta.pisoId === p.id) return { tipo: 'sala', o: e, pts: e.planta.pts, fechado: true }; }
  return null;
};

/* ── desenho das alças ── */
P._alcasHTML = function (ed, pts) {
  const z = this.zoom || 1, n = pts.length, nA = ed.fechado ? n : n - 1, vs = this.vertSel;
  let h = '<g class="pe" data-obj="' + ed.tipo + '" data-id="' + ed.o.id + '">';
  for (let i = 0; i < nA; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    h += '<line class="pe-a" data-i="' + i + '" x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="transparent" stroke-width="' + 12 / z + '"><title>Arrastar: mover este segmento · duplo clique: novo vértice</title></line>';
  }
  for (let i = 0; i < nA; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) * z < 28) continue;   // aresta curta: sem alça do meio (não tapa os vértices)
    h += '<circle class="pe-m" data-i="' + i + '" cx="' + (a[0] + b[0]) / 2 + '" cy="' + (a[1] + b[1]) / 2 + '" r="' + 5 / z + '" fill="#fff" stroke="#4f6d8c" stroke-width="1.5" stroke-dasharray="2 2" vector-effect="non-scaling-stroke"><title>Arrastar ou clicar: acrescentar um vértice</title></circle>';
  }
  pts.forEach((q, i) => {
    const on = vs && vs.tipo === ed.tipo && String(vs.id) === String(ed.o.id) && vs.i === i;
    h += '<circle class="pe-v' + (on ? ' on' : '') + '" data-i="' + i + '" cx="' + q[0] + '" cy="' + q[1] + '" r="' + (on ? 8 : 7) / z + '" fill="' + (on ? '#f2c94c' : '#fff') + '" stroke="#4f6d8c" stroke-width="2.5" vector-effect="non-scaling-stroke"><title>Arrastar: mover o vértice (Shift: ângulo reto) · clique e Delete: apagar</title></circle>';
  });
  return h + '</g>';
};
const svgBase = P._svg;
P._svg = function (p) {
  let s = svgBase.call(this, p);
  const ed = this._emEdicao(p);
  if (this.vertSel && !(ed && ed.tipo === this.vertSel.tipo && String(ed.o.id) === String(this.vertSel.id) && this.vertSel.i < ed.pts.length)) this.vertSel = null;
  if (!ed) return s;
  s = s.replace(/<circle class="planta-vert"[^>]*\/>/g, '');   // as alças antigas (só cantos) dão lugar às novas
  return s.replace(/<\/svg>$/, this._alcasHTML(ed, ed.pts) + '</svg>');
};

/* ── geometria do arrasto ── */
/* Shift: o ponto fica em ângulo reto com os vizinhos (canto com os dois, se estiver perto; senão alinha com o anterior) */
P._ortogonal = function (q, ant, seg) {
  const tol = 14 / (this.zoom || 1);
  if (ant && seg) {
    const cantos = [[ant[0], seg[1]], [seg[0], ant[1]]].map(c => ({ c, d: Math.hypot(c[0] - q[0], c[1] - q[1]) })).sort((a, b) => a.d - b.d);
    if (cantos[0].d < tol * 3) return cantos[0].c;
  }
  const ref = ant || seg; if (!ref) return q;
  return Math.abs(q[0] - ref[0]) < Math.abs(q[1] - ref[1]) ? [ref[0], q[1]] : [q[0], ref[1]];
};
/* vértice de um ramal: encaixa noutros ramais e nos terminais (nunca no próprio ramal) */
P._encaixarVertice = function (q, r) {
  const p = this.pisoAtual(), tol = 12 / (this.zoom || 1); let best = null;
  (this.ramaisDoPiso ? this.ramaisDoPiso(p) : []).forEach(x => {
    if (x === r) return;
    for (let i = 1; i < x.planta.pts.length; i++) { const [d, c] = this._distSeg(q, x.planta.pts[i - 1], x.planta.pts[i]); if (d < tol && (!best || d < best.d)) best = { d, q: c }; }
  });
  (VC.dados.terminais || []).forEach(t => { if (t.planta && t.planta.pisoId === p.id) { const d = Math.hypot(q[0] - t.planta.x, q[1] - t.planta.y); if (d < tol && (!best || d < best.d)) best = { d, q: [t.planta.x, t.planta.y] }; } });
  return best ? best.q : q;
};

/* ── gravar uma edição ── */
P._aplicarGeometria = function (ed, pts, motivo, antes, extra) {
  const p = this.pisoAtual(), o = ed.o, velhos = o.planta.pts;
  if (ed.tipo === 'sala' && (pts.length < 3 || (this.poligonoValido && !this.poligonoValido(pts)))) { VC.ui.toast('Assim o desenho da sala cruzava-se a si próprio: a edição não foi feita.'); this.redesenhar(); return false; }
  if (ed.tipo === 'ramal' && pts.length < 2) { VC.ui.toast('Um ramal precisa de pelo menos 2 pontos.'); return false; }
  let segue = '';
  if (ed.tipo === 'sala' && p && p.escala) {   // a área da tabela acompanha o desenho se era igual à medida
    const A0 = this.areaM2(velhos, p), At = Number(o.A) || 0;
    if (A0 && At && Math.abs(A0 - At) <= Math.max(0.05, At * 0.01)) {
      o.A = Math.round(this.areaM2(pts, p) * 100) / 100;
      if (o.geometriaMetodo !== 'V') { o.V = o.A * (Number(o.H) || 0); o.geometriaMetodo = 'AH'; }
      segue = ' · área ' + VC.utils.fmt(o.A, 2) + ' m²';
    }
  }
  if (ed.tipo === 'ramal' && p && p.escala) {  // o L da tabela acompanha o traçado se era igual ao medido
    const L0 = this.comprimentoM(velhos, p), Lt = Number(o.L) || 0;
    if (L0 && Math.abs(L0 - Lt) <= Math.max(0.05, Lt * 0.02)) { o.L = Math.round(this.comprimentoM(pts, p) * 100) / 100; segue = ' · L ' + VC.utils.fmt(o.L, 2) + ' m'; }
  }
  o.planta.pts = pts.map(q => [r1(q[0]), r1(q[1])]);
  if (extra) extra();
  this._empilhar(motivo, antes);
  if (VC.editorEspacos) VC.editorEspacos._cacheOrdenacao = { chave: null, lista: null };
  if (VC.perf) ['cacheFisica', 'cacheMaterializacao', 'ordenacaoTopologica', 'cacheBalanco'].forEach(k => { if (VC.perf[k] && VC.perf[k].invalidar) VC.perf[k].invalidar(); });
  if (VC.historico && VC.historico.push) VC.historico.push(motivo + ' (planta)');
  if (VC.estado && VC.estado.forcarSync) VC.estado.forcarSync();
  this.redesenhar();
  if (segue) VC.ui.toast(motivo.charAt(0).toUpperCase() + motivo.slice(1) + segue);
  return true;
};
P.apagarVertice = function () {
  const vs = this.vertSel, ed = this._emEdicao(); if (!vs || !ed || this._bloqueado()) return false;
  const min = ed.tipo === 'sala' ? 3 : 2;
  if (ed.pts.length <= min) { VC.ui.toast(ed.tipo === 'sala' ? 'Uma sala precisa de pelo menos 3 vértices.' : 'Um ramal precisa de pelo menos 2 pontos.'); return false; }
  const pts = copia(ed.pts); pts.splice(vs.i, 1);
  const antes = this._estado(); this.vertSel = null;
  return this._aplicarGeometria(ed, pts, 'vértice apagado em «' + ed.o.nome + '»', antes);
};
P.inverterRamal = function (id) {
  const r = porId('ramais', id); if (!r || !r.planta || this._bloqueado()) return false;
  const antes = this._estado();
  return this._aplicarGeometria({ tipo: 'ramal', o: r, pts: r.planta.pts, fechado: false }, copia(r.planta.pts).reverse(), 'sentido do ramal «' + r.nome + '» invertido', antes);
};

/* ── Esc e Delete ── */
const escBase = P.gestoEsc;
if (escBase) P.gestoEsc = function () { if (this.vertSel) { this.vertSel = null; this.redesenhar(); return 'vertice'; } return escBase.apply(this, arguments); };
const apagarBase = P.gestoApagar;
if (apagarBase) P.gestoApagar = function () { if (this.vertSel && this._emEdicao()) return this.apagarVertice() ? 'vertice' : 'recusado'; return apagarBase.apply(this, arguments); };

/* ── interação: no palco, em captura, antes dos gestos de seleção ── */
const ligarBase = P.ligar;
P.ligar = function () {
  ligarBase.apply(this, arguments);
  const palco = document.getElementById('plantaTela'), svg = document.getElementById('plantaSVG'); if (!palco || !svg) return;
  let arr = null;
  const ptsVivos = () => arr.pts;
  const mostrar = () => {   // atualização ao vivo, sem redesenhar a planta inteira
    const ed = arr.ed, pts = ptsVivos();
    if (ed.tipo === 'sala') { const pol = svg.querySelector('.planta-sala[data-esp="' + ed.o.id + '"] polygon'); if (pol) pol.setAttribute('points', pts.map(a => a.join(',')).join(' ')); }
    else {
      let l = svg.querySelector('#peTracado');
      if (!l) { l = document.createElementNS('http://www.w3.org/2000/svg', 'polyline'); l.id = 'peTracado'; l.setAttribute('fill', 'none'); l.setAttribute('stroke', '#f2994a'); l.setAttribute('stroke-width', '3'); l.setAttribute('stroke-dasharray', '6 4'); l.setAttribute('vector-effect', 'non-scaling-stroke'); l.setAttribute('pointer-events', 'none'); svg.appendChild(l); }
      l.setAttribute('points', pts.map(a => a.join(',')).join(' '));
    }
    const g = svg.querySelector('.pe');
    if (g) { const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'g'); tmp.innerHTML = this._alcasHTML(ed, pts); g.replaceWith(tmp.firstChild); }
  };
  palco.addEventListener('pointerdown', ev => {
    if (ev.button !== 0 || this.ferramenta !== 'sel' || this._espaco || this._pan) return;
    const ed = this._emEdicao(); if (!ed) return;
    if (ev.target.closest && ev.target.closest('.planta-red')) return;   // símbolo de redução (37-planta-condutas)
    const alca = ev.target.closest && ev.target.closest('.pe-v, .pe-m, .pe-a');
    let modo = null, i = -1;
    if (alca) { modo = alca.classList.contains('pe-v') ? 'v' : alca.classList.contains('pe-m') ? 'm' : 'a'; i = Number(alca.dataset.i); }
    else if (ed.tipo === 'sala' && ev.target.closest && !ev.target.closest('.planta-term, .planta-trf, .planta-ramal, .planta-vert')) {
      const g = ev.target.closest('.planta-sala'); if (g && String(g.dataset.esp) === String(ed.o.id)) modo = 'corpo';
    }
    if (!modo) return;
    if (this._bloqueado()) return;
    ev.stopPropagation(); ev.preventDefault();
    try { palco.setPointerCapture(ev.pointerId); } catch (e) { /* captura opcional */ }
    arr = { ed, modo, i, q0: this._ponto(ev), x0: ev.clientX, y0: ev.clientY, base: copia(ed.pts), pts: copia(ed.pts), antes: this._estado(), mexeu: false };
    if (modo === 'v' || modo === 'm') this._snapEdicao = { tipo: ed.tipo, o: ed.o };   // o vértice encaixa noutras salas / ramais (35-planta-precisao)
  }, true);
  palco.addEventListener('pointermove', ev => {
    if (!arr) return;
    ev.stopPropagation();
    if (!arr.mexeu && Math.hypot(ev.clientX - arr.x0, ev.clientY - arr.y0) < 4) return;
    if (!arr.mexeu && arr.modo === 'm') {   // começar a arrastar a alça do meio: nasce o vértice
      const n = arr.base.length, a = arr.base[arr.i], b = arr.base[(arr.i + 1) % n];
      arr.base.splice(arr.i + 1, 0, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]); arr.modo = 'v'; arr.i += 1; arr.nasceu = true;
    }
    arr.mexeu = true;
    const q = this._ponto(ev), dx = q[0] - arr.q0[0], dy = q[1] - arr.q0[1], n = arr.base.length, B = arr.base;
    const pts = copia(B);
    if (arr.modo === 'v') {
      let v = q;
      if (arr.ed.tipo === 'ramal' && !ev.altKey) v = this._encaixarVertice(v, arr.ed.o);
      if (ev.shiftKey || this.orto) {
        const ant = arr.ed.fechado || arr.i > 0 ? B[(arr.i - 1 + n) % n] : null, seg = arr.ed.fechado || arr.i < n - 1 ? B[(arr.i + 1) % n] : null;
        v = this._ortogonal(v, ant, seg);
      }
      pts[arr.i] = v;
    } else if (arr.modo === 'a') {
      const j = (arr.i + 1) % n;
      pts[arr.i] = [B[arr.i][0] + dx, B[arr.i][1] + dy]; pts[j] = [B[j][0] + dx, B[j][1] + dy];
    } else if (arr.modo === 'corpo') {
      pts.forEach((c, k) => { pts[k] = [B[k][0] + dx, B[k][1] + dy]; });
      arr.d = [dx, dy];
    }
    arr.pts = pts; mostrar();
  }, true);
  const fim = ev => {
    if (!arr) return;
    const a = arr; arr = null; ev.stopPropagation(); this._snapEdicao = null;
    const ed = a.ed, nome = ed.o.nome, chave = { tipo: ed.tipo, id: ed.o.id };
    if (!a.mexeu) {
      if (a.modo === 'a' && ed.tipo === 'ramal' && this.selecionarTrocoEm) { this.selecionarTrocoEm(ed.o, a.q0); return; }   // clique num troço do ramal selecionado (37-planta-condutas)
      if (a.modo === 'v') { this.vertSel = Object.assign(chave, { i: a.i }); this.redesenhar(); return; }   // clique: seleciona o vértice (Esc larga)
      if (a.modo === 'm') {   // clique na alça do meio: vértice no meio da aresta
        const pts = copia(a.base), n = pts.length, p0 = pts[a.i], p1 = pts[(a.i + 1) % n];
        pts.splice(a.i + 1, 0, [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2]);
        this.vertSel = Object.assign(chave, { i: a.i + 1 });
        this._aplicarGeometria(ed, pts, 'vértice acrescentado em «' + nome + '»', a.antes);
      }
      return;
    }
    const motivo = a.modo === 'corpo' ? 'sala «' + nome + '» movida' : a.modo === 'a' ? 'segmento movido em «' + nome + '»' : a.nasceu ? 'vértice acrescentado em «' + nome + '»' : 'vértice movido em «' + nome + '»';
    if (a.modo === 'v') this.vertSel = Object.assign(chave, { i: a.i });
    const extra = a.modo === 'corpo' && a.d ? () => {   // os terminais da sala vão com ela
      const [dx, dy] = a.d, T = this.terminaisDe ? this.terminaisDe(ed.o) : [];
      T.forEach(t => { if (t.planta && t.planta.pisoId === ed.o.planta.pisoId && this.dentro([t.planta.x, t.planta.y], a.base)) { t.planta.x = r1(t.planta.x + dx); t.planta.y = r1(t.planta.y + dy); } });
    } : null;
    this._aplicarGeometria(ed, a.pts, motivo, a.antes, extra);
  };
  palco.addEventListener('pointerup', fim, true);
  palco.addEventListener('pointercancel', ev => { if (arr) { arr = null; this._snapEdicao = null; ev.stopPropagation(); this.redesenhar(); } }, true);
  /* duplo clique numa aresta: vértice nesse ponto */
  palco.addEventListener('dblclick', ev => {
    const alca = ev.target.closest && ev.target.closest('.pe-a'); if (!alca) return;
    const ed = this._emEdicao(); if (!ed || this._bloqueado()) return;
    ev.stopPropagation(); ev.preventDefault();
    const i = Number(alca.dataset.i), n = ed.pts.length, [, c] = this._distSeg(this._ponto(ev), ed.pts[i], ed.pts[(i + 1) % n]);
    const pts = copia(ed.pts); pts.splice(i + 1, 0, c);
    const antes = this._estado(); this.vertSel = { tipo: ed.tipo, id: ed.o.id, i: i + 1 };
    this._aplicarGeometria(ed, pts, 'vértice acrescentado em «' + ed.o.nome + '»', antes);
  }, true);
};

/* ── painel: a ajuda da edição e «Inverter o sentido» no ramal ── */
if (VC.paineis && VC.paineis.esquemas) {
  const E = VC.paineis.esquemas;
  const acoesRamal = E.ramal.acoes;
  E.ramal.acoes = function (r, p) {
    const a = acoesRamal.call(this, r, p);
    a.splice(Math.max(0, a.length - 1), 0, ['Inverter o sentido', 'VC.planta.inverterRamal(' + r.id + ')']);
    return a;
  };
}
if (P.DICAS) P.DICAS.sel = (P.DICAS.sel || '') + ' Selecionado: arraste ● (vértice) ou a aresta; ○ acrescenta um vértice; vértice + Delete apaga; Shift: ângulo reto.';
})();
