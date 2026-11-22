/* ============================================================
   VentiCondutas · Planta: desenhar com precisão (Fase 1B)
   ------------------------------------------------------------
   · Encaixe: ao desenhar (polígono, retângulo, escala, ramal, medir) e ao
     arrastar vértices, o ponto prende-se ao que está perto, por esta ordem:
     vértice / terminal › meio de aresta › aresta (parede da sala) / ramal ›
     grelha. Um marcador diz em quê encaixou. Alt desliga enquanto premido.
   · Shift: ângulo reto com o ponto anterior.
   · Comprimento escrito: com um ponto já posto, escreva o comprimento
     (ex.: 3,5) e Enter: o ponto seguinte fica a essa distância, na direção
     do rato. Backspace corrige, Esc apaga o número.
   · Grelha (F9): pontos de 0,50 m (só com a escala calibrada).
   · Medir (T, como a fita métrica do SketchUp): clique pontos; mostra cada troço e o total. Enter ou duplo
     clique termina; Esc limpa. Não cria nada.
   · Duplicar a sala (Ctrl+D) e rodar 90° (sala ou ramal), no painel.
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('35-planta-precisao');
const P = VC.planta;
if (!P || !P._ponto || !P.ligar) return;
const esc = s => VC.utils.esc(s);
const n2 = v => Math.round(v * 100) / 100;
const fmtM = v => VC.utils.fmt(v, 2) + ' m';

P.grelha = false;
P.PASSO_GRELHA = 0.5;   // m
P.medida = [];
P.medidaFim = false;
P._comprimento = '';
const TOL = 10;   // px no ecrã

/* ── ferramenta Medir ── */
P.FERRAMENTAS.push(['medir', 'fa-ruler-combined', 'Medir']);
P.TECLAS.medir = 'M';
if (P.ICONES) P.ICONES.medir = 'M3 7h18v10H3zM7 7v4M11 7v6M15 7v4M19 7v6';
if (P.DICAS) P.DICAS.medir = 'Clique os pontos a medir; cada troço e o total aparecem no desenho. Enter ou duplo clique termina, Esc limpa. Não cria nada.';

/* ponto de referência para Shift e para o comprimento escrito: o último ponto do desenho em curso */
P._pontoAnterior = function () {
  if (this.ferramenta === 'pol' && (this.rascunho || []).length && !this.pendente) return this.rascunho[this.rascunho.length - 1];
  if (this.ferramenta === 'ramal' && (this.tracado || []).length && !this.pendenteRamal) return this.tracado[this.tracado.length - 1];
  if (this.ferramenta === 'medir' && this.medida.length && !this.medidaFim) return this.medida[this.medida.length - 1];
  if (this.ferramenta === 'escala' && (this.escalaPts || []).length === 1) return this.escalaPts[0];
  return null;
};

/* ── motor de encaixe ── */
P.encaixe = function (raw, opts) {
  opts = opts || {};
  const p = this.pisoAtual(); if (!p) return { q: raw, tipo: null };
  const z = this.zoom || 1, tol = TOL / z, d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const exc = opts.excluir, salas = opts.salas !== false, ramais = !!opts.ramais;
  const cand = { vertice: null, meio: null, aresta: null };
  const ver = (c, q, tipo, rot) => { const d = d2(raw, q); if (d < tol && (!cand[c] || d < cand[c].d)) cand[c] = { d, q: [q[0], q[1]], tipo, rot }; };
  if (salas) this.espacosDoPiso(p).forEach(e => {
    if (e === exc) return;
    const pts = e.planta.pts, n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      ver('vertice', a, 'vertice', 'vértice');
      ver('meio', [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], 'meio', 'meio da parede');
      const [d, c] = this._distSeg(raw, a, b); if (d < tol && (!cand.aresta || d < cand.aresta.d)) cand.aresta = { d, q: c, tipo: 'aresta', rot: 'parede' };
    }
  });
  if (ramais) {
    (this.ramaisDoPiso ? this.ramaisDoPiso(p) : []).forEach(r => {
      if (r === exc) return;
      const pts = r.planta.pts;
      pts.forEach(a => ver('vertice', a, 'vertice', 'vértice do ramal'));
      for (let i = 1; i < pts.length; i++) { const [d, c] = this._distSeg(raw, pts[i - 1], pts[i]); if (d < tol && (!cand.aresta || d < cand.aresta.d)) cand.aresta = { d, q: c, tipo: 'ramal', rot: 'ramal ' + r.nome }; }
    });
    (VC.dados.terminais || []).forEach(t => { if (t.planta && t.planta.pisoId === p.id && t !== exc) ver('vertice', [t.planta.x, t.planta.y], 'terminal', 'terminal ' + (this._letra ? this._letra(t) : '')); });
  }
  // os pontos do próprio desenho em curso (fechar o polígono no primeiro ponto, por exemplo)
  (opts.proprios || []).forEach(a => ver('vertice', a, 'vertice', 'vértice'));
  const best = cand.vertice || cand.meio || cand.aresta;
  if (best) return best;
  if (this.grelha && p.escala) {
    const g = this.PASSO_GRELHA / p.escala, q = [Math.round(raw[0] / g) * g, Math.round(raw[1] / g) * g];
    return { q, tipo: 'grelha', rot: 'grelha ' + String(this.PASSO_GRELHA).replace('.', ',') + ' m', d: d2(raw, q) };
  }
  return { q: raw, tipo: null };
};

/* que encaixe usa cada ferramenta (null: nenhum) */
P._opcoesEncaixe = function () {
  const f = this.ferramenta;
  if (f === 'pol' || f === 'ret' || f === 'escala' || f === 'medir') return { salas: true, ramais: f === 'medir', proprios: f === 'pol' ? this.rascunho : f === 'medir' && !this.medidaFim ? this.medida : [] };
  if (f === 'ramal') return { salas: false, ramais: true };
  if (f === 'sel' && this._snapEdicao) return { salas: this._snapEdicao.tipo === 'sala', ramais: this._snapEdicao.tipo === 'ramal', excluir: this._snapEdicao.o };
  return null;
};

const pontoBase = P._ponto;
P._pontoBruto = function (ev) { return pontoBase.call(this, ev); };
P._ponto = function (ev) {
  const raw = pontoBase.call(this, ev);
  this._ultEncaixe = null;
  const o = this._opcoesEncaixe(); if (!o || this._espaco) return raw;
  const ant = this._pontoAnterior();
  if (ev && (ev.shiftKey || this.orto) && ant && this.ferramenta !== 'sel') {   // ângulo reto com o ponto anterior (Shift, ou F8 ligado)
    const q = Math.abs(raw[0] - ant[0]) >= Math.abs(raw[1] - ant[1]) ? [raw[0], ant[1]] : [ant[0], raw[1]];
    this._ultEncaixe = { q, tipo: 'orto', rot: 'ângulo reto' };
    return q;
  }
  if ((ev && ev.altKey) || this.encaixeDesligado) return raw;   // Alt (enquanto premido) ou F3
  const e = this.encaixe(raw, o);
  if (e.tipo) { this._ultEncaixe = e; return e.q; }
  return raw;
};

/* ── marcador do encaixe e camada da medição ── */
P._marcadorHTML = function (e) {
  if (!e || !e.tipo) return '';
  const z = this.zoom || 1, [x, y] = e.q, s = 6 / z, sw = 1.8 / z;
  const forma = e.tipo === 'vertice' || e.tipo === 'terminal' || e.tipo === 'cantoImg' ? '<rect x="' + (x - s) + '" y="' + (y - s) + '" width="' + 2 * s + '" height="' + 2 * s + '"/>'
    : e.tipo === 'meio' ? '<path d="M' + x + ',' + (y - s * 1.2) + ' L' + (x + s * 1.1) + ',' + (y + s * 0.8) + ' L' + (x - s * 1.1) + ',' + (y + s * 0.8) + ' z"/>'
    : e.tipo === 'grelha' ? '<path d="M' + (x - s) + ',' + y + ' H' + (x + s) + ' M' + x + ',' + (y - s) + ' V' + (y + s) + '"/>'
    : e.tipo === 'orto' ? '<path d="M' + (x - s) + ',' + (y + s) + ' V' + (y - s) + ' H' + (x + s) + '"/>'
    : '<path d="M' + (x - s) + ',' + (y - s) + ' L' + (x + s) + ',' + (y + s) + ' M' + (x + s) + ',' + (y - s) + ' L' + (x - s) + ',' + (y + s) + '"/>';
  return '<g id="plantaEncaixe" pointer-events="none" fill="none" stroke="#e05a00" stroke-width="' + sw + '">' + forma
    + '<text x="' + (x + 9 / z) + '" y="' + (y - 8 / z) + '" font-size="' + 10.5 / z + '" fill="#e05a00" stroke="#fff" stroke-width="' + 3 / z + '" paint-order="stroke" font-weight="700">' + esc(e.rot || '') + '</text></g>';
};
P._medidaHTML = function (p) {
  const pts = this.medida.concat(!this.medidaFim && this.ponteiroMedir && this.medida.length ? [this.ponteiroMedir] : []);
  if (!pts.length || !p) return '';
  const z = this.zoom || 1, m = (a, b) => (p.escala ? Math.hypot(b[0] - a[0], b[1] - a[1]) * p.escala : null);
  let h = '<g id="plantaMedicao" pointer-events="none"><polyline points="' + pts.map(q => q.join(',')).join(' ') + '" fill="none" stroke="#e05a00" stroke-width="' + 2 / z + '" stroke-dasharray="' + 6 / z + ' ' + 4 / z + '"/>';
  h += pts.map(q => '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="' + 3.5 / z + '" fill="#e05a00"/>').join('');
  let tot = 0;
  for (let i = 1; i < pts.length; i++) {
    const L = m(pts[i - 1], pts[i]); if (L == null) continue; tot += L;
    const mx = (pts[i - 1][0] + pts[i][0]) / 2, my = (pts[i - 1][1] + pts[i][1]) / 2;
    h += '<text x="' + mx + '" y="' + (my - 6 / z) + '" text-anchor="middle" font-size="' + 11 / z + '" font-weight="800" fill="#e05a00" stroke="#fff" stroke-width="' + 3 / z + '" paint-order="stroke">' + fmtM(L) + '</text>';
  }
  const u = pts[pts.length - 1];
  if (pts.length > 2 && p.escala) h += '<text x="' + (u[0] + 10 / z) + '" y="' + (u[1] + 16 / z) + '" font-size="' + 12 / z + '" font-weight="800" fill="#7c2d12" stroke="#fff" stroke-width="' + 3.5 / z + '" paint-order="stroke">total ' + fmtM(tot) + '</text>';
  if (!p.escala && pts.length > 1) h += '<text x="' + (u[0] + 10 / z) + '" y="' + (u[1] + 16 / z) + '" font-size="' + 11 / z + '" fill="#7c2d12">calibre a escala (S) para medir</text>';
  return h + '</g>';
};
P.medidaTotal = function () {
  const p = this.pisoAtual(); if (!p || !p.escala) return null;
  let t = 0; for (let i = 1; i < this.medida.length; i++) t += Math.hypot(this.medida[i][0] - this.medida[i - 1][0], this.medida[i][1] - this.medida[i - 1][1]) * p.escala;
  return t;
};
const svgBase = P._svg;
P._svg = function (p) {
  const s = svgBase.call(this, p);
  const extra = this.ferramenta === 'medir' ? this._medidaHTML(p) : '';
  return extra ? s.replace(/<\/svg>$/, extra + '</svg>') : s;
};

/* ── comprimento escrito ── */
P._caixaComprimento = function () {
  let el = document.getElementById('plantaComprimento');
  if (!this._comprimento) { if (el) el.remove(); return; }
  const tela = document.getElementById('plantaTela'); if (!tela) return;
  if (!el) { el = document.createElement('div'); el.id = 'plantaComprimento'; el.className = 'planta-comprimento'; el.setAttribute('role', 'status'); tela.appendChild(el); }
  const r = tela.getBoundingClientRect(), [mx, my] = this._rato || [r.left + 200, r.top + 200];
  el.style.left = (mx - r.left + 16) + 'px'; el.style.top = (my - r.top + 14) + 'px';
  el.innerHTML = '<b>' + esc(this._comprimento) + '</b> m <kbd>Enter</kbd>';
};
P.aplicarComprimento = function () {
  const p = this.pisoAtual(), ant = this._pontoAnterior(), L = VC.utils.num(String(this._comprimento).replace(',', '.'));
  this._comprimento = ''; this._caixaComprimento();
  if (!p || !ant) return false;
  if (!p.escala) { VC.ui.toast('Calibre primeiro a escala (S) para desenhar por comprimento.'); return false; }
  if (!(L > 0)) return false;
  const alvo = this.ferramenta === 'medir' ? this.ponteiroMedir : this.ponteiro;
  if (!alvo || Math.hypot(alvo[0] - ant[0], alvo[1] - ant[1]) < 1e-6) { VC.ui.toast('Aponte com o rato a direção do segmento e volte a escrever o comprimento.'); return false; }
  const dx = alvo[0] - ant[0], dy = alvo[1] - ant[1], l = Math.hypot(dx, dy), k = L / p.escala / l;
  const q = [n2(ant[0] + dx * k), n2(ant[1] + dy * k)];
  if (this.ferramenta === 'pol') { this.rascunho.push(q); this.pendente = null; }
  else if (this.ferramenta === 'ramal') { this.tracado.push(q); this.pendenteRamal = null; }
  else if (this.ferramenta === 'medir') this.medida.push(q);
  this.ponteiro = q; this.ponteiroMedir = q;
  this.redesenhar();
  return true;
};
/* teclas enquanto se desenha (chamado por 21-planta-vista antes dos atalhos) */
P.teclaDesenho = function (ev) {
  const k = ev.key, mod = ev.ctrlKey || ev.metaKey;
  if (mod && (k === 'd' || k === 'D') && this.ferramenta === 'sel' && this.selecionado != null) { this.duplicarSala(this.selecionado); return true; }   // em vez de «marcador» do navegador
  if (mod || ev.altKey) return false;
  if (k === 'Escape' && !this._comprimento && this.ferramenta === 'medir' && this.medida.length) { this.medida = []; this.medidaFim = false; this.ponteiroMedir = null; this.redesenhar(); return true; }   // a medição não é um desenho pendente: Esc só a limpa
  // Fase 3B: a grelha de desenho fica só no F9 (AutoCAD); G passa a ser a tomada / rejeição exterior
  const podeEscrever = !!this._pontoAnterior() && this.ferramenta !== 'escala';
  if (/^[0-9]$/.test(k) || ((k === ',' || k === '.') && this._comprimento)) {
    if (!podeEscrever) return false;
    if ((k === ',' || k === '.') && /[,.]/.test(this._comprimento)) return true;
    this._comprimento += (k === '.' ? ',' : k); this._caixaComprimento(); return true;
  }
  if (!this._comprimento) return false;
  if (k === 'Backspace') { this._comprimento = this._comprimento.slice(0, -1); this._caixaComprimento(); return true; }
  if (k === 'Escape') { this._comprimento = ''; this._caixaComprimento(); return true; }
  if (k === 'Enter') { this.aplicarComprimento(); return true; }
  return false;
};

/* ── duplicar e rodar ── */
const porId = (l, id) => (VC.dados[l] || []).find(x => String(x.id) === String(id));
const centro = pts => { let x = 0, y = 0; pts.forEach(q => { x += q[0]; y += q[1]; }); return [x / pts.length, y / pts.length]; };
const rodar = (pts, c, g) => { const a = g * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a); return pts.map(([x, y]) => [n2(c[0] + (x - c[0]) * cs - (y - c[1]) * sn), n2(c[1] + (x - c[0]) * sn + (y - c[1]) * cs)]); };
/* cópia da sala ao lado (1 m para a direita e para baixo), como espaço novo com o mesmo tipo, N e pé-direito */
P.duplicarSala = function (id) {
  const e = porId('espacos', id), p = this.pisoAtual(); if (!e || !e.planta || !p || this._bloqueado()) return null;
  const d = p.escala ? 1 / p.escala : 30;
  let k = 2; const base = String(e.nome).replace(/ \(\d+\)$/, ''); while ((VC.dados.espacos || []).some(x => String(x.nome).toLowerCase() === (base + ' (' + k + ')').toLowerCase())) k++;
  this.pendente = e.planta.pts.map(([x, y]) => [x + d, y + d]);
  this.criarEspaco(base + ' (' + k + ')', e.tipo, true, VC.calculo.nVazio && VC.calculo.nVazio(e) ? '' : e.N);
  const n = (VC.dados.espacos || []).find(x => x.nome === base + ' (' + k + ')'); if (!n) return null;
  ['H', 'grupoForcado', 'regimeSanitario', 'numSanitas', 'numUrinois', 'numDuches', 'lugares', 'pressurizada', 'deltaP'].forEach(c => { if (e[c] !== undefined && e[c] !== '') n[c] = e[c]; });
  if (n.geometriaMetodo !== 'V') n.V = Math.round((Number(n.A) || 0) * (Number(n.H) || 0) * 100) / 100;
  if (VC.estado && VC.estado.forcarSync) VC.estado.forcarSync();
  this.redesenhar();
  VC.ui.toast('«' + n.nome + '» criada a partir de «' + e.nome + '». Arraste-a para o sítio (os terminais não são copiados).');
  return n;
};
/* rodar 90° (ou o ângulo dado): a sala à volta do seu centro, o ramal à volta do ponto de partida */
P.rodarSala = function (id, graus) {
  const e = porId('espacos', id); if (!e || !e.planta || this._bloqueado() || !this._aplicarGeometria) return false;
  const antes = this._estado(), pts = rodar(e.planta.pts, centro(e.planta.pts), graus || 90);
  const ed = { tipo: 'sala', o: e, pts: e.planta.pts, fechado: true };
  return this._aplicarGeometria(ed, pts, 'sala «' + e.nome + '» rodada ' + (graus || 90) + '°', antes);
};
P.rodarRamal = function (id, graus) {
  const r = porId('ramais', id); if (!r || !r.planta || this._bloqueado() || !this._aplicarGeometria) return false;
  const antes = this._estado(), pts = rodar(r.planta.pts, r.planta.pts[0], graus || 90);
  return this._aplicarGeometria({ tipo: 'ramal', o: r, pts: r.planta.pts, fechado: false }, pts, 'ramal «' + r.nome + '» rodado ' + (graus || 90) + '°', antes);
};
if (VC.paineis && VC.paineis.esquemas) {
  const E = VC.paineis.esquemas;
  const aS = E.sala.acoes, aR = E.ramal.acoes;
  E.sala.acoes = function (e, p) { const a = aS.call(this, e, p); a.splice(Math.max(0, a.length - 1), 0, ['Duplicar (Ctrl+D)', 'VC.planta.duplicarSala(' + e.id + ')'], ['Rodar 90°', 'VC.planta.rodarSala(' + e.id + ', 90)']); return a; };
  E.ramal.acoes = function (r, p) { const a = aR.call(this, r, p); a.splice(Math.max(0, a.length - 1), 0, ['Rodar 90° (à volta do início)', 'VC.planta.rodarRamal(' + r.id + ', 90)']); return a; };
}

/* ── Enter / Esc / pendentes da medição ── */
const entBase = P.gestoEnter;
P.gestoEnter = function () { if (this.ferramenta === 'medir' && this.medida.length >= 2 && !this.medidaFim) { this.medidaFim = true; this.ponteiroMedir = null; this.redesenhar(); return 'medida'; } return entBase.apply(this, arguments); };
const cancBase = P.cancelar;
P.cancelar = function () { this.medida = []; this.medidaFim = false; this.ponteiroMedir = null; this._comprimento = ''; this._caixaComprimento(); return cancBase.apply(this, arguments); };
const ferrBase = P.setFerramenta;
P.setFerramenta = function (f) { this.medida = []; this.medidaFim = false; this.ponteiroMedir = null; this._comprimento = ''; this._caixaComprimento(); return ferrBase.apply(this, arguments); };

/* ── interação: marcador, medição ── */
const ligarBase = P.ligar;
P.ligar = function () {
  ligarBase.apply(this, arguments);
  const palco = document.getElementById('plantaTela'), svg = document.getElementById('plantaSVG'); if (!palco || !svg) return;
  const desenharMarcador = e => {
    const v = svg.querySelector('#plantaEncaixe'); if (v) v.remove();
    const h = this._marcadorHTML(e); if (!h) return;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.innerHTML = h; svg.appendChild(g.firstChild);
  };
  palco.addEventListener('pointermove', ev => {
    this._rato = [ev.clientX, ev.clientY];
    if (this._comprimento) this._caixaComprimento();
    if (this._snapEdicao) { desenharMarcador(this._ultEncaixe); return; }   // durante o arrasto de vértices (31) o ponto já foi calculado
    if (!this._opcoesEncaixe() || this._espaco) { desenharMarcador(null); return; }
    const q = this._ponto(ev);
    desenharMarcador(this._ultEncaixe);
    if (this.ferramenta === 'medir' && this.medida.length && !this.medidaFim) {
      this.ponteiroMedir = q;
      const g = svg.querySelector('#plantaMedicao'), p = this.pisoAtual();
      const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'g'); tmp.innerHTML = this._medidaHTML(p);
      if (g && tmp.firstChild) g.replaceWith(tmp.firstChild); else if (tmp.firstChild) svg.appendChild(tmp.firstChild);
    }
  }, true);
  palco.addEventListener('pointerleave', () => desenharMarcador(null));
  svg.addEventListener('pointerdown', ev => {
    if (this.ferramenta !== 'medir' || ev.button !== 0 || this._espaco) return;
    ev.stopImmediatePropagation(); ev.preventDefault();
    const q = this._ponto(ev);
    if (this.medidaFim) { this.medida = [q]; this.medidaFim = false; }
    else {
      const u = this.medida[this.medida.length - 1];
      if (u && this.medida.length >= 2 && Math.hypot(q[0] - u[0], q[1] - u[1]) * (this.zoom || 1) < 6) { this.medidaFim = true; this.ponteiroMedir = null; this.redesenhar(); return; }
      this.medida.push(q);
    }
    this.redesenhar();
  }, true);
  svg.addEventListener('dblclick', ev => { if (this.ferramenta === 'medir' && this.medida.length >= 2) { ev.preventDefault(); ev.stopImmediatePropagation(); this.medidaFim = true; this.ponteiroMedir = null; this.redesenhar(); } }, true);
};

/* menu ☰: grelha */
if (P._menuHTML) {
  const menuBase = P._menuHTML;
  P._menuHTML = function () {
    const h = menuBase.call(this), i = this._acoesMenu.push(() => { this.grelha = !this.grelha; this.redesenhar(); }) - 1;
    return h.replace('<div class="pm-tit" role="presentation">Comandos</div>', '<div class="pm-tit" role="presentation">Comandos</div><button type="button" role="menuitem" class="pm-item' + (this.grelha ? ' ativo' : '') + '" onclick="VC.planta._doMenu(' + i + ')"><span class="pm-ic">#</span><span class="pm-rot">' + (this.grelha ? 'Desligar' : 'Ligar') + ' a grelha de 0,50 m</span><kbd>G</kbd></button>'
      + '<button type="button" role="menuitem" class="pm-item" disabled><span class="pm-ic"></span><span class="pm-rot">Desligar o encaixe (manter premido)</span><kbd>Alt</kbd></button>'
      + '<button type="button" role="menuitem" class="pm-item" disabled><span class="pm-ic"></span><span class="pm-rot">Comprimento: escrever o número e Enter</span><kbd>0–9</kbd></button>');
  };
}
})();
