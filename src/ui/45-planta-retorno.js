/* ============================================================
   VentiCondutas · Planta: retorno e recirculação (Fase 6A)
   ------------------------------------------------------------
   Num equipamento de insuflação com a extração em par (UTA com caixa de
   mistura, VCM), escreve-se o caudal recirculado (RCA). A app:
     · tira-o ao ar exterior (Q_ODA = Q_SUP − Q_RCA) e à rejeição (Q_ETA − Q_RCA),
       e a tomada e a rejeição dimensionam-se com esses caudais;
     · conta nas salas só o ar novo (a insuflação × a fração de ar novo) contra
       o mínimo legal da Portaria 138-I;
     · recusa recircular ar sujo (ETA 3/4) e avisa sem ar novo ou retorno a menos.
   Na planta, a caixa do equipamento mostra a seta RCA entre as metades.
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('45-planta-retorno');
const P = VC.planta, PN = VC.paineis, C = VC.calculo;
if (!P || !PN || !PN.esquemas || !PN.esquemas.equipamento || !C.recirculacaoDe) return;
const fmt = (v, d) => VC.utils.fmt(v, d == null ? 1 : d), n2 = v => Math.round(v * 100) / 100;
const porId = (l, id) => (VC.dados[l] || []).find(x => String(x.id) === String(id));
const COR_RCA = '#8e44ad';

const eq = PN.esquemas.equipamento;
const parDe = u => (u.uvbPar ? porId('utas', u.uvbPar) : null);
const insufDe = u => (u.rede === 'insuflacao' ? u : (parDe(u) && parDe(u).rede === 'insuflacao' ? parDe(u) : null));
eq.campos.push({ id: 'recirculacao', rot: 'Recirculação (retorno → insuflação)', tipo: 'num', ess: true, un: 'm³/h', min: 0, passo: 10,
  vis: u => !!insufDe(u),
  ler: u => { const i = insufDe(u); return Number(i.recirculacao) > 0 ? i.recirculacao : ''; },
  proposto: () => ({ v: 0, origem: 'norma', nota: 'só ar novo' }),
  escrever: (u, v) => { const i = insufDe(u), n = Math.max(0, VC.utils.num(v)); if (n > 0) i.recirculacao = n; else delete i.recirculacao; },
  ajuda: 'Parte do ar extraído volta à insuflação (caixa de mistura). Nas salas conta só o ar novo contra o mínimo legal. Ar sujo (cozinhas, IS, garagens) não se recircula.' });
const resB = eq.resultado;
eq.resultado = (u, p) => {
  const out = resB(u, p), i = insufDe(u); if (!i || !(Number(i.Q_rca_mh) > 0)) return out;
  const sup = (Number(i.Q) || 0) * 3600, rca = i.Q_rca_mh, par = parDe(i);
  out.push(['Ar novo', fmt(100 * (i.fracaoArNovo || 0), 0) + ' %', 'ODA ' + fmt(sup - rca, 0) + ' + RCA ' + fmt(rca, 0) + ' = SUP ' + fmt(sup, 0) + ' m³/h']);
  if (par) out.push(['Ar rejeitado (EHA)', fmt((Number(par.Q) || 0) * 3600 - rca, 0) + ' m³/h', 'ETA ' + fmt((Number(par.Q) || 0) * 3600, 0) + ' − RCA ' + fmt(rca, 0)]);
  return out;
};

/* sala: o ar novo que lhe chega, quando há recirculação */
const sala = PN.esquemas.sala;
if (sala && C.QarNovoAoEspaco) {
  const rs = sala.resultado;
  sala.resultado = (e, p) => {
    const out = rs(e, p), qs = C.QservidoAoEspaco ? C.QservidoAoEspaco(e.nome, 'insuflacao') : 0, qn = C.QarNovoAoEspaco(e.nome);
    if (qs > 0 && qn < qs - 0.5) { const c = C.calcularQEspaco ? C.calcularQEspaco(e) : {}; out.push(['Ar novo servido', fmt(qn, 0) + ' m³/h', 'de ' + fmt(qs, 0) + ' insuflados (recirculação)' + (Number(c.Q_normas) > 0 ? ' · mínimo ' + fmt(c.Q_normas, 0) + (qn + 0.5 < Number(c.Q_normas) ? ' · ABAIXO' : ' · OK') : '')]); }
    return out;
  };
}

/* planta: seta RCA na caixa de duplo fluxo */
if (P._equipHTML) {
  const eqB = P._equipHTML;
  P._equipHTML = function (u, p, z) {
    const h = eqB.call(this, u, p, z), i = insufDe(u), par = i && parDe(i);
    if (!i || !par || !(Number(i.Q_rca_mh) > 0) || !/data-par=/.test(h)) return h;
    // por cima da caixa (as ligações ao exterior saem para fora pelos lados ou por baixo)
    const o = [u.planta.x, u.planta.y], w = 40 / z, hh = 24 / z, top = o[1] - hh / 2, s = 4 / z;
    const arco = '<path d="M' + n2(o[0] + w * 0.3) + ',' + n2(top) + ' Q' + n2(o[0]) + ',' + n2(top - 14 / z) + ' ' + n2(o[0] - w * 0.3) + ',' + n2(top) + '" fill="none" stroke="' + COR_RCA + '" stroke-width="' + n2(2.2 / z) + '"/>'
      + '<path d="M' + n2(o[0] - w * 0.3 - s) + ',' + n2(top - s) + ' L' + n2(o[0] - w * 0.3) + ',' + n2(top) + ' L' + n2(o[0] - w * 0.3 + s * 1.3) + ',' + n2(top - s * 0.6) + '" fill="none" stroke="' + COR_RCA + '" stroke-width="' + n2(2 / z) + '"/>'
      + (z >= 0.5 ? '<text x="' + n2(o[0]) + '" y="' + n2(top - 13 / z) + '" text-anchor="middle" font-size="' + n2(8 / z) + '" font-weight="800" fill="' + COR_RCA + '" paint-order="stroke" stroke="#fff" stroke-width="' + n2(3 / z) + '">RCA ' + fmt(i.Q_rca_mh, 0) + '</text>' : '');
    return h.replace(/<\/g>$/, '<g class="planta-rca">' + arco + '</g></g>');
  };
}
})();
