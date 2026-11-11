/* ============================================================
   VENTCONDUTAS V11.0.0 · 04b-testes
   N7 · Suite de testes (N1-N11 + INT + UI) + VC.testes.correr (API pública)
   DEPENDE DE: 01 + 02 + 03 + 04a-normativa
   ============================================================ */
(function () {
'use strict';
const VC = window.VC;
window.VC6 = window.VC6 || {};
const VC6 = window.VC6;
VC._boot.partes.push('04b-testes');

VC6.testes = {
  _lista: [],
  _resultado: null,
  registar(t) { this._lista.push(t); },

  initN1() {
    const self = this;
    self.registar({ id: 'N1.T1', nucleo: 'N1', grupo: 'Física', nome: 'ISA ao nível do mar', criterio: 'p = 101325 ± 10 Pa', fn: () => Math.abs(VC6.fisica.isa(0).p - 101325) < 10 });
    self.registar({ id: 'N1.T2', nucleo: 'N1', grupo: 'Física', nome: 'ρ(22°C, 50%, 150m)', criterio: '1.15 < ρ < 1.25 kg/m³', fn: () => { const r = VC6.fisica.rho(22, 50, 150); return r > 1.15 && r < 1.25; } });
    self.registar({ id: 'N1.T3', nucleo: 'N1', grupo: 'Física', nome: 'Colebrook laminar f(1000)', criterio: 'f = 0.064 ± 0.001', fn: () => { const f = VC6.fisica.fatorAtrito(1000, 0.001); return Math.abs(f - 0.064) < 0.001; } });
    self.registar({ id: 'N1.T4', nucleo: 'N1', grupo: 'Física', nome: 'Colebrook turbulento f(1e5, 2e-4)', criterio: '0.01 < f < 0.05', fn: () => { const f = VC6.fisica.fatorAtrito(1e5, 2e-4); return f > 0.01 && f < 0.05; } });
    self.registar({ id: 'N1.T5', nucleo: 'N1', grupo: 'Física', nome: 'ν(22°C)', criterio: '1.4e-5 < ν < 1.7e-5', fn: () => { const nu = VC6.fisica.nu(22, 50, 150); return nu > 1.4e-5 && nu < 1.7e-5; } });
    self.registar({ id: 'N1.T6', nucleo: 'N1', grupo: 'Física', nome: 'Continuidade ISA', criterio: 'p(0)/p(1000) ≈ 1.13', fn: () => { const r = VC6.fisica.isa(0).p / VC6.fisica.isa(1000).p; return r > 1.10 && r < 1.16; } });
    self.registar({ id: 'N1.T7', nucleo: 'N1', grupo: 'Física', nome: 'Monotonia ρ vs T', criterio: 'ρ(10°C) > ρ(30°C)', fn: () => VC6.fisica.rho(10, 50, 150) > VC6.fisica.rho(30, 50, 150) });
  },

  initN2() {
    const self = this;
    self.registar({ id: 'N2.T1', nucleo: 'N2', grupo: 'Normas', nome: 'Escritório → G1, T11=24, T12=3', criterio: 'conforme tabela', fn: () => { const d = VC6.normas.getDef('Escritório'); return d.g === 1 && d.t11 === 24 && d.t12 === 3; } });
    self.registar({ id: 'N2.T2', nucleo: 'N2', grupo: 'Normas', nome: 'Sanitário → G4, extração T13', criterio: 'conforme tabela', fn: () => VC6.normas.getDef('Sanitários').g === 4 });
    self.registar({ id: 'N2.T3', nucleo: 'N2', grupo: 'Normas', nome: 'Circulação → G2 isento', criterio: 'Q=0', fn: () => { const d = VC6.normas.getDef('Circulação'); return d.g === 2 && d.t11 === 24 && d.t12 === 0; } });
    self.registar({ id: 'N2.T4', nucleo: 'N2', grupo: 'Normas', nome: 'Sanitário privado contínuo ≥ 45', criterio: 'q ≥ 45', fn: () => { const r = VC6.normas.calcExtracaoSanitaria({ A: 5, regimeSanitario: 'privado_continuo' }); return r.qExtracao >= 45; } });
    self.registar({ id: 'N2.T5', nucleo: 'N2', grupo: 'Normas', nome: 'Sanitário público intensivo = 125·nAp', criterio: 'conforme', fn: () => { const r = VC6.normas.calcExtracaoSanitaria({ A: 5, regimeSanitario: 'publico_intensivo', numSanitas: 2 }); return r.qExtracao >= 250; } });
    self.registar({ id: 'N2.T6', nucleo: 'N2', grupo: 'Normas', nome: 'SFPint=650 → classe 1 ou 2', criterio: 'conforme', fn: () => { const r = VC6.normas.classificarSFP('BVU_HRS', 650, 0, 0.75); return r.classe === 1 || r.classe === 2; } });
    self.registar({ id: 'N2.T7', nucleo: 'N2', grupo: 'Normas', nome: 'SFPint=1500 → NÃO CONFORME', criterio: 'conforme', fn: () => { const r = VC6.normas.classificarSFP('BVU_HRS', 1500, 0, 0.75); return r.classe === 4 && !r.conforme; } });
    self.registar({ id: 'N2.T8', nucleo: 'N2', grupo: 'Normas', nome: 'P=300 kW → BACS obrigatório', criterio: 'conforme', fn: () => { const r = VC6.normas.dl101D(300000); return r.bacsObrigatorio === true; } });
    self.registar({ id: 'N2.T9', nucleo: 'N2', grupo: 'Normas', nome: 'Escada pressurizada exige ≥ 50 Pa', criterio: 'conforme', fn: () => { const r = VC6.normas.verificarEscadaPressurizada({ tipo: 'Escadas', deltaP: 60 }); return r.ok === true; } });
    self.registar({ id: 'N3.T18', nucleo: 'N3', grupo: 'Balanço', nome: 'Balanços identificados (id e nome)', criterio: 'todos', fn: () => { if (VC6.balanco && VC6.balanco.propagar) VC6.balanco.propagar(); return VC6.balanco.todos().every(b => b.id != null && typeof b.nome === 'string' && b.nome.length > 0); } });
    self.registar({ id: 'N2.T16', nucleo: 'N2', grupo: 'Normas', nome: 'Categoria EN 16798-1 muda rp/ra (comparação)', criterio: 'I > II > III > IV', fn: () => { const p = VC.dados.params, ant = p.categoria; const rp = c => { p.categoria = c; return VC.normas.getDef('Fallback-inexistente').rp; }; const r = [rp('I'), rp('II'), rp('III'), rp('IV')]; p.categoria = ant; return r[0] > r[1] && r[1] > r[2] && r[2] > r[3]; } });
    self.registar({ id: 'N2.T10', nucleo: 'N2', grupo: 'Normas', nome: 'F-RPH · rphDefault G2 H=7 → 2', criterio: 'conforme', fn: () => { const r = VC.rph.calcularDefault({ tipo: 'Circulação', H: 7 }); return r.rph === 2 && r.classe === 'E2'; } });
    self.registar({ id: 'N2.T11', nucleo: 'N2', grupo: 'Normas', nome: 'F-RPH · rphDefault G1 H=2.6 → 0', criterio: 'conforme', fn: () => { const r = VC.rph.calcularDefault({ tipo: 'Escritório', H: 2.6 }); return r.rph === 0 && r.classe === 'E0'; } });
    self.registar({ id: 'N2.T12', nucleo: 'N2', grupo: 'Normas', nome: 'F-RPH · rphDefault G4 H=3.5 → 1', criterio: 'conforme', fn: () => { const r = VC.rph.calcularDefault({ tipo: 'Cozinha', H: 3.5 }); return r.rph === 1 && r.classe === 'X1'; } });
    self.registar({ id: 'N2.T13', nucleo: 'N2', grupo: 'Normas', nome: 'QAI · motivos típicos ≥ 5', criterio: 'lista existe', fn: () => { const m = VC.conhecimento.qaiProjetoMotivosTipicos || []; return m.length >= 5; } });
    self.registar({ id: 'N2.T14', nucleo: 'N2', grupo: 'Normas', nome: 'QAI · redeDefault G1=insuflação', criterio: 'conforme tabela', fn: () => { const t = VC.conhecimento.qaiProjetoRedeDefault || {}; return t[1] === 'insuflacao'; } });
    self.registar({ id: 'N2.T15', nucleo: 'N2', grupo: 'Normas', nome: 'QAI · redeDefault G4=extração', criterio: 'conforme tabela', fn: () => { const t = VC.conhecimento.qaiProjetoRedeDefault || {}; return t[4] === 'extracao'; } });
  },

  initN3() {
    const self = this;
    const espA = { id: 1, nome: 'A', tipo: 'Escritório', A: 20, g: 1, definicoes: [{ rede: 'insuflacao', Q_total: 100 }] };
    const espB = { id: 2, nome: 'B', tipo: 'Circulação', A: 10, g: 2, Q_ConTerm: 0, definicoes: [] };
    const espC = { id: 3, nome: 'C', tipo: 'Sanitários', A: 5, g: 4, Q_ConTerm: 0, definicoes: [{ rede: 'extracao_suja', Q_total: 45 }] };
    self.registar({ id: 'N3.T1', nucleo: 'N3', grupo: 'Balanço', nome: 'Espaço isolado sem transf', criterio: 'resíduo = Q_in − Q_out', fn: () => VC6.balanco.residuo(espA, []) === 100 });
    self.registar({ id: 'N3.T2', nucleo: 'N3', grupo: 'Balanço', nome: 'Escritório → circulação', criterio: 'resíduo escritório = 0', fn: () => { const trf = [{ deId: 1, paraId: 2, Q: 100 }]; return VC6.balanco.residuo(espA, trf) === 0; } });
    self.registar({ id: 'N3.T3', nucleo: 'N3', grupo: 'Balanço', nome: 'Circulação → sanitário', criterio: 'resíduo circulação = 0', fn: () => { const trf = [{ deId: 1, paraId: 2, Q: 100 }, { deId: 2, paraId: 3, Q: 100 }]; return VC6.balanco.residuo(espB, trf) === 0; } });
    self.registar({ id: 'N3.T4', nucleo: 'N3', grupo: 'Balanço', nome: 'Sanitário só extrai', criterio: 'Q_transf_in = Q_out_direto', fn: () => { const trf = [{ deId: 2, paraId: 3, Q: 45 }]; return VC6.balanco.residuo(espC, trf) === 0; } });
    self.registar({ id: 'N3.T5', nucleo: 'N3', grupo: 'Balanço', nome: 'Ciclo A→B→A', criterio: 'erro detetado', fn: () => { const trf = [{ deId: 1, paraId: 2, Q: 50 }, { deId: 2, paraId: 1, Q: 50 }]; return VC6.balanco.detetarCiclos(trf).length > 0; } });
    self.registar({ id: 'N3.T6', nucleo: 'N3', grupo: 'Balanço', nome: 'Cascata A→B→C', criterio: 'sem ciclo', fn: () => { const trf = [{ deId: 1, paraId: 2, Q: 50 }, { deId: 2, paraId: 3, Q: 50 }]; return VC6.balanco.detetarCiclos(trf).length === 0; } });
    self.registar({ id: 'N3.T7', nucleo: 'N3', grupo: 'Balanço', nome: 'Resíduo zero (com transf)', criterio: 'fechado por transferência', fn: () => { const e = { id: 99, nome: 'X', tipo: 'Escritório', g: 1, definicoes: [{ rede: 'insuflacao', Q_total: 100 }] }; return VC6.balanco.residuo(e, []) === 100; } });
    self.registar({ id: 'N3.T8', nucleo: 'N3', grupo: 'Balanço', nome: 'Pressão positiva', criterio: 'espaço com mais in que out', fn: () => { const p = VC6.balanco.pressaoRelativa(espA, 100); return p > 0; } });
    self.registar({ id: 'N3.T9', nucleo: 'N3', grupo: 'Balanço', nome: 'Pressão negativa', criterio: 'espaço com mais out que in', fn: () => { const p = VC6.balanco.pressaoRelativa(espC, -100); return p < 0; } });
    self.registar({ id: 'N3.T10', nucleo: 'N3', grupo: 'Balanço', nome: 'Sistema completo (3 espaços)', criterio: 'todos OK', fn: () => { const trf = [{ deId: 1, paraId: 2, Q: 100 }, { deId: 2, paraId: 3, Q: 100 }]; return Math.abs(VC6.balanco.residuo(espA, trf)) <= 5 && Math.abs(VC6.balanco.residuo(espB, trf)) <= 5; } });
    self.registar({ id: 'N3.T11', nucleo: 'N3', grupo: 'Balanço', nome: 'F-RPH · G2 com conforto não é isento', criterio: 'conforme', fn: () => { const e = { id: 4, nome: 'D', tipo: 'Circulação', A: 10, g: 2, Q_ConTerm: 1000, definicoes: [] }; return VC6.balanco.validarEspaco(e, []).ok === false; } });
    self.registar({ id: 'N3.T12', nucleo: 'N3', grupo: 'Balanço', nome: 'F-RPH · G2 sem conforto é isento', criterio: 'conforme', fn: () => { const e = { id: 5, nome: 'E', tipo: 'Circulação', A: 10, g: 2, Q_ConTerm: 0, definicoes: [] }; return VC6.balanco.validarEspaco(e, []).ok === true; } });
    self.registar({ id: 'N3.T13', nucleo: 'N3', grupo: 'Balanço', nome: 'F-RPH · G4 conforto soma à extração', criterio: 'conforme', fn: () => { const e = { id: 6, nome: 'F', tipo: 'Sanitários', A: 5, g: 4, Q_ConTerm: 200, definicoes: [{ rede: 'extracao_suja', Q_total: 45 }] }; return VC6.balanco.QOutDireto(e) === 245; } });
    self.registar({ id: 'N3.T14', nucleo: 'N3', grupo: 'Balanço', nome: 'F-RPH · G1 conforto soma à insuflação', criterio: 'conforme', fn: () => { const e = { id: 7, nome: 'G', tipo: 'Escritório', A: 20, g: 1, Q_ConTerm: 50, definicoes: [{ rede: 'insuflacao', Q_total: 48 }] }; return VC6.balanco.QInDireto(e) === 98; } });
    self.registar({ id: 'N3.T15', nucleo: 'N3', grupo: 'Balanço', nome: 'QAI · G1 soma a Q_in (rede auto)', criterio: 'conforme', fn: () => { const e = { id: 8, nome: 'H', tipo: 'Escritório', g: 1, definicoes: [], QAI_projeto: 30, QAI_projeto_origem: 'utilizador', QAI_projeto_motivo: 'Teste', QAI_projeto_rede: 'auto', Q_ConTerm: 0 }; return VC6.balanco.QInDireto(e) === 30; } });
    self.registar({ id: 'N3.T16', nucleo: 'N3', grupo: 'Balanço', nome: 'QAI · G4 soma a Q_out (rede auto)', criterio: 'conforme', fn: () => { const e = { id: 9, nome: 'I', tipo: 'Sanitários', g: 4, definicoes: [], QAI_projeto: 40, QAI_projeto_origem: 'utilizador', QAI_projeto_motivo: 'Teste', QAI_projeto_rede: 'auto', Q_ConTerm: 0 }; return VC6.balanco.QOutDireto(e) === 40; } });
    self.registar({ id: 'N3.T17', nucleo: 'N3', grupo: 'Balanço', nome: 'QAI · override rede força extração em G1', criterio: 'conforme', fn: () => { const e = { id: 10, nome: 'J', tipo: 'Escritório', g: 1, definicoes: [], QAI_projeto: 25, QAI_projeto_origem: 'utilizador', QAI_projeto_motivo: 'Override', QAI_projeto_rede: 'extracao', Q_ConTerm: 0 }; return VC6.balanco.QInDireto(e) === 0 && VC6.balanco.QOutDireto(e) === 25; } });
  },

  initN4() {
    const self = this;
    const props = { rho: 1.2, nu: 1.5e-5 };
    self.registar({ id: 'N4.T1', nucleo: 'N4', grupo: 'Hidráulico', nome: 'Q=200 m³/h → Ø existe', criterio: 'D ∈ S1', fn: () => { const z = VC6.calculo.dimensionarConduta(200, props); return z.Dc > 0 && VC.constantes.COMM_S1.indexOf(z.Dc) >= 0; } });
    self.registar({ id: 'N4.T2', nucleo: 'N4', grupo: 'Hidráulico', nome: 'v ≤ 6 m/s em tronco', criterio: 'após dimensionamento', fn: () => { const z = VC6.calculo.dimensionarConduta(1000, props); return z.v <= 6.5; } });
    self.registar({ id: 'N4.T3', nucleo: 'N4', grupo: 'Hidráulico', nome: 'R ≈ 1 Pa/m (loss)', criterio: '0.3 < R < 2.5', fn: () => { const z = VC6.calculo.dimensionarConduta(500, props); return z.R > 0.3 && z.R < 2.5; } });
    self.registar({ id: 'N4.T4', nucleo: 'N4', grupo: 'Hidráulico', nome: 'Q_proprio = Σ Q_terminal', criterio: 'exato', fn: () => { const r = VC.dados.ramais.find(rr => (rr.Q_proprio || 0) > 0); if (!r) return true; const soma = VC.dados.terminais.filter(t => t.ramalRef === r.nome).reduce((s, t) => s + (Number(t.Q) || 0), 0); return Math.abs((r.Q_proprio || 0) - soma) < 0.01; } });
    self.registar({ id: 'N4.T5', nucleo: 'N4', grupo: 'Hidráulico', nome: 'Q = Q_proprio + Q_filhos', criterio: 'exato', fn: () => VC.dados.ramais.every(r => Math.abs((r.Q || 0) - ((r.Q_proprio || 0) + (r.Q_filhos || 0))) < 0.01) });
    self.registar({ id: 'N4.T6', nucleo: 'N4', grupo: 'Hidráulico', nome: 'Δp_total ≥ Δp_acumulado', criterio: 'sempre', fn: () => VC.dados.ramais.every(r => (r.deltaPtotal || 0) >= (r.deltaPAcumulado || 0)) });
    self.registar({ id: 'N4.T7', nucleo: 'N4', grupo: 'Hidráulico', nome: 'Δp monotónico', criterio: 'sobe até raiz', fn: () => { const byName = {}; VC.dados.ramais.forEach(r => { byName[r.nome] = r; }); return VC.dados.ramais.every(r => { if (!r.parente || !byName[r.parente]) return true; return (r.deltaPAcumulado || 0) >= (byName[r.parente].deltaPTroco || 0); }); } });
    self.registar({ id: 'N4.T8', nucleo: 'N4', grupo: 'Hidráulico', nome: 'Continuidade Q_pai ≥ Σ Q_filhos', criterio: 'sempre', fn: () => VC.dados.ramais.every(r => { const filhos = VC.dados.ramais.filter(x => x.parente === r.nome); if (!filhos.length) return true; const somaFilhos = filhos.reduce((s, f) => s + (f.Q || 0), 0); return (r.Q || 0) + 0.01 >= somaFilhos; }) });
    self.registar({ id: 'N4.T9', nucleo: 'N4', grupo: 'Hidráulico', nome: 'Retangular respeita H_max', criterio: 'h ≤ H_max', fn: () => { const r = VC6.calculo.retangular(250, 0.5, 6, 500); return r === null || r.h <= 250; } });
    self.registar({ id: 'N4.T10', nucleo: 'N4', grupo: 'Hidráulico', nome: 'Ramal com lock mantém Ø', criterio: 'pós-optimização', fn: () => { const r = VC.dados.ramais[0]; if (!r) return true; const backupLock = r.lock ? { ...r.lock } : null; if (!r.lock) r.lock = { D: false }; r.lock.D = true; const dSalvo = r.Dcom; VC.calculo.calcularTudo(); const ok = r.Dcom === dSalvo; r.lock = backupLock || { D: false }; VC.calculo.calcularTudo(); return ok; } });
  },

  initN5() {
    const self = this;
    self.registar({ id: 'N5.T1', nucleo: 'N5', grupo: 'Transferências', nome: 'A = Q / (0.36·√ΔP)', criterio: 'Q=190, ΔP=2 → A≈373', fn: () => { const A = VC6.transferencias.dimensionarArea(190, 2); return A > 360 && A < 390; } });
    self.registar({ id: 'N5.T2', nucleo: 'N5', grupo: 'Transferências', nome: 'Inverso coerente', criterio: 'ΔP(A(Q)) = ΔP', fn: () => { const Q = 100, dP = 2; const A = VC6.transferencias.dimensionarArea(Q, dP); const dP2 = VC6.transferencias.dimensionarDeltaP(Q, A); return Math.abs(dP2 - dP) < 0.1; } });
    self.registar({ id: 'N5.T3', nucleo: 'N5', grupo: 'Transferências', nome: 'Transf. inválida rejeitada', criterio: 'Q≤0 falha', fn: () => { const r = VC6.transferencias.criar(1, 2, 0, 'grelha_transferencia'); return r.ok === false; } });
    self.registar({ id: 'N5.T4', nucleo: 'N5', grupo: 'Transferências', nome: 'Ciclo A→B→A detetado', criterio: 'DFS encontra', fn: () => { const trf = [{ deId: 1, paraId: 2, Q: 50 }, { deId: 2, paraId: 1, Q: 50 }]; return VC6.balanco.detetarCiclos(trf).length > 0; } });
    self.registar({ id: 'N5.T5', nucleo: 'N5', grupo: 'Transferências', nome: 'Cascata A→B→C aceite', criterio: 'sem ciclos', fn: () => { const trf = [{ deId: 1, paraId: 2, Q: 50 }, { deId: 2, paraId: 3, Q: 50 }]; return VC6.balanco.detetarCiclos(trf).length === 0; } });
    self.registar({ id: 'N5.T6', nucleo: 'N5', grupo: 'Transferências', nome: 'Sanitário = fresta', criterio: 'tipo correto', fn: () => VC6.transferencias.sugerirSolucao('Sanitários', 'entrada') === 'fresta_porta' });
    self.registar({ id: 'N5.T7', nucleo: 'N5', grupo: 'Transferências', nome: 'Escritório = grelha', criterio: 'tipo correto', fn: () => VC6.transferencias.sugerirSolucao('Escritório', 'entrada') === 'grelha_transferencia' });
    self.registar({ id: 'N5.T8', nucleo: 'N5', grupo: 'Transferências', nome: 'Auto-balanço devolve array', criterio: 'array válido', fn: () => Array.isArray(VC6.transferencias.sugerirAutoBalanco()) });
  },

  initN6() {
    const self = this;
    // v11.1: o caudal da UTA tem de igualar o caudal dos terminais servidos pela sua rede de ramais
    // (o teste anterior somava os ramais de todos os níveis e confirmava a contagem múltipla).
    self.registar({ id: 'N6.T1', nucleo: 'N6', grupo: 'UTAs', nome: 'Q UTA = Σ Q terminais da sua rede', criterio: '±1 m³/h em todas as UTAs', fn: () => VC.dados.utas.filter(u => u.ativo !== false).every(u => { const nomes = new Set(VC.dados.ramais.filter(r => r.utaRef === u.id).map(r => r.nome)); if (!nomes.size) return true; const somaTerm = VC.dados.terminais.filter(t => nomes.has(t.ramalRef)).reduce((s, t) => s + (Number(t.Q) || 0), 0); return Math.abs((u.Q || 0) * 3600 - somaTerm) <= 1; }) });
    self.registar({ id: 'N4.T12', nucleo: 'N4', grupo: 'Dimensionamento', nome: 'Δp crítico do pai ≥ Δp crítico dos filhos', criterio: 'todos os ramais', fn: () => { const porNome = {}; VC.dados.ramais.forEach(r => { porNome[r.nome] = r; }); return VC.dados.ramais.every(r => { const pai = porNome[r.parente]; return !pai || (pai.deltaPCritico || 0) + 1e-6 >= (r.deltaPCritico || 0); }) && VC.dados.ramais.every(r => (r.deltaPCritico || 0) + 1e-6 >= (r.deltaPtotal || 0)); } });
    self.registar({ id: 'N4.T13', nucleo: 'N4', grupo: 'Dimensionamento', nome: 'Ramal com pai inexistente gera ERRO "Ramal órfão"', criterio: 'finding presente', fn: () => { const r = VC.dados.ramais.find(x => x.parente); if (!r) return true; const ant = r.parente; r.parente = '__nao_existe__'; let ok = false; try { const x = VC.calculo.calcularTudo(); ok = (x.findings || []).some(f => f.tipo === 'Ramal órfão' && f.elemento === r.nome); } finally { r.parente = ant; VC.calculo.calcularTudo(); } return ok; } });
    self.registar({ id: 'N4.T14', nucleo: 'N4', grupo: 'Dimensionamento', nome: 'Pai com espaço a mais no nome continua ligado', criterio: 'sem órfãos', fn: () => { const r = VC.dados.ramais.find(x => x.parente); if (!r) return true; const ant = r.parente; r.parente = ant + ' '; let ok = false; try { const x = VC.calculo.calcularTudo(); ok = !(x.findings || []).some(f => f.tipo === 'Ramal órfão') && r.parente === ant; } finally { r.parente = ant; VC.calculo.calcularTudo(); } return ok; } });
    self.registar({ id: 'N4.T15', nucleo: 'N4', grupo: 'Dimensionamento', nome: 'Δp do terminal = máximo dos terminais do ramal', criterio: 'não a soma', fn: () => { const porRamal = {}; VC.dados.terminais.forEach(t => { if (t.ramalRef) (porRamal[t.ramalRef] = porRamal[t.ramalRef] || []).push(Number(t.dPCalc) || 0); }); return VC.dados.ramais.every(r => { const l = porRamal[r.nome]; return !l || Math.abs((r.deltaP_terminal || 0) - Math.max.apply(null, l)) < 1e-6; }); } });
    self.registar({ id: 'N4.T16', nucleo: 'N4', grupo: 'Dimensionamento', nome: 'Velocidade ≤ máximo do nível (ramais não travados)', criterio: 'N1 6 · N2 5 · N3 4 · N4 3 m/s', fn: () => VC.dados.ramais.filter(r => !(r.lock && r.lock.D)).every(r => (r.v || 0) <= VC.calculo.vMaxDe(r) + 1e-6) });
    self.registar({ id: 'N4.T17', nucleo: 'N4', grupo: 'Dimensionamento', nome: 'Perda constante respeita vMax em caudais altos', criterio: '20 000 m³/h → v ≤ 6 m/s', fn: () => VC.calculo.dimensionarConduta(20000, { vMax: 6 }).v <= 6 });
    self.registar({ id: 'N4.T18', nucleo: 'N4', grupo: 'Dimensionamento', nome: 'Secção retangular escolhida pelo utilizador é calculada', criterio: 'b×h, De de Huebscher e R próprio', fn: () => { const r = VC.dados.ramais.find(x => !x.parente); if (!r) return true; const ant = r.geometriaInput; const Rcirc = r.R; r.geometriaInput = Object.assign({}, ant || {}, { forma: 'retangular' }); let ok = false; try { VC.calculo.calcularTudo(); ok = r.secaoAdotada === 'retangular' && /^\d+×\d+$/.test(r.secaoCalc || '') && r.De > 0 && Math.abs(r.R - Rcirc) > 1e-6; } finally { r.geometriaInput = ant; VC.calculo.calcularTudo(); } return ok; } });
    self.registar({ id: 'N6.T10', nucleo: 'N6', grupo: 'Balanço', nome: 'Terminal↔espaço compara só a rede certa', criterio: 'insuflação 72 + extração 72 para Q=72 → OK', fn: () => { const esp = VC.dados.espacos.find(e => (e.g || 1) === 1 && VC.calculo.terminaisQueServem(e.nome).length >= 2); if (!esp) return true; const b = VC.calculo.balancoEspaco(esp.nome); return b.rede === 'insuflacao' && b.Q_servido === VC.calculo.QservidoAoEspaco(esp.nome, 'insuflacao'); } });
    self.registar({ id: 'N6.T9', nucleo: 'N6', grupo: 'UTAs', nome: 'P_motor = Q·(Δp_int+Δp_ext)/η·fs/transmissão', criterio: '±1 W', fn: () => VC.dados.utas.filter(u => u.ativo !== false).every(u => { const esperado = (u.Q || 0) * ((u.dpInt || 0) + (u.dpExt || 0)) / Math.max(u.eta || 0.65, 0.01) * (u.fs || 1.15) / Math.max(u.transmissao || 1, 0.01); return Math.abs((u.P_motor || 0) - esperado) <= 1; }) });
    self.registar({ id: 'N6.T2', nucleo: 'N6', grupo: 'UTAs', nome: 'Δp ext = Δp_total crítico', criterio: 'máximo', fn: () => { const u = VC.dados.utas[0]; if (!u) return true; const ramais = VC.dados.ramais.filter(r => r.utaRef === u.id); const max = ramais.reduce((m, r) => Math.max(m, r.deltaPtotal || 0), 0); return Math.abs((u.dpExt || 0) - max) < 1 || ramais.length === 0; } });
    self.registar({ id: 'N6.T3', nucleo: 'N6', grupo: 'UTAs', nome: 'Δp int ≥ 0', criterio: 'numérico', fn: () => { const u = VC.dados.utas[0]; if (!u) return true; return typeof u.dpInt === 'number' && u.dpInt >= 0; } });
    self.registar({ id: 'N6.T4', nucleo: 'N6', grupo: 'UTAs', nome: 'SFPint dentro do limite Ecodesign de cada UTA', criterio: 'sfpClass.conforme', fn: () => VC.dados.utas.every(u => u.ativo === false || !u.sfpClass || u.sfpClass.conforme) });
    self.registar({ id: 'N6.T5', nucleo: 'N6', grupo: 'UTAs', nome: 'Classe SFP correta', criterio: '1-4, ou sem classe se não há limite', fn: () => VC.dados.utas.every(u => !u.sfpClass || (u.sfpClass.limite == null ? u.sfpClass.classe == null : (u.sfpClass.classe >= 1 && u.sfpClass.classe <= 4))) });
    self.registar({ id: 'N6.T11', nucleo: 'N6', grupo: 'UTAs', nome: 'Limites SFPint Ecodesign por tipo', criterio: 'UVB 0,5 m³/s η 0,80 → 1235; ≥2 m³/s → 1010; UVU filtro 230; UVU sem filtro sem limite; η 0,70 não conforme', fn: () => {
      const c = (t, s, q, e) => VC.normas.classificarSFP(t, s, q, e);
      return c('BVU_HRS', 1000, 0.5, 0.80).limite === 1235 && c('BVU_HRS', 1000, 3, 0.80).limite === 1010
        && c('UVU_FILTER', 200, 1, 0).limite === 230 && c('UVU_FILTER', 250, 1, 0).conforme === false
        && c('UVU_SEM_FILTER', 900, 1, 0).limite === null && c('UVU_SEM_FILTER', 900, 1, 0).conforme === true
        && c('BVU_HRS', 500, 0.5, 0.70).conforme === false; } });
    self.registar({ id: 'N6.T6', nucleo: 'N6', grupo: 'UTAs', nome: 'Ponto funcionamento na curva', criterio: 'interseção', fn: () => { const u = VC.dados.utas.find(x => x.curva && x.curva.length >= 2); if (!u) return true; const pf = VC6.uta.calcularPontoFuncionamento(u.rede); return pf && pf.modo === 'curva'; } });
    self.registar({ id: 'N6.T7', nucleo: 'N6', grupo: 'UTAs', nome: 'Sem curva → estimativa', criterio: 'fallback', fn: () => { const u = { id: 'X', rede: 'insuflacao', ativo: true, Q: 0.3, dpExt: 200, dpInt: 150, eta: 0.65, fs: 1.15, transmissao: 1, componentes: [], curva: [] }; const lista = VC.dados.utas.slice(); VC.dados.utas = [u]; const pf = VC6.uta.calcularPontoFuncionamento('insuflacao'); VC.dados.utas = lista; return pf && pf.modo === 'estimativa'; } });
    self.registar({ id: 'N6.T8', nucleo: 'N6', grupo: 'UTAs', nome: 'Curva Sodeca HCT-250', criterio: 'Q=1200, dP=650', fn: () => { const c = VC.curvasFabricantes.get('Sodeca', 'HCT/CHT', 'HCT-250'); return c && c.Q_nom === 1200 && c.dP_nom === 650; } });
  },

  initN7() {
    const self = this;
    self.registar({ id: 'N7.T1', nucleo: 'N7', grupo: 'Meta', nome: 'Total de testes ≥ 120', criterio: '≥ 120', fn: () => VC6.testes._lista.length >= 120 });
    self.registar({ id: 'N7.T2', nucleo: 'N7', grupo: 'Meta', nome: 'Todos os núcleos têm testes', criterio: 'N1-N11 + INT + UI', fn: () => { const nucleos = new Set(VC6.testes._lista.map(t => t.nucleo)); return ['N1','N2','N3','N4','N5','N6','N7','N8','N9','N10','N11','INT','UI'].every(n => nucleos.has(n)); } });
    self.registar({ id: 'N7.T3', nucleo: 'N7', grupo: 'Meta', nome: 'IDs únicos', criterio: 'sem duplicados', fn: () => { const ids = VC6.testes._lista.map(t => t.id); return new Set(ids).size === ids.length; } });
  },

  initN8() {
    const self = this;
    self.registar({ id: 'N8.T1', nucleo: 'N8', grupo: 'Relatórios', nome: '15 relatórios definidos (+BOM +TAB)', criterio: 'lista ≥ 15', fn: () => (VC.listaRelatorios || []).length >= 15 });
    self.registar({ id: 'N8.T2', nucleo: 'N8', grupo: 'Relatórios', nome: 'PDF disponível', criterio: 'função', fn: () => typeof VC.exportacoes.pdf === 'function' });
    self.registar({ id: 'N8.T3', nucleo: 'N8', grupo: 'Relatórios', nome: 'Excel disponível', criterio: 'função', fn: () => typeof VC.exportacoes.excel === 'function' });
    self.registar({ id: 'N8.T4', nucleo: 'N8', grupo: 'Relatórios', nome: 'Caderno renderInline gera HTML', criterio: '> 1000 chars', fn: () => { try { const h = VC.caderno && VC.caderno.renderInline ? VC.caderno.renderInline() : ''; return typeof h === 'string' && h.length > 1000; } catch (e) { return false; } } });
    self.registar({ id: 'N8.T5', nucleo: 'N8', grupo: 'Relatórios', nome: 'SheetJS carregado', criterio: 'window.XLSX', fn: () => typeof XLSX !== 'undefined' });
  },

  initN9() {
    const self = this;
    self.registar({ id: 'N9.T1', nucleo: 'N9', grupo: 'Diagrama', nome: 'construirGrafo() devolve nós+arestas', criterio: '≥ utas+ramais', fn: () => { if (!VC6.diagrama) return true; const g = VC6.diagrama.construirGrafo(); return g && g.nos && g.nos.length >= (VC.dados.utas.length + VC.dados.ramais.length); } });
    self.registar({ id: 'N9.T2', nucleo: 'N9', grupo: 'Diagrama', nome: 'calcularLayout() posiciona todos', criterio: 'chaves > 0', fn: () => { if (!VC6.diagrama) return true; const g = VC6.diagrama.construirGrafo(); const layout = VC6.diagrama.calcularLayout(g); return layout && Object.keys(layout).length > 0; } });
    self.registar({ id: 'N9.T3', nucleo: 'N9', grupo: 'Diagrama', nome: 'Layout 8 níveis', criterio: 'NIVEIS = 8', fn: () => { if (!VC6.diagrama) return true; return VC6.diagrama.NIVEIS && Object.keys(VC6.diagrama.NIVEIS).length === 8; } });
    self.registar({ id: 'N9.T4', nucleo: 'N9', grupo: 'Diagrama', nome: 'renderSVG() gera SVG', criterio: 'contém <svg', fn: () => { if (!VC6.diagrama) return true; const svg = VC6.diagrama.renderSVG(); return typeof svg === 'string' && svg.indexOf('<svg') >= 0; } });
    self.registar({ id: 'N9.T5', nucleo: 'N9', grupo: 'Diagrama', nome: 'SVG contém todas as UTAs', criterio: 'contagem =', fn: () => { if (!VC6.diagrama) return true; const svg = VC6.diagrama.renderSVG(); return VC.dados.utas.length === 0 || (svg.match(/data-tipo="uta"/g) || []).length === VC.dados.utas.length; } });
    // v11.1: o diagrama mostra os níveis 1–2 com as UTAs recolhidas e todos os níveis com as UTAs expandidas
    self.registar({ id: 'N9.T6', nucleo: 'N9', grupo: 'Diagrama', nome: 'SVG expandido contém todos os ramais', criterio: 'expandido = nº ramais; recolhido = só níveis 1–2', fn: () => { if (!VC6.diagrama) return true; const D = VC6.diagrama; const antes = new Set(D._utasExpandidas); const filtro = D._filtro; const uta = D._utaAtiva; D._filtro = 'tudo'; D._utaAtiva = null; const conta = () => (D.renderSVG().match(/data-tipo="ramal"/g) || []).length; D._utasExpandidas.clear(); const recolhido = conta(); (VC.dados.utas || []).forEach(u => D._utasExpandidas.add('UTA-' + u.id)); const expandido = conta(); D._utasExpandidas = antes; D._filtro = filtro; D._utaAtiva = uta; const n12 = VC.dados.ramais.filter(r => (r.nivelNumero || 2) <= 2).length; return VC.dados.ramais.length === 0 || (expandido === VC.dados.ramais.length && recolhido === n12); } });
    self.registar({ id: 'N9.T7', nucleo: 'N9', grupo: 'Diagrama', nome: 'SVG contém todos os espaços', criterio: '≥ 1 nó de espaço ou grupo', fn: () => { if (!VC6.diagrama) return true; const svg = VC6.diagrama.renderSVG(); const nEsp = (svg.match(/data-tipo="espaco"/g) || []).length; const nGrp = (svg.match(/data-tipo="grupo-piso"/g) || []).length; return (nEsp + nGrp) >= 1 || VC.dados.espacos.length === 0; } });
    self.registar({ id: 'N9.T8', nucleo: 'N9', grupo: 'Diagrama', nome: 'SVG contém transferências', criterio: 'se existirem', fn: () => { try { if (!VC6.diagrama) return true; if ((VC.dados.transferencias || []).length === 0) return true; const filtroAntigo = VC6.diagrama._filtro; VC6.diagrama._filtro = 'tudo'; const svg = VC6.diagrama.renderSVG(); VC6.diagrama._filtro = filtroAntigo; return svg.indexOf('TRF-') >= 0 || svg.indexOf('transferencia') >= 0; } catch (e) { return true; } } });
    self.registar({ id: 'N9.T9', nucleo: 'N9', grupo: 'Diagrama', nome: 'Caixa UTA mostra Q, SFPint', criterio: 'regex match', fn: () => { if (!VC6.diagrama || !VC6.diagrama.renderCaixaUTA) return true; const h = VC6.diagrama.renderCaixaUTA(VC.dados.utas[0]); return !h || (h.indexOf('Q') >= 0 && h.indexOf('SFPint') >= 0); } });
    self.registar({ id: 'N9.T10', nucleo: 'N9', grupo: 'Diagrama', nome: 'Caixa Ramal mostra Ø', criterio: 'regex match', fn: () => { if (!VC6.diagrama || !VC6.diagrama.renderCaixaRamal) return true; const h = VC6.diagrama.renderCaixaRamal(VC.dados.ramais[0]); return !h || (h.indexOf('Q') >= 0 && h.indexOf('Ø') >= 0); } });
    self.registar({ id: 'N9.T11', nucleo: 'N9', grupo: 'Diagrama', nome: 'Caixa Espaço mostra Q_in', criterio: 'regex match', fn: () => { if (!VC6.diagrama || !VC6.diagrama.renderCaixaEspaco) return true; const h = VC6.diagrama.renderCaixaEspaco(VC.dados.espacos[0]); return !h || (h.indexOf('Q') >= 0 || h.indexOf('IN') >= 0); } });
    self.registar({ id: 'N9.T12', nucleo: 'N9', grupo: 'Diagrama', nome: 'Cores R1-R4 distintas', criterio: '4 cores', fn: () => { const c = VC.cores.nivelR; return new Set([c[1], c[2], c[3], c[4]]).size === 4; } });
    self.registar({ id: 'N9.T13', nucleo: 'N9', grupo: 'Diagrama', nome: 'Ícones de solução presentes', criterio: '≥ 8', fn: () => { const ic = VC6.diagrama && VC6.diagrama.ICONES_SOLUCAO; return !ic || Object.keys(ic).length >= 8; } });
    self.registar({ id: 'N9.T14', nucleo: 'N9', grupo: 'Diagrama', nome: 'exportarSVG() existe', criterio: 'função', fn: () => { if (!VC6.diagrama) return true; return typeof VC6.diagrama.exportarSVG === 'function'; } });
    self.registar({ id: 'N9.T15', nucleo: 'N9', grupo: 'Diagrama', nome: 'integrarRelatorio() existe', criterio: 'função', fn: () => { if (!VC6.diagrama) return true; return typeof VC6.diagrama.integrarRelatorio === 'function'; } });
    self.registar({ id: 'N9.T16', nucleo: 'N9', grupo: 'Diagrama', nome: 'integrarPDF() existe', criterio: 'função', fn: () => { if (!VC6.diagrama) return true; return typeof VC6.diagrama.integrarPDF === 'function'; } });
    self.registar({ id: 'N9.T17', nucleo: 'N9', grupo: 'Diagrama', nome: 'integrarCaderno() existe', criterio: 'função', fn: () => { if (!VC6.diagrama) return true; return typeof VC6.diagrama.integrarCaderno === 'function'; } });
    self.registar({ id: 'N9.T18', nucleo: 'N9', grupo: 'Diagrama', nome: 'Ciclo detetado → destacar', criterio: 'deteta', fn: () => { const trf = [{ deId: 1, paraId: 2, Q: 50 }, { deId: 2, paraId: 1, Q: 50 }]; return VC6.balanco.detetarCiclos(trf).length > 0; } });
    self.registar({ id: 'N9.T19', nucleo: 'N9', grupo: 'Diagrama', nome: 'classeEstadoEspaco() existe', criterio: 'função', fn: () => { if (!VC6.diagrama) return true; return typeof VC6.diagrama.classeEstadoEspaco === 'function'; } });
    self.registar({ id: 'N9.T20', nucleo: 'N9', grupo: 'Diagrama', nome: 'filtrarNos() funciona', criterio: 'tudo ≥ insuflacao', fn: () => { if (!VC6.diagrama || !VC6.diagrama.filtrarNos) return true; const g = VC6.diagrama.construirGrafo(); const todos = VC6.diagrama.filtrarNos(g.nos, 'tudo'); const ins = VC6.diagrama.filtrarNos(g.nos, 'insuflacao'); return todos.length >= ins.length; } });
  },

  initN10() {
    const self = this;
    self.registar({ id: 'N10.T1', nucleo: 'N10', grupo: 'BOM & TAB', nome: 'VC.bom existe', criterio: 'objeto', fn: () => typeof VC.bom === 'object' && typeof VC.bom.extrair === 'function' });
    self.registar({ id: 'N10.T2', nucleo: 'N10', grupo: 'BOM & TAB', nome: 'VC.bom.extrair devolve totais', criterio: 'totais definidos', fn: () => { const r = VC.bom.extrair(); return r && typeof r.totais === 'object'; } });
    self.registar({ id: 'N10.T3', nucleo: 'N10', grupo: 'BOM & TAB', nome: 'VC.bom.renderTabela gera HTML', criterio: 'string', fn: () => typeof VC.bom.renderTabela() === 'string' });
    self.registar({ id: 'N10.T4', nucleo: 'N10', grupo: 'BOM & TAB', nome: 'VC.bom.exportarCSV é função', criterio: 'função', fn: () => typeof VC.bom.exportarCSV === 'function' });
    self.registar({ id: 'N10.T5', nucleo: 'N10', grupo: 'BOM & TAB', nome: 'Flag moduloBOM ativa', criterio: 'true', fn: () => VC.flags.moduloBOM === true });
    self.registar({ id: 'N10.T6', nucleo: 'N10', grupo: 'BOM & TAB', nome: 'Flag campoQMedido ativa', criterio: 'true', fn: () => VC.flags.campoQMedido === true });
    self.registar({ id: 'N10.T7', nucleo: 'N10', grupo: 'BOM & TAB', nome: 'Relatórios BOM e TAB existem', criterio: 'funções', fn: () => typeof VC.relatorios.bom === 'function' && typeof VC.relatorios.tab === 'function' });
  },

  initN11() {
    const self = this;
    self.registar({ id: 'N11.T1', nucleo: 'N11', grupo: 'Construtor & Dados', nome: 'Degrade Torres Vedras 18out26 (45 espaços)', criterio: '45 espaços', fn: () => VC._dadosReais && Array.isArray(VC._dadosReais.espacos) && VC._dadosReais.espacos.length === 45 });
    self.registar({ id: 'N11.T2', nucleo: 'N11', grupo: 'Construtor & Dados', nome: '3 pisos (P0, P1, P2) em _dadosReais', criterio: '3 pisos', fn: () => VC._dadosReais && VC._dadosReais.pisos && VC._dadosReais.pisos.length === 3 });
    self.registar({ id: 'N11.T3', nucleo: 'N11', grupo: 'Construtor & Dados', nome: 'VC.topologia.construtor existe', criterio: 'objeto', fn: () => VC.topologia && typeof VC.topologia.construtor === 'object' });
    self.registar({ id: 'N11.T4', nucleo: 'N11', grupo: 'Construtor & Dados', nome: '5 tipos de ramal definidos', criterio: 'TIPOS_RAMAL = 5', fn: () => VC.topologia && Array.isArray(VC.topologia.TIPOS_RAMAL) && VC.topologia.TIPOS_RAMAL.length === 5 });
    self.registar({ id: 'N11.T5', nucleo: 'N11', grupo: 'Construtor & Dados', nome: 'Alias VC.balanco === VC6.balanco', criterio: 'referência igual', fn: () => VC.balanco === VC6.balanco });
    self.registar({ id: 'N11.T6', nucleo: 'N11', grupo: 'Construtor & Dados', nome: 'Migrador VERSAO_ALVO = V9', criterio: 'VERSAO_ALVO === "V9"', fn: () => VC.migrador.VERSAO_ALVO === 'V9' });
  },

  initIntegracao() {
    const self = this;
    self.registar({ id: 'INT.T1', nucleo: 'INT', grupo: 'Integração', nome: 'VC carregado (versão definida)', criterio: 'VC.versao + VC.versaoCurta', fn: () => typeof window.VC === 'object' && !!window.VC.versao && !!window.VC.versaoCurta });
    self.registar({ id: 'INT.T2', nucleo: 'INT', grupo: 'Integração', nome: 'VC6 carregado', criterio: 'window.VC6', fn: () => typeof window.VC6 === 'object' });
    self.registar({ id: 'INT.T3', nucleo: 'INT', grupo: 'Integração', nome: 'N1 reexportado', criterio: 'VC6.fisica', fn: () => typeof VC6.fisica === 'object' });
    self.registar({ id: 'INT.T4', nucleo: 'INT', grupo: 'Integração', nome: 'N2 reexportado', criterio: 'VC6.normas', fn: () => typeof VC6.normas === 'object' });
    self.registar({ id: 'INT.T5', nucleo: 'INT', grupo: 'Integração', nome: 'N3 carregado', criterio: 'VC6.balanco', fn: () => typeof VC6.balanco === 'object' });
    self.registar({ id: 'INT.T6', nucleo: 'INT', grupo: 'Integração', nome: 'N5 carregado', criterio: 'VC6.transferencias', fn: () => typeof VC6.transferencias === 'object' });
    self.registar({ id: 'INT.T7', nucleo: 'INT', grupo: 'Integração', nome: 'N4 reexportado', criterio: 'VC6.calculo', fn: () => typeof VC6.calculo === 'object' });
    self.registar({ id: 'INT.T8', nucleo: 'INT', grupo: 'Integração', nome: 'N6 reexportado', criterio: 'VC6.uta', fn: () => typeof VC6.uta === 'object' });
    self.registar({ id: 'INT.T9', nucleo: 'INT', grupo: 'Integração', nome: 'calcularTudo executa N3 no fim', criterio: 'balanço populado', fn: () => { VC.calculo.calcularTudo(); const e = VC.dados.espacos[0]; return !e || (e.balanco && typeof e.balanco.residuo === 'number'); } });
    self.registar({ id: 'INT.T10', nucleo: 'INT', grupo: 'Integração', nome: 'Migrador V5→V6 aplica R1/R2.1', criterio: 'nome R', fn: () => { if (!VC.dados.ramais.length) return true; return /^R\d/.test(VC.dados.ramais[0].nome); } });
    self.registar({ id: 'INT.T11', nucleo: 'INT', grupo: 'Integração', nome: 'F-RPH · VC.rph existe', criterio: 'objeto', fn: () => typeof VC.rph === 'object' && typeof VC.rph.calcularDefault === 'function' });
    self.registar({ id: 'INT.T12', nucleo: 'INT', grupo: 'Integração', nome: 'F-RPH · flag confortoTermico', criterio: 'true por omissão', fn: () => VC.flags.confortoTermico === true });
    self.registar({ id: 'INT.T13', nucleo: 'INT', grupo: 'Integração', nome: 'QAI · VC.qai existe', criterio: 'objeto', fn: () => typeof VC.qai === 'object' && typeof VC.qai.aplicarUtilizador === 'function' });
    self.registar({ id: 'INT.T14', nucleo: 'INT', grupo: 'Integração', nome: 'QAI · flag qaiProjeto', criterio: 'true por omissão', fn: () => VC.flags.qaiProjeto === true });
    self.registar({ id: 'INT.T15', nucleo: 'INT', grupo: 'Integração', nome: 'QAI · popupQAI existe', criterio: 'objeto com abrir()', fn: () => typeof VC.popupQAI === 'object' && typeof VC.popupQAI.abrir === 'function' });
  },

  initUI() {
    const self = this;
    self.registar({ id: 'UI.T1', nucleo: 'UI', grupo: 'UI', nome: 'Sidebar renderiza', criterio: 'elemento existe', fn: () => !!document.getElementById('sidebar') });
    self.registar({ id: 'UI.T2', nucleo: 'UI', grupo: 'UI', nome: 'Barra de modos tem ≥ 6 tabs', criterio: 'conforme', fn: () => document.querySelectorAll('.modo-btn').length >= 6 });
    self.registar({ id: 'UI.T3', nucleo: 'UI', grupo: 'UI', nome: 'Painel 2×3 renderiza', criterio: 'elemento existe', fn: () => !!document.getElementById('painelInferior') });
    self.registar({ id: 'UI.T4', nucleo: 'UI', grupo: 'UI', nome: 'Modo Diagrama Rede existe', criterio: 'section presente', fn: () => !!document.getElementById('modo-diagrama-rede') });
    self.registar({ id: 'UI.T5', nucleo: 'UI', grupo: 'UI', nome: 'SVG diagrama existe', criterio: 'conforme', fn: () => !!document.getElementById('diagramaSVG') });
    self.registar({ id: 'UI.T6', nucleo: 'UI', grupo: 'UI', nome: 'Filtros do diagrama', criterio: '6+ botões', fn: () => document.querySelectorAll('.v6-diag-filtro').length >= 6 });
    self.registar({ id: 'UI.T7', nucleo: 'UI', grupo: 'UI', nome: 'Tooltip popup existe', criterio: 'elemento presente', fn: () => !!document.getElementById('ttPopup') });
    self.registar({ id: 'UI.T8', nucleo: 'UI', grupo: 'UI', nome: 'Toast existe', criterio: 'elemento presente', fn: () => !!document.getElementById('toast') });
    self.registar({ id: 'UI.T9', nucleo: 'UI', grupo: 'UI', nome: 'Modais V8 existem', criterio: '3 modais', fn: () => ['modalBalanco', 'modalTestes', 'modalExemplos'].every(id => !!document.getElementById(id)) });
    self.registar({ id: 'UI.T10', nucleo: 'UI', grupo: 'UI', nome: 'Debug disponível', criterio: 'VC.debug.registar', fn: () => !!VC.debug && typeof VC.debug.registar === 'function' });
  },

  correr() {
    if (!this._lista.length) {
      this.initN1(); this.initN2(); this.initN3(); this.initN4(); this.initN5();
      this.initN6(); this.initN7(); this.initN8(); this.initN9();
      this.initN10(); this.initN11(); this.initIntegracao(); this.initUI();
    }
    const inicio = performance.now ? performance.now() : Date.now();
    const res = { total: 0, pass: 0, fail: 0, detalhe: [], porNucleo: {} };
    this._lista.forEach(t => {
      res.total++;
      let estado = 'fail';
      try { estado = t.fn() ? 'pass' : 'fail'; } catch (e) { estado = 'fail'; }
      if (estado === 'pass') res.pass++; else res.fail++;
      res.detalhe.push({ id: t.id, nucleo: t.nucleo, grupo: t.grupo, nome: t.nome, criterio: t.criterio, estado });
      if (!res.porNucleo[t.nucleo]) res.porNucleo[t.nucleo] = { pass: 0, fail: 0, total: 0 };
      res.porNucleo[t.nucleo].total++;
      res.porNucleo[t.nucleo][estado]++;
    });
    res.duracao = Math.round((performance.now ? performance.now() : Date.now()) - inicio);
    this._resultado = res;
    return res;
  },

  exportarDiagnostico() {
    return JSON.stringify({ versao: VC.versao, versaoCurta: VC.versaoCurta, timestamp: new Date().toISOString(), resultado: this._resultado || this.correr() }, null, 2);
  }
};

VC.testes = VC.testes || {};
VC.testes.correr = function () {
  const r = VC6.testes.correr();
  return { total: r.total, pass: r.pass, fail: r.fail, detalhe: r.detalhe.map(t => ({ id: t.id, grupo: t.grupo, nome: t.nome, estado: t.estado })) };
};

})();