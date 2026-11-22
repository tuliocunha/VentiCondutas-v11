/* ============================================================
   VentiCondutas · Planta: acessórios nas condutas e curvas do desenho (Fase 4B)
   ------------------------------------------------------------
   · Acessório (A): escolha o tipo na barra de opções do painel (registo,
     corta-fogo, silenciador, flexível) e clique no ramal: fica nesse ponto.
     Δp = ζ típico × ½ρv² do troço onde está, ou o Δp do catálogo; o
     flexível conta a perda linear vezes 2 no seu comprimento.
   · Arrastar ao longo do ramal com Selecionar, Delete tira, Esc larga.
   · Regra do ramal «Curvas: pela planta»: cada curva do traçado conta na
     sua velocidade (ζ 0,25 a 90°) e o ζ global do ramal deixa de contar.
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('42-planta-acessorios');
const P = VC.planta, PN = VC.paineis, C = VC.calculo;
if (!P || !P._svg || !PN || !PN.esquemas || !C.calcularAcessorios) return;
const esc = s => VC.utils.esc(s), fmt = (v, d) => VC.utils.fmt(v, d == null ? 1 : d);
const n2 = v => Math.round(v * 100) / 100;
const porId = (l, id) => (VC.dados[l] || []).find(x => String(x.id) === String(id));
const A = () => VC.constantes.ACESSORIOS;
const vazio = v => v === undefined || v === null || String(v).trim() === '';

/* ── ferramenta ── */
P.FERRAMENTAS.push(['acess', 'fa-sliders', 'Acessório']);
P.TECLAS.acess = 'A';
if (P.ICONES) P.ICONES.acess = 'M3 12h4M17 12h4M7 7h10v10H7zM7 17L17 7';
if (P.DICAS) P.DICAS.acess = 'Escolha o tipo no painel (registo, corta-fogo, silenciador, flexível) e clique no ramal onde fica. Arraste-o ao longo do ramal com Selecionar.';
if (P.GRUPOS) { const g = P.GRUPOS.find(x => x[0] === 'condutas'); if (g && g[2].indexOf('acess') < 0) g[2].splice(2, 0, 'acess'); }
P.acessTipo = 'registo'; P.acessSel = null;
const encOpc = P._opcoesEncaixe;
P._opcoesEncaixe = function () { if (this.ferramenta === 'acess') return null; return encOpc.call(this); };

/* posição ao longo do ramal (m) do ponto q da planta */
P._sNoRamal = function (r, q) { const pr = C._projetarNoTracado(q, r.planta.pts); return pr ? pr.frac * (Number(r.L) || 0) : null; };
P._pontoEmS = function (r, s) {
  const pts = r.planta.pts, L = Number(r.L) || 0, alvo = L > 0 ? s / L : 0;
  let tot = 0; for (let i = 1; i < pts.length; i++) tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  let acc = 0, d = alvo * tot;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (acc + l >= d - 1e-9 || i === pts.length - 1) { const t = l ? Math.max(0, Math.min(1, (d - acc) / l)) : 0; return { q: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], ang: Math.atan2(b[1] - a[1], b[0] - a[0]) }; }
    acc += l;
  }
  return { q: pts[0], ang: 0 };
};
P.colocarAcessorio = function (q, tipo) {
  const p = this.pisoAtual(); if (!p || this._bloqueado()) return null;
  const tol = 14 / (this.zoom || 1); let best = null;
  (this.ramaisDoPiso ? this.ramaisDoPiso(p) : []).forEach(r => { for (let i = 1; i < r.planta.pts.length; i++) { const d = this._distSeg(q, r.planta.pts[i - 1], r.planta.pts[i])[0]; if (d < tol && (!best || d < best.d)) best = { d, r }; } });
  if (!best) { VC.ui.toast('Clique em cima de um ramal desenhado.'); return null; }
  const r = best.r, s = this._sNoRamal(r, q); if (s == null) return null;
  const antes = this._estado(), t = tipo || this.acessTipo || 'registo';
  const a = { id: 'AC' + Date.now().toString(36) + Math.floor(Math.random() * 1e4), tipo: t, s: n2(s) };
  r.acessorios = (r.acessorios || []).concat([a]);
  this._empilhar((A()[t] || {}).nome + ' em ' + r.nome, antes);
  this.acessSel = { r: r.id, a: a.id };
  if (VC.estado && VC.estado.forcarSync) VC.estado.forcarSync();
  const c = (r.acessCalc || []).find(x => x.id === a.id);
  VC.ui.toast((A()[t] || {}).nome + ' em ' + r.nome + ' a ' + fmt(a.s, 2) + ' m' + (c ? ' · ' + fmt(c.dp, 1) + ' Pa' : '') + '.');
  this.redesenhar(); return a;
};
P.retirarAcessorio = function (rid, aid) {
  const r = porId('ramais', rid); if (!r || !r.acessorios || this._bloqueado()) return false;
  const antes = this._estado(), a = r.acessorios.find(x => x.id === aid); if (!a) return false;
  r.acessorios = r.acessorios.filter(x => x.id !== aid); if (!r.acessorios.length) delete r.acessorios;
  this.acessSel = null; this._empilhar((A()[a.tipo] || {}).nome + ' tirado de ' + r.nome, antes);
  if (VC.estado && VC.estado.forcarSync) VC.estado.forcarSync();
  VC.ui.toast((A()[a.tipo] || {}).nome + ' tirado de ' + r.nome + ' (Ctrl+Z repõe).'); this.redesenhar(); return true;
};
P.tipoAcessorio = function (t) { this.acessTipo = t; this.redesenhar(); };

/* ── seleção ── */
['selecionado', 'ramalSel', 'trfSel', 'termSel', 'equipSel', 'extSel', 'abertSel', 'prumSel'].forEach(k => {
  const d = Object.getOwnPropertyDescriptor(P, k);
  if (d && d.set) Object.defineProperty(P, k, { configurable: true, enumerable: true, get: d.get, set(x) { d.set.call(this, x); if (x != null) this.acessSel = null; } });
  else if (d || k in P) { let v = d ? d.value : null; Object.defineProperty(P, k, { configurable: true, enumerable: true, get() { return v; }, set(x) { v = x; if (x != null) this.acessSel = null; } }); }
});
const limpar = o => { ['selecionado', 'ramalSel', 'trfSel', 'termSel', 'equipSel', 'extSel', 'abertSel', 'prumSel', 'trocoSel'].forEach(k => { if (k in o) o[k] = null; }); };
const limparBase = P.limparSelecao;
P.limparSelecao = function () { this.acessSel = null; return limparBase.apply(this, arguments); };
['cancelar', 'setPiso'].forEach(nome => { const base = P[nome]; if (typeof base === 'function') P[nome] = function () { this.acessSel = null; return base.apply(this, arguments); }; });
const temSelBase = P.temSelecao;
P.temSelecao = function () { return this.acessSel != null || temSelBase.call(this); };
const escBase = P.gestoEsc;
P.gestoEsc = function () { if (this.acessSel != null && !this.pendenteAtual()) { this.acessSel = null; this.redesenhar(); return 'acessorio'; } return escBase.apply(this, arguments); };
const apagarBase = P.gestoApagar;
P.gestoApagar = function () {
  if (this.acessSel != null && !this.pendenteAtual() && !(this.tracado || []).length) return this.retirarAcessorio(this.acessSel.r, this.acessSel.a) ? 'acessorio' : 'recusado';
  return apagarBase.apply(this, arguments);
};
const reporBase = P._repor;
P._repor = function () { const x = reporBase.apply(this, arguments); const s = this.acessSel, r = s && porId('ramais', s.r); if (s && !(r && (r.acessorios || []).some(a => a.id === s.a))) this.acessSel = null; return x; };

/* ── desenho (símbolos EN 12792 simplificados) ── */
P._acessHTML = function (r, a, c, z) {
  const { q, ang } = this._pontoEmS(r, c ? c.s : a.s), cor = this.corRede ? this.corRede(r.rede) : '#2f6fb5';
  const sel = this.acessSel && String(this.acessSel.r) === String(r.id) && this.acessSel.a === a.id;
  const p = this.pisoAtual(), D = (r.trocos && c && (r.trocos.find(t => t.key === c.key) || {}).Dcom) || r.Dcom || 160;
  const w = Math.max(14 / z, p && p.escala ? D / 1000 / p.escala * 1.5 : 14 / z), h = w * 0.7, Lpx = p && p.escala && c && c.L ? Math.max(w, c.L / p.escala) : w * 1.6;
  const st = '" fill="#fff" stroke="' + (sel ? VC.planta.COR_SEL : '#1e293b') + '" stroke-width="' + n2((sel ? 3 : 1.6) / z) + '"';
  let g = '';
  if (a.tipo === 'registo') g = '<circle r="' + n2(h / 2) + st + '/><line x1="' + n2(-h / 2) + '" y1="' + n2(h / 2) + '" x2="' + n2(h / 2) + '" y2="' + n2(-h / 2) + '" stroke="#1e293b" stroke-width="' + n2(2 / z) + '"/>';
  else if (a.tipo === 'cortafogo') g = '<rect x="' + n2(-w / 2) + '" y="' + n2(-h / 2) + '" width="' + n2(w) + '" height="' + n2(h) + st + '/><path d="M' + n2(-w / 2) + ',' + n2(-h / 2) + 'L' + n2(w / 2) + ',' + n2(h / 2) + 'M' + n2(w / 2) + ',' + n2(-h / 2) + 'L' + n2(-w / 2) + ',' + n2(h / 2) + '" stroke="#c0392b" stroke-width="' + n2(1.6 / z) + '"/>';
  else if (a.tipo === 'silenciador') { g = '<rect x="' + n2(-Lpx / 2) + '" y="' + n2(-h / 2) + '" width="' + n2(Lpx) + '" height="' + n2(h) + st + '/>'; for (let i = 1; i < 6; i++) g += '<line x1="' + n2(-Lpx / 2 + i * Lpx / 6) + '" y1="' + n2(-h / 2) + '" x2="' + n2(-Lpx / 2 + i * Lpx / 6 - h / 2) + '" y2="' + n2(h / 2) + '" stroke="' + cor + '" stroke-width="' + n2(1.2 / z) + '"/>'; }
  else { let d = 'M' + n2(-Lpx / 2) + ',0'; const n = 8; for (let i = 1; i <= n; i++) d += 'L' + n2(-Lpx / 2 + i * Lpx / n) + ',' + n2((i % 2 ? -1 : 1) * h / 2); g = '<rect x="' + n2(-Lpx / 2) + '" y="' + n2(-h / 2) + '" width="' + n2(Lpx) + '" height="' + n2(h) + '" fill="#fff" fill-opacity=".85" stroke="none"/><path d="' + d + '" fill="none" stroke="' + (sel ? VC.planta.COR_SEL : '#1e293b') + '" stroke-width="' + n2((sel ? 2.6 : 1.6) / z) + '"/>'; }
  const def = A()[a.tipo] || {};
  return '<g class="planta-acess" data-r="' + esc(r.id) + '" data-a="' + esc(a.id) + '" transform="translate(' + n2(q[0]) + ',' + n2(q[1]) + ') rotate(' + n2(ang * 180 / Math.PI) + ')" style="cursor:move"><title>' + esc(def.nome || a.tipo) + ' · ' + esc(r.nome) + ' a ' + fmt(c ? c.s : a.s, 2) + ' m' + (c ? ' · ' + fmt(c.dp, 1) + ' Pa (' + esc(c.origem) + ')' : '') + '</title>' + g + '</g>';
};
const svgBase = P._svg;
P._svg = function (p) {
  const s = svgBase.call(this, p); if (!p) return s;
  const z = this.zoom || 1;
  let g = '';
  (this.ramaisDoPiso ? this.ramaisDoPiso(p) : []).forEach(r => (r.acessorios || []).forEach(a => { g += this._acessHTML(r, a, (r.acessCalc || []).find(x => x.id === a.id), z); }));
  if (!g) return s;
  const corte = s.indexOf('<g class="planta-term"') >= 0 ? s.indexOf('<g class="planta-term"') : s.lastIndexOf('</svg>');
  return s.slice(0, corte) + '<g class="planta-acessorios">' + g + '</g>' + s.slice(corte);
};

/* ── barra de opções da ferramenta (no painel): o tipo do próximo acessório ── */
const painelBase = P._painel;
P._painel = function (p) {
  const h = painelBase.call(this, p);
  if (this.ferramenta !== 'acess') return h;
  const L = A();
  return '<div class="planta-card destaque"><div class="planta-card-t">Acessório a colocar</div><div class="acess-tipos" role="radiogroup">'
    + Object.keys(L).map(k => '<button type="button" role="radio" aria-checked="' + (this.acessTipo === k) + '" class="btn' + (this.acessTipo === k ? ' primario' : '') + '" onclick="VC.planta.tipoAcessorio(\'' + k + '\')">' + esc(L[k].nome) + '</button>').join('')
    + '</div><p class="planta-meta">Clique no ramal onde fica. ' + esc(L[this.acessTipo].nota || '') + '</p></div>' + h;
};

/* ── rato ── */
const prepBase = P.prepararVista;
P.prepararVista = function () {
  prepBase.apply(this, arguments);
  const palco = this._palco && this._palco();
  if (!palco || palco._vcAcess) return;
  palco._vcAcess = true;
  let arr = null;
  palco.addEventListener('pointerdown', ev => {
    if (ev.button !== 0 || this._espaco) return;
    if (ev.target.closest && ev.target.closest('.planta-flut, .planta-estado')) return;
    if (this.ferramenta === 'acess') { ev.stopPropagation(); ev.preventDefault(); this.colocarAcessorio(this._pontoBruto ? this._pontoBruto(ev) : this._ponto(ev)); return; }
    if (this.ferramenta !== 'sel') return;
    const g = ev.target.closest && ev.target.closest('.planta-acess'); if (!g) return;
    ev.stopPropagation(); ev.preventDefault();
    const r = porId('ramais', g.dataset.r), a = r && (r.acessorios || []).find(x => x.id === g.dataset.a); if (!a) return;
    const novo = !(this.acessSel && this.acessSel.a === a.id);
    if (novo) { limpar(this); this.acessSel = { r: r.id, a: a.id }; }
    arr = { r, a, novo, antes: this._estado(), x0: ev.clientX, y0: ev.clientY, mexeu: false, livre: !this._bloqueado() };
    try { palco.setPointerCapture(ev.pointerId); } catch (e) { /* opcional */ }
  }, true);
  palco.addEventListener('pointermove', ev => {
    if (!arr) return; ev.stopPropagation();
    if (!arr.livre || (!arr.mexeu && Math.hypot(ev.clientX - arr.x0, ev.clientY - arr.y0) < 4)) return;
    arr.mexeu = true;
    const s = this._sNoRamal(arr.r, this._pontoBruto ? this._pontoBruto(ev) : this._ponto(ev)); if (s == null) return;
    arr.a.s = n2(s); (arr.r.acessCalc || []).forEach(c => { if (c.id === arr.a.id) c.s = arr.a.s; });
    this.redesenharDesenho ? this.redesenharDesenho() : this.redesenhar();
  }, true);
  const fim = ev => {
    if (!arr) return; ev.stopPropagation();
    const a = arr; arr = null;
    if (a.mexeu) { this._empilhar('acessório movido em ' + a.r.nome, a.antes); if (VC.estado && VC.estado.forcarSync) VC.estado.forcarSync(); }
    if (a.mexeu || a.novo) this.redesenhar();
  };
  palco.addEventListener('pointerup', fim, true);
  palco.addEventListener('pointercancel', fim, true);
};

/* ── painéis ── */
const acessorio = {
  titulo: o => (A()[o.a.tipo] || {}).nome + ' · ' + o.r.nome, icone: 'fa-sliders', rotulo: 'Acessório',
  avisos: () => [],
  campos: [
    { id: 'tipo', rot: 'Tipo', tipo: 'opcoes', ess: true, opcoes: () => Object.keys(A()).map(k => [k, A()[k].nome]), ler: o => o.a.tipo, escrever: (o, v) => { if (A()[v]) o.a.tipo = v; } },
    { id: 's', rot: 'Posição no ramal', tipo: 'num', ess: true, un: 'm', min: 0, passo: 0.1, ler: o => o.a.s, escrever: (o, v) => { const n = VC.utils.num(v); if (n >= 0) o.a.s = Math.min(n, Number(o.r.L) || n); } },
    { id: 'dpFab', rot: 'Δp do catálogo', tipo: 'num', ess: true, un: 'Pa', min: 0, passo: 1, ler: o => (Number(o.a.dpFab) > 0 ? o.a.dpFab : ''),
      proposto: o => { const c = (o.r.acessCalc || []).find(x => x.id === o.a.id); return c && !(Number(o.a.dpFab) > 0) ? { v: n2(c.dp), origem: 'calculo', nota: c.origem } : null; },
      escrever: (o, v) => { const n = VC.utils.num(v); if (n > 0) o.a.dpFab = n; else delete o.a.dpFab; }, ajuda: 'Com o Δp do fabricante para este caudal, a app usa-o em vez do ζ típico.' },
    { id: 'L', rot: 'Comprimento', tipo: 'num', un: 'm', min: 0, passo: 0.1, vis: o => !!(A()[o.a.tipo] || {}).L, ler: o => (Number(o.a.L) > 0 ? o.a.L : ''),
      proposto: o => ({ v: (A()[o.a.tipo] || {}).L, origem: 'norma' }), escrever: (o, v) => { const n = VC.utils.num(v); if (n > 0) o.a.L = n; else delete o.a.L; } }
  ],
  resultado: o => {
    const c = (o.r.acessCalc || []).find(x => x.id === o.a.id) || {}, def = A()[o.a.tipo] || {};
    return [['Ramal', o.r.nome, 'troço a ' + fmt(c.s, 2) + ' m'], ['Velocidade no troço', fmt(c.v, 2) + ' m/s', ''], ['Δp', fmt(c.dp, 1) + ' Pa', c.origem || ''], ['Nota', def.nota || '—', '']];
  },
  porFazer: o => (o.a.tipo === 'silenciador' && !(Number(o.a.dpFab) > 0) ? ['escreva o Δp do silenciador escolhido (catálogo)'] : []),
  acoes: o => [['Ver o ramal', 'VC.planta.selecionarRamal(' + JSON.stringify(o.r.id).replace(/"/g, "'") + ')'], ['Tirar (Delete)', 'VC.planta.retirarAcessorio(' + JSON.stringify(o.r.id).replace(/"/g, "'") + ",'" + esc(o.a.id) + "')"]]
};
PN.esquemas.acessorio = acessorio;
const obterBase = PN._obter.bind(PN);
PN._obter = function (tipo, id) {
  if (tipo === 'acessorio') { const [rid, aid] = String(id).split('|'); const r = porId('ramais', rid), a = r && (r.acessorios || []).find(x => x.id === aid); return a ? { id: rid + '|' + aid, r, a } : null; }
  return obterBase(tipo, id);
};
const selBase = PN.selecao.bind(PN);
PN.selecao = function () {
  const s = P.acessSel;
  if (s && !P.pendenteAtual() && !(P.tracado || []).length) { const o = PN._obter('acessorio', s.r + '|' + s.a); if (o) return { tipo: 'acessorio', o }; }
  return selBase();
};
/* regra do ramal: curvas pela planta; e o resumo no resultado do ramal */
const rm = PN.esquemas.ramal;
if (rm) {
  const i = rm.campos.findIndex(c => c.id === 'esp_reajuste');
  const campo = { id: 'esp_curvas', rot: 'Curvas', tipo: 'opcoes', opcoes: () => [['', '—'], ['manual', 'no ζ do ramal (como antes)'], ['planta', 'pela planta: cada curva na sua velocidade']],
    ler: r => ((r.especificacao || {}).curvas || ''), proposto: r => { const o = C.origemSpec(r, 'curvas'); return o && o !== r ? { v: o.especificacao.curvas, origem: 'herdado', nota: 'de ' + o.nome } : { v: 'manual', origem: 'setup' }; },
    escrever: (r, v) => { const e = r.especificacao = Object.assign({}, r.especificacao); if (vazio(v)) delete e.curvas; else e.curvas = v; if (!Object.keys(e).length) delete r.especificacao; },
    ajuda: 'Pela planta, o ζ global do ramal deixa de contar: entra a saída do pai (0,3) e cada curva do desenho (0,25 a 90°) na velocidade do seu troço.' };
  if (i >= 0) rm.campos.splice(i, 0, campo); else rm.campos.push(campo);
  const resBase = rm.resultado;
  rm.resultado = (r, p) => {
    const out = resBase(r, p);
    if ((r.acessCalc || []).length) out.push(['Acessórios', r.acessCalc.length + ' · ' + fmt(r.deltaPacess, 1) + ' Pa', r.acessCalc.map(a => a.nome + ' ' + fmt(a.dp, 1) + ' Pa').join(' · ')]);
    if ((r.curvasCalc || []).length) out.push(['Curvas (planta)', r.curvasCalc.length + ' · ' + fmt(r.deltaPcurvas, 1) + ' Pa', r.curvasCalc.map(c => c.ang + '°').join(', ') + ' · o ζ do ramal não conta']);
    return out;
  };
  const acBase = rm.acoes;
  rm.acoes = (r, p) => (acBase ? acBase(r, p) : []).concat([['Pôr um acessório (A)', "VC.planta.escolherFerramenta ? VC.planta.escolherFerramenta('acess') : VC.planta.setFerramenta('acess')"]]);
}
/* menu de contexto (quando existe): ramal → acessório; acessório → tirar */
if (P._acoesContexto && P._alvoContexto) {
  const acB = P._acoesContexto, alB = P._alvoContexto;
  P._alvoContexto = function (t) {
    const g = t.closest && t.closest('.planta-acess');
    if (g) { const r = porId('ramais', g.dataset.r), a = r && (r.acessorios || []).find(x => x.id === g.dataset.a); if (a) return { tipo: 'acessorio', o: { id: r.id + '|' + a.id, nome: (A()[a.tipo] || {}).nome, r, a }, sel: () => { limpar(this); this.acessSel = { r: r.id, a: a.id }; } }; }
    return alB.call(this, t);
  };
  P._acoesContexto = function (alvo) {
    if (alvo && alvo.tipo === 'acessorio') return [{ ic: 'apagar', rot: 'Tirar o acessório', js: 'VC.planta.retirarAcessorio(' + JSON.stringify(alvo.o.r.id).replace(/"/g, "'") + ",'" + esc(alvo.o.a.id) + "')", k: 'Delete', perigo: true }];
    const out = acB.call(this, alvo);
    if (alvo && alvo.tipo === 'ramal') out.splice(2, 0, { ic: 'acess', rot: 'Pôr um acessório (registo, corta-fogo…)', js: "VC.planta.escolherFerramenta ? VC.planta.escolherFerramenta('acess') : VC.planta.setFerramenta('acess')", k: 'A' });
    return out;
  };
}
})();
