/* ============================================================
   VentiCondutas · Manual de desenho dentro da app
   ------------------------------------------------------------
   O manual é docs/guia/index.html (versionado com o código). Abre-se:
   · no menu Docs → Manual de desenho e no menu ☰ da planta;
   · com F1 (como no AutoCAD): na secção do objeto selecionado ou da ferramenta;
   · no botão «?» do cabeçalho de cada painel e de cada grupo de ícones.
   A ajuda só aparece quando o utilizador a pede.
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('50-guia');
const P = VC.planta, PN = VC.paineis;
const URL_GUIA = 'docs/guia/index.html';
const esc = s => VC.utils.esc(s);

VC.guia = {
  GRUPOS: { navegar: 'ref-ferramentas', medir: 'preparar-piso', salas: 'desenhar-sala', condutas: 'tracar-ramal', ar: 'por-terminal', contar: 'contar', fumo: 'controlo-fumo', modificar: 'editar-sala' },
  PAINEIS: { piso: 'ref-campos', sala: 'ref-campos', ramal: 'tracar-ramal', troco: 'ajustar-troco', terminal: 'por-terminal', transferencia: 'transferencia', equipamento: 'por-equipamento',
    exterior: 'tomada-rejeicao', abertura: 'abertura-exterior', prumada: 'criar-prumada', acessorio: 'por-acessorio', multi: 'selecao-multipla' },
  FERRAMENTAS: { sel: 'editar-sala', escala: 'preparar-piso', medir: 'ref-medidas', ret: 'desenhar-sala', pol: 'desenhar-sala', ramal: 'tracar-ramal', prumada: 'criar-prumada', acess: 'por-acessorio',
    equip: 'por-equipamento', grelhaExt: 'tomada-rejeicao', abertExt: 'abertura-exterior', term: 'por-terminal', trf: 'transferencia', icPessoa: 'contar', icSanita: 'contar', icUrinol: 'contar', icDuche: 'contar', icCarro: 'contar', mao: 'ref-ferramentas', apagar: 'editar-sala', fumoExt: 'controlo-fumo', fumoAdm: 'controlo-fumo', mover: 'editar-sala', rodar: 'editar-sala' },
  aberto: false,
  /* secção que corresponde ao que o utilizador está a fazer */
  ancoraAtual() {
    if (P) {
      if (P.multi && P.multi.length >= 2) return this.PAINEIS.multi;
      if (P.trocoSel) return this.PAINEIS.troco;
      const s = PN && PN.selecao && PN.selecao();
      if (s && this.PAINEIS[s.tipo]) return this.PAINEIS[s.tipo];
      if (P.ferramenta && this.FERRAMENTAS[P.ferramenta]) return this.FERRAMENTAS[P.ferramenta];
    }
    return 'comecar';
  },
  abrir(ancora) {
    ancora = ancora || 'comecar';
    let j = document.getElementById('guiaJanela');
    if (!j) {
      j = document.createElement('div');
      j.id = 'guiaJanela'; j.className = 'guia-janela'; j.setAttribute('role', 'dialog'); j.setAttribute('aria-label', 'Manual de desenho');
      j.innerHTML = '<div class="guia-caixa"><div class="guia-barra"><b>Manual de desenho</b><a id="guiaNova" target="_blank" rel="noopener" title="Abrir numa janela à parte">Abrir à parte ↗</a><button type="button" class="guia-fechar" onclick="VC.guia.fechar()" aria-label="Fechar o manual (Esc)">×</button></div><iframe id="guiaQuadro" title="Manual de desenho"></iframe></div>';
      j.addEventListener('pointerdown', ev => { if (ev.target === j) this.fechar(); });
      document.body.appendChild(j);
    }
    const url = URL_GUIA + '#' + encodeURIComponent(ancora);
    const f = document.getElementById('guiaQuadro');
    if (f.getAttribute('src') && f.contentWindow && f.getAttribute('src').split('#')[0] === URL_GUIA) { try { f.contentWindow.location.hash = ancora; } catch (e) { f.setAttribute('src', url); } }
    else f.setAttribute('src', url);
    f.dataset.ancora = ancora;
    document.getElementById('guiaNova').setAttribute('href', url);
    j.classList.add('aberto'); this.aberto = true;
    return url;
  },
  fechar() { const j = document.getElementById('guiaJanela'); if (j) j.classList.remove('aberto'); this.aberto = false; try { window.focus(); if (document.activeElement && document.activeElement.tagName === 'IFRAME') document.activeElement.blur(); } catch (e) { /* sem foco */ } }
};

/* F1 abre o manual no sítio certo; Esc fecha-o (na janela, antes dos atalhos da planta) */
window.addEventListener('keydown', ev => {
  if (ev.key === 'F1') { ev.preventDefault(); ev.stopPropagation(); VC.guia.abrir(VC.guia.ancoraAtual()); return; }
  if (ev.key === 'Escape' && VC.guia.aberto) { ev.preventDefault(); ev.stopImmediatePropagation(); VC.guia.fechar(); }
}, true);

/* menu Docs */
const menuDocs = [...document.querySelectorAll('.dropdown')].find(d => /Docs/.test(d.textContent));
if (menuDocs && !menuDocs.querySelector('[data-guia]')) {
  const c = menuDocs.querySelector('.dropdown-content');
  if (c) c.insertAdjacentHTML('afterbegin', '<button data-guia onclick="VC.guia.abrir(\'comecar\')"><i class="fa-solid fa-compass-drafting"></i> Manual de desenho <kbd>F1</kbd></button>');
}

if (!P || !PN) return;
const ajuda = (ancora, rot) => '<button type="button" class="guia-ajuda" title="' + esc(rot) + ' (F1)" aria-label="' + esc(rot) + '" onclick="event.stopPropagation();VC.guia.abrir(\'' + ancora + '\')">?</button>';

/* com o manual aberto, o Esc da planta fecha-o em vez de largar a seleção (o teclado da planta corre antes) */
if (P.gestoEsc) { const escB = P.gestoEsc; P.gestoEsc = function () { if (VC.guia.aberto) { VC.guia.fechar(); return 'guia'; } return escB.apply(this, arguments); }; }

/* «?» no cabeçalho de cada painel */
const renderB = PN.render;
PN.render = function (tipo, o, p) {
  const h = renderB.apply(this, arguments), a = VC.guia.PAINEIS[tipo] || 'ref-painel';
  return h.replace('</header>', ajuda(a, 'Ajuda: abrir o manual nesta secção') + '</header>');
};
if (P._painelMulti) {
  const mB = P._painelMulti;
  P._painelMulti = function () { return mB.apply(this, arguments).replace('</header>', ajuda(VC.guia.PAINEIS.multi, 'Ajuda: seleção múltipla') + '</header>'); };
}
/* «?» no título de cada grupo de ícones */
const redB = P.redesenhar;
P.redesenhar = function () {
  const r = redB.apply(this, arguments);
  document.querySelectorAll('.planta-grupo[data-grupo]').forEach(g => {
    const cab = g.querySelector('.planta-flyout .pfo-cab'), a = VC.guia.GRUPOS[g.dataset.grupo];
    if (cab && a && !cab.querySelector('.guia-ajuda')) cab.insertAdjacentHTML('beforeend', ajuda(a, 'Ajuda: abrir o manual neste grupo'));
  });
  return r;
};
/* menu ☰ da planta */
if (P._menuHTML) {
  const menuB = P._menuHTML;
  P._menuHTML = function () {
    const h = menuB.apply(this, arguments), A = this._acoesMenu;
    if (!A) return h;
    const i = A.push(() => VC.guia.abrir(VC.guia.ancoraAtual())) - 1;
    return h.replace(/<\/div><\/div>$/, '<div class="pm-tit" role="presentation">Ajuda</div><button type="button" role="menuitem" class="pm-item" onclick="VC.planta._doMenu(' + i + ')"><span class="pm-ic">?</span><span class="pm-rot">Manual de desenho</span><kbd>F1</kbd></button></div></div>');
  };
}
})();
