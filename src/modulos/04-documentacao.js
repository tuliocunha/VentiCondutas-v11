/* ============================================================
   VENTICONDUTAS · 04-documentacao (COORDENADOR)
   Ponto de entrada do grupo 04 (documentação).

   Este ficheiro NÃO contém lógica de negócio — apenas:
   1. Regista a parte no boot
   2. Verifica que todos os sub-módulos foram carregados
   3. Emite o console.log final (assinatura V11)

   Sub-módulos delegados:
   - 04-01-normativa.js   · VC.normativaUI
   - 04-02-testes.js      · VC6.testes + VC.testes.correr
   - 04-03-relatorios.js  · VC.relatorios + VC.listaRelatorios + VC.modoRelatorios
   - 04-04-exportacoes.js · VC.exportacoes.{pdf, excel, csv, json, png}
   - 04-05-caderno.js     · VC.caderno

   ORDEM DE CARREGAMENTO (script tags):
     04-01 → 04-02 → 04-03 → 04-04 → 04-05 → 04-documentacao
   ============================================================ */
(function () {
'use strict';
const VC = window.VC;
VC._boot.partes.push('04-documentacao');

/* ─── Verificação de sub-módulos ─── */
const esperados = [
  { id: '04a-normativa',   check: () => VC.normativaUI && typeof VC.normativaUI.verificacoesLegais === 'function' },
  { id: '04b-testes',      check: () => window.VC6 && VC6.testes && typeof VC6.testes.correr === 'function' },
  { id: '04c-relatorios',  check: () => VC.relatorios && Array.isArray(VC.listaRelatorios) && VC.listaRelatorios.length >= 15 && VC.modoRelatorios },
  { id: '04d-exportacoes', check: () => VC.exportacoes && ['pdf','excel','csv','json','png'].every(k => typeof VC.exportacoes[k] === 'function') },
  { id: '04e-caderno',     check: () => VC.caderno && typeof VC.caderno.renderInline === 'function' && typeof VC.caderno.abrir === 'function' }
];

const faltam = esperados.filter(e => { try { return !e.check(); } catch (_) { return true; } });

if (faltam.length > 0) {
  console.warn(
    '%c[VentiCondutas] 04-documentacao · AVISO: sub-módulos em falta → ' +
    faltam.map(f => f.id).join(', ') +
    ' (verifique a ordem dos <script>)',
    'color:#c88a8a;font-weight:bold;background:#faeaea;padding:3px 6px;border-radius:3px'
  );
}

/* ─── Console.log de assinatura ─── */
console.log(
  '%c[VentiCondutas] 04-documentacao carregado · relatórios + PDF + caderno · F-RPH + QAI_projeto completos · P4 (json nomeSugerido)',
  'color:#6d8fb0;font-weight:bold;background:#eaf1f7;padding:3px 6px;border-radius:3px'
);

if (faltam.length === 0) {
  console.log(
    '%c[VentiCondutas] 04-documentacao · todos os 5 sub-módulos OK (normativa · testes · relatórios · exportações · caderno)',
    'color:#7fa88b;font-weight:bold;background:#eaf5ec;padding:3px 6px;border-radius:3px'
  );
}

})();