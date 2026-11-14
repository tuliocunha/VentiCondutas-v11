/* ============================================================
   VentiCondutas v11.3 · Ramais na planta (PR 4)
   ------------------------------------------------------------
   · Ferramenta "Ramal": clicar o percurso da conduta ponto a ponto
     (duplo clique, Enter ou clique no último ponto para terminar).
   · O comprimento sai da escala → L do ramal (fim do L escrito à mão).
   · Cada mudança de direção conta como curva → ζ sugerido
     (0,25 por curva de 90° com r/D ≈ 1, proporcional ao ângulo, + 0,3 da derivação).
   · O traço liga-se a um ramal existente ou cria um ramal novo (filho do ramal
     onde começa, ou principal de uma UTA). Terminais tocados pelo traço ligam-se
     a esse ramal, se forem da mesma rede.
   · Depois do cálculo, cada ramal aparece com Ø e cor do estado; clicar mostra
     Q, v, Δp e o L da tabela vs o medido.
   Dados: ramal.planta = { pisoId, pts: [[x, y], …] } (píxeis da imagem).
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('20-planta-ramais');
const P = VC.planta;
if (!P) return;
const esc = s => VC.utils.esc(s);
const fmt = (n, d) => VC.utils.fmt(n, d == null ? 2 : d);
const ZETA_CURVA_90 = 0.25, ZETA_DERIVACAO = 0.3, ANG_MIN = 25;   // graus abaixo dos quais não conta como curva

P.FERRAMENTAS.push(['ramal', 'fa-route', 'Ramal']);
P.DICAS.ramal = 'Clique o percurso da conduta, desde o ramal de onde sai até aos terminais. Termine com duplo clique, Enter ou clique no último ponto. Esc cancela.';
P.tracado = []; P.pendenteRamal = null; P.ramalSel = null;

/* ── geometria ───────────────────────────── */
P.comprimentoPx = function (pts) { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; };
P.comprimentoM = function (pts, piso) { return piso && piso.escala ? this.comprimentoPx(pts) * piso.escala : null; };
P.curvas = function (pts) {   // ângulos de mudança de direção, em graus
  const out = [];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]), b = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]);
    let d = Math.abs(b - a) * 180 / Math.PI; if (d > 180) d = 360 - d;
    if (d >= ANG_MIN) out.push(Math.round(d));
  }
  return out;
};
P.zetaSugerido = function (pts) { return Math.round((ZETA_DERIVACAO + this.curvas(pts).reduce((s, g) => s + ZETA_CURVA_90 * Math.min(g, 90) / 90, 0)) * 100) / 100; };
P._distSeg = function (q, a, b) {   // distância de q ao segmento ab e o ponto mais próximo
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
  const t = L2 ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / L2)) : 0;
  const c = [a[0] + t * dx, a[1] + t * dy];
  return [Math.hypot(q[0] - c[0], q[1] - c[1]), c];
};
P.ramaisDoPiso = function (piso) { return (VC.dados.ramais || []).filter(r => r.planta && piso && r.planta.pisoId === piso.id && Array.isArray(r.planta.pts) && r.planta.pts.length >= 2); };
/* encaixe: perto de um ramal desenhado (fica o ramal-pai) ou de um terminal colocado */
P._encaixar = function (q) {
  const p = this.pisoAtual(), tol = 12 / (this.zoom || 1);
  let best = null;
  this.ramaisDoPiso(p).forEach(r => { for (let i = 1; i < r.planta.pts.length; i++) { const [d, c] = this._distSeg(q, r.planta.pts[i - 1], r.planta.pts[i]); if (d < tol && (!best || d < best.d)) best = { d, q: c, ramal: r }; } });
  (VC.dados.terminais || []).forEach(t => { if (t.planta && t.planta.pisoId === p.id) { const d = Math.hypot(q[0] - t.planta.x, q[1] - t.planta.y); if (d < tol && (!best || d < best.d)) best = { d, q: [t.planta.x, t.planta.y], terminal: t }; } });
  return best;
};
P._terminaisTocados = function (pts) {
  const p = this.pisoAtual(), tol = 14 / (this.zoom || 1);
  return (VC.dados.terminais || []).filter(t => t.planta && t.planta.pisoId === p.id && pts.some((a, i) => i > 0 && this._distSeg([t.planta.x, t.planta.y], pts[i - 1], a)[0] < tol));
};

/* ── traçar ──────────────────────────────── */
P.terminarTracado = function () {
  if (this.tracado.length < 2) { VC.ui.toast('Um ramal precisa de pelo menos 2 pontos.'); return; }
  const pts = this.tracado.map(q => [Math.round(q[0] * 10) / 10, Math.round(q[1] * 10) / 10]);
  const ini = this._encaixar(pts[0]);
  this.pendenteRamal = { pts, pai: ini && ini.ramal ? ini.ramal.nome : null, terminais: this._terminaisTocados(pts).map(t => t.id) };
  this.tracado = []; this.ramalSel = null; this.selecionado = null; this._fimTracado = Date.now();
  this.redesenhar();
};
const cancelarBase = P.cancelar;
P.cancelar = function () { this.tracado = []; this.pendenteRamal = null; return cancelarBase.apply(this, arguments); };
const setFerrBase = P.setFerramenta;
P.setFerramenta = function () { this.tracado = []; this.pendenteRamal = null; return setFerrBase.apply(this, arguments); };

/* aplica o traço a um ramal (existente ou novo) */
P.aplicarRamal = function (opc) {
  const pr = this.pendenteRamal, p = this.pisoAtual();
  if (!pr || !p || this._bloqueado()) return;
  let r = null;
  if (opc.ramal) r = (VC.dados.ramais || []).find(x => x.nome === opc.ramal);
  else if (opc.novoPai !== undefined) r = this._novoRamal(opc.novoPai, opc.uta);
  if (!r) { VC.ui.toast('Escolha um ramal, ou crie um novo.'); return; }
  r.planta = { pisoId: p.id, pts: pr.pts };
  const L = this.comprimentoM(pr.pts, p);
  const mud = [];
  if (opc.usarL && L) { r.L = Math.round(L * 100) / 100; mud.push('L = ' + fmt(r.L) + ' m'); }
  if (opc.usarZeta) { r.zeta = this.zetaSugerido(pr.pts); mud.push('ζ = ' + fmt(r.zeta)); }
  if (opc.ligarTerminais && pr.terminais.length && VC.topologia && VC.topologia._atribuirTerminaisAoRamal) {
    const T = (VC.dados.terminais || []).filter(t => pr.terminais.indexOf(t.id) >= 0);
    const n = VC.topologia._atribuirTerminaisAoRamal(r.nome, T);
    if (n) mud.push(n + ' terminal' + (n > 1 ? 'is' : '') + ' ligado' + (n > 1 ? 's' : ''));
    if (n < T.length) mud.push((T.length - n) + ' de outra rede não ligado' + (T.length - n > 1 ? 's' : ''));
  }
  this.pendenteRamal = null; this.ramalSel = r.id; this.ferramenta = 'sel';
  if (VC.historico && VC.historico.push) VC.historico.push('traçado do ramal ' + r.nome);
  VC.estado.forcarSync();
  VC.ui.toast('Ramal ' + r.nome + ' desenhado' + (mud.length ? ' · ' + mud.join(' · ') : '') + '.');
  this.redesenhar();
};
P._novoRamal = function (paiNome, utaId) {
  if (!VC.topologia || !VC.topologia._criarRamal) return null;
  const pai = paiNome ? (VC.dados.ramais || []).find(r => r.nome === paiNome) : null;
  let opts;
  if (pai) {
    const nv = (pai.nivelNumero || 1) + 1;
    if (nv > 4) { VC.ui.toast('Nível máximo (N4) atingido em ' + pai.nome + '.'); return null; }
    const base = pai.nome + '.' + ((VC.dados.ramais || []).filter(r => r.parente === pai.nome).length + 1);
    opts = { nome: this._nomeLivre(base), parente: pai.nome, nivelNumero: nv, rede: pai.rede || 'insuflacao', utaRef: pai.utaRef || null, L: 1, zeta: 0.5, localizacao: pai.localizacao };
  } else {
    const u = (VC.dados.utas || []).find(x => String(x.id) === String(utaId));
    if (!u) { VC.ui.toast('Escolha a UTA do ramal principal.'); return null; }
    const base = 'R' + ((VC.dados.utas || []).indexOf(u) + 1) + '.' + ((VC.dados.ramais || []).filter(r => !r.parente && r.utaRef === u.id).length + 1);
    opts = { nome: this._nomeLivre(base), parente: '', nivelNumero: 1, rede: u.rede || 'insuflacao', utaRef: u.id, L: 1, zeta: 0.8, localizacao: { piso: (this.pisoAtual() || {}).nome || 'P0', ala: null, cota: null } };
  }
  VC.topologia._criarRamal(opts);
  return (VC.dados.ramais || []).find(r => r.nome === opts.nome) || null;
};
P._nomeLivre = function (base) { let n = base, k = 1; while ((VC.dados.ramais || []).some(r => r.nome === n)) n = base + '_' + (++k); return n; };
P.usarLMedido = function (id) {
  const r = (VC.dados.ramais || []).find(x => String(x.id) === String(id)); const p = this.pisoAtual();
  if (!r || !r.planta || this._bloqueado()) return;
  const L = this.comprimentoM(r.planta.pts, p); if (!L) return;
  r.L = Math.round(L * 100) / 100; if (VC.historico && VC.historico.push) VC.historico.push('L medido de ' + r.nome);
  VC.estado.forcarSync(); VC.ui.toast(r.nome + ': L = ' + fmt(r.L) + ' m (medido na planta).'); this.redesenhar();
};
P.apagarTracado = function (id) {
  const r = (VC.dados.ramais || []).find(x => String(x.id) === String(id)); if (!r || this._bloqueado()) return;
  delete r.planta; this.ramalSel = null; if (VC.historico && VC.historico.push) VC.historico.push('traçado apagado'); this.redesenhar();
};
P.selecionarRamal = function (id) { this.ramalSel = id; this.selecionado = null; this.trfSel = null; this.pendente = null; this.pendenteRamal = null; this.redesenhar(); };
const selBase = P.selecionar;
P.selecionar = function () { this.ramalSel = null; return selBase.apply(this, arguments); };

/* ── desenho ─────────────────────────────── */
P._corRamal = function (r) {
  if (r.status === 'ERRO' || r.status === 'NÃO CONF.') return '#a14b4b';
  if (r.status === 'ATENÇÃO' || r.avisoSecao) return '#b7791f';
  return r.rede === 'insuflacao' ? '#2f5f8f' : (r.rede === 'extracao_suja' ? '#7a3b3b' : '#2f6b45');
};
const svgBase = P._svg;
P._svg = function (p) {
  const s = svgBase.call(this, p), z = this.zoom || 1;
  let x = '';
  this.ramaisDoPiso(p).forEach(r => {
    const pts = r.planta.pts, cor = this._corRamal(r), on = String(this.ramalSel) === String(r.id);
    const lw = Math.max(2.5, Math.min(9, (Number(r.Dcom) || 160) / 45)) + (on ? 3 : 0);
    let k = 1, maior = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (l > maior) { maior = l; k = i; } }
    const mx = (pts[k][0] + pts[k - 1][0]) / 2, my = (pts[k][1] + pts[k - 1][1]) / 2;
    const rot = r.nome + (r.Dcom ? ' · Ø' + r.Dcom : (r.secaoCalc ? ' · ' + r.secaoCalc : ''));
    x += '<g class="planta-ramal' + (on ? ' sel' : '') + '" data-r="' + r.id + '"><title>' + esc(r.nome) + ' · ' + esc(r.rede) + ' · Q ' + fmt(r.Q, 0) + ' m³/h · v ' + fmt(r.v) + ' m/s · Δp ' + fmt(r.deltaPTroco, 1) + ' Pa</title>'
      + '<polyline points="' + pts.map(q => q.join(',')).join(' ') + '" fill="none" stroke="#fff" stroke-width="' + (lw + 3) + '" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>'
      + '<polyline points="' + pts.map(q => q.join(',')).join(' ') + '" fill="none" stroke="' + cor + '" stroke-width="' + lw + '" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>'
      + '<text x="' + mx + '" y="' + (my - 7 / z) + '" font-size="' + 11.5 / z + '" text-anchor="middle" font-weight="800" fill="' + cor + '">' + esc(rot) + '</text></g>';
  });
  if (this.ferramenta === 'ramal' || this.tracado.length) {
    const pts = this.tracado.concat(this.ponteiro && this.tracado.length ? [this.ponteiro] : []);
    x += '<polyline id="plantaTracado" points="' + pts.map(q => q.join(',')).join(' ') + '" fill="none" stroke="#2f5f8f" stroke-width="4" stroke-dasharray="8 5" vector-effect="non-scaling-stroke"/>'
      + this.tracado.map(q => '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="' + 4.5 / z + '" fill="#2f5f8f"/>').join('');
  }
  if (this.pendenteRamal) x += '<polyline points="' + this.pendenteRamal.pts.map(q => q.join(',')).join(' ') + '" fill="none" stroke="#2f5f8f" stroke-width="5" stroke-dasharray="10 6" vector-effect="non-scaling-stroke"/>';
  /* os ramais ficam por baixo dos terminais: entram logo a seguir à imagem e às salas */
  const corte = s.indexOf('<g class="planta-term"') >= 0 ? s.indexOf('<g class="planta-term"') : s.lastIndexOf('</svg>');
  return s.slice(0, corte) + x + s.slice(corte);
};

/* ── painel ──────────────────────────────── */
const painelBase = P._painel;
P._painel = function (p) {
  let h = painelBase.call(this, p);
  const pr = this.pendenteRamal;
  if (pr) {
    const L = this.comprimentoM(pr.pts, p), cv = this.curvas(pr.pts), z = this.zetaSugerido(pr.pts);
    const todos = (VC.dados.ramais || []).slice().sort((a, b) => (a.planta ? 1 : 0) - (b.planta ? 1 : 0) || a.nome.localeCompare(b.nome, 'pt', { numeric: true }));
    const utas = (VC.dados.utas || []);
    h = '<div class="planta-card destaque"><div class="planta-card-t">Novo traçado de ramal</div>'
      + '<div class="planta-kpis"><div><span>L medido</span><b>' + (L ? fmt(L) + ' m' : '—') + '</b></div><div><span>Curvas</span><b>' + cv.length + (cv.length ? ' (' + cv.map(g => g + '°').join(', ') + ')' : '') + '</b></div><div><span>ζ sugerido</span><b>' + fmt(z) + '</b></div></div>'
      + (L ? '' : '<p class="planta-aviso">Sem escala: o L não pode ser medido. Calibre a escala primeiro.</p>')
      + (pr.pai ? '<p class="planta-meta">Começa no ramal <b>' + esc(pr.pai) + '</b>.</p>' : '')
      + (pr.terminais.length ? '<p class="planta-meta">Toca ' + pr.terminais.length + ' terminal' + (pr.terminais.length > 1 ? 'is' : '') + '.</p>' : '')
      + '<label class="planta-chk"><input type="checkbox" id="rmUsarL"' + (L ? ' checked' : ' disabled') + '> Usar o L medido</label>'
      + '<label class="planta-chk"><input type="checkbox" id="rmUsarZ"> Usar o ζ sugerido (curvas + derivação)</label>'
      + (pr.terminais.length ? '<label class="planta-chk"><input type="checkbox" id="rmLigarT" checked> Ligar os terminais tocados a este ramal</label>' : '')
      + '<label for="rmExistente">É o traçado de um ramal que já existe</label><select id="rmExistente"><option value="">— escolher —</option>' + todos.map(r => '<option value="' + esc(r.nome) + '">' + esc(r.nome) + ' · ' + esc(r.rede) + (r.planta ? ' · já desenhado' : '') + '</option>').join('') + '</select>'
      + '<div class="planta-acoes"><button class="btn primario" onclick="VC.planta._aplicarDoPainel(\'existente\')">Usar este traçado</button></div>'
      + '<div class="planta-ou">ou criar um ramal novo</div>'
      + '<label for="rmPai">Sai de</label><select id="rmPai"><option value="">— ramal principal de uma UTA —</option>' + todos.filter(r => (r.nivelNumero || 1) < 4).map(r => '<option value="' + esc(r.nome) + '"' + (r.nome === pr.pai ? ' selected' : '') + '>' + esc(r.nome) + ' (N' + (r.nivelNumero || 1) + ')</option>').join('') + '</select>'
      + '<label for="rmUta">UTA (só para um ramal principal)</label><select id="rmUta">' + utas.map(u => '<option value="' + u.id + '">' + esc(u.nome) + ' · ' + esc(VC.redes.rotulo(u.rede)) + '</option>').join('') + '</select>'
      + '<div class="planta-acoes"><button class="btn primario" onclick="VC.planta._aplicarDoPainel(\'novo\')">Criar ramal</button><button class="btn" onclick="VC.planta.cancelar()">Cancelar</button></div></div>' + h;
    return h;
  }
  const r = (VC.dados.ramais || []).find(x => String(x.id) === String(this.ramalSel));
  if (r && r.planta) {
    const L = this.comprimentoM(r.planta.pts, p), Lt = Number(r.L) || 0, difere = L && Math.abs(L - Lt) > Math.max(0.05, Lt * 0.02);
    const card = '<div class="planta-card"><div class="planta-card-t">Ramal ' + esc(r.nome) + '</div>'
      + '<div class="planta-kpis"><div><span>Secção</span><b>' + esc(r.secaoCalc || (r.Dcom ? 'Ø' + r.Dcom : '—')) + '</b></div><div><span>Q</span><b>' + fmt(r.Q, 0) + ' m³/h</b></div><div><span>v</span><b>' + fmt(r.v) + ' m/s</b></div></div>'
      + '<div class="planta-kpis"><div><span>L na tabela</span><b>' + fmt(Lt) + ' m</b></div><div><span>L medido</span><b>' + (L ? fmt(L) + ' m' : '—') + '</b></div><div><span>Δp troço</span><b>' + fmt(r.deltaPTroco, 1) + ' Pa</b></div></div>'
      + '<p class="planta-meta">' + esc(r.rede) + ' · N' + (r.nivelNumero || '?') + (r.parente ? ' · sai de ' + esc(r.parente) : '') + ' · ' + esc(r.status || '') + '</p>'
      + (r.avisoSecao ? '<p class="planta-aviso">' + esc(r.avisoSecao) + '</p>' : '')
      + '<div class="planta-acoes">' + (difere ? '<button class="btn primario" onclick="VC.planta.usarLMedido(' + r.id + ')">Usar L medido</button>' : '')
      + '<button class="btn" onclick="VC.planta.apagarTracado(' + r.id + ')">Apagar traçado</button></div></div>';
    h = card + h;
  }
  const n = this.ramaisDoPiso(p).length, nt = (VC.dados.ramais || []).length;
  return h.replace('<div class="planta-lista-t">', '<p class="planta-meta">Ramais desenhados neste piso: <b>' + n + '</b> de ' + nt + '.</p><div class="planta-lista-t">');
};
P._aplicarDoPainel = function (modo) {
  const v = id => { const el = document.getElementById(id); return el ? (el.type === 'checkbox' ? el.checked : el.value) : null; };
  const base = { usarL: !!v('rmUsarL'), usarZeta: !!v('rmUsarZ'), ligarTerminais: !!v('rmLigarT') };
  if (modo === 'existente') { if (!v('rmExistente')) { VC.ui.toast('Escolha o ramal na lista.'); return; } this.aplicarRamal(Object.assign(base, { ramal: v('rmExistente') })); }
  else this.aplicarRamal(Object.assign(base, { novoPai: v('rmPai') || '', uta: v('rmUta') }));
};

/* ── interação ───────────────────────────── */
const ligarBase = P.ligar;
P.ligar = function () {
  ligarBase.apply(this, arguments);
  const svg = document.getElementById('plantaSVG'); if (!svg) return;
  svg.addEventListener('pointerdown', ev => {
    if (ev.button !== 0) return;
    if (this.ferramenta === 'sel') {
      const g = ev.target.closest('.planta-ramal');
      if (g && !ev.target.closest('.planta-term') && !ev.target.closest('.planta-vert')) { ev.stopImmediatePropagation(); this.selecionarRamal(Number(g.dataset.r)); }
      return;
    }
    if (this.ferramenta !== 'ramal') return;
    ev.stopImmediatePropagation(); ev.preventDefault();
    if (this._bloqueado()) return;
    if (this._fimTracado && Date.now() - this._fimTracado < 500) return;   // 2.º clique do duplo clique que terminou o traçado
    const raw = this._ponto(ev), e = this._encaixar(raw), q = e ? e.q : raw;
    if (this.tracado.length >= 2) { const u = this.tracado[this.tracado.length - 1]; if (Math.hypot(q[0] - u[0], q[1] - u[1]) * (this.zoom || 1) < 8) { this.terminarTracado(); return; } }
    this.tracado.push(q); this.pendenteRamal = null; this.redesenhar();
  }, true);
  svg.addEventListener('pointermove', ev => {
    if (this.ferramenta !== 'ramal' || !this.tracado.length) return;
    const raw = this._ponto(ev), e = this._encaixar(raw), q = e ? e.q : raw;
    this.ponteiro = q;
    const l = document.getElementById('plantaTracado'); if (l) l.setAttribute('points', this.tracado.concat([q]).map(a => a.join(',')).join(' '));
  }, true);
  svg.addEventListener('dblclick', ev => { if (this.ferramenta === 'ramal' && this.tracado.length >= 2) { ev.preventDefault(); ev.stopImmediatePropagation(); this.terminarTracado(); } }, true);
};
document.addEventListener('keydown', ev => {
  if (!document.getElementById('plantaSVG') || P.ferramenta !== 'ramal') return;
  if (ev.target && /^(INPUT|SELECT|TEXTAREA)$/.test(ev.target.tagName)) return;
  if (ev.key === 'Enter' && P.tracado.length >= 2) { ev.preventDefault(); P.terminarTracado(); }
  if (ev.key === 'Escape' && (P.tracado.length || P.pendenteRamal)) { ev.preventDefault(); P.cancelar(); }
});

/* ao entrar: na Topologia começa com a ferramenta Ramal */
const mostrarBase = P.mostrar;
P.mostrar = function (el) {
  const novo = this._passoVisto !== VC._passoAtivo;
  const r = mostrarBase.call(this, el);
  if (novo && VC._passoAtivo === 'associacao') { this.ferramenta = 'ramal'; this.redesenhar(); }
  return r;
};
})();
