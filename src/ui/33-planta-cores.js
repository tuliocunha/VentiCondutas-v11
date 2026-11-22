/* ============================================================
   VentiCondutas · Planta: cores das redes (EN 16798-3) e siglas dos terminais
   ------------------------------------------------------------
   · Por omissão, as cores dos tipos de ar da EN 16798-3 (antiga EN 13779)
     e da EN 12792: ODA ar exterior verde · SUP insuflação azul ·
     ETA extração amarelo (ar sujo: amarelo escuro) · EHA rejeição castanho ·
     TRA transferência cinzento. O utilizador muda-as no painel do Piso
     (Avançado → cores), para todo o projeto; ↺ volta à norma.
   · A cor da conduta é sempre a da rede. Erro ou atenção num ramal veem-se
     no contorno tracejado (vermelho / âmbar), não na cor da conduta.
   · Terminais com a sigla do tipo: GI, GE, VE, DI…; a letra fica preta ou
     branca conforme o contraste com a cor.
   · Legenda das redes no topo da legenda da planta.
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('33-planta-cores');
const P = VC.planta;
if (!P || !P._svg) return;
const esc = s => VC.utils.esc(s);
const NORMA = () => VC.constantes.PALETA_REDES;
const ROTULOS = { SUP: 'Insuflação · SUP', ETA: 'Extração · ETA', ETA_SUJO: 'Extração de ar sujo · ETA', ODA: 'Ar exterior · ODA', EHA: 'Rejeição · EHA', TRA: 'Transferência · TRA' };

P.cores = function () {
  const u = (VC.dados.params && VC.dados.params.paletaRedes) || {};
  const out = Object.assign({}, NORMA());
  Object.keys(out).forEach(k => { if (/^#[0-9a-f]{6}$/i.test(u[k] || '')) out[k] = u[k]; });
  return out;
};
P.corRede = function (rede) { const C = this.cores(); return rede === 'insuflacao' ? C.SUP : rede === 'extracao_suja' ? C.ETA_SUJO : C.ETA; };
P._corRamal = function (r) { return this.corRede(r.rede); };
P._corEstado = function (r) {
  if (r.status === 'ERRO' || r.status === 'NÃO CONF.') return '#c0392b';
  if (r.status === 'ATENÇÃO' || r.avisoSecao) return '#e08a00';
  return null;
};
P._corTerm = function (t) { return this.corRede(t.rede); };
P._corTrf = function () { return this.cores().TRA; };
/* preto ou branco, o que tiver mais contraste com a cor de fundo (luminância relativa WCAG) */
P._corTexto = function (hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return '#fff';
  const c = [0, 2, 4].map(i => parseInt(m[1].substr(i, 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return (1.05 / (L + 0.05)) >= ((L + 0.05) / 0.05) ? '#fff' : '#111827';
};

/* siglas dos terminais (as da legenda habitual dos projetos) */
const SIGLAS = { 'Grelha Insuflação': 'GI', 'Difusor': 'DI', 'Difusor Linear': 'DLI', 'Jato de Ar': 'JA', 'Grelha Extração': 'GE', 'Válvula': 'VE', 'Boca de Extração': 'BE' };
P.SIGLAS_TERMINAL = SIGLAS;
P._letra = function (t) { return SIGLAS[t.tipo] || (t.rede === 'insuflacao' ? 'I' : 'E'); };

/* legenda: só as redes que existem neste piso, mais ar exterior / rejeição se houver equipamentos */
P._legendaHTML = function (p) {
  if (!p) return '';
  const C = this.cores(), R = this.ramaisDoPiso ? this.ramaisDoPiso(p) : [], T = (VC.dados.terminais || []).filter(t => t.planta && t.planta.pisoId === p.id);
  const redes = new Set(R.map(r => r.rede).concat(T.map(t => t.rede)));
  const itens = [];
  if (redes.has('insuflacao')) itens.push(['SUP', 'linha']);
  if (redes.has('extracao')) itens.push(['ETA', 'linha']);
  if (redes.has('extracao_suja')) itens.push(['ETA_SUJO', 'linha']);
  if (this.mostrarSentido !== false && R.some(r => !r.parente && r.utaRef)) {
    const U = R.filter(r => !r.parente && r.utaRef).map(r => (VC.dados.utas || []).find(u => String(u.id) === String(r.utaRef))).filter(Boolean);
    if (U.some(u => !VC.redes.ehExtracao(u.rede))) itens.push(['ODA', 'trac']);
    if (U.some(u => VC.redes.ehExtracao(u.rede))) itens.push(['EHA', 'trac']);
  }
  if ((VC.dados.transferencias || []).length) itens.push(['TRA', 'linha']);
  if (!itens.length) return '';
  const amostra = (k, tipo) => '<svg width="26" height="10" aria-hidden="true"><line x1="1" y1="5" x2="25" y2="5" stroke="' + C[k] + '" stroke-width="' + (tipo === 'trac' ? 2.5 : 5) + '"' + (tipo === 'trac' ? ' stroke-dasharray="5 3"' : '') + '/></svg>';
  return '<div class="planta-leg-redes" role="note" aria-label="Legenda das redes">'
    + itens.map(([k, t]) => '<span>' + amostra(k, t) + esc(ROTULOS[k]) + '</span>').join('')
    + '<small>cores EN 16798-3 · mudar no painel do piso</small></div>';
};
/* a legenda das redes entra no topo da legenda da planta (a das salas fica por baixo) */
const renderBase = P.render;
P.render = function () {
  const h = renderBase.apply(this, arguments);
  const p = this.pisoAtual && this.pisoAtual();
  const leg = p ? this._legendaHTML(p) : '';
  return leg ? h.replace('<div class="planta-flut planta-legenda">', '<div class="planta-flut planta-legenda">' + leg) : h;
};
const redesenharBase = P.redesenhar;
P.redesenhar = function () {   // acompanha o desenho (ramais novos, cores mudadas)
  const r = redesenharBase.apply(this, arguments);
  const caixa = document.querySelector('#plantaTela .planta-legenda'); if (!caixa) return r;
  const velha = caixa.querySelector('.planta-leg-redes'), html = this._legendaHTML(this.pisoAtual && this.pisoAtual());
  if (velha) { if (html) velha.outerHTML = html; else velha.remove(); }
  else if (html) caixa.insertAdjacentHTML('afterbegin', html);
  return r;
};

/* painel do piso: cores das redes (todo o projeto) */
if (VC.paineis && VC.paineis.esquemas && VC.paineis.esquemas.piso) {
  const E = VC.paineis.esquemas.piso;
  Object.keys(ROTULOS).forEach(k => {
    E.campos.push({ id: 'cor_' + k, rot: 'Cor · ' + ROTULOS[k], tipo: 'cor',
      ler: () => ((VC.dados.params.paletaRedes || {})[k] || ''),
      proposto: () => ({ v: NORMA()[k], origem: 'norma', nota: 'EN 16798-3' }),
      escrever: (p, v) => {
        const pal = VC.dados.params.paletaRedes = Object.assign({}, VC.dados.params.paletaRedes);
        if (!v || String(v).toLowerCase() === NORMA()[k].toLowerCase()) delete pal[k]; else pal[k] = String(v);
      },
      ajuda: k === 'SUP' ? 'As cores valem para todo o projeto. ↺ repõe a cor da norma.' : null });
  });
}
})();
