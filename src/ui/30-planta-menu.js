/* ============================================================
   VentiCondutas · Planta: menu «Ferramentas» com nomes e atalhos
   ------------------------------------------------------------
   Menu suspenso (☰) no topo da barra de ferramentas da planta com todas as ferramentas
   (ícone · nome · tecla) e os comandos de teclado (desfazer, refazer,
   confirmar, cancelar, apagar, zoom). Escolher uma linha faz o mesmo que
   o ícone ou a tecla: é um segundo caminho, para quem não sabe os ícones
   nem os atalhos de cor (ergonomia: reconhecer em vez de recordar).
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('30-planta-menu');
const P = VC.planta;
if (!P || !P.render) return;
const esc = s => VC.utils.esc(s);

/* comandos que não são ferramentas: [rótulo, teclas, ação, ativo?] */
const COMANDOS = [
  ['Desfazer', 'Ctrl+Z', () => P.desfazer(), () => (P._pilha || []).length > 0],
  ['Refazer', 'Ctrl+Y', () => P.refazer(), () => (P._refeitas || []).length > 0],
  ['Confirmar o desenho', 'Enter', () => P.gestoEnter && P.gestoEnter(), null],
  ['Cancelar / largar a seleção', 'Esc', () => P.gestoEsc && P.gestoEsc(), () => !!((P.pendenteAtual && P.pendenteAtual()) || (P.temSelecao && P.temSelecao()))],
  ['Apagar o selecionado / último ponto', 'Delete', () => P.gestoApagar && P.gestoApagar(), null],
  ['Mover a vista (manter premido)', 'Espaço', null, null],
  ['Mostrar a planta inteira', 'F', () => P.ajustar(), null],
  ['Tamanho real da imagem', '0', () => P.zoom100(), null],
  ['Aproximar', '+', () => P.zoomBotao(1.25), null],
  ['Afastar', '−', () => P.zoomBotao(1 / 1.25), null]
];

P.menuAberto = false;
P.alternarMenu = function (abrir) {
  this.menuAberto = abrir == null ? !this.menuAberto : !!abrir;
  const m = document.getElementById('plantaMenu'), b = document.getElementById('plantaMenuBt');
  if (m) m.hidden = !this.menuAberto;
  if (b) b.setAttribute('aria-expanded', String(this.menuAberto));
  if (this.menuAberto && m) { const f = m.querySelector('[role="menuitem"]:not([disabled])'); if (f) f.focus(); }
};
P._acoesMenu = [];
P._doMenu = function (n) {
  this.menuAberto = false;
  const f = this._acoesMenu[n]; if (f) f();
  if (!document.getElementById('plantaMenu') || !document.getElementById('plantaMenu').hidden) this.alternarMenu(false);
  const b = document.getElementById('plantaMenuBt'); if (b) b.focus();
};

P._menuHTML = function () {
  const icone = (id, ic) => (this.ICONES && this.ICONES[id])
    ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + this.ICONES[id] + '"/></svg>'
    : '<i class="fa-solid ' + ic + '" aria-hidden="true"></i>';
  const A = this._acoesMenu = [];
  const item = (rot, tecla, fn, cls, ic, ativo) => '<button type="button" role="menuitem" class="pm-item' + (cls || '') + '"' + (fn && ativo !== false ? ' onclick="VC.planta._doMenu(' + (A.push(fn) - 1) + ')"' : ' disabled') + '>'
    + '<span class="pm-ic">' + (ic || '') + '</span><span class="pm-rot">' + esc(rot) + '</span>' + (tecla ? '<kbd>' + esc(tecla) + '</kbd>' : '') + '</button>';
  let h = '<div class="planta-menu">';
  h += '<button type="button" class="planta-ft planta-menubt" id="plantaMenuBt" aria-haspopup="menu" aria-expanded="' + this.menuAberto + '" aria-controls="plantaMenu" aria-label="Menu: nomes das ferramentas e atalhos" title="Nomes das ferramentas e atalhos" onclick="VC.planta.alternarMenu()">'
    + '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>';
  h += '<div class="planta-menu-lista" id="plantaMenu" role="menu" aria-label="Ferramentas e atalhos"' + (this.menuAberto ? '' : ' hidden') + '>';
  h += '<div class="pm-tit" role="presentation">Ferramentas</div>';
  h += this.FERRAMENTAS.map(([id, ic, nome]) => item(nome, this.TECLAS[id] || '', () => (this.escolherFerramenta ? this.escolherFerramenta(id) : this.setFerramenta(id)), this.ferramenta === id ? ' ativo' : '', icone(id, ic))).join('');
  h += '<div class="pm-tit" role="presentation">Comandos</div>';
  h += COMANDOS.map(([rot, t, js, ativo]) => item(rot, t, js, '', '', ativo ? ativo() : undefined)).join('');
  return h + '</div></div>';
};

const renderBase = P.render;
P.render = function () {
  const h = renderBase.apply(this, arguments);
  // no topo da barra de ferramentas: o menu abre ao lado dos ícones que descreve
  return h.replace('aria-orientation="vertical">', 'aria-orientation="vertical">' + this._menuHTML());
};

/* fechar ao clicar fora, com Esc, e navegar com as setas */
document.addEventListener('pointerdown', ev => {
  if (!P.menuAberto) return;
  if (ev.target.closest && ev.target.closest('.planta-menu')) return;
  P.alternarMenu(false);
}, true);
document.addEventListener('keydown', ev => {
  if (!P.menuAberto) return;
  const m = document.getElementById('plantaMenu'); if (!m) return;
  const itens = [...m.querySelectorAll('[role="menuitem"]:not([disabled])')], i = itens.indexOf(document.activeElement);
  if (ev.key === 'Escape') { ev.preventDefault(); ev.stopImmediatePropagation(); P.alternarMenu(false); const b = document.getElementById('plantaMenuBt'); if (b) b.focus(); return; }
  if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { ev.preventDefault(); ev.stopImmediatePropagation(); const n = itens.length; if (n) itens[(i + (ev.key === 'ArrowDown' ? 1 : n - 1) + n) % n].focus(); return; }
  if (ev.key === 'Home' || ev.key === 'End') { ev.preventDefault(); ev.stopImmediatePropagation(); if (itens.length) itens[ev.key === 'Home' ? 0 : itens.length - 1].focus(); }
}, true);
})();
