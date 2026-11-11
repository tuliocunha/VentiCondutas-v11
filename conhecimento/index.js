/* ============================================================
   VENTICONDUTAS · BASE DE CONHECIMENTO · INDEX
   ALTERAÇÕES V10.0.0: Adicionado qaiProjetoRedeDefault (P35)
   ALTERAÇÕES V10.1.0: Adicionado painelContexto (Fase 1 Plano UI v3)
   ============================================================ */
(function () {
'use strict';
window.VC = window.VC || {};
VC.conhecimento = VC.conhecimento || {};
VC.conhecimento.bibliografia = VC._normativo.bibliografia;
VC.conhecimento.hierarquia = VC._normativo.hierarquia;
VC.conhecimento.principiosBalanco = VC._normativo.principiosBalanco;
VC.conhecimento.isencoesArNovo = VC._normativo.isencoesArNovo;
VC.conhecimento.tiposTransferencia = VC._normativo.tiposTransferencia;
VC.conhecimento.tiposEspaco = VC._normativo.tiposEspaco;
VC.conhecimento.tabelas = VC._normativo.tabelas;
VC.conhecimento.versaoNormas = VC._normativo.versaoNormas;
VC.conhecimento.rphDefault = VC._normativo.rphDefault;
VC.conhecimento.qaiProjetoMotivosTipicos = VC._normativo.qaiProjetoMotivosTipicos;
VC.conhecimento.qaiProjetoRedeDefault = VC._normativo.qaiProjetoRedeDefault;
VC.conhecimento.categoriasPorGrupo = VC._normativo.categoriasPorGrupo;
VC.conhecimento.tiposProduto = VC._catalogo.tiposProduto;
VC.conhecimento.catalogoTerminais = VC._catalogo.terminais;
VC.conhecimento.curvasFabricantes = VC._catalogo.curvas;
VC.conhecimento.tooltips = VC._glossario.tooltips;
VC.conhecimento.conceitos = VC._glossario.conceitos;
VC.conhecimento.usos = VC._glossario.usos;
VC.conhecimento.formulas = VC._glossario.formulas;
VC.conhecimento.contratoLegendas = (VC._legendas && VC._legendas.contrato) ? VC._legendas.contrato : {};
VC.conhecimento.labels = VC._ui.labels;
VC.conhecimento.atalhos = VC._ui.atalhos;
VC.conhecimento.painelContexto = (VC._contexto && VC._contexto.painelContexto) ? VC._contexto.painelContexto : {};
if (!VC.conhecimento.formulasAnexo) {
  VC.conhecimento.formulasAnexo = [
    { t: 'Portaria 138-I T11/T12', e: 'Q = max(T11·N ; T12·A) / ε_v', notas: 'Q caudal, N ocupantes, A área' },
    { t: 'Balanço de ar', e: 'Σ Q_in = Σ Q_out (± 5 m³/h)', notas: 'Por espaço' },
    { t: 'Transferência', e: 'A = Q / (0,36·√ΔP)', notas: 'A em cm², Q em m³/h, ΔP em Pa' },
    { t: 'Reynolds', e: 'Re = v · D / ν', notas: '' },
    { t: 'Colebrook-White', e: '1/√f = −2 log₁₀(ε/(3,7·D) + 2,51/(Re·√f))', notas: '30 iterações' },
    { t: 'Darcy-Weisbach', e: 'Δp_lin = f · (L/D) · (ρ·v²/2)', notas: '' },
    { t: 'Perdas singulares', e: 'Δp_sing = ζ · (ρ·v²/2)', notas: '' },
    { t: 'SFPint', e: 'SFPint = Δp_int / η_vent', notas: 'Reg. (UE) 1253/2014 (Ecodesign)' },
    { t: 'Massa volúmica ar húmido', e: 'ρ = (p − p_v)/(R_d·T) + p_v/(R_v·T)', notas: 'ASHRAE' },
    { t: 'ISA · pressão', e: 'p = p₀ · (1 − L·z/T₀)^(g/(R·L))', notas: 'ISO 2533' },
    { t: 'F-RPH', e: 'Q_ConTerm = RPH_aplicado × V', notas: 'EN 16798-1 + ASHRAE 55' },
    { t: 'QAI_projeto', e: 'Q_total = Q_normas + Q_ConTerm + QAI_projeto', notas: 'Boas práticas' }
  ];
}
const obrigatorias = ['bibliografia', 'hierarquia', 'tiposEspaco', 'tabelas', 'catalogoTerminais', 'curvasFabricantes', 'tooltips', 'conceitos', 'formulas', 'atalhos', 'contratoLegendas', 'rphDefault', 'qaiProjetoMotivosTipicos', 'qaiProjetoRedeDefault', 'categoriasPorGrupo'];
const emFalta = obrigatorias.filter(k => !VC.conhecimento[k] || (typeof VC.conhecimento[k] === 'object' && Object.keys(VC.conhecimento[k]).length === 0));
if (emFalta.length) { console.error('[Base de Conhecimento] Blocos em falta:', emFalta); VC._conhecimentoErro = true; }
else { console.log('%c[Base de Conhecimento V10.0.0] ' + Object.keys(VC.conhecimento).length + ' secções · ' + VC.conhecimento.curvasFabricantes.length + ' curvas · ' + Object.keys(VC.conhecimento.tooltips).length + ' tooltips · qaiProjetoRedeDefault ✅', 'color:#7fa88b;font-weight:bold;background:#eef5f0;padding:3px 6px;border-radius:3px'); }
VC.conhecimento._contagens = { tiposEspaco: Object.keys(VC._normativo.tiposEspaco).length, gruposCatalogados: Object.keys(VC._normativo.categoriasPorGrupo).length, curvas: VC._catalogo.curvas.length, terminais: VC._catalogo.terminais.length, tooltips: Object.keys(VC._glossario.tooltips).length, conceitos: Object.keys(VC._glossario.conceitos).length, formulas: Object.keys(VC._glossario.formulas).length, atalhos: Object.keys(VC._ui.atalhos).length, bibliografia: VC._normativo.bibliografia.length, contratoLegendas: VC._legendas ? Object.keys(VC._legendas.contrato).length : 0, rphDefault: Object.keys(VC._normativo.rphDefault || {}).length, qaiMotivos: (VC._normativo.qaiProjetoMotivosTipicos || []).length };
})();
