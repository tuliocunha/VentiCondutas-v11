/* ============================================================
   VENTICONDUTAS · BASE DE CONHECIMENTO · LEGENDAS
   ALTERAÇÕES V10.0.0: Separação de contrato.fisicos e contrato.conceitosUI (P33)
   ============================================================ */
(function () {
'use strict';
window.VC = window.VC || {};
VC._legendas = {
  contrato: {
    setup: ['rho', 'nu', 'T', 'RH', 'eps'],
    levantamento: ['A', 'H', 'V', 'N', 'Q', 'rphDefault', 'rphAplicado', 'rphOrigem', 'Q_ConTerm'],
    classificacao: ['Q', 'Q_normas', 'A', 'H', 'V', 'N', 'T11', 'T12', 'T13', 'ACH', 'ACHmin', 'ev', 'G1', 'G2', 'G3', 'G4', 'rphDefault', 'rphAplicado', 'rphOrigem', 'Q_ConTerm', 'Q_total', 'QAI_projeto', 'QAI_rede', 'QAI_motivo'],
    requisitos: ['Q', 'Q_normas', 'Q_total', 'Q_ConTerm', 'QAI_projeto'],
    balanco: ['Q', 'Qin', 'Qout', 'Qtrf', 'residuo', 'G1', 'G2', 'G4', 'ctxBalancoAr', 'Q_ConTerm', 'Q_total', 'rphAplicado'],
    transferencias: ['Q', 'dP', 'Qtrf', 'ctxTransferencia'],
    terminais: ['Q', 'v', 'dP'],
    associacao: ['Q', 'D', 'L', 'v', 'Re', 'zeta'],
    rede: ['Q', 'v', 'dP', 'D', 'L', 'Re', 'f', 'zeta', 'eps'],
    utas: ['Q', 'dP', 'P', 'sfp', 'eta', 'etaRec'],
    otimizacao: ['Q', 'v', 'dP', 'D', 'zeta'],
    normativa: ['Q', 'sfp', 'v', 'ACH'],
    diagnostico: [],
    'diagrama-rede': ['Q', 'Qin', 'Qout', 'Qtrf', 'residuo', 'rphAplicado', 'Q_ConTerm', 'rphOrigem', 'QAI_projeto'],
    relatorios: ['Q', 'rphAplicado', 'rphOrigem', 'Q_ConTerm', 'Q_total', 'QAI_projeto'],
    caderno: ['Q', 'rphAplicado', 'Q_ConTerm', 'QAI_projeto'],
    configuracoes: [],
    arvore_fisicos: ['meta', 'pisoFisico', 'zona', 'caminho', 'agregado'],
    arvore_ui: ['agruparPor', 'moverRamal', 'moverTerminal', 'antiCiclo', 'vistaPisoZonaRede', 'vistaRedePisoZona', 'vistaUtaPisoRede', 'vistaZonaRede', 'snap', 'desfazerRefazer'],
    grupos: ['G1', 'G2', 'G3', 'G4']
  },
  versao: '2.1', atualizadoEm: '2026-10-25', pacote: 'V10.0.0 · Separação física vs UI'
};
console.log('%c[Base de Conhecimento · legendas.js V10.0.0] ' + Object.keys(VC._legendas.contrato).length + ' passos', 'color:#7fa88b;font-weight:bold;background:#eef5f0;padding:3px 6px;border-radius:3px');
})();