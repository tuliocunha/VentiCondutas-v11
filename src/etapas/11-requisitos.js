/* ============================================================
   VENTCONDUTAS V10.2.4 · 11-requisitos
   UI de Definicao de Terminais · passo onde se associa
   terminal a espaco (via definicoes) e se materializam
   os terminais fisicos. Corrige o passo em falta desde V9.
   ============================================================ */
(function () {
'use strict';
var VC = window.VC;
if (!VC) return;
VC._boot = VC._boot || { partes: [] };
VC._boot.partes.push('11-requisitos');

VC.requisitos = {
  _filtro: 'todos',
  _mostrarSemDef: false,
  _filtroAv: { estado: 'todos', local: 'todos', subgrupo: 'todos', balanco: 'todos' },

  setFiltroAv: function (campo, v) {
      this._filtroAv[campo] = v || 'todos';
      VC.passos.render('requisitos');
  },

  render: function () {
    if (VC._espacoAlvo != null) {
      var idxAuto = VC._espacoAlvo;
      VC._espacoAlvo = null;
      var self0 = this;
      setTimeout(function () { self0.abrirModal(idxAuto); }, 50);
    }

    var espacos = VC.dados.espacos || [];
    if (!espacos.length) {
      return '<div class="cartao-titulo"><i class="fa-solid fa-list-check"></i> Defini\u00e7\u00e3o de Terminais</div>'
        + '<div class="vazio"><i class="fa-solid fa-inbox"></i>'
        + '<div class="vazio-titulo">Sem espa\u00e7os</div>'
        + '<div>Adiciona espa\u00e7os primeiro no passo <b>Levantamento</b>.</div></div>';
    }

    var self = this;
    var cob = this.coberturaGlobal();
    var h = '';

    h += '<div class="cartao-titulo"><i class="fa-solid fa-list-check"></i> Defini\u00e7\u00e3o de Terminais</div>';
    h += '<p style="font-size:11.5px;color:var(--texto-med);margin-bottom:10px">'
      + 'Define, para cada espa\u00e7o, <b>que tipos de terminal</b> o servem (difusor, grelha, boca). '
      + 'O sistema materializa depois <b>N terminais f\u00edsicos</b> j\u00e1 associados ao espa\u00e7o. '
      + 'Esses terminais podem ser ligados a ramais no passo <b>Topologia dos Ramais</b>.</p>';

    h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px">';
    h += '<div style="background:var(--superf2);border:1px solid var(--borda);border-left:3px solid var(--primario);border-radius:5px;padding:8px 10px"><div style="font-size:9.5px;font-weight:800;color:var(--texto-suave);text-transform:uppercase">Espa\u00e7os</div><div style="font-size:16px;font-weight:900;color:var(--texto);margin-top:3px">' + cob.totalEspacos + '</div></div>';
    h += '<div style="background:var(--superf2);border:1px solid var(--borda);border-left:3px solid var(--' + (cob.semReq > 0 ? 'ambar' : 'verde') + ');border-radius:5px;padding:8px 10px"><div style="font-size:9.5px;font-weight:800;color:var(--texto-suave);text-transform:uppercase">Sem defini\u00e7\u00f5es</div><div style="font-size:16px;font-weight:900;color:var(--texto);margin-top:3px">' + cob.semReq + '</div></div>';
    h += '<div style="background:var(--superf2);border:1px solid var(--borda);border-left:3px solid var(--primario);border-radius:5px;padding:8px 10px"><div style="font-size:9.5px;font-weight:800;color:var(--texto-suave);text-transform:uppercase">\u03a3 Q_definido</div><div style="font-size:16px;font-weight:900;color:var(--texto);margin-top:3px">' + VC.utils.fmt(cob.totalCob, 0) + ' <span style="font-size:10px;font-weight:600;color:var(--texto-suave)">m\u00b3/h</span></div></div>';
    var pct = Math.round(cob.cobertura * 100);
    var corCob = (cob.cobertura >= 0.95 && cob.cobertura <= 1.05) ? 'verde' : 'ambar';
    h += '<div style="background:var(--superf2);border:1px solid var(--borda);border-left:3px solid var(--' + corCob + ');border-radius:5px;padding:8px 10px"><div style="font-size:9.5px;font-weight:800;color:var(--texto-suave);text-transform:uppercase">Cobertura</div><div style="font-size:16px;font-weight:900;color:var(--texto);margin-top:3px">' + pct + '%</div></div>';
    h += '</div>';

var locais = Array.from(new Set(espacos.map(function(e) { return (e.localizacao && e.localizacao.piso) || ''; }))).filter(Boolean).sort();
    var tipos = Array.from(new Set(espacos.map(function(e) { return e.tipo || ''; }))).filter(Boolean).sort();

    h += '<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;align-items:center;padding:8px 12px;background:var(--superf2);border-radius:6px;border:1px solid var(--borda)">';
    h += '<span style="font-size:10.5px;font-weight:800;color:var(--texto-med);text-transform:uppercase">Filtros:</span>';
    h += '<select onchange="VC.requisitos.setFiltroAv(\'estado\', this.value)" style="padding:4px 8px;border:1px solid var(--borda-media);border-radius:5px;font-size:11px;font-family:inherit;background:#fff;margin-left:4px">';
    [['todos', 'Estado: Todos'], ['pendentes', 'Pendentes'], ['concluidos', 'Conclu\u00eddos']].forEach(function (op) {
      h += '<option value="' + op[0] + '"' + (self._filtroAv.estado === op[0] ? ' selected' : '') + '>' + op[1] + '</option>';
    });
    h += '</select>';
    h += '<select onchange="VC.requisitos.setFiltroAv(\'local\', this.value)" style="padding:4px 8px;border:1px solid var(--borda-media);border-radius:5px;font-size:11px;font-family:inherit;background:#fff;margin-left:4px">';
    h += '<option value="todos">Local: Todos</option>';
    locais.forEach(function (l) { h += '<option value="' + VC.utils.esc(l) + '"' + (self._filtroAv.local === l ? ' selected' : '') + '>' + VC.utils.esc(l) + '</option>'; });
    h += '</select>';
    h += '<select onchange="VC.requisitos.setFiltroAv(\'subgrupo\', this.value)" style="padding:4px 8px;border:1px solid var(--borda-media);border-radius:5px;font-size:11px;font-family:inherit;background:#fff;margin-left:4px;max-width:130px">';
    h += '<option value="todos">Tipo: Todos</option>';
    tipos.forEach(function (t) { h += '<option value="' + VC.utils.esc(t) + '"' + (self._filtroAv.subgrupo === t ? ' selected' : '') + '>' + VC.utils.esc(t) + '</option>'; });
    h += '</select>';
    h += '<select onchange="VC.requisitos.setFiltroAv(\'balanco\', this.value)" style="padding:4px 8px;border:1px solid var(--borda-media);border-radius:5px;font-size:11px;font-family:inherit;background:#fff;margin-left:4px">';
    [['todos', 'Caudal: Todos'], ['insuflacao', 'Apenas Insufla\u00e7\u00e3o'], ['extracao', 'Apenas Extra\u00e7\u00e3o'], ['mistos', 'Mistos']].forEach(function (op) {
      h += '<option value="' + op[0] + '"' + (self._filtroAv.balanco === op[0] ? ' selected' : '') + '>' + op[1] + '</option>';
    });
    h += '</select>';
    h += '<span style="flex:1"></span>';
    h += '<label style="display:flex;gap:5px;align-items:center;font-size:11px;cursor:pointer">'
       + '<input type="checkbox" ' + (self._mostrarSemDef ? 'checked' : '')
       + ' onchange="VC.requisitos.setMostrarSemDef(this.checked)"> S\u00f3 sem defini\u00e7\u00f5es</label>';
    h += '</div>';

    h += '<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">';
    h += '<button class="btn primario" onclick="VC.requisitos.materializarTudo()"><i class="fa-solid fa-wand-magic-sparkles"></i> Materializar todos os terminais</button>';
    h += '<button class="btn violeta" onclick="VC.requisitos.sugerirAutomatico()"><i class="fa-solid fa-lightbulb"></i> Sugerir defini\u00e7\u00f5es (auto)</button>';
    h += '</div>';

    h += '<div style="display:flex;flex-direction:column;gap:10px">';
    var algumVisivel = false;
    espacos.forEach(function (e, idx) {
      var numSeq = idx + 1;
      var c = VC.calculo.calcularQEspaco(e);
      var g = e.grupoForcado || c.g || 1;
      var defs = e.definicoes || [];
      var semDef = defs.length === 0;
      var somaQ = defs.reduce(function (s, d) { return s + (Number(d.Q_total) || 0); }, 0);
      var Qtotal = c.Q_total || 0;
      var cobPct = Qtotal > 0 ? somaQ / Qtotal : 0;
      var estadoConcluido = (cobPct >= 0.95 && cobPct <= 1.05) && !semDef;
      
      if (self._mostrarSemDef && !semDef) return;
      if (self._filtroAv.estado === 'pendentes' && estadoConcluido) return;
      if (self._filtroAv.estado === 'concluidos' && !estadoConcluido) return;
      if (self._filtroAv.local !== 'todos' && ((e.localizacao && e.localizacao.piso) || '') !== self._filtroAv.local) return;
      if (self._filtroAv.subgrupo !== 'todos' && e.tipo !== self._filtroAv.subgrupo) return;
      if (self._filtroAv.balanco !== 'todos') {
         var hasIns = defs.some(function(d) { return d.rede === 'insuflacao'; });
         var hasExt = defs.some(function(d) { return d.rede === 'extracao' || d.rede === 'extracao_suja'; });
         if (self._filtroAv.balanco === 'insuflacao' && (!hasIns || hasExt)) return;
         if (self._filtroAv.balanco === 'extracao' && (hasIns || !hasExt)) return;
         if (self._filtroAv.balanco === 'mistos' && (!hasIns || !hasExt)) return;
      }
      
      algumVisivel = true;
      var corBorda = semDef ? 'var(--ambar)' : (estadoConcluido ? 'var(--verde)' : 'var(--ambar)');

      h += '<div style="background:var(--superf);border:1px solid var(--borda);border-left:3px solid ' + corBorda + ';border-radius:8px;padding:10px 14px;display:flex;gap:12px;">';
      h += '<div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:var(--primario-soft);color:var(--primario-esc);font-weight:900;font-size:11px;flex-shrink:0;border:1px solid var(--primario-borda);margin-top:4px;">' + numSeq + '</div>';
      h += '<div style="flex:1;min-width:0">';
      h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:8px;flex-wrap:wrap">';
      h += '<div>';
      h += '<div style="font-weight:800;font-size:12.5px;color:var(--texto)">' + VC.utils.esc(e.nome) + '</div>';
      h += '<div style="font-size:10.5px;color:var(--texto-suave)">G' + g + ' \u00b7 ' + VC.utils.esc(e.tipo || '?')
        + ' \u00b7 Q_total ' + VC.utils.fmt(Qtotal, 0) + ' m\u00b3/h'
        + (defs.length > 0 ? ' \u00b7 cobertura ' + Math.round(cobPct * 100) + '%' : '')
        + '</div>';
      h += '</div>';
      h += '<button class="btn btn-mini primario" onclick="VC.requisitos.abrirModal(' + idx + ')"><i class="fa-solid fa-plus"></i> Adicionar defini\u00e7\u00e3o</button>';
      h += '</div>';

      if (semDef) {
        h += '<div style="padding:8px 10px;background:var(--ambar-soft);border-radius:5px;font-size:11px;color:var(--ambar-esc)">'
          + '\u26a0 Sem defini\u00e7\u00f5es. Este espa\u00e7o n\u00e3o gera terminais f\u00edsicos at\u00e9 adicionares pelo menos uma defini\u00e7\u00e3o.'
          + '</div>';
      } else {
        h += '<div style="display:flex;flex-direction:column;gap:5px">';
        defs.forEach(function (d, defIdx) {
          h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:var(--superf2);border-radius:5px;font-size:11px;gap:8px">';
          h += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">';
          var corBadge = d.rede === 'insuflacao' ? 'ok' : (d.rede === 'extracao_suja' ? 'erro' : 'ok');
          h += '<span class="badge ' + corBadge + '" style="font-size:9.5px">' + VC.utils.esc(d.rede) + '</span>';
          h += '<b>' + VC.utils.esc(d.tipo) + '</b>';
          h += '<span>\u00d7 ' + (d.quantidade || 0) + '</span>';
          h += '<span style="color:var(--texto-suave)">Q ' + VC.utils.fmt(d.Q_total || 0, 0) + ' m\u00b3/h</span>';
          h += '</div>';
          h += '<button class="btn btn-mini coral" onclick="VC.requisitos.eliminarDefinicao(' + idx + ', ' + defIdx + ')" title="Eliminar">\u00d7</button>';
          h += '</div>';
});
      h += '</div>';
    }
    h += '</div></div>';
  });
  if (!algumVisivel) {
      h += '<div class="vazio"><i class="fa-solid fa-filter"></i><div class="vazio-titulo">Nenhum espa\u00e7o corresponde ao filtro</div></div>';
    }
    h += '</div>';

    return h;
  },

  setFiltro: function (f) { this._filtro = f; VC.passos.render('requisitos'); },
  setMostrarSemDef: function (v) { this._mostrarSemDef = !!v; VC.passos.render('requisitos'); },

  abrirModal: function (idx) {
    var e = VC.dados.espacos[idx];
    if (!e) return;
    var c = VC.calculo.calcularQEspaco(e);
    var g = e.grupoForcado || c.g || 1;

    var tiposPorGrupo = {
      1: ['Difusor', 'Grelha Insufla\u00e7\u00e3o', 'Grelha Extra\u00e7\u00e3o', 'Difusor Linear', 'Jato de Ar', 'V\u00e1lvula'],
      2: ['Grelha Insufla\u00e7\u00e3o', 'Grelha Extra\u00e7\u00e3o', 'Grelha de Transfer\u00eancia', 'Fresta sob Porta'],
      3: ['Difusor', 'Grelha Extra\u00e7\u00e3o', 'Grelha Insufla\u00e7\u00e3o'],
      4: ['Boca de Extra\u00e7\u00e3o', 'Grelha Extra\u00e7\u00e3o']
    };
    var redesPorTipo = {
      'Difusor': 'insuflacao',
      'Grelha Insufla\u00e7\u00e3o': 'insuflacao',
      'Difusor Linear': 'insuflacao',
      'Jato de Ar': 'insuflacao',
      'V\u00e1lvula': 'insuflacao',
      'Grelha Extra\u00e7\u00e3o': 'extracao',
      'Boca de Extra\u00e7\u00e3o': 'extracao_suja',
      'Grelha de Transfer\u00eancia': 'extracao',
      'Fresta sob Porta': 'extracao'
    };

    var listaTipos = tiposPorGrupo[g] || tiposPorGrupo[1];
    if ((c.Q_total || 0) <= 0) {
      VC.ui.toast('Q_total do espa\u00e7o \u00e9 0 \u2014 define o caudal primeiro no passo Classifica\u00e7\u00e3o.');
      return;
    }

    var modal = document.getElementById('modalGenerico');
    var cont = document.getElementById('modalGenericoConteudo');
    if (!modal || !cont) { VC.ui.toast('Modal n\u00e3o dispon\u00edvel.'); return; }

    var h = '<div class="modal-cabecalho"><h3>Nova defini\u00e7\u00e3o \u00b7 ' + VC.utils.esc(e.nome) + '</h3>';
    h += '<button class="fechar" onclick="VC.ui.fecharModal(\'modalGenerico\')">\u00d7</button></div>';
    h += '<div class="modal-corpo">';
    h += '<div style="padding:8px 12px;background:var(--superf2);border-radius:6px;font-size:11px;margin-bottom:12px">'
      + 'Grupo <b>G' + g + '</b> \u00b7 Q_total do espa\u00e7o: <b>' + VC.utils.fmt(c.Q_total, 0) + ' m\u00b3/h</b>'
      + '</div>';
    h += '<div class="campo-grupo" style="margin-bottom:10px"><label>Tipo de terminal</label>'
      + '<select id="reqTipo" style="width:100%;padding:8px 10px;border:1px solid var(--borda-media);border-radius:5px;font-size:12px;font-family:inherit">';
    listaTipos.forEach(function (t) { h += '<option value="' + t + '">' + t + '</option>'; });
    h += '</select></div>';
    h += '<div class="campo-grupo" style="margin-bottom:10px"><label>Rede</label>'
      + '<select id="reqRede" style="width:100%;padding:8px 10px;border:1px solid var(--borda-media);border-radius:5px;font-size:12px;font-family:inherit">'
      + '<option value="insuflacao">insufla\u00e7\u00e3o</option>'
      + '<option value="extracao">extra\u00e7\u00e3o</option>'
      + '<option value="extracao_suja">extra\u00e7\u00e3o suja</option>'
      + '</select></div>';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">';
    h += '<div class="campo-grupo"><label>Quantidade</label>'
      + '<input type="number" id="reqQtd" value="1" min="1" step="1" style="width:100%;padding:8px 10px;border:1px solid var(--borda-media);border-radius:5px;font-size:13px;font-family:inherit;font-weight:700"></div>';
    h += '<div class="campo-grupo"><label>Q_total desta defini\u00e7\u00e3o</label>'
      + '<input type="number" id="reqQtotal" value="' + Math.round(c.Q_total) + '" min="0" step="1" style="width:100%;padding:8px 10px;border:1px solid var(--borda-media);border-radius:5px;font-size:13px;font-family:inherit;font-weight:700"></div>';
    h += '</div>';
    h += '<div style="padding:8px 12px;background:var(--primario-soft);border-left:3px solid var(--primario);border-radius:5px;font-size:10.5px;color:var(--primario-esc);margin-bottom:10px;line-height:1.55">'
      + '<b>Q_parcela por terminal:</b> <span id="reqQparcela">' + Math.round(c.Q_total) + '</span> m\u00b3/h'
      + '</div>';
    h += '</div>';
    h += '<div class="modal-rodape">'
      + '<button class="btn" onclick="VC.ui.fecharModal(\'modalGenerico\')">Cancelar</button>'
      + '<button class="btn primario" onclick="VC.requisitos.guardarDefinicao(' + idx + ')">Guardar</button>'
      + '</div>';

    cont.innerHTML = h;
    modal.classList.add('on');

    setTimeout(function () {
      var selT = document.getElementById('reqTipo');
      var selR = document.getElementById('reqRede');
      var inpQ = document.getElementById('reqQtd');
      var inpQt = document.getElementById('reqQtotal');
      var spanParcela = document.getElementById('reqQparcela');
      if (!selT || !selR || !inpQ || !inpQt) return;
      function update() {
        var tipo = selT.value;
        if (redesPorTipo[tipo]) selR.value = redesPorTipo[tipo];
        var q = Number(inpQt.value) || 0;
        var n = Math.max(1, Number(inpQ.value) || 1);
        if (spanParcela) spanParcela.textContent = Math.round(q / n * 10) / 10;
      }
      selT.addEventListener('change', update);
      inpQ.addEventListener('input', update);
      inpQt.addEventListener('input', update);
      update();
    }, 30);
  },

    _recalcNextIdDefinicao: function () {
    var max = 1;
    (VC.dados.espacos || []).forEach(function (esp) {
      (esp.definicoes || []).forEach(function (d) {
        var m = String(d.id || '').match(/(\d+)/);
        if (m) max = Math.max(max, parseInt(m[1], 10) + 1);
      });
    });
    VC.dados.nextId.definicao = Math.max(VC.dados.nextId.definicao || 1, max);
  },

  guardarDefinicao: function (idx) {
    var e = VC.dados.espacos[idx];
    if (!e) return;
    this._recalcNextIdDefinicao();
    var tipo = document.getElementById('reqTipo').value;
    var rede = document.getElementById('reqRede').value;
    var qtd = Math.max(1, Number(document.getElementById('reqQtd').value) || 1);
    var qTotal = Math.max(0, Number(document.getElementById('reqQtotal').value) || 0);
    if (qTotal <= 0) { VC.ui.toast('Q_total deve ser > 0.'); return; }

    if (!e.definicoes) e.definicoes = [];
    var sufRede = rede === 'insuflacao' ? 'I' : (rede === 'extracao_suja' ? 'E' : 'X');
    var defId = 'DEF-' + (VC.dados.nextId.definicao++) + '-' + sufRede;
    e.definicoes.push({ id: defId, tipo: tipo, rede: rede, quantidade: qtd, Q_total: qTotal, origem: 'Manual' });

    if (VC.historico) VC.historico.push('Nova defini\u00e7\u00e3o em ' + e.nome);
    VC.estado.forcarSync();
    VC.ui.fecharModal('modalGenerico');
    if (VC._passoAtivo === 'requisitos') VC.passos.render('requisitos');
    VC.ui.toast('Defini\u00e7\u00e3o adicionada a ' + e.nome);
  },

  eliminarDefinicao: function (idx, defIdx) {
    var e = VC.dados.espacos[idx];
    if (!e || !e.definicoes || !e.definicoes[defIdx]) return;
    if (!confirm('Eliminar esta defini\u00e7\u00e3o de ' + e.nome + '?')) return;
    e.definicoes.splice(defIdx, 1);
    if (VC.historico) VC.historico.push('Defini\u00e7\u00e3o removida de ' + e.nome);
    VC.estado.forcarSync();
    if (VC._passoAtivo === 'requisitos') VC.passos.render('requisitos');
    VC.ui.toast('Defini\u00e7\u00e3o eliminada.');
  },

  materializarTudo: function () {
    if (!confirm('Materializar todos os terminais?\n\nIsto cria os terminais f\u00edsicos para todas as defini\u00e7\u00f5es.\nEspa\u00e7os sem defini\u00e7\u00f5es n\u00e3o geram terminais.')) return;
    var r = { criados: 0, removidos: 0, respeitados: 0 };
    try {
      if (VC.calculo && typeof VC.calculo.materializarTudo === 'function') r = VC.calculo.materializarTudo();
    } catch (err) { if (VC.debug) VC.debug.erro(err); }
    VC.estado.forcarSync();
    if (VC._passoAtivo === 'requisitos') VC.passos.render('requisitos');
    var msg = 'Materializa\u00e7\u00e3o: ' + (r.criados || 0) + ' criados';
    if (r.removidos) msg += ' \u00b7 ' + r.removidos + ' removidos';
    if (r.respeitados) msg += ' \u00b7 ' + r.respeitados + ' respeitados';
    VC.ui.toast(msg);
  },

    sugerirAutomatico: function () {
    this._recalcNextIdDefinicao();
    var espacos = VC.dados.espacos || [];
    var semDef = espacos.filter(function (e) { return (e.definicoes || []).length === 0; });
    if (!semDef.length) { VC.ui.toast('Todos os espa\u00e7os j\u00e1 t\u00eam defini\u00e7\u00f5es.'); return; }
    if (!confirm('Sugerir defini\u00e7\u00f5es autom\u00e1ticas para ' + semDef.length + ' espa\u00e7o(s) sem defini\u00e7\u00f5es?\n\n'
      + 'Regra:\n'
      + '\u2022 G1/G3 \u2192 1 difusor insufla\u00e7\u00e3o + 1 grelha extra\u00e7\u00e3o\n'
      + '\u2022 G2 \u2192 isento (nenhuma defini\u00e7\u00e3o)\n'
      + '\u2022 G4 \u2192 1 boca extra\u00e7\u00e3o suja')) return;

    var n = 0;
    semDef.forEach(function (e) {
      var c = VC.calculo.calcularQEspaco(e);
      var g = e.grupoForcado || c.g || 1;
      var Q = c.Q_total || 0;
      if (Q <= 0) return;
      if (!e.definicoes) e.definicoes = [];
      if (g === 4) {
        e.definicoes.push({ id: 'DEF-' + (VC.dados.nextId.definicao++) + '-E', tipo: 'Boca de Extra\u00e7\u00e3o', rede: 'extracao_suja', quantidade: 1, Q_total: Math.round(Q), origem: 'Auto' });
        n++;
      } else if (g === 1 || g === 3) {
        e.definicoes.push({ id: 'DEF-' + (VC.dados.nextId.definicao++) + '-I', tipo: 'Difusor', rede: 'insuflacao', quantidade: Math.max(1, Math.ceil(Q / 350)), Q_total: Math.round(Q), origem: 'Auto' });
        e.definicoes.push({ id: 'DEF-' + (VC.dados.nextId.definicao++) + '-X', tipo: 'Grelha Extra\u00e7\u00e3o', rede: 'extracao', quantidade: Math.max(1, Math.ceil(Q / 300)), Q_total: Math.round(Q), origem: 'Auto' });
        n++;
      }
    });
    if (VC.historico) VC.historico.push('Sugest\u00f5es autom\u00e1ticas em ' + n + ' espa\u00e7os');
    VC.estado.forcarSync();
    if (VC._passoAtivo === 'requisitos') VC.passos.render('requisitos');
    VC.ui.toast(n + ' espa\u00e7o(s) com defini\u00e7\u00f5es sugeridas.');
  },

  coberturaGlobal: function () {
    var espacos = VC.dados.espacos || [];
    var detalhe = [];
    var totalNec = 0, totalCob = 0, okCount = 0, semReqCount = 0;
    espacos.forEach(function (e) {
      var c = VC.calculo.calcularQEspaco(e);
      var g = e.grupoForcado || c.g || 1;
      var defs = e.definicoes || [];
      var somaQ = defs.reduce(function (s, d) { return s + (Number(d.Q_total) || 0); }, 0);
      var Qnec = c.Q_total || 0;
      var nReq = defs.length;
      if (nReq === 0) semReqCount++;
      var cobertura = Qnec > 0 ? somaQ / Qnec : 0;
      var estado;
      if (g === 2 && nReq === 0) estado = 'Isento';
      else if (nReq === 0) estado = 'SEM DEF';
      else if (cobertura >= 0.95 && cobertura <= 1.05) { estado = 'OK'; okCount++; }
      else if (cobertura < 0.95) estado = 'SUB';
      else estado = 'SOBRE';
      totalNec += Qnec;
      totalCob += somaQ;
      detalhe.push({ espacoNome: e.nome, nRequisitos: nReq, somaQ: somaQ, Q_reg: c.Q_normas || 0, Q_conforto: c.Q_ConTerm || 0, QAI: c.QAI_projeto || 0, Q_nec: Qnec, estado: estado, g: g });
    });
    return { totalNec: totalNec, totalCob: totalCob, cobertura: totalNec > 0 ? totalCob / totalNec : 0, ok: okCount, semReq: semReqCount, totalEspacos: espacos.length, detalhe: detalhe };
  }
};

console.log('%c[VentCondutas V11.0.04] 11-requisitos carregado \u00b7 UI de Defini\u00e7\u00e3o de Terminais (Kanban + modal + auto-sugest\u00e3o)',
  'color:#6d8fb0;font-weight:bold;background:#eaf1f7;padding:3px 6px;border-radius:3px');

})();