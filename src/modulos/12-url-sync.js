/* ============================================================
   VENTCONDUTAS V9.2.0 · 12-url-sync
   Fase 5 · Persistência profunda de URL (deep-link bidirecional)

   Layout V2: ?layout=2&janela=N&passo=X&lente=Y
   - Load:    URL → estado (08-arranque já aplica janela+lente;
              este módulo completa o passo)
   - Runtime: cliques em .janela-btn / .lente-btn / .passo-btn
              atualizam a URL via pushState
   - popstate: back/forward do browser restaura o estado

   ADITIVO. Não altera 08-arranque.js (R17).

   DEPENDE DE: 08-arranque.js (VC.layoutV2, VC.modos) + 11-lentes.js
   ============================================================ */
(function () {
'use strict';
const VC = window.VC;
VC._boot = VC._boot || { partes: [] };
VC._boot.partes.push('12-url-sync');

/* ────────────────────────────────────────────────
   ESTADO INTERNO
   ──────────────────────────────────────────────── */
let _aInicializar = false;

/* ────────────────────────────────────────────────
   LEITURA / CONSTRUÇÃO DE URL
   ──────────────────────────────────────────────── */
function _lerURL() {
  try {
    const u = new URL(window.location.href);
    return {
      layout: u.searchParams.get('layout'),
      janela: u.searchParams.get('janela'),
      passo:  u.searchParams.get('passo'),
      lente:  u.searchParams.get('lente')
    };
  } catch (e) {
    return { layout: null, janela: null, passo: null, lente: null };
  }
}

function _urlActual() {
  return window.location.pathname + window.location.search + window.location.hash;
}

function _construirURL(estado) {
  const u = new URL(window.location.href);
  ['layout', 'janela', 'passo', 'lente'].forEach(function (k) {
    if (estado[k]) u.searchParams.set(k, estado[k]);
    else u.searchParams.delete(k);
  });
  const search = u.searchParams.toString();
  return u.pathname + (search ? '?' + search : '') + u.hash;
}

function _lerEstadoAtual() {
  if (!VC.flags || VC.flags.layoutV2 !== true) return null;
  if (!VC.layoutV2 || !VC.layoutV2.janelaAtiva) return null;
  const janelaObj = (VC.layoutV2.JANELAS || []).filter(function (j) {
    return j.id === VC.layoutV2.janelaAtiva;
  })[0];
  return {
    layout: '2',
    janela: janelaObj ? String(janelaObj.num) : null,
    passo:  VC._passoAtivo || null,
    lente:  VC.flags.layoutV2Lente || 'passo'
  };
}

/* ────────────────────────────────────────────────
   SYNC · estado → URL
   ──────────────────────────────────────────────── */
function _syncUrl(opcoes) {
  opcoes = opcoes || {};
  if (VC.flags && VC.flags.layoutV2 !== true) return;
  if (!VC.layoutV2 || !VC.layoutV2.janelaAtiva) return;

  const estado = _lerEstadoAtual();
  if (!estado) return;

  const urlNova = _construirURL(estado);
  if (urlNova === _urlActual()) return;

  const urlAnterior = _lerURL();
  const urlVazia = !urlAnterior.janela && !urlAnterior.passo && !urlAnterior.lente;
  const usarPush = opcoes.push === true && !urlVazia;

  try {
    if (usarPush) {
      window.history.pushState({ vc: true, estado: estado }, '', urlNova);
    } else {
      window.history.replaceState({ vc: true, estado: estado }, '', urlNova);
    }
  } catch (e) {
    if (VC.debug && VC.debug.aviso) VC.debug.aviso('[URL-sync] ' + e.message);
  }
}

/* ────────────────────────────────────────────────
   APLICAR · URL → estado
   Ordem: janela → passo → lente
   (lente por último porque o wrapper de passos.render
    força 'passo' após qualquer render explícito)
   ──────────────────────────────────────────────── */
function _aplicarEstadoDaURL() {
  if (VC.flags && VC.flags.layoutV2 !== true) return;
  if (!VC.layoutV2) return;

  const p = _lerURL();
  if (p.layout !== '2') return;

  _aInicializar = true;
  try {
    // 1. Janela
    const numJanela = Number(p.janela) || null;
    if (numJanela && VC.modos && typeof VC.modos.setJanela === 'function') {
      const janelaActual = (VC.layoutV2.JANELAS || []).filter(function (j) {
        return j.id === VC.layoutV2.janelaAtiva;
      })[0];
      const numActual = janelaActual ? janelaActual.num : null;
      if (numActual !== numJanela) {
        VC.modos.setJanela(numJanela);
      }
    }

    // 2. Passo (valida contra a janela ativa)
    const janelaNumFinal = numJanela || (function () {
      const j = (VC.layoutV2.JANELAS || []).filter(function (x) { return x.id === VC.layoutV2.janelaAtiva; })[0];
      return j ? j.num : null;
    })();
    const janelaObj = (VC.layoutV2.JANELAS || []).filter(function (j) { return j.num === Number(janelaNumFinal); })[0];

    if (p.passo && p.passo !== VC._passoAtivo) {
      const passoValido = !janelaObj || janelaObj.passos.indexOf(p.passo) >= 0;
      if (passoValido && VC.ui && typeof VC.ui.setPasso === 'function') {
        VC.ui.setPasso(p.passo);
      }
    }

    // 3. Lente (por último)
    if (p.lente && p.lente !== VC.flags.layoutV2Lente && VC.modos && typeof VC.modos.setLente === 'function') {
      VC.modos.setLente(p.lente);
    }
  } catch (e) {
    if (VC.debug && VC.debug.erro) VC.debug.erro(e);
  } finally {
    _aInicializar = false;
  }

  // Sincroniza URL final com o estado real (sem push)
  setTimeout(function () { _syncUrl({ push: false }); }, 0);
}

/* ────────────────────────────────────────────────
   WRAPPERS · instalar uma única vez
   ──────────────────────────────────────────────── */
function _envolverSetJanela() {
  if (typeof VC.modos.setJanela !== 'function' || VC.modos._setJanelaUrlWrapped) return;
  const orig = VC.modos.setJanela;
  VC.modos.setJanela = function () {
    const r = orig.apply(this, arguments);
    if (!_aInicializar) _syncUrl({ push: true });
    return r;
  };
  VC.modos._setJanelaUrlWrapped = true;
}

function _envolverSetLente() {
  if (typeof VC.modos.setLente !== 'function' || VC.modos._setLenteUrlWrapped) return;
  const orig = VC.modos.setLente;
  VC.modos.setLente = function () {
    const r = orig.apply(this, arguments);
    if (!_aInicializar) _syncUrl({ push: true });
    return r;
  };
  VC.modos._setLenteUrlWrapped = true;
}

/* ────────────────────────────────────────────────
   LISTENERS · cliques em passos + popstate
   ──────────────────────────────────────────────── */
function _ligarClickPasso() {
  if (document._urlSyncPassoLigado) return;
  document.addEventListener('click', function (ev) {
    const alvo = ev.target;
    if (!alvo || typeof alvo.closest !== 'function') return;
    const btn = alvo.closest('.passo-btn[data-passo]');
    if (!btn) return;
    if (_aInicializar) return;
    // Em fase de bubbling: o onclick inline (VC.ui.setPasso) já correu
    _syncUrl({ push: true });
  }, false);
  document._urlSyncPassoLigado = true;
}

function _ligarPopstate() {
  if (window._urlSyncPopstateLigado) return;
  window.addEventListener('popstate', function () {
    if (VC.flags && VC.flags.layoutV2 !== true) return;
    _aplicarEstadoDaURL();
  });
  window._urlSyncPopstateLigado = true;
}

/* ────────────────────────────────────────────────
   INIT
   ──────────────────────────────────────────────── */
function _inicializar() {
  if (VC.flags && VC.flags.layoutV2 !== true) return;
  if (!VC.layoutV2) return;

  _envolverSetJanela();
  _envolverSetLente();
  _ligarClickPasso();
  _ligarPopstate();

  // Aplicar passo/lente da URL que o 08-arranque não aplicou
  _aplicarEstadoDaURL();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(_inicializar, 700);
  });
} else {
  setTimeout(_inicializar, 700);
}

/* ────────────────────────────────────────────────
   API PÚBLICA (debug F12)
   ──────────────────────────────────────────────── */
VC.urlSync = {
  sync:    function (opcoes) { _syncUrl(opcoes || {}); },
  aplicar: function () { _aplicarEstadoDaURL(); },
  ler:     function () { return _lerURL(); },
  estado:  function () { return _lerEstadoAtual(); }
};

console.log(
  '%c[VentCondutas V11.0.0 · Fase 5] 12-url-sync carregado · deep-link bidirecional ativo',
  'color:#6d8fb0;font-weight:bold;background:#eaf1f7;padding:3px 6px;border-radius:3px'
);

})();
