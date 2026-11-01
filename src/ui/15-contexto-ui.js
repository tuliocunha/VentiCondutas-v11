/* ============================================================
   VENTCONDUTAS V10.1.0 · 15-contexto-ui
   UI de 5 passos desativada. Focado no Layout V2 (6 Passos).
   ============================================================ */
(function () {
'use strict';
var VC = window.VC;
if (!VC) return;
VC._boot = VC._boot || { partes: [] };
VC._boot.partes.push('15-contexto-ui');

// Apenas mantém o objeto para não quebrar dependências
VC.uiCtx = VC.uiCtx || {};
VC.uiCtx.estadoAtivo = { tipo: 'passo', id: 'inventario', nome: 'Inventário de Caudais', dados: null };
VC.uiCtx.setPanelMode = function() {};

// AUTO-SIZING DE TABELAS · V10.2.3
(function () {
  if (document.getElementById('vc-auto-sizing')) return;
  var style = document.createElement('style');
  style.id = 'vc-auto-sizing';
  style.textContent =
    '.tabela { table-layout: auto; }' +
    '.tabela th { white-space: nowrap; width: 1%; font-variant-numeric: tabular-nums; }' +
    '.tabela th.col-flex, .tabela td.col-flex { width: 100%; max-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; }' +
    '.tabela input[type="number"] { width: auto; min-width: 0; font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; text-align: right; box-sizing: border-box; }' +
    '.tabela input[type="number"].num-int { width: calc(3ch + 20px); }' +
    '.tabela input[type="number"].num-1d { width: calc(4ch + 20px); }' +
    '.tabela input[type="number"].num-2d { width: calc(5ch + 20px); }' +
    '.tabela input[type="number"].num-2d-longo { width: calc(7ch + 20px); }' +
    '.tabela input[type="number"].num-int-longo { width: calc(7ch + 20px); }' +
    '.tabela input[type="number"].num-q { width: calc(7ch + 20px); }' +
    '.tabela td.valor-derivado, .tabela span.valor-derivado { font-variant-numeric: tabular-nums; text-align: right; }';
  document.head.appendChild(style);
})();

console.log('%c[V11.0.0] 15-contexto-ui carregado em modo passivo (Layout V2 ativo).', 'color:#6d8fb0;font-weight:bold;background:#eaf1f7;padding:3px 6px;border-radius:3px');
})();