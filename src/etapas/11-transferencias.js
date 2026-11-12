/* ============================================================
   VENTICONDUTAS · 11-transferencias
   UI de criacao de transferencias. Substitui o render
   original (16-bridge) por um que tem "Nova transferencia"
   + sugestao automatica + calculo de area em tempo real.
   ============================================================ */
(function () {
'use strict';
var VC = window.VC;
if (!VC) return;
VC._boot = VC._boot || { partes: [] };
VC._boot.partes.push('11-transferencias');

if (!window.VC6) return;
if (!VC6.transferencias) return;

window.renderTransferenciasV6 = function () {
  var trf = VC6.transferencias.todas();
  var desequilibrados = (VC6.balanco && VC6.balanco.todos ? VC6.balanco.todos() : []).filter(function (b) {
    return Math.abs(b.residuo || 0) > 5;
  });
  var Qtotal = trf.reduce(function (s, t) { return s + (Number(t.Q) || 0); }, 0);
  var ciclos = (VC6.balanco && VC6.balanco.detetarCiclos ? VC6.balanco.detetarCiclos() : []);

  var h = '<div class="cartao-titulo"><i class="fa-solid fa-arrow-right-arrow-left"></i> Transfer\u00eancias</div>';
  h += '<p style="font-size:11.5px;color:var(--texto-med);margin-bottom:10px">'
    + 'Uma transfer\u00eancia \u00e9 uma passagem de ar entre dois espa\u00e7os (fresta, grelha ou abertura). '
    + '\u00c9 o mecanismo que fecha o balan\u00e7o de espa\u00e7os G4 (sanit\u00e1rios, cozinhas) que s\u00f3 t\u00eam extra\u00e7\u00e3o.</p>';

  h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px">';
  h += '<div style="background:var(--superf2);border:1px solid var(--borda);border-left:3px solid var(--primario);border-radius:5px;padding:8px 10px"><div style="font-size:9.5px;font-weight:800;color:var(--texto-suave);text-transform:uppercase">Transfer\u00eancias</div><div style="font-size:16px;font-weight:900;color:var(--texto);margin-top:3px">' + trf.length + '</div></div>';
  h += '<div style="background:var(--superf2);border:1px solid var(--borda);border-left:3px solid var(--' + (desequilibrados.length > 0 ? 'ambar' : 'verde') + ');border-radius:5px;padding:8px 10px"><div style="font-size:9.5px;font-weight:800;color:var(--texto-suave);text-transform:uppercase">Espa\u00e7os desequilibrados</div><div style="font-size:16px;font-weight:900;color:var(--texto);margin-top:3px">' + desequilibrados.length + '</div></div>';
  h += '<div style="background:var(--superf2);border:1px solid var(--borda);border-left:3px solid var(--primario);border-radius:5px;padding:8px 10px"><div style="font-size:9.5px;font-weight:800;color:var(--texto-suave);text-transform:uppercase">\u03a3 Q</div><div style="font-size:16px;font-weight:900;color:var(--texto);margin-top:3px">' + VC.utils.fmt(Qtotal, 0) + ' <span style="font-size:10px;font-weight:600;color:var(--texto-suave)">m\u00b3/h</span></div></div>';
  h += '<div style="background:var(--superf2);border:1px solid var(--borda);border-left:3px solid var(--' + (ciclos.length > 0 ? 'coral' : 'verde') + ');border-radius:5px;padding:8px 10px"><div style="font-size:9.5px;font-weight:800;color:var(--texto-suave);text-transform:uppercase">Ciclos</div><div style="font-size:16px;font-weight:900;color:var(--texto);margin-top:3px">' + ciclos.length + '</div></div>';
  h += '</div>';

  h += '<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">';
  h += '<button class="btn primario" onclick="VC.transferenciasUI.abrirNova()"><i class="fa-solid fa-plus"></i> Nova transfer\u00eancia</button>';
  h += '<button class="btn violeta" onclick="VC.transferenciasUI.sugerirAuto()"><i class="fa-solid fa-wand-magic-sparkles"></i> Sugerir para fechar balan\u00e7o</button>';
  h += '<button class="btn" onclick="VC.estado.forcarSync(); VC.passos.render(\'transferencias\');"><i class="fa-solid fa-rotate"></i> Recalcular</button>';
  h += '</div>';

  if (!trf.length) {
    h += '<div class="vazio"><i class="fa-solid fa-inbox"></i><div class="vazio-titulo">Sem transfer\u00eancias</div>'
      + '<div>Adiciona a primeira ou usa o bot\u00e3o <b>Sugerir</b> para que o sistema proponha automaticamente.</div></div>';
  } else {
    h += '<div class="tabela-wrap"><table class="tabela densa"><thead><tr>';
    h += '<th>#</th><th>De</th><th>Para</th><th data-ajuda="Qtrf">Q (m\u00b3/h)</th><th data-ajuda="tipo_transferencia">Tipo</th><th>\u00c1rea (cm\u00b2)</th><th>\u0394P (Pa)</th><th></th>';
    h += '</tr></thead><tbody>';
    trf.forEach(function (t, i) {
      h += '<tr>';
      h += '<td style="text-align:center;color:var(--texto-suave);font-family:ui-monospace,monospace;font-size:10.5px;font-weight:700">' + (i + 1) + '</td>';
      h += '<td>' + VC.utils.esc(t.deNome) + '</td>';
      h += '<td>' + VC.utils.esc(t.paraNome) + '</td>';
      h += '<td><b>' + VC.utils.fmt(t.Q, 0) + '</b></td>';
      h += '<td>' + VC.utils.esc(t.tipo) + '</td>';
      h += '<td>' + VC.utils.fmt(t.area_cm2, 0) + '</td>';
      h += '<td>' + VC.utils.fmt(t.dP_Pa || 2, 1) + '</td>';
      h += '<td><button class="btn btn-mini coral" onclick="VC.transferenciasUI.remover(\'' + t.id + '\')">\u00d7</button></td>';
      h += '</tr>';
    });
    h += '</tbody></table></div>';
  }
  return h;
};

VC.transferenciasUI = {
  abrirNova: function (prefill) {
    prefill = prefill || {};
    var espacos = VC.dados.espacos || [];
    if (!espacos.length) { VC.ui.toast('Sem espa\u00e7os. Adiciona primeiro no Levantamento.'); return; }
    var modal = document.getElementById('modalGenerico');
    var cont = document.getElementById('modalGenericoConteudo');
    if (!modal || !cont) { VC.ui.toast('Modal n\u00e3o dispon\u00edvel.'); return; }

    var h = '<div class="modal-cabecalho"><h3>Nova transfer\u00eancia</h3><button class="fechar" onclick="VC.ui.fecharModal(\'modalGenerico\')">\u00d7</button></div>';
    h += '<div class="modal-corpo">';
    h += '<div class="campo-grupo" style="margin-bottom:10px"><label>De (origem)</label><select id="trfDe" style="width:100%;padding:8px 10px;border:1px solid var(--borda-media);border-radius:5px;font-size:12px;font-family:inherit"><option value="">\u2014 escolher \u2014</option>';
    espacos.forEach(function (e) {
      var b = e.balanco || {};
      var resid = b.residuo || 0;
      h += '<option value="' + e.id + '"' + (String(prefill.deId) === String(e.id) ? ' selected' : '') + '>' + VC.utils.esc(e.nome) + ' (G' + (e.g || '?') + ' \u00b7 \u0394Q=' + VC.utils.fmt(resid, 0) + ')</option>';
    });
    h += '</select></div>';
    h += '<div class="campo-grupo" style="margin-bottom:10px"><label>Para (destino)</label><select id="trfPara" style="width:100%;padding:8px 10px;border:1px solid var(--borda-media);border-radius:5px;font-size:12px;font-family:inherit"><option value="">\u2014 escolher \u2014</option>';
    espacos.forEach(function (e) {
      var b = e.balanco || {};
      var resid = b.residuo || 0;
      h += '<option value="' + e.id + '"' + (String(prefill.paraId) === String(e.id) ? ' selected' : '') + '>' + VC.utils.esc(e.nome) + ' (G' + (e.g || '?') + ' \u00b7 \u0394Q=' + VC.utils.fmt(resid, 0) + ')</option>';
    });
    h += '</select></div>';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">';
    h += '<div class="campo-grupo"><label>Q (m\u00b3/h)</label><input type="number" id="trfQ" value="' + (prefill.Q || 45) + '" min="1" step="1" style="width:100%;padding:8px 10px;border:1px solid var(--borda-media);border-radius:5px;font-size:13px;font-family:inherit;font-weight:700"></div>';
    h += '<div class="campo-grupo"><label>\u0394P (Pa)</label><input type="number" id="trfDp" value="2" min="0.1" step="0.1" style="width:100%;padding:8px 10px;border:1px solid var(--borda-media);border-radius:5px;font-size:13px;font-family:inherit;font-weight:700"></div>';
    h += '</div>';
    h += '<div class="campo-grupo" style="margin-bottom:10px"><label>Tipo</label><select id="trfTipo" style="width:100%;padding:8px 10px;border:1px solid var(--borda-media);border-radius:5px;font-size:12px;font-family:inherit">';
    h += '<option value="fresta_porta">Fresta sob porta</option>';
    h += '<option value="grelha_transferencia">Grelha de transfer\u00eancia</option>';
    h += '<option value="grelha_parede">Grelha de parede</option>';
    h += '<option value="abertura_natural">Abertura natural</option>';
    h += '</select></div>';
    h += '<div style="padding:8px 12px;background:var(--primario-soft);border-left:3px solid var(--primario);border-radius:5px;font-size:10.5px;color:var(--primario-esc);line-height:1.55">';
    h += '\u00c1rea calculada: <b id="trfArea">\u2014</b> cm\u00b2 (f\u00f3rmula A = Q / (0,36\u00b7\u221a\u0394P))';
    h += '</div>';
    h += '<div id="trfErro" style="display:none;margin-top:10px;padding:8px 12px;background:var(--coral-soft);border-left:3px solid var(--coral);border-radius:5px;font-size:11px;color:var(--coral-esc)"></div>';
    h += '</div>';
    h += '<div class="modal-rodape">';
    h += '<button class="btn" onclick="VC.ui.fecharModal(\'modalGenerico\')">Cancelar</button>';
    h += '<button class="btn primario" onclick="VC.transferenciasUI.guardarNova()">Criar</button>';
    h += '</div>';
    cont.innerHTML = h;
    modal.classList.add('on');

    setTimeout(function () {
      var q = document.getElementById('trfQ');
      var dp = document.getElementById('trfDp');
      var areaEl = document.getElementById('trfArea');
      function update() {
        var v = Number(q.value) || 0;
        var d = Number(dp.value) || 2;
        var a = (v > 0 && d > 0) ? (v / (0.36 * Math.sqrt(d))) : 0;
        if (areaEl) areaEl.textContent = Math.round(a);
      }
      if (q) q.addEventListener('input', update);
      if (dp) dp.addEventListener('input', update);
      update();
    }, 30);
  },

  guardarNova: function () {
    var deId = document.getElementById('trfDe').value;
    var paraId = document.getElementById('trfPara').value;
    var Q = Number(document.getElementById('trfQ').value);
    var dp = Number(document.getElementById('trfDp').value);
    var tipo = document.getElementById('trfTipo').value;
    var erro = document.getElementById('trfErro');
    function fail(msg) { if (erro) { erro.textContent = msg; erro.style.display = 'block'; } }
    if (!deId || !paraId) { fail('Escolhe origem e destino.'); return; }
    if (String(deId) === String(paraId)) { fail('Origem e destino n\u00e3o podem ser iguais.'); return; }
    if (Q <= 0) { fail('Q deve ser > 0.'); return; }
    var r = VC6.transferencias.criar(Number(deId), Number(paraId), Q, tipo);
    if (!r || !r.ok) { fail((r && r.erro) || 'Erro ao criar.'); return; }
    if (r.transferencia) r.transferencia.dP_Pa = dp;
    if (VC.historico) VC.historico.push('Nova transfer\u00eancia');
    VC.estado.forcarSync();
    VC.ui.fecharModal('modalGenerico');
    VC.passos.render('transferencias');
    VC.ui.toast('Transfer\u00eancia criada.');
  },

  remover: function (id) {
    if (!confirm('Remover esta transfer\u00eancia?')) return;
    VC6.transferencias.remover(id);
    VC.estado.forcarSync();
    VC.passos.render('transferencias');
    VC.ui.toast('Transfer\u00eancia removida.');
  },

  sugerirAuto: function () {
    if (!VC6.transferencias.sugerirAutoBalanco) { VC.ui.toast('M\u00f3dulo indispon\u00edvel.'); return; }
    var sug = VC6.transferencias.sugerirAutoBalanco();
    if (!sug.length) { VC.ui.toast('Nenhuma sugest\u00e3o. Adiciona vizinhos (ex: Circula\u00e7\u00e3o) ou cria manualmente.'); return; }
    var preview = sug.slice(0, 5).map(function (s) { return '\u00b7 ' + s.deNome + ' \u2192 ' + s.paraNome + ' (Q=' + VC.utils.fmt(s.Q, 0) + ')'; }).join('\n');
    if (sug.length > 5) preview += '\n\u00b7 ... e mais ' + (sug.length - 5);
    if (!confirm('Aplicar ' + sug.length + ' transfer\u00eancia(s) sugerida(s)?\n\n' + preview)) return;
    var n = VC6.transferencias.aplicarTodasSugestoes();
    VC.estado.forcarSync();
    VC.passos.render('transferencias');
    VC.ui.toast(n + ' transfer\u00eancia(s) criada(s).');
  }
};

console.log('%c[VentiCondutas] 11-transferencias carregado \u00b7 UI de cria\u00e7\u00e3o de transfer\u00eancias',
  'color:#6d8fb0;font-weight:bold;background:#eaf1f7;padding:3px 6px;border-radius:3px');

})();