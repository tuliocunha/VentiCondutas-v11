/* ============================================================
   VentiCondutas · Planta: encaixe nas paredes da imagem (item 12)
   ------------------------------------------------------------
   Lê a imagem do piso uma vez (reduzida até 1600 px) e encontra as linhas
   escuras longas, horizontais e verticais: as faces das paredes. Ao desenhar
   salas (Retângulo, Polígono), medir ou calibrar, o ponto encaixa:
     1. nas arestas e vértices das salas já desenhadas (como antes);
     2. nos cantos das paredes da imagem (cruzamento de duas faces);
     3. numa face de parede da imagem;
     4. na grelha, se estiver ligada.
   Desliga-se no painel do piso («Encaixar nas paredes da imagem»).
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('49-planta-paredes');
const P = VC.planta, PN = VC.paineis;
if (!P || !P.encaixe) return;
const MAXW = 1600;

/* deteção pura sobre os píxeis (RGBA); devolve segmentos em píxeis da imagem reduzida */
P._detetarParedes = function (px, W, H, lum) {
  const L = new Uint8Array(W * H), hist = new Uint32Array(256);
  for (let i = 0, j = 0; i < L.length; i++, j += 4) { const v = px[j + 3] < 128 ? 255 : Math.round(0.299 * px[j] + 0.587 * px[j + 1] + 0.114 * px[j + 2]); L[i] = v; hist[v]++; }
  // limiar: abaixo de 72 % do fundo (o tom mais frequente). As plantas exportadas têm paredes cinzentas, não pretas.
  let fundo = 255; for (let v = 0, m = -1; v < 256; v++) if (hist[v] > m) { m = hist[v]; fundo = v; }
  const LUM = lum || Math.max(60, Math.min(200, fundo * 0.72));
  const escuro = new Uint8Array(W * H);
  for (let i = 0; i < L.length; i++) if (L[i] < LUM) escuro[i] = 1;
  const minRun = Math.max(20, Math.round(0.02 * Math.max(W, H)));
  // corridas escuras por linha (horizontal) ou coluna (vertical)
  const corridas = (n, m, at) => {
    const out = [];
    for (let a = 0; a < n; a++) {
      let ini = -1;
      for (let b = 0; b <= m; b++) {
        const d = b < m && at(a, b);
        if (d && ini < 0) ini = b;
        else if (!d && ini >= 0) { if (b - ini >= minRun) out.push([a, ini, b - 1]); ini = -1; }
      }
    }
    return out;
  };
  // junta corridas de linhas seguidas que se sobrepõem numa banda (parede grossa) e devolve as suas faces
  const faces = runs => {
    const bandas = [], abertas = [];
    runs.forEach(([a, i0, i1]) => {
      let b = null;
      for (let k = abertas.length - 1; k >= 0; k--) {
        const x = abertas[k];
        if (x.a1 < a - 1) { abertas.splice(k, 1); continue; }
        const ov = Math.min(i1, x.i1) - Math.max(i0, x.i0);
        if (x.a1 === a - 1 && ov > 0.6 * Math.min(i1 - i0, x.i1 - x.i0)) { b = x; break; }
      }
      if (b) { b.a1 = a; b.i0 = Math.min(b.i0, i0); b.i1 = Math.max(b.i1, i1); }
      else { b = { a0: a, a1: a, i0, i1 }; bandas.push(b); abertas.push(b); }
    });
    const out = [];
    bandas.forEach(b => {
      if (b.a1 - b.a0 <= 2) out.push([(b.a0 + b.a1 + 1) / 2, b.i0, b.i1 + 1]);   // linha fina: o eixo
      else { out.push([b.a0, b.i0, b.i1 + 1]); out.push([b.a1 + 1, b.i0, b.i1 + 1]); }   // parede grossa: as duas faces
    });
    return out;
  };
  const Hs = faces(corridas(H, W, (y, x) => escuro[y * W + x])).map(([y, x0, x1]) => ({ y, x0, x1 }));
  const Vs = faces(corridas(W, H, (x, y) => escuro[y * W + x])).map(([x, y0, y1]) => ({ x, y0, y1 }));
  return { H: Hs, V: Vs };
};

/* cache por piso; a imagem é lida em segundo plano e o encaixe usa-a quando estiver pronta */
P._paredes = {};
P.paredesDaImagem = function (p) {
  if (!p || !p.imagem) return null;
  const chave = p.imagem.length + ':' + p.w + ':' + p.h, c = this._paredes[p.id];
  if (c && c.chave === chave) return c.pronto ? c : null;
  const reg = this._paredes[p.id] = { chave, pronto: false };
  const img = new Image();
  img.onload = () => {
    try {
      const k = Math.min(1, MAXW / Math.max(img.naturalWidth || p.w, 1));
      const W = Math.max(1, Math.round((img.naturalWidth || p.w) * k)), Hh = Math.max(1, Math.round((img.naturalHeight || p.h) * k));
      const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
      const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, W, Hh);
      const d = this._detetarParedes(g.getImageData(0, 0, W, Hh).data, W, Hh);
      const sx = p.w / W, sy = p.h / Hh;   // para píxeis da planta (as coordenadas do desenho)
      reg.H = d.H.map(s => ({ y: s.y * sy, x0: s.x0 * sx, x1: s.x1 * sx }));
      reg.V = d.V.map(s => ({ x: s.x * sx, y0: s.y0 * sy, y1: s.y1 * sy }));
      reg.pronto = true;
    } catch (e) { reg.erro = String(e && e.message || e); }   // imagem de outra origem (canvas sujo): fica sem encaixe
  };
  img.onerror = () => { reg.erro = 'imagem'; };
  img.src = p.imagem;
  return null;
};

const base = P.encaixe;
P.encaixe = function (raw, opts) {
  const r = base.call(this, raw, opts);
  opts = opts || {};
  if (r && r.tipo && r.tipo !== 'grelha') return r;
  if (opts.salas === false || (VC.dados.params && VC.dados.params.encaixeImagem === false)) return r;
  const p = this.pisoAtual(), W = this.paredesDaImagem(p); if (!W) return r;
  const z = this.zoom || 1, tol = 10 / z;
  // 1. canto: uma face horizontal e uma vertical perto do ponto
  let bh = null, bv = null;
  W.H.forEach(s => { const d = Math.abs(raw[1] - s.y); if (d < tol && raw[0] >= s.x0 - tol && raw[0] <= s.x1 + tol && (!bh || d < bh.d)) bh = { d, s }; });
  W.V.forEach(s => { const d = Math.abs(raw[0] - s.x); if (d < tol && raw[1] >= s.y0 - tol && raw[1] <= s.y1 + tol && (!bv || d < bv.d)) bv = { d, s }; });
  if (bh && bv) return { q: [bv.s.x, bh.s.y], tipo: 'cantoImg', rot: 'canto da parede (imagem)', d: Math.hypot(bh.d, bv.d) };
  const m = bh && (!bv || bh.d <= bv.d) ? { q: [raw[0], bh.s.y], d: bh.d } : bv ? { q: [bv.s.x, raw[1]], d: bv.d } : null;
  if (m) return { q: m.q, tipo: 'paredeImg', rot: 'parede (imagem)', d: m.d };
  return r;
};

/* opção no painel do piso */
if (PN && PN.esquemas && PN.esquemas.piso) {
  PN.esquemas.piso.campos.push({ id: 'encaixeImagem', rot: 'Encaixar nas paredes da imagem', tipo: 'sim',
    ler: () => !(VC.dados.params && VC.dados.params.encaixeImagem === false),
    escrever: (p, v) => { if (v) delete VC.dados.params.encaixeImagem; else VC.dados.params.encaixeImagem = false; },
    ajuda: 'Ao desenhar salas, o ponto agarra os cantos e as faces das paredes (linhas escuras longas) da planta importada. As salas já desenhadas têm prioridade.' });
}
/* começa a ler a imagem assim que o piso aparece */
const redB = P.redesenhar;
P.redesenhar = function () { const r = redB.apply(this, arguments); try { this.paredesDaImagem(this.pisoAtual()); } catch (e) { /* sem imagem */ } return r; };
})();
