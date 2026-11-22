/* ============================================================
   VentiCondutas · Planta: proporção e equilíbrio dos textos
   ------------------------------------------------------------
   Os textos e símbolos tinham tamanho fixo no ecrã: com a planta afastada
   ficavam enormes em relação às salas e sobrepunham-se. Agora:
   1. Proporção: cada tipo de texto tem uma altura «real» em metros, como
      num desenho técnico (nome da sala 0,40 m, ramal 0,28 m, Ø 0,22 m…),
      convertida em píxeis pela escala do piso e pelo zoom, entre um mínimo
      legível e um máximo. Os símbolos (terminais, avisos) seguem a mesma regra.
   2. Equilíbrio: depois de desenhar, os textos são postos por prioridade
      (terminais e avisos › nomes das salas › nomes dos ramais › áreas ›
      transferências › Ø) e um texto que tapava outro mais importante é
      escondido. Ao aproximar, voltam. O objeto selecionado mostra sempre
      os seus textos.
   3. Controlo: «Tamanho dos textos» no painel do Piso (todo o projeto) e
      «Textos maiores / menores» no menu ☰.
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('34-planta-textos');
const P = VC.planta;
if (!P || !P.ligar) return;

/* altura real (m), mínimo e máximo no ecrã (px), tamanho de origem no ecrã (px) */
const CAT = {
  sala:  { m: 0.4, min: 9, max: 13, orig: 13 },
  ramal: { m: 0.28, min: 7.5, max: 11.5, orig: 11.5 },
  diam:  { m: 0.22, min: 7, max: 10, orig: 10 },
  trf:   { m: 0.26, min: 7.5, max: 12, orig: 12 },
  term:  { m: 0.24, min: 7, max: 10, orig: 10 },     // raio do círculo do terminal
  aviso: { m: 0.2, min: 6, max: 9, orig: 9 },          // raio do aviso da sala
  equip: { m: 0.3, min: 6.5, max: 8.5, orig: 8.5 }
};
P.CAT_TEXTOS = CAT;
P.fatorTextos = function () { const f = Number(VC.dados.params && VC.dados.params.escalaTextos); return f >= 0.5 && f <= 2 ? f : 1; };
P._pxPorM = function (p) { p = p || this.pisoAtual(); return p && p.escala ? (this.zoom || 1) / p.escala : null; };
/* tamanho no ecrã (px) de uma categoria, no zoom atual */
P._pxTexto = function (cat, p) {
  const c = CAT[cat], f = this.fatorTextos(), k = this._pxPorM(p);
  const px = k ? c.m * k : c.orig;
  return Math.max(c.min * f, Math.min(c.max * f, px * f));
};
P._pxMin = function (cat) { return CAT[cat].min * this.fatorTextos(); };

/* ── passagem depois de desenhar ── */
P.equilibrarTextos = function () {
  const svg = document.getElementById('plantaSVG'), p = this.pisoAtual(); if (!svg || !p) return { escondidos: 0 };
  const k = cat => this._pxTexto(cat, p) / CAT[cat].orig;   // razão face ao tamanho de origem
  // a passagem pode correr mais de uma vez sobre o mesmo desenho: parte sempre dos valores de origem
  const orig = (el, a) => { const k0 = 'data-' + a + '0'; if (!el.hasAttribute(k0)) el.setAttribute(k0, el.getAttribute(a)); return parseFloat(el.getAttribute(k0)); };
  const fs = (el, r) => { const v = orig(el, 'font-size'); if (v) el.setAttribute('font-size', v * r); };
  // 1. proporção
  const kr = k('ramal'), kd = k('diam'), kt = k('trf'), kT = k('term'), kA = k('aviso'), kE = k('equip');
  svg.querySelectorAll('.planta-ramal > text').forEach(t => fs(t, /^Ø/.test(t.textContent) ? kd : kr));
  svg.querySelectorAll('.planta-trf text').forEach(t => fs(t, kt));
  svg.querySelectorAll('.planta-term').forEach(g => {
    const c = g.querySelector('circle'), t = g.querySelector('text'); if (!c) return;
    c.setAttribute('r', orig(c, 'r') * kT);
    if (t) { fs(t, kT); const cy = parseFloat(c.getAttribute('cy')), y0 = orig(t, 'y'); t.setAttribute('y', cy + (y0 - cy) * kT); }
  });
  svg.querySelectorAll('.planta-aviso-sala').forEach(g => {
    const c = g.querySelector('circle'); if (!c) return;
    const cx = parseFloat(c.getAttribute('cx')), cy = parseFloat(c.getAttribute('cy'));
    g.setAttribute('transform', 'translate(' + cx + ',' + cy + ') scale(' + kA + ') translate(' + (-cx) + ',' + (-cy) + ')');
  });
  svg.querySelectorAll('.planta-equip').forEach(g => {   // o equipamento encolhe à volta da ponta do ramal
    const r = g.querySelector('rect'); if (!r || kE === 1) return;
    const cx = parseFloat(r.getAttribute('x')) + parseFloat(r.getAttribute('width')) / 2, cy = parseFloat(r.getAttribute('y')) + parseFloat(r.getAttribute('height')) / 2;
    g.setAttribute('transform', 'translate(' + cx + ',' + cy + ') scale(' + kE + ') translate(' + (-cx) + ',' + (-cy) + ')');
  });
  // 2. equilíbrio: por prioridade, esconde o que tapa algo mais importante
  svg.querySelectorAll('[data-escondido]').forEach(el => { el.removeAttribute('visibility'); el.removeAttribute('data-escondido'); });
  const caixas = [], pad = 1;
  const dono = el => { const g = el.closest('[data-esp],[data-r],[data-trf],[data-t],[data-u]'); return g ? g.getAttribute('class') + ':' + (g.dataset.esp || g.dataset.r || g.dataset.trf || g.dataset.t || g.dataset.u) : ''; };
  const caixa = el => { const b = el.getBoundingClientRect(); return b.width && b.height ? [b.left - pad, b.top - pad, b.right + pad, b.bottom + pad, dono(el)] : null; };
  const choca = b => caixas.some(c => c[4] !== b[4] && b[0] < c[2] && b[2] > c[0] && b[1] < c[3] && b[3] > c[1]);   // os textos do mesmo objeto não se excluem
  const sel = el => {   // pertence ao objeto selecionado?
    const r = el.closest('.planta-ramal'), s = el.closest('.planta-rotulo'), t = el.closest('.planta-trf');
    return (r && String(r.dataset.r) === String(this.ramalSel)) || (s && String(s.dataset.esp) === String(this.selecionado)) || (t && String(t.dataset.trf) === String(this.trfSel));
  };
  const reservar = els => els.forEach(el => { const b = caixa(el); if (b) caixas.push(b); });
  let escondidos = 0;
  const colocar = els => els.forEach(el => {
    const b = caixa(el); if (!b) return;
    if (!sel(el) && choca(b)) { el.setAttribute('visibility', 'hidden'); el.setAttribute('data-escondido', '1'); escondidos++; return; }
    caixas.push(b);
  });
  const Q = s => [...svg.querySelectorAll(s)];
  const salas = Q('.planta-rotulo'), nomesSala = salas.map(g => g.querySelector('text')).filter(Boolean), linhas2 = salas.map(g => g.querySelectorAll('text')[1]).filter(Boolean);
  const textosRamal = Q('.planta-ramal > text'), nomesRamal = textosRamal.filter(t => !/^Ø/.test(t.textContent)), diams = textosRamal.filter(t => /^Ø/.test(t.textContent));
  // primeiro o selecionado, depois o resto
  const ordem = L => L.filter(sel).concat(L.filter(x => !sel(x)));
  reservar(Q('.planta-term circle').concat(Q('.planta-aviso-sala circle'), Q('.planta-equip rect')));
  // nomes das salas: as maiores primeiro; um nome que tapa outro esconde-se com a sua área (o nome está no título e na lista)
  const areaRot = t => { const b = t.getBoundingClientRect(); const g = t.closest('.planta-sala'); const pb = g && g.querySelector('polygon') ? g.querySelector('polygon').getBoundingClientRect() : b; return pb.width * pb.height; };
  colocar(ordem(nomesSala.sort((a, b) => areaRot(b) - areaRot(a))));
  linhas2.forEach(t => { const n = t.parentNode.querySelector('text'); if (n && n.getAttribute('data-escondido')) { t.setAttribute('visibility', 'hidden'); t.setAttribute('data-escondido', '1'); escondidos++; } });
  colocar(ordem(nomesRamal));
  colocar(linhas2.filter(t => !t.getAttribute('data-escondido')));
  colocar(ordem(Q('.planta-trf text')));
  colocar(ordem(diams));
  colocar(Q('.planta-equip text').filter(t => t.nextElementSibling && t.nextElementSibling.tagName === 'rect'));   // «ar exterior · ODA», «rejeição · EHA»
  this._escondidos = escondidos;
  return { escondidos };
};

/* o desenho guarda o zoom com que foi feito; se a vista mudar de zoom sem o refazer (ex.: o primeiro
   «Ajustar» depois de abrir a planta), os textos ficavam no tamanho do zoom antigo: refaz-se. */
const svgBase = P._svg;
P._svg = function (p) { return svgBase.call(this, p).replace('<svg id="plantaSVG"', '<svg id="plantaSVG" data-z="' + (this.zoom || 1) + '"'); };
const vistaBase = P.aplicarVista;
if (vistaBase) P.aplicarVista = function (semRefresco) {
  const r = vistaBase.apply(this, arguments);
  const svg = document.getElementById('plantaSVG');
  if (semRefresco && svg && Math.abs(Number(svg.getAttribute('data-z')) - (this.zoom || 1)) > 1e-6 && this._agendarRefresco) this._agendarRefresco();
  return r;
};
const ligarBase = P.ligar;
P.ligar = function () {
  const r = ligarBase.apply(this, arguments);
  try { this.equilibrarTextos(); } catch (e) { if (VC.debug && VC.debug.aviso) VC.debug.aviso('equilibrarTextos: ' + e.message); }
  return r;
};

/* ── controlo ── */
P.mudarTextos = function (d) {
  const f = d === 0 ? 1 : Math.round(Math.max(0.6, Math.min(1.6, this.fatorTextos() + d)) * 10) / 10;
  if (f === 1) delete VC.dados.params.escalaTextos; else VC.dados.params.escalaTextos = f;
  if (VC.estado && VC.estado.forcarSync) VC.estado.forcarSync();
  this.redesenhar();
  VC.ui.toast('Tamanho dos textos: ' + Math.round(f * 100) + ' %' + (f === 1 ? ' (automático)' : ''));
};
if (P._menuHTML) {
  const menuBase = P._menuHTML;
  P._menuHTML = function () {
    const h = menuBase.call(this), A = this._acoesMenu;
    const it = (rot, fn) => '<button type="button" role="menuitem" class="pm-item" onclick="VC.planta._doMenu(' + (A.push(fn) - 1) + ')"><span class="pm-ic">Aa</span><span class="pm-rot">' + rot + '</span></button>';
    const pct = Math.round(this.fatorTextos() * 100);
    return h.replace(/<\/div><\/div>$/, '<div class="pm-tit" role="presentation">Textos · ' + pct + ' %</div>' + it('Textos maiores', () => this.mudarTextos(0.1)) + it('Textos menores', () => this.mudarTextos(-0.1)) + (pct !== 100 ? it('Textos no tamanho automático', () => this.mudarTextos(0)) : '') + '</div></div>');
  };
}
if (VC.paineis && VC.paineis.esquemas && VC.paineis.esquemas.piso) {
  const E = VC.paineis.esquemas.piso;
  E.campos.splice(3, 0, { id: 'escalaTextos', rot: 'Tamanho dos textos', un: '×', tipo: 'num', min: 0.6, passo: 0.1,
    ler: () => (VC.dados.params.escalaTextos || ''),
    proposto: () => ({ v: 1, origem: 'norma', nota: 'automático, proporcional ao desenho' }),
    escrever: (p, v) => { const f = VC.utils.num(v); if (!(f >= 0.6 && f <= 1.6) || f === 1) delete VC.dados.params.escalaTextos; else VC.dados.params.escalaTextos = Math.round(f * 10) / 10; },
    ajuda: 'Os textos seguem a escala do desenho; os que se sobrepõem a outros mais importantes escondem-se até aproximar.' });
  const res = E.resultado;
  E.resultado = function (p) { const r = res.call(this, p); return P._escondidos ? r.concat([['Textos escondidos', String(P._escondidos), 'sobrepunham-se: aproxime para os ver']]) : r; };
}
})();
