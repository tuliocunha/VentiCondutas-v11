/* ============================================================
   VentiCondutas · Planta: verificador de coerência desenho ↔ tabelas
   ------------------------------------------------------------
   VC.planta.coerencia() (contrato, secção 7) devolve avisos quando o que
   está desenhado não bate com o que o cálculo usa. O cálculo (calcularTudo)
   junta-os aos seus, por isso aparecem no desenho, no cartão e na Entrega.

   I2  polígono da sala com < 3 vértices ou que se cruza          → erro
   I3  área desenhada ≠ área da tabela (> 15 %), sem aceitar        → atenção
       (a área da tabela é a que entra no caudal da norma: T12 × A, 10 × A…)
   I4  terminal colocado fora das salas que serve                 → atenção
   I6  ligação terminal → ramal > 0,5 m (não entra no L nem no Δp)  → atenção
   I7  sub-ramal desenhado que não começa no traçado do pai         → atenção
   I9  seta da transferência a > 0,5 m das paredes das duas salas   → atenção
   I11 terminais de uma definição não somam o Q_total              → erro
   L   L da tabela ≠ L medido no desenho (> 10 % e > 0,5 m)         → atenção
       (o L da tabela é o que entra no Δp)
       piso com desenhos e sem escala                             → por fazer
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('27-planta-coerencia');
const P = VC.planta;
if (!P || !P.areaPx || !P._distSeg) return;
const fmt = (n, d) => VC.utils.fmt(n, d == null ? 1 : d);
const LIM = { area: 0.15, ligacao: 0.5, porta: 0.5, pai: 0.5, Lrel: 0.10, Labs: 0.5 };
P.LIMITES_COERENCIA = LIM;

const cruza = (a, b, c, d) => {   // segmentos ab e cd cruzam-se (sem contar pontas comuns)
  const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
};
P.poligonoValido = function (pts) {
  if (!pts || pts.length < 3) return false;
  const n = pts.length;
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
    if (i === 0 && j === n - 1) continue;   // arestas vizinhas (fecho)
    if (cruza(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n])) return false;
  }
  return this.areaPx(pts) > 0;
};
const distContorno = (q, pts) => { let d = Infinity; for (let i = 0; i < pts.length; i++) d = Math.min(d, P._distSeg(q, pts[i], pts[(i + 1) % pts.length])[0]); return d; };
const distTraco = (q, pts) => { let d = Infinity; for (let i = 1; i < pts.length; i++) d = Math.min(d, P._distSeg(q, pts[i - 1], pts[i])[0]); return d; };
const comprimentoPx = pts => { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; };

P.coerencia = function () {
  const D = VC.dados, F = [], add = (sev, tipo, el, msg) => F.push({ severidade: sev, tipo, elemento: el, msg });
  const pisos = new Map((D.plantas || []).map(p => [p.id, p]));
  const espacos = D.espacos || [], porNome = new Map(espacos.map(e => [e.nome, e]));
  const ramais = D.ramais || [], ramalPorNome = new Map(ramais.map(r => [r.nome, r]));

  // piso com desenhos e sem escala: as medidas não existem
  pisos.forEach(p => {
    const tem = espacos.some(e => e.planta && e.planta.pisoId === p.id) || ramais.some(r => r.planta && r.planta.pisoId === p.id);
    if (tem && !p.escala) add('POR FAZER', 'Escala por calibrar', p.nome, 'Há desenhos em «' + p.nome + '» mas a escala não está calibrada: as áreas e os comprimentos não são medidos. Use a ferramenta Escala (S) ou «Calibrar pela área».');
  });

  espacos.forEach(e => {
    if (!e.planta || !e.planta.pts) return;
    const p = pisos.get(e.planta.pisoId);
    if (!this.poligonoValido(e.planta.pts)) { add('ERRO', 'Desenho da sala inválido', e.nome, 'O polígono tem menos de 3 vértices ou cruza-se a si próprio: a área medida não é válida. Redesenhe a sala.'); return; }
    // I3
    const Am = p ? this.areaM2(e.planta.pts, p) : null, At = Number(e.A) || 0;
    if (Am && At > 0 && Math.abs(Am - At) / At > LIM.area && !(e.planta.areaAceite != null && Math.abs(e.planta.areaAceite - At) < 1e-6))
      add('ATENÇÃO', 'Área desenhada ≠ tabela', e.nome, 'Desenho ' + fmt(Am, 2) + ' m², tabela ' + fmt(At, 2) + ' m² (' + fmt(Math.abs(Am - At) / At * 100, 0) + ' %). O caudal da norma usa a área da tabela: use a área medida ou aceite a diferença no cartão da sala.');
  });

  (D.terminais || []).forEach(t => {
    if (!t.planta) return;
    const p = pisos.get(t.planta.pisoId), q = [t.planta.x, t.planta.y], nomeT = t.nome || String(t.id);
    // I4
    const salas = (t.espacos || []).map(x => porNome.get(x.nome)).filter(e => e && e.planta && e.planta.pisoId === t.planta.pisoId);
    if (salas.length && !salas.some(e => this.dentro(q, e.planta.pts)))
      add('ATENÇÃO', 'Terminal fora da sala que serve', nomeT, 'Está colocado fora de ' + salas.map(e => '«' + e.nome + '»').join(', ') + ', que é a sala que serve. Arraste-o para dentro (Selecionar, V).');
    // I6
    const r = ramalPorNome.get(t.ramalRef);
    if (p && p.escala && r && r.planta && r.planta.pisoId === t.planta.pisoId) {
      const L = distTraco(q, r.planta.pts) * p.escala;
      if (L > LIM.ligacao) add('ATENÇÃO', 'Ligação ao ramal longa', nomeT, 'O terminal está a ' + fmt(L, 2) + ' m do ramal ' + r.nome + ': essa ligação não entra no L nem no Δp. Prolongue o traçado do ramal até ao terminal.');
    }
  });

  ramais.forEach(r => {
    if (!r.planta || !r.planta.pts || r.planta.pts.length < 2) return;
    const p = pisos.get(r.planta.pisoId); if (!p || !p.escala) return;
    // L da tabela vs L medido
    const Lm = comprimentoPx(r.planta.pts) * p.escala, Lt = Number(r.L) || 0;
    if (Math.abs(Lm - Lt) > Math.max(LIM.Labs, LIM.Lrel * Lm))
      add('ATENÇÃO', 'L da tabela ≠ L medido', r.nome, 'Tabela ' + fmt(Lt, 2) + ' m, desenho ' + fmt(Lm, 2) + ' m. O Δp usa o L da tabela: carregue em «Usar L medido» no cartão do ramal (ou corrija o traçado).');
    // I7
    const pai = r.parente && ramalPorNome.get(r.parente);
    if (pai && pai.planta && pai.planta.pisoId === r.planta.pisoId) {
      const a = r.planta.pts[0], b = r.planta.pts[r.planta.pts.length - 1];
      const d = Math.min(distTraco(a, pai.planta.pts), distTraco(b, pai.planta.pts)) * p.escala;
      if (d > LIM.pai) add('ATENÇÃO', 'Sub-ramal não começa no pai', r.nome, 'O traçado está a ' + fmt(d, 2) + ' m do ramal-pai ' + pai.nome + '. Comece o traçado em cima do pai (ele encaixa).');
    }
  });

  // I9
  (D.transferencias || []).forEach(t => {
    if (!t.planta) return;
    const p = pisos.get(t.planta.pisoId), de = espacos.find(e => e.id === t.deId), pa = espacos.find(e => e.id === t.paraId);
    if (!p || !p.escala || !de || !pa || !de.planta || !pa.planta) return;
    const q = [t.planta.x, t.planta.y], d = Math.max(distContorno(q, de.planta.pts), distContorno(q, pa.planta.pts)) * p.escala;
    if (d > LIM.porta) add('ATENÇÃO', 'Seta longe da porta', t.deNome + ' → ' + t.paraNome, 'A seta está a ' + fmt(d, 2) + ' m da parede de uma das salas: arraste-a para a porta (Selecionar, V).');
  });

  // I11
  espacos.forEach(e => (e.definicoes || []).forEach(d => {
    const T = (D.terminais || []).filter(t => t.definicaoRef && t.definicaoRef.espacoId === e.id && t.definicaoRef.definicaoId === d.id);
    const q = T.reduce((s, t) => s + (Number(t.Q) || 0), 0);
    if (T.length && Math.abs(q - (Number(d.Q_total) || 0)) > 0.5) add('ERRO', 'Terminais ≠ definição', e.nome, 'Os ' + T.length + ' terminais da definição ' + d.id + ' somam ' + fmt(q, 0) + ' m³/h, a definição pede ' + fmt(d.Q_total, 0) + ' m³/h. Materialize de novo os terminais desta definição.');
  }));
  return F;
};

/* aceitar a diferença de área (I3): fica válida enquanto a área da tabela não mudar */
P.aceitarDiferencaArea = function (id) {
  const e = (VC.dados.espacos || []).find(x => String(x.id) === String(id)); if (!e || !e.planta || this._bloqueado()) return;
  const antes = this._estado();
  e.planta.areaAceite = Number(e.A) || 0;
  this._empilhar('diferença de área aceite em «' + e.nome + '»', antes);
  VC.estado.forcarSync(); this.redesenhar();
};

/* o cálculo junta estes avisos aos seus */
VC.calculo.verificadores = VC.calculo.verificadores || [];
VC.calculo.verificadores.push(() => P.coerencia());
})();
