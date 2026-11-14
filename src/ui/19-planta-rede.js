/* ============================================================
   VentiCondutas v11.3 · Planta para a rede (PR 3)
   ------------------------------------------------------------
   Acrescenta à planta (18-planta.js):
   · Terminais: "Distribuir" coloca os terminais de cada sala dentro do
     desenho; depois arrastam-se. Avisa se um terminal fica numa sala que
     não serve.
   · Transferências: arrastar de uma sala para outra cria a transferência,
     com o caudal sugerido pelo balanço do destino; as existentes
     aparecem como setas.
   · Corrigir um desenho: com a sala selecionada, arrastar os cantos.
   · Planta em PDF: lê a página escolhida (pdf.js, carregado só quando é preciso).
   · Vista Planta também em Terminais, Balanço e Transferências.
   · Plantas na Entrega: salas por grupo com o caudal, terminais e setas.
   Posições: terminal.planta = { pisoId, x, y } (píxeis da imagem).
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('19-planta-rede');
const P = VC.planta;
if (!P) return;
const esc = s => VC.utils.esc(s);
const fmt = (n, d) => VC.utils.fmt(n, d == null ? 0 : d);
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';

P.FERRAMENTAS.push(['trf', 'fa-right-left', 'Transferência']);
P.DICAS.sel = 'Clique numa sala para a selecionar; arraste os cantos da sala selecionada para corrigir o desenho. Os terminais (I, E) também se arrastam.';
P.DICAS.trf = 'Arraste de uma sala para outra passando pela porta (por exemplo, do corredor para a casa de banho): a seta fica onde o arrasto atravessa as paredes. O caudal sugerido equilibra o destino; a origem pode ser compensada.';
P.pendenteTrf = null;

/* ── geometria ───────────────────────────── */
P.dentro = function ([x, y], pts) {   // ponto dentro do polígono (raio horizontal)
  let d = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) d = !d;
  }
  return d;
};
/* o ponto dentro da sala mais perto de q (procura numa grelha de 24×24 sobre a sala) */
P.pontoDentro = function (q, pts) {
  if (this.dentro(q, pts)) return q;
  const xs = pts.map(a => a[0]), ys = pts.map(a => a[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  let melhor = null, d = Infinity;
  for (let i = 0; i <= 24; i++) for (let j = 0; j <= 24; j++) {
    const c = [x0 + (x1 - x0) * (i + 0.5) / 25, y0 + (y1 - y0) * (j + 0.5) / 25];
    if (!this.dentro(c, pts)) continue;
    const dd = (c[0] - q[0]) ** 2 + (c[1] - q[1]) ** 2;
    if (dd < d) { d = dd; melhor = c; }
  }
  return melhor || q;
};
P.salaEm = function (q, piso) { return this.espacosDoPiso(piso || this.pisoAtual()).find(e => this.dentro(q, e.planta.pts)) || null; };
P.terminaisDe = function (e) { return (VC.dados.terminais || []).filter(t => (t.espacos || []).some(x => String(x.id) === String(e.id) || x.nome === e.nome)); };
P._letra = t => (t.rede === 'insuflacao' ? 'I' : 'E');
P._corTerm = t => (t.rede === 'insuflacao' ? '#4f6d8c' : (t.rede === 'extracao_suja' ? '#a14b4b' : '#3f7a52'));

/* coloca os terminais de um espaço numa grelha dentro do desenho (insuflação em cima, extração em baixo) */
P.distribuir = function (e, todos) {
  const p = this.pisoAtual(); if (!e || !e.planta || !p) return 0;
  const pts = e.planta.pts, xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  let n = 0;
  [['insuflacao', 0.16], ['outra', 0.86]]   /* junto às paredes: o nome da sala fica livre no centro */.forEach(([rede, fy]) => {
    const lista = this.terminaisDe(e).filter(t => (rede === 'insuflacao') === (t.rede === 'insuflacao')).filter(t => todos || !(t.planta && t.planta.pisoId === p.id));
    lista.forEach((t, i) => {
      let q = [x0 + (x1 - x0) * (i + 1) / (lista.length + 1), y0 + (y1 - y0) * fy];
      q = this.pontoDentro(q, pts);   // numa sala em L o ponto previsto (e até o centro) pode cair fora
      t.planta = { pisoId: p.id, x: Math.round(q[0] * 10) / 10, y: Math.round(q[1] * 10) / 10 };
      n++;
    });
  });
  return n;
};
P.distribuirTodos = function () {
  if (this._bloqueado()) return;
  const p = this.pisoAtual(); let n = 0;
  this.espacosDoPiso(p).forEach(e => { n += this.distribuir(e, false); });
  if (VC.historico && VC.historico.push) VC.historico.push('terminais distribuídos na planta');
  VC.ui.toast(n ? n + ' terminais colocados nas salas de ' + p.nome + '. Arraste para ajustar.' : 'Todos os terminais das salas desenhadas já estão na planta.');
  this.redesenhar();
};
P.redistribuir = function (idEsp) {
  const e = (VC.dados.espacos || []).find(x => String(x.id) === String(idEsp)); if (!e || this._bloqueado()) return;
  const n = this.distribuir(e, true); VC.ui.toast(n + ' terminais recolocados em «' + e.nome + '».'); this.redesenhar();
};

/* ── transferências ──────────────────────── */
P._sugerirQ = function (deId, paraId) {
  const B = (VC6.balanco && VC6.balanco.todos ? VC6.balanco.todos() : []);
  const r = id => { const b = B.find(x => String(x.id) === String(id)); return b ? Number(b.residuo) || 0 : 0; };
  const falta = -r(paraId), sobra = r(deId);   // resíduo = entra − sai
  if (falta > 0 && sobra > 0) return Math.round(Math.min(falta, sobra));
  if (falta > 0) return Math.round(falta);
  return sobra > 0 ? Math.round(sobra) : 0;
};
/* parâmetros t ∈ [0,1] onde o segmento a→b atravessa o contorno pts */
P._cortes = function (a, b, pts) {
  const r = [], dx = b[0] - a[0], dy = b[1] - a[1];
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [x1, y1] = pts[j], [x2, y2] = pts[i], ex = x2 - x1, ey = y2 - y1, den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((x1 - a[0]) * ey - (y1 - a[1]) * ex) / den, u = ((x1 - a[0]) * dy - (y1 - a[1]) * dx) / den;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) r.push(t);
  }
  return r.sort((m, n) => m - n);
};
/* A porta entre duas salas: o ponto onde a linha a→b sai de A e entra em B
   (o meio dos dois, porque entre as salas há a espessura da parede).
   Devolve { x, y, ang, folga } — folga = distância entre as duas paredes (px). */
P.portaEntre = function (A, B, a, b) {
  a = a || this.centro(A.planta.pts); b = b || this.centro(B.planta.pts);
  const ta = this._cortes(a, b, A.planta.pts), tb = this._cortes(a, b, B.planta.pts);
  const sai = ta.length ? ta[0] : null, entra = tb.length ? tb[tb.length - 1] : null;
  const t1 = sai != null ? sai : (entra != null ? entra : 0.5), t2 = entra != null ? entra : t1, t = (t1 + t2) / 2;
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return { x: Math.round((a[0] + (b[0] - a[0]) * t) * 10) / 10, y: Math.round((a[1] + (b[1] - a[1]) * t) * 10) / 10, ang: Math.round(Math.atan2(b[1] - a[1], b[0] - a[0]) * 1000) / 1000, folga: Math.abs(t2 - t1) * L };
};
/* onde desenhar a seta de uma transferência (a guardada ou a calculada) */
P._portaDe = function (t, A, B, p) {
  if (t.planta && t.planta.pisoId === p.id) return t.planta;
  return this.portaEntre(A, B);
};
/* balanço de uma sala, com uma transferência hipotética (Q de deId para paraId) */
P._balancoSala = function (e, extra) {
  const B = VC6.balanco, tr = (VC.dados.transferencias || []).concat(extra ? [extra] : []);
  const ent = B.QInDireto(e) + B.QTransfIn(e, tr), sai = B.QOutDireto(e) + B.QTransfOut(e, tr);
  return { ent, sai, res: ent - sai };
};
P._linhaImpacto = function (nome, papel, a, d) {
  const cl = r => (Math.abs(r) <= 5 ? 'ok' : (r < 0 ? 'falta' : 'sobra'));
  const txt = r => (Math.abs(r) <= 5 ? 'equilibrada' : (r < 0 ? 'falta ' + fmt(-r) : 'sobra ' + fmt(r)));
  return '<tr><th>' + esc(nome) + '<small>' + papel + '</small></th><td>' + fmt(a.ent) + ' / ' + fmt(a.sai) + '<br><span class="trf-' + cl(a.res) + '">' + txt(a.res) + '</span></td>'
    + '<td>' + fmt(d.ent) + ' / ' + fmt(d.sai) + '<br><span class="trf-' + cl(d.res) + '">' + txt(d.res) + '</span></td></tr>';
};
/* efeito da transferência pendente nas duas salas (antes → depois) */
P._impactoTrf = function (Q, comp) {
  const t = this.pendenteTrf; if (!t) return '';
  const de = VC.dados.espacos.find(e => String(e.id) === String(t.deId)), para = VC.dados.espacos.find(e => String(e.id) === String(t.paraId));
  if (!de || !para || !VC6.balanco || !VC6.balanco.QInDireto) return '';
  Q = VC.utils.num(Q) || 0;
  const hip = { deId: de.id, paraId: para.id, Q }, a1 = this._balancoSala(de), a2 = this._balancoSala(para), d1 = this._balancoSala(de, hip), d2 = this._balancoSala(para, hip);
  if (comp) { d1.ent += Q; d1.res += Q; }
  let h = '<table class="planta-trf-imp"><thead><tr><th>m³/h <small>entra / sai</small></th><th>antes</th><th>depois</th></tr></thead><tbody>'
    + this._linhaImpacto(de.nome, 'origem', a1, d1) + this._linhaImpacto(para.nome, 'destino', a2, d2) + '</tbody></table>';
  if (Q > 0 && !comp && d1.res < -5) h += '<p class="planta-aviso">A origem perde ' + fmt(Q) + ' m³/h e fica com falta de ' + fmt(-d1.res) + ' m³/h. Marque «Compensar na origem» ou aumente a insuflação de «' + esc(de.nome) + '» no passo Terminais.</p>';
  if (Q > 0 && comp) h += '<p class="planta-meta">A insuflação de «' + esc(de.nome) + '» sobe ' + fmt(Q) + ' m³/h (e os seus terminais); a rede de insuflação é recalculada.</p>';
  return h;
};
P._atualizarImpacto = function () {
  const out = document.getElementById('plantaTrfImpacto'); if (!out) return;
  const q = document.getElementById('plantaTrfQ'), c = document.getElementById('plantaTrfComp');
  out.innerHTML = this._impactoTrf(q && q.value, c && c.checked);
};
P.criarTransferencia = function (Q, tipo, dp, compensar) {
  const t = this.pendenteTrf; if (!t || this._bloqueado()) return;
  Q = VC.utils.num(Q); dp = VC.utils.num(dp) || 2;
  if (!(Q > 0)) { VC.ui.toast('Escreva o caudal a transferir (m³/h).'); return; }
  const r = VC6.transferencias.criar(Number(t.deId), Number(t.paraId), Q, tipo || 'grelha_transferencia');
  if (!r || !r.ok) { VC.ui.toast((r && r.erro) || 'Não foi possível criar a transferência.'); return; }
  r.transferencia.dP_Pa = dp;
  if (VC6.transferencias.dimensionarArea) r.transferencia.area_cm2 = VC6.transferencias.dimensionarArea(Q, dp);
  const p = this.pisoAtual(), A = VC.dados.espacos.find(e => String(e.id) === String(t.deId)), B = VC.dados.espacos.find(e => String(e.id) === String(t.paraId));
  if (p && A && A.planta && B && B.planta) {
    const po = this.portaEntre(A, B, t.linha && t.linha[0], t.linha && t.linha[1]);
    r.transferencia.planta = { pisoId: p.id, x: po.x, y: po.y, ang: po.ang };
  }
  const comp = compensar && VC6.transferencias.compensarOrigem ? VC6.transferencias.compensarOrigem(r.transferencia) : null;
  this.pendenteTrf = null; this.trfSel = r.transferencia.id;
  if (VC.historico && VC.historico.push) VC.historico.push('transferência na planta');
  VC.estado.forcarSync();
  VC.ui.toast('Transferência ' + r.transferencia.deNome + ' → ' + r.transferencia.paraNome + ': ' + fmt(Q) + ' m³/h, ' + fmt(r.transferencia.area_cm2) + ' cm²' + (comp ? ' · insuflação da origem +' + fmt(Q) + ' m³/h' : '') + '.');
  this.redesenhar();
};
P.removerTransferencia = function (id) {
  if (this._bloqueado()) return;
  const t = (VC.dados.transferencias || []).find(x => x.id === id); if (!t) return;
  const antes = this._estado(), comp = t.compensacao;
  VC6.transferencias.remover(id);
  this.trfSel = null;
  this._empilhar('transferência removida', antes);
  if (VC.historico && VC.historico.push) VC.historico.push('transferência removida na planta');
  VC.estado.forcarSync();
  VC.ui.toast('Transferência ' + t.deNome + ' → ' + t.paraNome + ' removida' + (comp ? '; a insuflação da origem voltou a baixar ' + fmt(comp.Q) + ' m³/h' : '') + '.');
  this.redesenhar();
};
P.compensarTransferencia = function (id) {
  if (this._bloqueado()) return;
  const t = (VC.dados.transferencias || []).find(x => x.id === id); if (!t || t.compensacao) return;
  const antes = this._estado();
  if (!VC6.transferencias.compensarOrigem(t)) return;
  this._empilhar('origem compensada', antes);
  VC.estado.forcarSync();
  VC.ui.toast('Insuflação de «' + t.deNome + '» +' + fmt(t.Q) + ' m³/h.');
  this.redesenhar();
};
/* uma só seleção de cada vez: sala, ramal ou transferência */
const selSala = P.selecionar;
P.selecionar = function () { this.trfSel = null; return selSala.apply(this, arguments); };
const cancelarBase = P.cancelar;
P.cancelar = function () { this.pendenteTrf = null; this.trfSel = null; return cancelarBase.apply(this, arguments); };
const setFerrBase = P.setFerramenta;
P.setFerramenta = function () { this.pendenteTrf = null; return setFerrBase.apply(this, arguments); };

/* ── desenho: setas, terminais e cantos ──── */
/* seta curta (≈ 46 px no ecrã) centrada na porta, de A para B, com o caudal */
P._setaTrf = function (t, po, z) {
  const m = 23 / z, cx = Math.cos(po.ang), sy = Math.sin(po.ang);
  const x1 = po.x - cx * m, y1 = po.y - sy * m, x2 = po.x + cx * m, y2 = po.y + sy * m;
  const nx = -sy, ny = cx, k = (ny > 0 ? -1 : 1) * 15 / z;   // rótulo do lado de cima da seta
  const sel = String(this.trfSel) === String(t.id);
  return '<g class="planta-trf' + (sel ? ' sel' : '') + '" data-trf="' + esc(t.id) + '"><title>' + esc(t.deNome) + ' → ' + esc(t.paraNome) + ' · ' + fmt(t.Q) + ' m³/h' + (t.compensacao ? ' · origem compensada' : '') + '</title>'
    + '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="transparent" stroke-width="18" vector-effect="non-scaling-stroke"/>'
    + (sel ? '<circle cx="' + po.x + '" cy="' + po.y + '" r="' + 30 / z + '" fill="rgba(154,106,18,.12)" stroke="#9a6a12" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/>' : '')
    + '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#9a6a12" stroke-width="3.5" vector-effect="non-scaling-stroke" marker-end="url(#plantaSeta)"/>'
    + '<text x="' + (po.x + nx * k) + '" y="' + (po.y + ny * k + 4 / z) + '" font-size="' + 12 / z + '" text-anchor="middle" font-weight="700" fill="#7a5a1e" stroke="#fff" stroke-width="3" paint-order="stroke" vector-effect="non-scaling-stroke">' + fmt(t.Q) + ' m³/h</text></g>';
};
const svgBase = P._svg;
P._svg = function (p) {
  const s = svgBase.call(this, p), z = this.zoom || 1;
  let x = '<defs><marker id="plantaSeta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#9a6a12"/></marker></defs>';
  const salas = this.espacosDoPiso(p), porId = {}; salas.forEach(e => { porId[e.id] = e; });
  (VC.dados.transferencias || []).forEach(t => {
    const a = porId[t.deId], b = porId[t.paraId]; if (!a || !b) return;
    x += this._setaTrf(t, this._portaDe(t, a, b, p), z);
  });
  (VC.dados.terminais || []).forEach(t => {
    if (!t.planta || t.planta.pisoId !== p.id) return;
    const r = 10 / z, c = this._corTerm(t);
    x += '<g class="planta-term" data-t="' + esc(t.id) + '"><title>' + esc(t.nome || t.id) + ' · ' + esc(t.tipo || '') + ' · ' + fmt(t.Q) + ' m³/h</title><circle cx="' + t.planta.x + '" cy="' + t.planta.y + '" r="' + r + '" fill="' + c + '" stroke="#fff" stroke-width="2" vector-effect="non-scaling-stroke"/>'
      + '<text x="' + t.planta.x + '" y="' + (t.planta.y + 4 / z) + '" font-size="' + 11 / z + '" text-anchor="middle" font-weight="800" fill="#fff">' + this._letra(t) + '</text></g>';
  });
  const sel = this.ferramenta === 'sel' && salas.find(e => String(e.id) === String(this.selecionado));
  if (sel) x += sel.planta.pts.map((q, i) => '<circle class="planta-vert" data-i="' + i + '" cx="' + q[0] + '" cy="' + q[1] + '" r="' + 7 / z + '" fill="#fff" stroke="#4f6d8c" stroke-width="2.5" vector-effect="non-scaling-stroke"/>').join('');
  x += '<line id="plantaTrfLinha" x1="0" y1="0" x2="0" y2="0" stroke="#9a6a12" stroke-width="3" stroke-dasharray="6 4" vector-effect="non-scaling-stroke" marker-end="url(#plantaSeta)" visibility="hidden"/>';
  return s.replace(/<\/svg>$/, x + '</svg>');
};

/* ── painel: transferência pendente e terminais da sala ── */
const painelBase = P._painel;
P._painel = function (p) {
  let h = painelBase.call(this, p);
  if (this.pendenteTrf) {
    const de = VC.dados.espacos.find(e => String(e.id) === String(this.pendenteTrf.deId)), para = VC.dados.espacos.find(e => String(e.id) === String(this.pendenteTrf.paraId));
    const Q = this._sugerirQ(this.pendenteTrf.deId, this.pendenteTrf.paraId);
    const comp = !!(de && (de.definicoes || []).some(d => d.rede === 'insuflacao'));
    const esc0 = Number(p && p.escala) || 0, l = this.pendenteTrf.linha;
    const porta = de && de.planta && para && para.planta ? this.portaEntre(de, para, l && l[0], l && l[1]) : null;
    h = '<div class="planta-card destaque"><div class="planta-card-t">Nova transferência</div><p><b>' + esc(de && de.nome) + '</b> → <b>' + esc(para && para.nome) + '</b></p>'
      + '<label for="plantaTrfQ">Caudal (m³/h)</label><input id="plantaTrfQ" type="number" min="0" step="1" value="' + (Q || '') + '"' + (Q ? '' : ' placeholder="caudal"') + ' oninput="VC.planta._atualizarImpacto()">'
      + (Q ? '<p class="planta-meta">Sugerido pelo balanço: o que falta no destino.</p>' : '<p class="planta-meta">O balanço não pede caudal entre estas salas; escreva o valor.</p>')
      + '<label for="plantaTrfTipo">Tipo</label><select id="plantaTrfTipo"><option value="grelha_transferencia">Grelha de transferência</option><option value="fresta_porta">Fresta sob porta</option><option value="abertura_natural">Abertura natural</option></select>'
      + '<label for="plantaTrfDp">ΔP (Pa)</label><input id="plantaTrfDp" type="number" min="0.5" step="0.5" value="2">'
      + '<label class="planta-check"><input id="plantaTrfComp" type="checkbox"' + (comp ? ' checked' : '') + ' onchange="VC.planta._atualizarImpacto()"><span>Compensar na origem<small>soma o caudal à insuflação de «' + esc(de && de.nome) + '»</small></span></label>'
      + '<div id="plantaTrfImpacto">' + this._impactoTrf(Q, comp) + '</div>'
      + (porta && porta.folga * esc0 > 0.6 ? '<p class="planta-aviso">As salas não se tocam neste ponto (' + fmt(porta.folga * esc0, 1) + ' m entre as paredes). A seta fica a meio; arraste-a para a porta com Selecionar (V).</p>' : '<p class="planta-meta">A seta fica na passagem entre as salas; arraste-a com Selecionar (V) para acertar a porta.</p>')
      + '<div class="planta-acoes"><button class="btn primario" onclick="VC.planta.criarTransferencia(document.getElementById(\'plantaTrfQ\').value, document.getElementById(\'plantaTrfTipo\').value, document.getElementById(\'plantaTrfDp\').value, document.getElementById(\'plantaTrfComp\').checked)">Criar transferência</button><button class="btn" onclick="VC.planta.cancelar()">Cancelar</button></div></div>' + h;
  }
  const ts = !this.pendenteTrf && this.trfSel && (VC.dados.transferencias || []).find(x => String(x.id) === String(this.trfSel));
  if (ts) {
    const de = VC.dados.espacos.find(e => e.id === ts.deId), para = VC.dados.espacos.find(e => e.id === ts.paraId);
    const b1 = de && this._balancoSala(de), b2 = para && this._balancoSala(para);
    const lin = (e, b, papel) => e ? '<tr><th>' + esc(e.nome) + '<small>' + papel + '</small></th><td>' + fmt(b.ent) + ' / ' + fmt(b.sai) + '</td><td><span class="trf-' + (Math.abs(b.res) <= 5 ? 'ok' : (b.res < 0 ? 'falta' : 'sobra')) + '">' + (Math.abs(b.res) <= 5 ? 'equilibrada' : (b.res < 0 ? 'falta ' : 'sobra ') + fmt(Math.abs(b.res))) + '</span></td></tr>' : '';
    h = '<div class="planta-card destaque"><div class="planta-card-t">Transferência</div><p><b>' + esc(ts.deNome) + '</b> → <b>' + esc(ts.paraNome) + '</b><br>' + fmt(ts.Q) + ' m³/h · ' + esc(String(ts.tipo || '').replace(/_/g, ' ')) + ' · ' + fmt(ts.area_cm2) + ' cm² · ΔP ' + fmt(ts.dP_Pa, 1) + ' Pa</p>'
      + '<table class="planta-trf-imp"><thead><tr><th>m³/h</th><th>entra / sai</th><th>balanço</th></tr></thead><tbody>' + lin(de, b1, 'origem') + lin(para, b2, 'destino') + '</tbody></table>'
      + (ts.compensacao ? '<p class="planta-meta">Origem compensada: a insuflação de «' + esc(ts.deNome) + '» inclui +' + fmt(ts.compensacao.Q) + ' m³/h. Remover a transferência tira-os.</p>' : (b1 && b1.res < -5 ? '<p class="planta-aviso">A origem perde ' + fmt(ts.Q) + ' m³/h por esta transferência e tem falta de ' + fmt(-b1.res) + ' m³/h.</p>' : ''))
      + '<p class="planta-meta">Arraste a seta para a porta certa.</p><div class="planta-acoes">' + (!ts.compensacao && b1 && b1.res < -5 ? '<button class="btn primario" onclick="VC.planta.compensarTransferencia(\'' + esc(ts.id) + '\')">Compensar na origem</button>' : '')
      + '<button class="btn coral" onclick="VC.planta.removerTransferencia(\'' + esc(ts.id) + '\')">Remover</button><button class="btn" onclick="VC.planta.trfSel=null;VC.planta.redesenhar()">Fechar</button></div></div>' + h;
  }
  const e = !this.pendente && !this.pendenteTrf && !ts && (VC.dados.espacos || []).find(x => String(x.id) === String(this.selecionado));
  if (e && e.planta) {
    const T = this.terminaisDe(e), fora = T.filter(t => !(t.planta && t.planta.pisoId === p.id));
    const bloco = '<div class="planta-card"><div class="planta-card-t">Terminais de ' + esc(e.nome) + ' (' + T.length + ')</div>'
      + (T.length ? '<div class="planta-terms">' + T.map(t => '<span class="planta-tchip" style="border-color:' + this._corTerm(t) + '"><b style="background:' + this._corTerm(t) + '">' + this._letra(t) + '</b>' + esc(t.nome || t.id) + ' · ' + fmt(t.Q) + ' m³/h' + (t.planta && t.planta.pisoId === p.id ? '' : ' · <i>por colocar</i>') + '</span>').join('') + '</div>' : '<p class="planta-meta">Sem terminais. Os terminais vêm do passo Terminais.</p>')
      + (T.length ? '<div class="planta-acoes"><button class="btn" onclick="VC.planta.redistribuir(' + e.id + ')">' + (fora.length ? 'Colocar na sala' : 'Recolocar na sala') + '</button></div>' : '') + '</div>';
    h = h.replace('<div class="planta-lista-t">', bloco + '<div class="planta-lista-t">');
  }
  return h.replace('<div class="planta-acoes planta-rodape">', '<div class="planta-acoes planta-rodape"><button class="btn btn-mini primario" onclick="VC.planta.distribuirTodos()">Distribuir terminais</button>');
};

/* ── interação: cantos, terminais e setas ── */
const ligarBase = P.ligar;
P.ligar = function () {
  ligarBase.apply(this, arguments);
  const svg = document.getElementById('plantaSVG'); if (!svg) return;
  let arr = null;
  svg.addEventListener('pointerdown', ev => {
    if (ev.button !== 0) return;
    const vert = ev.target.closest('.planta-vert'), term = ev.target.closest('.planta-term'), seta = ev.target.closest('.planta-trf[data-trf]');
    if (this.ferramenta === 'sel' && seta && !vert && !term) {
      if (this._bloqueado()) return;
      arr = { tipo: 'seta', id: seta.dataset.trf, el: seta, q0: this._ponto(ev), antes: this._estado() };
    } else if (this.ferramenta === 'sel' && (vert || term)) {
      if (this._bloqueado()) return;
      arr = vert ? { tipo: 'vert', i: Number(vert.dataset.i), el: vert } : { tipo: 'term', id: term.dataset.t, el: term };
    } else if (this.ferramenta === 'trf') {
      const q = this._ponto(ev), de = this.salaEm(q);
      if (!de) { VC.ui.toast('Comece dentro de uma sala desenhada.'); ev.stopImmediatePropagation(); return; }
      arr = { tipo: 'trf', de, q0: q };
    } else return;
    ev.stopImmediatePropagation(); ev.preventDefault();
    try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* captura opcional */ }
  }, true);
  svg.addEventListener('pointermove', ev => {
    if (!arr) return;
    const q = this._ponto(ev);
    if (arr.tipo === 'vert') {
      const e = VC.dados.espacos.find(x => String(x.id) === String(this.selecionado)); if (!e) return;
      e.planta.pts[arr.i] = [Math.round(q[0] * 10) / 10, Math.round(q[1] * 10) / 10]; arr.mudou = true;
      arr.el.setAttribute('cx', q[0]); arr.el.setAttribute('cy', q[1]);
      const pol = svg.querySelector('.planta-sala[data-esp="' + e.id + '"] polygon'); if (pol) pol.setAttribute('points', e.planta.pts.map(a => a.join(',')).join(' '));
    } else if (arr.tipo === 'term') {
      arr.q = q; arr.el.querySelector('circle').setAttribute('cx', q[0]); arr.el.querySelector('circle').setAttribute('cy', q[1]);
      const tx = arr.el.querySelector('text'); tx.setAttribute('x', q[0]); tx.setAttribute('y', q[1] + 4 / (this.zoom || 1));
    } else if (arr.tipo === 'seta') {
      arr.dx = q[0] - arr.q0[0]; arr.dy = q[1] - arr.q0[1];
      if (Math.hypot(arr.dx, arr.dy) * (this.zoom || 1) > 3) arr.mudou = true;
      arr.el.setAttribute('transform', 'translate(' + arr.dx + ' ' + arr.dy + ')');
    } else if (arr.tipo === 'trf') {
      const l = document.getElementById('plantaTrfLinha');
      if (l) { l.setAttribute('x1', arr.q0[0]); l.setAttribute('y1', arr.q0[1]); l.setAttribute('x2', q[0]); l.setAttribute('y2', q[1]); l.setAttribute('visibility', 'visible'); }
    }
  }, true);
  svg.addEventListener('pointerup', ev => {
    if (!arr) return;
    const a = arr; arr = null; ev.stopImmediatePropagation();
    const q = this._ponto(ev), p = this.pisoAtual();
    if (a.tipo === 'seta') {
      const t = (VC.dados.transferencias || []).find(x => String(x.id) === String(a.id));
      if (t && a.mudou) {
        const A = VC.dados.espacos.find(e => e.id === t.deId), B = VC.dados.espacos.find(e => e.id === t.paraId);
        const po = this._portaDe(t, A, B, p);
        t.planta = { pisoId: p.id, x: Math.round((po.x + a.dx) * 10) / 10, y: Math.round((po.y + a.dy) * 10) / 10, ang: po.ang };
        this._empilhar('seta da transferência movida', a.antes);
        if (VC.historico && VC.historico.push) VC.historico.push('transferência movida na planta');
      }
      this.trfSel = t ? t.id : null; this.selecionado = null; this.ramalSel = null;
      this.redesenhar(); return;
    }
    if (a.tipo === 'vert') { if (a.mudou && VC.historico && VC.historico.push) VC.historico.push('desenho corrigido'); this.redesenhar(); return; }
    if (a.tipo === 'term') {
      const t = (VC.dados.terminais || []).find(x => String(x.id) === String(a.id));
      if (t && a.q) {
        t.planta = { pisoId: p.id, x: Math.round(a.q[0] * 10) / 10, y: Math.round(a.q[1] * 10) / 10 };
        const sala = this.salaEm(a.q);
        const serve = sala && (t.espacos || []).some(x => String(x.id) === String(sala.id) || x.nome === sala.nome);
        if (sala && !serve) VC.ui.toast('Atenção: «' + (t.nome || t.id) + '» serve ' + (t.espacos || []).map(x => x.nome).join(', ') + ', não «' + sala.nome + '».');
        if (VC.historico && VC.historico.push) VC.historico.push('terminal movido');
      }
      this.redesenhar(); return;
    }
    if (a.tipo === 'trf') {
      const para = this.salaEm(q);
      if (!para || String(para.id) === String(a.de.id)) { VC.ui.toast('Largue dentro de outra sala desenhada.'); this.redesenhar(); return; }
      this.pendenteTrf = { deId: a.de.id, paraId: para.id, linha: [a.q0, q] }; this.selecionado = null; this.trfSel = null; this.redesenhar();
    }
  }, true);
};

/* ── PDF (pdf.js só é carregado quando um PDF é escolhido) ── */
P.escolherImagem = function () {
  if (this._bloqueado()) return;
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/png,image/jpeg,application/pdf';
  inp.onchange = e => { const f = e.target.files && e.target.files[0]; if (f) this.lerImagem(f); };
  inp.click();
};
const lerBase = P.lerImagem;
P.lerImagem = function (f) { return /pdf$/i.test(f.type || '') || /\.pdf$/i.test(f.name || '') ? this.lerPDF(f) : lerBase.call(this, f); };
P._carregarPdfjs = function () {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  return new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = PDFJS + 'pdf.min.js';
    s.onload = () => { if (!window.pdfjsLib) return rej(new Error('pdf.js não carregou')); window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; res(window.pdfjsLib); };
    s.onerror = () => rej(new Error('sem acesso a ' + PDFJS));
    document.head.appendChild(s);
  });
};
P.lerPDF = async function (f) {
  try {
    VC.ui.toast('A ler o PDF…');
    const lib = await this._carregarPdfjs();
    const doc = await lib.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise;
    let n = 1;
    if (doc.numPages > 1) { n = parseInt(window.prompt('O PDF tem ' + doc.numPages + ' páginas. Qual é a planta deste piso?', '1'), 10) || 1; n = Math.max(1, Math.min(doc.numPages, n)); }
    const pag = await doc.getPage(n), v1 = pag.getViewport({ scale: 1 });
    const k = 2400 / Math.max(v1.width, v1.height), vp = pag.getViewport({ scale: k });
    const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    await pag.render({ canvasContext: g, viewport: vp }).promise;
    return this.usarImagem(c.toDataURL('image/png'));
  } catch (e) {
    VC.debug.erro(e);
    VC.ui.toast('Não foi possível ler o PDF (' + e.message + '). Exporte a página como imagem PNG/JPG.');
    return null;
  }
};

/* ── ao entrar na vista: cor e ferramenta próprias do passo ── */
const mostrarBase = P.mostrar;
P.mostrar = function (el) {
  const passo = VC._passoAtivo;
  if (this._passoVisto !== passo) {
    this._passoVisto = passo;
    this.corPor = (passo === 'balanco' || passo === 'transferencias') ? 'balanco' : 'grupo';
    this.ferramenta = passo === 'transferencias' ? 'trf' : 'sel';
    this.pendente = null; this.pendenteTrf = null; this.trfSel = null;
  }
  return mostrarBase.call(this, el);
};

/* ── plantas na Entrega (só leitura) ─────── */
P.svgEstatico = function (piso, largura) {
  const guard = { zoom: this.zoom, selecionado: this.selecionado, trfSel: this.trfSel, rascunho: this.rascunho, pendente: this.pendente, escalaPts: this.escalaPts, corPor: this.corPor, ferramenta: this.ferramenta };
  try {
    Object.assign(this, { zoom: largura / piso.w, selecionado: null, trfSel: null, rascunho: [], pendente: null, escalaPts: [], corPor: 'grupo', ferramenta: 'ver', _rotuloQ: true });
    return this._svg(piso).replace(/^<svg [^>]*>/, '<svg class="planta-estatica" viewBox="0 0 ' + piso.w + ' ' + piso.h + '" role="img" aria-label="Planta de ' + esc(piso.nome) + '">').replace('<polyline id="plantaRascunho" points="" fill="none" stroke="#4f6d8c" stroke-width="2.5" vector-effect="non-scaling-stroke"/>', '').replace(/<line id="plantaTrfLinha"[^>]*\/>/, '');
  } finally { Object.assign(this, guard); this._rotuloQ = false; }
};
if (VC.entrega && VC.entrega.render) {
  const entregaBase = VC.entrega.render;
  VC.entrega.render = function () {
    const h = entregaBase.apply(this, arguments);
    const pisos = (VC.dados.plantas || []).filter(p => p.imagem && P.espacosDoPiso(p).length);
    if (!pisos.length) return h;
    const sec = '<section aria-label="Plantas"><h3 class="entrega-h">Plantas de ventilação <small>salas por grupo com Q_total · I insuflação · E extração · setas = transferências</small></h3><div class="entrega-plantas">'
      + pisos.map(p => '<figure class="entrega-planta">' + P.svgEstatico(p, 760) + '<figcaption>' + esc(p.nome) + ' · ' + P.espacosDoPiso(p).length + ' espaços desenhados</figcaption></figure>').join('') + '</div></section>';
    return h.replace('<section aria-label="Entregar por destinatário">', sec + '<section aria-label="Entregar por destinatário">');
  };
}
})();
