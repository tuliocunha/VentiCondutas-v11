/* ============================================================
   VentiCondutas v11.3 · Planta: Fase C e pedidos do utilizador
   ------------------------------------------------------------
   · Nome da sala arrastável (Selecionar): fica em espaco.planta.rotulo;
     duplo clique no nome repõe-no no centro.
   · Terminal ↔ ramal: largar um terminal sobre um ramal desenhado liga-o a
     esse ramal (mesma rede); perto de uma ponta, encaixa nela. Uma linha
     tracejada mostra a que ramal cada terminal está ligado.
   · Renomear ramais no cartão do ramal (em cascata: sub-ramais, terminais,
     espaços, nós e troços — VC.topologia.renomearRamal).
   · Minimapa com a zona visível; clicar ou arrastar leva a vista para lá.
   · Toque: pinça = zoom, dois dedos = deslocar.
   · Ecrã inteiro só com a planta (Esc sai).
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('22-planta-extras');
const P = VC.planta;
if (!P || !P.prepararVista) return;
const esc = s => VC.utils.esc(s);
const fmt = (n, d) => VC.utils.fmt(n, d == null ? 0 : d);
P.minimapa = true;
P.ROTULO_FERR = ['sel', 'ret'];   // ferramentas com que o nome da sala se arrasta

/* ── terminal ↔ ramal ────────────────────── */
P._ramalPerto = function (q, rede, tolPx) {
  const p = this.pisoAtual(), tol = (tolPx || 16) / (this.zoom || 1);
  let melhor = null;
  (this.ramaisDoPiso ? this.ramaisDoPiso(p) : []).forEach(r => {
    if (rede && !VC.redes.compativeis(rede, r.rede)) return;
    const pts = r.planta.pts;
    for (let i = 1; i < pts.length; i++) { const [d, c] = this._distSeg(q, pts[i - 1], pts[i]); if (d < tol && (!melhor || d < melhor.d)) melhor = { d, c, r }; }
    [pts[0], pts[pts.length - 1]].forEach(a => { const d = Math.hypot(q[0] - a[0], q[1] - a[1]); if (d < tol && (!melhor || d <= melhor.d + 1e-9)) melhor = { d, c: a, r, ponta: true }; });
  });
  return melhor;
};
P.ligarTerminalAoRamal = function (idT) {
  const t = (VC.dados.terminais || []).find(x => String(x.id) === String(idT)); const p = this.pisoAtual();
  if (!t || !t.planta || !p || t.planta.pisoId !== p.id || !VC.topologia || !VC.topologia._atribuirTerminaisAoRamal) return false;
  const m = this._ramalPerto([t.planta.x, t.planta.y], t.rede);
  if (!m) return false;
  const antes = this._estado();
  if (m.ponta) t.planta = { pisoId: p.id, x: m.c[0], y: m.c[1] };   // encaixa na ponta do ramal
  let ligou = false;
  if (t.ramalRef !== m.r.nome) {
    ligou = VC.topologia._atribuirTerminaisAoRamal(m.r.nome, [t]) > 0;
    if (ligou) VC.estado.forcarSync();
  }
  if (ligou || m.ponta) { this._empilhar(ligou ? 'terminal associado ao ramal ' + m.r.nome : 'terminal encaixado na ponta', antes); }
  if (ligou) VC.ui.toast('«' + (t.nome || t.id) + '» associado ao ramal ' + m.r.nome + (m.ponta ? ' (na ponta)' : '') + '.');
  this.redesenhar();
  return ligou;
};

/* comprimento (m) da ligação entre o terminal e o ramal desenhado a que está ligado; null se não houver */
P.comprimentoLigacao = function (t) {
  const p = this.pisoAtual(); if (!t || !t.planta || !p || !p.escala || t.planta.pisoId !== p.id) return null;
  const r = (this.ramaisDoPiso ? this.ramaisDoPiso(p) : []).find(x => x.nome === t.ramalRef); if (!r) return null;
  let d = Infinity; for (let i = 1; i < r.planta.pts.length; i++) d = Math.min(d, this._distSeg([t.planta.x, t.planta.y], r.planta.pts[i - 1], r.planta.pts[i])[0]);
  return d * p.escala;
};

/* ── renomear ramal no cartão ────────────── */
P.renomearRamalPlanta = function (id, novo) {
  const r = (VC.dados.ramais || []).find(x => String(x.id) === String(id)); if (!r || this._bloqueado()) return;
  const antigo = r.nome, antes = this._estado();
  const res = VC.topologia.renomearRamal(antigo, novo);
  if (!res.ok) { VC.ui.toast(res.erro); return; }
  if (r.nome !== antigo) { this._empilhar('ramal ' + antigo + ' → ' + r.nome, antes); VC.estado.forcarSync(); VC.ui.toast('Ramal ' + antigo + ' → ' + r.nome + (res.n ? ' (' + res.n + ' referências atualizadas)' : '') + '.'); }
  this.redesenhar();
};
const painelBase = P._painel;
P._painel = function (p) {
  let h = painelBase.call(this, p);
  const r = (VC.dados.ramais || []).find(x => String(x.id) === String(this.ramalSel));
  if (r && r.planta && !this.pendenteRamal) {
    const t = '<div class="planta-card-t">Ramal ' + esc(r.nome) + '</div>';
    h = h.replace(t, t + '<div class="planta-renomear"><label for="rmNome">Nome</label><input id="rmNome" value="' + esc(r.nome) + '" maxlength="40" onkeydown="if(event.key===\'Enter\')VC.planta.renomearRamalPlanta(' + r.id + ', this.value)"><button class="btn btn-mini" onclick="VC.planta.renomearRamalPlanta(' + r.id + ', document.getElementById(\'rmNome\').value)">Renomear</button></div>');
  }
  return h;
};

/* ── desenho: ligações terminal → ramal ──── */
const svgBase = P._svg;
P._svg = function (p) {
  const s = svgBase.call(this, p);
  const porNome = {}; (this.ramaisDoPiso ? this.ramaisDoPiso(p) : []).forEach(r => { porNome[r.nome] = r; });
  let x = '';
  (VC.dados.terminais || []).forEach(t => {
    const r = t.planta && t.planta.pisoId === p.id && porNome[t.ramalRef]; if (!r) return;
    const q = [t.planta.x, t.planta.y]; let best = null;
    for (let i = 1; i < r.planta.pts.length; i++) { const [d, c] = this._distSeg(q, r.planta.pts[i - 1], r.planta.pts[i]); if (!best || d < best[0]) best = [d, c]; }
    if (best && best[0] > 0.5) x += '<line class="planta-ligacao" x1="' + best[1][0] + '" y1="' + best[1][1] + '" x2="' + q[0] + '" y2="' + q[1] + '" stroke="' + (this._corRamal ? this._corRamal(r) : '#2f5f8f') + '" stroke-width="1.6" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/>';
  });
  const i = s.indexOf('<g class="planta-term"');
  return i >= 0 ? s.slice(0, i) + x + s.slice(i) : s.replace(/<\/svg>$/, x + '</svg>');
};

/* ── minimapa, ecrã inteiro ──────────────── */
const renderBase = P.render;
P.render = function () {
  let h = renderBase.call(this);
  const p = this.pisoAtual();
  if (!p || !p.imagem || h.indexOf('id="plantaRaiz"') < 0) return h;
  const fs = !!document.fullscreenElement;
  h = h.replace('<button class="planta-bt planta-btpainel"', '<button class="planta-bt" onclick="VC.planta.ecraInteiro()" aria-pressed="' + fs + '" title="Só a planta, em ecrã inteiro (Esc sai)">' + (fs ? 'Sair do ecrã inteiro' : '⛶ Ecrã inteiro') + '</button><button class="planta-bt planta-btpainel"');
  h = h.replace('<button class="planta-bt" onclick="VC.planta.ajustar()"', '<button class="planta-bt" onclick="VC.planta.alternarMinimapa()" aria-pressed="' + this.minimapa + '" title="Mostrar ou esconder o minimapa">Mapa</button><button class="planta-bt" onclick="VC.planta.ajustar()"');
  if (this.minimapa) {
    const w = p.w >= p.h ? 200 : Math.round(150 * p.w / p.h), hh = Math.round(w * p.h / p.w);
    h = h.replace('<div class="planta-estado"', '<div class="planta-flut planta-minimapa" style="width:' + w + 'px;height:' + hh + 'px" title="Clique ou arraste para mover a vista"><svg id="plantaMini" viewBox="0 0 ' + p.w + ' ' + p.h + '" width="' + w + '" height="' + hh + '" aria-label="Minimapa"><image href="' + p.imagem + '" width="' + p.w + '" height="' + p.h + '" preserveAspectRatio="none" opacity="0.85"/><rect id="plantaMiniRect" x="0" y="0" width="0" height="0" fill="rgba(79,109,140,.18)" stroke="#2f5f8f" stroke-width="2" vector-effect="non-scaling-stroke"/></svg></div><div class="planta-estado"');
  }
  return h;
};
P.alternarMinimapa = function () { this.minimapa = !this.minimapa; this.redesenhar(); };
P._atualizarMini = function () {
  const r = document.getElementById('plantaMiniRect'); if (!r) return;
  const [x, y, w, h] = this.viewBox();
  r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', w); r.setAttribute('height', h);
};
const aplicarBase = P.aplicarVista;
P.aplicarVista = function () { const r = aplicarBase.apply(this, arguments); this._atualizarMini(); return r; };
P.ecraInteiro = function () {
  const el = document.getElementById('conteudoPasso'); if (!el) return;
  if (document.fullscreenElement) { document.exitFullscreen && document.exitFullscreen(); return; }
  if (!el.requestFullscreen) { VC.ui.toast('Este navegador não permite ecrã inteiro.'); return; }
  el.requestFullscreen().catch(e => VC.ui.toast('Ecrã inteiro recusado: ' + e.message));
};
document.addEventListener('fullscreenchange', () => { if (document.getElementById('plantaRaiz')) P.redesenhar(); });

/* ── interação: nome da sala, terminais, minimapa e toque ── */
const prepBase = P.prepararVista;
P.prepararVista = function (p) {
  prepBase.apply(this, arguments);
  this._atualizarMini();
  const palco = this._palco(), raiz = document.getElementById('plantaRaiz');
  if (palco && !palco._vcExtras) { palco._vcExtras = true; this._ligarExtras(palco); }
  if (raiz && !raiz._vcToque) { raiz._vcToque = true; this._ligarToque(raiz); }
  const mini = document.getElementById('plantaMini');
  if (mini && !mini._vc) { mini._vc = true; this._ligarMini(mini); }
};
P._ligarMini = function (mini) {
  const ir = ev => {
    const p = this.pisoAtual(), b = mini.getBoundingClientRect(), [W, H] = this._dim(), z = this.zoom || 1;
    const ix = (ev.clientX - b.left) / b.width * p.w, iy = (ev.clientY - b.top) / b.height * p.h;
    this.vx = ix - W / z / 2; this.vy = iy - H / z / 2; this.aplicarVista();
  };
  let ativo = false;
  mini.addEventListener('pointerdown', ev => { ev.stopPropagation(); ev.preventDefault(); ativo = true; try { mini.setPointerCapture(ev.pointerId); } catch (e) { /* opcional */ } ir(ev); });
  mini.addEventListener('pointermove', ev => { if (ativo) { ev.stopPropagation(); ir(ev); } });
  mini.addEventListener('pointerup', () => { ativo = false; });
};
P._ligarExtras = function (palco) {
  palco.addEventListener('pointerdown', ev => {
    if (ev.button !== 0 || this._espaco) return;
    const rot = ev.target.closest('.planta-rotulo'), term = ev.target.closest('.planta-term');
    if (term && this.ferramenta === 'sel') { this._termDrag = term.dataset.t; return; }   // o arrasto em si é tratado em 19-planta-rede.js
    /* o nome arrasta-se com Selecionar e também com o Retângulo (a ferramenta com que se acabou de desenhar a sala) */
    if (!rot || this.ROTULO_FERR.indexOf(this.ferramenta) < 0) return;
    ev.stopPropagation(); ev.preventDefault();
    const e = (VC.dados.espacos || []).find(x => String(x.id) === String(rot.dataset.esp)); if (!e || !e.planta) return;
    const base = (e.planta.rotulo && e.planta.rotulo.length === 2) ? e.planta.rotulo : this.centro(e.planta.pts);
    this._rot = { e, el: rot, x0: ev.clientX, y0: ev.clientY, base, moveu: false };
    try { palco.setPointerCapture(ev.pointerId); } catch (e2) { /* opcional */ }
  }, true);
  palco.addEventListener('pointermove', ev => {
    if (!this._rot) return;
    ev.stopPropagation();
    const z = this.zoom || 1, dx = (ev.clientX - this._rot.x0) / z, dy = (ev.clientY - this._rot.y0) / z;
    if (Math.hypot(ev.clientX - this._rot.x0, ev.clientY - this._rot.y0) > 3) this._rot.moveu = true;
    this._rot.el.setAttribute('transform', 'translate(' + dx + ' ' + dy + ')');
  }, true);
  palco.addEventListener('pointerup', ev => {
    if (this._rot) {
      ev.stopPropagation();
      const R = this._rot; this._rot = null;
      if (!R.moveu) { this.selecionar(R.e.id); return; }
      if (this._bloqueado()) { this.redesenhar(); return; }
      const z = this.zoom || 1, antes = this._estado();
      R.e.planta.rotulo = [Math.round((R.base[0] + (ev.clientX - R.x0) / z) * 10) / 10, Math.round((R.base[1] + (ev.clientY - R.y0) / z) * 10) / 10];
      this._empilhar('nome de «' + R.e.nome + '» movido', antes);
      this.redesenhar(); return;
    }
    if (this._termDrag) { const id = this._termDrag; this._termDrag = null; setTimeout(() => this.ligarTerminalAoRamal(id), 0); }
  }, true);
  palco.addEventListener('dblclick', ev => {
    const rot = this.ROTULO_FERR.indexOf(this.ferramenta) >= 0 && ev.target.closest('.planta-rotulo'); if (!rot) return;
    const e = (VC.dados.espacos || []).find(x => String(x.id) === String(rot.dataset.esp));
    if (e && e.planta && e.planta.rotulo) { const antes = this._estado(); delete e.planta.rotulo; this._empilhar('nome reposto no centro', antes); this.redesenhar(); }
  }, true);
  /* dica ao passar por cima de um terminal ou de um nome */
  palco.addEventListener('pointermove', ev => {
    const out = document.getElementById('plantaMedida'); if (!out || this._rot) return;
    const g = ev.target.closest && ev.target.closest('.planta-term');
    if (g) {
      const t = (VC.dados.terminais || []).find(x => String(x.id) === String(g.dataset.t));
      if (t) {
        const lig = this.comprimentoLigacao ? this.comprimentoLigacao(t) : null;
        out.textContent = (t.nome || t.id) + ' · ' + fmt(t.Q) + ' m³/h · ramal ' + (t.ramalRef || '—')
          + (lig != null && lig > 0.05 ? ' · ligação ' + VC.utils.fmt(lig, 2) + ' m' + (lig > 0.5 ? ' (não entra no L — ligações flexíveis: ver Sistema › Funções planeadas)' : '') : '')
          + (this.ferramenta === 'sel' ? ' — arraste para mover; largue sobre um ramal para o associar' : ' — use Selecionar (V) para o mover');
      }
    } else if (ev.target.closest && ev.target.closest('.planta-sala')) {
      if (this.ROTULO_FERR.indexOf(this.ferramenta) >= 0 && ev.target.closest('.planta-rotulo')) out.textContent = 'Arraste o nome para o mover; duplo clique repõe-no no centro';
      else if (this.ROTULO_FERR.indexOf(this.ferramenta) < 0 && this.ferramenta !== 'mao' && !(this.rascunho.length || (this.tracado && this.tracado.length))) out.textContent = 'Para mover o nome da sala, prima V (Selecionar) ou R (Retângulo)';
    }
  });
};
/* toque: dois dedos = zoom (pinça) e deslocar; trata-se antes de chegar às ferramentas */
P._ligarToque = function (raiz) {
  const toques = new Map(); let g = null;
  const centro = () => { const a = [...toques.values()]; return [(a[0].x + a[1].x) / 2, (a[0].y + a[1].y) / 2, Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y)]; };
  raiz.addEventListener('pointerdown', ev => {
    if (ev.pointerType !== 'touch' || !ev.target.closest('#plantaTela') || ev.target.closest('.planta-flut, .planta-estado')) return;
    toques.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (toques.size === 2) {
      ev.stopPropagation(); ev.preventDefault();
      const pal = this._palco().getBoundingClientRect(), [cx, cy, d] = centro(), z = this.zoom || 1;
      g = { d0: Math.max(10, d), z0: z, ix: this.vx + (cx - pal.left) / z, iy: this.vy + (cy - pal.top) / z };
      this._pan = null; this.rascunho = this.rascunho.slice(0, -1);   // o 1.º dedo não conta como ponto
    }
  }, true);
  raiz.addEventListener('pointermove', ev => {
    if (ev.pointerType !== 'touch' || !toques.has(ev.pointerId)) return;
    toques.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (!g || toques.size < 2) return;
    ev.stopPropagation(); ev.preventDefault();
    const pal = this._palco().getBoundingClientRect(), [cx, cy, d] = centro();
    const z = Math.max(0.03, Math.min(8, g.z0 * d / g.d0));
    this.zoom = z; this.vx = g.ix - (cx - pal.left) / z; this.vy = g.iy - (cy - pal.top) / z;   // o ponto tocado fica debaixo dos dedos
    this.aplicarVista();
  }, true);
  const fim = ev => { if (ev.pointerType !== 'touch') return; toques.delete(ev.pointerId); if (toques.size < 2 && g) { g = null; ev.stopPropagation(); } };
  raiz.addEventListener('pointerup', fim, true);
  raiz.addEventListener('pointercancel', fim, true);
};
})();
