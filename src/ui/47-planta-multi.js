/* ============================================================
   VentiCondutas · Planta: seleção múltipla (Fase 1C)
   ------------------------------------------------------------
   Com a ferramenta Selecionar:
   · Shift+clique junta ou tira uma sala / um ramal da seleção; Ctrl+clique junta;
   · arrastar a partir de uma zona vazia (ou com Shift/Ctrl a partir de qualquer
     sítio) desenha uma janela: da esquerda para a direita apanha só o que fica
     todo lá dentro (janela azul); da direita para a esquerda apanha também o que
     ela toca (janela verde tracejada), como no AutoCAD.
   Com dois ou mais objetos o painel mostra os campos comuns (tipo e pé-direito
   das salas; material, forma, critério… dos ramais): mudar um campo muda-o em
   todos, num só passo de desfazer. Delete apaga os desenhos; Esc limpa.
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('47-planta-multi');
const P = VC.planta, PN = VC.paineis;
if (!P || !P._svg || !PN || !PN.esquemas) return;
const esc = s => VC.utils.esc(s), n2 = v => Math.round(v * 100) / 100;
const porId = (l, id) => (VC.dados[l] || []).find(x => String(x.id) === String(id));
const LISTA = { sala: 'espacos', ramal: 'ramais' };
const CAMPOS = { sala: ['tipo', 'H', 'desenfumagem'], ramal: ['material', 'forma', 'criterio', 'serie', 'estanquidade', 'isolamento'] };
const ROT = { sala: ['sala', 'salas'], ramal: ['ramal', 'ramais'] };

P.multi = [];
P._multiInt = false;
const chave = a => a.k + ':' + a.id;
P.objetosMulti = function (k) { return this.multi.filter(a => !k || a.k === k).map(a => porId(LISTA[a.k], a.id)).filter(o => o && o.planta); };

/* uma seleção simples nova (clique normal, lista, painel…) desfaz a múltipla */
['selecionado', 'ramalSel', 'trfSel', 'termSel', 'equipSel', 'extSel', 'abertSel', 'prumSel', 'acessSel', 'iconeSel', 'fumoSel'].forEach(k => {
  const d = Object.getOwnPropertyDescriptor(P, k); if (!d) return;
  if (d.set) Object.defineProperty(P, k, { configurable: true, enumerable: true, get: d.get, set(x) { d.set.call(this, x); if (x != null && !this._multiInt) this.multi = []; } });
  else { let v = d.value; Object.defineProperty(P, k, { configurable: true, enumerable: true, get() { return v; }, set(x) { v = x; if (x != null && !this._multiInt) this.multi = []; } }); }
});

P._aplicarMulti = function () {
  // limpa itens que deixaram de existir na planta
  this.multi = this.multi.filter(a => { const o = porId(LISTA[a.k], a.id); return o && o.planta; });
  if (this.multi.length === 1) {
    const a = this.multi[0]; this.multi = [];
    if (a.k === 'sala') this.selecionar(a.id); else this.selecionarRamal(a.id);
    return;
  }
  this._multiInt = true;
  try { ['selecionado', 'ramalSel', 'trfSel', 'termSel', 'equipSel', 'extSel', 'abertSel', 'prumSel', 'acessSel', 'iconeSel', 'fumoSel'].forEach(k => { if (this[k] != null) this[k] = null; }); this.trocoSel = null; }
  finally { this._multiInt = false; }
  this.redesenhar();
};
/* modo: 'alternar' (Shift), 'juntar' (Ctrl) */
P.alternarMulti = function (alvo, modo) {
  if (!this.multi.length) {
    if (this.selecionado != null) this.multi.push({ k: 'sala', id: this.selecionado });
    else if (this.ramalSel != null) this.multi.push({ k: 'ramal', id: this.ramalSel });
  }
  const i = this.multi.findIndex(a => chave(a) === chave(alvo));
  if (i >= 0) { if (modo === 'alternar') this.multi.splice(i, 1); }
  else this.multi.push(alvo);
  this._aplicarMulti();
};
P.limparMulti = function () { if (!this.multi.length) return false; this.multi = []; this.redesenhar(); return true; };

/* janela: dentro (esq → dir) ou a tocar (dir → esq) */
const dentro = (q, r) => q[0] >= r[0] && q[0] <= r[2] && q[1] >= r[1] && q[1] <= r[3];
const cruza = (a, b, c, d) => { const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])); return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b); };
const noPol = (q, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
P.objetosNaJanela = function (a, b, tocar, p) {
  p = p || this.pisoAtual(); if (!p) return [];
  const r = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
  const cantos = [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]];
  const toca = (pts, fechado) => {
    if (pts.some(q => dentro(q, r))) return true;
    if (fechado && cantos.some(c => noPol(c, pts))) return true;
    const n = fechado ? pts.length : pts.length - 1;
    for (let i = 0; i < n; i++) { const u = pts[i], v = pts[(i + 1) % pts.length]; for (let j = 0; j < 4; j++) if (cruza(u, v, cantos[j], cantos[(j + 1) % 4])) return true; }
    return false;
  };
  const ok = (pts, fechado) => (tocar ? toca(pts, fechado) : pts.every(q => dentro(q, r)));
  const out = [];
  this.espacosDoPiso(p).forEach(e => { if (ok(e.planta.pts, true)) out.push({ k: 'sala', id: e.id }); });
  (this.ramaisDoPiso ? this.ramaisDoPiso(p) : []).forEach(x => { if (ok(x.planta.pts, false)) out.push({ k: 'ramal', id: x.id }); });
  return out;
};
P.selecionarJanela = function (a, b, tocar, juntar) {
  const novos = this.objetosNaJanela(a, b, tocar);
  if (!juntar) this.multi = [];
  else if (!this.multi.length) {
    if (this.selecionado != null) this.multi.push({ k: 'sala', id: this.selecionado });
    else if (this.ramalSel != null) this.multi.push({ k: 'ramal', id: this.ramalSel });
  }
  novos.forEach(n => { if (!this.multi.some(a => chave(a) === chave(n))) this.multi.push(n); });
  if (!this.multi.length) { this._multiInt = true; try { this.selecionado = null; this.ramalSel = null; } finally { this._multiInt = false; } this.redesenhar(); return 0; }
  this._aplicarMulti();
  return novos.length;
};

/* alterar um campo em todos, num passo de desfazer */
P.multiDefinir = function (k, campoId, valor) {
  const esq = PN.esquemas[k], c = esq && esq.campos.find(x => x.id === campoId), objs = this.objetosMulti(k);
  if (!c || !objs.length || this._bloqueado()) return false;
  const antes = this._estado();
  this._agrupar++;
  try { objs.forEach(o => { if (c.acao) c.acao(o, valor); else c.escrever(o, valor); }); }
  finally { this._agrupar--; }
  if (VC.editorEspacos) VC.editorEspacos._cacheOrdenacao = { chave: null, lista: null };
  if (VC.perf) ['cacheFisica', 'cacheMaterializacao', 'ordenacaoTopologica', 'cacheBalanco'].forEach(x => { if (VC.perf[x] && VC.perf[x].invalidar) VC.perf[x].invalidar(); });
  this._empilhar(c.rot.toLowerCase() + ' de ' + objs.length + ' ' + ROT[k][1], antes);
  if (VC.estado && VC.estado.forcarSync) VC.estado.forcarSync();
  this.redesenhar();
  VC.ui.toast(c.rot + ' mudado em ' + objs.length + ' ' + ROT[k][1] + '.');
  return true;
};
P.apagarMulti = function () {
  const salas = this.objetosMulti('sala'), ramais = this.objetosMulti('ramal');
  if (!salas.length && !ramais.length || this._bloqueado()) return false;
  const antes = this._estado();
  this._agrupar++;
  try { ramais.forEach(r => this.apagarTracado(r.id)); salas.forEach(e => this.apagarDesenho(e.id)); }
  finally { this._agrupar--; }
  this.multi = [];
  this._empilhar('apagados ' + (salas.length + ramais.length) + ' desenhos', antes);
  if (VC.estado && VC.estado.forcarSync) VC.estado.forcarSync();
  this.redesenhar();
  return true;
};

/* ── gestos ── */
const temSelBase = P.temSelecao;
P.temSelecao = function () { return this.multi.length > 0 || temSelBase.call(this); };
const escBase = P.gestoEsc;
P.gestoEsc = function () { if (this.multi.length && !this.pendenteAtual()) { this.limparMulti(); return 'multi'; } return escBase.apply(this, arguments); };
const apagarBase = P.gestoApagar;
P.gestoApagar = function () { if (this.multi.length && !this.pendenteAtual()) return this.apagarMulti() ? 'multi' : 'recusado'; return apagarBase.apply(this, arguments); };
['cancelar', 'setPiso', 'limparSelecao', '_repor'].forEach(n => { const b = P[n]; if (typeof b === 'function') P[n] = function () { this.multi = []; return b.apply(this, arguments); }; });

/* ── desenho ── */
const svgBase = P._svg;
P._svg = function (p) {
  let s = svgBase.call(this, p);
  if (!p || !this.multi.length) return s;
  const z = this.zoom || 1; let g = '';
  this.objetosMulti('sala').forEach(e => { if (e.planta.pisoId === p.id) g += '<polygon points="' + e.planta.pts.map(q => q.join(',')).join(' ') + '" fill="' + this.COR_SEL + '" fill-opacity=".14" stroke="' + this.COR_SEL + '" stroke-width="3.5" vector-effect="non-scaling-stroke"/>'; });
  this.objetosMulti('ramal').forEach(r => { if (r.planta.pisoId === p.id) g += '<polyline points="' + r.planta.pts.map(q => q.join(',')).join(' ') + '" fill="none" stroke="' + this.COR_SEL + '" stroke-opacity=".55" stroke-width="' + n2(14 / z) + '" stroke-linejoin="round" stroke-linecap="round"/>'; });
  return s.slice(0, s.lastIndexOf('</svg>')) + '<g class="planta-multi" pointer-events="none">' + g + '</g></svg>';
};

/* ── painel ── */
const valorComum = (c, objs) => { const v = objs.map(o => { let x = c.ler(o); if ((x == null || x === '') && c.proposto) { const pr = c.proposto(o, P.pisoAtual()); if (pr && pr.v != null) x = pr.v; } return x == null ? '' : String(x); }); return v.every(x => x === v[0]) ? v[0] : null; };
P._multiCampo = function (k, c, objs) {
  const id = 'pn-multi-' + k + '-' + c.id, v = valorComum(c, objs), js = "VC.planta.multiDefinir('" + k + "','" + c.id + "',this.value)";
  let h = '<div class="pn-campo"><label for="' + id + '">' + esc(c.rot) + (c.un ? ' <small>' + esc(c.un) + '</small>' : '') + '</label><div class="pn-entrada">';
  if (c.tipo === 'opcoes') {
    const op = (typeof c.opcoes === 'function' ? c.opcoes(objs[0]) : c.opcoes) || [];
    h += '<select id="' + id + '" onchange="' + esc(js) + '">' + (v == null ? '<option value="" selected disabled>— vários —</option>' : '')
      + op.map(([val, rot]) => '<option value="' + esc(val) + '"' + (v != null && String(val) === v ? ' selected' : '') + '>' + esc(rot) + '</option>').join('') + '</select>';
  } else {
    h += '<input id="' + id + '" type="number"' + (c.min != null ? ' min="' + c.min + '"' : '') + (c.passo ? ' step="' + c.passo + '"' : '') + ' value="' + esc(v == null ? '' : v) + '" placeholder="' + (v == null ? 'vários' : '') + '" onchange="' + esc(js) + '">';
  }
  return h + '</div></div>';
};
P._painelMulti = function () {
  const n = this.multi.length;
  let h = '<section class="pn pn-multi" data-pn="multi" aria-label="Seleção de ' + n + ' objetos"><header class="pn-cab"><i class="fa-solid fa-object-group" aria-hidden="true"></i><div><small>Seleção múltipla</small><b>' + n + ' objetos</b></div></header>';
  ['sala', 'ramal'].forEach(k => {
    const objs = this.objetosMulti(k); if (!objs.length) return;
    const esq = PN.esquemas[k], campos = CAMPOS[k].map(id => esq && esq.campos.find(c => c.id === id)).filter(c => c && (c.escrever || c.acao) && (c.tipo === 'opcoes' || c.tipo === 'num'));
    h += '<div class="pn-sec"><div class="pn-sec-t">' + objs.length + ' ' + ROT[k][objs.length === 1 ? 0 : 1] + '</div><div class="pn-multi-nomes">' + objs.map(o => '<span>' + esc(o.nome || o.id) + '</span>').join('') + '</div>'
      + (objs.length > 1 || this.multi.length > 1 ? campos.map(c => this._multiCampo(k, c, objs)).join('') : '') + '</div>';
  });
  h += '<div class="pn-sec"><small>Shift+clique junta ou tira · Ctrl+clique junta · arrastar numa zona vazia faz uma janela. Mudar um campo muda-o em todos.</small></div>';
  h += '<div class="pn-acoes"><button type="button" class="btn" onclick="VC.planta.limparMulti()">Limpar seleção (Esc)</button><button type="button" class="btn coral" onclick="VC.planta.apagarMulti()">Apagar os desenhos (Delete)</button></div>';
  return h + '</section>';
};
const painelBase = P._painel;
P._painel = function (p) {
  const h = painelBase.call(this, p);
  return this.multi.length >= 2 ? this._painelMulti() + h : h;
};

/* ── rato: Shift/Ctrl+clique e janela (antes de todas as ferramentas: captura no documento) ── */
let jan = null;
const alvoDe = t => {
  if (!t || !t.closest) return null;
  if (t.closest('.planta-term, .planta-vert, .pe, .planta-fumo, .planta-icone')) return null;
  const r = t.closest('.planta-ramal'); if (r && r.dataset.r != null) return { k: 'ramal', id: Number(r.dataset.r) };
  const s = t.closest('.planta-sala, .planta-rotulo'); if (s && s.dataset.esp != null) return { k: 'sala', id: Number(s.dataset.esp) };
  return null;
};
const rectSVG = () => { const svg = document.getElementById('plantaSVG'); if (!svg) return null; let r = svg.querySelector('#plantaJanela'); if (!r) { r = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); r.id = 'plantaJanela'; r.setAttribute('vector-effect', 'non-scaling-stroke'); r.setAttribute('pointer-events', 'none'); svg.appendChild(r); } return r; };
document.addEventListener('pointerdown', ev => {
  const svg = document.getElementById('plantaSVG');
  jan = null;
  if (!svg || !svg.contains(ev.target) || ev.button !== 0 || P.ferramenta !== 'sel' || P._espaco || ev.pointerType === 'touch') return;
  if (P.pendenteAtual && P.pendenteAtual()) return;
  const mod = ev.shiftKey || ev.ctrlKey || ev.metaKey, alvo = alvoDe(ev.target), vazio = ev.target === svg || ev.target.tagName === 'image';
  if (mod && alvo) {
    ev.stopPropagation(); ev.preventDefault();
    P.alternarMulti(alvo, ev.shiftKey ? 'alternar' : 'juntar');
    return;
  }
  if (!vazio && !mod) return;
  if (mod) { ev.stopPropagation(); ev.preventDefault(); }
  jan = { q0: P._ponto(ev), x: ev.clientX, y: ev.clientY, mod, ativa: false, id: ev.pointerId };
}, true);
document.addEventListener('pointermove', ev => {
  if (!jan || ev.pointerId !== jan.id) return;
  if (!jan.ativa && Math.hypot(ev.clientX - jan.x, ev.clientY - jan.y) < 6) return;
  jan.ativa = true; ev.stopPropagation();
  const q = P._ponto(ev), r = rectSVG(); if (!r) return;
  const tocar = ev.clientX < jan.x;
  r.setAttribute('x', Math.min(q[0], jan.q0[0])); r.setAttribute('y', Math.min(q[1], jan.q0[1]));
  r.setAttribute('width', Math.abs(q[0] - jan.q0[0])); r.setAttribute('height', Math.abs(q[1] - jan.q0[1]));
  r.setAttribute('fill', tocar ? 'rgba(22,163,74,.10)' : 'rgba(37,99,235,.10)');
  r.setAttribute('stroke', tocar ? '#16a34a' : '#2563eb'); r.setAttribute('stroke-width', '1.5');
  r.setAttribute('stroke-dasharray', tocar ? '6 4' : 'none');
}, true);
const fimJanela = ev => {
  if (!jan || ev.pointerId !== jan.id) return;
  const j = jan; jan = null;
  const r = document.getElementById('plantaJanela'); if (r) r.remove();
  if (!j.ativa) { if (!j.mod && P.multi.length) P.limparMulti(); return; }
  ev.stopPropagation();
  const n = P.selecionarJanela(j.q0, P._ponto(ev), ev.clientX < j.x, j.mod);
  if (!n && !j.mod) VC.ui.toast('A janela não apanhou nenhuma sala nem ramal (da esquerda para a direita só conta o que fica todo dentro).');
};
document.addEventListener('pointerup', fimJanela, true);
document.addEventListener('pointercancel', () => { jan = null; const r = document.getElementById('plantaJanela'); if (r) r.remove(); }, true);

/* menu de contexto com a seleção múltipla: o botão direito não a desfaz */
if (P._alvoContexto) {
  const alB = P._alvoContexto;
  P._alvoContexto = function (t) { return this.multi.length >= 2 ? { tipo: 'multi', o: { nome: this.multi.length + ' objetos' } } : alB.call(this, t); };
}
if (P._acoesContexto) {
  const acB = P._acoesContexto;
  P._acoesContexto = function (alvo) {
    if (this.multi.length >= 2) return [{ ic: 'apagar', rot: 'Apagar os ' + this.multi.length + ' desenhos', js: 'VC.planta.apagarMulti()', k: 'Delete', perigo: true }, { ic: 'sel', rot: 'Limpar a seleção', js: 'VC.planta.limparMulti()', k: 'Esc' }];
    return acB.call(this, alvo);
  };
}
})();
