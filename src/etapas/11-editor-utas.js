/* ============================================================
   VENTCONDUTAS V10.2.5 · 11-editor-utas
   Passo "Dimensionamento de UTAs".
   Lista de UTAs editavel (parametros, componentes, curva)
   + resultados (Q, dp, SFPint, P, ponto de funcionamento).
   ============================================================ */
(function () {
'use strict';
var VC = window.VC;
if (!VC) return;
VC._boot = VC._boot || { partes: [] };
VC._boot.partes.push('11-editor-utas');

VC.editorUtas = {
  _expandida: {},

  render: function () {
    var utas = VC.dados.utas || [];
    if (!utas.length) {
      return '<div class="cartao-titulo"><i class="fa-solid fa-fan"></i> Dimensionamento de UTAs</div>'
        + '<div class="vazio"><i class="fa-solid fa-fan"></i>'
        + '<div class="vazio-titulo">Sem UTAs</div>'
        + '<div>Cria a primeira UTA para come\u00e7ar.</div>'
        + '<div class="vazio-acoes" style="margin-top:10px">'
        + '<button class="btn primario" onclick="VC.editorUtas.criarUta(\'insuflacao\')"><i class="fa-solid fa-plus"></i> UTA insufla\u00e7\u00e3o</button>'
        + '<button class="btn ambar" onclick="VC.editorUtas.criarUta(\'extracao\')"><i class="fa-solid fa-plus"></i> UTA extra\u00e7\u00e3o</button>'
        + '</div></div>';
    }

    var totalP = 0, sfpMax = 0, comErro = 0;
    utas.forEach(function (u) {
      totalP += Number(u.P_motor) || 0;
      if ((Number(u.sfpInt) || 0) > sfpMax) sfpMax = Number(u.sfpInt) || 0;
      if (u.status === 'N\u00c3O CONF.') comErro++;
    });

    var self = this;
    var h = '<div class="cartao-titulo"><i class="fa-solid fa-fan"></i> Dimensionamento de UTAs</div>';
    h += '<p style="font-size:11.5px;color:var(--texto-med);margin-bottom:10px">'
      + 'Cada UTA agrupa o ventilador + componentes (filtros, baterias, recuperador). '
      + 'O Q \u00e9 a soma dos caudais dos ramais que serve. O SFPint de cada UTA \u00e9 comparado com o limite do Reg. (UE) 1253/2014 (Ecodesign) para o seu tipo de unidade.</p>';

    h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px">';
    h += '<div style="background:var(--superf2);border:1px solid var(--borda);border-left:3px solid var(--primario);border-radius:5px;padding:8px 10px"><div style="font-size:9.5px;font-weight:800;color:var(--texto-suave);text-transform:uppercase">UTAs</div><div style="font-size:16px;font-weight:900;color:var(--texto);margin-top:3px">' + utas.length + '</div></div>';
    h += '<div style="background:var(--superf2);border:1px solid var(--borda);border-left:3px solid var(--' + (comErro > 0 ? 'coral' : 'verde') + ');border-radius:5px;padding:8px 10px"><div style="font-size:9.5px;font-weight:800;color:var(--texto-suave);text-transform:uppercase">N\u00e3o conforme</div><div style="font-size:16px;font-weight:900;color:var(--texto);margin-top:3px">' + comErro + '</div></div>';
    h += '<div style="background:var(--superf2);border:1px solid var(--borda);border-left:3px solid var(--primario);border-radius:5px;padding:8px 10px"><div style="font-size:9.5px;font-weight:800;color:var(--texto-suave);text-transform:uppercase">SFPint m\u00e1x</div><div style="font-size:16px;font-weight:900;color:var(--texto);margin-top:3px">' + VC.utils.fmt(sfpMax, 0) + '</div></div>';
    h += '<div style="background:var(--superf2);border:1px solid var(--borda);border-left:3px solid var(--primario);border-radius:5px;padding:8px 10px"><div style="font-size:9.5px;font-weight:800;color:var(--texto-suave);text-transform:uppercase">P total</div><div style="font-size:16px;font-weight:900;color:var(--texto);margin-top:3px">' + VC.utils.fmt(totalP, 0) + ' W</div></div>';
    h += '</div>';

    h += '<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">';
    h += '<button class="btn primario" onclick="VC.editorUtas.criarUta(\'insuflacao\')"><i class="fa-solid fa-plus"></i> UTA insufla\u00e7\u00e3o</button>';
    h += '<button class="btn ambar" onclick="VC.editorUtas.criarUta(\'extracao\')"><i class="fa-solid fa-plus"></i> UTA extra\u00e7\u00e3o</button>';
    h += '<button class="btn violeta" onclick="VC.estado.forcarSync(); VC.passos.render(\'utas\');"><i class="fa-solid fa-rotate"></i> Recalcular</button>';
    h += '</div>';

    utas.forEach(function (u) {
      var expandida = !!self._expandida[u.id];
      var corBorda = u.status === 'OK' ? 'var(--verde)' : (u.status === 'ATEN\u00c7\u00c3O' ? 'var(--ambar)' : 'var(--coral)');
      var corRede = u.rede === 'insuflacao' ? 'primario' : (u.rede === 'extracao_suja' ? 'coral' : 'verde');

      h += '<div style="background:var(--superf);border:1px solid var(--borda);border-left:3px solid ' + corBorda + ';border-radius:8px;padding:10px 14px;margin-bottom:10px">';
      h += '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">';
      h += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">';
      h += '<span class="badge ' + corRede + '" style="font-size:9.5px">' + u.rede + '</span>';
      h += '<b style="font-size:12.5px">' + VC.utils.esc(u.nome) + '</b>';
      h += '<span style="font-size:10.5px;color:var(--texto-suave)">' + VC.utils.esc(u.zona || '\u2014') + '</span>';
      if (u.status === 'OK') h += '<span class="badge ok">OK</span>';
      else if (u.status === 'N\u00c3O CONF.') h += '<span class="badge erro">N\u00c3O CONF.</span>';
      else h += '<span class="badge atencao">' + VC.utils.esc(u.status || 'PENDENTE') + '</span>';
      h += '</div>';
      h += '<button class="btn btn-mini" onclick="VC.editorUtas.toggle(\'' + u.id + '\')">' + (expandida ? '\u25b2' : '\u25bc') + '</button>';
      h += '</div>';

      h += '<div style="display:flex;gap:10px;flex-wrap:wrap;font-size:11px;margin-top:6px;color:var(--texto-med)">';
      h += '<span>Q <b>' + VC.utils.fmt((u.Q || 0) * 3600, 0) + '</b> m\u00b3/h</span>';
      h += '<span>\u0394p ext <b>' + VC.utils.fmt(u.dpExt, 0) + '</b> Pa</span>';
      h += '<span>\u0394p int <b>' + VC.utils.fmt(u.dpInt, 0) + '</b> Pa</span>';
      h += '<span>SFPint <b>' + VC.utils.fmt(u.sfpInt, 0) + '</b>' + (u.sfpClass ? ' / ' + (u.sfpClass.limite != null ? u.sfpClass.limite : 'sem limite') : '') + '</span>';
      h += '<span>P <b>' + VC.utils.fmt(u.P_motor, 0) + '</b> W</span>';
      h += '</div>';

      if (expandida) {
        h += '<div style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--borda-media)">';

        h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px">';
        h += self._campo('Nome', u.nome, 'text', 'VC.editorUtas.editar(\'' + u.id + '\', \'nome\', this.value)');
        h += self._campo('Zona', u.zona || '', 'text', 'VC.editorUtas.editar(\'' + u.id + '\', \'zona\', this.value)');
        h += self._campo('Efici\u00eancia \u03b7', u.eta || 0.65, 'number', 'VC.editorUtas.editar(\'' + u.id + '\', \'eta\', Number(this.value))');
        h += self._campo('\u03b7 recuperador', u.etaRec || 0.75, 'number', 'VC.editorUtas.editar(\'' + u.id + '\', \'etaRec\', Number(this.value))');
        h += '</div>';
        h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px">';
        h += self._campo('fs (fator servi\u00e7o)', u.fs || 1.15, 'number', 'VC.editorUtas.editar(\'' + u.id + '\', \'fs\', Number(this.value))');
        h += self._campo('Transmiss\u00e3o', u.transmissao || 1, 'number', 'VC.editorUtas.editar(\'' + u.id + '\', \'transmissao\', Number(this.value))');
        h += self._campo('Ativo', u.ativo ? 'sim' : 'n\u00e3o', 'text', '');
        h += '</div>';
        h += self._selectTipoUV(u);
        if (u.sfpClass && u.sfpClass.nota) h += '<div style="font-size:10.5px;color:var(--texto-suave);margin:-4px 0 10px">' + VC.utils.esc(u.sfpClass.nota) + '</div>';

        h += '<div style="margin-bottom:10px"><div style="font-size:10.5px;font-weight:800;color:var(--texto-med);text-transform:uppercase;margin-bottom:4px">Curva do ventilador</div>';
        var cf = u.curvaFabricante || {};
        h += self._selectCurva(u.id, cf.fabricante, cf.serie, cf.modelo);
        h += '</div>';

        h += '<div style="margin-bottom:10px"><div style="font-size:10.5px;font-weight:800;color:var(--texto-med);text-transform:uppercase;margin-bottom:4px">Componentes</div>';
        h += '<div class="tabela-wrap"><table class="tabela densa"><thead><tr>';
        h += '<th>Nome</th><th>Tipo</th><th>\u0394p limpo</th><th>\u0394p final</th><th>\u03b6</th><th></th>';
        h += '</tr></thead><tbody>';
        (u.componentes || []).forEach(function (c, idx) {
          h += '<tr>';
          h += '<td><input class="celula" type="text" value="' + VC.utils.esc(c.nome || '') + '" onchange="VC.editorUtas.editarComp(\'' + u.id + '\', ' + idx + ', \'nome\', this.value)" style="padding:3px 6px;border:1px solid var(--borda-media);border-radius:4px;font-size:10.5px;width:100%"></td>';
          h += '<td style="font-size:10.5px">' + VC.utils.esc(c.tipo || '') + '</td>';
          h += '<td><input class="num-int" type="number" value="' + (c.deltaP || 0) + '" onchange="VC.editorUtas.editarComp(\'' + u.id + '\', ' + idx + ', \'deltaP\', Number(this.value))" style="padding:3px 6px;border:1px solid var(--borda-media);border-radius:4px;font-size:10.5px"></td>';
          h += '<td><input class="num-int" type="number" value="' + (c.deltaP_final || 0) + '" onchange="VC.editorUtas.editarComp(\'' + u.id + '\', ' + idx + ', \'deltaP_final\', Number(this.value))" style="padding:3px 6px;border:1px solid var(--borda-media);border-radius:4px;font-size:10.5px"></td>';
          h += '<td><input class="num-1d" type="number" step="0.1" value="' + (c.zeta || 0) + '" onchange="VC.editorUtas.editarComp(\'' + u.id + '\', ' + idx + ', \'zeta\', Number(this.value))" style="padding:3px 6px;border:1px solid var(--borda-media);border-radius:4px;font-size:10.5px"></td>';
          h += '<td><button class="btn btn-mini coral" onclick="VC.editorUtas.eliminarComp(\'' + u.id + '\', ' + idx + ')">\u00d7</button></td>';
          h += '</tr>';
        });
        h += '</tbody></table></div>';
        h += '<button class="btn btn-mini" onclick="VC.editorUtas.adicionarComp(\'' + u.id + '\')" style="margin-top:6px">+ Adicionar componente</button>';
        h += '</div>';

        if (u.pontoFunc) {
          h += '<div style="padding:8px 12px;background:var(--primario-soft);border-left:3px solid var(--primario);border-radius:5px;font-size:11px;color:var(--primario-esc);line-height:1.55">';
          h += '<b>Ponto de funcionamento:</b> Q=' + VC.utils.fmt(u.pontoFunc.Qmh, 0) + ' m\u00b3/h \u00b7 \u0394p=' + VC.utils.fmt(u.pontoFunc.dP, 0) + ' Pa \u00b7 P=' + VC.utils.fmt(u.pontoFunc.P_motor, 0) + ' W';
          if (u.pontoFunc.curvaFabricante) h += ' \u00b7 curva ' + VC.utils.esc(u.pontoFunc.curvaFabricante.fabricante + ' ' + u.pontoFunc.curvaFabricante.modelo);
          h += '</div>';
        }

        h += '<div style="margin-top:10px;display:flex;justify-content:flex-end">';
        h += '<button class="btn btn-mini coral" onclick="VC.editorUtas.eliminarUta(\'' + u.id + '\')"><i class="fa-solid fa-trash"></i> Eliminar UTA</button>';
        h += '</div>';

        h += '</div>';
      }

      h += '</div>';
    });

    return h;
  },

  _selectTipoUV: function (u) {
    var tipos = VC.conhecimento.tabelas.SFP_TIPOS || {};
    var atual = VC.normas.tipoUVPadrao(u);
    var h = '<div style="margin-bottom:10px"><label style="display:block;font-size:10px;font-weight:800;color:var(--texto-suave);text-transform:uppercase;margin-bottom:3px">Tipo de unidade (Ecodesign)</label>';
    h += '<select class="input" style="width:100%" onchange="VC.editorUtas.editar(\'' + u.id + '\', \'tipoUV\', this.value)">';
    Object.keys(tipos).forEach(function (k) { h += '<option value="' + k + '"' + (k === atual ? ' selected' : '') + '>' + VC.utils.esc(tipos[k]) + '</option>'; });
    return h + '</select></div>';
  },

  _campo: function (label, valor, tipo, onchange) {
    var v = (valor == null) ? '' : String(valor);
    return '<div style="display:flex;flex-direction:column;gap:3px">'
      + '<label style="font-size:10px;font-weight:800;color:var(--texto-med);text-transform:uppercase">' + label + '</label>'
      + '<input type="' + tipo + '" value="' + VC.utils.esc(v) + '" onchange="' + onchange + '" style="padding:5px 8px;border:1px solid var(--borda-media);border-radius:5px;font-size:12px;font-family:inherit">'
      + '</div>';
  },

  _selectCurva: function (utaId, fabAtual, serieAtual, modAtual) {
    var cf = VC.curvasFabricantes;
    if (!cf) return '<div style="font-size:11px;color:var(--texto-suave)">Curvas n\u00e3o carregadas.</div>';
    var fabs = cf.fabricantes() || [];
    var series = fabAtual ? (cf.series(fabAtual) || []) : [];
    var mods = (fabAtual && serieAtual) ? (cf.modelos(fabAtual, serieAtual) || []) : [];

    var h = '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">';
    h += '<select onchange="VC.editorUtas.aplicarCurva(\'' + utaId + '\', this.value, \'\', \'\')" style="padding:6px 8px;border:1px solid var(--borda-media);border-radius:5px;font-size:11px;font-family:inherit">';
    h += '<option value="">Fabricante\u2026</option>';
    fabs.forEach(function (f) { h += '<option value="' + VC.utils.esc(f) + '"' + (f === fabAtual ? ' selected' : '') + '>' + VC.utils.esc(f) + '</option>'; });
    h += '</select>';
    h += '<select ' + (series.length === 0 ? 'disabled' : '') + ' onchange="VC.editorUtas.aplicarCurva(\'' + utaId + '\', \'' + VC.utils.esc(fabAtual || '') + '\', this.value, \'\')" style="padding:6px 8px;border:1px solid var(--borda-media);border-radius:5px;font-size:11px;font-family:inherit">';
    h += '<option value="">S\u00e9rie\u2026</option>';
    series.forEach(function (s) { h += '<option value="' + VC.utils.esc(s) + '"' + (s === serieAtual ? ' selected' : '') + '>' + VC.utils.esc(s) + '</option>'; });
    h += '</select>';
    h += '<select ' + (mods.length === 0 ? 'disabled' : '') + ' onchange="VC.editorUtas.aplicarCurva(\'' + utaId + '\', \'' + VC.utils.esc(fabAtual || '') + '\', \'' + VC.utils.esc(serieAtual || '') + '\', this.value)" style="padding:6px 8px;border:1px solid var(--borda-media);border-radius:5px;font-size:11px;font-family:inherit">';
    h += '<option value="">Modelo\u2026</option>';
    mods.forEach(function (m) { h += '<option value="' + VC.utils.esc(m) + '"' + (m === modAtual ? ' selected' : '') + '>' + VC.utils.esc(m) + '</option>'; });
    h += '</select>';
    h += '</div>';
    return h;
  },

  toggle: function (utaId) {
    this._expandida[utaId] = !this._expandida[utaId];
    VC.passos.render('utas');
  },

  editar: function (utaId, campo, valor) {
    var u = (VC.dados.utas || []).find(function (x) { return x.id === utaId; });
    if (!u) return;
    u[campo] = valor;
    VC.estado.forcarSync();
    VC.passos.render('utas');
  },

  editarComp: function (utaId, idx, campo, valor) {
    var u = (VC.dados.utas || []).find(function (x) { return x.id === utaId; });
    if (!u || !u.componentes || !u.componentes[idx]) return;
    u.componentes[idx][campo] = valor;
    VC.estado.forcarSync();
    VC.passos.render('utas');
  },

  adicionarComp: function (utaId) {
    var u = (VC.dados.utas || []).find(function (x) { return x.id === utaId; });
    if (!u) return;
    if (!u.componentes) u.componentes = [];
    var modelo = prompt('Tipo de componente:\n1 = Filtro G4\n2 = Filtro F7\n3 = Filtro F9\n4 = Recuperador\n5 = Bateria Aquecimento\n6 = Bateria Arrefecimento\n7 = Silenciador\n8 = Ventilador\n9 = Outro', '1');
    if (!modelo) return;
    var templates = {
      '1': { nome: 'Pr\u00e9-filtro G4', tipo: 'Filtro G4', deltaP: 35, deltaP_final: 90, zeta: 2.0, obs: 'ISO 16890' },
      '2': { nome: 'Filtro fino F7', tipo: 'Filtro F7', deltaP: 55, deltaP_final: 160, zeta: 2.5, obs: 'ISO 16890' },
      '3': { nome: 'Filtro F9', tipo: 'Filtro F9', deltaP: 85, deltaP_final: 200, zeta: 3.0, obs: 'ISO 16890' },
      '4': { nome: 'Recuperador', tipo: 'Recuperador', deltaP: 115, deltaP_final: 130, zeta: 1.2, obs: '\u03b7 75%' },
      '5': { nome: 'Bateria aquecimento', tipo: 'Bateria Aquec.', deltaP: 45, deltaP_final: 50, zeta: 0.8, obs: '' },
      '6': { nome: 'Bateria arrefecimento', tipo: 'Bateria Arref.', deltaP: 60, deltaP_final: 70, zeta: 0.8, obs: '' },
      '7': { nome: 'Silenciador', tipo: 'Silenciador', deltaP: 30, deltaP_final: 40, zeta: 0.5, obs: '' },
      '8': { nome: 'Ventilador', tipo: 'Ventilador', deltaP: 0, deltaP_final: 0, zeta: 0, obs: 'IE3' },
      '9': { nome: 'Outro', tipo: 'Outro', deltaP: 0, deltaP_final: 0, zeta: 0, obs: '' }
    };
    var tpl = templates[modelo] || templates['9'];
    var novo = { id: VC.utils.uid('COMP'), nome: tpl.nome, tipo: tpl.tipo, deltaP: tpl.deltaP, deltaP_final: tpl.deltaP_final, zeta: tpl.zeta, obs: tpl.obs };
    u.componentes.push(novo);
    VC.estado.forcarSync();
    VC.passos.render('utas');
  },

  eliminarComp: function (utaId, idx) {
    var u = (VC.dados.utas || []).find(function (x) { return x.id === utaId; });
    if (!u || !u.componentes) return;
    if (!confirm('Remover este componente?')) return;
    u.componentes.splice(idx, 1);
    VC.estado.forcarSync();
    VC.passos.render('utas');
  },

  aplicarCurva: function (utaId, fab, serie, mod) {
    var u = (VC.dados.utas || []).find(function (x) { return x.id === utaId; });
    if (!u) return;
    if (!fab || !serie || !mod) {
      u.curvaFabricante = { fabricante: fab || '', serie: serie || '', modelo: mod || '' };
      u.curva = [];
      VC.passos.render('utas');
      return;
    }
    if (VC.curvasFabricantes && typeof VC.curvasFabricantes.aplicarNaUTA === 'function') {
      var ok = VC.curvasFabricantes.aplicarNaUTA(u, fab, serie, mod);
      if (ok) {
        VC.estado.forcarSync();
        VC.passos.render('utas');
        VC.ui.toast('Curva ' + fab + ' ' + mod + ' aplicada a ' + u.nome);
        return;
      }
    }
    VC.ui.toast('Curva n\u00e3o encontrada.');
  },

  criarUta: function (rede) {
    var nome = prompt('Nome da UTA:', 'UTA-' + rede);
    if (!nome) return;
    var u = VC.uta.criar(nome, rede, '');
    u.componentes = (rede === 'insuflacao') ? VC.uta.componentesPadrao() : VC.uta.componentesExtracao();
    if (VC.historico) VC.historico.push('Nova UTA: ' + nome);
    VC.estado.forcarSync();
    VC.passos.render('utas');
    VC.ui.toast('UTA ' + nome + ' criada.');
  },

  eliminarUta: function (utaId) {
    if (!confirm('Eliminar esta UTA? Os ramais que a servem ficam sem UTA.')) return;
    VC.dados.utas = (VC.dados.utas || []).filter(function (x) { return x.id !== utaId; });
    (VC.dados.ramais || []).forEach(function (r) {
      if (r.utaRef === utaId) r.utaRef = null;
    });
    if (VC.historico) VC.historico.push('UTA removida: ' + utaId);
    VC.estado.forcarSync();
    VC.passos.render('utas');
    VC.ui.toast('UTA eliminada.');
  }
};

console.log('%c[VentCondutas V11.0.05] 11-editor-utas carregado \u00b7 Dimensionamento de UTAs',
  'color:#6d8fb0;font-weight:bold;background:#eaf1f7;padding:3px 6px;border-radius:3px');

})();