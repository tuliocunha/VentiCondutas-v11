/* ============================================================
   VentiCondutas · Planta: direção e alcance dos terminais, grelha linear (Fase 5B)
   ------------------------------------------------------------
   · Cada terminal de insuflação tem direção (graus) e vias: difusor de teto
     4, grelha e jato 1, difusor linear 1 ou 2. Sem direção escrita, a grelha
     aponta da parede mais perto para dentro da sala.
   · O alcance L0,25 (catálogo, ou jato livre K·v0·√A0/vt) desenha-se como
     setas a tracejado até onde o ar abranda para 0,25 m/s e compara-se com a
     distância à parede nessa direção: curto (< 0,5) ou a bater na parede (> 1,0).
   · O difusor linear desenha-se com o seu comprimento.
   · Ver: terminal selecionado sempre; todos com «Mostrar os alcances» (☰,
     botão direito ou painel do piso). Rodar 90° no botão direito.
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('44-planta-alcance');
const P = VC.planta, PN = VC.paineis, C = VC.calculo;
if (!P || !P._svg || !PN || !PN.esquemas || !C.alcanceTerminal) return;
const esc = s => VC.utils.esc(s), fmt = (v, d) => VC.utils.fmt(v, d == null ? 1 : d), n2 = v => Math.round(v * 100) / 100;
const porId = (l, id) => (VC.dados[l] || []).find(x => String(x.id) === String(id));
const AL = () => VC.constantes.ALCANCE;
P.mostrarAlcances = false;

/* sala onde está o terminal (pela posição) */
P._salaDoTerminal = function (t, p) { return t.planta && this.salaEm ? this.salaEm([t.planta.x, t.planta.y], p) : null; };
/* direção por omissão: da parede mais perto para dentro (graus, 0 = +x, sentido do ecrã) */
P.direcaoProposta = function (t, p) {
  const e = this._salaDoTerminal(t, p); if (!e) return 0;
  const q = [t.planta.x, t.planta.y], pts = e.planta.pts, L = [];
  for (let i = 0; i < pts.length; i++) { const [d, c] = this._distSeg(q, pts[i], pts[(i + 1) % pts.length]); if (d > 1e-6) L.push({ d, ang: Math.atan2(q[1] - c[1], q[0] - c[0]) }); }
  if (!L.length) return 0;
  L.sort((a, b) => a.d - b.d);
  // num canto (duas paredes perto), a direção que tem mais sala à frente
  const cands = L.filter(x => x.d <= L[0].d * 3 + 1e-9).slice(0, 2);
  const best = cands.reduce((m, x) => { const dd = this._distParede(q, x.ang, pts) || 0; return !m || dd > m.dd ? { ang: x.ang, dd } : m; }, null);
  return (Math.round(best.ang * 180 / Math.PI) + 360) % 360;
};
P.direcaoDe = function (t, p) { const d = t.planta && t.planta.dir; return d != null && d !== '' && isFinite(Number(d)) ? Number(d) : this.direcaoProposta(t, p); };
/* distância (px) do ponto q à parede da sala na direção ang (raio contra os lados do polígono) */
P._distParede = function (q, ang, pts) {
  const dx = Math.cos(ang), dy = Math.sin(ang); let best = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], ex = b[0] - a[0], ey = b[1] - a[1], den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = ((a[0] - q[0]) * ey - (a[1] - q[1]) * ex) / den, u = ((a[0] - q[0]) * dy - (a[1] - q[1]) * dx) / den;
    if (t > 1e-6 && u >= -1e-9 && u <= 1 + 1e-9) best = Math.min(best, t);
  }
  return isFinite(best) ? best : null;
};
/* jatos do terminal: [{ ang (rad), L (m), d (m até à parede), estado }] */
P.jatosDe = function (t, p) {
  const a = t.alcance; if (!a || !t.planta || !p || !p.escala) return [];
  const e = this._salaDoTerminal(t, p), q = [t.planta.x, t.planta.y], base = this.direcaoDe(t, p) * Math.PI / 180;
  const dirs = a.vias >= 4 ? [0, 90, 180, 270] : a.vias === 2 ? [0, 180] : [0];
  return dirs.map(k => {
    const ang = base + k * Math.PI / 180, dpx = e ? this._distParede(q, ang, e.planta.pts) : null, d = dpx != null ? dpx * p.escala : null;
    const estado = d == null ? '' : a.L > AL().LONGO * d ? 'longo' : a.L < AL().CURTO * d ? 'curto' : 'ok';
    return { ang, L: a.L, d, estado };
  });
};
P.avisosAlcance = function (t, p) {
  const J = this.jatosDe(t, p), out = [];
  if (J.some(j => j.estado === 'longo')) out.push('o jato chega à parede antes de abrandar para 0,25 m/s: baixe a velocidade, mude a direção ou o tipo');
  if (J.some(j => j.estado === 'curto')) out.push('o jato não chega a metade da sala nessa direção');
  return out;
};
P.rodarTerminal = function (id, graus) {
  const t = porId('terminais', id), p = this.pisoAtual(); if (!t || !t.planta || this._bloqueado()) return;
  const antes = this._estado(); t.planta.dir = ((this.direcaoDe(t, p) + graus) % 360 + 360) % 360;
  this._empilhar('terminal ' + (t.nome || t.id) + ' rodado', antes); VC.estado.forcarSync(); this.redesenhar();
};
P.alternarAlcances = function () { this.mostrarAlcances = !this.mostrarAlcances; this.redesenhar(); };

/* ── desenho ── */
P._alcanceHTML = function (t, p, z) {
  const J = this.jatosDe(t, p); if (!J.length) return '';
  const q = [t.planta.x, t.planta.y], cor = this.corRede ? this.corRede(t.rede) : '#2f6fb5';
  let h = '';
  J.forEach(j => {
    const Lpx = j.L / p.escala, x2 = q[0] + Math.cos(j.ang) * Lpx, y2 = q[1] + Math.sin(j.ang) * Lpx, c = j.estado === 'longo' ? '#c0392b' : j.estado === 'curto' ? '#e08a00' : cor;
    const nx = -Math.sin(j.ang) * 6 / z, ny = Math.cos(j.ang) * 6 / z;
    h += '<line x1="' + n2(q[0]) + '" y1="' + n2(q[1]) + '" x2="' + n2(x2) + '" y2="' + n2(y2) + '" stroke="' + c + '" stroke-width="' + n2(1.8 / z) + '" stroke-dasharray="' + n2(6 / z) + ' ' + n2(4 / z) + '" stroke-opacity=".9"/>'
      + '<line x1="' + n2(x2 - nx) + '" y1="' + n2(y2 - ny) + '" x2="' + n2(x2 + nx) + '" y2="' + n2(y2 + ny) + '" stroke="' + c + '" stroke-width="' + n2(2.4 / z) + '"/>';
    if (z >= 0.6) h += '<text x="' + n2(x2 + Math.cos(j.ang) * 5 / z) + '" y="' + n2(y2 + Math.sin(j.ang) * 5 / z + 3 / z) + '" font-size="' + n2(8 / z) + '" font-weight="700" fill="' + c + '" text-anchor="middle" paint-order="stroke" stroke="#fff" stroke-width="' + n2(3 / z) + '">' + fmt(j.L, 1) + ' m' + (j.d != null ? ' / ' + fmt(j.d, 1) : '') + '</text>';
  });
  return '<g class="planta-alcance" data-t="' + esc(t.id) + '" pointer-events="none"><title>Alcance L0,25 de ' + esc(t.nome || t.id) + ': ' + fmt(J[0].L, 1) + ' m (' + esc(t.alcance.origem) + ')</title>' + h + '</g>';
};
P._linearHTML = function (t, p, z) {
  const comp = Math.max(0.3, Number(t.planta.comp) || 1), Lpx = p.escala ? comp / p.escala : 40 / z, ang = (this.direcaoDe(t, p) + 90) * Math.PI / 180;
  const q = [t.planta.x, t.planta.y], dx = Math.cos(ang) * Lpx / 2, dy = Math.sin(ang) * Lpx / 2, w = 5 / z, cor = this.corRede ? this.corRede(t.rede) : '#2f6fb5';
  return '<line class="planta-linear" x1="' + n2(q[0] - dx) + '" y1="' + n2(q[1] - dy) + '" x2="' + n2(q[0] + dx) + '" y2="' + n2(q[1] + dy) + '" stroke="' + cor + '" stroke-width="' + n2(w) + '" stroke-linecap="butt" pointer-events="none"><title>Difusor linear ' + esc(t.nome || '') + ' · ' + fmt(comp, 2) + ' m</title></line>';
};
const svgBase = P._svg;
P._svg = function (p) {
  const s = svgBase.call(this, p); if (!p) return s;
  const z = this.zoom || 1; let g = '', lin = '';
  (VC.dados.terminais || []).forEach(t => {
    if (!t.planta || t.planta.pisoId !== p.id) return;
    if (t.tipo === 'Difusor Linear') lin += this._linearHTML(t, p, z);
    if (this.mostrarAlcances || String(this.termSel) === String(t.id)) g += this._alcanceHTML(t, p, z);
  });
  if (!g && !lin) return s;
  const corte = s.indexOf('<g class="planta-term"') >= 0 ? s.indexOf('<g class="planta-term"') : s.lastIndexOf('</svg>');
  return s.slice(0, corte) + '<g class="planta-alcances">' + lin + g + '</g>' + s.slice(corte);
};

/* ── painel do terminal ── */
const term = PN.esquemas.terminal;
if (term) {
  const insuf = t => !VC.redes.ehExtracao(t.rede);
  term.campos.push(
    { id: 'dir', rot: 'Direção do jato', tipo: 'num', ess: true, un: '°', passo: 15, vis: t => insuf(t) && !!t.planta,
      ler: t => (t.planta.dir != null && t.planta.dir !== '' ? t.planta.dir : ''), proposto: (t) => ({ v: P.direcaoProposta(t, P.pisoAtual()), origem: 'medido', nota: 'da parede para dentro' }),
      escrever: (t, v) => { if (String(v).trim() === '') delete t.planta.dir; else t.planta.dir = ((VC.utils.num(v) % 360) + 360) % 360; }, ajuda: '0° = para a direita no ecrã, 90° = para baixo. Botão direito → Rodar 90°.' },
    { id: 'vias', rot: 'Vias', tipo: 'opcoes', ess: true, vis: t => t.tipo === 'Difusor Linear' && !!t.planta, opcoes: () => [['2', '2 (para os dois lados)'], ['1', '1 (para um lado)']],
      ler: t => String(t.planta.vias || ''), proposto: () => ({ v: '2', origem: 'norma' }), escrever: (t, v) => { if (v === '1') t.planta.vias = 1; else delete t.planta.vias; } },
    { id: 'comp', rot: 'Comprimento', tipo: 'num', ess: true, un: 'm', min: 0.3, passo: 0.1, vis: t => t.tipo === 'Difusor Linear' && !!t.planta,
      ler: t => (Number(t.planta.comp) > 0 ? t.planta.comp : ''), proposto: () => ({ v: 1, origem: 'norma' }), escrever: (t, v) => { const n = VC.utils.num(v); if (n > 0) t.planta.comp = n; else delete t.planta.comp; } }
  );
  const resB = term.resultado, pfB = term.porFazer;
  term.resultado = (t, p) => {
    const out = resB(t, p); if (!t.alcance) return out;
    const J = P.jatosDe(t, p || P.pisoAtual());
    out.push(['Alcance L0,25', fmt(t.alcance.L, 1) + ' m × ' + t.alcance.vias + ' via' + (t.alcance.vias > 1 ? 's' : ''), t.alcance.origem + (t.alcance.v0 ? ' · v0 ' + fmt(t.alcance.v0, 1) + ' m/s' : '')]);
    if (J.some(j => j.d != null)) out.push(['Até à parede', J.map(j => j.d != null ? fmt(j.d, 1) + ' m' : '—').join(' · '), J.map(j => ({ ok: 'bom', curto: 'curto', longo: 'bate na parede' }[j.estado] || '')).join(' · ')]);
    return out;
  };
  term.porFazer = (t, p) => (pfB ? pfB(t, p) : []).concat(t.alcance ? P.avisosAlcance(t, p || P.pisoAtual()) : []);
  const acB = term.acoes;
  term.acoes = (t, p) => { const a = acB ? acB(t, p) : []; if (t.planta && !VC.redes.ehExtracao(t.rede)) a.unshift(['Rodar 90°', "VC.planta.rodarTerminal('" + esc(String(t.id)) + "', 90)"]); return a; };
}
const piso = PN.esquemas.piso;
if (piso && piso.acoes) { const b = piso.acoes; piso.acoes = (o, p) => (b(o, p) || []).concat([[P.mostrarAlcances ? 'Esconder os alcances' : 'Mostrar os alcances dos terminais', 'VC.planta.alternarAlcances()']]); }
else if (piso) piso.acoes = () => [[P.mostrarAlcances ? 'Esconder os alcances' : 'Mostrar os alcances dos terminais', 'VC.planta.alternarAlcances()']];
/* menu de contexto */
if (P._acoesContexto) {
  const acB = P._acoesContexto;
  P._acoesContexto = function (alvo) {
    const out = acB.call(this, alvo);
    if (alvo && alvo.tipo === 'terminal' && !VC.redes.ehExtracao(alvo.o.rede)) out.unshift({ ic: 'rodar', rot: 'Rodar 90°', js: "VC.planta.rodarTerminal('" + esc(String(alvo.o.id)) + "', 90)" });
    out.push({ ic: 'term', rot: this.mostrarAlcances ? 'Esconder os alcances dos terminais' : 'Mostrar os alcances dos terminais', js: 'VC.planta.alternarAlcances()' });
    return out;
  };
}
})();
