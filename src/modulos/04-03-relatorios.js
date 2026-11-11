/* ============================================================
   VENTCONDUTAS V11.0.0 · 04c-relatorios
   §22 Relatórios (15) + VC.modoRelatorios + VC.listaRelatorios
   Inclui F-RPH, QAI, BOM, TAB, balanço, pressões, rede, caderno, diagnóstico.
   DEPENDE DE: 01 + 02 + 03 + 04a + 04b
   ============================================================ */
(function () {
'use strict';
const VC = window.VC;
window.VC6 = window.VC6 || {};
const VC6 = window.VC6;
VC._boot.partes.push('04c-relatorios');

VC.relatorios = {
  cabecalho(titulo, subtitulo) {
    const md = VC.dados.metadados || {};
    return '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:18px;padding:4px 0 10px;border-bottom:2px solid var(--primario);margin-bottom:14px">' +
      '<div><div style="font-size:9.5px;font-weight:900;letter-spacing:.9px;text-transform:uppercase;color:var(--texto-suave)">Relatório Técnico · ' + VC.versao + ' · Portugal</div>' +
      '<h2 style="font-size:17px;font-weight:900;color:var(--texto);margin:4px 0 2px;letter-spacing:-.3px">' + titulo + '</h2>' +
      '<div style="font-size:11.5px;color:var(--texto-med)">' + (subtitulo || '') + '</div></div>' +
      '<div style="font-size:10.5px;color:var(--texto-med);text-align:right;max-width:260px;line-height:1.5">' +
      '<b style="color:var(--texto);font-size:12px">' + VC.utils.esc(md.nome || '—') + '</b><br>' +
      (md.local ? 'Local: ' + VC.utils.esc(md.local) + '<br>' : '') +
      'Revisão: ' + VC.utils.esc(md.revisao || '01') +
      '</div></div>';
  },
  rodape() {
    return '<div style="display:flex;justify-content:space-between;gap:10px;border-top:1px solid var(--borda);margin-top:14px;padding-top:6px;font-size:9.5px;color:var(--texto-suave)">' +
      '<span>' + VC.versao + ' · ' + new Date().toISOString().slice(0, 10) + '</span>' +
      '<span>Portaria 138-I/2021 · DL 101-D/2020 · EN 16798 · Balanço de ar · F-RPH · QAI_projeto</span></div>';
  },
  secao(numero, titulo) {
    return '<h3 style="font-size:12.5px;color:var(--texto);border-bottom:1px solid var(--borda);padding:8px 0 5px;margin:12px 0 8px;display:flex;gap:8px;align-items:center"><span style="font-size:10.5px;color:var(--primario);font-weight:900">' + numero + '</span>' + titulo + '</h3>';
  },
  kpis(items) { return VC.ui_comp.kpiGrid(items, 4); },
  tabela(headers, linhas) {
    return '<div style="overflow:auto;border:1px solid var(--borda);border-radius:var(--raio-2);margin:8px 0"><table style="width:100%;border-collapse:collapse;font-size:10.5px;table-layout:auto">' +
      '<thead><tr style="background:var(--superf3)">' + headers.map(h => '<th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--borda-media);font-size:9.5px;text-transform:uppercase;color:var(--texto-med);font-weight:800;white-space:nowrap">' + h + '</th>').join('') + '</tr></thead>' +
      '<tbody>' + linhas.map(l => '<tr>' + l.map(c => '<td style="padding:5px 8px;border-bottom:1px solid var(--borda);vertical-align:top">' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
  },
  callout(texto, tipo) { return VC.ui_comp.callout(texto, tipo); }
};

const R = VC.relatorios;

R.geral = function () {
 const x = VC.calculo.calcularTudo();
 const nComConf = (VC.dados.espacos || []).filter(e => (Number(e.Q_ConTerm) || 0) > 0).length;
 const somaConforto = (VC.dados.espacos || []).reduce((s, e) => s + (Number(e.Q_ConTerm) || 0), 0);
 const comQAI = (VC.dados.espacos || []).filter(e => (Number(e.QAI_projeto) || 0) > 0);
 const nComQAI = comQAI.length;
 const somaQAI = comQAI.reduce((s, e) => s + (Number(e.QAI_projeto) || 0), 0);

 let h = R.cabecalho('Relatório Técnico Geral', 'Resumo executivo · bottom-up + balanço + F-RPH + QAI_projeto');
 h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;margin-bottom:16px">';
 h += '<div>';
 h += R.secao('1', 'Desempenho Global');
 h += R.kpis([
   { l: 'Insuflação', v: VC.utils.fmt(x.ins, 0) + ' m³/h', u: '', cor: 'primario' },
   { l: 'Extração', v: VC.utils.fmt(x.ext, 0) + ' m³/h', u: '', cor: 'primario' },
   { l: 'Balanço', v: (x.bal >= 0 ? '+' : '') + VC.utils.fmt(x.bal, 0) + ' m³/h', u: '', cor: 'verde' },
   { l: 'Perda crítica', v: VC.utils.fmt(x.maxPerda, 0) + ' Pa', u: '', cor: 'ambar' }
 ]);
 h += '<div style="height:8px"></div>';
 h += R.kpis([
   { l: 'SFPint', v: VC.utils.fmt(x.sfpInt, 0), u: 'W/(m³/s)', cor: 'violeta' },
   { l: 'Potência', v: VC.utils.fmt(x.power, 0) + ' W', u: '', cor: 'ambar' },
   { l: 'Espaços', v: VC.dados.espacos.length, u: '', cor: 'primario' },
   { l: 'Estado', v: x.overall, u: '', cor: x.overall === 'CONFORME' ? 'verde' : (x.overall === 'ATENÇÃO' ? 'ambar' : 'coral') }
 ]);
 h += '</div>';
 h += '<div>';
 h += R.secao('2', 'Balanço global de caudal');
 h += VC.graficos.barrasVerticais(['Insuflação', 'Extração'], [{ nome: 'Q (m³/h)', cor: VC.cores.grafico[0], valores: [{ label: 'Ins', valor: x.ins }, { label: 'Ext', valor: x.ext }] }], { titulo: '', width: 450, height: 210, yMax: Math.max(x.ins, x.ext) * 1.15 });
 h += '</div>';
 h += '</div>';

 if (nComConf > 0 || nComQAI > 0) {
   h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;margin-bottom:16px">';
   if (nComConf > 0) {
     h += '<div>';
     h += R.secao('3', 'F-RPH · Conforto térmico');
     h += R.kpis([{ l: 'Espaços', v: nComConf, cor: 'primario' }, { l: 'Σ Q_ConTerm', v: VC.utils.fmt(somaConforto, 0) + ' m³/h', cor: 'primario' }]);
     const comConf = (VC.dados.espacos || []).filter(e => (Number(e.Q_ConTerm) || 0) > 0);
     h += R.tabela(['Espaço', 'H (m)', 'RPH (h⁻¹)', 'Q_ConTerm'],
       comConf.map(e => [VC.utils.esc(e.nome).substring(0,20), VC.utils.fmt(e.H, 1), VC.utils.fmt(e.rphAplicado, 1), VC.utils.fmt(e.Q_ConTerm, 0) + ' m³/h'])
     );
     h += '</div>';
   } else { h += '<div></div>'; }
   if (nComQAI > 0) {
     h += '<div>';
     h += R.secao('4', 'QAI_projeto (Engenheiro)');
     h += R.kpis([{ l: 'Espaços', v: nComQAI, cor: 'primario' }, { l: 'Σ QAI', v: VC.utils.fmt(somaQAI, 0) + ' m³/h', cor: 'primario' }]);
     h += R.tabela(['Espaço', 'QAI', 'Rede', 'Origem'],
       comQAI.map(e => [VC.utils.esc(e.nome).substring(0,20), VC.utils.fmt(e.QAI_projeto, 0) + ' m³/h', VC.utils.esc(e.QAI_rede || 'auto'), e.QAI_projeto_origem === 'utilizador' ? 'Engenheiro' : 'Norma'])
     );
     h += '</div>';
   } else { h += '<div></div>'; }
   h += '</div>';
 }

 h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start">';
 h += '<div>';
 const top10 = x.ramais.slice().sort((a, b) => (b.deltaPtotal || 0) - (a.deltaPtotal || 0)).slice(0, 10);
 if (top10.length) {
   h += R.secao('5', 'Top-10 perda de carga');
   h += VC.graficos.barrasHorizontais(top10.map(r => ({ nome: r.nome, valor: r.deltaPtotal || 0, cor: (r.deltaPtotal > 300 ? VC.cores.porEstado('erro') : (r.deltaPtotal > 200 ? VC.cores.porEstado('atencao') : VC.cores.porEstado('ok'))) })), { titulo: 'Δp total (Pa)', unidade: 'Pa', decimais: 0, width: 450, labelW: 140 });
 }
 h += '</div>';
 h += '<div>';
 h += R.secao('6', 'Estado Global e Findings');
 h += R.tabela(['Indicador', 'Valor'], [['Espaços Totais', VC.dados.espacos.length], ['Terminais', VC.dados.terminais.length], ['Ramais', VC.dados.ramais.length], ['Transferências', (VC.dados.transferencias || []).length], ['UTAs', VC.dados.utas.length]]);
 if ((x.findings || []).length) h += R.tabela(['Sev.', 'Elemento', 'Mensagem'], x.findings.map(f => [f.severidade, VC.utils.esc(String(f.elemento || '—').substring(0,15)), VC.utils.esc(f.msg)]));
 else h += R.callout('Sem não conformidades.', 'ok');
 h += '</div>';
 h += '</div>';
 return h + R.rodape();
};

R.dimensionamento = function () {
 const x = VC.calculo.calcularTudo();
 let h = R.cabecalho('Dimensionamento da Rede', 'Caudais · secções · velocidades · perdas hierarquizadas');
 h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;margin-bottom:16px">';
 h += '<div>';
 h += R.secao('1', 'Métricas Globais');
 h += R.kpis([
   { l: 'Ramais', v: x.ramais.length, cor: 'primario' },
   { l: 'Perda crítica', v: VC.utils.fmt(x.maxPerda, 0) + ' Pa', cor: 'ambar' },
   { l: 'Caminho crítico', v: x.critical ? x.critical.nome.substring(0, 20) : '—', cor: 'coral' },
   { l: 'Comp. total', v: VC.utils.fmt(VC.dados.ramais.reduce((s, r) => s + (Number(r.L) || 0), 0), 0) + ' m', cor: 'verde' }
 ]);
 h += '</div>';
 h += '<div>';
 if (x.ramais.length) {
   h += R.secao('2', 'Perda de Carga por Ramal (Pa)');
   const coresNivel = { 1: '#4f6d8c', 2: '#6d8fb0', 3: '#a7c0d6', 4: '#d6e3ef' };
   h += VC.graficos.barrasHorizontais(x.ramais.slice(0, 15).map(r => { const nivel = r.nivelNumero || 2; return { nome: r.nome, valor: r.deltaPtotal || 0, cor: coresNivel[nivel] || '#6d8fb0' }; }), { titulo: '', unidade: 'Pa', decimais: 0, width: 450, labelW: 140, linhaAlt: 22 });
 }
 h += '</div>';
 h += '</div>';
 h += R.secao('3', 'Tabela Detalhada de Ramais');
 h += R.tabela(['Ramal', 'Nível', 'Rede', 'Q (m³/h)', 'L (m)', 'Ø (mm)', 'v (m/s)', 'Re', 'Δp (Pa)'], x.ramais.map(r => {
   const nivel = r.nivelNumero || 2;
   const badgeCor = ['#4f6d8c','#6d8fb0','#a7c0d6','#d6e3ef'][nivel-1] || '#6d8fb0';
   const txtCor = nivel === 4 ? '#2c3e50' : '#ffffff';
   const badgeHtml = `<span style="background:${badgeCor}; color:${txtCor}; padding:3px 6px; border-radius:4px; font-size:9px; font-weight:900">R${nivel}</span>`;
   return [VC.utils.esc(r.nome), badgeHtml, VC.utils.esc(r.rede), VC.utils.fmt(r.Q, 0), VC.utils.fmt(r.L, 1), r.Dcom || '—', VC.utils.fmt(r.v, 2), VC.utils.fmt(r.Re, 0), `<b>${VC.utils.fmt(r.deltaPtotal, 1)}</b>`];
 }));
 return h + R.rodape();
};

R.requisitos = function () {
  let h = R.cabecalho('Definições por Espaço', 'Cobertura Q_definido vs. Q_total (inclui QAI)');
  const cob = VC.requisitos.coberturaGlobal();
  h += R.kpis([{ l: 'Q_normas total', v: VC.utils.fmt(cob.totalNec, 0) + ' m³/h', cor: 'primario' }, { l: 'Q definida', v: VC.utils.fmt(cob.totalCob, 0) + ' m³/h', cor: 'primario' }, { l: 'Cobertura', v: Math.round(cob.cobertura * 100) + '%', cor: cob.cobertura >= 0.95 && cob.cobertura <= 1.05 ? 'verde' : 'ambar' }, { l: 'Espaços OK', v: cob.ok + ' / ' + cob.totalEspacos, cor: 'verde' }]);
  h += R.secao('1', 'Detalhe');
  // v11.1: comparação com a EN 16798-1 na categoria escolhida no Setup (informativo; o projeto segue a Portaria 138-I)
  const cat = (VC.dados.params && VC.dados.params.categoria) || 'II';
  const qEN = nome => { const e = VC.dados.espacos.find(x => x.nome === nome); return e ? (VC.calculo.calcularQ_normas(e).Q_EN16798 || 0) : 0; };
  const abaixoEN = cob.detalhe.filter(v => (v.Q_nec || 0) + 0.5 < qEN(v.espacoNome)).length;
  h += R.callout('Comparação EN 16798-1 · Categoria ' + cat + ': ' + abaixoEN + ' de ' + cob.detalhe.length + ' espaços têm Q_total abaixo do caudal EN (▲). Informativo — o caudal de projeto segue a Portaria 138-I/2021.', abaixoEN ? 'atencao' : 'info');
  h += R.tabela(['Espaço', 'Nº def.', 'Σ Q_def', 'Q_normas', 'Q_ConTerm', 'QAI', 'Q_total', 'Q EN 16798 (Cat ' + cat + ')', 'Estado'], cob.detalhe.map(v => { const en = qEN(v.espacoNome); return [VC.utils.esc(v.espacoNome), v.nRequisitos, VC.utils.fmt(v.somaQ, 0), VC.utils.fmt(v.Q_reg || 0, 0), VC.utils.fmt(v.Q_conforto || 0, 0), VC.utils.fmt(v.QAI || 0, 0), VC.utils.fmt(v.Q_nec, 0), VC.utils.fmt(en, 0) + ((v.Q_nec || 0) + 0.5 < en ? ' ▲' : ''), v.estado]; }));
  return h + R.rodape();
};

R.associacao = function () {
  let h = R.cabecalho('Associação Terminais ↔ Ramais', 'Derivada dos terminais');
  h += R.secao('1', 'Ramais e terminais');
  h += R.tabela(['Ramal', 'Nível', 'Rede', 'Q derivado', 'N terminais', 'N espaços'], VC.dados.ramais.map(r => { const nTerm = VC.dados.terminais.filter(t => t.ramalRef === r.nome).length; const espacos = VC.calculo.espacosServidosPorRamal(r.nome); return [VC.utils.esc(r.nome), 'R' + (r.nivelNumero || 2), VC.utils.esc(r.rede), VC.utils.fmt(r.Q, 0), nTerm, espacos.length]; }));
  return h + R.rodape();
};

R.arvore = function () {  
 let h = R.cabecalho('Árvore de Condutas e Hierarquia', 'Hierarquia visual UTA → Ramais → Espaços');  
   
 // v11.1: removido o ramo que dependia de VC6.redeCondutas (módulo que não existe).
 const ramais = VC.dados.ramais || [];  
 const porNome = {};  
 ramais.forEach(r => { porNome[r.nome] = r; });  
 const raizes = ramais.filter(r => !r.parente || !porNome[r.parente]);  
 h += R.secao('1', 'Árvore');
  let arv = '<div style="font-family:ui-monospace,monospace;font-size:11px;line-height:1.7;background:var(--superf2);padding:12px;border-radius:6px;border:1px solid var(--borda)">';
  const visitar = (lista, prefixo) => {
    lista.forEach((r, i) => {
      const ultimo = i === lista.length - 1;
      const ramo = ultimo ? '└─ ' : '├─ ';
      const filhos = ramais.filter(x => x.parente === r.nome);
      arv += prefixo + ramo + '<b>' + VC.utils.esc(r.nome) + '</b> <span style="color:var(--texto-suave)">[R' + (r.nivelNumero || 2) + '] Ø' + (r.Dcom || '—') + ' · Q' + VC.utils.fmt(r.Q, 0) + '</span><br>';
      visitar(filhos, prefixo + (ultimo ? '   ' : '│  '));
    });
  };
  visitar(raizes, '');
  arv += '</div>';
  h += arv;
  return h + R.rodape();
};

R.ventilador = function () {
  let h = R.cabecalho('Dimensionamento de Ventiladores', 'Q · Δp · SFPint · P motor');
  h += R.tabela(['UTA', 'Rede', 'Q derivado', 'Δp externo', 'Δp interno', 'SFPint', 'P motor'], VC.dados.utas.map(u => [VC.utils.esc(u.nome), VC.utils.esc(u.rede), VC.utils.fmt(u.Q * 3600, 0) + ' m³/h', VC.utils.fmt(u.dpExt, 0) + ' Pa', VC.utils.fmt(u.dpInt, 0) + ' Pa', VC.utils.fmt(u.sfpInt, 0), VC.utils.fmt(u.P_motor, 0) + ' W']));
  return h + R.rodape();
};

R.conformidade = function () {
  const x = VC.calculo.calcularTudo();
  let h = R.cabecalho('Conformidade Normativa', 'Verificações legais');
  h += R.tabela(['Norma', 'Item', 'Resultado', 'Estado'], VC.normativaUI.verificacoesLegais(x).map(v => [VC.utils.esc(v.norma), VC.utils.esc(v.item), VC.utils.esc(v.resultado), VC.utils.esc(v.estado)]));
  return h + R.rodape();
};

R.balanco = function () {  
 let h = R.cabecalho('Balanço de Massas e Caudais', 'Análise integrada de conservação de caudal por compartimento (Portaria 138-I)');  
 const resumo = VC6.balanco.resumo();  
 h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">';  
 h += '<div style="background:var(--superf2);border:1px solid var(--borda);border-left:4px solid var(--primario);border-radius:6px;padding:10px 14px"><div style="font-size:9.5px;font-weight:800;color:var(--texto-suave);text-transform:uppercase">Total Espaços</div><div style="font-size:18px;font-weight:900;color:var(--texto);margin-top:2px">' + resumo.total + '</div></div>';  
 h += '<div style="background:var(--verde-soft);border:1px solid var(--verde-borda);border-left:4px solid var(--verde);border-radius:6px;padding:10px 14px"><div style="font-size:9.5px;font-weight:800;color:var(--verde-esc);text-transform:uppercase">Equilibrados (OK)</div><div style="font-size:18px;font-weight:900;color:var(--verde-esc);margin-top:2px">' + resumo.ok + '</div></div>';  
 h += '<div style="background:var(--ambar-soft);border:1px solid var(--ambar-borda);border-left:4px solid var(--ambar);border-radius:6px;padding:10px 14px"><div style="font-size:9.5px;font-weight:800;color:var(--ambar-esc);text-transform:uppercase">Deseq. Leve</div><div style="font-size:18px;font-weight:900;color:var(--ambar-esc);margin-top:2px">' + resumo.leve + '</div></div>';  
 h += '<div style="background:var(--coral-soft);border:1px solid var(--coral-borda);border-left:4px solid var(--coral);border-radius:6px;padding:10px 14px"><div style="font-size:9.5px;font-weight:800;color:var(--coral-esc);text-transform:uppercase">Deseq. Grave</div><div style="font-size:18px;font-weight:900;color:var(--coral-esc);margin-top:2px">' + resumo.grave + '</div></div>';  
 h += '</div>';
 if (resumo.comConforto > 0 || resumo.comQAI > 0) {
   let extra = '';
   if (resumo.comConforto > 0) extra += '<b>F-RPH</b> · ' + resumo.comConforto + ' espaço(s) com conforto ativo. ';
   if (resumo.comQAI > 0) extra += '<b>QAI_projeto</b> · ' + resumo.comQAI + ' espaço(s) com caudal definido pelo engenheiro (Σ ' + VC.utils.fmt(resumo.QAI_total, 0) + ' m³/h). ';
   extra += 'O Q_ConTerm e o QAI entram na insuflação (G1-G3) ou extração (G4).';
   h += R.callout(extra, 'info');
 }
 const balancos = VC6.balanco.todos();
  if (balancos.length) {
   h += R.secao('1', 'Balanço por espaço');
   h += '<div style="background:var(--superf2);border:1px solid var(--borda);border-radius:6px;padding:14px;margin-bottom:14px">';
   h += '<div style="font-size:11px;font-weight:800;color:var(--primario-esc);margin-bottom:8px;text-transform:uppercase">Análise Gráfica de Resíduos (ΔQ)</div>';
   const dadosGrafico = balancos.map(b => { const esp = (VC.dados.espacos || []).find(e => e.id === b.id); return Object.assign({}, b, { nome: esp ? esp.nome : (b.nome || 'Espaço') }); });
   h += VC.graficos.balancoPorEspaco(dadosGrafico, { titulo: 'Resíduo por espaço (m³/h)', width: 700 });
   h += '</div>';
  }
 h += R.secao('2', 'Detalhe');
 h += R.tabela(['Espaço', 'G', 'Q_in dir.', 'Q_conf_in', 'QAI_in', 'Q_out dir.', 'Q_conf_out', 'QAI_out', 'Q_transf_in', 'Q_transf_out', 'Resíduo', 'Estado'],
   balancos.map(b => {
     const esp = (VC.dados.espacos || []).find(e => e.id === b.id);
     const icone = esp && (Number(esp.Q_ConTerm) || 0) > 0 ? (esp.rphOrigem === 'utilizador' ? '👤 ' : '📘 ') : '';
     const iconeQ = esp && (Number(esp.QAI_projeto) || 0) > 0 ? (esp.QAI_projeto_origem === 'utilizador' ? '👷 ' : '📘 ') : '';
     const badges = (icone + iconeQ).trim();
     const qaiVal = Number(b.QAI_aplicado) || 0;
     const qaiIn = (b.QAI_rede === 'insuflacao') ? qaiVal : 0;
     const qaiOut = (b.QAI_rede === 'extracao' || b.QAI_rede === 'extracao_suja') ? qaiVal : 0;
     return [
       badges ? badges + ' ' + VC.utils.esc(b.nome) : VC.utils.esc(b.nome),
       'G' + (b.g || (esp ? esp.g : '?') || '?'),
       VC.utils.fmt(b.Q_in_direto, 1), VC.utils.fmt(b.Q_conforto_in || 0, 1), VC.utils.fmt(qaiIn, 1),
       VC.utils.fmt(b.Q_out_direto, 1), VC.utils.fmt(b.Q_conforto_out || 0, 1), VC.utils.fmt(qaiOut, 1),
       VC.utils.fmt(b.Q_transf_in, 1), VC.utils.fmt(b.Q_transf_out, 1),
       '<b>' + (b.residuo >= 0 ? '+' : '') + VC.utils.fmt(b.residuo, 1) + '</b>',
       b.estado
     ];
   })
 );
 return h + R.rodape();
};

R.pressoes = function () {  
 let h = R.cabecalho('Pressões Relativas e Estanquidade', 'Análise de diferenciais de pressão (ΔP) e equilíbrio de massas por espaço');  
 const balancos = VC6.balanco.todos();  
 if (!balancos.length) {  
 return h + '<div class="vazio"><div class="vazio-titulo">Sem dados de balanço</div><div>Execute o dimensionamento para gerar o relatório de pressões.</div></div>' + R.rodape();  
 }  
 h += R.secao('1', 'Mapa de Pressões e Diagnóstico de Espaços');  
 h += '<p style="font-size:11.5px;color:var(--texto-med);margin-bottom:12px">Abaixo apresenta-se o diferencial estimado e o resíduo de caudal (ΔQ) para cada compartimento, permitindo identificar sobrepressões ou depressões excessivas.</p>';  
 h += R.tabela(['#', 'Espaço', 'Grupo', 'Q_in (m³/h)', 'Q_out (m³/h)', 'Resíduo (ΔQ)', 'Estado / Diagnóstico'],  
 balancos.map((b, idx) => {  
 const qIn = (b.Q_in_direto || 0) + (b.Q_conforto_in || 0) + (b.QAI_rede === 'insuflacao' ? Number(b.QAI_aplicado)||0 : 0) + (b.Q_transf_in || 0);  
 const qOut = (b.Q_out_direto || 0) + (b.Q_conforto_out || 0) + ((b.QAI_rede === 'extracao' || b.QAI_rede === 'extracao_suja') ? Number(b.QAI_aplicado)||0 : 0) + (b.Q_transf_out || 0);  
 const residuo = b.residuo || (qIn - qOut);  
 const badgeEstado = b.estado === 'OK' ? '<span class="badge ok">ESTANQUE / OK</span>' : (b.estado === 'DESEQUILIBRIO_LEVE' ? '<span class="badge atencao">DESENVOLVIDO (LEVE)</span>' : '<span class="badge erro">DESEQUILÍBRIO GRAVE</span>');  
 return [  
 '<span class="mono" style="font-weight:800">' + (idx + 1) + '</span>',  
 '<b>' + VC.utils.esc(b.nome || 'Espaço ' + (idx + 1)) + '</b>',  
 'G' + (b.g || '?'),  
 VC.utils.fmt(qIn, 1),  
 VC.utils.fmt(qOut, 1),  
 '<b>' + (residuo >= 0 ? '+' : '') + VC.utils.fmt(residuo, 1) + ' m³/h</b>',  
 badgeEstado  
 ];  
 })  
 );  
 return h + R.rodape();  
};

R.redeAr = function () {
  let h = R.cabecalho('Diagrama de Rede de Ar', 'UTA → R1 → R2 → R3 → R4 → Espaços');
  if (VC6.diagrama && VC6.diagrama.integrarRelatorio) {
    h += R.secao('1', 'Diagrama');
    h += '<div style="height:auto;max-height:720px">' + VC6.diagrama.renderSVG() + '</div>';
  }
  return h + R.rodape();
};

R.engenharia = function () {
  const x = VC.calculo.calcularTudo();
  const props = VC.fisica.propriedadesArHumido();
  let h = R.cabecalho('Anexo de Engenharia', 'Propriedades · fórmulas');
  h += R.kpis([{ l: 'ρ', v: VC.utils.fmt(props.rho, 4), u: 'kg/m³', cor: 'primario' }, { l: 'ν', v: VC.utils.fmtCientifico(props.nu, 3), u: 'm²/s', cor: 'primario' }, { l: 'p atm', v: VC.utils.fmt(props.p, 0), u: 'Pa', cor: 'violeta' }, { l: 'T ISA', v: VC.utils.fmt(props.T_isa, 1), u: '°C', cor: 'violeta' }]);
  h += R.tabela(['Símbolo', 'Valor', 'Unidade'], [['ρ', VC.utils.fmt(x.rho, 4), 'kg/m³'], ['ν', x.nu.toExponential(3), 'm²/s']]);
  return h + R.rodape();
};

R.caderno = function () { return VC.caderno.renderInline(); };

R.diagnostico = function () {
  const r = VC.testes && VC.testes.correr ? VC.testes.correr() : { total: 0, pass: 0, fail: 0, detalhe: [] };
  let h = R.cabecalho('Diagnóstico', 'Testes automáticos');
  h += R.kpis([{ l: 'Total', v: r.total, cor: 'primario' }, { l: 'Passados', v: r.pass, cor: 'verde' }, { l: 'Falhados', v: r.fail, cor: 'coral' }, { l: 'Taxa', v: (r.total ? Math.round(r.pass / r.total * 100) : 0) + ' %', cor: 'violeta' }]);
  h += R.tabela(['#', 'Grupo', 'Teste', 'Estado'], (r.detalhe || []).map(t => [VC.utils.esc(t.id), VC.utils.esc(t.grupo), VC.utils.esc(t.nome), t.estado === 'pass' ? '✅' : '❌']));
  return h + R.rodape();
};

R.bom = function () {
  let h = R.cabecalho('Mapa de Quantidades de Obra (BOM)', 'Agregação de metros lineares e peso estimado por diâmetro comercial');
  h += R.callout('Mapa extraído automaticamente dos trechos e ramais dimensionados segundo a série comercial EN 1506.', 'info');
  h += (VC.bom ? VC.bom.renderTabela() : '<div class="vazio">Módulo BOM indisponível.</div>');
  return h + R.rodape();
};

R.tab = function () {
  let h = R.cabecalho('Comissionamento TAB (Test, Adjust & Balance)', 'Comparação Q_projeto vs. Q_medido em obra (EN 12599 · Tolerância ±15%)');
  const terms = VC.dados.terminais || [];
  const medidos = terms.filter(t => t.Q_medido != null && t.Q_medido !== '');
  const dentroTol = medidos.filter(t => { const qp = Number(t.Q) || 1; return Math.abs((Number(t.Q_medido) - qp) / qp) <= 0.15; });
  h += R.kpis([{ l: 'Total Terminais', v: terms.length, cor: 'primario' }, { l: 'Medidos (TAB)', v: medidos.length, cor: 'violeta' }, { l: 'Conformes (±15%)', v: dentroTol.length, cor: 'verde' }, { l: 'Pendentes', v: terms.length - medidos.length, cor: 'ambar' }]);
  h += R.secao('1', 'Registo de Medições por Terminal');
  h += R.tabela(['Terminal', 'Tipo', 'Rede', 'Ramal', 'Q_projeto (m³/h)', 'Q_medido (m³/h)', 'Desvio (%)', 'Estado TAB'],
    terms.map(t => {
      const qp = Number(t.Q) || 0;
      const temMed = t.Q_medido != null && t.Q_medido !== '';
      const qm = temMed ? Number(t.Q_medido) : null;
      const desv = (temMed && qp > 0) ? ((qm - qp) / qp * 100) : null;
      const ok = desv != null && Math.abs(desv) <= 15;
      return [
        VC.utils.esc(t.nome), VC.utils.esc(t.tipo), VC.utils.esc(t.rede), VC.utils.esc(t.ramalRef || '—'),
        VC.utils.fmt(qp, 0),
        temMed ? '<b>' + VC.utils.fmt(qm, 0) + '</b>' : '—',
        desv != null ? (desv >= 0 ? '+' : '') + VC.utils.fmt(desv, 1) + '%' : '—',
        !temMed ? '<span class="badge pendente">PENDENTE</span>' : (ok ? '<span class="badge ok">CONFORME</span>' : '<span class="badge erro">FORA TOL.</span>')
      ];
    })
  );
  return h + R.rodape();
};

VC.listaRelatorios = [
  { id: 'geral', titulo: 'Geral', icone: 'fa-file-lines' },
  { id: 'dimensionamento', titulo: 'Dimensionamento', icone: 'fa-ruler-combined' },
  { id: 'bom', titulo: 'BOM (Obra)', icone: 'fa-cubes' },
  { id: 'tab', titulo: 'TAB (Comissionamento)', icone: 'fa-clipboard-check' },
  { id: 'requisitos', titulo: 'Definições', icone: 'fa-list-check' },
  { id: 'associacao', titulo: 'Associação', icone: 'fa-link' },
  { id: 'arvore', titulo: 'Árvore', icone: 'fa-sitemap' },
  { id: 'ventilador', titulo: 'Ventiladores', icone: 'fa-fan' },
  { id: 'conformidade', titulo: 'Conformidade', icone: 'fa-scale-balanced' },
  { id: 'balanco', titulo: 'Balanço de Ar', icone: 'fa-scale-balanced' },
  { id: 'pressoes', titulo: 'Pressões', icone: 'fa-gauge' },
  { id: 'redeAr', titulo: 'Rede de Ar', icone: 'fa-network-wired' },
  { id: 'engenharia', titulo: 'Engenharia', icone: 'fa-flask' },
  { id: 'caderno', titulo: 'Encargos', icone: 'fa-clipboard' },
  { id: 'diagnostico', titulo: 'Diagnóstico', icone: 'fa-vial' }
];

VC.modoRelatorios = {
  ativo: 'geral',
  render() {
    const tabs = document.getElementById('relatoriosTabs');
    const corpo = document.getElementById('relatoriosCorpo');
    if (!tabs || !corpo) return;
    tabs.innerHTML = VC.listaRelatorios.map(r => '<button class="btn btn-mini ' + (this.ativo === r.id ? 'primario' : '') + '" onclick="VC.modoRelatorios.set(\'' + r.id + '\')"><i class="fa-solid ' + r.icone + '"></i> ' + r.titulo + '</button>').join('') + '<span style="flex:1"></span>' +
      '<button class="btn btn-mini coral" onclick="VC.exportacoes.pdf()"><i class="fa-solid fa-file-pdf"></i> PDF</button>' +
      '<button class="btn btn-mini verde" onclick="VC.exportacoes.excel()"><i class="fa-solid fa-file-excel"></i> Excel</button>' +
      '<button class="btn btn-mini" onclick="VC.exportacoes.csv()"><i class="fa-solid fa-file-csv"></i> CSV</button>' +
      '<button class="btn btn-mini" onclick="VC.exportacoes.json()"><i class="fa-solid fa-file-code"></i> JSON</button>' +
      '<button class="btn btn-mini" onclick="window.print()"><i class="fa-solid fa-print"></i> Imprimir</button>';
    const fn = R[this.ativo];
    corpo.innerHTML = fn ? fn() : '<div class="vazio">Relatório indisponível.</div>';
  },
  set(id) {
    if (!R[id]) { VC.ui.toast('Relatório indisponível.'); return; }
    this.ativo = id;
    this.render();
    const corpo = document.getElementById('relatoriosCorpo');
    if (corpo) corpo.scrollTop = 0;
  }
};

})();