/* ============================================================
   VENTICONDUTAS · 04a-normativa
   § Normativa UI · verificações legais (P138, EN 16798-3, DL 101-D,
     balanço, VDI 2081, EN 12599) + verificações de referência (QAI, etc.)

   ALTERAÇÕES:
   - V9.1.2 · SFPint dinâmico + INFORMATIVO em DL 101-D
   - V8.0.1 · QAI_projeto auditável
   DEPENDE DE: 01-fundamentos + 02-biblioteca + 03-dimensionamento
   ============================================================ */
(function () {
'use strict';
const VC = window.VC;
window.VC6 = window.VC6 || {};
const VC6 = window.VC6;
VC._boot.partes.push('04a-normativa');

VC.normativaUI = {
  verificacoesLegais(x) {
    if (!x) x = VC.calculo.calcularTudo();
    const out = [];
    const sfpInt = x.sfpInt || 0;
    const sfpClasse = x.sfpClass && x.sfpClass.classe != null ? x.sfpClass.classe : '—';
    const espacosSemQNormas = (VC.dados.espacos || []).filter(e => {
      const c = VC.calculo.calcularQEspaco(e);
      return c.g !== 2 && (Number(c.Q_normas) || 0) <= 0;
    }).length;
    const espacosComStatusErro = (VC.dados.espacos || []).filter(e => e.status === 'NÃO CONF.').length;
    // Fase 2: o caudal que os terminais servem tem de chegar ao mínimo legal (Q_normas: T11/T12 em G1 e G3 pela insuflação, T13 em G4 pela extração)
    let abaixoMinimo = 0, semTerminais = 0;
    (VC.dados.espacos || []).forEach(e => {
      const c = VC.calculo.calcularQEspaco(e); if (c.g === 2 || !(Number(c.Q_normas) > 0)) return;
      const rede = c.tipoCaudal === 'EXTRACAO' ? 'extracao' : 'insuflacao';
      const n = VC.calculo.terminaisQueServem(e.nome).filter(t => VC.calculo._redeBase(t) === rede).length;
      if (!n) { semTerminais++; return; }
      if (VC.calculo.QservidoAoEspaco(e.nome, rede) + VC.constantes.MINIMO_LEGAL_ARREDONDAMENTO < Number(c.Q_normas)) abaixoMinimo++;
    });
    const p138OK = espacosSemQNormas === 0 && espacosComStatusErro === 0 && abaixoMinimo === 0;
    let p138Resultado = (VC.dados.espacos || []).length + ' espaços · ' +
      (espacosSemQNormas > 0 ? espacosSemQNormas + ' sem caudal mínimo' : 'todos com caudal');
    if (espacosComStatusErro > 0) p138Resultado += ' · ' + espacosComStatusErro + ' em não conformidade';
    if (abaixoMinimo > 0) p138Resultado += ' · ' + abaixoMinimo + ' com terminais abaixo do mínimo legal';
    if (semTerminais > 0) p138Resultado += ' · ' + semTerminais + ' ainda sem terminais';
    out.push({ norma: 'Portaria 138-I/2021', item: 'Caudais mínimos P138 (T11/T12/T13) servidos pelos terminais', resultado: p138Resultado, estado: p138OK ? (semTerminais ? 'ATENÇÃO' : 'CONFORME') : 'NÃO CONFORME' });

    // v11.1: cada UTA tem o seu limite (tipo de unidade e caudal); mostra-se a mais desfavorável.
    const sc = x.sfpClass || {};
    const sfpConforme = typeof sc.conforme === 'boolean' ? sc.conforme : true;
    const sfpLim = sc.limite != null ? sc.limite + ' W/(m³/s)' : 'sem limite';
    out.push({
      norma: 'Reg. (UE) 1253/2014 (Ecodesign)',
      item: 'SFPint de cada UTA ≤ limite do seu tipo',
      resultado: (sc.uta ? VC.utils.esc(sc.uta) + ' (mais desfavorável): ' : '') + VC.utils.fmt(sc.sfpInt != null ? sc.sfpInt : sfpInt, 0) + ' W/(m³/s) · limite ' + sfpLim + ' · Classe ' + sfpClasse,
      estado: sfpConforme ? 'CONFORME' : 'NÃO CONFORME'
    });

    const potencia = x.power || 0;
    const dl = VC.normas.dl101D(potencia);
    out.push({
      norma: 'DL 101-D/2020 · NT-SCE-03',
      item: 'Gestão técnica: SGT (≥ 100 kW) / SGTC (≥ 290 kW)',
      resultado: dl.nivelGestao
        ? dl.descricao + ' · P = ' + VC.utils.fmt(potencia, 0) + ' W · verificar implementação no projeto'
        : 'Não aplicável (P = ' + VC.utils.fmt(potencia, 0) + ' W)',
      estado: dl.nivelGestao ? 'INFORMATIVO' : 'CONFORME'
    });

    // Fase 2: o balanço de massa vê os resíduos de cada espaço (antes só via os ciclos de transferências)
    const ciclos = VC6.balanco ? VC6.balanco.detetarCiclos() : [];
    const bal = (VC6.balanco && VC6.balanco.propagar) ? VC6.balanco.propagar() : [];
    const graves = bal.filter(b => b.estado === 'DESEQUILIBRIO_GRAVE'), leves = bal.filter(b => b.estado === 'DESEQUILIBRIO_LEVE');
    const tol = (VC6.balanco && VC6.balanco.TOLERANCIA) || 5;
    const partesBal = [];
    if (graves.length) partesBal.push(graves.length + ' espaço(s) com |resíduo| > ' + (2 * tol) + ' m³/h (ex.: ' + graves.slice(0, 3).map(b => VC.utils.esc(b.nome) + ' ' + VC.utils.fmt(b.residuo, 0)).join(', ') + ')');
    if (leves.length) partesBal.push(leves.length + ' espaço(s) entre ' + tol + ' e ' + (2 * tol) + ' m³/h');
    if (ciclos.length) partesBal.push(ciclos.length + ' ciclo(s) de transferências');
    out.push({ norma: 'Balanço de massa · P1', item: 'Σ Q_in = Σ Q_out (±' + tol + ' m³/h) em cada espaço', resultado: partesBal.length ? partesBal.join(' · ') : bal.length + ' espaços equilibrados · sem ciclos', estado: (graves.length || ciclos.length) ? 'NÃO CONFORME' : (leves.length ? 'ATENÇÃO' : 'CONFORME') });

    const velocidadesOK = (VC.dados.ramais || []).every(r => Math.max(Number(r.v) || 0, Number(r.vMaxTrocos) || 0) <= VC.calculo.vMaxDe(r) + 1e-6);   // o mesmo limite por nível do dimensionamento (VMAX_NIVEL)
    out.push({ norma: 'VDI 2081:2018', item: 'Velocidade máxima', resultado: velocidadesOK ? 'Todas dentro do limite' : 'Existem ramais acima do limite', estado: velocidadesOK ? 'CONFORME' : 'NÃO CONFORME' });   // o cálculo dá ERRO «Velocidade excessiva»: a mesma gravidade

    const espacosSemReq = (VC.dados.espacos || []).filter(e => !(e.definicoes || []).length).length;
    out.push({ norma: 'EN 12599:2012', item: 'Definição de terminais por espaço', resultado: espacosSemReq === 0 ? 'Todos os espaços têm definições' : espacosSemReq + ' espaço(s) sem definições', estado: espacosSemReq === 0 ? 'CONFORME' : 'ATENÇÃO' });

    const comQAI = (VC.dados.espacos || []).filter(e => (Number(e.QAI_projeto) || 0) > 0);
    if (comQAI.length > 0) {
      const semMotivo = comQAI.filter(e => !e.QAI_projeto_motivo || !String(e.QAI_projeto_motivo).trim()).length;
      const qaiTotal = comQAI.reduce((s, e) => s + (Number(e.QAI_projeto) || 0), 0);
      out.push({
        norma: 'Boas práticas · P7',
        item: 'QAI_projeto com motivo auditável',
        resultado: comQAI.length + ' espaço(s) · ' + VC.utils.fmt(qaiTotal, 0) + ' m³/h' + (semMotivo > 0 ? ' · ⚠️ ' + semMotivo + ' sem motivo' : ' · todos com motivo'),
        estado: semMotivo > 0 ? 'ATENÇÃO' : 'CONFORME'
      });
    }
    return out;
  },

  verificacoesReferencia(x) {
    if (!x) x = VC.calculo.calcularTudo();
    const out = [];
    out.push({ norma: 'EN 16798-1:2019', item: 'QAI — referência informativa', resultado: (VC.dados.espacos || []).length + ' espaços classificados G1-G4', estado: 'referência' });
    out.push({ norma: 'ISO 16890:2016', item: 'Filtragem de ar (G4 + F7)', resultado: (VC.dados.utas || []).length + ' UTA(s) com filtros configurados', estado: 'referência' });
    out.push({ norma: 'ASHRAE 55:2020', item: 'Conforto térmico · estratificação (F-RPH)', resultado: (VC.dados.espacos || []).filter(e => (Number(e.Q_ConTerm) || 0) > 0).length + ' espaço(s) com RPH', estado: 'referência' });
    const nQAI = (VC.dados.espacos || []).filter(e => (Number(e.QAI_projeto) || 0) > 0).length;
    if (nQAI > 0) {
      out.push({ norma: 'Boas práticas · QAI_projeto', item: 'Caudal definido pelo engenheiro', resultado: nQAI + ' espaço(s) com QAI aplicado', estado: 'referência' });
    }
    out.push({ norma: 'ISO 2533:1975', item: 'Atmosfera padrão ISA', resultado: 'ρ = ' + VC.utils.fmt(x.rho || 0, 4) + ' kg/m³ · ν = ' + VC.utils.fmtCientifico(x.nu || 0, 3), estado: 'referência' });
    return out;
  }
};

})();