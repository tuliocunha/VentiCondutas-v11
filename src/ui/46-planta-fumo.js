/* ============================================================
   VentiCondutas · Planta: controlo de fumo (Fase 6B)
   ------------------------------------------------------------
   No painel da sala: se o RT-SCIE exige controlo de fumo (art. 135.º) e o
   método (passiva ou ativa), com os caudais, bocas e áreas que daí saem.
   Na planta (grupo «Segurança contra incêndio»): bocas / aberturas de
   extração de fumo e de admissão de ar, dentro da sala. Com a sala
   selecionada vê-se o alcance de cada abertura de evacuação na passiva
   (7 × pé-direito, máx. 30 m) e a distância entre aberturas nos corredores.
   As escadas pressurizadas continuam no painel da sala (art. 161.º).
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('46-planta-fumo');
const P = VC.planta, PN = VC.paineis;
if (!P || !P._svg || !PN || !PN.esquemas || !PN.esquemas.sala || !VC.normas.desenfumagem) return;
const esc = s => VC.utils.esc(s), fmt = (v, d) => VC.utils.fmt(v, d == null ? 1 : d), r1 = v => Math.round(v * 10) / 10, n2 = v => Math.round(v * 100) / 100;
const porId = (l, id) => (VC.dados[l] || []).find(x => String(x.id) === String(id));
const COR = { ext: '#b42318', adm: '#0e7490' };
const D2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/* ── ferramentas ── */
P.FERRAMENTAS.push(['fumoExt', 'fa-fire', 'Extração de fumo'], ['fumoAdm', 'fa-wind', 'Admissão de ar (fumo)']);
if (P.ICONES) Object.assign(P.ICONES, { fumoExt: 'M12 21V9M8 13l4-4 4 4M6 5h12', fumoAdm: 'M12 3v12M8 11l4 4 4-4M6 19h12' });
if (P.DICAS) Object.assign(P.DICAS, {
  fumoExt: 'Clique dentro da sala para pôr uma boca (ativa) ou abertura (passiva) de extração de fumo, junto ao teto (≥ 1,8 m do pavimento).',
  fumoAdm: 'Clique dentro da sala para pôr uma entrada de ar para o controlo de fumo, em baixo (≤ 1 m do pavimento).'
});
if (P.GRUPOS && !P.GRUPOS.some(g => g[0] === 'fumo')) P.GRUPOS.splice(P.GRUPOS.findIndex(g => g[0] === 'modificar'), 0, ['fumo', 'Segurança contra incêndio', ['fumoExt', 'fumoAdm']]);
P.fumoSel = null;

P.porBocaFumo = function (q, tipo) {
  const p = this.pisoAtual(); if (!p || this._bloqueado()) return null;
  const e = this.salaEm(q, p); if (!e) { VC.ui.toast('Clique dentro de uma sala desenhada.'); return null; }
  const antes = this._estado();
  e.planta.fumo = (e.planta.fumo || []).concat([{ tipo, x: r1(q[0]), y: r1(q[1]) }]);
  if (!e.desenfumagem) e.desenfumagem = 'ativa';
  this._empilhar((tipo === 'ext' ? 'extração de fumo' : 'admissão de ar') + ' em «' + e.nome + '»', antes);
  VC.estado.forcarSync();
  const d = VC.normas.desenfumagem(e), n = e.planta.fumo.filter(b => b.tipo === 'ext').length;
  VC.ui.toast('«' + e.nome + '»: ' + n + ' extração(ões) de fumo' + (d.bocas ? ' de ' + d.bocas + ' pedidas' : '') + ' · desenfumagem ' + e.desenfumagem + '.');
  this.selecionado = e.id; this.redesenhar(); return e;
};
P.tirarBocaFumo = function (espId, i) {
  const e = porId('espacos', espId), L = e && e.planta && e.planta.fumo; if (!L || !L[i] || this._bloqueado()) return false;
  const antes = this._estado(); L.splice(i, 1); if (!L.length) delete e.planta.fumo;
  this.fumoSel = null; this._empilhar('abertura de fumo tirada de «' + e.nome + '»', antes); VC.estado.forcarSync(); this.redesenhar(); return true;
};
/* verificação geométrica: na passiva, pontos da sala longe de qualquer evacuação; nos corredores, aberturas afastadas de mais */
P.verificarFumoPlanta = function (e, p) {
  const d = VC.normas.desenfumagem(e), B = (e.planta && e.planta.fumo) || [], ext = B.filter(b => b.tipo === 'ext'), out = [];
  if (!p || !p.escala || !d.metodo) return out;
  if (d.metodo === 'passiva' && d.alcance && ext.length) {
    const pts = e.planta.pts.concat([this.centro(e.planta.pts)]);
    const pior = pts.reduce((m, q) => Math.max(m, Math.min.apply(null, ext.map(b => D2(q, [b.x, b.y]))) * p.escala), 0);
    if (pior > d.alcance + 1e-6) out.push('há pontos da sala a ' + fmt(pior, 1) + ' m da abertura de evacuação mais perto (máximo ' + fmt(d.alcance, 1) + ' m; art. 153.º, n.º 3)');
  }
  if (d.circ && d.espMax && B.length >= 2) {
    const max = B.reduce((m, a, i) => Math.max(m, Math.min.apply(null, B.filter((_, j) => j !== i).map(b => D2([a.x, a.y], [b.x, b.y]))) * p.escala), 0);
    if (max > d.espMax + 1e-6) out.push('aberturas a ' + fmt(max, 1) + ' m umas das outras (máximo ' + d.espMax + ' m em troços retos; art. ' + (d.metodo === 'ativa' ? '157' : '156') + '.º, n.º 2)');
  }
  if (d.metodo && !ext.length) out.push('desenhe as ' + (d.metodo === 'ativa' ? 'bocas' : 'aberturas') + ' de extração de fumo (grupo Segurança contra incêndio)');
  if (!B.some(b => b.tipo === 'adm') && d.metodo) out.push('desenhe a admissão de ar (em baixo, ≤ 1 m do pavimento)');
  return out;
};

/* ── seleção da abertura ── */
['selecionado', 'ramalSel', 'trfSel', 'termSel', 'equipSel', 'extSel', 'abertSel', 'prumSel', 'acessSel', 'iconeSel'].forEach(k => {
  const d = Object.getOwnPropertyDescriptor(P, k); if (!d) return;
  if (d.set) Object.defineProperty(P, k, { configurable: true, enumerable: true, get: d.get, set(x) { d.set.call(this, x); if (x != null) this.fumoSel = null; } });
  else { let v = d.value; Object.defineProperty(P, k, { configurable: true, enumerable: true, get() { return v; }, set(x) { v = x; if (x != null) this.fumoSel = null; } }); }
});
const temSelBase = P.temSelecao;
P.temSelecao = function () { return this.fumoSel != null || temSelBase.call(this); };
const escBase = P.gestoEsc;
P.gestoEsc = function () { if (this.fumoSel != null && !this.pendenteAtual()) { this.fumoSel = null; this.redesenhar(); return 'fumo'; } return escBase.apply(this, arguments); };
const apagarBase = P.gestoApagar;
P.gestoApagar = function () { if (this.fumoSel != null && !this.pendenteAtual()) return this.tirarBocaFumo(this.fumoSel.e, this.fumoSel.i) ? 'fumo' : 'recusado'; return apagarBase.apply(this, arguments); };
['cancelar', 'setPiso', 'limparSelecao'].forEach(n => { const b = P[n]; if (typeof b === 'function') P[n] = function () { this.fumoSel = null; return b.apply(this, arguments); }; });
const reporBase = P._repor;
P._repor = function () { this.fumoSel = null; return reporBase.apply(this, arguments); };

/* ── desenho ── */
const svgBase = P._svg;
P._svg = function (p) {
  const s = svgBase.call(this, p); if (!p) return s;
  const z = this.zoom || 1, R = 8 / z;
  let g = '';
  (this.espacosDoPiso ? this.espacosDoPiso(p) : []).forEach(e => {
    if (e.tipo === 'Escadas' && e.pressurizada && e.planta.pts && e.planta.pts.length > 2) {
      const c = this.centro(e.planta.pts), t = 'P+' + (Number(e.deltaP) > 0 ? ' ' + fmt(e.deltaP, 0) + ' Pa' : ''), w = (t.length * 6.2 + 10) / z, h = 15 / z;
      g += '<g class="planta-pressao" data-esp="' + esc(e.id) + '" pointer-events="none" transform="translate(' + n2(c[0]) + ',' + n2(c[1] + 16 / z) + ')"><title>Escada pressurizada' + (e.camaraCortaFogo ? ' com câmara corta-fogo' : '') + ' (RT-SCIE, art. 161.º)</title>'
        + '<rect x="' + n2(-w / 2) + '" y="' + n2(-h / 2) + '" width="' + n2(w) + '" height="' + n2(h) + '" rx="' + n2(h / 2) + '" fill="#0e7490"/>'
        + '<text x="0" y="' + n2(4 / z) + '" text-anchor="middle" font-size="' + n2(10.5 / z) + '" font-weight="700" fill="#fff">' + esc(t) + (e.camaraCortaFogo ? ' · CCF' : '') + '</text></g>';
    }
    const B = e.planta.fumo || []; if (!B.length) return;
    const selSala = String(this.selecionado) === String(e.id), d = selSala ? VC.normas.desenfumagem(e) : null;
    if (d && d.metodo === 'passiva' && d.alcance && p.escala) B.filter(b => b.tipo === 'ext').forEach(b => { g += '<circle cx="' + b.x + '" cy="' + b.y + '" r="' + n2(d.alcance / p.escala) + '" fill="' + COR.ext + '" fill-opacity=".05" stroke="' + COR.ext + '" stroke-width="' + n2(1.2 / z) + '" stroke-dasharray="' + n2(5 / z) + ' ' + n2(4 / z) + '" pointer-events="none"/>'; });
    B.forEach((b, i) => {
      const sel = this.fumoSel && String(this.fumoSel.e) === String(e.id) && this.fumoSel.i === i, c = COR[b.tipo];
      const seta = b.tipo === 'ext' ? 'M0,' + n2(R * 0.55) + 'V' + n2(-R * 0.55) + 'M' + n2(-R * 0.4) + ',' + n2(-R * 0.15) + 'L0,' + n2(-R * 0.55) + 'L' + n2(R * 0.4) + ',' + n2(-R * 0.15) : 'M0,' + n2(-R * 0.55) + 'V' + n2(R * 0.55) + 'M' + n2(-R * 0.4) + ',' + n2(R * 0.15) + 'L0,' + n2(R * 0.55) + 'L' + n2(R * 0.4) + ',' + n2(R * 0.15);
      g += '<g class="planta-fumo" data-esp="' + esc(e.id) + '" data-i="' + i + '" data-tipo="' + b.tipo + '" transform="translate(' + b.x + ',' + b.y + ')"><title>' + (b.tipo === 'ext' ? 'Extração de fumo' : 'Admissão de ar (controlo de fumo)') + ' · ' + esc(e.nome) + '</title>'
        + '<rect x="' + n2(-R) + '" y="' + n2(-R) + '" width="' + n2(2 * R) + '" height="' + n2(2 * R) + '" rx="' + n2(2 / z) + '" fill="#fff" stroke="' + (sel ? VC.planta.COR_SEL : c) + '" stroke-width="' + n2((sel ? 3 : 2) / z) + '"/>'
        + '<path d="' + seta + '" fill="none" stroke="' + c + '" stroke-width="' + n2(1.8 / z) + '" stroke-linecap="round"/></g>';
    });
  });
  if (!g) return s;
  const corte = s.indexOf('<g class="planta-term"') >= 0 ? s.indexOf('<g class="planta-term"') : s.lastIndexOf('</svg>');
  return s.slice(0, corte) + '<g class="planta-fumos">' + g + '</g>' + s.slice(corte);
};

/* ── rato ── */
const prepBase = P.prepararVista;
P.prepararVista = function () {
  prepBase.apply(this, arguments);
  const palco = this._palco && this._palco();
  if (!palco || palco._vcFumo) return;
  palco._vcFumo = true;
  palco.addEventListener('pointerdown', ev => {
    if (ev.button !== 0 || this._espaco) return;
    if (ev.target.closest && ev.target.closest('.planta-flut, .planta-estado, .planta-ctx')) return;
    if (this.ferramenta === 'fumoExt' || this.ferramenta === 'fumoAdm') { ev.stopPropagation(); ev.preventDefault(); this.porBocaFumo(this._pontoBruto ? this._pontoBruto(ev) : this._ponto(ev), this.ferramenta === 'fumoExt' ? 'ext' : 'adm'); return; }
    if (this.ferramenta !== 'sel') return;
    const g = ev.target.closest && ev.target.closest('.planta-fumo'); if (!g) return;
    ev.stopPropagation(); ev.preventDefault();
    this.selecionado = null; this.ramalSel = null; this.fumoSel = { e: g.dataset.esp, i: Number(g.dataset.i) };
    this.redesenhar();
  }, true);
};

/* ── painel da sala ── */
const sala = PN.esquemas.sala, vazio = v => v === undefined || v === null || String(v).trim() === '';
sala.campos.push(
  { id: 'desenfumagem', rot: 'Controlo de fumo', tipo: 'opcoes', opcoes: () => [['', '— sem desenfumagem —'], ['passiva', 'desenfumagem passiva (tiragem natural)'], ['ativa', 'desenfumagem ativa (mecânica)']],
    ler: e => e.desenfumagem || '', proposto: e => { const d = VC.normas.desenfumagem(e); return d.exigido ? { v: 'ativa', origem: 'norma', nota: 'exigido (RT-SCIE 135.º)' } : null; },
    escrever: (e, v) => { if (vazio(v)) delete e.desenfumagem; else e.desenfumagem = v; }, ajuda: 'RT-SCIE: a passiva não é permitida em locais amplos com mais de 12 m de altura; a ativa tem com extração mecânica e admissão natural ou mecânica.' },
  { id: 'fumoExigido', rot: 'Exigir controlo de fumo', tipo: 'sim', vis: e => !VC.normas.desenfumagem(Object.assign({}, e, { fumoExigido: false })).exigido,
    ler: e => !!e.fumoExigido, escrever: (e, v) => { if (v) e.fumoExigido = true; else delete e.fumoExigido; }, ajuda: 'Para vias de evacuação enclausuradas, câmaras corta-fogo e outros casos do art. 135.º que a app não deduz.' },
  { id: 'up', rot: 'Largura da via (unidades de passagem)', tipo: 'num', un: 'UP', min: 1, passo: 1, vis: e => VC.normas.desenfumagem(e).circ && !!e.desenfumagem,
    ler: e => (Number(e.up) > 0 ? e.up : ''), proposto: () => ({ v: 1, origem: 'norma' }), escrever: (e, v) => { const n = Math.round(VC.utils.num(v)); if (n > 0) e.up = n; else delete e.up; } }
);
const resB = sala.resultado, pfB = sala.porFazer;
sala.resultado = (e, p) => {
  const out = resB(e, p), d = VC.normas.desenfumagem(e);
  if (!d.exigido && !d.metodo) return out;
  out.push(['Controlo de fumo', d.metodo ? 'desenfumagem ' + d.metodo : 'por definir', d.exigido ? 'exigido: ' + d.motivos.join('; ') : 'opção do projeto']);
  if (d.Qext) out.push(['Extração de fumo', fmt(d.Qext, 2) + ' m³/s (' + fmt(d.Qext * 3600, 0) + ' m³/h)', d.base]);
  if (d.bocas) out.push(['Bocas de extração', d.bocas + ' · desenhadas ' + ((e.planta && e.planta.fumo) || []).filter(b => b.tipo === 'ext').length, 'a ≥ 1,8 m do pavimento (art. 144.º)']);
  if (d.Qadm) out.push(['Admissão de ar', fmt(d.Qadm, 2) + ' m³/s', '≈ 60 % da extração, < 5 m/s → ≥ ' + fmt(d.Aadm, 2) + ' m² (art. 145.º)']);
  if (d.Asaida) out.push(['Aberturas de saída', '≥ ' + fmt(d.Asaida, 2) + ' m² cada', d.base]);
  if (d.alcance) out.push(['Alcance das aberturas', fmt(d.alcance, 1) + ' m', d.base]);
  return out;
};
sala.porFazer = (e, p) => {
  const base = pfB ? pfB(e, p) : [], d = VC.normas.desenfumagem(e);
  return base.concat(d.porFazer, d.falhas, P.verificarFumoPlanta(e, p || P.pisoAtual()));
};
/* menu de contexto da sala */
if (P._acoesContexto) {
  const acB = P._acoesContexto;
  P._acoesContexto = function (alvo) {
    const out = acB.call(this, alvo);
    const e = alvo && alvo.tipo === 'sala' && alvo.o;
    if (e && e.tipo === 'Escadas') out.push({ ic: 'fumoAdm', rot: e.pressurizada ? 'Tirar a pressurização' : 'Pressurizar a escada', js: 'VC.planta.definirEscada(' + JSON.stringify(e.id) + ", 'pressurizada', " + !e.pressurizada + ')' });
    if (alvo && alvo.tipo === 'sala') out.push({ ic: 'fumoExt', rot: 'Pôr extração de fumo', js: "VC.planta.setFerramenta('fumoExt')" }, { ic: 'fumoAdm', rot: 'Pôr admissão de ar (fumo)', js: "VC.planta.setFerramenta('fumoAdm')" });
    return out;
  };
}
})();
