/* ============================================================
   VentiCondutas · Planta: tomadas, rejeições e aberturas para o exterior (Fase 3B)
   ------------------------------------------------------------
   · Tomada / rejeição (G): um clique na fachada põe a grelha do equipamento
     selecionado (ou do mais perto que ainda não a tem). Insuflação → tomada
     de ar exterior ODA; extração → rejeição EHA; VCM: uma de cada.
     A conduta equipamento → grelha e a própria grelha somam ao Δp externo.
     A app propõe a dimensão (tomada a 2 m/s, rejeição a 5 m/s) e verifica a
     distância rejeição ↔ tomada (2 m; 8 m com ar sujo) — EN 13779, A.2.
   · Abertura para o exterior (O): um clique na parede de uma sala marca a
     abertura permanente (admissão natural); sem caudal escrito, a app propõe
     o que fecha o balanço da sala.
   Arrastar com Selecionar, Delete tira da planta, Esc larga.
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('39-planta-exterior');
const P = VC.planta, PN = VC.paineis;
if (!P || !P._svg || !PN || !PN.esquemas || !P.equipamentosDoPiso) return;
const esc = s => VC.utils.esc(s), fmt = (v, d) => VC.utils.fmt(v, d == null ? 1 : d);
const r1 = v => Math.round(v * 10) / 10, n2 = v => Math.round(v * 100) / 100;
const porId = (l, id) => (VC.dados[l] || []).find(x => String(x.id) === String(id));
const D2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const K = () => VC.constantes.EXTERIOR;
const vazio = v => v === undefined || v === null || String(v).trim() === '';

/* ── ferramentas ── */
P.FERRAMENTAS.push(['grelhaExt', 'fa-border-all', 'Tomada / rejeição'], ['abertExt', 'fa-door-open', 'Abertura para o exterior']);
Object.assign(P.TECLAS, { grelhaExt: 'G', abertExt: 'O' });
if (P.ICONES) Object.assign(P.ICONES, {
  grelhaExt: 'M3 5h18v14H3zM3 9h18M3 13h18M3 17h18',
  abertExt: 'M4 21V4h11v17M15 7l5-2v16l-5-2M10 12h.01'
});
if (P.DICAS) Object.assign(P.DICAS, {
  grelhaExt: 'Clique na fachada para pôr a tomada de ar exterior (ODA) ou a rejeição (EHA) do equipamento selecionado ou do mais perto. A app propõe a dimensão e verifica a distância entre elas.',
  abertExt: 'Clique na parede de uma sala para marcar a abertura permanente para o exterior. Sem caudal escrito, a app propõe o que fecha o balanço da sala.'
});
const encBase = P._opcoesEncaixe;
P._opcoesEncaixe = function () {
  if (this.ferramenta === 'grelhaExt' || this.ferramenta === 'abertExt') return { salas: true, ramais: false };
  if (this.ferramenta === 'sel' && this._arrExt) return { salas: true, ramais: false };
  return encBase.call(this);
};

/* ── dados ── */
P.extSel = null; P.abertSel = null;
P.lado = u => VC.calculo.ladoExterior(u);
/* equipamento a que vai a próxima grelha: o selecionado (ou a metade da VCM que falta), senão o mais perto sem grelha */
P._alvoGrelha = function (q, p) {
  const falta = u => u && !u.exterior && u.ativo !== false;
  const metades = u => [u].concat(this.metadePar(u) || []).sort((a, b) => (this.lado(a) === 'ODA' ? 0 : 1) - (this.lado(b) === 'ODA' ? 0 : 1));
  if (this.equipSel != null) { const u = porId('utas', this.equipSel); const m = u && metades(u).find(falta); if (m) return m; }
  const perto = this.equipamentosDoPiso(p).slice().sort((a, b) => D2(q, [a.planta.x, a.planta.y]) - D2(q, [b.planta.x, b.planta.y]));
  for (const u of perto) { const m = metades(u).find(falta); if (m) return m; }
  return (VC.dados.utas || []).find(falta) || null;
};
P.colocarGrelha = function (q, uId) {
  const p = this.pisoAtual(); if (!p || this._bloqueado()) return null;
  const u = uId != null ? porId('utas', uId) : this._alvoGrelha(q, p);
  if (!u) { VC.ui.toast('Todos os equipamentos já têm a sua tomada ou rejeição. Arraste-as com Selecionar (V).'); return null; }
  const antes = this._estado();
  u.exterior = Object.assign({ tipo: 'grelha' }, u.exterior, { pisoId: p.id, x: r1(q[0]), y: r1(q[1]) });
  this._empilhar((this.lado(u) === 'ODA' ? 'tomada' : 'rejeição') + ' de ' + u.nome + ' colocada', antes);
  this.extSel = u.id;
  if (VC.estado && VC.estado.forcarSync) VC.estado.forcarSync();
  const x = u.ext;
  VC.ui.toast((this.lado(u) === 'ODA' ? 'Tomada de ar exterior' : 'Rejeição') + ' de «' + u.nome + '»' + (x ? ': ' + x.b + '×' + x.h + ' mm, Δp ' + fmt(x.dp, 0) + ' Pa' : '') + (x && x.avisos.length ? ' · ' + x.avisos[0] : '') + '.');
  this.redesenhar();
  return u;
};
P.retirarGrelha = function (id) {
  const u = porId('utas', id); if (!u || !u.exterior || this._bloqueado()) return false;
  const antes = this._estado(); delete u.exterior; this.extSel = null;
  this._empilhar('grelha exterior de ' + u.nome + ' tirada', antes);
  if (VC.estado && VC.estado.forcarSync) VC.estado.forcarSync();
  VC.ui.toast('Grelha exterior de «' + u.nome + '» tirada (Ctrl+Z repõe).'); this.redesenhar(); return true;
};
/* abertura para o exterior numa sala: posição na parede e, sem caudal, o que fecha o balanço */
P.colocarAbertura = function (q) {
  const p = this.pisoAtual(); if (!p || this._bloqueado()) return null;
  const tol = 25 / (this.zoom || 1);
  let e = this.salaEm(q, p);
  if (!e) { let m = null; this.espacosDoPiso(p).forEach(s => { const pts = s.planta.pts; for (let i = 0; i < pts.length; i++) { const d = this._distSeg(q, pts[i], pts[(i + 1) % pts.length])[0]; if (d < tol && (!m || d < m.d)) m = { d, s }; } }); e = m && m.s; }
  if (!e) { VC.ui.toast('Clique na parede de uma sala desenhada.'); return null; }
  const antes = this._estado();
  e.planta.abertura = { x: r1(q[0]), y: r1(q[1]) };
  let nota = '';
  if (!Number(e.Q_exterior)) {
    const b = VC6.balanco && VC6.balanco.todos ? VC6.balanco.todos().find(x => String(x.id) === String(e.id)) : null;
    const res = b ? Number(b.residuo) || 0 : 0;
    if (Math.abs(res) > 1) { e.Q_exterior = Math.round(-res); nota = ' · caudal proposto ' + fmt(e.Q_exterior, 0) + ' m³/h (fecha o balanço)'; }
    else nota = ' · escreva o caudal no painel da sala';
  }
  this._empilhar('abertura para o exterior em ' + e.nome, antes);
  this.abertSel = e.id;
  if (VC.estado && VC.estado.forcarSync) VC.estado.forcarSync();
  VC.ui.toast('Abertura para o exterior em «' + e.nome + '»' + nota + '.');
  this.redesenhar(); return e;
};
P.retirarAbertura = function (id) {
  const e = porId('espacos', id); if (!e || !e.planta || !e.planta.abertura || this._bloqueado()) return false;
  const antes = this._estado(); delete e.planta.abertura; this.abertSel = null;
  this._empilhar('abertura de ' + e.nome + ' tirada da planta', antes);
  VC.ui.toast('Abertura de «' + e.nome + '» tirada da planta; o caudal fica no painel da sala (Ctrl+Z repõe).'); this.redesenhar(); return true;
};

/* ── seleção exclusiva ── */
['selecionado', 'ramalSel', 'trfSel', 'termSel', 'equipSel'].forEach(k => {
  const d = Object.getOwnPropertyDescriptor(P, k);
  if (d && d.set) Object.defineProperty(P, k, { configurable: true, enumerable: true, get: d.get, set(x) { d.set.call(this, x); if (x != null) { this.extSel = null; this.abertSel = null; } } });
  else { let v = d ? d.value : null; Object.defineProperty(P, k, { configurable: true, enumerable: true, get() { return v; }, set(x) { v = x; if (x != null) { this.extSel = null; this.abertSel = null; } } }); }
});
const limpar = o => { o.selecionado = null; o.ramalSel = null; o.trfSel = null; o.termSel = null; o.equipSel = null; o.trocoSel = null; };
['cancelar', 'setPiso', 'limparSelecao'].forEach(nome => {
  const base = P[nome]; if (typeof base !== 'function') return;
  P[nome] = function () { this.extSel = null; this.abertSel = null; return base.apply(this, arguments); };
});
const temSelBase = P.temSelecao;
if (temSelBase) P.temSelecao = function () { return this.extSel != null || this.abertSel != null || temSelBase.call(this); };
const escBase = P.gestoEsc;
if (escBase) P.gestoEsc = function () { if ((this.extSel != null || this.abertSel != null) && !this.pendenteAtual()) { this.extSel = null; this.abertSel = null; this.redesenhar(); return 'exterior'; } return escBase.apply(this, arguments); };
const apagarBase = P.gestoApagar;
if (apagarBase) P.gestoApagar = function () {
  const livre = !this.pendenteAtual() && !(this.rascunho || []).length && !(this.tracado || []).length;
  if (this.extSel != null && livre) return this.retirarGrelha(this.extSel) ? 'grelha' : 'recusado';
  if (this.abertSel != null && livre) return this.retirarAbertura(this.abertSel) ? 'abertura' : 'recusado';
  return apagarBase.apply(this, arguments);
};
const reporBase = P._repor;
P._repor = function () {
  const r = reporBase.apply(this, arguments);
  if (this.extSel != null && !(porId('utas', this.extSel) || {}).exterior) this.extSel = null;
  if (this.abertSel != null && !((porId('espacos', this.abertSel) || {}).planta || {}).abertura) this.abertSel = null;
  return r;
};

/* ── desenho ── */
/* o equipamento deixa de desenhar a seta genérica do lado que já tem grelha */
const eqBase = P._equipHTML;
P._equipHTML = function (u, p, z) {
  let h = eqBase.call(this, u, p, z);
  const par = this.metadePar(u);
  [u].concat(par || []).forEach(x => { if (x.exterior) h = h.replace(new RegExp('<line class="planta-eq-ext" data-lig="' + this.lado(x) + '"[^>]*/><path[^>]*/>(<text[^<]*</text>)?'), ''); });
  return h;
};
P._grelhaHTML = function (u, p, z) {
  const x = u.exterior, C = this.cores(), lado = this.lado(u), cor = lado === 'ODA' ? C.ODA : C.EHA, e = u.ext;
  const sel = String(this.extSel) === String(u.id), aviso = e && e.avisos.length;
  const w = 22 / z, hh = 10 / z, q = [x.x, x.y];
  let s = '';
  // conduta até ao equipamento (no mesmo piso)
  if (u.planta && u.planta.pisoId === p.id) {
    const o = [u.planta.x, u.planta.y], ang = Math.atan2(q[1] - o[1], q[0] - o[0]), aw = 5 / z;
    const [de, para] = lado === 'ODA' ? [q, o] : [o, q];
    const m = [(de[0] + para[0]) / 2, (de[1] + para[1]) / 2], a2 = lado === 'ODA' ? ang + Math.PI : ang;
    s += '<line x1="' + n2(o[0]) + '" y1="' + n2(o[1]) + '" x2="' + n2(q[0]) + '" y2="' + n2(q[1]) + '" stroke="' + cor + '" stroke-width="' + n2(3 / z) + '" stroke-dasharray="' + n2(7 / z) + ' ' + n2(3 / z) + '" pointer-events="none"/>';
    s += '<path d="M' + n2(-aw * 1.3) + ',' + n2(-aw) + ' L' + n2(aw * 0.6) + ',0 L' + n2(-aw * 1.3) + ',' + n2(aw) + ' z" transform="translate(' + n2(m[0]) + ',' + n2(m[1]) + ') rotate(' + n2(a2 * 180 / Math.PI) + ')" fill="' + cor + '" pointer-events="none"/>';
  }
  s += '<rect x="' + n2(q[0] - w / 2) + '" y="' + n2(q[1] - hh / 2) + '" width="' + n2(w) + '" height="' + n2(hh) + '" fill="#fff" stroke="' + (sel ? '#f2c94c' : aviso ? '#e08a00' : cor) + '" stroke-width="' + n2((sel ? 3 : 2) / z) + '"/>';
  for (let i = 1; i <= 4; i++) s += '<line x1="' + n2(q[0] - w / 2 + i * w / 5) + '" y1="' + n2(q[1] - hh / 2 + 1.5 / z) + '" x2="' + n2(q[0] - w / 2 + i * w / 5 - 2.5 / z) + '" y2="' + n2(q[1] + hh / 2 - 1.5 / z) + '" stroke="' + cor + '" stroke-width="' + n2(1.3 / z) + '"/>';
  if (z >= 0.5) s += '<text x="' + n2(q[0]) + '" y="' + n2(q[1] - hh / 2 - 3 / z) + '" text-anchor="middle" font-size="' + n2(8 / z) + '" font-weight="800" fill="' + cor + '" paint-order="stroke" stroke="#fff" stroke-width="' + n2(3 / z) + '">' + lado + (e ? ' ' + e.b + '×' + e.h : '') + (aviso ? ' ⚠' : '') + '</text>';
  const tit = (lado === 'ODA' ? 'Tomada de ar exterior' : 'Rejeição') + ' de ' + u.nome + (e ? ' · ' + e.b + '×' + e.h + ' mm · v face ' + fmt(e.vFace, 1) + ' m/s · Δp ' + fmt(e.dp, 0) + ' Pa' : '') + (aviso ? ' · ' + e.avisos.join(' · ') : '');
  return '<g class="planta-grelha-ext" data-u="' + esc(u.id) + '" data-lado="' + lado + '" style="cursor:move"><title>' + esc(tit) + '</title>' + s + '</g>';
};
P._aberturaHTML = function (e, z) {
  const a = e.planta.abertura, Q = Number(e.Q_exterior) || 0, C = this.cores(), entra = Q >= 0, cor = entra ? C.ODA : C.EHA;
  const sel = String(this.abertSel) === String(e.id), w = 24 / z, hh = 10 / z, A = VC6.balanco && VC6.balanco.areaAberturaExterior ? VC6.balanco.areaAberturaExterior(Q) : Math.abs(Q) / 3600 / 2;
  let s = '<rect x="' + n2(a.x - w / 2) + '" y="' + n2(a.y - hh / 2) + '" width="' + n2(w) + '" height="' + n2(hh) + '" rx="' + n2(1.5 / z) + '" fill="#fff" stroke="' + (sel ? '#f2c94c' : cor) + '" stroke-width="' + n2((sel ? 3 : 1.8) / z) + '" stroke-dasharray="' + n2(3 / z) + ' ' + n2(1.5 / z) + '"/>';
  s += '<text x="' + n2(a.x) + '" y="' + n2(a.y + 3.2 / z) + '" text-anchor="middle" font-size="' + n2(9 / z) + '" font-weight="800" fill="' + cor + '">' + (entra ? '↓' : '↑') + '</text>';
  if (z >= 0.5) s += '<text x="' + n2(a.x) + '" y="' + n2(a.y + hh / 2 + 10 / z) + '" text-anchor="middle" font-size="' + n2(8.5 / z) + '" font-weight="700" fill="' + cor + '" paint-order="stroke" stroke="#fff" stroke-width="' + n2(3 / z) + '">' + (Q ? fmt(Math.abs(Q), 0) + ' m³/h · ' + fmt(A, 3) + ' m²' : 'abertura · sem caudal') + '</text>';
  return '<g class="planta-abert-ext" data-esp="' + esc(e.id) + '" style="cursor:move"><title>Abertura para o exterior de ' + esc(e.nome) + (Q ? ' · ' + (entra ? 'entrada' : 'saída') + ' de ' + fmt(Math.abs(Q), 0) + ' m³/h · área livre ' + fmt(A, 3) + ' m² a ' + VC.constantes.V_ABERTURA_EXTERIOR + ' m/s' : '') + '</title>' + s + '</g>';
};
const svgBase = P._svg;
P._svg = function (p) {
  const s = svgBase.call(this, p);
  if (!p) return s;
  const z = this.zoom || 1;
  let g = '';
  // distâncias curtas rejeição ↔ tomada: traço vermelho com a medida
  const E = (VC.dados.utas || []).filter(u => u.exterior && u.exterior.pisoId === p.id && u.ext);
  E.filter(u => u.ext.lado === 'EHA').forEach(r => {
    const lim = r.rede === 'extracao_suja' ? K().DIST_MIN_SUJO : K().DIST_MIN;
    E.filter(t => t.ext.lado === 'ODA').forEach(t => {
      const d = p.escala ? D2([r.exterior.x, r.exterior.y], [t.exterior.x, t.exterior.y]) * p.escala : null;
      if (d == null || d >= lim) return;
      const m = [(r.exterior.x + t.exterior.x) / 2, (r.exterior.y + t.exterior.y) / 2];
      g += '<g class="planta-dist-ext" pointer-events="none"><line x1="' + r.exterior.x + '" y1="' + r.exterior.y + '" x2="' + t.exterior.x + '" y2="' + t.exterior.y + '" stroke="#c0392b" stroke-width="' + n2(1.6 / z) + '" stroke-dasharray="' + n2(3 / z) + ' ' + n2(3 / z) + '"/>'
        + '<text x="' + n2(m[0]) + '" y="' + n2(m[1] - 4 / z) + '" text-anchor="middle" font-size="' + n2(8 / z) + '" font-weight="800" fill="#c0392b" paint-order="stroke" stroke="#fff" stroke-width="' + n2(3 / z) + '">' + fmt(d, 1) + ' m &lt; ' + lim + ' m</text></g>';
    });
  });
  E.forEach(u => { g += this._grelhaHTML(u, p, z); });
  (this.espacosDoPiso ? this.espacosDoPiso(p) : []).forEach(e => { if (e.planta.abertura) g += this._aberturaHTML(e, z); });
  if (!g) return s;
  const corte = s.indexOf('<g class="planta-term"') >= 0 ? s.indexOf('<g class="planta-term"') : s.lastIndexOf('</svg>');
  return s.slice(0, corte) + '<g class="planta-exteriores">' + g + '</g>' + s.slice(corte);
};

/* ── rato ── */
const prepBase = P.prepararVista;
P.prepararVista = function () {
  prepBase.apply(this, arguments);
  const palco = this._palco && this._palco();
  if (!palco || palco._vcExt) return;
  palco._vcExt = true;
  let arr = null;
  palco.addEventListener('pointerdown', ev => {
    if (ev.button !== 0 || this._espaco) return;
    if (ev.target.closest && ev.target.closest('.planta-flut, .planta-estado')) return;
    if (this.ferramenta === 'grelhaExt') { ev.stopPropagation(); ev.preventDefault(); this.colocarGrelha(this._ponto(ev)); return; }
    if (this.ferramenta === 'abertExt') { ev.stopPropagation(); ev.preventDefault(); this.colocarAbertura(this._ponto(ev)); return; }
    if (this.ferramenta !== 'sel') return;
    const g = ev.target.closest && ev.target.closest('.planta-grelha-ext, .planta-abert-ext'); if (!g) return;
    ev.stopPropagation(); ev.preventDefault();
    const ehG = g.classList.contains('planta-grelha-ext'), o = ehG ? porId('utas', g.dataset.u) : porId('espacos', g.dataset.esp);
    const pos = o && (ehG ? o.exterior : o.planta && o.planta.abertura); if (!pos) return;
    const novo = ehG ? String(this.extSel) !== String(o.id) : String(this.abertSel) !== String(o.id);
    if (novo) { limpar(this); this.extSel = ehG ? o.id : null; this.abertSel = ehG ? null : o.id; }
    this._arrExt = true;
    arr = { pos, novo, antes: this._estado(), x0: ev.clientX, y0: ev.clientY, mexeu: false, livre: !this._bloqueado(), motivo: ehG ? 'grelha exterior movida' : 'abertura movida' };
    try { palco.setPointerCapture(ev.pointerId); } catch (e) { /* opcional */ }
  }, true);
  palco.addEventListener('pointermove', ev => {
    if (!arr) return; ev.stopPropagation();
    if (!arr.livre || (!arr.mexeu && Math.hypot(ev.clientX - arr.x0, ev.clientY - arr.y0) < 4)) return;
    arr.mexeu = true;
    const q = this._ponto(ev);   // encaixa nas paredes
    arr.pos.x = r1(q[0]); arr.pos.y = r1(q[1]);
    this.redesenharDesenho ? this.redesenharDesenho() : this.redesenhar();
  }, true);
  const fim = ev => {
    if (!arr) return; ev.stopPropagation();
    const a = arr; arr = null; this._arrExt = false;
    if (a.mexeu) { this._empilhar(a.motivo, a.antes); if (VC.estado && VC.estado.forcarSync) VC.estado.forcarSync(); }
    if (a.mexeu || a.novo) this.redesenhar();
  };
  palco.addEventListener('pointerup', fim, true);
  palco.addEventListener('pointercancel', fim, true);
};

/* ── painéis ── */
const TIPOS = () => Object.keys(K().TIPOS).map(k => [k, K().TIPOS[k].nome]);
const exterior = {
  titulo: u => (P.lado(u) === 'ODA' ? 'Tomada de ar exterior · ' : 'Rejeição · ') + u.nome, icone: 'fa-border-all', rotulo: 'Exterior',
  avisos: () => [],
  campos: [
    { id: 'tipo', rot: 'Tipo', tipo: 'opcoes', ess: true, opcoes: TIPOS, ler: u => (u.exterior || {}).tipo || '', proposto: () => ({ v: 'grelha', origem: 'norma' }),
      escrever: (u, v) => { u.exterior.tipo = vazio(v) ? 'grelha' : v; }, ajuda: 'A rejeição de ar sujo (garagem, cozinha, IS) deve sair acima da cobertura.' },
    { id: 'dim', rot: 'Dimensão (largura × altura)', tipo: 'texto', ess: true, un: 'mm',
      ler: u => (Number(u.exterior.b) > 0 && Number(u.exterior.h) > 0 ? u.exterior.b + '×' + u.exterior.h : ''),
      proposto: u => (u.ext ? { v: u.ext.proposta.b + '×' + u.ext.proposta.h, origem: 'calculo', nota: P.lado(u) === 'ODA' ? 'a 2 m/s' : 'a 5 m/s' } : null),
      escrever: (u, v) => { const s = VC.calculo.lerSeccao(v); if (s && s.forma === 'retangular') { u.exterior.b = s.b; u.exterior.h = s.h; } else { delete u.exterior.b; delete u.exterior.h; if (!vazio(v)) VC.ui.toast('Escreva largura × altura em mm (ex.: 600×300).'); } } },
    { id: 'dpFab', rot: 'Δp do catálogo', tipo: 'num', ess: true, un: 'Pa', min: 0, passo: 1,
      ler: u => (Number(u.exterior.dpFab) > 0 ? u.exterior.dpFab : ''), proposto: u => (u.ext ? { v: Math.round(u.ext.dpGrelha), origem: 'calculo', nota: 'ζ típico' } : null),
      escrever: (u, v) => { const n = VC.utils.num(v); if (n > 0) u.exterior.dpFab = n; else delete u.exterior.dpFab; }, ajuda: 'Com o Δp do fabricante para este caudal, a app usa-o em vez do ζ típico.' },
    { id: 'L', rot: 'Comprimento da conduta até ao equipamento', tipo: 'num', un: 'm', min: 0, passo: 0.1,
      ler: u => (Number(u.exterior.L) > 0 ? u.exterior.L : ''), proposto: u => (u.ext && u.ext.Lorig === 'planta' ? { v: n2(u.ext.L), origem: 'medido' } : null),
      escrever: (u, v) => { const n = VC.utils.num(v); if (n > 0) u.exterior.L = n; else delete u.exterior.L; }, ajuda: 'Sem valor, mede-se em linha reta na planta (equipamento e grelha no mesmo piso).' }
  ],
  resultado: u => {
    const e = u.ext; if (!e) return [['Caudal', '—', 'sem caudal no equipamento']];
    const out = [
      ['Caudal', fmt(e.Q * 3600, 0) + ' m³/h', 'do ventilador (com fugas)'],
      ['Área de face · livre', fmt(e.A, 3) + ' · ' + fmt(e.Alivre, 3) + ' m²', K().TIPOS[e.tipo].nome],
      ['Velocidade na face', fmt(e.vFace, 2) + ' m/s', e.lado === 'ODA' ? 'máximo ' + K().V_TOMADA_MAX + ' m/s' : (e.tipo === 'cobertura' ? '' : 'mínimo ' + K().V_REJEICAO_MIN + ' m/s na fachada')],
      ['Δp da grelha', fmt(e.dpGrelha, 1) + ' Pa', e.dpFab ? 'do catálogo' : 'ζ ' + fmt(K().TIPOS[e.tipo].zeta, 1) + ' na área livre (' + fmt(e.vLivre, 1) + ' m/s)'],
      ['Conduta até ao equipamento', e.L ? 'Ø' + e.D + ' · ' + fmt(e.L, 1) + ' m · ' + fmt(e.dpLig, 1) + ' Pa' : '—', e.L ? (e.Lorig === 'planta' ? 'medida na planta' : 'escrita') : 'equipamento noutro piso ou sem posição: escreva o comprimento'],
      ['Δp somado ao equipamento', fmt(e.dp, 1) + ' Pa', 'Δp externo de ' + u.nome + ' = ' + fmt(u.dpExt, 0) + ' Pa']
    ];
    if (e.distMin != null) out.push([e.lado === 'ODA' ? 'Rejeição mais perto' : 'Tomada mais perto', fmt(e.distMin, 1) + ' m', e.outro + ' · mínimo ' + e.distLim + ' m (na planta)' + (e.distMin < e.distLim ? ' · CURTO' : ' · OK')]);
    return out;
  },
  porFazer: u => (u.ext ? u.ext.avisos.slice() : []),
  acoes: u => {
    const id = "'" + esc(String(u.id)) + "'", a = [];
    if (u.planta) a.push(['Ver o equipamento', 'VC.planta.setPiso(\'' + esc(u.planta.pisoId) + '\');VC.planta.selecionarEquip(' + id + ')']);
    a.push(['Tirar da planta (Delete)', 'VC.planta.retirarGrelha(' + id + ')']);
    return a;
  }
};
const abertura = {
  titulo: e => 'Abertura · ' + e.nome, icone: 'fa-door-open', rotulo: 'Abertura para o exterior',
  avisos: e => [e.nome],
  campos: [
    { id: 'Q_exterior', rot: 'Caudal pela abertura', un: 'm³/h', tipo: 'num', ess: true, passo: 10, ler: e => (Number(e.Q_exterior) ? e.Q_exterior : ''),
      proposto: e => { const b = VC6.balanco && VC6.balanco.todos ? VC6.balanco.todos().find(x => String(x.id) === String(e.id)) : null; const r = b ? (Number(b.residuo) || 0) - (Number(e.Q_exterior) || 0) : 0; return Math.abs(r) > 1 ? { v: Math.round(-r), origem: 'balanco', nota: 'fecha o balanço' } : null; },
      escrever: (e, v) => { const q = vazio(v) ? 0 : VC.utils.num(v); if (q) e.Q_exterior = q; else delete e.Q_exterior; },
      ajuda: 'Positivo: o ar entra (admissão natural, ex.: garagem em depressão). Negativo: sai.' }
  ],
  resultado: e => {
    const Q = Number(e.Q_exterior) || 0, v = VC.constantes.V_ABERTURA_EXTERIOR;
    return [['Sentido', Q > 0 ? 'entra ar exterior' : Q < 0 ? 'sai ar' : '—', ''], ['Área livre', fmt(Math.abs(Q) / 3600 / v, 3) + ' m²', 'a ' + v + ' m/s']];
  },
  porFazer: e => (Number(e.Q_exterior) ? [] : ['escreva o caudal (ou aceite o que fecha o balanço)']),
  acoes: e => [['Ver a sala', 'VC.planta.selecionar(' + JSON.stringify(e.id).replace(/"/g, "'") + ')'], ['Tirar da planta (Delete)', "VC.planta.retirarAbertura('" + esc(String(e.id)) + "')"]]
};
PN.esquemas.exterior = exterior;
PN.esquemas.abertura = abertura;
const obterBase = PN._obter.bind(PN);
PN._obter = function (tipo, id) {
  if (tipo === 'exterior') { const u = porId('utas', id); return u && u.exterior ? u : null; }
  if (tipo === 'abertura') return porId('espacos', id);
  return obterBase(tipo, id);
};
const selBase = PN.selecao.bind(PN);
PN.selecao = function () {
  const livre = !P.pendenteAtual() && !(P.rascunho || []).length && !(P.tracado || []).length;
  if (livre && P.extSel != null) { const u = porId('utas', P.extSel); if (u && u.exterior) return { tipo: 'exterior', o: u }; }
  if (livre && P.abertSel != null) { const e = porId('espacos', P.abertSel); if (e && e.planta && e.planta.abertura) return { tipo: 'abertura', o: e }; }
  return selBase();
};
/* painel do equipamento: a grelha no resultado e o atalho para a pôr */
const eq = PN.esquemas.equipamento;
if (eq) {
  const resBase = eq.resultado, acBase = eq.acoes;
  eq.resultado = (u, p) => {
    const out = resBase(u, p);
    [u].concat(P.metadePar(u) || []).forEach(x => out.push([P.lado(x) === 'ODA' ? 'Tomada de ar exterior' : 'Rejeição', x.ext ? x.ext.b + '×' + x.ext.h + ' · ' + fmt(x.ext.dp, 0) + ' Pa' : '—', x.ext ? (x.ext.avisos.length ? x.ext.avisos[0] : 'verificada') : 'por desenhar: ferramenta G']));
    return out;
  };
  eq.acoes = (u, p) => {
    const a = acBase(u, p), falta = [u].concat(P.metadePar(u) || []).filter(x => !x.exterior);
    if (falta.length) a.splice(1, 0, ['Desenhar a ' + (P.lado(falta[0]) === 'ODA' ? 'tomada de ar exterior' : 'rejeição') + ' (G)', "VC.planta.escolherFerramenta ? VC.planta.escolherFerramenta('grelhaExt') : VC.planta.setFerramenta('grelhaExt')"]);
    return a;
  };
}
})();
