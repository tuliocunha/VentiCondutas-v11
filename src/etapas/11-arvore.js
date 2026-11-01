/* ============================================================
   VENTCONDUTAS V10.2.9 · 11-arvore
   Modo "Arvore de Rede" (menu topo).
   4 vistas facetadas + filtros + drag-drop de ramais + painel.
   Reutiliza VC.topologia.agruparPor / VC.topologia.mover / VC.snap.
   ============================================================ */
(function () {
'use strict';
var VC = window.VC;
if (!VC) return;
VC._boot = VC._boot || { partes: [] };
VC._boot.partes.push('11-arvore');

VC.arvore = {
  _vista: 'piso-zona-rede',
  _filtroRede: 'todas',
  _selecionado: null,
  _nos: [],
  _expandidos: {},
  _arrastando: null,

  _VISTAS: {
    'piso-zona-rede':  { label: 'Piso \u2192 Zona \u2192 Rede',  criterios: ['pisoFisico', 'zona', 'rede'] },
    'rede-piso-zona':  { label: 'Rede \u2192 Piso \u2192 Zona',  criterios: ['rede', 'pisoFisico', 'zona'] },
    'uta-piso-rede':   { label: 'UTA \u2192 Piso \u2192 Rede',   criterios: ['utaRef', 'pisoFisico', 'rede'] },
    'zona-rede':       { label: 'Zona \u2192 Rede',             criterios: ['zona', 'rede'] }
  },

  render: function () {
    var self = this;
    var contNos = document.getElementById('arvoreNos');
    var contPainel = document.getElementById('arvorePainel');
    if (!contNos || !contPainel) return;

    // Garantir wrapper interno do painel (para preservar Undo/Redo do 10-historico)
    var wrapper = document.getElementById('arvorePainelConteudo');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = 'arvorePainelConteudo';
      wrapper.style.cssText = 'flex:1;overflow-y:auto;min-height:0';
      contPainel.appendChild(wrapper);
    }

    if (VC.flags && VC.flags.topologiaFacetada && VC.topologia && VC.topologia.facetas) {
      try { VC.topologia.facetas.aplicarATodos(); } catch (e) {}
    }

    var ramais = VC.dados.ramais || [];
    if (!ramais.length) {
      contNos.innerHTML = '<div class="arvore-vazio" style="text-align:center;padding:60px 20px;color:var(--texto-suave);font-size:12px">'
        + '<i class="fa-solid fa-sitemap" style="font-size:40px;opacity:.25;margin-bottom:14px;display:block;color:var(--primario)"></i>'
        + '<div style="font-weight:800;color:var(--texto);margin-bottom:6px">Arvore vazia</div>'
        + '<div>Gera a topologia no passo <b>Topologia dos Ramais</b>.</div></div>';
      wrapper.innerHTML = self._renderPainelVazio();
      return;
    }

    // Toolbar
    var toolbar = '';
    toolbar += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;padding:8px 10px;background:var(--superf);border:1px solid var(--borda);border-radius:6px">';
    toolbar += '<span style="font-size:10.5px;font-weight:800;color:var(--texto-med);text-transform:uppercase;align-self:center">Vista:</span>';
    Object.keys(self._VISTAS).forEach(function (k) {
      var ativo = self._vista === k;
      toolbar += '<button class="btn btn-mini ' + (ativo ? 'primario' : '') + '" onclick="VC.arvore.setVista(\'' + k + '\')">' + self._VISTAS[k].label + '</button>';
    });
    toolbar += '</div>';

    toolbar += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;padding:8px 10px;background:var(--superf2);border:1px solid var(--borda);border-radius:6px;align-items:center">';
    toolbar += '<span style="font-size:10.5px;font-weight:800;color:var(--texto-med);text-transform:uppercase">Rede:</span>';
    [['todas','Todas'],['insuflacao','Insufla\u00e7\u00e3o'],['extracao','Extra\u00e7\u00e3o'],['extracao_suja','Ext. suja']].forEach(function (opt) {
      var ativo = self._filtroRede === opt[0];
      toolbar += '<button class="btn btn-mini ' + (ativo ? 'primario' : '') + '" onclick="VC.arvore.setFiltro(\'' + opt[0] + '\')">' + opt[1] + '</button>';
    });
    toolbar += '<span style="flex:1"></span>';
    toolbar += '<span style="font-size:10.5px;color:var(--texto-suave)">' + ramais.length + ' ramais</span>';
    toolbar += '</div>';

    // Construir árvore via VC.topologia.agruparPor
    var criterios = self._VISTAS[self._vista].criterios;
    var filtros = {};
    var fonte = 'ramais';
    var ramaisFiltrados = ramais.slice();
    if (self._filtroRede !== 'todas') {
      ramaisFiltrados = ramaisFiltrados.filter(function (r) { return (r.rede || 'insuflacao') === self._filtroRede; });
    }

    var arv;
    try {
      arv = VC.topologia.agruparPor({ criterios: criterios, filtros: filtros, fonte: 'ramais' });
    } catch (err) {
      if (VC.debug) VC.debug.erro(err);
      arv = { ordem: [], nos: {}, raiz: { id: '__root__', filhos: [], itens: [] } };
    }

    self._nos = [];
    (arv.ordem || []).forEach(function (id) {
      var no = arv.nos[id];
      if (!no) return;
      if (no.nivel === 0) return;
      // Filtrar por rede se aplicavel
      if (self._filtroRede !== 'todas' && no.criterio === 'rede' && String(no.valor) !== self._filtroRede) return;
      self._nos.push(no);
    });

    // Render HTML da árvore
    var h = toolbar;
    h += '<div style="background:var(--superf);border:1px solid var(--borda);border-radius:8px;padding:10px 14px">';
    h += self._renderArvoreHTML(arv, '__root__', 0);
    h += '</div>';

    contNos.innerHTML = h;

    // Painel lateral
    wrapper.innerHTML = self._renderPainelDetalhes();
  },

  _renderArvoreHTML: function (arv, idPai, nivel) {
    var self = this;
    var no = arv.nos[idPai];
    if (!no) return '';
    var h = '';
    var filhos = no.filhos || [];
    var itens = no.itens || [];

    filhos.forEach(function (idFilho) {
      var f = arv.nos[idFilho];
      if (!f) return;
      if (self._filtroRede !== 'todas' && f.criterio === 'rede' && String(f.valor) !== self._filtroRede) return;
      var expandido = self._expandidos[idFilho] !== false;
      var padLeft = 8 + nivel * 16;
      var agg = f.agregado || { Q_total: 0, nItens: 0, nTerminais: 0, dpMax: 0 };

      h += '<div style="padding:5px 8px 5px ' + padLeft + 'px;border-bottom:1px solid var(--borda);cursor:pointer;user-select:none;background:var(--superf2);border-radius:4px;margin-bottom:2px" onclick="VC.arvore.toggle(\'' + idFilho + '\')">';
      h += '<span style="display:inline-block;width:12px;color:var(--texto-med)">' + (expandido ? '\u25bc' : '\u25b6') + '</span>';
      h += '<span style="font-weight:800;font-size:11.5px;color:var(--texto);margin-left:4px">' + VC.utils.esc(String(f.valor)) + '</span>';
      h += ' <span style="font-size:10px;color:var(--texto-suave);font-weight:600;text-transform:uppercase;margin-left:6px">' + VC.utils.esc(f.criterio || '') + '</span>';
      h += ' <span style="font-size:10.5px;font-family:ui-monospace,monospace;color:var(--primario-esc);margin-left:10px">' + VC.utils.fmt(agg.Q_total, 0) + ' m\u00b3/h \u00b7 ' + agg.nItens + ' ram \u00b7 ' + agg.nTerminais + ' term</span>';
      h += '</div>';

      if (expandido) {
        h += self._renderArvoreHTML(arv, idFilho, nivel + 1);

        if (itens.length) {
          itens.forEach(function (ramal) {
            if (!ramal || !ramal.nome) return;
            var padIt = 8 + (nivel + 1) * 16;
            var sel = self._selecionado && self._selecionado.nome === ramal.nome;
            var corRede = ramal.rede === 'insuflacao' ? 'var(--primario)' : (ramal.rede === 'extracao_suja' ? 'var(--coral)' : 'var(--verde)');
            h += '<div draggable="true" data-ramal="' + VC.utils.esc(ramal.nome) + '"'
              + ' ondragstart="VC.arvore._dragStart(event, \'' + VC.utils.esc(ramal.nome) + '\')"'
              + ' ondragover="VC.arvore._dragOver(event)"'
              + ' ondrop="VC.arvore._drop(event, \'' + VC.utils.esc(ramal.nome) + '\')"'
              + ' ondragend="VC.arvore._dragEnd(event)"'
              + ' onclick="VC.arvore.selecionar(\'' + VC.utils.esc(ramal.nome) + '\')"'
              + ' style="padding:4px 8px 4px ' + padIt + 'px;display:flex;align-items:center;gap:8px;border-left:3px solid ' + corRede + ';background:' + (sel ? 'var(--primario-soft)' : 'transparent') + ';cursor:pointer;border-radius:3px;margin:1px 0">';
            h += '<span style="font-family:ui-monospace,monospace;font-weight:800;font-size:11.5px;color:' + corRede + '">' + VC.utils.esc(ramal.nome) + '</span>';
            h += '<span style="font-size:10px;color:var(--texto-suave)">' + VC.utils.esc(ramal.rede || '?') + '</span>';
            h += '<span style="font-size:10.5px;font-family:ui-monospace,monospace;color:var(--texto-med);margin-left:auto">\u00d8' + (ramal.Dcom || '\u2014') + ' \u00b7 Q=' + VC.utils.fmt(ramal.Q || 0, 0) + ' \u00b7 ' + VC.utils.fmt(ramal.deltaPtotal || 0, 0) + ' Pa</span>';
            h += '</div>';
          });
        }
      }
    });

    return h;
  },

  _renderPainelVazio: function () {
    return '<div style="padding:20px;text-align:center;color:var(--texto-suave);font-size:12px">'
      + '<i class="fa-solid fa-sitemap" style="font-size:32px;opacity:.3;display:block;margin-bottom:10px"></i>'
      + 'Sem ramais para mostrar.</div>';
  },

  _renderPainelDetalhes: function () {
    var sel = this._selecionado;
    if (!sel) {
      return '<div style="padding:20px;text-align:center;color:var(--texto-suave);font-size:12px">'
        + '<i class="fa-solid fa-arrow-pointer" style="font-size:32px;opacity:.3;display:block;margin-bottom:10px"></i>'
        + 'Seleciona um ramal para ver detalhes.<br>Arrasta para outro ramal para mover.'
        + '</div>';
    }
    var r = sel;
    var terminais = (VC.dados.terminais || []).filter(function (t) { return t.ramalRef === r.nome; });
    var espacos = VC.calculo && VC.calculo.espacosServidosPorRamal ? VC.calculo.espacosServidosPorRamal(r.nome) : [];

    var h = '<div style="padding:12px 14px;border-bottom:1px solid var(--borda);background:var(--superf2)">';
    h += '<div style="font-size:10px;font-weight:800;color:var(--texto-suave);text-transform:uppercase;letter-spacing:.4px">Ramal</div>';
    h += '<div style="font-family:ui-monospace,monospace;font-weight:900;font-size:15px;color:var(--primario-esc);margin:2px 0">' + VC.utils.esc(r.nome) + '</div>';
    h += '<div style="font-size:10.5px;color:var(--texto-med)">' + VC.utils.esc(r.tipo || '') + ' \u00b7 ' + VC.utils.esc(r.rede || '') + ' \u00b7 R' + (r.nivelNumero || '?') + '</div>';
    h += '</div>';

    h += '<div style="padding:12px 14px">';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">';
    h += _kpi('Q', VC.utils.fmt(r.Q || 0, 0) + ' m\u00b3/h');
    h += _kpi('\u00d8', (r.Dcom || '\u2014') + ' mm');
    h += _kpi('v', VC.utils.fmt(r.v || 0, 2) + ' m/s');
    h += _kpi('\u0394p total', VC.utils.fmt(r.deltaPtotal || 0, 0) + ' Pa');
    h += _kpi('L', VC.utils.fmt(r.L || 0, 0) + ' m');
    h += _kpi('\u03b6', VC.utils.fmt(r.zeta || 0, 1));
    h += '</div>';

    if (r.parente) {
      h += '<div style="font-size:11px;margin-bottom:6px"><b>Parente:</b> <a href="javascript:void(0)" onclick="VC.arvore.selecionar(\'' + VC.utils.esc(r.parente) + '\')" style="color:var(--primario);text-decoration:underline">' + VC.utils.esc(r.parente) + '</a></div>';
    }
    var filhos = (VC.dados.ramais || []).filter(function (x) { return x.parente === r.nome; });
    if (filhos.length) {
      h += '<div style="font-size:11px;margin-bottom:6px"><b>Filhos:</b> ' + filhos.length + '</div>';
    }
    if (r.utaRef) {
      h += '<div style="font-size:11px;margin-bottom:6px"><b>UTA:</b> ' + VC.utils.esc(r.utaRef) + '</div>';
    }

    if (espacos.length) {
      h += '<div style="font-size:10.5px;font-weight:800;color:var(--texto-med);text-transform:uppercase;margin:12px 0 4px">Espa\u00e7os servidos (' + espacos.length + ')</div>';
      espacos.forEach(function (e) {
        h += '<div style="font-size:11px;padding:2px 0">\u00b7 ' + VC.utils.esc(e.nome) + ' <span style="color:var(--texto-suave)">(' + VC.utils.fmt(e.Q_parcela, 0) + ' m\u00b3/h)</span></div>';
      });
    }

    if (terminais.length) {
      h += '<div style="font-size:10.5px;font-weight:800;color:var(--texto-med);text-transform:uppercase;margin:12px 0 4px">Terminais (' + terminais.length + ')</div>';
      terminais.forEach(function (t) {
        h += '<div style="font-size:11px;padding:2px 0;font-family:ui-monospace,monospace">\u00b7 ' + VC.utils.esc(t.nome) + ' <span style="color:var(--texto-suave)">' + VC.utils.esc(t.tipo || '') + ' \u00b7 ' + VC.utils.fmt(t.Q || 0, 0) + '</span></div>';
      });
    }

    h += '</div>';
    return h;

    function _kpi(label, valor) {
      return '<div style="background:var(--superf2);border-radius:4px;padding:5px 8px">'
        + '<div style="font-size:9.5px;font-weight:800;color:var(--texto-suave);text-transform:uppercase">' + label + '</div>'
        + '<div style="font-size:12.5px;font-weight:900;color:var(--texto);font-family:ui-monospace,monospace">' + valor + '</div></div>';
    }
  },

  setVista: function (v) {
    if (!this._VISTAS[v]) return;
    this._vista = v;
    this._selecionado = null;
    this.render();
  },

  setFiltro: function (f) {
    this._filtroRede = f;
    this.render();
  },

  toggle: function (id) {
    this._expandidos[id] = this._expandidos[id] === false ? true : false;
    this.render();
  },

  selecionar: function (nome) {
    var r = (VC.dados.ramais || []).find(function (x) { return x.nome === nome; });
    if (!r) return;
    this._selecionado = r;
    this.render();
  },

  _dragStart: function (ev, nome) {
    this._arrastando = nome;
    try { ev.dataTransfer.setData('text/plain', nome); ev.dataTransfer.effectAllowed = 'move'; } catch (e) {}
    ev.currentTarget.style.opacity = '0.4';
  },

  _dragOver: function (ev) {
    if (!this._arrastando) return;
    ev.preventDefault();
    try { ev.dataTransfer.dropEffect = 'move'; } catch (e) {}
    ev.currentTarget.style.background = 'var(--primario-soft)';
  },

  _drop: function (ev, nomeAlvo) {
    ev.preventDefault();
    ev.currentTarget.style.background = '';
    var nomeArrastado = this._arrastando;
    this._arrastando = null;
    if (!nomeArrastado || nomeArrastado === nomeAlvo) return;
    if (!VC.topologia || !VC.topologia.mover || !VC.topologia.mover.ramal) {
      VC.ui.toast('M\u00f3dulo de topologia indispon\u00edvel.');
      return;
    }
    var r = VC.topologia.mover.ramal(nomeArrastado, nomeAlvo);
    if (!r || !r.ok) {
      VC.ui.toast('N\u00e3o foi poss\u00edvel mover: ' + ((r && r.erro) || 'erro'));
      return;
    }
    if (VC.historico) VC.historico.push('Ramal ' + nomeArrastado + ' movido para ' + nomeAlvo);
    VC.estado.forcarSync();
    this.render();
    VC.ui.toast(nomeArrastado + ' \u2192 ' + nomeAlvo);
  },

  _dragEnd: function (ev) {
    ev.currentTarget.style.opacity = '';
    this._arrastando = null;
  }
};

console.log('%c[VentCondutas V11.0.09] 11-arvore carregado \u00b7 4 vistas facetadas + filtros + drag-drop',
  'color:#6d8fb0;font-weight:bold;background:#eaf1f7;padding:3px 6px;border-radius:3px');

})();