/* ============================================================
   VENTICONDUTAS · 04e-caderno
   §24 · Caderno de Encargos (14 secções + secção 15 QAI)
   DEPENDE DE:
   - 01 + 02 + 03 (VC.utils, VC.normas, VC6.balanco)
   - 04a-normativa (VC.normativaUI.verificacoesLegais)
   - 04c-relatorios (contexto — usa VC.utils.esc/fmt)
   - 04d-exportacoes (exportarPDF → VC.exportacoes.pdf, em runtime)
   ============================================================ */
(function () {
'use strict';
const VC = window.VC;
window.VC6 = window.VC6 || {};
const VC6 = window.VC6;
VC._boot.partes.push('04e-caderno');

/* ============================================================
   §24 · CADERNO DE ENCARGOS (14 secções + QAI)
   ============================================================ */
VC.caderno = {
  gerar() {
    const md = VC.dados.metadados || {};
    const x = VC.calculo.calcularTudo();
    const utas = VC.dados.utas || [];
    const espacos = VC.dados.espacos || [];
    const terminais = VC.dados.terminais || [];
    const ramais = VC.dados.ramais || [];
    const transferencias = VC.dados.transferencias || [];
    const tiposTerminais = Array.from(new Set(terminais.map(t => t.tipo)));
    const tiposEspacos = Array.from(new Set(espacos.map(e => e.tipo)));
    const redes = Array.from(new Set(ramais.map(r => r.rede)));
    const comConforto = espacos.filter(e => (Number(e.Q_ConTerm) || 0) > 0);
    // V8.0.1 · QAI
    const comQAI = espacos.filter(e => (Number(e.QAI_projeto) || 0) > 0);
    const compsUTA = [];
    utas.forEach(u => (u.componentes || []).forEach(c => { if (!compsUTA.find(z => z.tipo === c.tipo)) compsUTA.push({ tipo: c.tipo, exemplo: c.nome }); }));
    return {
      metadados: md,
      projeto: { nome: md.nome || '—', cliente: md.cliente || '—', local: md.local || '—', autor: md.autor || '—', revisao: md.revisao || '01', data: new Date().toLocaleDateString('pt-PT') },
      kpis: {
        nEspacos: espacos.length, nTerminais: terminais.length, nRamais: ramais.length, nUTAs: utas.length, nTransferencias: transferencias.length,
        Qins: x.ins, Qext: x.ext, Qbal: x.bal, dpMax: x.maxPerda, sfpInt: x.sfpInt, sfpClasse: x.sfpClass ? x.sfpClass.classe : null, powerW: x.power, estado: x.overall,
        nComConforto: comConforto.length, somaConforto: comConforto.reduce((s, e) => s + (Number(e.Q_ConTerm) || 0), 0),
        nComQAI: comQAI.length, somaQAI: comQAI.reduce((s, e) => s + (Number(e.QAI_projeto) || 0), 0)
      },
      tipos: { terminais: tiposTerminais, espacos: tiposEspacos, redes: redes },
      compsUTA: compsUTA,
      espacosComConforto: comConforto.map(e => ({ nome: e.nome, tipo: e.tipo, g: e.g, H: e.H, rphAplicado: e.rphAplicado, rphOrigem: e.rphOrigem, Q_ConTerm: e.Q_ConTerm })),
      espacosComQAI: comQAI.map(e => ({ nome: e.nome, tipo: e.tipo, g: e.g, QAI_projeto: e.QAI_projeto, QAI_rede: e.QAI_rede || 'auto', QAI_projeto_origem: e.QAI_projeto_origem, QAI_projeto_motivo: e.QAI_projeto_motivo })),
      utas: utas.map(u => ({ nome: u.nome, rede: u.rede, zona: u.zona, Q: u.Q * 3600, dpExt: u.dpExt, dpInt: u.dpInt, sfpInt: u.sfpInt, Pmotor: u.P_motor, eta: u.eta, etaRec: u.etaRec, classeIE: u.classeIE, curva: u.curvaFabricante ? (u.curvaFabricante.fabricante + ' · ' + u.curvaFabricante.serie + ' · ' + u.curvaFabricante.modelo) : null, componentes: u.componentes || [] })),
      ramais: ramais.map(r => ({ nome: r.nome, nomeAntigo: r.nomeAntigo || '', tipo: r.tipo, nivel: r.nivel, nivelNumero: r.nivelNumero, rede: r.rede, L: r.L, D: r.Dcom, v: r.v, dp: r.deltaPtotal, material: (r.geometriaInput && r.geometriaInput.material) || 'Aço galvanizado', estanquidade: (VC.dados.estanquidade && VC.dados.estanquidade.classe) || 'B' })),
      terminais: terminais.map(t => ({ nome: t.nome, tipo: t.tipo, espacos: (t.espacos || []).map(e => e.nome).join(', '), ramal: t.ramalRef, Q: t.Q, fabricante: t.fabricante, familia: t.familia, tamanho: t.tamanho })),
      transferencias: transferencias.map(t => ({ de: t.deNome || t.deId, para: t.paraNome || t.paraId, Q: t.Q, tipo: t.tipo, area_cm2: t.area_cm2 })),
      balanco: VC6.balanco ? VC6.balanco.todos() : [],
      conformidade: VC.normativaUI.verificacoesLegais(x),
      energia: (() => { const ce = VC.dados.custoEnergetico || { horasAno: 2500, precoKwh: 0.18, fatorCarga: 0.65 }; const kWh = (x.power || 0) * ce.horasAno * ce.fatorCarga / 1000; return { kWh: kWh, euro: kWh * ce.precoKwh, horasAno: ce.horasAno, precoKwh: ce.precoKwh }; })()
    };
  },

  renderInline() {
    const c = this.gerar();
    let h = '';
    h += '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:18px;padding:4px 0 10px;border-bottom:2px solid var(--primario);margin-bottom:14px"><div><div style="font-size:9.5px;font-weight:900;letter-spacing:.9px;text-transform:uppercase;color:var(--texto-suave)">Caderno de Encargos · ' + VC.versao + '</div><h2 style="font-size:17px;font-weight:900;color:var(--texto);margin:4px 0 2px">Caderno de Encargos AVAC</h2><div style="font-size:11.5px;color:var(--texto-med)">Parametrizado · 15 secções · F-RPH + QAI_projeto</div></div><div style="font-size:10.5px;color:var(--texto-med);text-align:right;max-width:260px;line-height:1.5"><b style="color:var(--texto);font-size:12px">' + VC.utils.esc(c.projeto.nome) + '</b><br>Revisão: ' + VC.utils.esc(c.projeto.revisao) + '<br>' + VC.utils.esc(c.projeto.data) + '</div></div>';

    h += this._seccao('1', 'Objeto e âmbito');
    h += this._par('O presente caderno de encargos estabelece as condições técnicas para o fornecimento, instalação e comissionamento do sistema de ventilação e climatização (AVAC) do edifício <b>' + VC.utils.esc(c.projeto.nome) + '</b>.');
    h += this._par('O sistema é composto por <b>' + c.kpis.nUTAs + '</b> UTA(s), <b>' + c.kpis.nRamais + '</b> ramais, <b>' + c.kpis.nTerminais + '</b> terminais, <b>' + c.kpis.nTransferencias + '</b> transferências e <b>' + c.kpis.nEspacos + '</b> espaços servidos.' + (c.kpis.nComConforto > 0 ? ' Inclui <b>' + c.kpis.nComConforto + '</b> espaço(s) com caudal de conforto térmico (F-RPH).' : '') + (c.kpis.nComQAI > 0 ? ' Inclui <b>' + c.kpis.nComQAI + '</b> espaço(s) com caudal QAI_projeto definido pelo engenheiro.' : ''));

    h += this._seccao('2', 'Normas e regulamentos aplicáveis');
    h += this._lista((VC.conhecimento.bibliografia || []).map(b => '<b>' + VC.utils.esc(b.codigo) + '</b> — ' + VC.utils.esc(b.titulo)));

    h += this._seccao('3', 'Descrição do sistema');
    h += this._par('Sistema de ventilação mecânica controlada com recuperação de calor, organizado em redes independentes de insuflação e extração. Topologia bottom-up: espaços → definições → terminais físicos → ramais → UTAs, com rede de transferências internas.');
    if (c.kpis.nComConforto > 0) {
      h += this._par('<b>F-RPH:</b> aplicação de caudal adicional de conforto térmico (Q_ConTerm = RPH × V) em ' + c.kpis.nComConforto + ' espaço(s), totalizando ' + VC.utils.fmt(c.kpis.somaConforto, 0) + ' m³/h. Este caudal previne estratificação em espaços de pé-direito elevado.');
    }
    if (c.kpis.nComQAI > 0) {
      h += this._par('<b>QAI_projeto:</b> caudal adicional definido pelo engenheiro em ' + c.kpis.nComQAI + ' espaço(s), totalizando ' + VC.utils.fmt(c.kpis.somaQAI, 0) + ' m³/h, com motivo auditável.');
    }
    h += this._subseccao('3.1 · Inventário resumido');
    const inv = [['Espaços servidos', c.kpis.nEspacos, c.tipos.espacos.length + ' tipos'], ['Com conforto (F-RPH)', c.kpis.nComConforto, 'RPH × V'], ['Com QAI_projeto', c.kpis.nComQAI, 'caudal do engenheiro'], ['Terminais', c.kpis.nTerminais, c.tipos.terminais.length + ' tipos'], ['Ramais', c.kpis.nRamais, 'Nomenclatura R1/R2/R3/R4'], ['Transferências', c.kpis.nTransferencias, 'Rede de transferências'], ['UTAs / ventiladores', c.kpis.nUTAs, 'Ver secção 4']];
    h += this._tabela(['Elemento', 'Quantidade', 'Notas'], inv, [3, 1.5, 4]);

    h += this._seccao('4', 'UTAs e ventiladores');
    if (c.utas.length) {
      c.utas.forEach((u, i) => {
        h += this._subseccao('4.' + (i + 1) + ' · ' + VC.utils.esc(u.nome));
        h += this._par('Rede: <b>' + (u.rede === 'insuflacao' ? 'Insuflação' : (u.rede === 'extracao_suja' ? 'Extração suja' : 'Extração')) + '</b>. Zona: <b>' + VC.utils.esc(u.zona || '—') + '</b>.');
        h += this._par('Caudal nominal: <b>' + VC.utils.fmt(u.Q, 0) + ' m³/h</b>. Δp ext: <b>' + VC.utils.fmt(u.dpExt, 0) + ' Pa</b>. Δp int: <b>' + VC.utils.fmt(u.dpInt, 0) + ' Pa</b>.');
        h += this._par('SFPint: <b>' + VC.utils.fmt(u.sfpInt, 0) + ' W/(m³/s)</b> · classe <b>' + (u.sfpClass && u.sfpClass.classe != null ? u.sfpClass.classe + ' (limite ' + u.sfpClass.limite + ')' : 'sem limite') + '</b>.');
        h += this._par('Potência motor: <b>' + VC.utils.fmt(u.Pmotor, 0) + ' W</b>.');
      });
    } else h += this._par('Sem UTAs configuradas.');

    h += this._seccao('5', 'Rede de condutas');
    h += this._subseccao('5.1 · Materiais');
    h += this._lista(['Aço galvanizado EN 1505/1506.', 'Acessórios da mesma gama e fabricante.', 'Juntas conforme EN 1506 com vedação classe B.', 'Nomenclatura hierárquica: R1 → R2 → R3 → R4.']);

    h += this._seccao('6', 'Terminais');
    h += this._lista(['Velocidade de saída ≤ 2,0-2,5 m/s (VDI 2081).', 'Nível de potência sonora ≤ 35 dB(A).', 'Difusores com deflexão ajustável.', 'Grelhas de extração com filtro lavável.']);

    h += this._seccao('7', 'Isolamento térmico e acústico');
    h += this._lista(['Conforme DL 101-D/2020 e VDI 2081.', 'Silenciadores ≥ 15 dB(A) na banda crítica.', 'Apoios antivibráticos em UTAs.']);

    h += this._seccao('8', 'Regulação e controlo (SGT / SGTC)');
    const dl = VC.normas.dl101D(c.kpis.powerW);
    let textoBacs;
    if (dl.nivelGestao === 'SGTC') {
      textoBacs = 'Conforme DL 101-D/2020 e NT-SCE-03 §4.3: <b>SGTC obrigatório</b> (P ≥ 290 kW, P = ' + VC.utils.fmt(c.kpis.powerW, 0) + ' W).';
    } else if (dl.nivelGestao === 'SGT') {
      textoBacs = 'Conforme DL 101-D/2020 e NT-SCE-03 §4.2: <b>SGT obrigatório</b> (100 kW ≤ P < 290 kW, P = ' + VC.utils.fmt(c.kpis.powerW, 0) + ' W).';
    } else if (dl.inspecaoObrigatoria) {
      textoBacs = 'Sem requisito SGT/SGTC (P < 100 kW). <b>Inspeção periódica obrigatória</b> (P > 70 kW, P = ' + VC.utils.fmt(c.kpis.powerW, 0) + ' W).';
    } else {
      textoBacs = 'Sem requisitos SGT/SGTC nem inspeção periódica (P = ' + VC.utils.fmt(c.kpis.powerW, 0) + ' W).';
    }
    h += this._par(textoBacs);

    h += this._seccao('9', 'Ensaio e comissionamento (TAB)');
    h += this._lista(['Terminal: ±15% do projeto.', 'Sistema: ±10% do projeto.', 'Estanquidade: 20% da extensão conforme EN 12237.', '<b>Balanço de ar verificado com portas fechadas.</b>']);

    h += this._seccao('10', 'Manutenção');
    h += this._lista(['Substituição de filtros conforme Δp final.', 'Limpeza trimestral de baterias.', 'Limpeza de condutas EN 15780.', 'Verificação do balanço de ar a cada 2 anos.']);

    h += this._seccao('11', 'Garantia e assistência');
    h += this._lista(['Garantia 24 meses.', 'Assistência ≤ 48 h úteis.', 'Peças durante 10 anos.']);

    h += this._seccao('12', 'Anexos');
    h += this._lista(['Anexo A — Tabela de terminais.', 'Anexo B — Detalhe da rede.', 'Anexo C — Fichas UTAs.', 'Anexo D — Planta com terminais.']);

    h += this._seccao('13', 'Balanço de ar e rede de transferências');
    h += this._par('O sistema foi verificado contra o princípio de balanço de massa: <b>Σ Q_in = Σ Q_out</b> em cada espaço, com tolerância de ±5 m³/h.');
    const bal = c.balanco || [];
    const okBal = bal.filter(b => b.estado === 'OK').length;
    const leveBal = bal.filter(b => b.estado === 'DESEQUILIBRIO_LEVE').length;
    const graveBal = bal.filter(b => b.estado === 'DESEQUILIBRIO_GRAVE').length;
    h += this._tabela(['Métrica de balanço', 'Valor'], [['Espaços OK', okBal + ' / ' + bal.length], ['Desequilíbrio leve', leveBal], ['Desequilíbrio grave', graveBal], ['Transferências', c.kpis.nTransferencias], ['Σ|resíduo|', VC.utils.fmt(bal.reduce((s, b) => s + Math.abs(b.residuo), 0), 1) + ' m³/h']], [3, 2]);

    if (c.kpis.nComConforto > 0) {
      h += this._seccao('14', 'F-RPH · Conforto térmico');
      h += this._par('O caudal de conforto (Q_ConTerm) é aplicado em <b>' + c.kpis.nComConforto + '</b> espaço(s), segundo o modelo RPH (Renovações Por Hora). O valor normativo é calculado automaticamente a partir do tipo de espaço e da altura (EN 16798-1 + ASHRAE 55), sendo alterável pelo engenheiro.');
      h += this._tabela(['Espaço', 'Tipo', 'G', 'H (m)', 'RPH (h⁻¹)', 'Origem', 'Q_ConTerm (m³/h)'], c.espacosComConforto.map(e => [e.nome, e.tipo, 'G' + (e.g || '?'), VC.utils.fmt(e.H, 1), VC.utils.fmt(e.rphAplicado, 1), e.rphOrigem === 'utilizador' ? '👤 Utilizador' : '📘 Norma', VC.utils.fmt(e.Q_ConTerm, 0)]), [3, 2, 0.7, 1, 1, 1.3, 1.3]);
    }

    // V8.0.1 · Nova secção 15 · QAI
    if (c.kpis.nComQAI > 0) {
      h += this._seccao('15', 'QAI_projeto · Caudal definido pelo engenheiro');
      h += this._par('O caudal QAI_projeto é um valor adicional introduzido manualmente pelo engenheiro, com <b>motivo obrigatório</b>, para responder a requisitos específicos (odores, produtos químicos, calor residual, etc.) não cobertos pela Portaria 138-I/2021. É somado ao <b>Q_in</b> quando a rede aplicada é insuflação, ou ao <b>Q_out</b> quando é extração.');
      h += this._tabela(['Espaço', 'Tipo', 'G', 'QAI (m³/h)', 'Rede aplicada', 'Origem', 'Motivo'], c.espacosComQAI.map(e => [
        e.nome, e.tipo, 'G' + (e.g || '?'),
        VC.utils.fmt(e.QAI_projeto, 0),
        e.QAI_rede || 'auto',
        e.QAI_projeto_origem === 'utilizador' ? '👷 Engenheiro' : '📘 Norma',
        e.QAI_projeto_motivo || '—'
      ]), [2.6, 1.8, 0.6, 1, 1.4, 1.4, 3]);
    }

    h += '<div style="display:flex;justify-content:space-between;gap:10px;border-top:1px solid var(--borda);margin-top:14px;padding-top:6px;font-size:9.5px;color:var(--texto-suave)"><span>' + VC.versao + ' · Caderno · ' + new Date().toISOString().slice(0, 10) + '</span><span>' + (c.kpis.nComQAI > 0 ? '15 secções · F-RPH + QAI' : '14 secções · F-RPH') + '</span></div>';
    return h;
  },

  _seccao(num, t) { return '<h3 style="font-size:12.5px;color:var(--texto);border-bottom:1px solid var(--borda);padding:10px 0 5px;margin:14px 0 8px;display:flex;gap:8px;align-items:center;background:var(--superf2);padding-left:8px;border-left:3px solid var(--primario)"><span style="font-size:10.5px;color:var(--primario);font-weight:900">' + num + '</span>' + t + '</h3>'; },
  _subseccao(t) { return '<h4 style="font-size:11.5px;color:var(--texto);font-weight:800;margin:10px 0 5px;display:flex;align-items:center;gap:6px"><i class="fa-solid fa-caret-right" style="color:var(--primario);font-size:10px"></i>' + t + '</h4>'; },
  _par(t) { return '<p style="font-size:11px;color:var(--texto);line-height:1.6;margin:6px 0">' + t + '</p>'; },
  _lista(itens) { return '<ul style="font-size:11px;color:var(--texto);line-height:1.6;margin:6px 0 10px 0;padding-left:20px">' + itens.map(i => '<li style="margin-bottom:4px">' + i + '</li>').join('') + '</ul>'; },
  _tabela(headers, linhas) { return '<div style="overflow:auto;border:1px solid var(--borda);border-radius:var(--raio-2);margin:8px 0"><table style="width:100%;border-collapse:collapse;font-size:10.5px;table-layout:auto"><thead><tr style="background:var(--superf3)">' + headers.map(h => '<th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--borda-media);font-size:9.5px;text-transform:uppercase;color:var(--texto-med);font-weight:800;white-space:nowrap">' + h + '</th>').join('') + '</tr></thead><tbody>' + linhas.map(l => '<tr>' + l.map(c => '<td style="padding:5px 8px;border-bottom:1px solid var(--borda);vertical-align:top">' + (c == null ? '' : c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>'; },

  abrir() {
    const modal = document.getElementById('modalCaderno');
    const cont = document.getElementById('modalCadernoConteudo');
    if (!modal || !cont) return;
    let h = '<div class="modal-cabecalho"><h3><i class="fa-solid fa-clipboard"></i> Caderno de Encargos ' + VC.versao + '</h3><button class="fechar" onclick="VC.ui.fecharModal(\'modalCaderno\')">×</button></div>';
    h += '<div class="modal-corpo">' + this.renderInline() + '</div>';
    h += '<div class="modal-rodape"><button class="btn" onclick="VC.ui.fecharModal(\'modalCaderno\')">Fechar</button><button class="btn primario" onclick="VC.caderno.exportarPDF()"><i class="fa-solid fa-file-pdf"></i> Exportar PDF</button><button class="btn verde" onclick="window.print()"><i class="fa-solid fa-print"></i> Imprimir</button></div>';
    cont.innerHTML = h;
    modal.classList.add('on');
  },

  exportarPDF() { VC.exportacoes.pdf(); }
};

console.log('%c[VentiCondutas] 04e-caderno carregado · caderno de encargos 15 secções (F-RPH + QAI)', 'color:#6d8fb0;font-weight:bold;background:#eaf1f7;padding:3px 6px;border-radius:3px');

})();