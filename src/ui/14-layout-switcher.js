/* ============================================================
   VENTICONDUTAS · 14-layout-switcher
   Força o Layout V2 (6 Passos) e remove o botão de escolha.
   ============================================================ */
(function () {
'use strict';
var VC = window.VC;
if (!VC) { console.error('[14-layout-switcher] window.VC ausente'); return; }
VC._boot = VC._boot || { partes: [] };
VC._boot.partes.push('14-layout-switcher');

// Forçar sempre o layout de 6 passos
VC.flags.layoutV2 = true;
VC.flags.layoutV2Lente = 'passo';
try { localStorage.setItem('VC_layoutMode', 'seis'); } catch (e) { /* localStorage indisponível (modo privado) */ }

VC.layoutSwitcher = {
  _modoAtual: 'seis',
  _inicializado: false,
  atual: function () { return 'seis'; },
  mudarPara: function () { /* Desativado */ },
  _init: function () { this._inicializado = true; }
};

function _aplicarVisual() {
  var janelasBar = document.querySelector('.janelas-bar');
  var lensBar = document.querySelector('.lens-bar');
  var barraModos = document.querySelector('.barra-modos');
  
  if (janelasBar) janelasBar.style.display = 'flex';
  if (lensBar) lensBar.style.display = 'flex';
  if (barraModos) barraModos.style.display = 'none';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () { setTimeout(_aplicarVisual, 100); });
} else {
  setTimeout(_aplicarVisual, 100);
}

console.log('%c[V11.0.0] 14-layout-switcher carregado · Layout fixo em 6 Passos', 'color:#6d8fb0;font-weight:bold;background:#eaf1f7;padding:3px 6px;border-radius:3px');
})();