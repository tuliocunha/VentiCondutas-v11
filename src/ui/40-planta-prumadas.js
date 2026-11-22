/* ============================================================
   VentiCondutas · Planta: prumadas entre pisos (Fase 4A)
   ------------------------------------------------------------
   Uma prumada é um ramal vertical: sai de um ponto de um ramal (ou de um
   equipamento) num piso e chega a outro piso. Na planta é um círculo com
   cruz (EN 12792) nos dois pisos; o L é a diferença das cotas (ou o
   pé-direito); a posição da derivação no ramal-pai lê-se do ponto de saída.
     · Prumada (K): clique no ramal ou no equipamento → escolhe o piso de
       chegada e se é um ramal novo ou um que ainda não está desenhado;
     · no piso de chegada, traçar um ramal (L) a partir do círculo faz dele
       um sub-ramal da prumada;
     · arrastar o círculo com Selecionar, Delete tira-a da planta, Esc larga.
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('40-planta-prumadas');
const P = VC.planta, PN = VC.paineis, C = VC.calculo;
if (!P || !P._svg || !PN || !PN.esquemas || !C.comprimentoPrumada) return;
const esc = s => VC.utils.esc(s), fmt = (v, d) => VC.utils.fmt(v, d == null ? 1 : d);
const r1 = v => Math.round(v * 10) / 10, n2 = v => Math.round(v * 100) / 100;
const porId = (l, id) => (VC.dados[l] || []).find(x => String(x.id) === String(id));
const D2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const vazio = v => v === undefined || v === null || String(v).trim() === '';
const pisos = () => VC.dados.plantas || [];
const nomePiso = id => ((pisos().find(p => p.id === id) || {}).nome || id);

/* ── ferramenta ── */
P.FERRAMENTAS.push(['prumada', 'fa-arrows-up-down', 'Prumada']);
P.TECLAS.prumada = 'K';
if (P.ICONES) P.ICONES.prumada = 'M12 2v20M8 6l4-4 4 4M8 18l4 4 4-4M7 12a5 5 0 1 0 10 0a5 5 0 1 0-10 0';
if (P.DICAS) P.DICAS.prumada = 'Clique num ramal (ou num equipamento) onde a conduta sobe ou desce; escolha o piso de chegada no painel. No outro piso, trace os ramais a partir do círculo.';
const encOpc = P._opcoesEncaixe;
P._opcoesEncaixe = function () { if (this.ferramenta === 'prumada') return { salas: false, ramais: true }; if (this.ferramenta === 'sel' && this._arrPrum) return { salas: false, ramais: true }; return encOpc.call(this); };

/* ── dados ── */
P.prumSel = null; P.pendentePrum = null;
P.prumadas = function () { return (VC.dados.ramais || []).filter(r => r.prumada && r.prumada.de && r.prumada.para); };
/* pontos de prumada neste piso: [{ r, lado: 'de'|'para', q }] */
P.pontosPrumada = function (p) {
  const out = []; if (!p) return out;
  this.prumadas().forEach(r => ['de', 'para'].forEach(l => { const x = r.prumada[l]; if (x.pisoId === p.id) out.push({ r, lado: l, q: [x.x, x.y] }); }));
  return out;
};
/* sobe ou desce de «de» para «para» (pelas cotas; sem cotas, pela ordem dos pisos) */
P.sentidoPrumada = function (r) {
  const a = pisos().find(p => p.id === r.prumada.de.pisoId), b = pisos().find(p => p.id === r.prumada.para.pisoId);
  if (a && b && a.cota != null && b.cota != null && Number(a.cota) !== Number(b.cota)) return Number(b.cota) > Number(a.cota) ? 1 : -1;
  return pisos().indexOf(b) >= pisos().indexOf(a) ? 1 : -1;
};
P.iniciarPrumada = function (q) {
  const p = this.pisoAtual(); if (!p || this._bloqueado()) return null;
  const tol = 14 / (this.zoom || 1);
  const u = (this.equipamentosDoPiso ? this.equipamentosDoPiso(p) : []).find(x => D2(q, [x.planta.x, x.planta.y]) < tol);
  const e = !u && this._encaixar ? this._encaixar(q) : null;
  if (!u && !(e && e.ramal)) { VC.ui.toast('Clique num ramal desenhado ou num equipamento: é daí que sai a prumada.'); return null; }
  if (pisos().length < 2) { VC.ui.toast('Só há um piso: crie o outro piso (+ Piso) antes de desenhar a prumada.'); return null; }
  const pt = u ? [u.planta.x, u.planta.y] : e.q;
  this.pendentePrum = { pisoId: p.id, x: r1(pt[0]), y: r1(pt[1]), pai: e && e.ramal ? e.ramal.nome : null, uta: u ? u.id : null };
  this.redesenhar();
  return this.pendentePrum;
};
/* ramais que podem ser esta prumada: filhos do mesmo pai (ou principais do equipamento) ainda sem desenho */
P._candidatosPrumada = function (pp) {
  return (VC.dados.ramais || []).filter(r => !r.planta && !r.prumada && (pp.pai ? r.parente === pp.pai : (!r.parente && String(r.utaRef) === String(pp.uta))));
};
P.criarPrumada = function (opc) {
  const pp = this.pendentePrum; if (!pp || this._bloqueado()) return null;
  if (!opc.para || opc.para === pp.pisoId) { VC.ui.toast('Escolha o piso de chegada.'); return null; }
  const antes = this._estado();
  let r = opc.ramal ? (VC.dados.ramais || []).find(x => x.nome === opc.ramal) : null;
  if (!r) r = this._novoRamal(pp.pai, pp.uta);
  if (!r) return null;
  r.prumada = { de: { pisoId: pp.pisoId, x: pp.x, y: pp.y }, para: { pisoId: opc.para, x: pp.x, y: pp.y } };
  delete r.sPai;   // a posição da derivação passa a vir do desenho (ponto de saída)
  const c = C.comprimentoPrumada(r);
  if (c && (opc.ramal == null || opc.usarL)) r.L = n2(c.L);
  if (!opc.ramal) r.zeta = 0.6;   // duas curvas de 90° (≈ 0,3 cada)
  this.pendentePrum = null;
  this._empilhar('prumada ' + r.nome + ' (' + nomePiso(pp.pisoId) + ' → ' + nomePiso(opc.para) + ')', antes);
  this.prumSel = r.id;
  if (VC.perf) ['cacheMaterializacao', 'ordenacaoTopologica', 'cacheBalanco'].forEach(k => { if (VC.perf[k] && VC.perf[k].invalidar) VC.perf[k].invalidar(); });
  if (VC.estado && VC.estado.forcarSync) VC.estado.forcarSync();
  VC.ui.toast('Prumada ' + r.nome + ': ' + nomePiso(pp.pisoId) + ' → ' + nomePiso(opc.para) + (c ? ' · L ' + fmt(r.L, 2) + ' m (' + c.origem + ')' : ' · escreva o L (sem cotas nem pé-direito)') + '. No outro piso, trace os ramais a partir do círculo.');
  this.redesenhar();
  return r;
};
P._criarPrumadaDoPainel = function () {
  const v = id => { const el = document.getElementById(id); return el ? (el.type === 'checkbox' ? el.checked : el.value) : null; };
  return this.criarPrumada({ para: v('pmPara'), ramal: v('pmRamal') || null, usarL: !!v('pmUsarL') });
};
P.retirarPrumada = function (id) {
  const r = porId('ramais', id); if (!r || !r.prumada || this._bloqueado()) return false;
  const antes = this._estado(); delete r.prumada; this.prumSel = null;
  this._empilhar('prumada ' + r.nome + ' tirada da planta', antes);
  if (VC.estado && VC.estado.forcarSync) VC.estado.forcarSync();
  VC.ui.toast('Prumada ' + r.nome + ' tirada da planta; o ramal fica na tabela (Ctrl+Z repõe).'); this.redesenhar(); return true;
};
P.verPrumada = function (id, lado) {
  const r = porId('ramais', id); if (!r || !r.prumada) return;
  const x = r.prumada[lado]; if (this.setPiso) this.setPiso(x.pisoId);
  this.prumSel = r.id; const z = this.zoom || 1, [W, H] = this._dim ? this._dim() : [800, 600];
  this.vx = x.x - W / 2 / z; this.vy = x.y - H / 2 / z; if (this.aplicarVista) this.aplicarVista();
  this.redesenhar();
};

/* ── pendente, seleção, teclas ── */
const pendBase = P.pendenteAtual;
P.pendenteAtual = function () { return this.pendentePrum ? 'a prumada' : pendBase.call(this); };
['cancelar', 'setFerramenta', 'setPiso'].forEach(nome => {
  const base = P[nome]; if (typeof base !== 'function') return;
  P[nome] = function () { this.pendentePrum = null; if (nome !== 'setPiso') this.prumSel = null; return base.apply(this, arguments); };
});
['selecionado', 'ramalSel', 'trfSel', 'termSel', 'equipSel', 'extSel', 'abertSel'].forEach(k => {
  const d = Object.getOwnPropertyDescriptor(P, k);
  if (d && d.set) Object.defineProperty(P, k, { configurable: true, enumerable: true, get: d.get, set(x) { d.set.call(this, x); if (x != null) this.prumSel = null; } });
  else { let v = d ? d.value : null; Object.defineProperty(P, k, { configurable: true, enumerable: true, get() { return v; }, set(x) { v = x; if (x != null) this.prumSel = null; } }); }
});
const limpar = o => { o.selecionado = null; o.ramalSel = null; o.trfSel = null; o.termSel = null; o.equipSel = null; o.extSel = null; o.abertSel = null; o.trocoSel = null; };
const limparBase = P.limparSelecao;
P.limparSelecao = function () { this.prumSel = null; return limparBase.apply(this, arguments); };
const temSelBase = P.temSelecao;
P.temSelecao = function () { return this.prumSel != null || temSelBase.call(this); };
const escBase = P.gestoEsc;
P.gestoEsc = function () { if (this.prumSel != null && !this.pendenteAtual()) { this.prumSel = null; this.redesenhar(); return 'prumada'; } return escBase.apply(this, arguments); };
const apagarBase = P.gestoApagar;
P.gestoApagar = function () {
  if (this.prumSel != null && !this.pendenteAtual() && !(this.rascunho || []).length && !(this.tracado || []).length) return this.retirarPrumada(this.prumSel) ? 'prumada' : 'recusado';
  return apagarBase.apply(this, arguments);
};
const reporBase = P._repor;
P._repor = function () { const x = reporBase.apply(this, arguments); if (this.prumSel != null && !(porId('ramais', this.prumSel) || {}).prumada) this.prumSel = null; return x; };

/* encaixe nos círculos das prumadas e traçado a partir deles (sub-ramal da prumada) */
const encBase = P.encaixe;
P.encaixe = function (raw, opts) {
  const e = encBase.call(this, raw, opts);
  if (!opts || !opts.ramais) return e;
  const tol = 14 / (this.zoom || 1); let best = null;
  this.pontosPrumada(this.pisoAtual()).forEach(o => { const d = D2(raw, o.q); if (d < tol && (!best || d < best.d)) best = { d, q: o.q.slice(), tipo: 'prumada', rot: 'prumada ' + o.r.nome }; });
  if (best && (!e.tipo || e.tipo === 'aresta' || e.tipo === 'ramal' || e.tipo === 'grelha' || best.d <= (e.d || 0))) return best;
  return e;
};
const termBase = P.terminarTracado;
P.terminarTracado = function () {
  const p = this.pisoAtual(), x = termBase.apply(this, arguments), pr = this.pendenteRamal;
  if (pr && p) {
    const o = this.pontosPrumada(p).find(k => D2(k.q, pr.pts[0]) <= 1 && (k.lado === 'para' || !pr.pai));
    if (o && o.lado === 'para') { pr.pai = o.r.nome; pr.prumada = o.r.id; this.redesenhar(); }
  }
  return x;
};

/* ── desenho: círculo com cruz (conduta vertical, EN 12792) ── */
P._prumadaHTML = function (o, z) {
  const r = o.r, cor = this.corRede ? this.corRede(r.rede) : '#2f6fb5', q = o.q, R = 9 / z, s = R * 0.7;
  const sel = String(this.prumSel) === String(r.id), sobe = this.sentidoPrumada(r) * (o.lado === 'de' ? 1 : -1) > 0;
  const outro = o.lado === 'de' ? r.prumada.para.pisoId : r.prumada.de.pisoId;
  let h = '<circle cx="' + n2(q[0]) + '" cy="' + n2(q[1]) + '" r="' + n2(R) + '" fill="#fff" stroke="' + (sel ? '#f2c94c' : cor) + '" stroke-width="' + n2((sel ? 3.5 : 2.4) / z) + '"/>'
    + '<path d="M' + n2(q[0] - s) + ',' + n2(q[1] - s) + 'L' + n2(q[0] + s) + ',' + n2(q[1] + s) + 'M' + n2(q[0] + s) + ',' + n2(q[1] - s) + 'L' + n2(q[0] - s) + ',' + n2(q[1] + s) + '" stroke="' + cor + '" stroke-width="' + n2(1.8 / z) + '"/>';
  if (z >= 0.45) h += '<text x="' + n2(q[0] + R + 3 / z) + '" y="' + n2(q[1] + 3 / z) + '" font-size="' + n2(8 / z) + '" font-weight="800" fill="' + cor + '" paint-order="stroke" stroke="#fff" stroke-width="' + n2(3 / z) + '">' + esc(r.nome) + ' ' + (sobe ? '↑' : '↓') + ' ' + esc(nomePiso(outro)) + '</text>';
  return '<g class="planta-prumada" data-r="' + esc(r.id) + '" data-lado="' + o.lado + '" style="cursor:move"><title>Prumada ' + esc(r.nome) + ' · ' + (sobe ? 'sobe' : 'desce') + ' para ' + esc(nomePiso(outro)) + ' · L ' + fmt(r.L, 2) + ' m · ' + esc(r.secaoCalc || (r.Dcom ? 'Ø' + r.Dcom : '')) + ' · ' + fmt(r.Q, 0) + ' m³/h</title>' + h + '</g>';
};
const svgBase = P._svg;
P._svg = function (p) {
  const s = svgBase.call(this, p);
  if (!p) return s;
  const z = this.zoom || 1;
  let g = this.pontosPrumada(p).map(o => this._prumadaHTML(o, z)).join('');
  const pp = this.pendentePrum;
  if (pp && pp.pisoId === p.id) g += '<circle class="planta-prumada-nova" cx="' + pp.x + '" cy="' + pp.y + '" r="' + n2(9 / z) + '" fill="none" stroke="#f2c94c" stroke-width="' + n2(3 / z) + '" stroke-dasharray="' + n2(3 / z) + ' ' + n2(2 / z) + '"/>';
  if (!g) return s;
  const corte = s.indexOf('<g class="planta-term"') >= 0 ? s.indexOf('<g class="planta-term"') : s.lastIndexOf('</svg>');
  return s.slice(0, corte) + '<g class="planta-prumadas">' + g + '</g>' + s.slice(corte);
};

/* ── cartão da prumada nova ── */
const painelBase = P._painel;
P._painel = function (p) {
  const h = painelBase.call(this, p), pp = this.pendentePrum;
  if (!pp) return h;
  const outros = pisos().filter(x => x.id !== pp.pisoId), cand = this._candidatosPrumada(pp), u = pp.uta && porId('utas', pp.uta);
  // piso proposto: onde já estão desenhados os sub-ramais do ramal candidato; senão o piso seguinte da lista
  const filhos = cand.reduce((acc, r) => acc.concat((VC.dados.ramais || []).filter(f => f.parente === r.nome && f.planta)), []);
  const iAqui = pisos().findIndex(x => x.id === pp.pisoId);
  const pref = (filhos.find(f => f.planta.pisoId !== pp.pisoId) || {}).planta ? filhos.find(f => f.planta.pisoId !== pp.pisoId).planta.pisoId : (pisos()[iAqui + 1] || pisos()[iAqui - 1] || {}).id;
  const prop = id => { const c = C.comprimentoPrumada({ prumada: { de: { pisoId: pp.pisoId }, para: { pisoId: id } } }); return c ? fmt(c.L, 2) + ' m (' + c.origem + ')' : 'sem cotas nem pé-direito'; };
  return '<div class="planta-card destaque"><div class="planta-card-t">Nova prumada</div>'
    + '<p class="planta-meta">Sai ' + (pp.pai ? 'do ramal <b>' + esc(pp.pai) + '</b>' : 'do equipamento <b>' + esc(u ? u.nome : '') + '</b>') + ' no ' + esc(nomePiso(pp.pisoId)) + '.</p>'
    + '<label for="pmPara">Chega ao piso</label><select id="pmPara">' + outros.map(x => '<option value="' + esc(x.id) + '"' + (x.id === pref ? ' selected' : '') + '>' + esc(x.nome) + ' · L ' + prop(x.id) + '</option>').join('') + '</select>'
    + '<label for="pmRamal">Ramal</label><select id="pmRamal"><option value="">— novo ' + (pp.pai ? 'sub-ramal de ' + esc(pp.pai) : 'ramal principal') + ' —</option>' + cand.map((r, i) => '<option value="' + esc(r.nome) + '"' + (i === 0 ? ' selected' : '') + '>' + esc(r.nome) + ' · ainda sem desenho · L ' + fmt(r.L, 2) + ' m</option>').join('') + '</select>'
    + (cand.length ? '<label class="planta-chk"><input type="checkbox" id="pmUsarL"> Num ramal existente, usar o L das cotas</label>' : '')
    + '<div class="planta-acoes"><button class="btn primario" onclick="VC.planta._criarPrumadaDoPainel()">Criar prumada</button><button class="btn" onclick="VC.planta.cancelar()">Cancelar</button></div></div>' + h;
};

/* ── rato ── */
const prepBase = P.prepararVista;
P.prepararVista = function () {
  prepBase.apply(this, arguments);
  const palco = this._palco && this._palco();
  if (!palco || palco._vcPrum) return;
  palco._vcPrum = true;
  let arr = null;
  palco.addEventListener('pointerdown', ev => {
    if (ev.button !== 0 || this._espaco) return;
    if (ev.target.closest && ev.target.closest('.planta-flut, .planta-estado')) return;
    if (this.ferramenta === 'prumada') { ev.stopPropagation(); ev.preventDefault(); this.iniciarPrumada(this._ponto(ev)); return; }
    if (this.ferramenta !== 'sel') return;
    const g = ev.target.closest && ev.target.closest('.planta-prumada'); if (!g) return;
    ev.stopPropagation(); ev.preventDefault();
    const r = porId('ramais', g.dataset.r); if (!r || !r.prumada) return;
    const novo = String(this.prumSel) !== String(r.id);
    if (novo) { limpar(this); this.prumSel = r.id; }
    this._arrPrum = true;
    arr = { pos: r.prumada[g.dataset.lado], novo, antes: this._estado(), x0: ev.clientX, y0: ev.clientY, mexeu: false, livre: !this._bloqueado() };
    try { palco.setPointerCapture(ev.pointerId); } catch (e) { /* opcional */ }
  }, true);
  palco.addEventListener('pointermove', ev => {
    if (!arr) return; ev.stopPropagation();
    if (!arr.livre || (!arr.mexeu && Math.hypot(ev.clientX - arr.x0, ev.clientY - arr.y0) < 4)) return;
    arr.mexeu = true;
    const q = this._ponto(ev); arr.pos.x = r1(q[0]); arr.pos.y = r1(q[1]);
    this.redesenharDesenho ? this.redesenharDesenho() : this.redesenhar();
  }, true);
  const fim = ev => {
    if (!arr) return; ev.stopPropagation();
    const a = arr; arr = null; this._arrPrum = false;
    if (a.mexeu) { this._empilhar('prumada movida', a.antes); if (VC.estado && VC.estado.forcarSync) VC.estado.forcarSync(); }
    if (a.mexeu || a.novo) this.redesenhar();
  };
  palco.addEventListener('pointerup', fim, true);
  palco.addEventListener('pointercancel', fim, true);
};

/* ── painel ── */
const prumada = {
  titulo: r => 'Prumada ' + r.nome, icone: 'fa-arrows-up-down', rotulo: 'Prumada',
  avisos: r => [r.nome],
  campos: [
    { id: 'nome', rot: 'Nome', tipo: 'texto', ess: true, ler: r => r.nome, acao: (r, v) => P.renomearRamalPlanta(r.id, v) },
    { id: 'para', rot: 'Chega ao piso', tipo: 'opcoes', ess: true, opcoes: r => pisos().filter(x => x.id !== r.prumada.de.pisoId).map(x => [x.id, x.nome]),
      ler: r => r.prumada.para.pisoId, escrever: (r, v) => { if (v && v !== r.prumada.de.pisoId) r.prumada.para.pisoId = v; } },
    { id: 'L', rot: 'Comprimento (L)', tipo: 'num', ess: true, un: 'm', min: 0, passo: 0.05, ler: r => r.L,
      proposto: r => { const c = C.comprimentoPrumada(r); return c ? { v: n2(c.L), origem: 'piso', nota: c.origem } : null; },
      escrever: (r, v) => { const n = VC.utils.num(v); if (n > 0) r.L = n; }, ajuda: 'Diferença das cotas dos pisos (painel do piso); sem cotas, o pé-direito do piso de baixo. Some as partes horizontais, se as houver.' },
    { id: 'zeta', rot: 'ζ (curvas e acessórios)', tipo: 'num', un: '', min: 0, passo: 0.1, ler: r => r.zeta, proposto: () => ({ v: 0.6, origem: 'norma', nota: '2 curvas de 90°' }), escrever: (r, v) => { r.zeta = VC.utils.num(v); } }
  ],
  resultado: r => {
    const fil = (VC.dados.ramais || []).filter(x => x.parente === r.nome).map(x => x.nome);
    return [
      ['De', nomePiso(r.prumada.de.pisoId), r.parente ? 'ramal ' + r.parente + (r.sNoPai != null ? ' a ' + fmt(r.sNoPai, 2) + ' m (' + (r.sNoPaiOrigem === 'planta' ? 'planta' : r.sNoPaiOrigem) + ')' : '') : 'equipamento'],
      ['Para', nomePiso(r.prumada.para.pisoId), P.sentidoPrumada(r) > 0 ? 'sobe' : 'desce'],
      ['Caudal', fmt(r.Q, 0) + ' m³/h', ''],
      ['Secção', r.secaoCalc || (r.Dcom ? 'Ø' + r.Dcom : '—'), 'v ' + fmt(r.v, 2) + ' m/s'],
      ['Δp da prumada / acumulado', fmt(r.deltaPTroco, 1) + ' / ' + fmt(r.deltaPAcumulado, 1) + ' Pa', ''],
      ['Sai dela', fil.length ? fil.join(', ') : '—', fil.length ? '' : 'trace no outro piso a partir do círculo (L)']
    ];
  },
  porFazer: r => (C.comprimentoPrumada(r) ? [] : ['dê as cotas dos pisos (painel do piso) ou escreva o L']),
  acoes: r => {
    const id = "'" + esc(String(r.id)) + "'", p = P.pisoAtual(), aqui = p && r.prumada.de.pisoId === p.id ? 'de' : 'para', ali = aqui === 'de' ? 'para' : 'de';
    return [['Ver no ' + nomePiso(r.prumada[ali].pisoId), 'VC.planta.verPrumada(' + id + ",'" + ali + "')", true], ['Tirar da planta (Delete)', 'VC.planta.retirarPrumada(' + id + ')']];
  }
};
PN.esquemas.prumada = prumada;
const obterBase = PN._obter.bind(PN);
PN._obter = function (tipo, id) { if (tipo === 'prumada') { const r = porId('ramais', id); return r && r.prumada ? r : null; } return obterBase(tipo, id); };
const selBase = PN.selecao.bind(PN);
PN.selecao = function () {
  if (P.prumSel != null && !P.pendenteAtual() && !(P.rascunho || []).length && !(P.tracado || []).length) { const r = porId('ramais', P.prumSel); if (r && r.prumada) return { tipo: 'prumada', o: r }; }
  return selBase();
};
})();
