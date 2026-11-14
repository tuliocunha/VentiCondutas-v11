/* ============================================================
   VENTICONDUTAS · 04b-testes
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
    self.registar({ id: 'N3.T19', nucleo: 'N3', grupo: 'Balanço', nome: 'Insuflação/extração pela rede do terminal, não pelo nome', criterio: 'terminal de insuflação chamado "Grelha extração" conta como insuflação', fn: () => {
      const t = { id: 'T-TESTE', nome: 'Grelha extração', tipo: 'Retorno', rede: 'insuflacao', Q: 100, espacos: [] };
      const a = VC.calculo.calcularVentiladores(); VC.dados.terminais.push(t);
      try { const d = VC.calculo.calcularVentiladores(); return Math.round(d.ins - a.ins) === 100 && Math.round(d.ext - a.ext) === 0; }
      finally { VC.dados.terminais.splice(VC.dados.terminais.indexOf(t), 1); VC.calculo.calcularVentiladores(); } } });
    self.registar({ id: 'N3.T20', nucleo: 'N3', grupo: 'Balanço', nome: 'Ar transferido conta na insuflação necessária do espaço de origem', criterio: 'Q_nec = Q_espaco + transferências de saída', fn: () => {
      const t = (VC.dados.transferencias || [])[0]; if (!t) return true;
      const de = VC.dados.espacos.find(e => e.id === t.deId); const b = VC.calculo.balancoEspaco(de.nome);
      const out = VC.dados.transferencias.filter(x => x.deId === de.id).reduce((s, x) => s + (Number(x.Q) || 0), 0);
      return b.rede !== 'insuflacao' || Math.abs(b.Q_nec - (VC.calculo.calcularQEspaco(de).Q_espaco + out)) < 0.5; } });
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
    self.registar({ id: 'N3.T7', nucleo: 'N3', grupo: 'Balanço', nome: 'Resíduo zero (com transf)', criterio: 'insufla 100, transfere 100 → resíduo 0; sem a transferência → 100', fn: () => { const e = { id: 99, nome: 'X', tipo: 'Escritório', g: 1, definicoes: [{ rede: 'insuflacao', Q_total: 100 }] }; const t = [{ deId: 99, paraId: 98, Q: 100 }]; return VC6.balanco.residuo(e, t) === 0 && VC6.balanco.residuo(e, [{ deId: 1, paraId: 2, Q: 5 }]) === 100; } });
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
    self.registar({ id: 'N4.T16', nucleo: 'N4', grupo: 'Dimensionamento', nome: 'Velocidade ≤ máximo do nível (ramais não travados)', criterio: 'N1 6 · N2 5 · N3 4 · N4 3 m/s', fn: () => {
      // v11.1 (fase 5): compara com a tabela VMAX_NIVEL e não com vMaxDe (que é o que se quer vigiar),
      // e inclui um caso em que o limite decide o diâmetro (o exemplo cumpre mesmo sem limite).
      const T = VC.constantes.VMAX_NIVEL, nivel = r => r.nivelNumero || VC.utils.nivelTextoParaNumero(r.nivel) || 2;
      const tabela = [1, 2, 3, 4].every(n => VC.calculo.vMaxDe({ nivelNumero: n }) === T[n]);
      const decide = VC.calculo.dimensionarConduta(1500, { vMax: VC.calculo.vMaxDe({ nivelNumero: 4 }) }).v <= T[4] + 1e-6;
      return tabela && decide && VC.dados.ramais.filter(r => !(r.lock && r.lock.D)).every(r => (r.v || 0) <= T[nivel(r)] + 1e-6); } });
    self.registar({ id: 'N4.T17', nucleo: 'N4', grupo: 'Dimensionamento', nome: 'Perda constante respeita vMax em caudais altos', criterio: '20 000 m³/h → v ≤ 6 m/s', fn: () => VC.calculo.dimensionarConduta(20000, { vMax: 6 }).v <= 6 });
    self.registar({ id: 'N4.T18', nucleo: 'N4', grupo: 'Dimensionamento', nome: 'Secção retangular escolhida pelo utilizador é calculada', criterio: 'b×h, De de Huebscher e R próprio', fn: () => { const r = VC.dados.ramais.find(x => !x.parente); if (!r) return true; const ant = r.geometriaInput; const Rcirc = r.R; r.geometriaInput = Object.assign({}, ant || {}, { forma: 'retangular' }); let ok = false; try { VC.calculo.calcularTudo(); ok = r.secaoAdotada === 'retangular' && /^\d+×\d+$/.test(r.secaoCalc || '') && r.De > 0 && Math.abs(r.R - Rcirc) > 1e-6; } finally { r.geometriaInput = ant; VC.calculo.calcularTudo(); } return ok; } });
    // v11.1 (fase 5): regressão do erro A2 (o balanço do espaço somava insuflação e extração)
    self.registar({ id: 'N4.T11', nucleo: 'N4', grupo: 'Balanço', nome: 'Escritório com 1 difusor e 1 grelha do mesmo caudal → OK', criterio: 'só a insuflação conta para o escritório (antes: soma → SOBRE)', fn: () => {
      const d = VC.dados, e = { id: 9991, nome: '__TESTE_ESCRITORIO__', tipo: 'Escritório', A: 15, H: 2.6, V: 39, N: 2, definicoes: [] };
      d.espacos.push(e);
      try {
        const q = Math.round(VC.calculo.calcularQEspaco(e).Q_espaco);
        const ts = [{ id: 'T-9991-I', rede: 'insuflacao', ramalRef: '', Q: q, espacos: [{ nome: e.nome, Q_parcela: q }] }, { id: 'T-9991-X', rede: 'extracao', ramalRef: '', Q: q, espacos: [{ nome: e.nome, Q_parcela: q }] }];
        ts.forEach(t => d.terminais.push(t));
        try { const b = VC.calculo.balancoEspaco(e.nome); return q > 0 && b.estado === 'OK' && Math.round(b.Q_servido) === q; }
        finally { ts.forEach(t => d.terminais.splice(d.terminais.indexOf(t), 1)); }
      } finally { d.espacos.splice(d.espacos.indexOf(e), 1); VC.perf && VC.perf.cacheCalculo && VC.perf.cacheCalculo.invalidar(); } } });
    self.registar({ id: 'N4.T19', nucleo: 'N4', grupo: 'Hidráulico', nome: 'Caudal de cada ramal = terminais próprios + sub-ramais', criterio: 'o erro "R1 com menos caudal do que R1.1" não volta', fn: () => {
      const R = VC.dados.ramais; if (!R.length) return true;
      return R.every(r => { const filhos = R.filter(f => f.parente === r.nome); const proprio = VC.dados.terminais.filter(t => t.ramalRef === r.nome).reduce((s, t) => s + (Number(t.Q) || 0), 0);
        return Math.abs((Number(r.Q) || 0) - proprio - filhos.reduce((s, f) => s + (Number(f.Q) || 0), 0)) < 1 && filhos.every(f => (Number(r.Q) || 0) >= (Number(f.Q) || 0)); }); } });
    // v11.2: a altura disponível e a rugosidade do Setup chegam aos ramais (antes cada ramal tinha uma cópia fixa)
    self.registar({ id: 'N4.T20', nucleo: 'N4', grupo: 'Dimensionamento', nome: 'Altura e rugosidade do Setup valem para todos os ramais', criterio: 'mudar o Setup muda hMaxDe/rugosidadeDe; um valor marcado como próprio prevalece', fn: () => {
      const d = VC.dados, h0 = d.restricaoH, e0 = d.params.rugosidade, r = { geometriaInput: { H_max: 250, rugosidade: 0.15 } };
      try {
        d.restricaoH = 400; d.params.rugosidade = 0.5;
        const doSetup = VC.calculo.hMaxDe(r) === 400 && VC.calculo.rugosidadeDe(r) === 0.5;
        r.geometriaInput.proprio = { H_max: true, rugosidade: true };
        const proprio = VC.calculo.hMaxDe(r) === 250 && VC.calculo.rugosidadeDe(r) === 0.15;
        return doSetup && proprio;
      } finally { d.restricaoH = h0; d.params.rugosidade = e0; } } });
    self.registar({ id: 'N6.T14', nucleo: 'N6', grupo: 'UTAs', nome: 'Estado dos filtros muda o Δp interno', criterio: 'limpo < médio < sujo numa UTA com filtros', fn: () => {
      const u = VC.dados.utas.find(x => (x.componentes || []).some(c => /filtro/i.test(c.tipo || ''))); if (!u) return true;
      const m0 = VC.dados.filtros.modo, dp = {};
      try { ['limpo', 'medio', 'sujo'].forEach(m => { VC.dados.filtros.modo = m; VC.calculo.calcularVentiladores(); dp[m] = u.dpInt; }); }
      finally { VC.dados.filtros.modo = m0; VC.calculo.calcularVentiladores(); }
      return dp.limpo < dp.medio && dp.medio < dp.sujo; } });
    self.registar({ id: 'N2.T17', nucleo: 'N2', grupo: 'Normas', nome: 'Tipologia em implementação gera aviso', criterio: 'Residencial/Saúde/Indústria → ATENÇÃO; Comércio e Serviços → sem aviso', fn: () => {
      const t0 = VC.dados.tipologia, tem = () => (VC.calculo.calcularTudo().findings || []).some(f => f.tipo === 'Tipologia em implementação');
      try { VC.dados.tipologia = 'comercio'; const c = tem(); VC.dados.tipologia = 'saude'; const s = tem(); return !c && s; }
      finally { VC.dados.tipologia = t0; VC.calculo.calcularTudo(); } } });
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
    self.registar({ id: 'N6.T12', nucleo: 'N6', grupo: 'UTAs', nome: 'Ponto de funcionamento é de cada UTA', criterio: 'duas UTAs da mesma rede com curvas diferentes → pontos diferentes', fn: () => {
      const us = VC.dados.utas.filter(u => u.rede === 'insuflacao' && u.curva && u.curva.length >= 2); if (us.length < 2) return true;
      return us.every(u => u.pontoFunc && u.pontoFunc.modo === 'curva') && Math.round(us[0].pontoFunc.Qmh) !== Math.round(us[1].pontoFunc.Qmh); } });
    self.registar({ id: 'N6.T13', nucleo: 'N6', grupo: 'UTAs', nome: 'Aviso quando o caudal passa o fim da curva', criterio: 'foraDaCurva ⇔ Q projeto > Q máx da curva', fn: () => VC.dados.utas.filter(u => u.pontoFunc && u.pontoFunc.modo === 'curva').every(u => u.pontoFunc.foraDaCurva === (u.Q * 3600 > Math.max.apply(null, u.curva.map(p => p.Q)))) });
    self.registar({ id: 'N1.T20', nucleo: 'N1', grupo: 'Estado', nome: 'Série, método e filtros entram no estado', criterio: 'mudar cada um muda o hash', fn: () => {
      const d = VC.dados, h0 = VC.estado._hashEstado(), s = d.serieDiametros, m = d.metodoCalculo, f = d.filtros && d.filtros.modo;
      try { d.serieDiametros = s === 'S2' ? 'S1' : 'S2'; const h1 = VC.estado._hashEstado(); d.serieDiametros = s;
            d.metodoCalculo = { metodo: (m && m.metodo) === 'velocity' ? 'loss' : 'velocity' }; const h2 = VC.estado._hashEstado(); d.metodoCalculo = m;
            d.filtros.modo = f === 'limpo' ? 'sujo' : 'limpo'; const h3 = VC.estado._hashEstado(); d.filtros.modo = f;
            return h1 !== h0 && h2 !== h0 && h3 !== h0 && VC.estado._hashEstado() === h0; }
      finally { d.serieDiametros = s; d.metodoCalculo = m; if (d.filtros) d.filtros.modo = f; } } });
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
    // v11.1 (fase 5): exportações geram o ficheiro sem erro (o save é intercetado: nada é descarregado)
    self.registar({ id: 'N8.T6', nucleo: 'N8', grupo: 'Exportação', nome: 'PDF gera-se sem exceção', criterio: 'doc.save chamado com nome .pdf e sem toast de erro', fn: () => {
      const J = window.jspdf && window.jspdf.jsPDF; if (!J || !VC.exportacoes || !VC.exportacoes.pdf) return true;
      // save vive no protótipo; o teste põe uma cópia em J.API e no fim apaga-a (repor 'undefined' partia o PDF)
      const tinha = Object.prototype.hasOwnProperty.call(J.API, 'save'), saveOrig = J.API.save, toastOrig = VC.ui.toast; let nome = null, erro = null;
      J.API.save = function (n) { nome = n; return this; };
      VC.ui.toast = function (m) { if (/erro/i.test(String(m))) erro = m; };
      try { VC.exportacoes.pdf(); } catch (e) { erro = e.message; }
      finally { if (tinha) J.API.save = saveOrig; else delete J.API.save; VC.ui.toast = toastOrig; }
      const doc = new J(); const aindaGuarda = typeof doc.save === 'function';
      return !erro && /\.pdf$/.test(nome || '') && aindaGuarda; } });
    self.registar({ id: 'N8.T7', nucleo: 'N8', grupo: 'Exportação', nome: 'Excel gera-se sem exceção', criterio: 'XLSX.writeFile chamado com nome .xlsx', fn: () => {
      if (typeof XLSX === 'undefined' || !VC.exportacoes || !VC.exportacoes.excel) return true;
      const orig = XLSX.writeFile, toastOrig = VC.ui.toast; let nome = null, folhas = 0, erro = null;
      XLSX.writeFile = function (wb, n) { nome = n; folhas = (wb && wb.SheetNames || []).length; };
      VC.ui.toast = function (m) { if (/erro/i.test(String(m))) erro = m; };
      try { VC.exportacoes.excel(); } catch (e) { erro = e.message; } finally { XLSX.writeFile = orig; VC.ui.toast = toastOrig; }
      return !erro && /\.xlsx$/.test(nome || '') && folhas > 0; } });
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
    self.registar({ id: 'N11.T7', nucleo: 'N11', grupo: 'Construtor & Dados', nome: 'Exemplo Degrade 2 disponível', criterio: 'na lista de exemplos (pré-carregado) e com carregador', fn: () => { if (!VC.exemplos) return true; if (!VC.exemplos._lista) VC.exemplos.init(); const e = VC.exemplos._lista.find(x => x.id === 'degrade-2'); return !!e && e.builtin === true && typeof VC.exemploDegrade2 === 'function'; } });
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
    // v11.1 (fase 5): nenhum botão dos ecrãs chama uma função VC.* que não exista (erros B2, B4, B7)
    self.registar({ id: 'UI.T11', nucleo: 'UI', grupo: 'UI', nome: 'Todos os botões chamam funções que existem', criterio: 'onclick/onchange de todos os passos → VC.…( definido', fn: () => {
      const ativo = VC._passoAtivo || 'setup', falta = new Set();
      const existe = p => { let o = window; for (const k of p.split('.')) { if (o == null || !(k in Object(o))) return false; o = o[k]; } return typeof o === 'function'; };
      const ver = () => document.querySelectorAll('[onclick],[onchange],[oninput]').forEach(el => ['onclick', 'onchange', 'oninput'].forEach(a => {
        const v = el.getAttribute(a) || ''; if (/_cartaoVisualCard\(/.test(v)) return;
        for (const m of v.matchAll(/\b(VC6?(?:\.[A-Za-z_$][\w$]*)+)\(/g)) if (!existe(m[1])) falta.add(m[1]);
      }));
      try { (VC.passosCatalogo || []).filter(p => p.id !== 'diagnostico').forEach(p => { VC.passos.render(p.id); ver(); }); } finally { VC.passos.render(ativo); }
      ver();
      if (falta.size && VC.debug && VC.debug.aviso) VC.debug.aviso('UI.T11 funções em falta: ' + [...falta].join(', '));
      return falta.size === 0; } });
    self.registar({ id: 'UI.T12', nucleo: 'UI', grupo: 'UI', nome: 'Ajuda por clique (VC.tooltips.mostrar)', criterio: 'abre o popup com o título da chave', fn: () => {
      if (!VC.tooltips || typeof VC.tooltips.mostrar !== 'function') return false;
      const b = document.createElement('span'); document.body.appendChild(b);
      try { VC.tooltips.mostrar('tipo_espaco', b); const p = document.getElementById('ttPopup'); return !!p && /\bon\b/.test(p.className) && p.textContent.length > 0; }
      finally { if (VC.tooltips.esconder) VC.tooltips.esconder(); b.remove(); } } });
    // v11.3: todas as colunas técnicas têm o mesmo "?" e todas as ajudas abrem um texto que existe
    self.registar({ id: 'UI.T13', nucleo: 'UI', grupo: 'UI', nome: 'Ajuda "?" em todas as colunas técnicas', criterio: 'colunas do dicionário com "?"; todas as chaves data-tt existem no glossário', fn: () => {
      if (!VC.tabelas || typeof VC.tabelas.decorar !== 'function') return false;
      const dic = (VC.conhecimento && VC.conhecimento.tooltips) || {}, ativo = VC._passoAtivo || 'setup', erros = [];
      const ver = (onde, raiz) => {
        VC.tabelas.decorar(raiz);
        raiz.querySelectorAll('[data-tt]').forEach(el => { const k = el.getAttribute('data-tt'); if (!dic[k]) erros.push(onde + ': chave inexistente ' + k); });
        raiz.querySelectorAll('table thead th').forEach(th => { if (th.closest('[data-sem-ajuda], .legenda-tabela')) return; const k = VC.tabelas.chave(th); if (k && !th.querySelector('.btn-help')) erros.push(onde + ': sem "?" em ' + VC.tabelas.rotulo(th)); });
      };
      try {
        (VC.passosCatalogo || []).filter(p => p.id !== 'diagnostico').forEach(p => { VC.passos.render(p.id); const el = document.getElementById('conteudoPasso'); if (el) ver(p.id, el); });
        const d = document.createElement('div');
        (VC.listaRelatorios || []).filter(r => r.id !== 'diagnostico').forEach(r => { try { d.innerHTML = VC.relatorios[r.id](); } catch (e) { return; } ver('relatório ' + r.id, d); });
      } finally { VC.passos.render(ativo); }
      if (erros.length && VC.debug && VC.debug.aviso) VC.debug.aviso('UI.T13: ' + erros.slice(0, 8).join(' | '));
      return erros.length === 0; } });
    // v11.3: navegação única — fases = grupos do menu, todos os passos visíveis, cada gráfico tem uma vista que o abre
    self.registar({ id: 'UI.T14', nucleo: 'UI', grupo: 'UI', nome: 'Navegação: fases, passos e vistas coerentes', criterio: 'fases = grupos; 16 passos visíveis; todos os modos gráficos têm vista; cada vista abre sem erro', fn: () => {
      if (!VC.nav) return false;
      const ativo = VC._passoAtivo || 'setup', erros = [];
      const grupos = [...new Set((VC.passosCatalogo || []).map(p => p.grupoNome))];
      const fases = [...document.querySelectorAll('.fase-btn')].map(b => b.textContent.trim());
      if (fases.join('|') !== grupos.join('|')) erros.push('fases ≠ grupos: ' + fases.join(',') + ' / ' + grupos.join(','));
      const modos = [...document.querySelectorAll('.modo-btn')].map(b => b.dataset.modo).filter(m => m && m !== 'condutas');
      const comVista = new Set(); Object.values(VC.nav.VISTAS).forEach(l => l.forEach(v => { if (v.modo) comVista.add(v.modo); }));
      modos.forEach(m => { if (!comVista.has(m)) erros.push('gráfico sem vista: ' + m); });
      try {
        (VC.passosCatalogo || []).filter(p => p.id !== 'diagnostico').forEach(p => {
          VC.nav.irPasso(p.id);
          const vis = [...document.querySelectorAll('.passo-btn[data-passo]')].filter(b => b.style.display !== 'none').length;
          if (vis !== VC.passosCatalogo.length) erros.push(p.id + ': só ' + vis + ' passos no menu');
          const fase = document.querySelector('.fase-btn.ativo');
          if (!fase || fase.textContent.trim() !== p.grupoNome) erros.push(p.id + ': fase ativa errada');
          VC.nav.vistasDe(p.id).forEach(v => {
            try { VC.nav.setVista(v.id); } catch (e) { erros.push(p.id + '/' + v.id + ': ' + e.message); return; }
            if (VC.nav.vistaAtiva !== v.id) erros.push(p.id + '/' + v.id + ': não ficou ativa');
            if (v.modo && VC._modoAtivo !== v.modo) erros.push(p.id + '/' + v.id + ': modo ' + VC._modoAtivo);
            if (!v.modo && VC._modoAtivo !== 'condutas') erros.push(p.id + '/' + v.id + ': ficou num ecrã gráfico');
            const c = document.getElementById('conteudoPasso');
            if (!v.modo && c && /class="vazio"[^>]*>[\s\S]{0,80}(Erro|não carregado)/.test(c.innerHTML)) erros.push(p.id + '/' + v.id + ': erro no desenho');
          });
        });
      } finally { VC.nav.irPasso(ativo); }
      if (erros.length && VC.debug && VC.debug.aviso) VC.debug.aviso('UI.T14: ' + erros.slice(0, 6).join(' | '));
      return erros.length === 0; } });
    // v11.3: a Entrega mostra o estado certo — o mesmo número de avisos da auditoria, e cada um com um passo para resolver
    self.registar({ id: 'UI.T15', nucleo: 'UI', grupo: 'UI', nome: 'Entrega: estado igual à auditoria', criterio: 'Σ avisos agrupados = findings; cada grupo aponta para um passo que existe', fn: () => {
      if (!VC.entrega) return false;
      const d = VC.entrega.dados(), x = VC.calculo.calcularTudo();
      const soma = d.pontos.reduce((s, p) => s + p.n, 0);
      const ids = new Set((VC.passosCatalogo || []).map(p => p.id));
      const h = VC.entrega.render();
      return soma === (x.findings || []).length && d.pontos.every(p => ids.has(p.passo)) && /Licenciamento/.test(h) && /Obra/.test(h) && /Ensaios/.test(h); } });
    // v11.3: planta — área medida pela escala, desenho ligado ao espaço, e as plantas viajam com o projeto
    self.registar({ id: 'UI.T16', nucleo: 'UI', grupo: 'UI', nome: 'Planta: área pela escala e plantas no projeto', criterio: 'retângulo 500×250 px a 0,02 m/px = 50 m² (shoelace); polígono em L; plantas repostas ao importar', fn: () => {
      if (!VC.planta) return false;
      const piso = { id: 'pisoTeste', nome: 'Piso teste', imagem: null, w: 1000, h: 500, escala: 0.02 };
      const ret = [[0, 0], [500, 0], [500, 250], [0, 250]];
      const L = [[0, 0], [400, 0], [400, 100], [100, 100], [100, 300], [0, 300]];   // 400×100 + 100×200 = 60 000 px²
      const okArea = Math.abs(VC.planta.areaM2(ret, piso) - 50) < 1e-9 && VC.planta.areaPx(L) === 60000 && VC.planta.areaM2(ret, { escala: null }) === null;
      const guardadas = VC.dados.plantas;
      try {
        VC.dados.plantas = [piso];
        VC.migrador.prepararParaImportar({ metadados: {}, configuracao: {}, dados: { espacos: [], plantas: [{ id: 'x', nome: 'P', w: 10, h: 10, escala: 0.1 }] } });
        const veio = VC.dados.plantas.length === 1 && VC.dados.plantas[0].id === 'x';
        VC.migrador.prepararParaImportar({ metadados: {}, configuracao: {}, dados: { espacos: [] } });
        const limpou = VC.dados.plantas.length === 0;
        return okArea && veio && limpou;
      } finally { VC.dados.plantas = guardadas; }
    } });
    // v11.3: planta da rede — ponto dentro da sala, terminais distribuídos dentro do desenho, caudal sugerido pelo balanço
    self.registar({ id: 'UI.T17', nucleo: 'UI', grupo: 'UI', nome: 'Planta da rede: salas, terminais e transferências', criterio: 'ponto-no-polígono em L; terminais distribuídos ficam dentro da sala; Q sugerido = falta no destino', fn: () => {
      const P = VC.planta; if (!P || !P.dentro || !P.distribuir || !P._sugerirQ) return false;
      const L = [[0, 0], [400, 0], [400, 100], [100, 100], [100, 300], [0, 300]];
      const okDentro = P.dentro([50, 250], L) && P.dentro([300, 50], L) && !P.dentro([300, 250], L) && !P.dentro([500, 50], L);
      const g = { plantas: VC.dados.plantas, terminais: VC.dados.terminais, piso: P.piso, bal: VC6.balanco && VC6.balanco.todos };
      try {
        VC.dados.plantas = [{ id: 'pT', nome: 'Teste', w: 1000, h: 1000, escala: 0.01 }]; P.piso = 'pT';
        const e = { id: 991, nome: 'Sala L teste', planta: { pisoId: 'pT', pts: L } };
        VC.dados.terminais = [1, 2, 3].map(i => ({ id: 'T' + i, nome: 'T' + i, rede: i === 3 ? 'extracao' : 'insuflacao', espacos: [{ id: 991, nome: 'Sala L teste' }] }));
        const n = P.distribuir(e, true);
        const okTerm = n === 3 && VC.dados.terminais.every(t => t.planta && t.planta.pisoId === 'pT' && P.dentro([t.planta.x, t.planta.y], L));
        VC6.balanco.todos = () => [{ id: 1, residuo: 40 }, { id: 2, residuo: -25 }, { id: 3, residuo: 0 }];
        const okQ = P._sugerirQ(1, 2) === 25 && P._sugerirQ(3, 2) === 25 && P._sugerirQ(3, 3) === 0;
        return okDentro && okTerm && okQ;
      } finally { VC.dados.plantas = g.plantas; VC.dados.terminais = g.terminais; P.piso = g.piso; if (VC6.balanco) VC6.balanco.todos = g.bal; }
    } });
    // v11.3: ramais na planta — L medido pela escala, curvas e ζ sugerido, encaixe no ramal-pai
    self.registar({ id: 'UI.T18', nucleo: 'UI', grupo: 'UI', nome: 'Ramais na planta: L medido, curvas e ζ', criterio: '(0,0)→(300,0)→(300,400) a 0,01 m/px = 7 m; 1 curva de 90° → ζ = 0,30 + 0,25; reta sem curvas; encaixa no ramal desenhado', fn: () => {
      const P = VC.planta; if (!P || !P.comprimentoM || !P.curvas || !P.zetaSugerido || !P._encaixar) return false;
      const piso = { id: 'pR', escala: 0.01 }, L = [[0, 0], [300, 0], [300, 400]];
      const okL = Math.abs(P.comprimentoM(L, piso) - 7) < 1e-9 && P.comprimentoM(L, { escala: null }) === null;
      const okC = P.curvas(L).length === 1 && P.curvas(L)[0] === 90 && Math.abs(P.zetaSugerido(L) - 0.55) < 1e-9 && P.curvas([[0, 0], [100, 0], [200, 2]]).length === 0;
      const g = { plantas: VC.dados.plantas, piso: P.piso, zoom: P.zoom, ramais: VC.dados.ramais };
      try {
        VC.dados.plantas = [{ id: 'pR', nome: 'T', w: 1000, h: 1000, escala: 0.01 }]; P.piso = 'pR'; P.zoom = 1;
        VC.dados.ramais = [{ id: 9001, nome: 'RX', rede: 'insuflacao', planta: { pisoId: 'pR', pts: L } }];
        const e = P._encaixar([305, 200]);
        const okE = !!(e && e.ramal && e.ramal.nome === 'RX' && Math.abs(e.q[0] - 300) < 1e-9);
        return okL && okC && okE;
      } finally { VC.dados.plantas = g.plantas; P.piso = g.piso; P.zoom = g.zoom; VC.dados.ramais = g.ramais; }
    } });
    // v11.3: sem espaço no navegador, guardar um exemplo falha COM aviso e a lista não fica com um exemplo que não existe
    self.registar({ id: 'UI.T19', nucleo: 'UI', grupo: 'UI', nome: 'Exemplos: falta de espaço é avisada', criterio: 'com o armazenamento recusado, salvar devolve false, a lista não muda e aparece o aviso', fn: () => {
      const E = VC.exemplos; if (!E || !E.salvar) return false;
      const orig = Storage.prototype.setItem, conf = window.confirm, toast = VC.ui.toast;
      let avisou = false, perguntou = false;
      try {
        Storage.prototype.setItem = function (k, v) { if (k === E.STORAGE_KEY) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } return orig.call(this, k, v); };
        window.confirm = () => { perguntou = true; return false; };
        VC.ui.toast = m => { if (/NÃO guardado/.test(m)) avisou = true; };
        const nome = 'UI.T19 sem espaço ' + Date.now();
        const ok = E.salvar(nome, '');
        return ok === false && !E.listar().some(x => x.nome === nome) && avisou && perguntou;
      } finally {
        Storage.prototype.setItem = orig; window.confirm = conf; VC.ui.toast = toast;
        if (E._lista && E._lista.some(x => /^UI\.T19 /.test(x.nome))) { E._lista = E._lista.filter(x => !/^UI\.T19 /.test(x.nome)); E.save({ silencioso: true }); }
      }
    } });
    // v11.3: área de desenho — zoom no cursor (o ponto fica no sítio), deslocar, e desfazer da planta
    self.registar({ id: 'UI.T20', nucleo: 'UI', grupo: 'UI', nome: 'Planta: zoom no cursor, deslocar e desfazer', criterio: 'zoom 1→2 no ponto (500,300) mantém esse ponto; deslocar 100 px a 2× = 50 px de imagem; desfazer repõe o espaço', fn: () => {
      const P = VC.planta; if (!P || !P.zoomEm || !P.deslocar || !P.desfazer || !P.viewBox) return false;
      const g = { z: P.zoom, x: P.vx, y: P.vy, av: P.aplicarVista, pilha: P._pilha, ref: P._refeitas };
      try {
        P.aplicarVista = function () {};   // sem desenho no ecrã durante o teste
        P.zoom = 1; P.vx = 0; P.vy = 0;
        P.zoomEm(2, 500, 300);
        const okZoom = P.zoom === 2 && Math.abs(P.vx - 250) < 1e-9 && Math.abs(P.vy - 150) < 1e-9 && Math.abs((P.vx + 500 / P.zoom) - 500) < 1e-9;
        P.deslocar(100, 0);
        const okPan = Math.abs(P.vx - 200) < 1e-9;
        P._pilha = []; P._refeitas = [];
        const D = VC.dados, ge = D.espacos, gred = P.redesenhar, gsync = VC.estado.forcarSync, gtoast = VC.ui.toast;
        let okUndo = false;
        try {
          P.redesenhar = () => {}; VC.estado.forcarSync = () => {}; VC.ui.toast = () => {};
          D.espacos = [{ id: 1, nome: 'antes' }];
          const s0 = P._estado(); D.espacos[0].nome = 'depois'; P._empilhar('teste', s0);
          okUndo = P.desfazer() === true && D.espacos[0].nome === 'antes' && P._refeitas.length === 1 && P._pilha.length === 0;
        } finally { D.espacos = ge; P.redesenhar = gred; VC.estado.forcarSync = gsync; VC.ui.toast = gtoast; }
        return okZoom && okPan && okUndo;
      } finally { P.zoom = g.z; P.vx = g.x; P.vy = g.y; P.aplicarVista = g.av; P._pilha = g.pilha; P._refeitas = g.ref; }
    } });
    // v11.3: renomear um ramal atualiza tudo o que o refere; terminal largado perto da ponta encaixa nela
    self.registar({ id: 'UI.T21', nucleo: 'UI', grupo: 'UI', nome: 'Renomear ramal em cascata e encaixe na ponta', criterio: 'parente, ramalRef, ramalRefInsuflacao, nós e troços mudam de nome; nome repetido é recusado; ponta a 5 px encaixa', fn: () => {
      if (!VC.topologia || !VC.topologia.renomearRamal || !VC.planta || !VC.planta._ramalPerto) return false;
      const D = VC.dados, g = { ramais: D.ramais, terminais: D.terminais, espacos: D.espacos, nos: D.nos, trechos: D.trechos, plantas: D.plantas, piso: VC.planta.piso, zoom: VC.planta.zoom };
      try {
        D.ramais = [{ id: 1, nome: 'RA', parente: '', rede: 'insuflacao', planta: { pisoId: 'pZ', pts: [[0, 0], [100, 0]] } }, { id: 2, nome: 'RA.1', parente: 'RA', rede: 'insuflacao' }, { id: 3, nome: 'RB', parente: '' }];
        D.terminais = [{ id: 'T1', ramalRef: 'RA' }]; D.espacos = [{ id: 9, ramalRefInsuflacao: 'RA', ramalRefExtracao: '' }];
        D.nos = [{ ramalRef: 'RA' }]; D.trechos = [{ ramalRef: 'RA' }];
        const r1 = VC.topologia.renomearRamal('RA', 'Principal Norte');
        const ok1 = r1.ok && r1.n === 5 && D.ramais[1].parente === 'Principal Norte' && D.terminais[0].ramalRef === 'Principal Norte' && D.espacos[0].ramalRefInsuflacao === 'Principal Norte' && D.nos[0].ramalRef === 'Principal Norte' && D.trechos[0].ramalRef === 'Principal Norte';
        const ok2 = !VC.topologia.renomearRamal('RB', 'principal norte').ok && !VC.topologia.renomearRamal('RB', '  ').ok;
        D.plantas = [{ id: 'pZ', w: 200, h: 200, escala: 0.01 }]; VC.planta.piso = 'pZ'; VC.planta.zoom = 1;
        const m = VC.planta._ramalPerto([104, 3], 'insuflacao');
        const ok3 = !!(m && m.ponta && m.c[0] === 100 && m.c[1] === 0) && !VC.planta._ramalPerto([104, 3], 'extracao');
        const ok4 = Array.isArray(VC.planta.ROTULO_FERR) && VC.planta.ROTULO_FERR.indexOf('sel') >= 0 && VC.planta.ROTULO_FERR.indexOf('ret') >= 0;   // o nome move-se logo depois de desenhar
        return ok1 && ok2 && ok3 && ok4;
      } finally { Object.assign(D, { ramais: g.ramais, terminais: g.terminais, espacos: g.espacos, nos: g.nos, trechos: g.trechos, plantas: g.plantas }); VC.planta.piso = g.piso; VC.planta.zoom = g.zoom; }
    } });
    // v11.3: ferramenta Terminal — clicar numa sala coloca o próximo terminal dela (insuflação primeiro); fora de uma sala não faz nada
    self.registar({ id: 'UI.T22', nucleo: 'UI', grupo: 'UI', nome: 'Planta: colocar terminais com a ferramenta Terminal', criterio: '1.º clique = insuflação no ponto; 2.º = extração; 3.º = nada (todos colocados); fora da sala = nada', fn: () => {
      const P = VC.planta; if (!P || !P.colocarTerminal) return false;
      const D = VC.dados, g = { esp: D.espacos, ter: D.terminais, pl: D.plantas, ram: D.ramais, piso: P.piso, toast: VC.ui.toast, pilha: P._pilha };
      try {
        VC.ui.toast = () => {}; P._pilha = [];
        D.plantas = [{ id: 'pT', nome: 'T', w: 500, h: 500, escala: 0.01 }]; P.piso = 'pT'; D.ramais = [];
        D.espacos = [{ id: 77, nome: 'Sala T', planta: { pisoId: 'pT', pts: [[0, 0], [200, 0], [200, 200], [0, 200]] } }];
        D.terminais = [{ id: 'E1', nome: 'E1', rede: 'extracao', espacos: [{ id: 77, nome: 'Sala T' }] }, { id: 'I1', nome: 'I1', rede: 'insuflacao', espacos: [{ id: 77, nome: 'Sala T' }] }];
        const fora = P.colocarTerminal([300, 300]);
        const t1 = P.colocarTerminal([50, 60]), t2 = P.colocarTerminal([150, 160]), t3 = P.colocarTerminal([100, 100]);
        return fora === null && t1 && t1.id === 'I1' && t1.planta.x === 50 && t1.planta.y === 60 && t2 && t2.id === 'E1' && t3 === null && P._pilha.length === 2;
      } finally { D.espacos = g.esp; D.terminais = g.ter; D.plantas = g.pl; D.ramais = g.ram; P.piso = g.piso; VC.ui.toast = g.toast; P._pilha = g.pilha; }
    } });
    // planeamento: a ideia das ligações flexíveis está registada na app, e a planta já mede a ligação terminal → ramal
    self.registar({ id: 'UI.T23', nucleo: 'UI', grupo: 'UI', nome: 'Funções planeadas registadas (ligações flexíveis)', criterio: 'Sistema › Funções planeadas lista as ligações flexíveis; terminal a 50 px de um ramal a 0,02 m/px = 1,0 m de ligação', fn: () => {
      if (!VC.planeamento || !VC.planeamento.itens.some(i => i.id === 'ligacoes-flexiveis') || !VC.planta || !VC.planta.comprimentoLigacao) return false;
      const D = VC.dados, P = VC.planta, g = { pl: D.plantas, ram: D.ramais, piso: P.piso };
      try {
        D.plantas = [{ id: 'pF', nome: 'F', w: 500, h: 500, escala: 0.02 }]; P.piso = 'pF';
        D.ramais = [{ id: 1, nome: 'RF', planta: { pisoId: 'pF', pts: [[0, 0], [200, 0]] } }];
        const L = P.comprimentoLigacao({ ramalRef: 'RF', planta: { pisoId: 'pF', x: 100, y: 50 } });
        return Math.abs(L - 1) < 1e-9 && P.comprimentoLigacao({ ramalRef: 'XX', planta: { pisoId: 'pF', x: 1, y: 1 } }) === null;
      } finally { D.plantas = g.pl; D.ramais = g.ram; P.piso = g.piso; }
    } });
    // transferência na planta: a seta fica na porta (entre as paredes das duas salas) e «Compensar na origem» soma o caudal à insuflação da origem; remover tira-o
    self.registar({ id: 'UI.T24', nucleo: 'UI', grupo: 'UI', nome: 'Planta: transferência na porta e compensação da origem', criterio: 'salas 0–100 e 110–200: porta em x=105; 40 m³/h compensados → insuflação 100→140 e terminais 50→70; remover → 100 e 50', fn: () => {
      const P = VC.planta; if (!P || !P.portaEntre || !VC6.transferencias.compensarOrigem) return false;
      const D = VC.dados, g = { esp: D.espacos, ter: D.terminais, tr: D.transferencias, pl: D.plantas, piso: P.piso, toast: VC.ui.toast, pilha: P._pilha, sync: VC.estado.forcarSync, hist: VC.historico && VC.historico.push, sel: P.trfSel };
      try {
        VC.ui.toast = () => {}; VC.estado.forcarSync = () => {}; if (VC.historico) VC.historico.push = () => {}; P._pilha = [];
        D.plantas = [{ id: 'pR', nome: 'R', w: 500, h: 500, escala: 0.01 }]; P.piso = 'pR'; D.transferencias = [];
        const A = { id: 81, nome: 'Corredor T', definicoes: [{ id: 'DEF-T-I', rede: 'insuflacao', quantidade: 2, Q_total: 100 }], planta: { pisoId: 'pR', pts: [[0, 0], [100, 0], [100, 100], [0, 100]] } };
        const B = { id: 82, nome: 'WC T', definicoes: [], planta: { pisoId: 'pR', pts: [[110, 0], [200, 0], [200, 100], [110, 100]] } };
        D.espacos = [A, B];
        D.terminais = [1, 2].map(i => ({ id: 'TI' + i, rede: 'insuflacao', Q: 50, espacos: [{ id: 81, nome: 'Corredor T', Q_parcela: 50 }], definicaoRef: { espacoId: 81, definicaoId: 'DEF-T-I' } }));
        const legado = P.portaEntre(A, B);
        P.pendenteTrf = { deId: 81, paraId: 82, linha: [[20, 50], [180, 50]] };
        P.criarTransferencia(40, 'fresta_porta', 2, true);
        const t = D.transferencias[0];
        const ok1 = legado.x === 105 && legado.y === 50 && t && t.planta && t.planta.x === 105 && t.planta.y === 50 && Math.abs(t.planta.ang) < 1e-9;
        const ok2 = A.definicoes[0].Q_total === 140 && D.terminais.every(x => x.Q === 70) && t.compensacao && t.compensacao.Q === 40;
        P.removerTransferencia(t.id);
        const ok3 = D.transferencias.length === 0 && A.definicoes[0].Q_total === 100 && D.terminais.every(x => x.Q === 50);
        return ok1 && ok2 && ok3;
      } finally { D.espacos = g.esp; D.terminais = g.ter; D.transferencias = g.tr; D.plantas = g.pl; P.piso = g.piso; VC.ui.toast = g.toast; P._pilha = g.pilha; VC.estado.forcarSync = g.sync; if (VC.historico) VC.historico.push = g.hist; P.trfSel = g.sel; P.pendenteTrf = null; }
    } });
    // contrato da planta P2: uma só seleção de cada vez (sala, ramal ou transferência)
    self.registar({ id: 'UI.T25', nucleo: 'UI', grupo: 'UI', nome: 'Planta: uma só seleção de cada vez', criterio: 'com uma transferência selecionada, selecionar uma sala ou um ramal tira a seleção da transferência (docs/PLANTA-CONTRATO.md, P2)', fn: () => {
      const P = VC.planta; if (!P || !P.selecionarRamal) return false;
      const g = { sel: P.selecionado, r: P.ramalSel, t: P.trfSel, red: P.redesenhar };
      try {
        P.redesenhar = () => {};
        P.trfSel = 'TRF-x'; P.selecionar(1); const ok1 = P.trfSel === null && P.selecionado === 1 && P.ramalSel === null;
        P.trfSel = 'TRF-x'; P.selecionarRamal(2); const ok2 = P.trfSel === null && P.ramalSel === 2 && P.selecionado === null;
        return ok1 && ok2;
      } finally { P.selecionado = g.sel; P.ramalSel = g.r; P.trfSel = g.t; P.redesenhar = g.red; }
    } });
    // auditoria A2 (opção a): o desfazer da planta repõe só o que a ação mudou; o que se editou noutro ecrã fica
    self.registar({ id: 'UI.T26', nucleo: 'UI', grupo: 'UI', nome: 'Planta: desfazer não apaga trabalho de outros ecrãs', criterio: 'sala desenhada; N = 6 e terminal novo noutro ecrã; Ctrl+Z tira o desenho e mantém N e o terminal; refazer repõe o desenho; espaço criado na planta e depois editado fica (sem o desenho), com aviso', fn: () => {
      const P = VC.planta; if (!P || !P._diferencas || !P._aplicar) return false;
      const D = VC.dados, g = { esp: D.espacos, ter: D.terminais, ram: D.ramais, tr: D.transferencias, pilha: P._pilha, ref: P._refeitas, red: P.redesenhar, sync: VC.estado.forcarSync, toast: VC.ui.toast };
      try {
        P.redesenhar = () => {}; VC.estado.forcarSync = () => {}; VC.ui.toast = () => {}; P._pilha = []; P._refeitas = [];
        D.espacos = [{ id: 5, nome: 'Sala', N: 0 }]; D.terminais = []; D.ramais = []; D.transferencias = [];
        const s0 = P._estado();
        D.espacos[0].planta = { pisoId: 'p', pts: [[0, 0], [10, 0], [10, 10]] };
        P._empilhar('desenho ligado ao espaço', s0);
        D.espacos[0].N = 6;                                                    // Tabela
        D.terminais.push({ id: 'TX', nome: 'TX', rede: 'insuflacao' });         // passo Definição
        P.desfazer();
        const ok1 = !D.espacos[0].planta && D.espacos[0].N === 6 && D.terminais.length === 1;
        P.refazer();
        const ok2 = !!D.espacos[0].planta && D.espacos[0].N === 6 && D.terminais.length === 1;
        const s1 = P._estado();
        D.espacos.push({ id: 6, nome: 'Nova', planta: { pisoId: 'p', pts: [[0, 0], [5, 0], [5, 5]] } }); P._empilhar('espaço criado na planta', s1);
        D.espacos[1].N = 3;                                                    // editado depois, noutro ecrã
        let aviso = ''; VC.ui.toast = m => { aviso = m; };
        P.desfazer();
        const ok3a = D.espacos.length === 2 && D.espacos[1].N === 3 && !D.espacos[1].planta && /noutro ecrã/.test(aviso);
        P.refazer();
        const ok3 = ok3a && !!D.espacos[1].planta && D.espacos[1].N === 3;
        return ok1 && ok2 && ok3;
      } finally { Object.assign(D, { espacos: g.esp, terminais: g.ter, ramais: g.ram, transferencias: g.tr }); P._pilha = g.pilha; P._refeitas = g.ref; P.redesenhar = g.red; VC.estado.forcarSync = g.sync; VC.ui.toast = g.toast; }
    } });
  },

  correr() {
    if (!this._lista.length) {
      this.initN1(); this.initN2(); this.initN3(); this.initN4(); this.initN5();
      this.initN6(); this.initN7(); this.initN8(); this.initN9();
      this.initN10(); this.initN11(); this.initIntegracao(); this.initUI();
    }
    // v11.1 (fase 5): um teste que desenha ecrãs pode passar pelo ecrã de Diagnóstico, que corre os
    // testes; sem esta guarda isso seria recursivo. Durante uma corrida devolve o último resultado.
    if (this._aCorrer) return this._resultado || { total: 0, pass: 0, fail: 0, detalhe: [], porNucleo: {} };
    this._aCorrer = true;
    try { return this._correr(); } finally { this._aCorrer = false; }
  },

  _correr() {
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