/* ============================================================
   VentiCondutas · Planta: avisos no próprio desenho (contrato P6, secção 8)
   ------------------------------------------------------------
   Os avisos da verificação (VC.calculo.ultimo.findings) aparecem no
   objeto a que dizem respeito, não só na Entrega:
   · sala: marca no canto (vermelho = erro, âmbar = atenção, cinzento =
     por fazer) com o número de avisos;
   · ramal: contorno tracejado da cor do aviso mais grave;
   · terminal: anel da cor do aviso mais grave;
   · cartão do objeto selecionado: a lista dos seus avisos, que fica à
     vista enquanto o problema persistir (regra da secção 8).
   As marcas não intercetam o rato: os gestos continuam iguais.
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('26-planta-avisos');
const P = VC.planta;
if (!P || !P._svg) return;
const esc = s => VC.utils.esc(s);
const ORDEM = { 'ERRO': 0, 'ATENÇÃO': 1, 'POR FAZER': 2 };
const COR = { 'ERRO': '#b42318', 'ATENÇÃO': '#b7791f', 'POR FAZER': '#64748b' };
const CLASSE = { 'ERRO': 'erro', 'ATENÇÃO': 'atencao', 'POR FAZER': 'porfazer' };

/* avisos indexados pelo nome do elemento (espaço, ramal, terminal, UTA) */
P.avisosPorElemento = function () {
  const F = (VC.calculo && VC.calculo.ultimo && VC.calculo.ultimo.findings) || [];
  const m = new Map();
  F.forEach(f => { if (!f.elemento) return; const k = String(f.elemento); if (!m.has(k)) m.set(k, []); m.get(k).push(f); });
  m.forEach(l => l.sort((a, b) => (ORDEM[a.severidade] ?? 3) - (ORDEM[b.severidade] ?? 3)));
  return m;
};
P.piorAviso = l => (l && l.length ? l[0].severidade : null);

const svgBase = P._svg;
P._svg = function (p) {
  const s = svgBase.call(this, p), z = this.zoom || 1, A = this.avisosPorElemento();
  if (!A.size || this._semAvisos) return s;
  let x = '<g class="planta-avisos" pointer-events="none">';
  this.espacosDoPiso(p).forEach(e => {
    const l = A.get(e.nome); if (!l) return;
    const pts = e.planta.pts, x0 = Math.min(...pts.map(q => q[0])), y0 = Math.min(...pts.map(q => q[1])), sev = this.piorAviso(l), r = 9 / z;
    x += '<g class="planta-aviso-sala" data-esp="' + e.id + '" data-sev="' + CLASSE[sev] + '"><circle cx="' + (x0 + r * 1.4) + '" cy="' + (y0 + r * 1.4) + '" r="' + r + '" fill="' + COR[sev] + '" stroke="#fff" stroke-width="2" vector-effect="non-scaling-stroke"/>'
      + '<text x="' + (x0 + r * 1.4) + '" y="' + (y0 + r * 1.4 + 4 / z) + '" font-size="' + 11 / z + '" text-anchor="middle" font-weight="900" fill="#fff">' + (l.length > 9 ? '9+' : l.length) + '</text></g>';
  });
  this.ramaisDoPiso(p).forEach(r => {
    const l = A.get(r.nome); if (!l) return;
    x += '<polyline class="planta-aviso-ramal" data-r="' + r.id + '" points="' + r.planta.pts.map(q => q.join(',')).join(' ') + '" fill="none" stroke="' + COR[this.piorAviso(l)] + '" stroke-width="2" stroke-dasharray="6 5" vector-effect="non-scaling-stroke"/>';
  });
  (VC.dados.terminais || []).forEach(t => {
    const l = A.get(t.nome || String(t.id)); if (!l || !t.planta || t.planta.pisoId !== p.id) return;
    x += '<circle class="planta-aviso-term" data-t="' + esc(t.id) + '" cx="' + t.planta.x + '" cy="' + t.planta.y + '" r="' + 14 / z + '" fill="none" stroke="' + COR[this.piorAviso(l)] + '" stroke-width="2.5" vector-effect="non-scaling-stroke"/>';
  });
  return s.replace(/<\/svg>$/, x + '</g></svg>');
};

/* cartão: os avisos do objeto selecionado ficam à vista enquanto persistirem */
P._cartaoAvisos = function (titulo, l) {
  if (!l || !l.length) return '';
  return '<div class="planta-card planta-avisos-card"><div class="planta-card-t">Avisos de «' + esc(titulo) + '» (' + l.length + ')</div><ul class="planta-avisos-lista">'
    + l.map(f => '<li><span class="badge ' + (CLASSE[f.severidade] || 'atencao') + '">' + esc(f.severidade === 'POR FAZER' ? 'por fazer' : f.severidade.toLowerCase()) + '</span> <b>' + esc(f.tipo) + '</b><span>' + esc(f.msg || '') + '</span></li>').join('') + '</ul></div>';
};
const painelBase = P._painel;
P._painel = function (p) {
  const h = painelBase.call(this, p), A = this.avisosPorElemento();
  let extra = '';
  const e = this.selecionado != null && (VC.dados.espacos || []).find(x => String(x.id) === String(this.selecionado));
  if (e) {
    extra += this._cartaoAvisos(e.nome, A.get(e.nome));
    (this.terminaisDe ? this.terminaisDe(e) : []).forEach(t => { extra += this._cartaoAvisos(t.nome || t.id, A.get(t.nome || String(t.id))); });
  }
  const r = this.ramalSel != null && (VC.dados.ramais || []).find(x => String(x.id) === String(this.ramalSel));
  if (r) extra += this._cartaoAvisos(r.nome, A.get(r.nome));
  if (this.trfSel != null) {
    const t = (VC.dados.transferencias || []).find(x => String(x.id) === String(this.trfSel));
    if (t) extra += this._cartaoAvisos(t.deNome + ' → ' + t.paraNome, A.get(t.deNome + ' → ' + t.paraNome));
  }
  return extra + h;
};
})();
