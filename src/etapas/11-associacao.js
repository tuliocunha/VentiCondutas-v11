/* ============================================================
   VENTICONDUTAS · 11-associacao
   Passo "Topologia dos Ramais".
   Arvore de ramais + atribuicao de terminais/espaços a ramais
   + auto-associacao por piso/ala + gerar topologia automatica.
   ============================================================ */
(function () {
'use strict';
var VC = window.VC;
if (!VC) return;
VC._boot = VC._boot || { partes: [] };
VC._boot.partes.push('11-associacao');

VC.associacao = {
  _expandidos: {},

  renderVisaoGeral: function () {
    var ramais = VC.dados.ramais || [];
    var terminais = VC.dados.terminais || [];
    var espacos = VC.dados.espacos || [];
    var self = this;

    var nTermSemRamal = terminais.filter(function (t) { return !t.ramalRef; }).length;
    var nEspacosSemAssoc = espacos.filter(function (e) {
      var temIns = (e.definicoes || []).some(function (d) { return d.rede === 'insuflacao'; });
      var temExt = (e.definicoes || []).some(function (d) { return d.rede === 'extracao' || d.rede === 'extracao_suja'; });
      return (temIns && !e.ramalRefInsuflacao) || (temExt && !e.ramalRefExtracao);
    }).length;

    var h = '<div class="cartao-titulo"><i class="fa-solid fa-sitemap"></i> Topologia dos Ramais</div>';
    h += '<p style="font-size:11.5px;color:var(--texto-med);margin-bottom:10px">'
      + 'Os ramais formam a \u00e1rvore de condutas. Cada terminal \u00e9 servido por um ramal. '
      + 'O caudal do ramal \u00e9 a soma dos terminais que serve. '
      + 'O <b>Diagrama Rede de Ar</b> (Sankey) reflete esta topologia.</p>';

    h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px">';
    h += '<div style="background:var(--superf2);border:1px solid var(--borda);border-left:3px solid var(--primario);border-radius:5px;padding:8px 10px"><div style="font-size:9.5px;font-weight:800;color:var(--texto-suave);text-transform:uppercase">Ramais</div><div style="font-size:16px;font-weight:900;color:var(--texto);margin-top:3px">' + ramais.length + '</div></div>';
    h += '<div style="background:var(--superf2);border:1px solid var(--borda);border-left:3px solid var(--primario);border-radius:5px;padding:8px 10px"><div style="font-size:9.5px;font-weight:800;color:var(--texto-suave);text-transform:uppercase">Terminais</div><div style="font-size:16px;font-weight:900;color:var(--texto);margin-top:3px">' + terminais.length + '</div></div>';
    h += '<div style="background:var(--superf2);border:1px solid var(--borda);border-left:3px solid var(--' + (nTermSemRamal > 0 ? 'ambar' : 'verde') + ');border-radius:5px;padding:8px 10px"><div style="font-size:9.5px;font-weight:800;color:var(--texto-suave);text-transform:uppercase">Terminais sem ramal</div><div style="font-size:16px;font-weight:900;color:var(--texto);margin-top:3px">' + nTermSemRamal + '</div></div>';
    h += '<div style="background:var(--superf2);border:1px solid var(--borda);border-left:3px solid var(--' + (nEspacosSemAssoc > 0 ? 'ambar' : 'verde') + ');border-radius:5px;padding:8px 10px"><div style="font-size:9.5px;font-weight:800;color:var(--texto-suave);text-transform:uppercase">Espa\u00e7os sem associa\u00e7\u00e3o</div><div style="font-size:16px;font-weight:900;color:var(--texto);margin-top:3px">' + nEspacosSemAssoc + '</div></div>';
    h += '</div>';

    h += '<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">';
    h += '<button class="btn primario" onclick="VC.associacao.abrirModalNovoRamal()"><i class="fa-solid fa-plus"></i> Novo ramal</button>';
    h += '<button class="btn ambar" onclick="VC.associacao.autoAssociar()"><i class="fa-solid fa-wand-magic-sparkles"></i> Auto-associar por piso/ala</button>';
    h += '<button class="btn violeta" onclick="VC.associacao.gerarAutomatica()"><i class="fa-solid fa-robot"></i> Gerar topologia autom\u00e1tica (substitui tudo)</button>';
    h += '<button class="btn" onclick="VC.estado.forcarSync(); VC.passos.render(\'associacao\');"><i class="fa-solid fa-rotate"></i> Recalcular</button>';
    h += '</div>';

    if (ramais.length === 0) {
      h += '<div class="vazio"><i class="fa-solid fa-sitemap"></i><div class="vazio-titulo">Sem ramais</div>'
        + '<div>Cria o primeiro ramal ou usa a <b>gera\u00e7\u00e3o autom\u00e1tica</b>.</div></div>';
    } else {
      h += '<div style="font-size:10.5px;font-weight:800;color:var(--texto-med);text-transform:uppercase;margin:14px 0 6px"><i class="fa-solid fa-list-tree"></i> \u00c1rvore de ramais</div>';
      h += '<div style="background:var(--superf);border:1px solid var(--borda);border-radius:8px;padding:10px 14px;font-family:ui-monospace,monospace;font-size:11.5px;line-height:1.75">';
      h += self._renderArvore(ramais, '');
      h += '</div>';
    }

    if (nTermSemRamal > 0) {
      h += '<div style="font-size:10.5px;font-weight:800;color:var(--ambar-esc);text-transform:uppercase;margin:14px 0 6px"><i class="fa-solid fa-triangle-exclamation"></i> Terminais sem ramal (' + nTermSemRamal + ')</div>';
      h += '<div class="tabela-wrap"><table class="tabela densa"><thead><tr>';
      h += '<th>Terminal</th><th data-ajuda="tipo_terminal">Tipo</th><th>Rede</th><th>Espa\u00e7o(s)</th><th data-ajuda="Q_terminal">Q (m\u00b3/h)</th><th>Atribuir a</th>';
      h += '</tr></thead><tbody>';
      terminais.forEach(function (t, idx) {
        if (t.ramalRef) return;
        var espNomes = (t.espacos || []).map(function (x) { return x.nome; }).join(', ');
        var ramaisRede = ramais.filter(function (r) { return r.rede === t.rede; });
        h += '<tr>';
        h += '<td><b>' + VC.utils.esc(t.nome) + '</b></td>';
        h += '<td>' + VC.utils.esc(t.tipo) + '</td>';
        h += '<td>' + VC.utils.esc(t.rede) + '</td>';
        h += '<td style="font-size:10.5px">' + VC.utils.esc(espNomes) + '</td>';
        h += '<td>' + VC.utils.fmt(t.Q || 0, 0) + '</td>';
        h += '<td><select onchange="VC.associacao.atribuirTerminal(' + idx + ', this.value)" style="padding:3px 6px;border:1px solid var(--borda-media);border-radius:4px;font-size:10.5px;font-family:inherit;width:100%"><option value="">\u2014 escolher \u2014</option>';
        ramaisRede.forEach(function (r) { h += '<option value="' + VC.utils.esc(r.nome) + '">' + VC.utils.esc(r.nome) + ' (Q=' + VC.utils.fmt(r.Q || 0, 0) + ')</option>'; });
        h += '</select></td>';
        h += '</tr>';
      });
      h += '</tbody></table></div>';
    }

    if (nEspacosSemAssoc > 0) {
      h += '<div style="font-size:10.5px;font-weight:800;color:var(--ambar-esc);text-transform:uppercase;margin:14px 0 6px"><i class="fa-solid fa-triangle-exclamation"></i> Espa\u00e7os com defini\u00e7\u00f5es sem ramal (' + nEspacosSemAssoc + ')</div>';
      var ramaisIns = ramais.filter(function (r) { return r.rede === 'insuflacao'; });
      var ramaisExt = ramais.filter(function (r) { return r.rede === 'extracao' || r.rede === 'extracao_suja'; });
      h += '<div class="tabela-wrap"><table class="tabela densa"><thead><tr>';
      h += '<th>Espa\u00e7o</th><th>Insufla\u00e7\u00e3o</th><th>Extra\u00e7\u00e3o</th>';
      h += '</tr></thead><tbody>';
      espacos.forEach(function (e, idx) {
        var temIns = (e.definicoes || []).some(function (d) { return d.rede === 'insuflacao'; });
        var temExt = (e.definicoes || []).some(function (d) { return d.rede === 'extracao' || d.rede === 'extracao_suja'; });
        var faltaIns = temIns && !e.ramalRefInsuflacao;
        var faltaExt = temExt && !e.ramalRefExtracao;
        if (!faltaIns && !faltaExt) return;
        h += '<tr>';
        h += '<td><b>' + VC.utils.esc(e.nome) + '</b></td>';
        h += '<td>' + (faltaIns ? self._selectRamal('atribuirEspaco(' + idx + ', this.value, \'insuflacao\')', ramaisIns) : '<span class="badge ok">' + VC.utils.esc(e.ramalRefInsuflacao || '\u2014') + '</span>') + '</td>';
        h += '<td>' + (faltaExt ? self._selectRamal('atribuirEspaco(' + idx + ', this.value, \'extracao\')', ramaisExt) : '<span class="badge ok">' + VC.utils.esc(e.ramalRefExtracao || '\u2014') + '</span>') + '</td>';
        h += '</tr>';
      });
      h += '</tbody></table></div>';
    }

    return h;
  },

  _selectRamal: function (onchange, ramais) {
    var h = '<select onchange="VC.associacao.' + onchange + '" style="padding:3px 6px;border:1px solid var(--borda-media);border-radius:4px;font-size:10.5px;font-family:inherit;width:100%"><option value="">\u2014 escolher \u2014</option>';
    ramais.forEach(function (r) { h += '<option value="' + VC.utils.esc(r.nome) + '">' + VC.utils.esc(r.nome) + ' (Q=' + VC.utils.fmt(r.Q || 0, 0) + ')</option>'; });
    h += '</select>';
    return h;
  },

  _renderArvore: function (ramais, parente) {
    var self = this;
    var filhos = ramais.filter(function (r) { return (r.parente || '') === parente; });
    filhos.sort(function (a, b) { return String(a.nome).localeCompare(String(b.nome), 'pt', { numeric: true }); });
    var h = '';
    filhos.forEach(function (r) {
      var temFilhos = ramais.some(function (x) { return x.parente === r.nome; });
      var expandido = temFilhos ? !!self._expandidos[r.nome] : true;
      var nTerm = (VC.dados.terminais || []).filter(function (t) { return t.ramalRef === r.nome; }).length;
      var cor = r.rede === 'insuflacao' ? 'var(--primario-esc)' : (r.rede === 'extracao_suja' ? 'var(--coral-esc)' : 'var(--verde-esc)');
      var prefixo = parente ? '  \u2514\u2500 ' : '';
      h += '<div style="padding:2px 0">';
      h += '<span style="color:var(--texto-suave)">' + prefixo + '</span>';
      if (temFilhos) h += '<span style="cursor:pointer;user-select:none;color:' + cor + '" onclick="VC.associacao.toggle(\'' + r.nome + '\')">' + (expandido ? '\u25bc' : '\u25b6') + ' </span>';
      h += '<b style="color:' + cor + '">' + VC.utils.esc(r.nome) + '</b>';
      h += ' <span style="color:var(--texto-suave);font-size:10px">\u00b7 ' + VC.utils.esc(r.rede || '?') + ' \u00b7 Q=' + VC.utils.fmt(r.Q || 0, 0) + ' \u00b7 ' + nTerm + ' term.</span>';
      if (r.utaRef) h += ' <span style="color:var(--texto-suave);font-size:10px">\u00b7 ' + VC.utils.esc(r.utaRef) + '</span>';
      h += '</div>';
      if (expandido && temFilhos) h += self._renderArvore(ramais, r.nome);
    });
    return h;
  },

  toggle: function (nome) {
    this._expandidos[nome] = !this._expandidos[nome];
    VC.passos.render('associacao');
  },

  abrirModalNovoRamal: function () {
    var ramais = VC.dados.ramais || [];
    var utas = VC.dados.utas || [];
    var modal = document.getElementById('modalGenerico');
    var cont = document.getElementById('modalGenericoConteudo');
    if (!modal || !cont) { VC.ui.toast('Modal n\u00e3o dispon\u00edvel.'); return; }

    var h = '<div class="modal-cabecalho"><h3>Novo ramal</h3><button class="fechar" onclick="VC.ui.fecharModal(\'modalGenerico\')">\u00d7</button></div>';
    h += '<div class="modal-corpo">';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">';
    h += '<div class="campo-grupo"><label>Rede</label><select id="novoRede" style="width:100%;padding:8px 10px;border:1px solid var(--borda-media);border-radius:5px;font-size:12px;font-family:inherit"><option value="insuflacao">insufla\u00e7\u00e3o</option><option value="extracao">extra\u00e7\u00e3o</option><option value="extracao_suja">extra\u00e7\u00e3o suja</option></select></div>';
    h += '<div class="campo-grupo"><label>Parente (opcional)</label><select id="novoParente" style="width:100%;padding:8px 10px;border:1px solid var(--borda-media);border-radius:5px;font-size:12px;font-family:inherit"><option value="">\u2014 raiz \u2014</option>';
    ramais.forEach(function (r) { h += '<option value="' + VC.utils.esc(r.nome) + '">' + VC.utils.esc(r.nome) + ' (' + r.rede + ')</option>'; });
    h += '</select></div></div>';
    h += '<div class="campo-grupo" style="margin-bottom:10px"><label>Nome</label><input type="text" id="novoNome" placeholder="ex: R1.2 ou R1.1.3 (vazio = autom\u00e1tico)" style="width:100%;padding:8px 10px;border:1px solid var(--borda-media);border-radius:5px;font-size:12px;font-family:ui-monospace,monospace"></div>';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">';
    h += '<div class="campo-grupo"><label>Comprimento L (m)</label><input type="number" id="novoL" value="10" step="0.5" style="width:100%;padding:8px 10px;border:1px solid var(--borda-media);border-radius:5px;font-size:12px;font-family:inherit"></div>';
    h += '<div class="campo-grupo"><label>\u03b6 (perda singular)</label><input type="number" id="novoZeta" value="0.5" step="0.1" style="width:100%;padding:8px 10px;border:1px solid var(--borda-media);border-radius:5px;font-size:12px;font-family:inherit"></div>';
    h += '</div>';
    h += '<div class="campo-grupo" style="margin-bottom:10px"><label>UTA servida (opcional)</label><select id="novoUta" style="width:100%;padding:8px 10px;border:1px solid var(--borda-media);border-radius:5px;font-size:12px;font-family:inherit"><option value="">\u2014 nenhuma \u2014</option>';
    utas.forEach(function (u) { h += '<option value="' + u.id + '">' + VC.utils.esc(u.nome) + ' (' + u.rede + ')</option>'; });
    h += '</select></div>';
    h += '</div>';
    h += '<div class="modal-rodape"><button class="btn" onclick="VC.ui.fecharModal(\'modalGenerico\')">Cancelar</button><button class="btn primario" onclick="VC.associacao.guardarNovoRamal()">Criar</button></div>';
    cont.innerHTML = h;
    modal.classList.add('on');
  },

  guardarNovoRamal: function () {
    var rede = document.getElementById('novoRede').value;
    var parente = document.getElementById('novoParente').value;
    var nome = document.getElementById('novoNome').value.trim();
    var L = Number(document.getElementById('novoL').value) || 10;
    var zeta = Number(document.getElementById('novoZeta').value) || 0.5;
    var utaRef = document.getElementById('novoUta').value || null;

    if (!nome) {
      var prefixo = rede === 'insuflacao' ? 'R1' : (rede === 'extracao' ? 'R2' : 'R3');
      if (parente) {
        var irmaos = (VC.dados.ramais || []).filter(function (r) { return r.parente === parente; });
        nome = parente + '.' + (irmaos.length + 1);
      } else {
        var raizes = (VC.dados.ramais || []).filter(function (r) { return !r.parente && r.rede === rede; });
        nome = prefixo + '.' + (raizes.length + 1);
      }
    }

    if ((VC.dados.ramais || []).some(function (r) { return r.nome === nome; })) {
      VC.ui.toast('J\u00e1 existe um ramal com o nome "' + nome + '".');
      return;
    }

    var nivelNumero = parente ? (String(parente).split('.').length) : 1;
    var pai = parente ? (VC.dados.ramais || []).find(function (r) { return r.nome === parente; }) : null;

    if (VC.topologia && VC.topologia._criarRamal) {
      VC.topologia._criarRamal({
        nome: nome, parente: parente, nivelNumero: nivelNumero, rede: rede,
        utaRef: utaRef, L: L, zeta: zeta,
        localizacao: pai ? { piso: (pai.localizacao && pai.localizacao.piso) || 'P0', ala: (pai.localizacao && pai.localizacao.ala) || null, cota: null } : { piso: 'P0', ala: null, cota: null }
      });
    } else {
      var id = (VC.dados.nextId.ramal || 1);
      VC.dados.nextId.ramal = id + 1;
      VC.dados.ramais.push({
        id: id, nome: nome, parente: parente,
        tipo: nivelNumero === 1 ? 'Principal' : 'Sub-ramal',
        nivel: ['primario', 'secundario', 'terciario', 'quaternario'][nivelNumero - 1] || 'secundario',
        nivelNumero: nivelNumero, rede: rede, utaRef: utaRef, L: L, zeta: zeta,
        localizacao: { piso: 'P0', ala: null, cota: null },
        geometriaInput: { material: 'A\u00e7o galvanizado', forma: 'circular' },
        lock: { D: false }
      });
    }

    if (VC.historico) VC.historico.push('Novo ramal: ' + nome);
    VC.estado.forcarSync();
    VC.ui.fecharModal('modalGenerico');
    VC.passos.render('associacao');
    VC.ui.toast('Ramal ' + nome + ' criado.');
  },

  atribuirTerminal: function (termIdx, ramalNome) {
    var t = VC.dados.terminais[termIdx];
    if (!t) return;
    if (!ramalNome) { t.ramalRef = ''; }
    else {
      var r = (VC.dados.ramais || []).find(function (x) { return x.nome === ramalNome; });
      if (!r) { VC.ui.toast('Ramal n\u00e3o encontrado.'); return; }
      if ((r.rede || 'insuflacao') !== (t.rede || 'insuflacao')) {
        VC.ui.toast('Rede do terminal (' + t.rede + ') e do ramal (' + r.rede + ') diferem.');
        return;
      }
      t.ramalRef = ramalNome;
    }
    if (VC.historico) VC.historico.push('Terminal ' + t.nome + ' \u2192 ' + (ramalNome || '(sem ramal)'));
    VC.estado.forcarSync();
    VC.passos.render('associacao');
    if (ramalNome) VC.ui.toast('Terminal ' + t.nome + ' atribu\u00eddo a ' + ramalNome);
  },

  atribuirEspaco: function (espIdx, ramalNome, rede) {
    var e = VC.dados.espacos[espIdx];
    if (!e) return;
    if (!ramalNome) {
      if (rede === 'insuflacao') e.ramalRefInsuflacao = '';
      else e.ramalRefExtracao = '';
    } else {
      if (rede === 'insuflacao') e.ramalRefInsuflacao = ramalNome;
      else e.ramalRefExtracao = ramalNome;
    }
    VC.dados.terminais.forEach(function (t) {
      var serve = (t.espacos || []).some(function (x) { return x.nome === e.nome; });
      if (!serve) return;
      var ehIns = (t.rede || 'insuflacao') === 'insuflacao';
      if (ehIns && rede === 'insuflacao') t.ramalRef = ramalNome;
      if (!ehIns && rede !== 'insuflacao') t.ramalRef = ramalNome;
    });
    VC.estado.forcarSync();
    VC.passos.render('associacao');
    if (ramalNome) VC.ui.toast('Espa\u00e7o ' + e.nome + ' \u2192 ' + ramalNome);
  },

  autoAssociar: function () {
    var ramais = VC.dados.ramais || [];
    if (!ramais.length) { VC.ui.toast('Cria pelo menos um ramal primeiro.'); return; }
    if (!confirm('Associar automaticamente por piso/ala?\n\nS\u00f3 preenche o que est\u00e1 vazio. N\u00e3o apaga nada.')) return;

    var nIns = 0, nExt = 0, nTerm = 0;

    VC.dados.espacos.forEach(function (e) {
      var loc = e.localizacao || {};
      var piso = (loc.piso || 'P0').toUpperCase();
      var ala = (loc.ala || '').toUpperCase();

      if (!e.ramalRefInsuflacao) {
        var candIns = ramais.filter(function (r) {
          if (r.rede !== 'insuflacao') return false;
          var pisos = (r.meta && r.meta.pisoFisico) || [];
          return pisos.some(function (p) { return String(p).toUpperCase() === piso; });
        });
        if (candIns.length) {
          var comAlaIns = candIns.find(function (r) { return String((r.meta && r.meta.ala) || '').toUpperCase() === ala; });
          e.ramalRefInsuflacao = (comAlaIns || candIns[0]).nome;
          nIns++;
        }
      }

      if (!e.ramalRefExtracao) {
        var candExt = ramais.filter(function (r) {
          if (r.rede !== 'extracao' && r.rede !== 'extracao_suja') return false;
          var pisos = (r.meta && r.meta.pisoFisico) || [];
          return pisos.some(function (p) { return String(p).toUpperCase() === piso; });
        });
        if (candExt.length) {
          var comAlaExt = candExt.find(function (r) { return String((r.meta && r.meta.ala) || '').toUpperCase() === ala; });
          e.ramalRefExtracao = (comAlaExt || candExt[0]).nome;
          nExt++;
        }
      }
    });

    VC.dados.terminais.forEach(function (t) {
      if (t.ramalRef) return;
      var serve = t.espacos || [];
      for (var i = 0; i < serve.length; i++) {
        var esp = VC.dados.espacos.find(function (x) { return x.nome === serve[i].nome; });
        if (!esp) continue;
        var ehExt = t.rede === 'extracao' || t.rede === 'extracao_suja';
        var ref = ehExt ? esp.ramalRefExtracao : esp.ramalRefInsuflacao;
        if (ref) { t.ramalRef = ref; nTerm++; break; }
      }
    });

    if (VC.historico) VC.historico.push('Auto-associa\u00e7\u00e3o: ' + nIns + ' ins, ' + nExt + ' ext, ' + nTerm + ' term');
    VC.estado.forcarSync();
    VC.passos.render('associacao');
    VC.ui.toast('Auto-associa\u00e7\u00e3o: ' + nIns + ' ins, ' + nExt + ' ext, ' + nTerm + ' term.');
  },

  gerarAutomatica: function () {
    if (!VC.topologia || !VC.topologia.gerarAutomatica) { VC.ui.toast('M\u00f3dulo n\u00e3o dispon\u00edvel.'); return; }
    if (!confirm('Gerar topologia autom\u00e1tica?\n\nATEN\u00c7\u00c3O: apaga todos os ramais e regenera.\nEdi\u00e7\u00f5es manuais ser\u00e3o perdidas.')) return;
    var r = VC.topologia.gerarAutomatica();
    if (r && r.ok) VC.passos.render('associacao');
  }
};

console.log('%c[VentiCondutas] 11-associacao carregado \u00b7 Topologia dos Ramais',
  'color:#6d8fb0;font-weight:bold;background:#eaf1f7;padding:3px 6px;border-radius:3px');

})();