/* ============================================================
   VENTCONDUTAS V11.1.3 · 11-construtor-visual-loader
   Monkey-patch em VC.associacao (nao toca no ficheiro original)
   Idempotente: pode correr N vezes sem duplicar
   ============================================================ */
(function () {
'use strict';
const VC = window.VC;
if (!VC || !VC.associacao) return;
VC._boot = VC._boot || { partes: [] };
VC._boot.partes.push('11-construtor-visual-loader');

VC.associacao._vista = 'arvore';

const _origRender = VC.associacao.renderVisaoGeral;

VC.associacao.setVista = function (v) {
  this._vista = v || 'arvore';
  if (VC.passos && typeof VC.passos.render === 'function') {
    VC.passos.render('associacao');
  }
};

VC.associacao.renderVisaoGeral = function () {
  if (this._vista === 'arvore' && VC.construtorVisual && typeof VC.construtorVisual.render === 'function') {
    return VC.construtorVisual.render();
  }
  if (typeof _origRender !== 'function') return '';
  var html = _origRender.call(this);
  var header = '<div style="display:flex;gap:6px;align-items:center;padding:10px 12px;background:var(--superf2,#f8fafc);border:1px solid var(--borda,#e2e8f0);border-radius:6px;margin-bottom:10px">'
    + '<button class="btn btn-mini primario" onclick="VC.associacao.setVista(\'arvore\')"><i class="fa-solid fa-sitemap"></i> Vista árvore (construtor visual)</button>'
    + '<span style="flex:1"></span>'
    + '<span style="font-size:11px;color:var(--texto-med,#475569)">Vista tabela (original)</span>'
    + '</div>';
  return header + html;
};

console.log('%c[VentCondutas V11.1.3] 11-construtor-visual-loader carregado . vista arvore default',
  'color:#7fa88b;font-weight:bold;background:#eaf5ec;padding:3px 6px;border-radius:3px');
})();