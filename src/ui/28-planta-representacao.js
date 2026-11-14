/* ============================================================
   VentiCondutas · Planta: representação (auditoria B4, C5, C7)
   ------------------------------------------------------------
   · Nome legível: o nome da sala fica no ponto mais interior (não no
     centro geométrico, que numa sala em L pode cair fora dela) e o tamanho
     da letra ajusta-se à largura disponível; se mesmo assim não couber,
     o nome é encurtado com «…» (o nome inteiro fica no título).
   · Planta de obra recortada: na Entrega a planta mostra só a zona
     desenhada (salas, ramais, terminais, setas), sem as marcas de aviso.
   · PDF/imagem nítidos: ao carregar, escolhe-se a zona útil e essa zona é
     lida de novo em alta resolução (o PDF é desenhado outra vez pelo pdf.js;
     a imagem é recortada do original). Só antes de desenhar no piso.
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('28-planta-representacao');
const P = VC.planta;
if (!P || !P._svg || !P._distSeg) return;
const LADO = 2400;

/* ── nome legível ── */
const cache = new Map();
P.pontoInterior = function (pts) {
  const k = pts.map(q => q.join(',')).join(' ');
  if (cache.has(k)) return cache.get(k);
  const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const dist = q => { let d = Infinity; for (let i = 0; i < pts.length; i++) d = Math.min(d, this._distSeg(q, pts[i], pts[(i + 1) % pts.length])[0]); return d; };
  let melhor = null, dm = -1;
  const passo = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + (b - a) * i / n);
  passo(x0, x1, 16).forEach(x => passo(y0, y1, 16).forEach(y => { if (this.dentro([x, y], pts)) { const d = dist([x, y]); if (d > dm) { dm = d; melhor = [x, y]; } } }));
  if (melhor) {   // afinar à volta do melhor ponto
    const hx = (x1 - x0) / 16, hy = (y1 - y0) / 16;
    passo(melhor[0] - hx, melhor[0] + hx, 6).forEach(x => passo(melhor[1] - hy, melhor[1] + hy, 6).forEach(y => { if (this.dentro([x, y], pts)) { const d = dist([x, y]); if (d > dm) { dm = d; melhor = [x, y]; } } }));
  }
  const r = melhor || this.centro(pts);
  if (cache.size > 500) cache.clear();
  cache.set(k, r);
  return r;
};
/* largura livre da sala na horizontal que passa em y, à volta de x */
P.faixaEm = function (pts, x, y) {   // [esquerda, direita] da sala na horizontal que passa em (x, y)
  const xs = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
  }
  xs.sort((m, n) => m - n);
  for (let i = 0; i + 1 < xs.length; i += 2) if (x >= xs[i] && x <= xs[i + 1]) return [xs[i], xs[i + 1]];
  return null;
};
P.larguraEm = function (pts, x, y) { const f = this.faixaEm(pts, x, y); return f ? f[1] - f[0] : 0; };
/* tamanho da letra e texto do nome para caberem na sala */
P.rotuloAjustado = function (nome, pts, cx, cy, fs) {
  const z = this.zoom || 1, w = this.larguraEm(pts, cx, cy) * 0.9, fsMin = 8 / z;
  const largura = (t, f) => t.length * f * 0.58;
  let f = fs;
  if (w > 0 && largura(nome, f) > w) f = Math.max(fsMin, w / (nome.length * 0.58));
  let texto = nome;
  if (w > 0 && largura(texto, f) > w) { const n = Math.max(3, Math.floor(w / (f * 0.58)) - 1); texto = nome.slice(0, n) + '…'; }
  // centrado no ponto interior o texto pode passar uma parede: desliza ao longo da faixa livre até caber
  let x = cx;
  const fx = this.faixaEm(pts, cx, cy), meio = largura(texto, f) / 2, folga = 0.05 * (fx ? fx[1] - fx[0] : 0);
  if (fx && fx[1] - fx[0] > 2 * meio) x = Math.min(Math.max(cx, fx[0] + folga + meio), fx[1] - folga - meio);
  return { fs: f, texto, x };
};

/* ── planta de obra recortada à zona desenhada ── */
P.limitesDesenho = function (piso) {
  const pts = [];
  this.espacosDoPiso(piso).forEach(e => e.planta.pts.forEach(q => pts.push(q)));
  (this.ramaisDoPiso ? this.ramaisDoPiso(piso) : []).forEach(r => r.planta.pts.forEach(q => pts.push(q)));
  (VC.dados.terminais || []).forEach(t => { if (t.planta && t.planta.pisoId === piso.id) pts.push([t.planta.x, t.planta.y]); });
  (VC.dados.transferencias || []).forEach(t => { if (t.planta && t.planta.pisoId === piso.id) pts.push([t.planta.x, t.planta.y]); });
  if (!pts.length) return [0, 0, piso.w, piso.h];
  const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
  let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const m = Math.max(20, 0.06 * Math.max(x1 - x0, y1 - y0));
  x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(piso.w, x1 + m); y1 = Math.min(piso.h, y1 + m);
  return [x0, y0, x1 - x0, y1 - y0];
};
const estBase = P.svgEstatico;
if (estBase) P.svgEstatico = function (piso, largura) {
  const vb = this.limitesDesenho(piso);
  this._semAvisos = true;
  try {
    // o desenho estático usa zoom = largura / piso.w; com o recorte os textos devem seguir a largura recortada
    const s = estBase.call(this, piso, largura * piso.w / vb[2]);
    return s.replace(/viewBox="0 0 [^"]*"/, 'viewBox="' + vb.map(v => Math.round(v * 10) / 10).join(' ') + '"');
  } finally { this._semAvisos = false; }
};

/* ── zona útil do PDF / imagem em alta resolução ── */
P._fonte = null;   // { pisoId, tipo: 'pdf'|'img', doc, n, url, ox, oy, s } — só durante a sessão
// imagem atual (px) = (original − [ox, oy]) × s ; original = página do PDF a escala 1, ou a imagem original
const usarBase = P.usarImagem;
P.usarImagem = function (dataURL) {
  return usarBase.call(this, dataURL).then(p => {
    if (p) { this._fonte = Object.assign({ pisoId: p.id, ox: 0, oy: 0, s: null }, this._fontePend || { tipo: 'img', url: dataURL }); this.redesenhar(); }   // mostra «Escolher a zona útil»
    this._fontePend = null;
    return p;
  });
};
P.podeRecortar = function () {
  const p = this.pisoAtual();
  return !!(p && this._fonte && this._fonte.pisoId === p.id && !this.espacosDoPiso(p).length && !(this.ramaisDoPiso && this.ramaisDoPiso(p).length));
};
P.iniciarRecorte = function () {
  if (!this.podeRecortar()) { VC.ui.toast('A zona útil escolhe-se logo depois de carregar a planta, antes de desenhar.'); return; }
  this.setFerramenta('ret'); this._modoRecorte = true;
  VC.ui.toast('Arraste um retângulo à volta da zona útil da planta.');
};
/* desenha de novo a zona [x, y, w, h] (píxeis da imagem atual) com LADO px no lado maior */
P.recortar = async function (zona) {
  const p = this.pisoAtual(), F = this._fonte;
  if (!p || !F || !this.podeRecortar()) return null;
  const [x, y, w, h] = zona;
  if (w < 20 || h < 20) { VC.ui.toast('Zona demasiado pequena.'); return null; }
  const k2 = LADO / Math.max(w, h);   // ampliação face à imagem atual
  const c = document.createElement('canvas'); c.width = Math.round(w * k2); c.height = Math.round(h * k2);
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  let novo;
  try {
    if (F.tipo === 'pdf' && F.doc) {
      const pag = await F.doc.getPage(F.n || 1);
      const s = F.s || p.w / pag.getViewport({ scale: 1 }).width;
      novo = { ox: F.ox + x / s, oy: F.oy + y / s, s: s * k2 };
      await pag.render({ canvasContext: g, viewport: pag.getViewport({ scale: novo.s, offsetX: -novo.ox * novo.s, offsetY: -novo.oy * novo.s }) }).promise;
    } else {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = F.url; });
      const s = F.s || p.w / img.width;
      novo = { ox: F.ox + x / s, oy: F.oy + y / s, s: s * k2 };
      g.drawImage(img, novo.ox, novo.oy, w / s, h / s, 0, 0, c.width, c.height);
    }
  } catch (e) { VC.debug.erro(e); VC.ui.toast('Não foi possível ler a zona útil (' + e.message + ').'); return null; }
  const escala = p.escala ? p.escala / k2 : null;
  this._modoRecorte = false; this.pendente = null; this.ferramenta = 'sel';
  const np = await usarBase.call(this, c.toDataURL('image/png'));
  if (np) {
    np.escala = escala;
    this._fonte = Object.assign({}, F, novo, { pisoId: np.id });   // a fonte continua a ser o original
    VC.ui.toast('Zona útil em alta resolução: ' + np.w + ' × ' + np.h + ' px (' + Math.round(k2 * 10) / 10 + '× mais nítida).' + (np.escala ? '' : ' Calibre a escala.'));
    this.redesenhar();
  }
  return np;
};
const painelBase = P._painel;
P._painel = function (p) {
  let h = painelBase.call(this, p);
  if (this._modoRecorte && this.pendente) {
    const xs = this.pendente.map(q => q[0]), ys = this.pendente.map(q => q[1]);
    const z = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
    this._zonaRecorte = z;
    return '<div class="planta-card destaque"><div class="planta-card-t">Zona útil</div><p>' + Math.round(z[2]) + ' × ' + Math.round(z[3]) + ' px da imagem atual → lida de novo com ' + LADO + ' px no lado maior.</p>'
      + '<div class="planta-acoes"><button class="btn primario" onclick="VC.planta.recortar(VC.planta._zonaRecorte)">Usar esta zona</button><button class="btn" onclick="VC.planta._modoRecorte=false;VC.planta.cancelar()">Cancelar</button></div></div>';
  }
  if (this.podeRecortar()) h = '<div class="planta-card"><div class="planta-card-t">Planta carregada</div><p class="planta-meta">Se a zona útil é só uma parte da folha, escolha-a: é lida de novo em alta resolução (fica mais nítida com zoom).</p><div class="planta-acoes"><button class="btn" onclick="VC.planta.iniciarRecorte()">Escolher a zona útil</button></div></div>' + h;
  return h;
};
const setFerrBase = P.setFerramenta;
P.setFerramenta = function () { this._modoRecorte = false; return setFerrBase.apply(this, arguments); };
const cancelarBase = P.cancelar;
P.cancelar = function () { this._modoRecorte = false; return cancelarBase.apply(this, arguments); };
})();
