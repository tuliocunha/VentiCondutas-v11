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
    const p138OK = espacosSemQNormas === 0 && espacosComStatusErro === 0;
    let p138Resultado = (VC.dados.espacos || []).length + ' espaços · ' +
      (espacosSemQNormas > 0 ? espacosSemQNormas + ' sem caudal mínimo' : 'todos com caudal');
    if (espacosComStatusErro > 0) p138Resultado += ' · ' + espacosComStatusErro + ' em não conformidade';
    out.push({ norma: 'Portaria 138-I/2021', item: 'Caudais mínimos P138 (T11/T12/T13)', resultado: p138Resultado, estado: p138OK ? 'CONFORME' : 'NÃO CONFORME' });

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

    const ciclos = VC6.balanco ? VC6.balanco.detetarCiclos() : [];
    out.push({ norma: 'Balanço de massa · P1', item: 'Σ Q_in = Σ Q_out (±5 m³/h)', resultado: ciclos.length > 0 ? ciclos.length + ' ciclo(s) detetado(s)' : 'Sem ciclos · OK', estado: ciclos.length > 0 ? 'NÃO CONFORME' : 'CONFORME' });

    const velocidadesOK = (VC.dados.ramais || []).every(r => (Number(r.v) || 0) <= VC.calculo.vMaxDe(r) + 1e-6);   // o mesmo limite por nível do dimensionamento (VMAX_NIVEL)
    out.push({ norma: 'VDI 2081:2018', item: 'Velocidade máxima', resultado: velocidadesOK ? 'Todas dentro do limite' : 'Existem ramais acima do limite', estado: velocidadesOK ? 'CONFORME' : 'ATENÇÃO' });

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