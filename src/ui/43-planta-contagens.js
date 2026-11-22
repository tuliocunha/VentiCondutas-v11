/* ============================================================
   VentiCondutas · Planta: contagens por ícones (Fase 5A)
   ------------------------------------------------------------
   Pessoas, sanitas, urinóis, duches e lugares de estacionamento contam-se
   pondo ícones na sala, como num desenho de arquitetura. A contagem vai
   direta para o campo da sala (ocupação N, Tabela 13, lugares) e fica no
   desfazer. Com Selecionar, um clique no ícone seleciona-o; Delete tira-o
   e a contagem acompanha.
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('43-planta-contagens');
const P = VC.planta, PN = VC.paineis;
if (!P || !P._svg || !P.definirN || !P.definirSanitaria) return;
const esc = s => VC.utils.esc(s), r1 = v => Math.round(v * 10) / 10, n2 = v => Math.round(v * 100) / 100;
const porId = (l, id) => (VC.dados[l] || []).find(x => String(x.id) === String(id));

/* tipo de ícone → campo da sala, tipos de sala aceites, desenho (24×24, centrado em 12,12) */
P.ICONES_CONTAGEM = {
  pessoa: { nome: 'Pessoa', campo: 'N', salas: null, d: 'M12 4.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5M7 20v-5a5 5 0 0 1 10 0v5' },
  sanita: { nome: 'Sanita', campo: 'numSanitas', salas: /^(Sanitários|Balneários)$/, d: 'M7 4h7v6H7zM5 10h14a7 6 0 0 1-14 0M9 16l-1 4h8l-1-4' },
  urinol: { nome: 'Urinol', campo: 'numUrinois', salas: /^(Sanitários|Balneários)$/, d: 'M8 4h8v8a4 4 0 0 1-8 0zM12 16v4' },
  duche: { nome: 'Duche', campo: 'numDuches', salas: /^(Sanitários|Balneários)$/, d: 'M5 9a7 5 0 0 1 14 0zM8 13v2M12 13v3M16 13v2M10 17v2M14 17v2' },
  carro: { nome: 'Lugar de estacionamento', campo: 'lugares', salas: /^Garagem$/, d: 'M4 15v-4l2-5h12l2 5v4zM4 15v3M20 15v3M7 12h2M15 12h2' }
};
const IDS = { pessoa: 'icPessoa', sanita: 'icSanita', urinol: 'icUrinol', duche: 'icDuche', carro: 'icCarro' };
const TIPO_DE = Object.keys(IDS).reduce((o, k) => { o[IDS[k]] = k; return o; }, {});
Object.keys(IDS).forEach(k => {
  const id = IDS[k], c = P.ICONES_CONTAGEM[k];
  P.FERRAMENTAS.push([id, 'fa-user', c.nome]);
  if (P.ICONES) P.ICONES[id] = c.d;
  if (P.DICAS) P.DICAS[id] = 'Clique dentro da sala para pôr ' + (k === 'pessoa' ? 'uma pessoa: conta a ocupação N' : k === 'carro' ? 'um lugar: conta os lugares da garagem' : 'um aparelho: conta na Tabela 13') + '. Selecione o ícone (V) e Delete para tirar.';
});
P.TECLAS.icPessoa = 'C';
if (P.GRUPOS && !P.GRUPOS.some(g => g[0] === 'contar')) P.GRUPOS.splice(P.GRUPOS.findIndex(g => g[0] === 'modificar'), 0, ['contar', 'Ocupação e aparelhos', Object.keys(IDS).map(k => IDS[k])]);
P.iconeSel = null;

const contar = (e, tipo) => ((e.planta && e.planta.icones) || []).filter(i => i.tipo === tipo).length;
/* põe a contagem no campo da sala (só se há ícones desse tipo, ou se havia e foram todos tirados) */
P._aplicarContagem = function (e, tipo, havia) {
  const c = this.ICONES_CONTAGEM[tipo], n = contar(e, tipo);
  if (!n && !havia) return;
  if (c.campo === 'N') this.definirN(e.id, n || '');
  else if (c.campo === 'lugares') this.definirLugares(e.id, n);
  else this.definirSanitaria(e.id, c.campo, n);
};
P.porIcone = function (q, tipo) {
  const p = this.pisoAtual(); if (!p || this._bloqueado()) return null;
  const c = this.ICONES_CONTAGEM[tipo], e = this.salaEm(q, p);
  if (!e) { VC.ui.toast('Clique dentro de uma sala desenhada.'); return null; }
  if (c.salas && !c.salas.test(e.tipo || '')) { VC.ui.toast('«' + e.nome + '» é ' + (e.tipo || 'sem tipo') + ': ' + c.nome.toLowerCase() + 's contam-se em ' + (tipo === 'carro' ? 'garagens' : 'sanitários e balneários') + '. Mude o tipo da sala, se for o caso.'); return null; }
  const antes = this._estado();
  this._agrupar++;
  try {
    e.planta.icones = (e.planta.icones || []).concat([{ tipo, x: r1(q[0]), y: r1(q[1]) }]);
    this._aplicarContagem(e, tipo, true);
  } finally { this._agrupar--; }
  this._empilhar(c.nome.toLowerCase() + ' em «' + e.nome + '»', antes);
  VC.estado.forcarSync();
  const n = contar(e, tipo);
  VC.ui.toast('«' + e.nome + '»: ' + n + ' ' + (c.campo === 'N' ? 'pessoa' + (n > 1 ? 's' : '') + ' (N = ' + n + ')' : c.nome.toLowerCase() + (n > 1 ? 's' : '')) + '.');
  this.redesenhar(); return e;
};
P.tirarIcone = function (espId, i) {
  const e = porId('espacos', espId), L = e && e.planta && e.planta.icones; if (!L || !L[i] || this._bloqueado()) return false;
  const antes = this._estado(), tipo = L[i].tipo;
  this._agrupar++;
  try { L.splice(i, 1); if (!L.length) delete e.planta.icones; this._aplicarContagem(e, tipo, true); } finally { this._agrupar--; }
  this.iconeSel = null;
  this._empilhar(this.ICONES_CONTAGEM[tipo].nome.toLowerCase() + ' tirado de «' + e.nome + '»', antes);
  VC.estado.forcarSync(); this.redesenhar(); return true;
};

/* ── seleção do ícone ── */
['selecionado', 'ramalSel', 'trfSel', 'termSel', 'equipSel', 'extSel', 'abertSel', 'prumSel', 'acessSel'].forEach(k => {
  const d = Object.getOwnPropertyDescriptor(P, k); if (!d) return;
  if (d.set) Object.defineProperty(P, k, { configurable: true, enumerable: true, get: d.get, set(x) { d.set.call(this, x); if (x != null) this.iconeSel = null; } });
  else { let v = d.value; Object.defineProperty(P, k, { configurable: true, enumerable: true, get() { return v; }, set(x) { v = x; if (x != null) this.iconeSel = null; } }); }
});
const temSelBase = P.temSelecao;
P.temSelecao = function () { return this.iconeSel != null || temSelBase.call(this); };
const escBase = P.gestoEsc;
P.gestoEsc = function () { if (this.iconeSel != null && !this.pendenteAtual()) { this.iconeSel = null; this.redesenhar(); return 'icone'; } return escBase.apply(this, arguments); };
const apagarBase = P.gestoApagar;
P.gestoApagar = function () { if (this.iconeSel != null && !this.pendenteAtual()) return this.tirarIcone(this.iconeSel.e, this.iconeSel.i) ? 'icone' : 'recusado'; return apagarBase.apply(this, arguments); };
['cancelar', 'setPiso', 'limparSelecao'].forEach(n => { const b = P[n]; if (typeof b === 'function') P[n] = function () { this.iconeSel = null; return b.apply(this, arguments); }; });
const reporBase = P._repor;
P._repor = function () { this.iconeSel = null; return reporBase.apply(this, arguments); };

/* ── desenho ── */
const svgBase = P._svg;
P._svg = function (p) {
  const s = svgBase.call(this, p); if (!p) return s;
  const z = this.zoom || 1, k = 15 / z / 24;
  let g = '';
  (this.espacosDoPiso ? this.espacosDoPiso(p) : []).forEach(e => (e.planta.icones || []).forEach((ic, i) => {
    const c = this.ICONES_CONTAGEM[ic.tipo]; if (!c) return;
    const sel = this.iconeSel && String(this.iconeSel.e) === String(e.id) && this.iconeSel.i === i;
    g += '<g class="planta-icone" data-esp="' + esc(e.id) + '" data-i="' + i + '" data-tipo="' + ic.tipo + '" transform="translate(' + n2(ic.x - 12 * k) + ',' + n2(ic.y - 12 * k) + ') scale(' + n2(k * 1000) / 1000 + ')"><title>' + esc(c.nome + ' · ' + e.nome) + '</title>'
      + '<circle cx="12" cy="12" r="12" fill="#fff" fill-opacity=".85" stroke="' + (sel ? '#f2c94c' : '#475569') + '" stroke-width="' + (sel ? 3 : 1.2) + '"/>'
      + '<path d="' + c.d + '" fill="none" stroke="#1e293b" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></g>';
  }));
  if (!g) return s;
  const corte = s.indexOf('<g class="planta-term"') >= 0 ? s.indexOf('<g class="planta-term"') : s.lastIndexOf('</svg>');
  return s.slice(0, corte) + '<g class="planta-icones">' + g + '</g>' + s.slice(corte);
};

/* ── rato ── */
const prepBase = P.prepararVista;
P.prepararVista = function () {
  prepBase.apply(this, arguments);
  const palco = this._palco && this._palco();
  if (!palco || palco._vcIcones) return;
  palco._vcIcones = true;
  palco.addEventListener('pointerdown', ev => {
    if (ev.button !== 0 || this._espaco) return;
    if (ev.target.closest && ev.target.closest('.planta-flut, .planta-estado, .planta-ctx')) return;
    const tipo = TIPO_DE[this.ferramenta];
    if (tipo) { ev.stopPropagation(); ev.preventDefault(); this.porIcone(this._pontoBruto ? this._pontoBruto(ev) : this._ponto(ev), tipo); return; }
    if (this.ferramenta !== 'sel') return;
    const g = ev.target.closest && ev.target.closest('.planta-icone'); if (!g) return;
    ev.stopPropagation(); ev.preventDefault();
    const sel = { e: g.dataset.esp, i: Number(g.dataset.i) };
    this.selecionado = null; this.ramalSel = null; this.termSel = null; this.iconeSel = sel;
    this.redesenhar();
  }, true);
};

/* ── painel da sala: mostra que a contagem vem dos ícones; atalhos para os pôr ── */
const sala = PN && PN.esquemas && PN.esquemas.sala;
if (sala) {
  ['N', 'numSanitas', 'numUrinois', 'numDuches', 'lugares'].forEach(campo => {
    const c = sala.campos.find(x => x.id === campo); if (!c) return;
    const tipo = Object.keys(P.ICONES_CONTAGEM).find(k => P.ICONES_CONTAGEM[k].campo === campo);
    const aj = c.ajuda || '';
    c.ajuda = (aj ? aj + ' ' : '') + 'Ou conte na planta: ponha ícones de ' + P.ICONES_CONTAGEM[tipo].nome.toLowerCase() + ' na sala (grupo Ocupação e aparelhos).';
  });
  const resB = sala.resultado;
  sala.resultado = (e, p) => {
    const out = resB(e, p), L = (e.planta && e.planta.icones) || [];
    if (L.length) { const n = {}; L.forEach(i => { n[i.tipo] = (n[i.tipo] || 0) + 1; }); out.push(['Contado na planta', Object.keys(n).map(t => n[t] + ' ' + P.ICONES_CONTAGEM[t].nome.toLowerCase() + (n[t] > 1 ? 's' : '')).join(' · '), 'ícones na sala']); }
    return out;
  };
}
/* menu de contexto da sala: pôr ícones */
if (P._acoesContexto) {
  const acB = P._acoesContexto;
  P._acoesContexto = function (alvo) {
    const out = acB.call(this, alvo);
    if (alvo && alvo.tipo === 'sala') {
      const e = alvo.o, ks = Object.keys(IDS).filter(k => !P.ICONES_CONTAGEM[k].salas || P.ICONES_CONTAGEM[k].salas.test(e.tipo || ''));
      out.splice(1, 0, ...ks.map(k => ({ ic: IDS[k], rot: 'Contar: ' + P.ICONES_CONTAGEM[k].nome.toLowerCase(), js: "VC.planta.escolherFerramenta ? VC.planta.escolherFerramenta('" + IDS[k] + "') : VC.planta.setFerramenta('" + IDS[k] + "')", k: P.TECLAS[IDS[k]] })));
    }
    return out;
  };
}
})();
