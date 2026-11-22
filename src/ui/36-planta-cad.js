/* ============================================================
   VentiCondutas · Planta: atalhos e gestos ao estilo SketchUp / AutoCAD
   ------------------------------------------------------------
   Para não inventar: uma tecla por ferramenta como no SketchUp, número
   escrito + Enter durante o gesto (caixa de medidas), e as teclas de
   função do AutoCAD para os modos permanentes.
     Espaço (toque) Selecionar · H Mão · R Retângulo · L Linha/Ramal ·
     T Medir (fita métrica) · M Mover (Ctrl copia) · Q Rodar · E Apagar
     X Transferência (antes T) · F3 encaixe · F8 orto · F9 grelha ·
     Shift+Z mostrar tudo.
   Retângulo também por dois cliques, com «4;3» + Enter.
   O guia de desenho (Claude Doc) descreve tudo isto.
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('36-planta-cad');
const P = VC.planta;
if (!P || !P.teclaDesenho || !P._aplicarGeometria) return;
const n2 = v => Math.round(v * 100) / 100;
const porId = (l, id) => (VC.dados[l] || []).find(x => String(x.id) === String(id));
const NS = 'http://www.w3.org/2000/svg';

/* ── teclas ── */
P.TECLAS.trf = 'X';
P.TECLAS.medir = 'T';
P.FERRAMENTAS.push(['mover', 'fa-up-down-left-right', 'Mover'], ['rodar', 'fa-rotate-right', 'Rodar'], ['apagar', 'fa-eraser', 'Apagar']);
Object.assign(P.TECLAS, { mover: 'M', rodar: 'Q', apagar: 'E' });
if (P.ICONES) Object.assign(P.ICONES, {
  mover: 'M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3',
  rodar: 'M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5',
  apagar: 'M8 20h12M4.5 14.5l8-8 6 6-6 6H9z'
});
Object.assign(P.DICAS || {}, {
  mover: 'Clique na sala, no ramal ou no terminal (ponto de base), depois no destino. Escreva a distância + Enter; Ctrl copia a sala. Esc cancela.',
  rodar: 'Clique na sala ou no ramal e rode com o rato (passos de 15°, Alt livre); clique para confirmar ou escreva o ângulo + Enter.',
  apagar: 'Clique num objeto para apagar o seu desenho (sala, traçado, terminal da planta, transferência). Ctrl+Z repõe.'
});

P.orto = false; P.encaixeDesligado = false;
P.mov = null; P.rot = null; P.retInicio = null;

const tecBase = P.teclaDesenho;
P.teclaDesenho = function (ev) {
  const k = ev.key, mod = ev.ctrlKey || ev.metaKey;
  if (k === 'F3') { this.encaixeDesligado = !this.encaixeDesligado; VC.ui.toast(this.encaixeDesligado ? 'Encaixe desligado (F3 liga).' : 'Encaixe ligado.'); this._estadoModos(); return true; }
  if (k === 'F8') { this.orto = !this.orto; VC.ui.toast(this.orto ? 'Orto ligado: só horizontal e vertical (F8 desliga).' : 'Orto desligado.'); this._estadoModos(); return true; }
  if (k === 'F9') { this.grelha = !this.grelha; VC.ui.toast(this.grelha ? 'Grelha de 0,50 m ligada (F9 desliga).' : 'Grelha desligada.'); this._estadoModos(); return true; }
  if ((k === 'Z' || k === 'z') && ev.shiftKey && !mod) { this.ajustar(); return true; }
  // caixa de medidas: «;» no retângulo, «-» na rotação
  if (!mod && k === ';' && this.ferramenta === 'ret' && this.retInicio && this._comprimento && !/;/.test(this._comprimento)) { this._comprimento += ';'; this._caixaComprimento(); return true; }
  if (!mod && k === '-' && this.ferramenta === 'rodar' && this.rot && !this._comprimento) { this._comprimento = '-'; this._caixaComprimento(); return true; }
  if (k === 'Escape' && !this._comprimento && (this.mov || this.rot || this.retInicio)) { this._cancelarGesto(); return true; }
  if (k === ' ' && !mod && !ev.repeat) { this._espacoT = Date.now(); this._espacoMexeu = false; }
  return tecBase.call(this, ev);
};
/* Espaço: toque = Selecionar (SketchUp); manter e arrastar = mover a vista */
window.addEventListener('keyup', ev => {
  if (ev.key !== ' ' || !P._espacoT || !document.getElementById('plantaSVG')) return;
  const curto = Date.now() - P._espacoT < 350 && !P._espacoMexeu; P._espacoT = 0;
  if (curto && P.ferramenta !== 'sel' && !P.pendenteAtual()) (P.escolherFerramenta ? P.escolherFerramenta('sel') : P.setFerramenta('sel'));
});
P._estadoModos = function () {
  const el = document.getElementById('plantaEstado'); if (!el) return;
  let m = el.querySelector('.pe-modos'); if (!m) { m = document.createElement('span'); m.className = 'pe-modos'; el.insertBefore(m, el.querySelector('.pe-escala')); }
  const L = []; if (this.orto) L.push('ORTO'); if (this.grelha) L.push('GRELHA'); if (this.encaixeDesligado) L.push('SEM ENCAIXE');
  m.textContent = L.join(' · '); m.hidden = !L.length;
};

/* ponto de referência e encaixe das ferramentas novas */
const antBase = P._pontoAnterior;
P._pontoAnterior = function () {
  if (this.ferramenta === 'mover' && this.mov) return this.mov.base;
  if (this.ferramenta === 'rodar' && this.rot) return this.rot.c;
  if (this.ferramenta === 'ret' && this.retInicio) return this.retInicio;
  return antBase.call(this);
};
const encBase = P._opcoesEncaixe;
P._opcoesEncaixe = function () {
  if (this.ferramenta === 'mover') return { salas: true, ramais: true, excluir: this.mov ? this.mov.o : null };
  if (this.ferramenta === 'rodar' || this.ferramenta === 'apagar') return null;
  return encBase.call(this);
};

/* objeto debaixo do ponteiro: terminal › transferência › ramal › sala */
P._objetoEm = function (alvo) {
  const t = alvo.closest && alvo.closest('.planta-term'); if (t) return { tipo: 'terminal', o: porId('terminais', t.dataset.t), el: t };
  const f = alvo.closest && alvo.closest('.planta-trf'); if (f) return { tipo: 'transferencia', o: (VC.dados.transferencias || []).find(x => String(x.id) === String(f.dataset.trf)), el: f };
  const r = alvo.closest && alvo.closest('.planta-ramal'); if (r) return { tipo: 'ramal', o: porId('ramais', r.dataset.r), el: r };
  const s = alvo.closest && alvo.closest('.planta-sala'); if (s) return { tipo: 'sala', o: porId('espacos', s.dataset.esp), el: s };
  return null;
};
const centro = pts => { let x = 0, y = 0; pts.forEach(q => { x += q[0]; y += q[1]; }); return [x / pts.length, y / pts.length]; };

P._cancelarGesto = function () { this.mov = null; this.rot = null; this.retInicio = null; this._comprimento = ''; if (this._caixaComprimento) this._caixaComprimento(); this.redesenhar(); };
const ferrBase = P.setFerramenta;
P.setFerramenta = function (f) { this.mov = null; this.rot = null; this.retInicio = null; return ferrBase.apply(this, arguments); };

/* ── Mover ── */
P._moverPara = function (q, copiar) {
  const m = this.mov; if (!m) return false;
  const dx = n2(q[0] - m.base[0]), dy = n2(q[1] - m.base[1]); this.mov = null;
  if (!dx && !dy) { this.redesenhar(); return false; }
  if (m.tipo === 'terminal') {
    const antes = this._estado(); m.o.planta.x = n2(m.o.planta.x + dx); m.o.planta.y = n2(m.o.planta.y + dy);
    this._empilhar('terminal «' + (m.o.nome || m.o.id) + '» movido', antes); if (VC.estado && VC.estado.forcarSync) VC.estado.forcarSync(); this.redesenhar(); return true;
  }
  if (m.tipo === 'sala' && copiar && this.duplicarSala) {
    const p = this.pisoAtual(), d = p && p.escala ? 1 / p.escala : 30;
    const pts0 = m.o.planta.pts; m.o.planta.pts = pts0.map(([x, y]) => [x + dx - d, y + dy - d]);   // duplicarSala soma 1 m: compensa
    try { return !!this.duplicarSala(m.o.id); } finally { m.o.planta.pts = pts0; this.redesenhar(); }
  }
  if (m.tipo === 'sala' || m.tipo === 'ramal') {
    const ed = { tipo: m.tipo, o: m.o, pts: m.o.planta.pts, fechado: m.tipo === 'sala' };
    const pts = m.o.planta.pts.map(([x, y]) => [x + dx, y + dy]);
    const extra = m.tipo === 'sala' ? () => {
      (this.terminaisDe ? this.terminaisDe(m.o) : []).forEach(t => { if (t.planta && t.planta.pisoId === m.o.planta.pisoId && this.dentro([t.planta.x, t.planta.y], ed.pts)) { t.planta.x = n2(t.planta.x + dx); t.planta.y = n2(t.planta.y + dy); } });
    } : null;
    return this._aplicarGeometria(ed, pts, (m.tipo === 'sala' ? 'sala' : 'ramal') + ' «' + m.o.nome + '» movido', m.antes, extra);
  }
  this.redesenhar(); return false;
};
/* ── Rodar ── */
P._anguloRot = function (q, livre) {
  const r = this.rot; if (!r) return 0;
  let a = (Math.atan2(q[1] - r.c[1], q[0] - r.c[0]) - r.a0) * 180 / Math.PI;
  a = ((a + 540) % 360) - 180;
  return livre ? Math.round(a) : Math.round(a / 15) * 15;
};
P._rodarAplicar = function (graus) {
  const r = this.rot; this.rot = null; if (!r || !graus) { this.redesenhar(); return false; }
  return r.tipo === 'sala' ? this.rodarSala(r.o.id, graus) : this.rodarRamal(r.o.id, graus);
};

/* comprimento / ângulo / dimensões escritos */
const aplBase = P.aplicarComprimento;
P.aplicarComprimento = function () {
  const f = this.ferramenta, txt = String(this._comprimento || '');
  if (f === 'rodar' && this.rot) { this._comprimento = ''; this._caixaComprimento(); return this._rodarAplicar(VC.utils.num(txt.replace(',', '.'))); }
  if (f === 'ret' && this.retInicio) {
    this._comprimento = ''; this._caixaComprimento();
    const p = this.pisoAtual(), [a, b] = txt.split(';').map(x => VC.utils.num(String(x).replace(',', '.')));
    if (!p || !p.escala) { VC.ui.toast('Calibre primeiro a escala (S).'); return false; }
    if (!(a > 0) || !(b > 0)) { VC.ui.toast('Escreva as duas medidas: largura;altura (ex.: 4;3).'); return false; }
    const o = this.retInicio, alvo = this.ponteiro || [o[0] + 1, o[1] + 1], sx = alvo[0] >= o[0] ? 1 : -1, sy = alvo[1] >= o[1] ? 1 : -1;
    const q = [n2(o[0] + sx * a / p.escala), n2(o[1] + sy * b / p.escala)];
    this.retInicio = null; this.pendente = [[o[0], o[1]], [q[0], o[1]], q, [o[0], q[1]]]; this.redesenhar(); return true;
  }
  if (f === 'mover' && this.mov) {
    const p = this.pisoAtual(), L = VC.utils.num(txt.replace(',', '.')), o = this.mov.base, alvo = this.ponteiro;
    this._comprimento = ''; this._caixaComprimento();
    if (!p || !p.escala || !(L > 0) || !alvo) return false;
    const dx = alvo[0] - o[0], dy = alvo[1] - o[1], l = Math.hypot(dx, dy); if (!(l > 0)) { VC.ui.toast('Aponte com o rato a direção e volte a escrever a distância.'); return false; }
    return this._moverPara([o[0] + dx / l * L / p.escala, o[1] + dy / l * L / p.escala], false);
  }
  return aplBase.call(this);
};

/* pré-visualização (transformações no próprio desenho, sem o refazer) */
P._previsao = function () {
  const svg = document.getElementById('plantaSVG'); if (!svg) return;
  if (this.mov && this.mov.el && this.ponteiro) {
    const el = svg.querySelector(this.mov.sel) || this.mov.el;
    el.setAttribute('transform', 'translate(' + n2(this.ponteiro[0] - this.mov.base[0]) + ',' + n2(this.ponteiro[1] - this.mov.base[1]) + ')');
    el.setAttribute('opacity', this.mov.copia ? '0.55' : '1');
  }
  if (this.rot && this.ponteiro) {
    const el = svg.querySelector(this.rot.sel); if (el) el.setAttribute('transform', 'rotate(' + this.rot.ang + ' ' + this.rot.c[0] + ' ' + this.rot.c[1] + ')');
    let t = svg.querySelector('#plantaRotTxt');
    if (!t) { t = document.createElementNS(NS, 'text'); t.id = 'plantaRotTxt'; t.setAttribute('font-weight', '800'); t.setAttribute('fill', '#e05a00'); t.setAttribute('paint-order', 'stroke'); t.setAttribute('stroke', '#fff'); svg.appendChild(t); }
    const z = this.zoom || 1; t.setAttribute('font-size', 13 / z); t.setAttribute('stroke-width', 3 / z);
    t.setAttribute('x', this.rot.c[0] + 12 / z); t.setAttribute('y', this.rot.c[1] - 12 / z); t.textContent = this.rot.ang + '°';
  }
  if (this.retInicio && this.ponteiro) {
    let r = svg.querySelector('#plantaRet2');
    if (!r) { r = document.createElementNS(NS, 'polygon'); r.id = 'plantaRet2'; r.setAttribute('fill', '#4f6d8c'); r.setAttribute('fill-opacity', '0.12'); r.setAttribute('stroke', '#4f6d8c'); r.setAttribute('stroke-width', '2.5'); r.setAttribute('stroke-dasharray', '6 4'); r.setAttribute('vector-effect', 'non-scaling-stroke'); r.setAttribute('pointer-events', 'none'); svg.appendChild(r); }
    const [x0, y0] = this.retInicio, [x1, y1] = this.ponteiro;
    r.setAttribute('points', [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(a => a.join(',')).join(' '));
  }
};

const ligarBase = P.ligar;
P.ligar = function () {
  ligarBase.apply(this, arguments);
  const palco = document.getElementById('plantaTela'), svg = document.getElementById('plantaSVG'); if (!palco || !svg) return;
  this._estadoModos();
  palco.addEventListener('pointermove', ev => {
    if (this._espaco && ev.buttons) this._espacoMexeu = true;
    if (!(this.mov || this.rot || this.retInicio)) return;
    const q = this._ponto(ev); this.ponteiro = q;
    if (this.mov) this.mov.copia = ev.ctrlKey || ev.metaKey;
    if (this.rot) this.rot.ang = this._anguloRot(this._pontoBruto ? this._pontoBruto(ev) : q, ev.altKey);
    this._previsao();
  });
  svg.addEventListener('pointerdown', ev => {
    const f = this.ferramenta;
    if (ev.button !== 0 || this._espaco || ['mover', 'rodar', 'apagar'].indexOf(f) < 0) return;
    ev.stopImmediatePropagation(); ev.preventDefault();
    if (this._bloqueado()) return;
    const q = this._ponto(ev);
    if (f === 'apagar') {
      const ob = this._objetoEm(ev.target); if (!ob || !ob.o) return;
      if (ob.tipo === 'sala') this.apagarDesenho(ob.o.id);
      else if (ob.tipo === 'ramal') this.apagarTracado(ob.o.id);
      else if (ob.tipo === 'terminal' && VC.paineis) VC.paineis.retirarTerminal(ob.o.id);
      else if (ob.tipo === 'transferencia') this.removerTransferencia(ob.o.id);
      return;
    }
    if (f === 'mover') {
      if (this.mov) { this._moverPara(q, ev.ctrlKey || ev.metaKey); return; }
      const ob = this._objetoEm(ev.target); if (!ob || !ob.o || ob.tipo === 'transferencia') return;
      const sel = ob.tipo === 'terminal' ? '.planta-term[data-t="' + ob.o.id + '"]' : ob.tipo === 'ramal' ? '.planta-ramal[data-r="' + ob.o.id + '"]' : '.planta-sala[data-esp="' + ob.o.id + '"]';
      this.mov = { tipo: ob.tipo, o: ob.o, base: q, el: ob.el, sel, antes: this._estado() };
      this.ponteiro = q; this.redesenhar(); return;
    }
    if (f === 'rodar') {
      if (this.rot) { this._rodarAplicar(this.rot.ang); return; }
      const ob = this._objetoEm(ev.target); if (!ob || !ob.o || (ob.tipo !== 'sala' && ob.tipo !== 'ramal')) return;
      const c = ob.tipo === 'sala' ? centro(ob.o.planta.pts) : ob.o.planta.pts[0];
      const qb = this._pontoBruto ? this._pontoBruto(ev) : q;
      this.rot = { tipo: ob.tipo, o: ob.o, c, a0: Math.atan2(qb[1] - c[1], qb[0] - c[0]), ang: 0, sel: ob.tipo === 'ramal' ? '.planta-ramal[data-r="' + ob.o.id + '"]' : '.planta-sala[data-esp="' + ob.o.id + '"]' };
      this.ponteiro = q; this.redesenhar();
    }
  }, true);
  /* retângulo por dois cliques (o arrasto continua a funcionar) */
  let baixo = null;
  svg.addEventListener('pointerdown', ev => { if (this.ferramenta === 'ret' && ev.button === 0 && !this._espaco) baixo = [ev.clientX, ev.clientY]; }, true);
  svg.addEventListener('pointerup', ev => {
    if (this.ferramenta !== 'ret' || !baixo) return;
    const clique = Math.hypot(ev.clientX - baixo[0], ev.clientY - baixo[1]) < 6; baixo = null;
    if (!clique) { this.retInicio = null; return; }
    const q = this._ponto(ev);
    if (!this.retInicio) { this.retInicio = q; this.ponteiro = q; this.pendente = null; setTimeout(() => this._previsao(), 0); return; }
    const [x0, y0] = this.retInicio, z = this.zoom || 1;
    if (Math.abs(q[0] - x0) * z < 6 || Math.abs(q[1] - y0) * z < 6) return;
    this.retInicio = null; this.pendente = [[x0, y0], [q[0], y0], q, [x0, q[1]]]; this.redesenhar();
  });
  if (this.mov || this.rot || this.retInicio) this._previsao();
};

/* menu ☰: os modos AutoCAD e o Espaço do SketchUp */
if (P._menuHTML) {
  const menuBase = P._menuHTML;
  P._menuHTML = function () {
    const h = menuBase.call(this), A = this._acoesMenu;
    const it = (rot, k, fn, on) => '<button type="button" role="menuitem" class="pm-item' + (on ? ' ativo' : '') + '"' + (fn ? ' onclick="VC.planta._doMenu(' + (A.push(fn) - 1) + ')"' : ' disabled') + '><span class="pm-ic"></span><span class="pm-rot">' + rot + '</span><kbd>' + k + '</kbd></button>';
    const linhas = it('Selecionar (toque)', 'Espaço', () => this.escolherFerramenta('sel'))
      + it((this.orto ? 'Desligar' : 'Ligar') + ' o orto (só horizontal e vertical)', 'F8', () => { this.orto = !this.orto; this.redesenhar(); }, this.orto)
      + it((this.encaixeDesligado ? 'Ligar' : 'Desligar') + ' o encaixe', 'F3', () => { this.encaixeDesligado = !this.encaixeDesligado; this.redesenhar(); }, this.encaixeDesligado)
      + it('Mostrar tudo', 'Shift+Z', () => this.ajustar());
    return h.replace('<div class="pm-tit" role="presentation">Comandos</div>', '<div class="pm-tit" role="presentation">Comandos</div>' + linhas).replace('a grelha de 0,50 m</span><kbd>G</kbd>', 'a grelha de 0,50 m</span><kbd>F9 · G</kbd>');
  };
}

/* o gesto a meio conta como pendente (Esc cancela; não se muda de ferramenta sem querer) */
const pendBase = P.pendenteAtual;
P.pendenteAtual = function () { const r = pendBase.apply(this, arguments); return r || (this.mov ? 'o movimento' : this.rot ? 'a rotação' : this.retInicio ? 'o retângulo' : r); };
const cancBase = P.cancelar;
P.cancelar = function () { this.mov = null; this.rot = null; this.retInicio = null; return cancBase.apply(this, arguments); };
})();
