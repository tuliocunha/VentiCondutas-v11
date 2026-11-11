/* ============================================================
   VENTCONDUTAS V11.0.0 · 04d-exportacoes
   §23 · Exportações: VC.exportacoes.{pdf, excel, csv, json, png}

   DEPENDE DE:
   - 01-fundamentos (VC.utils, VC.debug, VC.fisica, VC.conhecimento,
                     VC.catalogo, VC.curvasFabricantes)
   - 02-biblioteca (VC.normas)
   - 03-dimensionamento (VC.calculo, VC6.balanco, VC6.uta, VC6.diagrama)
   - 04a-normativa (VC.normativaUI — usado no PDF · secção 9)
   - 04b-testes  (indireta)
   - 04c-relatorios (indireta — PDF usa VC.catalogo/curvas diretamente)
   ============================================================ */
(function () {
'use strict';
const VC = window.VC;
window.VC6 = window.VC6 || {};
const VC6 = window.VC6;
VC._boot.partes.push('04d-exportacoes');

/* ============================================================
   §23 · EXPORTAÇÕES
   ============================================================ */
VC.exportacoes = VC.exportacoes || {};

VC.exportacoes.pdf = function () {
  if (!window.jspdf) { VC.ui.toast('jsPDF não carregado.'); return; }
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, H = 297, M = 14;
    const x = VC.calculo.calcularTudo();
    const md = VC.dados.metadados || {};
    const props = VC.fisica.propriedadesArHumido();
    const nComConf = (VC.dados.espacos || []).filter(e => (Number(e.Q_ConTerm) || 0) > 0).length;
    const somaConforto = (VC.dados.espacos || []).reduce((s, e) => s + (Number(e.Q_ConTerm) || 0), 0);
    // V8.0.1 · QAI
    const comQAI = (VC.dados.espacos || []).filter(e => (Number(e.QAI_projeto) || 0) > 0);
    const nComQAI = comQAI.length;
    const somaQAI = comQAI.reduce((s, e) => s + (Number(e.QAI_projeto) || 0), 0);
    let pagina = 0;
    const COR_PRIM = [109, 143, 176];
    const COR_TEXTO = [44, 62, 80];
    const COR_SUAVE = [148, 163, 184];
    const COR_VERDE = [127, 168, 139];
    const COR_AMBAR = [201, 168, 118];
    const COR_CORAL = [200, 138, 138];
    const COR_QAI = [184, 138, 74];

    const addPagina = (comCabecalho) => {
      if (pagina > 0) doc.addPage();
      pagina++;
      if (comCabecalho !== false) {
        doc.setFillColor.apply(doc, COR_PRIM);
        doc.rect(0, 0, W, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8); doc.setFont('helvetica', 'bold');
        doc.text(VC.versao + ' · ' + (md.nome || 'Projeto'), M, 6);
        doc.text('Página ' + pagina, W - M, 6, { align: 'right' });
      }
      return 20;
    };
    let y = 20;
    const verificarPagina = (altura) => { if (y + altura > H - 18) { addPagina(true); y = 20; } };
    const titulo = (t, sub, tamanho) => {
      tamanho = tamanho || 14;
      verificarPagina(14);
      doc.setTextColor.apply(doc, COR_TEXTO);
      doc.setFontSize(tamanho); doc.setFont('helvetica', 'bold');
      doc.text(t, M, y); y += 6;
      if (sub) { doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor.apply(doc, COR_SUAVE); doc.text(sub, M, y); y += 5; }
      doc.setTextColor.apply(doc, COR_TEXTO); y += 2;
    };
    const subtitulo = (t) => {
      verificarPagina(8);
      doc.setTextColor.apply(doc, COR_TEXTO);
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text(t, M, y); y += 5;
      doc.setDrawColor.apply(doc, COR_PRIM); doc.setLineWidth(0.4);
      doc.line(M, y, W - M, y); y += 4;
    };
    const paragrafo = (t, tamanho) => {
      tamanho = tamanho || 9;
      doc.setFontSize(tamanho); doc.setFont('helvetica', 'normal');
      doc.setTextColor.apply(doc, COR_TEXTO);
      const linhas = doc.splitTextToSize(t, W - 2 * M);
      verificarPagina(linhas.length * 4);
      doc.text(linhas, M, y); y += linhas.length * 4 + 2;
    };
    const tabelaManual = (headers, linhas, larguras) => {
      const alturaLinha = 6;
      const total = larguras.reduce((s, l) => s + l, 0);
      const largurasFinais = larguras.map(l => (W - 2 * M) * (l / total));
      const desenharCabecalho = () => {
        doc.setFillColor(238, 242, 247);
        doc.rect(M, y, W - 2 * M, alturaLinha, 'F');
        doc.setFontSize(8); doc.setFont('helvetica', 'bold');
        doc.setTextColor.apply(doc, COR_TEXTO);
        let x0 = M + 1;
        headers.forEach((hh, i) => { doc.text(String(hh).substring(0, 30), x0, y + 4); x0 += largurasFinais[i]; });
        y += alturaLinha;
      };
      verificarPagina(alturaLinha * 2);
      desenharCabecalho();
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      linhas.forEach((linha, idx) => {
        if (y + alturaLinha > H - 18) { addPagina(true); y = 20; desenharCabecalho(); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); }
        if (idx % 2 === 0) { doc.setFillColor(250, 251, 253); doc.rect(M, y, W - 2 * M, alturaLinha, 'F'); }
        let x0 = M + 1;
        linha.forEach((c, i) => { doc.setTextColor.apply(doc, COR_TEXTO); doc.text(String(c == null ? '' : c).substring(0, 40), x0, y + 4); x0 += largurasFinais[i]; });
        doc.setDrawColor(227, 232, 238); doc.setLineWidth(0.2);
        doc.line(M, y + alturaLinha, W - M, y + alturaLinha);
        y += alturaLinha;
      });
      y += 3;
    };
    const kpiLinha = (itens) => {
      const n = itens.length;
      const largura = (W - 2 * M - (n - 1) * 2) / n;
      verificarPagina(16);
      itens.forEach((it, i) => {
        const x0 = M + i * (largura + 2);
        doc.setFillColor(250, 251, 253); doc.setDrawColor(227, 232, 238); doc.setLineWidth(0.2);
        doc.rect(x0, y, largura, 14, 'FD');
        doc.setFillColor.apply(doc, it.cor || COR_PRIM); doc.rect(x0, y, 1.5, 14, 'F');
        doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
        doc.setTextColor.apply(doc, COR_SUAVE);
        doc.text(String(it.l).toUpperCase(), x0 + 3, y + 4);
        doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.setTextColor.apply(doc, COR_TEXTO);
        doc.text(String(it.v), x0 + 3, y + 10);
        if (it.u) { doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor.apply(doc, COR_SUAVE); doc.text(String(it.u), x0 + 3, y + 13); }
      });
      y += 17;
    };
    const callout = (texto, tipo) => {
      const cor = tipo === 'ok' ? COR_VERDE : (tipo === 'atencao' ? COR_AMBAR : (tipo === 'erro' ? COR_CORAL : (tipo === 'qai' ? COR_QAI : COR_PRIM)));
      const fundo = tipo === 'ok' ? [238, 245, 240] : (tipo === 'atencao' ? [250, 245, 235] : (tipo === 'erro' ? [250, 238, 238] : (tipo === 'qai' ? [250, 243, 232] : [234, 241, 247])));
      doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
      const linhas = doc.splitTextToSize(texto, W - 2 * M - 8);
      const h = linhas.length * 4 + 4;
      verificarPagina(h + 3);
      doc.setFillColor.apply(doc, fundo); doc.rect(M, y, W - 2 * M, h, 'F');
      doc.setFillColor.apply(doc, cor); doc.rect(M, y, 1.5, h, 'F');
      doc.setTextColor.apply(doc, cor);
      doc.text(linhas, M + 4, y + 5);
      y += h + 3;
    };
    const graficoBarras = (tituloG, itens, unidade, largura, altura) => {
      largura = largura || W - 2 * M;
      altura = altura || 60;
      verificarPagina(altura + 12);
      if (tituloG) { doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor.apply(doc, COR_TEXTO); doc.text(tituloG, M, y); y += 5; }
      const maxV = Math.max.apply(null, [1].concat(itens.map(i => Number(i.valor) || 0)));
      const x0 = M, y0 = y, labelW = 55, barW = largura - labelW - 20;
      const linhaAlt = Math.min(7, altura / Math.max(itens.length, 1));
      itens.forEach((it, i) => {
        const yl = y0 + i * linhaAlt;
        doc.setFontSize(7); doc.setFont('helvetica', 'normal');
        doc.setTextColor.apply(doc, COR_TEXTO);
        doc.text(String(it.nome).substring(0, 26), x0, yl + linhaAlt * 0.7);
        const larg = barW * (Number(it.valor) || 0) / maxV;
        const cor = it.cor || COR_PRIM;
        doc.setFillColor.apply(doc, cor);
        doc.rect(x0 + labelW, yl + 1, Math.max(0.5, larg), linhaAlt - 2, 'F');
        doc.setFontSize(7); doc.setFont('helvetica', 'bold');
        doc.text(String(VC.utils.fmt(it.valor, 0)) + (unidade ? ' ' + unidade : ''), x0 + labelW + larg + 1, yl + linhaAlt * 0.7);
      });
      y = y0 + itens.length * linhaAlt + 3;
    };

    /* CAPA */
    addPagina(false);
    doc.setFillColor.apply(doc, COR_PRIM); doc.rect(0, 0, W, 90, 'F');
    doc.setFillColor(148, 136, 184); doc.rect(0, 90, W, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28); doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO TÉCNICO AVAC', W / 2, 40, { align: 'center' });
    doc.setFontSize(13); doc.setFont('helvetica', 'normal');
    doc.text('Dimensionamento Bottom-Up · Balanço de Ar · F-RPH · QAI_projeto · ' + VC.versao, W / 2, 50, { align: 'center' });
    doc.setFontSize(10);
    doc.text('Portaria 138-I/2021 · DL 101-D/2020 · EN 16798-1/-3 · EN 12599', W / 2, 70, { align: 'center' });
    y = 110;
    doc.setTextColor.apply(doc, COR_TEXTO);
    doc.setFontSize(22); doc.setFont('helvetica', 'bold');
    doc.text(md.nome || 'Projeto AVAC', W / 2, y, { align: 'center' }); y += 12;
    doc.setFontSize(11); doc.setFont('helvetica', 'normal');
    if (md.cliente) { doc.text('Cliente: ' + md.cliente, W / 2, y, { align: 'center' }); y += 7; }
    if (md.local) { doc.text('Local: ' + md.local, W / 2, y, { align: 'center' }); y += 7; }
    if (md.autor) { doc.text('Autor: ' + md.autor, W / 2, y, { align: 'center' }); y += 7; }
    doc.text('Revisão: ' + (md.revisao || '01'), W / 2, y, { align: 'center' }); y += 7;
    doc.text('Data: ' + new Date().toLocaleDateString('pt-PT'), W / 2, y, { align: 'center' });
    y = H - 30;
    doc.setFillColor(238, 242, 247); doc.rect(0, H - 20, W, 20, 'F');
    doc.setFontSize(8); doc.setFont('helvetica', 'italic');
    doc.setTextColor.apply(doc, COR_SUAVE);
    doc.text('Documento gerado automaticamente pela aplicação ' + VC.versao, W / 2, H - 12, { align: 'center' });
    doc.text('Modelo bottom-up + balanço de ar + transferências + F-RPH + QAI_projeto', W / 2, H - 7, { align: 'center' });

    /* ÍNDICE */
    addPagina(true); y = 22;
    titulo('Índice', null, 16);
    const indice = [
      '1. Resumo executivo', '2. F-RPH · Conforto térmico', '3. QAI_projeto · Engenheiro',
      '4. Contexto e premissas', '5. Inventário de espaços', '6. Definições e terminais',
      '7. Rede de condutas', '8. UTAs e ventiladores', '9. Verificação normativa',
      '10. Balanço de ar por espaço', '11. Pressões relativas', '12. Diagrama de rede de ar',
      '13. Conclusões', 'Anexo A. Fórmulas', 'Anexo B. Ar húmido',
      'Anexo C. Catálogo', 'Anexo D. Bibliografia'
    ];
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    indice.forEach((linha, i) => { doc.setTextColor.apply(doc, COR_TEXTO); doc.text(linha, M + 4, y); doc.setTextColor.apply(doc, COR_SUAVE); doc.text('(' + (i + 2) + ')', W - M - 4, y, { align: 'right' }); y += 6; });

    /* 1 · RESUMO */
    addPagina(true); y = 22;
    titulo('1 · Resumo executivo', 'KPIs principais e estado global');
    kpiLinha([{ l: 'Insuflação', v: VC.utils.fmt(x.ins, 0), u: 'm³/h' }, { l: 'Extração', v: VC.utils.fmt(x.ext, 0), u: 'm³/h' }, { l: 'Balanço', v: (x.bal >= 0 ? '+' : '') + VC.utils.fmt(x.bal, 0), u: 'm³/h' }, { l: 'Perda crítica', v: VC.utils.fmt(x.maxPerda, 0), u: 'Pa' }]);
    kpiLinha([{ l: 'SFPint', v: VC.utils.fmt(x.sfpInt, 0), u: 'W/(m³/s)' }, { l: 'Classe SFP', v: 'Cl. ' + x.sfpClass.classe, u: '' }, { l: 'Potência', v: VC.utils.fmt(x.power, 0), u: 'W' }, { l: 'Estado', v: x.overall, u: '' }]);
    graficoBarras('Q por rede (m³/h)', [{ nome: 'Insuflação', valor: x.ins, cor: COR_PRIM }, { nome: 'Extração', valor: x.ext, cor: COR_VERDE }], 'm³/h', W - 2 * M, 20);

    /* 2 · F-RPH */
    if (nComConf > 0) {
      addPagina(true); y = 22;
      titulo('2 · F-RPH · Conforto térmico', 'Caudal adicional por estratificação');
      callout('O RPH (Renovações Por Hora de conforto) é aplicado a todos os grupos (G1-G4). Calcula-se Q_ConTerm = RPH × V. Para G1-G3, entra na insuflação; para G4, soma à extração.', 'info');
      kpiLinha([{ l: 'Espaços c/ RPH', v: nComConf, u: '' }, { l: 'Σ Q_ConTerm', v: VC.utils.fmt(somaConforto, 0), u: 'm³/h' }, { l: 'Norma', v: (VC.dados.espacos || []).filter(e => (Number(e.Q_ConTerm) || 0) > 0 && e.rphOrigem === 'norma').length, u: '📘' }, { l: 'Utilizador', v: (VC.dados.espacos || []).filter(e => (Number(e.Q_ConTerm) || 0) > 0 && e.rphOrigem === 'utilizador').length, u: '👤' }]);
      const comConf = (VC.dados.espacos || []).filter(e => (Number(e.Q_ConTerm) || 0) > 0);
      tabelaManual(['Espaço', 'Tipo', 'G', 'H (m)', 'RPH', 'Classe', 'Origem', 'Q_ConTerm'], comConf.map(e => [
        e.nome.substring(0, 20), e.tipo.substring(0, 12), 'G' + (e.g || '?'),
        VC.utils.fmt(e.H, 1), VC.utils.fmt(e.rphAplicado, 1), e.rphClasse || '—',
        e.rphOrigem === 'utilizador' ? '👤' : '📘',
        VC.utils.fmt(e.Q_ConTerm, 0)
      ]), [3, 2, 0.7, 1, 1, 1.2, 1, 1.2]);
    }

    /* 3 · QAI_PROJETO */
    if (nComQAI > 0) {
      addPagina(true); y = 22;
      titulo('3 · QAI_projeto · Engenheiro', 'Caudal adicional definido manualmente, com motivo auditável');
      callout('O QAI_projeto é um caudal adicional definido pelo engenheiro para responder a requisitos específicos (odores, produtos químicos, calor residual, etc.). Requer motivo obrigatório. Soma ao Q_in (insuflação) ou Q_out (extração), conforme a rede escolhida.', 'qai');
      kpiLinha([
        { l: 'Espaços c/ QAI', v: nComQAI, u: '', cor: COR_QAI },
        { l: 'Σ QAI_projeto', v: VC.utils.fmt(somaQAI, 0), u: 'm³/h', cor: COR_QAI },
        { l: 'Insuflação', v: comQAI.filter(e => (e.QAI_rede || 'auto') === 'insuflacao' || (e.QAI_rede === 'auto' && (e.g || 1) <= 3)).length, u: '', cor: COR_PRIM },
        { l: 'Extração', v: comQAI.filter(e => (e.QAI_rede || 'auto') === 'extracao' || (e.QAI_rede === 'auto' && (e.g || 1) === 4)).length, u: '', cor: COR_VERDE }
      ]);
      tabelaManual(['Espaço', 'G', 'QAI (m³/h)', 'Rede', 'Origem', 'Motivo'], comQAI.map(e => [
        e.nome.substring(0, 22),
        'G' + (e.g || '?'),
        VC.utils.fmt(e.QAI_projeto, 0),
        e.QAI_rede || 'auto',
        e.QAI_projeto_origem === 'utilizador' ? '👷 Eng.' : '📘 Norma',
        (e.QAI_projeto_motivo || '—').substring(0, 40)
      ]), [3, 0.7, 1.2, 1.2, 1.2, 4]);
    }

    /* 4 · CONTEXTO */
    addPagina(true); y = 22;
    titulo('4 · Contexto e premissas', 'Metodologia e parâmetros');
    paragrafo('O dimensionamento segue o modelo bottom-up puro: parte das exigências regulamentares por espaço (Portaria 138-I/2021), soma o caudal de conforto (F-RPH) e o caudal QAI definido pelo engenheiro, materializa terminais físicos, propaga caudais pelos ramais e fecha no ventilador/UTA.');
    subtitulo('Premissas ISA');
    tabelaManual(['Parâmetro', 'Símbolo', 'Valor', 'Unidade'], [['Altitude', 'z', VC.utils.fmt(VC.dados.params.altitude, 0), 'm'], ['Temperatura', 'T', VC.utils.fmt(VC.dados.params.temperatura, 1), '°C'], ['Humidade relativa', 'RH', VC.utils.fmt(VC.dados.params.humidade, 0), '%'], ['Pressão atmosférica', 'p', VC.utils.fmt(props.p, 0), 'Pa'], ['Massa volúmica', 'ρ', VC.utils.fmt(props.rho, 4), 'kg/m³'], ['Viscosidade cinemática', 'ν', VC.utils.fmtCientifico(props.nu, 3), 'm²/s'], ['Rugosidade absoluta', 'ε', VC.utils.fmt(VC.dados.params.rugosidade, 2), 'mm']], [3, 1, 2, 1.5]);

    /* 5 · ESPAÇOS */
    addPagina(true); y = 22;
    titulo('5 · Inventário de espaços', VC.dados.espacos.length + ' espaços registados');
    const linhasEsp = VC.dados.espacos.map(e => { const c = VC.calculo.calcularQEspaco(e); return [c.nome, c.tipo, 'G' + c.g, VC.utils.fmt(c.A, 1), VC.utils.fmt(c.V, 1), (c.N || 0), VC.utils.fmt(c.Q_normas || 0, 0), VC.utils.fmt(c.Q_ConTerm || 0, 0), VC.utils.fmt(c.QAI_projeto || 0, 0), VC.utils.fmt(c.Q_total || 0, 0), c.status]; });
    tabelaManual(['Espaço', 'Tipo', 'G', 'A (m²)', 'V (m³)', 'N', 'Q_normas', 'Q_ConTerm', 'QAI', 'Q_total', 'Estado'], linhasEsp, [2.5, 1.8, 0.5, 0.9, 0.9, 0.6, 1, 1, 0.9, 1.1, 0.9]);

    /* 6 · TERMINAIS */
    addPagina(true); y = 22;
    titulo('6 · Definições e terminais', 'Materialização bottom-up');
    const cob = VC.requisitos.coberturaGlobal();
    kpiLinha([{ l: 'Q necessária', v: VC.utils.fmt(cob.totalNec, 0), u: 'm³/h' }, { l: 'Q definida', v: VC.utils.fmt(cob.totalCob, 0), u: 'm³/h' }, { l: 'Cobertura', v: Math.round(cob.cobertura * 100) + ' %', u: '' }, { l: 'Terminais', v: VC.dados.terminais.length, u: '' }]);
    subtitulo('Terminais físicos materializados');
    const linhasTerm = VC.dados.terminais.slice(0, 50).map(t => { const v = VC.calculo.verificarTerminal(t); const esp = (t.espacos || []).map(x => x.nome).join(', ').substring(0, 30); return [t.nome, t.tipo, esp || '—', t.ramalRef || '—', VC.utils.fmt(t.Q, 0), VC.utils.fmt(v.dPCalc, 1), v.status]; });
    tabelaManual(['ID', 'Tipo', 'Espaço(s)', 'Ramal', 'Q (m³/h)', 'Δp (Pa)', 'Estado'], linhasTerm, [2, 1.6, 2.4, 2, 1, 0.9, 1]);

    /* 7 · REDE */
    addPagina(true); y = 22;
    titulo('7 · Rede de condutas', 'Q derivado · secções · velocidades · perdas');
    graficoBarras('Δp total por ramal (Pa)', x.ramais.slice(0, 15).map(r => ({ nome: r.nome, valor: r.deltaPtotal || 0, cor: (r.deltaPtotal > 300 ? COR_CORAL : (r.deltaPtotal > 200 ? COR_AMBAR : COR_VERDE)) })), 'Pa', W - 2 * M, 80);
    subtitulo('Detalhe dos ramais');
    tabelaManual(['Ramal', 'Nível', 'Rede', 'Q', 'Ø', 'v', 'Δp troço', 'Δp acum.', 'Δp crít.'], x.ramais.map(r => [r.nome, VC.utils.nivelRotulo(r.nivelNumero || 2), r.rede, VC.utils.fmt(r.Q, 0), r.Dcom || '—', VC.utils.fmt(r.v, 2), VC.utils.fmt(r.deltaPTroco, 1), VC.utils.fmt(r.deltaPtotal, 1), VC.utils.fmt(r.deltaPCritico, 1)]), [2.6, 0.9, 1, 0.9, 0.8, 0.8, 0.9, 0.9, 0.9]);

    /* 8 · UTAS */
    addPagina(true); y = 22;
    titulo('8 · UTAs e ventiladores', 'Q · Δp · SFPint · P motor');
    tabelaManual(['UTA', 'Rede', 'Q (m³/h)', 'Δp ext (Pa)', 'Δp int (Pa)', 'SFPint', 'P motor (W)', 'Estado'], VC.dados.utas.map(u => [u.nome, u.rede, VC.utils.fmt(u.Q * 3600, 0), VC.utils.fmt(u.dpExt, 0), VC.utils.fmt(u.dpInt, 0), VC.utils.fmt(u.sfpInt, 0), VC.utils.fmt(u.P_motor, 0), u.status]), [3, 1.2, 1.4, 1.2, 1.2, 1, 1.3, 1]);

    /* 9 · NORMATIVA */
    addPagina(true); y = 22;
    titulo('9 · Verificação normativa', 'Conformidade legal');
    tabelaManual(['Norma', 'Item', 'Resultado', 'Estado'], VC.normativaUI.verificacoesLegais(x).map(v => [v.norma, v.item, v.resultado, v.estado]), [2.4, 3, 3, 1.2]);

    /* 10 · BALANÇO */
    addPagina(true); y = 22;
    titulo('10 · Balanço de ar por espaço', 'Σ Q_in = Σ Q_out · tolerância ±5 m³/h · inclui Q_ConTerm + QAI');
    const resumo = VC6.balanco.resumo();
    kpiLinha([{ l: 'Espaços', v: resumo.total, u: '' }, { l: 'OK', v: resumo.ok, u: '' }, { l: 'Deseq. leve', v: resumo.leve, u: '' }, { l: 'Deseq. grave', v: resumo.grave, u: '' }]);
    const balancos = VC6.balanco.todos();
    if (balancos.length) graficoBarras('Resíduo por espaço (m³/h)', balancos.slice(0, 25).map(b => ({ nome: b.nome, valor: Math.abs(b.residuo), cor: Math.abs(b.residuo) <= 5 ? COR_VERDE : (Math.abs(b.residuo) <= 10 ? COR_AMBAR : COR_CORAL) })), 'm³/h', W - 2 * M, 100);
    subtitulo('Detalhe');
    tabelaManual(['Espaço', 'G', 'Q_in', 'Q_conf_in', 'QAI_in', 'Q_out', 'Q_conf_out', 'QAI_out', 'Resíduo', 'Estado'], balancos.slice(0, 40).map(b => {
      const esp = (VC.dados.espacos || []).find(e => e.id === b.id);
      const icone = esp && (Number(esp.Q_ConTerm) || 0) > 0 ? (esp.rphOrigem === 'utilizador' ? '👤 ' : '📘 ') : '';
      const iconeQ = esp && (Number(esp.QAI_projeto) || 0) > 0 ? (esp.QAI_projeto_origem === 'utilizador' ? '👷 ' : '📘 ') : '';
      const badges = (icone + iconeQ).trim();
      const qaiVal = Number(b.QAI_aplicado) || 0;
      const qaiIn = (b.QAI_rede === 'insuflacao') ? qaiVal : 0;
      const qaiOut = (b.QAI_rede === 'extracao' || b.QAI_rede === 'extracao_suja') ? qaiVal : 0;
      return [(badges ? badges + ' ' : '') + String(b.nome || '—').substring(0, 18), 'G' + (b.g || '?'), VC.utils.fmt(b.Q_in_direto, 0), VC.utils.fmt(b.Q_conforto_in || 0, 0), VC.utils.fmt(qaiIn, 0), VC.utils.fmt(b.Q_out_direto, 0), VC.utils.fmt(b.Q_conforto_out || 0, 0), VC.utils.fmt(qaiOut, 0), (b.residuo >= 0 ? '+' : '') + VC.utils.fmt(b.residuo, 1), b.estado];
    }), [2.4, 0.6, 0.9, 0.9, 0.8, 0.9, 0.9, 0.8, 1, 1.2]);

    /* ANEXO A · FÓRMULAS */
    addPagina(true); y = 22;
    titulo('Anexo A · Fórmulas', 'Equações utilizadas');
    const formulasAnexo = VC.conhecimento.formulasAnexo || [];
    tabelaManual(['Grandeza', 'Expressão', 'Notas'], formulasAnexo.map(f => [f.t, f.e, f.notas || '']), [2.5, 3.5, 3]);

    /* ANEXO B · AR HÚMIDO */
    addPagina(true); y = 22;
    titulo('Anexo B · Ar húmido', 'Propriedades');
    tabelaManual(['Propriedade', 'Valor', 'Unidade'], [['Altitude', VC.utils.fmt(props.altitude, 0), 'm'], ['Temperatura', VC.utils.fmt(props.T, 1), '°C'], ['Humidade relativa', VC.utils.fmt(props.RH, 0), '%'], ['Pressão atmosférica', VC.utils.fmt(props.p, 0), 'Pa'], ['Pressão saturação', VC.utils.fmt(props.pSat, 0), 'Pa'], ['Pressão de vapor', VC.utils.fmt(props.pv, 0), 'Pa'], ['Massa volúmica', VC.utils.fmt(props.rho, 4), 'kg/m³'], ['Viscosidade dinâmica', VC.utils.fmtCientifico(props.mu, 3), 'Pa·s'], ['Viscosidade cinemática', VC.utils.fmtCientifico(props.nu, 3), 'm²/s'], ['Calor específico', VC.utils.fmt(props.cp, 3), 'kJ/(kg·K)']], [3, 1.5, 1.5]);

    /* ANEXO C · CATÁLOGO */
    addPagina(true); y = 22;
    titulo('Anexo C · Catálogo', 'Terminais e curvas de fabricantes');
    tabelaManual(['Fabricante', 'Tipo', 'Modelos', 'Tamanhos'], VC.catalogo.contarPorCatalogo().map(c => [c.fabricante, c.tipo, c.modelos, c.tamanhos]), [2.5, 3, 1.2, 1.2]);
    subtitulo('Curvas de ventiladores');
    tabelaManual(['Fabricante', 'Série', 'Modelo', 'Q nom', 'Δp nom'], VC.curvasFabricantes.todas().map(c => [c.fabricante, c.serie, c.modelo, VC.utils.fmt(c.Q_nom, 0) + ' m³/h', VC.utils.fmt(c.dP_nom, 0) + ' Pa']), [2.2, 2.2, 1.8, 1.5, 1.5]);

    /* ANEXO D · BIBLIOGRAFIA */
    addPagina(true); y = 22;
    titulo('Anexo D · Bibliografia', 'Normas e referências');
    const bib = (VC.conhecimento.bibliografia || []).map(b => b.codigo + ' · ' + b.titulo);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    bib.forEach((ref, i) => {
      const linhas = doc.splitTextToSize((i + 1) + '. ' + ref, W - 2 * M - 4);
      verificarPagina(linhas.length * 4 + 1);
      doc.setTextColor.apply(doc, COR_TEXTO);
      doc.text(linhas, M + 4, y);
      y += linhas.length * 4 + 2;
    });

    const totalPaginas = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPaginas; p++) {
      doc.setPage(p);
      doc.setFontSize(7); doc.setFont('helvetica', 'italic');
      doc.setTextColor.apply(doc, COR_SUAVE);
      doc.text(VC.versao + ' · Página ' + p + ' / ' + totalPaginas, W - M, H - 5, { align: 'right' });
    }

    const nomeFicheiro = 'VentCondutas_v' + VC.versaoCurta + '_' + (md.nome || 'Projeto').replace(/[^A-Za-z0-9_-]+/g, '_') + '_' + new Date().toISOString().slice(0, 10) + '.pdf';
    doc.save(nomeFicheiro);
    VC.ui.toast('PDF ' + VC.versao + ' gerado (' + totalPaginas + ' páginas).');
  } catch (e) { VC.debug.erro(e); VC.ui.toast('Erro ao gerar PDF: ' + e.message); }
};

VC.exportacoes.excel = function () {
  if (!window.XLSX) { VC.ui.toast('SheetJS não carregado.'); return; }
  try {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(VC.dados.espacos.map(e => {
      const c = VC.calculo.calcularQEspaco(e);
      const b = VC.calculo.balancoEspaco(e.nome);
      return Object.assign({}, c, { balanco_estado: b.estado, Q_servido: b.Q_servido, nDefinicoes: (e.definicoes || []).length, residuo_ar: (e.balanco || {}).residuo || 0, rphAplicado: e.rphAplicado, rphOrigem: e.rphOrigem, Q_ConTerm: e.Q_ConTerm, QAI_projeto: e.QAI_projeto, QAI_projeto_origem: e.QAI_projeto_origem, QAI_projeto_motivo: e.QAI_projeto_motivo, QAI_projeto_rede: e.QAI_projeto_rede, Q_total: e.Q_total });
    })), 'Espaços');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(VC.dados.terminais.map(t => { const v = VC.calculo.verificarTerminal(t); return { Nome: t.nome, Tipo: t.tipo, Espacos: (t.espacos || []).map(x => x.nome).join(', '), Ramal: t.ramalRef, Q: t.Q, dP: v.dPCalc, Lw: v.LwCalc }; })), 'Terminais');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(VC.dados.ramais.map(r => ({ Nome: r.nome, NomeAntigo: r.nomeAntigo || '', Nivel: r.nivel, NivelNum: r.nivelNumero, Tipo: r.tipo, Rede: r.rede, utaRef: r.utaRef, Q: r.Q, L: r.L, D: r.Dcom, v: r.v, Re: r.Re, dp: r.deltaPtotal, lockD: r.lock ? r.lock.D : false }))), 'Ramais');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(VC.dados.utas.map(u => ({ Nome: u.nome, Rede: u.rede, Q: u.Q, dpInt: u.dpInt, dpExt: u.dpExt, sfpInt: u.sfpInt, Pmotor: u.P_motor, curva: u.curvaFabricante ? (u.curvaFabricante.fabricante + ' ' + u.curvaFabricante.modelo) : '' }))), 'UTAs');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((VC.dados.transferencias || []).map(t => ({ ID: t.id, De: t.deNome || t.deId, Para: t.paraNome || t.paraId, Q: t.Q, Tipo: t.tipo, Area_cm2: t.area_cm2 }))), 'Transferências');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(VC6.balanco.todos().map(b => ({ Espaco: b.nome, G: b.g, Q_in: b.Q_in_direto, Q_conf_in: b.Q_conforto_in || 0, QAI_in: (b.QAI_rede === 'insuflacao' ? b.QAI_aplicado : 0) || 0, Q_out: b.Q_out_direto, Q_conf_out: b.Q_conforto_out || 0, QAI_out: ((b.QAI_rede === 'extracao' || b.QAI_rede === 'extracao_suja') ? b.QAI_aplicado : 0) || 0, Transf_in: b.Q_transf_in, Transf_out: b.Q_transf_out, Residuo: b.residuo, dP_Pa: b.pressao_relativa_Pa, Estado: b.estado }))), 'Balanço');
    // V8.0.1 · Nova folha QAI
    const comQAI = (VC.dados.espacos || []).filter(e => (Number(e.QAI_projeto) || 0) > 0);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(comQAI.map(e => ({
      Espaco: e.nome,
      Tipo: e.tipo,
      Grupo: 'G' + (e.g || '?'),
      QAI_projeto: e.QAI_projeto,
      Rede: e.QAI_rede || 'auto',
      Origem: e.QAI_projeto_origem || 'norma',
      Motivo: e.QAI_projeto_motivo || '',
      DefinidoEm: e.QAI_projeto_definidoEm || '',
      RepostoEm: e.QAI_projeto_repostoEm || ''
    }))), 'QAI');
    if (VC.bom) {
      const bomData = VC.bom.extrair();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bomData.linhas.map(l => ({
        Diametro_mm: l.diametro, Material: l.material, Rede: l.rede, Metros_m: l.metros, N_Trechos: l.n_trechos, Peso_kg: l.peso_kg
      }))), 'BOM');
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((VC.dados.terminais || []).map(t => {
      const qp = Number(t.Q) || 0;
      const temM = t.Q_medido != null && t.Q_medido !== '';
      const qm = temM ? Number(t.Q_medido) : '';
      const desv = (temM && qp > 0) ? Math.round((qm - qp) / qp * 1000) / 10 : '';
      return { Terminal: t.nome, Tipo: t.tipo, Rede: t.rede, Ramal: t.ramalRef || '', Q_projeto: qp, Q_medido: qm, Desvio_pct: desv };
    })), 'TAB');
    XLSX.writeFile(wb, 'VentiCondutas_v' + VC.versaoCurta + '_' + new Date().toISOString().slice(0, 10) + '.xlsx');
    VC.ui.toast('Excel ' + VC.versao + ' gerado (9 folhas · inclui BOM e TAB).');
  } catch (e) { VC.debug.erro(e); VC.ui.toast('Erro Excel.'); }
};

VC.exportacoes.csv = async function () {
  const linhas = [['Nome', 'Tipo', 'Grupo', 'Piso', 'Ala', 'A', 'H', 'V', 'N', 'RPH', 'RPH_origem', 'Q_normas', 'Q_ConTerm', 'QAI_projeto', 'QAI_rede', 'QAI_origem', 'QAI_motivo', 'Q_total', 'Q_EN16798_cat' + ((VC.dados.params && VC.dados.params.categoria) || 'II'), 'N_Definicoes', 'Q_servido', 'Balanco_term', 'Residuo_ar', 'Status']];
  VC.dados.espacos.forEach(e => {
    const c = VC.calculo.calcularQEspaco(e);
    const b = VC.calculo.balancoEspaco(e.nome);
    const loc = e.localizacao || {};
    linhas.push([c.nome, c.tipo, 'G' + c.g, loc.piso || '', loc.ala || '', c.A, c.H, c.V, c.N, e.rphAplicado || 0, e.rphOrigem || 'norma', c.Q_normas || 0, c.Q_ConTerm || 0, c.QAI_projeto || 0, e.QAI_projeto_rede || 'auto', e.QAI_projeto_origem || 'norma', e.QAI_projeto_motivo || '', c.Q_total || 0, Math.round(c.Q_EN16798 || 0), (e.definicoes || []).length, b.Q_servido, b.estado, (e.balanco || {}).residuo || 0, c.status]);
  });
  const csv = '\ufeff' + linhas.map(r => r.map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(';')).join('\r\n');
  const nome = 'VentCondutas_v' + VC.versaoCurta + '_espacos.csv';
  const r = await VC.utils.guardarComEscolha(nome, csv, 'text/csv;charset=utf-8', 'csv');
  if (r.cancelado) VC.ui.toast('Guardar cancelado.');
  else VC.ui.toast('CSV guardado.');
};

VC.exportacoes.json = async function (nomeSugerido) {
  const projeto = {
    _versao: 'V9',
    versao: VC.versao,
    versaoCurta: VC.versaoCurta,
    timestamp: new Date().toISOString(),
    metadados: VC.dados.metadados,
    configuracao: { tipologia: VC.dados.tipologia, params: VC.dados.params, restricaoH: VC.dados.restricaoH, serieDiametros: VC.dados.serieDiametros },
    dados: { espacos: VC.dados.espacos, ramais: VC.dados.ramais, terminais: VC.dados.terminais, transferencias: VC.dados.transferencias || [], utas: VC.dados.utas, nos: VC.dados.nos, trechos: VC.dados.trechos, elementosRede: VC.dados.elementosRede, _mapaRenomeacao: VC.dados._mapaRenomeacao || {} },
    flags: VC.flags
  };
  const nome = nomeSugerido || ('VentCondutas_v' + VC.versaoCurta + '_' + new Date().toISOString().slice(0, 10) + '.json');
  const r = await VC.utils.guardarComEscolha(nome, JSON.stringify(projeto, null, 2), 'application/json', 'json');
  if (r.cancelado) VC.ui.toast('Guardar cancelado.');
  else VC.ui.toast('Projeto guardado.');
};

VC.exportacoes.png = function (modo) {
  if (modo === 'diagrama' && window.VC6 && VC6.diagrama && VC6.diagrama.exportarPNG) { VC6.diagrama.exportarPNG(); return; }
  VC.ui.toast('Exportação PNG disponível no modo Diagrama.');
};

console.log('%c[VentCondutas V11.0.0] 04d-exportacoes carregado · PDF+Excel+CSV+JSON+PNG', 'color:#6d8fb0;font-weight:bold;background:#eaf1f7;padding:3px 6px;border-radius:3px');

})();