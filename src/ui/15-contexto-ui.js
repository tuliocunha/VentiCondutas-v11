/* ============================================================
   VENTICONDUTAS · 15-contexto-ui
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

// v11.3: o "auto-sizing" das tabelas (V10.2.3) passou para css/venticondutas.css, secção 4.
// Era injetado aqui e impedia os títulos de partir linha e a coluna .col-flex de ter largura própria.

console.log('%c[V11.0.0] 15-contexto-ui carregado em modo passivo (Layout V2 ativo).', 'color:#6d8fb0;font-weight:bold;background:#eaf1f7;padding:3px 6px;border-radius:3px');
})();