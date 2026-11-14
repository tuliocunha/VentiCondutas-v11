/* ============================================================
   VentiCondutas v11.3 · Planta: ferramenta Terminal e ícones
   ------------------------------------------------------------
   · Terminal (D): clicar dentro de uma sala desenhada coloca nesse ponto o
     próximo terminal dessa sala que ainda não está na planta (insuflação
     primeiro). Os terminais vêm do passo Terminais (um conjunto por
     espaço, com o caudal da norma); aqui só se escolhe onde ficam. Se o
     ponto estiver sobre um ramal da mesma rede, o terminal liga-se a ele.
   · Ícones desenhados (SVG) para todas as ferramentas: não dependem da
     biblioteca de ícones; o nome, o atalho e o que faz aparecem num menu.
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('23-planta-terminal');
const P = VC.planta;
if (!P || !P.terminaisDe) return;

P.ICONES = {
  sel: 'M5 3l14 7.5-6.2 1.8L10.8 19z',
  mao: 'M8 13V6a1.5 1.5 0 0 1 3 0v5m0-1V4.5a1.5 1.5 0 0 1 3 0V11m0-4.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-.5a6 6 0 0 1-5-2.7L3.8 15a1.5 1.5 0 0 1 2.4-1.8L8 15.5',
  escala: 'M3 17L17 3l4 4L7 21zM7.5 12.5l2 2M10.5 9.5l2 2M13.5 6.5l2 2',
  ret: 'M4 6h16v12H4z',
  pol: 'M12 3l8.5 6.5-3.3 10.5H6.8L3.5 9.5z',
  trf: 'M4 8h14m-4-4l4 4-4 4M20 16H6m4-4l-4 4 4 4',
  ramal: 'M4 20v-7a4 4 0 0 1 4-4h9M14 5l4 4-4 4M4 20h4',
  term: 'M5 5h14v14H5zM9 9h6v6H9zM5 5l4 4M19 5l-4 4M5 19l4-4M19 19l-4-4'
};
P.FERRAMENTAS.push(['term', 'fa-plus', 'Terminal']);
P.TECLAS.term = 'D';
P.DICAS.term = 'Clique dentro de uma sala desenhada para colocar o próximo terminal dessa sala nesse ponto. Sobre um ramal da mesma rede, fica ligado a ele.';

/* coloca o próximo terminal da sala em q */
P.colocarTerminal = function (q) {
  const p = this.pisoAtual(); if (!p || this._bloqueado()) return null;
  const sala = this.salaEm(q, p);
  if (!sala) { VC.ui.toast('Clique dentro de uma sala desenhada (use primeiro o Retângulo ou o Polígono).'); return null; }
  const T = this.terminaisDe(sala);
  if (!T.length) { VC.ui.toast('«' + sala.nome + '» não tem terminais. Os terminais criam-se no passo Terminais (Dimensionamento).'); return null; }
  const livres = T.filter(t => !(t.planta && t.planta.pisoId === p.id)).sort((a, b) => (a.rede === 'insuflacao' ? 0 : 1) - (b.rede === 'insuflacao' ? 0 : 1));
  if (!livres.length) { VC.ui.toast('Os ' + T.length + ' terminais de «' + sala.nome + '» já estão na planta: arraste-os com Selecionar (V). Para ter mais, mude o número no passo Terminais.'); return null; }
  const t = livres[0], antes = this._estado();
  t.planta = { pisoId: p.id, x: Math.round(q[0] * 10) / 10, y: Math.round(q[1] * 10) / 10 };
  this._empilhar('terminal colocado', antes);
  const faltam = livres.length - 1;
  VC.ui.toast('«' + (t.nome || t.id) + '» colocado em «' + sala.nome + '»' + (faltam ? ' · faltam ' + faltam : ' · todos colocados') + '.');
  if (this.ligarTerminalAoRamal && this.ligarTerminalAoRamal(t.id)) return t;   // liga e redesenha
  this.redesenhar();
  return t;
};

const prepBase = P.prepararVista;
P.prepararVista = function () {
  prepBase.apply(this, arguments);
  const palco = this._palco();
  if (!palco || palco._vcTerm) return;
  palco._vcTerm = true;
  palco.addEventListener('pointerdown', ev => {
    if (this.ferramenta !== 'term' || ev.button !== 0 || this._espaco) return;
    if (ev.target.closest && ev.target.closest('.planta-flut, .planta-estado')) return;
    ev.stopPropagation(); ev.preventDefault();
    this.colocarTerminal(this._ponto(ev));
  }, true);
  palco.addEventListener('pointermove', ev => {
    if (this.ferramenta !== 'term') return;
    const out = document.getElementById('plantaMedida'); if (!out) return;
    const sala = this.salaEm(this._ponto(ev));
    if (!sala) { out.textContent = 'fora de uma sala desenhada'; return; }
    const T = this.terminaisDe(sala), p = this.pisoAtual(), livres = T.filter(t => !(t.planta && t.planta.pisoId === p.id));
    out.textContent = sala.nome + ' · ' + (livres.length ? 'próximo: ' + (livres.find(t => t.rede === 'insuflacao') || livres[0]).nome + ' (' + livres.length + ' por colocar)' : 'todos os ' + T.length + ' terminais colocados');
  });
};
})();
