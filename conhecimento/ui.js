/* ============================================================
   VENTCONDUTAS V10.0.0 · BASE DE CONHECIMENTO · UI
   Ficheiro 5.4 — Labels + atalhos de teclado
   ALTERAÇÕES V10.0.0: Atalhos corrigidos (P28/P29/P30)
   ============================================================ */
(function () {
'use strict';
window.VC = window.VC || {};
VC._ui = {
  labels: {
    btnGuardar: 'Guardar', btnGuardarComo: 'Guardar como…', btnValidar: 'Validar', btnNovo: 'Novo', btnExemplos: 'Exemplos', btnAbrir: 'Abrir', btnNormas: 'Normas', btnCatalogos: 'Catálogos', btnConfig: 'Configurações', btnExportar: 'Exportar PDF', btnOtimizar: 'Optimizar', btnVoltar: 'Voltar', btnDesfazer: 'Desfazer', btnRefazer: 'Refazer'
  },
  atalhos: {
    'ctrl+s': { acao: 'guardar', descricao: 'Guardar projeto' },
    'ctrl+shift+s': { acao: 'guardarComo', descricao: 'Guardar como…' },
    'ctrl+o': { acao: 'abrir', descricao: 'Abrir projeto' },
    'ctrl+e': { acao: 'exemplos', descricao: 'Gestão de exemplos' },
    'ctrl+p': { acao: 'pdf', descricao: 'Exportar PDF' },
    'alt+t': { acao: 'testes', descricao: 'Abrir testes' },
    'ctrl+shift+d': { acao: 'diagrama', descricao: 'Diagrama de rede' },
    'ctrl+/': { acao: 'pesquisa', descricao: 'Focar pesquisa' },
    'escape': { acao: 'fechar', descricao: 'Fechar modal/tooltip' },
    'ctrl+z': { acao: 'desfazer', descricao: 'Desfazer (snap)' },
    'ctrl+y': { acao: 'refazer', descricao: 'Refazer (snap)' },
    'ctrl+shift+z': { acao: 'refazer', descricao: 'Refazer (snap)' }
  }
};
console.log('%c[Base de Conhecimento · ui.js V10.0.0] ' + Object.keys(VC._ui.labels).length + ' labels · ' + Object.keys(VC._ui.atalhos).length + ' atalhos', 'color:#7fa88b;font-weight:bold;background:#eef5f0;padding:3px 6px;border-radius:3px');
})();