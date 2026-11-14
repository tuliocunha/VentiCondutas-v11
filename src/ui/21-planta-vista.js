/* ============================================================
   VentiCondutas v11.3 · Planta: área de desenho e navegação (A+B)
   ------------------------------------------------------------
   Problemas que resolve: as ferramentas ficavam fora do desenho e saíam
   do ecrã com o scroll; havia dois scrolls (página e desenho); Ctrl+roda
   fazia zoom à página inteira; as barras de deslizamento eram difíceis.
   · A vista é um viewBox (zoom + posição), guardada por piso. O desenho
     ocupa o ecrã até ao fundo; a página não faz scroll.
   · Roda do rato = zoom no cursor; Ctrl+roda e a pinça do trackpad também,
     só sobre o desenho (o navegador deixa de fazer zoom à página).
   · Deslocar: ferramenta Mão, barra de espaço + arrastar, ou botão do meio.
   · Atalhos: V H S R P T L, F ajustar, 0 = 100 %, + −, Del, Ctrl+Z / Ctrl+Y.
   · Barra de estado: coordenadas em metros e a medida em direto.
   · Desfazer próprio da planta (desenhos, cantos, terminais, ramais,
     transferências, áreas e L aplicados).
   · Mover/zoom só muda o viewBox; o desenho refaz-se uma vez no fim.
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('21-planta-vista');
const P = VC.planta;
if (!P) return;
const fmt = (n, d) => VC.utils.fmt(n, d == null ? 2 : d);
const ZMIN = 0.03, ZMAX = 8;

P.FERRAMENTAS.splice(1, 0, ['mao', 'fa-hand', 'Mão']);
P.DICAS.mao = 'Arraste para deslocar a planta. Em qualquer ferramenta: barra de espaço + arrastar, ou botão do meio do rato. Roda do rato = zoom.';
P.vx = 0; P.vy = 0; P._vistas = {};

/* ── vista ───────────────────────────────── */
P._palco = () => document.getElementById('plantaTela');
P._dim = function () { const el = this._palco(); return el && el.clientWidth ? [el.clientWidth, el.clientHeight] : [1000, 600]; };
P.viewBox = function () { const [W, H] = this._dim(), z = this.zoom || 1; return [this.vx || 0, this.vy || 0, W / z, H / z].map(n => Math.round(n * 100) / 100); };
P._guardarVista = function () { const p = this.pisoAtual(); if (p && this.zoom) this._vistas[p.id] = { z: this.zoom, x: this.vx, y: this.vy }; };
P.aplicarVista = function (semRefresco) {
  const svg = document.getElementById('plantaSVG'), p = this.pisoAtual(); if (!svg || !p) return;
  svg.setAttribute('viewBox', this.viewBox().join(' '));
  const t = document.getElementById('plantaZoomTxt'); if (t) t.textContent = Math.round((this.zoom || 1) * 100) + '%';
  this._guardarVista();
  if (!semRefresco) this._agendarRefresco();
};
/* marcas e textos têm tamanho fixo no ecrã: refazem-se uma vez quando o zoom pára */
P._agendarRefresco = function () { clearTimeout(this._tRef); this._tRef = setTimeout(() => this.redesenharDesenho(), 180); };
P.redesenharDesenho = function () {
  if (this._ocupado) { this._agendarRefresco(); return; }
  const svg = document.getElementById('plantaSVG'), p = this.pisoAtual(); if (!svg || !p) return;
  svg.outerHTML = this._svg(p); this.ligar();
};
/* "Ajustar" enquadra a planta na zona livre entre as barras flutuantes (nada fica tapado) */
P.MARGENS = { e: 64, t: 62, d: 12, b: 80 };
P._ajustarVista = function (p) {
  const [W, H] = this._dim(), M = this.MARGENS;
  const w = Math.max(80, W - M.e - M.d), h = Math.max(80, H - M.t - M.b);
  const z = this.zoom = Math.max(ZMIN, Math.min(ZMAX, Math.min(w / p.w, h / p.h)));
  this.vx = -(M.e + (w - p.w * z) / 2) / z; this.vy = -(M.t + (h - p.h * z) / 2) / z;
};
P.ajustar = function () { const p = this.pisoAtual(); if (!p) return; this._ajustarVista(p); this.aplicarVista(); };
P.zoomEm = function (z, sx, sy) {
  z = Math.max(ZMIN, Math.min(ZMAX, z)); const z0 = this.zoom || 1;
  const ix = this.vx + sx / z0, iy = this.vy + sy / z0;   // o ponto debaixo do cursor fica no mesmo sítio
  this.zoom = z; this.vx = ix - sx / z; this.vy = iy - sy / z;
  this.aplicarVista();
};
P.zoomBotao = function (f) { const [W, H] = this._dim(); this.zoomEm((this.zoom || 1) * f, W / 2, H / 2); };
P.setZoom = function (z) { const [W, H] = this._dim(); this.zoomEm(z, W / 2, H / 2); };
P.zoom100 = function () { this.setZoom(1); };
P.deslocar = function (dx, dy) { const z = this.zoom || 1; this.vx -= dx / z; this.vy -= dy / z; this.aplicarVista(); };
P.alternarPainel = function () { this.painelAberto = !this.painelAberto; this.redesenhar(); };
const setPisoBase = P.setPiso;
P.setPiso = function (id) {
  this._guardarVista();
  const r = setPisoBase.call(this, id);   // a base pede "ajustar"; se o piso já tinha vista, repõe-na
  const v = this._vistas[id];
  if (v) { this.zoom = v.z; this.vx = v.x; this.vy = v.y; this.aplicarVista(true); }
  return r;
};

/* altura até ao fundo da janela; a página deixa de fazer scroll */
P._ajustarAltura = function () {
  const raiz = document.getElementById('plantaRaiz'); if (!raiz) return;
  const ws = document.getElementById('workspaceCondutas');
  if (ws) { ws.classList.add('planta-ativa'); ws.scrollTop = 0; }
  const top = raiz.getBoundingClientRect().top;
  raiz.style.height = Math.max(420, Math.floor(window.innerHeight - top - 10)) + 'px';
};
P.prepararVista = function (p) {
  this._ajustarAltura();
  if (this.zoom == null) this._ajustarVista(p);
  this.aplicarVista(true);
  const palco = this._palco();
  if (palco && !palco._vcLigado) { palco._vcLigado = true; this._ligarPalco(palco); }
};

/* ── rato no palco: zoom, deslocar, coordenadas e medida ── */
const naInterface = t => !!(t && t.closest && t.closest('.planta-flut, .planta-estado'));
P._ligarPalco = function (palco) {
  palco.addEventListener('wheel', ev => {
    if (naInterface(ev.target)) return;
    ev.preventDefault();   // sem isto, Ctrl+roda faria zoom à página inteira
    const r = palco.getBoundingClientRect(), sx = ev.clientX - r.left, sy = ev.clientY - r.top;
    const trackpadPan = !ev.ctrlKey && ev.deltaMode === 0 && Math.abs(ev.deltaX) > 0.5;
    if (trackpadPan) { this.deslocar(-ev.deltaX, -ev.deltaY); return; }
    const k = ev.ctrlKey ? Math.exp(-Math.max(-40, Math.min(40, ev.deltaY)) * 0.01) : (ev.deltaY < 0 ? 1.18 : 1 / 1.18);   // pinça: suave; roda: 18 % por passo
    this.zoomEm((this.zoom || 1) * k, sx, sy);
  }, { passive: false });
  palco.addEventListener('mousedown', ev => { if (ev.button === 1) ev.preventDefault(); });   // sem o scroll automático do botão do meio
  palco.addEventListener('pointerdown', ev => {
    if (naInterface(ev.target)) return;
    if (ev.button === 1 || this._espaco || (this.ferramenta === 'mao' && ev.button === 0)) {
      ev.stopPropagation(); ev.preventDefault();
      this._pan = { x: ev.clientX, y: ev.clientY, id: ev.pointerId };
      try { palco.setPointerCapture(ev.pointerId); } catch (e) { /* captura opcional */ }
      palco.classList.add('a-deslocar'); return;
    }
    if (ev.button === 0) {
      this._ocupado = true;
      if (this.ferramenta === 'sel' && ev.target.closest('.planta-vert, .planta-term')) this._tentativa = { motivo: ev.target.closest('.planta-vert') ? 'canto movido' : 'terminal movido', s: this._estado() };
    }
  }, true);
  palco.addEventListener('pointermove', ev => {
    if (this._pan) { ev.stopPropagation(); const dx = ev.clientX - this._pan.x, dy = ev.clientY - this._pan.y; this._pan.x = ev.clientX; this._pan.y = ev.clientY; this.deslocar(dx, dy); return; }
  }, true);
  palco.addEventListener('pointermove', ev => { if (!naInterface(ev.target)) this._mostrarMedida(ev); });
  const fim = ev => {
    if (this._pan) { ev.stopPropagation(); this._pan = null; palco.classList.remove('a-deslocar'); return; }
    this._ocupado = false;
    if (this._tentativa) { const t = this._tentativa; this._tentativa = null; setTimeout(() => { if (JSON.stringify(t.s) !== JSON.stringify(this._estado())) this._empilhar(t.motivo, t.s); }, 0); }
  };
  palco.addEventListener('pointerup', fim, true);
  palco.addEventListener('pointercancel', fim, true);
  palco.addEventListener('pointerleave', () => { const xy = document.getElementById('plantaXY'); if (xy) xy.textContent = ''; });
};
P._pts = id => { const el = document.getElementById(id); const a = el && el.getAttribute('points'); return a ? a.trim().split(/\s+/).map(s => s.split(',').map(Number)).filter(q => q.length === 2 && !isNaN(q[0])) : []; };
P._mostrarMedida = function (ev) {
  const p = this.pisoAtual(); if (!p) return;
  const q = this._ponto(ev), e = p.escala, m = v => fmt(v * e) + ' m';
  const xy = document.getElementById('plantaXY');
  if (xy) xy.textContent = e ? 'x ' + fmt(q[0] * e) + ' · y ' + fmt(q[1] * e) + ' m' : 'x ' + Math.round(q[0]) + ' · y ' + Math.round(q[1]) + ' px';
  const out = document.getElementById('plantaMedida'); if (!out) return;
  let t = '';
  if (this.ferramenta === 'ret') {
    const r = this._pts('plantaRascunho');
    if (r.length >= 4) { const w = Math.abs(r[1][0] - r[0][0]), h = Math.abs(r[2][1] - r[1][1]); t = e ? m(w) + ' × ' + m(h) + ' = ' + fmt(w * h * e * e) + ' m²' : Math.round(w) + ' × ' + Math.round(h) + ' px'; }
  } else if (this.ferramenta === 'pol' && this.rascunho.length) {
    const pts = this.rascunho.concat([q]); const per = this.comprimentoPx ? this.comprimentoPx(pts) : 0;
    t = (e ? 'contorno ' + m(per) : Math.round(per) + ' px') + (pts.length >= 3 && e ? ' · área ' + fmt(this.areaPx(pts) * e * e) + ' m²' : '');
  } else if (this.ferramenta === 'ramal' && this.tracado && this.tracado.length) {
    const pts = this.tracado.concat([q]); const L = this.comprimentoPx(pts), c = this.curvas(pts).length;
    t = (e ? 'L = ' + m(L) : Math.round(L) + ' px') + ' · ' + c + ' curva' + (c === 1 ? '' : 's');
  } else if (this.ferramenta === 'escala' && this.escalaPts.length === 1) {
    const [a] = this.escalaPts; t = 'linha de ' + Math.round(Math.hypot(q[0] - a[0], q[1] - a[1])) + ' px';
  }
  out.textContent = t;
};

/* ── desfazer da planta ──────────────────── */
P._pilha = []; P._refeitas = [];
P._estado = function () {
  const c = VC.utils.clonar;
  return { e: c(VC.dados.espacos || []), t: c(VC.dados.terminais || []), r: c(VC.dados.ramais || []), tr: c(VC.dados.transferencias || []), pl: (VC.dados.plantas || []).map(x => ({ id: x.id, nome: x.nome, escala: x.escala })) };
};
P._empilhar = function (motivo, s) { this._pilha.push({ motivo, s }); if (this._pilha.length > 40) this._pilha.shift(); this._refeitas = []; };
P._repor = function (s) {
  VC.dados.espacos = VC.utils.clonar(s.e); VC.dados.terminais = VC.utils.clonar(s.t); VC.dados.ramais = VC.utils.clonar(s.r); VC.dados.transferencias = VC.utils.clonar(s.tr);
  (VC.dados.plantas || []).forEach(x => { const o = s.pl.find(y => y.id === x.id); if (o) { x.nome = o.nome; x.escala = o.escala; } });
  if (VC.editorEspacos) VC.editorEspacos._cacheOrdenacao = { chave: null, lista: null };
  if (VC.perf) ['cacheFisica', 'cacheMaterializacao', 'ordenacaoTopologica', 'cacheBalanco'].forEach(k => { if (VC.perf[k] && VC.perf[k].invalidar) VC.perf[k].invalidar(); });
  this.selecionado = null; this.ramalSel = null; this.pendente = null; this.pendenteTrf = null; this.pendenteRamal = null; this.rascunho = []; this.tracado = [];
  VC.estado.forcarSync();
  this.redesenhar();
};
P.desfazer = function () {
  const u = this._pilha.pop(); if (!u) { VC.ui.toast('Nada para desfazer na planta.'); return false; }
  this._refeitas.push({ motivo: u.motivo, s: this._estado() }); this._repor(u.s); VC.ui.toast('Desfeito: ' + u.motivo); return true;
};
P.refazer = function () {
  const u = this._refeitas.pop(); if (!u) { VC.ui.toast('Nada para refazer na planta.'); return false; }
  this._pilha.push({ motivo: u.motivo, s: this._estado() }); this._repor(u.s); VC.ui.toast('Refeito: ' + u.motivo); return true;
};
/* cada operação que muda dados fica no desfazer, só se mudou de facto */
const MOTIVOS = { ligarDesenho: 'desenho ligado ao espaço', criarEspaco: 'espaço criado na planta', usarAreaMedida: 'área medida aplicada', apagarDesenho: 'desenho apagado', aplicarEscala: 'escala calibrada', distribuirTodos: 'terminais distribuídos', redistribuir: 'terminais recolocados', criarTransferencia: 'transferência criada', aplicarRamal: 'traçado do ramal', usarLMedido: 'L medido aplicado', apagarTracado: 'traçado apagado' };
Object.keys(MOTIVOS).forEach(n => {
  const o = P[n]; if (typeof o !== 'function') return;
  P[n] = function () {
    const antes = P._estado(), sig = JSON.stringify(antes);
    const r = o.apply(this, arguments);
    if (JSON.stringify(P._estado()) !== sig) P._empilhar(MOTIVOS[n], antes);
    return r;
  };
});
if (VC.migrador && VC.migrador.prepararParaImportar) {   // outro projeto: o desfazer recomeça
  const o = VC.migrador.prepararParaImportar;
  VC.migrador.prepararParaImportar = function () { P._pilha = []; P._refeitas = []; P._vistas = {}; return o.apply(this, arguments); };
}

/* ── teclado (só com a planta à vista e fora de campos de texto) ── */
const emCampo = t => t && (/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) || t.isContentEditable);
window.addEventListener('keydown', ev => {
  if (!document.getElementById('plantaSVG') || emCampo(ev.target)) return;
  const mod = ev.ctrlKey || ev.metaKey, k = ev.key;
  const tratar = f => { ev.preventDefault(); ev.stopImmediatePropagation(); f(); };
  if (k === ' ' && !mod) { ev.preventDefault(); if (!P._espaco) { P._espaco = true; const pc = P._palco(); if (pc) pc.classList.add('espaco'); } return; }
  if (mod && (k === 'z' || k === 'Z') && !ev.shiftKey) return tratar(() => P.desfazer());
  if (mod && (k === 'y' || k === 'Y' || ((k === 'z' || k === 'Z') && ev.shiftKey))) return tratar(() => P.refazer());
  if (mod && (k === '+' || k === '=')) return tratar(() => P.zoomBotao(1.25));   // em vez do zoom do navegador
  if (mod && k === '-') return tratar(() => P.zoomBotao(1 / 1.25));
  if (mod && k === '0') return tratar(() => P.ajustar());
  if (mod || ev.altKey) return;
  const f = Object.keys(P.TECLAS || {}).find(id => (P.TECLAS[id] || '').toLowerCase() === k.toLowerCase());   // atalhos de P.TECLAS (inclui ferramentas novas)
  if (f && P.FERRAMENTAS.some(x => x[0] === f)) return tratar(() => P.setFerramenta(f));
  if (k === 'f' || k === 'F') return tratar(() => P.ajustar());
  if (k === '0') return tratar(() => P.zoom100());
  if (k === '+' || k === '=') return tratar(() => P.zoomBotao(1.25));
  if (k === '-') return tratar(() => P.zoomBotao(1 / 1.25));
  if (k === 'Delete' || k === 'Backspace') {
    if (P.ramalSel != null && P.apagarTracado) return tratar(() => P.apagarTracado(P.ramalSel));
    if (P.selecionado != null) return tratar(() => P.apagarDesenho(P.selecionado));
  }
}, true);
window.addEventListener('keyup', ev => { if (ev.key === ' ' && P._espaco) { P._espaco = false; const pc = P._palco(); if (pc) pc.classList.remove('espaco'); } });
window.addEventListener('blur', () => { P._espaco = false; });
window.addEventListener('resize', () => { if (document.getElementById('plantaRaiz')) { P._ajustarAltura(); P.aplicarVista(); } });
})();
