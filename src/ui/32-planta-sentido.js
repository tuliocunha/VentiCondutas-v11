/* ============================================================
   VentiCondutas · Planta: sentido do ar (automático)
   ------------------------------------------------------------
   Nada disto se desenha à mão: sai da rede e do equipamento.
   · Ramais: setas ao longo da conduta. Insuflação: do equipamento para os
     terminais (sentido do traçado); extração: dos terminais para o equipamento.
     Uma seta ao contrário mostra um traçado desenhado do lado errado
     («Inverter o sentido» no painel do ramal).
   · Terminais: 4 pontas para fora (insuflação: o ar sai) ou para dentro
     (extração: o ar entra).
   · Equipamento: no início de cada ramal principal, o código do tipo
     (VAN, VEG, VMC…) e a ligação ao exterior que esse tipo tem:
       insuflação → captação de ar exterior (seta verde a entrar);
       extração → rejeição para o exterior (seta laranja a sair).
     A posição real da tomada e da rejeição na fachada vem na Fase 3.
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('32-planta-sentido');
const P = VC.planta;
if (!P || !P._svg) return;
const esc = s => VC.utils.esc(s);
const n2 = v => Math.round(v * 100) / 100;
const COR_AR_EXTERIOR = '#1f8f4e', COR_REJEICAO = '#d9822b';

P.mostrarSentido = true;
P.alternarSentido = function () { this.mostrarSentido = !this.mostrarSentido; this.redesenhar(); VC.ui.toast(this.mostrarSentido ? 'Sentido do ar visível.' : 'Sentido do ar escondido.'); };

/* o ar vai no sentido do traçado (insuflação) ou ao contrário (extração) */
P.sentidoDoAr = r => (VC.redes.ehExtracao(r.rede) ? -1 : 1);

/* setas espaçadas ~110 px no ecrã ao longo de um traçado */
P._setasTracado = function (pts, sentido, cor, z, larg) {
  const passo = 110 / z, s = Math.max(4.5 / z, Math.min(larg * 0.42, 9 / z));
  const tot = this.comprimentoPx(pts); if (!(tot * z > 60)) return '';
  const n = Math.max(1, Math.floor(tot / passo)), out = [];
  for (let k = 0; k < n; k++) {
    const alvo = tot * (k + 0.5) / n; let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (acc + l >= alvo && l > 0) {
        const t = (alvo - acc) / l, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI + (sentido < 0 ? 180 : 0);
        out.push('<path d="M' + n2(-s * 0.6) + ',' + n2(-s) + ' L' + n2(s * 0.6) + ',0 L' + n2(-s * 0.6) + ',' + n2(s) + '" transform="translate(' + n2(x) + ',' + n2(y) + ') rotate(' + n2(ang) + ')"');
        break;
      }
      acc += l;
    }
  }
  // cada seta duas vezes: na cor da rede e grossa por baixo, branca e fina por cima (lê-se em condutas largas e finas)
  const fina = n2(Math.max(1.6 / z, s * 0.38)), grossa = n2(Math.max(3.6 / z, s * 0.75));
  return out.map(d => d + ' class="planta-seta-ar" data-sentido="' + sentido + '" fill="none" stroke="' + cor + '" stroke-width="' + grossa + '" stroke-linecap="round" stroke-linejoin="round"/>').join('')
    + out.map(d => d + ' fill="none" stroke="#fff" stroke-width="' + fina + '" stroke-linecap="round" stroke-linejoin="round"/>').join('');
};

/* pontas à volta do terminal: para fora (insuflação) ou para dentro (extração) */
P._pontasTerminal = function (t, z) {
  const r = 10 / z, s = 3.4 / z, cx = t.planta.x, cy = t.planta.y, fora = t.rede === 'insuflacao', c = this._corTerm(t);
  let h = '';
  [0, 90, 180, 270].forEach(a => {
    const d = r + (fora ? 2.5 / z : 6.5 / z);
    const pt = fora ? 'M0,' + n2(-s) + ' L' + n2(s * 1.3) + ',0 L0,' + n2(s) + ' z' : 'M' + n2(s * 1.3) + ',' + n2(-s) + ' L0,0 L' + n2(s * 1.3) + ',' + n2(s) + ' z';
    h += '<path d="' + pt + '" transform="translate(' + n2(cx) + ',' + n2(cy) + ') rotate(' + a + ') translate(' + n2(d) + ',0)" fill="' + c + '" stroke="#fff" stroke-width="' + n2(0.8 / z) + '"/>';
  });
  return h;
};

/* equipamento no início do ramal principal, com a ligação ao exterior que o tipo tem */
P._equipamentoNoInicio = function (r, z) {
  const u = (VC.dados.utas || []).find(x => String(x.id) === String(r.utaRef)); if (!u) return '';
  const pts = r.planta.pts, a = pts[0], b = pts[1];
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (a[0] - b[0]) / l, uy = (a[1] - b[1]) / l;   // para fora da conduta
  const t = VC.uta.tipoSistemaDe(u), cod = t ? t.codigo : 'UTA', lado = 15 / z;
  const cx = a[0] + ux * lado * 0.75, cy = a[1] + uy * lado * 0.75;
  const ext = !VC.redes.ehExtracao(u.rede), cor = ext ? COR_AR_EXTERIOR : COR_REJEICAO;
  const p0 = [cx + ux * lado * 0.62, cy + uy * lado * 0.62], p1 = [p0[0] + ux * 30 / z, p0[1] + uy * 30 / z];
  const [de, para] = ext ? [p1, p0] : [p0, p1];
  const ang = Math.atan2(para[1] - de[1], para[0] - de[0]) * 180 / Math.PI, s = 5 / z;
  const rot = ext ? 'ar exterior' : 'rejeição', lx = p1[0] + ux * 6 / z, ly = p1[1] + uy * 6 / z;
  const anc = Math.abs(ux) > Math.abs(uy) ? (ux > 0 ? 'start' : 'end') : 'middle', dy = Math.abs(uy) >= Math.abs(ux) ? (uy > 0 ? 9 / z : -3 / z) : 3.5 / z;
  return '<g class="planta-equip" data-u="' + esc(u.id) + '" data-lig="' + (ext ? 'ar-exterior' : 'rejeicao') + '" data-tipo="' + esc(cod) + '" pointer-events="none"><title>' + esc(u.nome) + (t ? ' · ' + esc(t.nome) : '') + ' · ' + (ext ? 'capta ar exterior' : 'rejeita para o exterior') + '</title>'
    + '<line x1="' + n2(de[0]) + '" y1="' + n2(de[1]) + '" x2="' + n2(para[0]) + '" y2="' + n2(para[1]) + '" stroke="' + cor + '" stroke-width="' + n2(2.6 / z) + '" stroke-dasharray="' + n2(5 / z) + ' ' + n2(3 / z) + '"/>'
    + '<path d="M' + n2(-s * 1.4) + ',' + n2(-s) + ' L0,0 L' + n2(-s * 1.4) + ',' + n2(s) + ' z" transform="translate(' + n2(para[0]) + ',' + n2(para[1]) + ') rotate(' + n2(ang) + ')" fill="' + cor + '"/>'
    + (z >= 0.8 ? '<text x="' + n2(lx) + '" y="' + n2(ly + dy) + '" text-anchor="' + anc + '" font-size="' + n2(9.5 / z) + '" font-weight="700" fill="' + cor + '" paint-order="stroke" stroke="#fff" stroke-width="' + n2(3 / z) + '">' + rot + '</text>' : '')   // com a planta longe, só a seta (o texto fica no título)
    + '<rect x="' + n2(cx - lado / 2 * 1.25) + '" y="' + n2(cy - lado / 2) + '" width="' + n2(lado * 1.25) + '" height="' + n2(lado) + '" rx="' + n2(2.5 / z) + '" fill="#1e293b" stroke="#fff" stroke-width="' + n2(1.5 / z) + '"/>'
    + '<text x="' + n2(cx) + '" y="' + n2(cy + 3.4 / z) + '" text-anchor="middle" font-size="' + n2(8.5 / z) + '" font-weight="800" fill="#fff">' + esc(cod) + '</text></g>';
};

const svgBase = P._svg;
P._svg = function (p) {
  const s = svgBase.call(this, p);
  if (!this.mostrarSentido || !p) return s;
  const z = this.zoom || 1;
  let setas = '', equip = '';
  (this.ramaisDoPiso ? this.ramaisDoPiso(p) : []).forEach(r => {
    const cor = this._corRamal(r), sent = this.sentidoDoAr(r);
    const larg = D => { const d = Number(D) || Number(r.Dcom) || 160; return p.escala ? Math.max(d / 1000 / p.escala, 2.5 / z) : Math.max(2.5, Math.min(9, d / 45)) / z; };
    (this._trocosNoTracado ? this._trocosNoTracado(r) : [{ t: r, pts: r.planta.pts }]).forEach(({ t, pts }) => { setas += this._setasTracado(pts, sent, cor, z, larg(t.Dcom)); });
    if (!r.parente && r.utaRef && r.planta.pts.length >= 2) equip += this._equipamentoNoInicio(r, z);
  });
  let pontas = '';
  (VC.dados.terminais || []).forEach(t => { if (t.planta && t.planta.pisoId === p.id) pontas += this._pontasTerminal(t, z); });
  // setas e equipamentos por cima dos ramais e por baixo dos terminais; as pontas dos terminais por baixo deles
  const g = '<g class="planta-sentido" pointer-events="none">' + setas + equip + pontas + '</g>';
  const corte = s.indexOf('<g class="planta-term"') >= 0 ? s.indexOf('<g class="planta-term"') : s.lastIndexOf('</svg>');
  return s.slice(0, corte) + g + s.slice(corte);
};

/* menu ☰: mostrar ou esconder */
if (P._menuHTML) {
  const menuBase = P._menuHTML;
  P._menuHTML = function () {
    const h = menuBase.call(this);
    const i = this._acoesMenu.push(() => this.alternarSentido()) - 1;
    return h.replace(/<\/div><\/div>$/, '<button type="button" role="menuitem" class="pm-item" onclick="VC.planta._doMenu(' + i + ')"><span class="pm-ic">➜</span><span class="pm-rot">' + (this.mostrarSentido ? 'Esconder' : 'Mostrar') + ' o sentido do ar</span></button></div></div>');
  };
}
})();
