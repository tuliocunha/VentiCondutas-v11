/* ============================================================
   VENTICONDUTAS · 10-historico-ui
   Fase 2.5 · Desfazer/Refazer para drag-and-drop + atalhos

   ADITIVO. Nada existente e alterado.
   ============================================================ */
(function () {
'use strict';
var VC = window.VC;
VC._boot = VC._boot || { partes: [] };
VC._boot.partes.push('10-historico-ui');

/* ============================================================
   1 · SNAP — historico de estados (ramais + terminais)
   ============================================================ */
VC.snap = {
  _stack: [],
  _indice: -1,
  _max: 50,
  _ativo: true,

  capturar: function (motivo) {
    if (!this._ativo) { return; }
    var snap = {
      timestamp: new Date().toISOString(),
      motivo: motivo || 'edicao',
      ramais: VC.utils.clonar(VC.dados.ramais || []),
      terminais: VC.utils.clonar(VC.dados.terminais || []),
      espacos: VC.utils.clonar(VC.dados.espacos || [])
    };
    this._stack = this._stack.slice(0, this._indice + 1);
    this._stack.push(snap);
    if (this._stack.length > this._max) {
      this._stack.shift();
    }
    this._indice = this._stack.length - 1;
    this._atualizarUI();
  },

  podeDesfazer: function () {
    return this._indice > 0;
  },

  podeRefazer: function () {
    return this._indice < this._stack.length - 1;
  },

  desfazer: function () {
    if (!this.podeDesfazer()) {
      VC.ui.toast('Nada para desfazer.');
      return false;
    }
    this._indice--;
    this._aplicar(this._stack[this._indice]);
    this._atualizarUI();
    return true;
  },

  refazer: function () {
    if (!this.podeRefazer()) {
      VC.ui.toast('Nada para refazer.');
      return false;
    }
    this._indice++;
    this._aplicar(this._stack[this._indice]);
    this._atualizarUI();
    return true;
  },

  _aplicar: function (snap) {
    if (!snap) { return; }
    VC.dados.ramais = VC.utils.clonar(snap.ramais);
    VC.dados.terminais = VC.utils.clonar(snap.terminais);
    if (snap.espacos) {
      VC.dados.espacos = VC.utils.clonar(snap.espacos);
    }

    if (VC.perf) {
      if (VC.perf.cacheMaterializacao) { VC.perf.cacheMaterializacao.invalidar(); }
      if (VC.perf.ordenacaoTopologica) { VC.perf.ordenacaoTopologica.invalidar(); }
      if (VC.perf.cacheBalanco) { VC.perf.cacheBalanco.invalidar(); }
    }

    try {
      VC.calculo.calcularTudo();
      if (window.VC6 && VC6.balanco && VC6.balanco.propagar) {
        VC6.balanco.propagar();
      }
    } catch (e) {
      if (VC.debug && VC.debug.erro) { VC.debug.erro(e); }
    }

    if (VC._modoAtivo === 'arvore' && VC.arvore && VC.arvore.render) {
      VC.arvore.render();
    }
    if (VC._passoAtivo && VC.passos && VC.passos.render) {
      VC.passos.render(VC._passoAtivo);
    }

    VC.ui.toast(snap.motivo);
  },

  _atualizarUI: function () {
    var btDesfazer = document.getElementById('btnSnapDesfazer');
    var btRefazer = document.getElementById('btnSnapRefazer');
    if (btDesfazer) {
      btDesfazer.disabled = !this.podeDesfazer();
      btDesfazer.style.opacity = this.podeDesfazer() ? '1' : '0.4';
    }
    if (btRefazer) {
      btRefazer.disabled = !this.podeRefazer();
      btRefazer.style.opacity = this.podeRefazer() ? '1' : '0.4';
    }
  },

  limpar: function () {
    this._stack = [];
    this._indice = -1;
    this._atualizarUI();
  },

  inicializar: function () {
    if (this._stack.length === 0) {
      this.capturar('estado inicial');
    }
  }
};

/* ============================================================
   2 · INTEGRAR COM DRAG-AND-DROP
   Envolver VC.topologia.mover.ramal e .terminal para capturar
   snapshot ANTES de aplicar (mas so se a operacao for valida).
   ============================================================ */
if (VC.topologia && VC.topologia.mover) {
  var moverOriginal = VC.topologia.mover;

  var ramalOriginal = moverOriginal.ramal;
  moverOriginal.ramal = function (ramalNome, novoPaiNome) {
    var r = VC.dados.ramais.find(function (x) { return x.nome === ramalNome; });
    var pai = VC.dados.ramais.find(function (x) { return x.nome === novoPaiNome; });
    if (!r || !pai) {
      return ramalOriginal.call(this, ramalNome, novoPaiNome);
    }

    // Anti-ciclo
    var p = novoPaiNome;
    var guard = 0;
    var temCiclo = false;
    while (p && guard++ < 100) {
      if (p === ramalNome) { temCiclo = true; break; }
      var rr = VC.dados.ramais.find(function (x) { return x.nome === p; });
      p = rr ? rr.parente : null;
    }
    if (temCiclo) {
      return ramalOriginal.call(this, ramalNome, novoPaiNome);
    }

    // Mesma rede
    if ((r.rede || 'insuflacao') !== (pai.rede || 'insuflacao')) {
      return ramalOriginal.call(this, ramalNome, novoPaiNome);
    }

    // Vai ser bem sucedido -> capturar
    VC.snap.capturar('Ramal ' + ramalNome + ' movido para ' + novoPaiNome);
    return ramalOriginal.call(this, ramalNome, novoPaiNome);
  };

  var terminalOriginal = moverOriginal.terminal;
  moverOriginal.terminal = function (terminalId, ramalNome) {
    var t = VC.dados.terminais.find(function (x) { return String(x.id) === String(terminalId); });
    var r = VC.dados.ramais.find(function (x) { return x.nome === ramalNome; });
    if (!t || !r) {
      return terminalOriginal.call(this, terminalId, ramalNome);
    }
    if ((r.rede || 'insuflacao') !== (t.rede || 'insuflacao')) {
      return terminalOriginal.call(this, terminalId, ramalNome);
    }
    VC.snap.capturar('Terminal ' + t.nome + ' movido para ' + ramalNome);
    return terminalOriginal.call(this, terminalId, ramalNome);
  };
}

/* ============================================================
   3 · ATALHOS DE TECLADO
   Ctrl+Z = desfazer · Ctrl+Y = refazer · Ctrl+Shift+Z = refazer
   ============================================================ */
document.addEventListener('keydown', function (ev) {
  var t = ev.target;
  var emInput = t && (
    t.tagName === 'INPUT' ||
    t.tagName === 'TEXTAREA' ||
    t.isContentEditable
  );
  if (emInput) { return; }

  if ((ev.ctrlKey || ev.metaKey) && ev.key === 'z' && !ev.shiftKey) {
    ev.preventDefault();
    if (VC.snap) { VC.snap.desfazer(); }
    return;
  }

  if ((ev.ctrlKey || ev.metaKey) && (ev.key === 'y' || (ev.key === 'z' && ev.shiftKey))) {
    ev.preventDefault();
    if (VC.snap) { VC.snap.refazer(); }
    return;
  }
});

/* ============================================================
   4 · INJETAR BOTOES NO PAINEL DA ARVORE  [removido na V11 · Fase 3]
   Nunca executava: VC.arvore._renderPainel nao existe em 11-arvore.js
   (o correto e _renderPainelDetalhes). Para recuperar os botoes no
   painel da arvore: adicionar alias em 11-arvore.js ou reativar aqui.
   ============================================================ */
/* ============================================================
   5 · INICIALIZACAO
   ============================================================ */
function inicializarSnap() {
  if (!VC.snap) { return; }
  VC.snap.inicializar();
  if (VC.debug && VC.debug.info) {
    VC.debug.info('Snap ativo · Ctrl+Z desfaz · Ctrl+Y refaz');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(inicializarSnap, 800);
  });
} else {
  setTimeout(inicializarSnap, 800);
}

console.log('[VentiCondutas] 10-historico-ui carregado');

})();