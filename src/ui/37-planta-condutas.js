/* ============================================================
   VentiCondutas · Planta: condutas especificadas e reajuste (Fase 2 do desenho)
   ------------------------------------------------------------
   Desenha-se o ramal com uma só linha; a app escolhe o Ø troço a troço
   (100 → 160 → 200 …) e mostra as reduções. Aqui o projetista controla:
   · Especificação (painel do ramal → Avançado, herdada pelos sub-ramais):
     série de diâmetros, classe de estanquidade, isolamento.
   · Regras do reajuste: reduzir em cada derivação ou Ø único; comprimento
     mínimo de troço para reduzir; salto mínimo de tamanhos; máximo de
     reduções por ramal.
   · Na planta: símbolo de cada redução (arrastar = adiar a redução para
     dentro do troço; clique + Delete = remover); clicar num troço do ramal
     selecionado abre o painel do troço (Ø fixo, porque ficou assim).
   Tudo entra no Ctrl+Z e recalcula.
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('37-planta-condutas');
const P = VC.planta, PN = VC.paineis, C = VC.calculo;
if (!P || !PN || !C || !C.regrasReajuste) return;
const esc = s => VC.utils.esc(s);
const fmt = (n, d) => VC.utils.fmt(Number(n), d == null ? 0 : d);
const porId = (l, id) => (VC.dados[l] || []).find(x => String(x.id) === String(id));
const vazio = v => v === undefined || v === null || String(v).trim() === '';
const n2 = v => Math.round(v * 100) / 100;

/* ── mudar um ramal com desfazer e recálculo ── */
P._mudarRamal = function (r, fn, motivo) {
  if (!r || this._bloqueado()) return false;
  const antes = this._estado(); fn(r);
  this._empilhar(motivo, antes);
  if (VC.perf) ['cacheFisica', 'cacheMaterializacao', 'ordenacaoTopologica', 'cacheBalanco'].forEach(k => { if (VC.perf[k] && VC.perf[k].invalidar) VC.perf[k].invalidar(); });
  if (VC.historico && VC.historico.push) VC.historico.push(motivo + ' (planta)');
  if (VC.estado && VC.estado.forcarSync) VC.estado.forcarSync();
  this.redesenhar();
  return true;
};

/* ── especificação e regras no painel do ramal (herdadas) ── */
const ESTANQ = [['', '— por definir —'], ['A', 'Classe A'], ['B', 'Classe B'], ['C', 'Classe C'], ['D', 'Classe D']];
const ISOL = [['', 'sem isolamento'], ['termico', 'térmico'], ['acustico', 'acústico'], ['termoacustico', 'térmico e acústico']];
const spec = (id, rot, tipo, extra) => Object.assign({
  id: 'esp_' + id, rot, tipo,
  ler: r => { const e = r.especificacao; return e && e[id] !== undefined ? e[id] : ''; },
  proposto: r => { const o = C.origemSpec(r, id); if (o && o !== r) return { v: o.especificacao[id], origem: 'herdado', nota: 'de ' + o.nome }; return extra && extra.omissao ? extra.omissao(r) : null; },
  escrever: (r, v) => { const e = r.especificacao = Object.assign({}, r.especificacao); if (vazio(v)) delete e[id]; else e[id] = tipo === 'num' ? VC.utils.num(v) : v; if (!Object.keys(e).length) delete r.especificacao; }
}, extra || {});
const camposSpec = [
  spec('criterio', 'Critério de dimensionamento', 'opcoes', { opcoes: () => [['', '—'], ['loss', 'perda de carga constante (' + VC.constantes.R_ALVO + ' Pa/m)'], ['velocidade', 'velocidade máxima do nível']], omissao: () => ({ v: (VC.dados.metodoCalculo && VC.dados.metodoCalculo.metodo) || 'loss', origem: 'setup' }) }),
  spec('serie', 'Série de diâmetros', 'opcoes', { opcoes: () => [['', '—'], ['S1', 'S1 · comercial (63 a 2000)'], ['S2', 'S2 · reduzida (100 a 2000)'], ['propria', 'própria (lista do fornecedor)']], omissao: () => ({ v: VC.dados.serieDiametros || 'S1', origem: 'setup' }) }),
  spec('serieLista', 'Diâmetros disponíveis', 'texto', { vis: r => C.specDe(r, 'serie', '') === 'propria', ajuda: 'Em mm, separados por vírgulas (ex.: 100, 125, 160, 200, 250, 315).' }),
  spec('ladosMax', 'Relação de lados máxima (retangular)', 'num', { un: ': 1', min: 1, passo: 0.5, omissao: () => ({ v: 4, origem: 'norma', nota: 'prática corrente' }) }),
  spec('estanquidade', 'Estanquidade (EN 12237 / EN 1507)', 'opcoes', { opcoes: () => ESTANQ }),
  spec('isolamento', 'Isolamento', 'opcoes', { opcoes: () => ISOL }),
  spec('isolEsp', 'Espessura do isolamento', 'num', { un: 'mm', min: 0, passo: 5, vis: r => !!C.specDe(r, 'isolamento', '') }),
  spec('tAr', 'Temperatura do ar na conduta', 'num', { un: '°C', passo: 0.5, vis: r => !VC.redes.ehExtracao(r.rede), omissao: () => ({ v: VC.constantes.TERMICA.T_AR, origem: 'norma', nota: 'insuflação de verão' }), ajuda: 'Para as perdas térmicas e o risco de condensação. No inverno use a temperatura de insuflação de inverno.' }),
  spec('tEnv', 'Temperatura à volta da conduta', 'num', { un: '°C', passo: 0.5, vis: r => !VC.redes.ehExtracao(r.rede), omissao: () => ({ v: VC.constantes.TERMICA.T_ENV, origem: 'norma', nota: 'teto falso no verão' }) }),
  spec('hrEnv', 'Humidade relativa à volta', 'num', { un: '%', min: 0, passo: 5, vis: r => !VC.redes.ehExtracao(r.rede), omissao: () => ({ v: VC.constantes.TERMICA.HR_ENV, origem: 'norma' }) }),
  spec('Dmin', 'Ø mínimo', 'num', { un: 'mm', min: 0, passo: 5, omissao: () => ({ v: '', origem: 'norma', nota: 'sem mínimo' }), ajuda: 'O Ø calculado nunca fica abaixo deste (ex.: 125 mm por limpeza ou montagem).' }),
  spec('reajuste', 'Reajuste do Ø', 'opcoes', { opcoes: () => [['', '—'], ['derivacao', 'reduzir em cada derivação'], ['marcados', 'reduzir só nos pontos marcados'], ['unico', 'Ø único em todo o ramal']], omissao: () => ({ v: 'derivacao', origem: 'norma', nota: 'perda constante' }), ajuda: 'As regras abaixo passam aos sub-ramais.' }),
  spec('minL', 'Troço mínimo para reduzir', 'num', { un: 'm', min: 0, passo: 0.5, vis: r => C.regrasReajuste(r).modo !== 'unico', omissao: () => ({ v: 0, origem: 'norma', nota: 'sem mínimo' }) }),
  spec('minSaltos', 'Reduzir só se descer', 'num', { un: 'tamanhos', min: 1, passo: 1, vis: r => C.regrasReajuste(r).modo !== 'unico', omissao: () => ({ v: 1, origem: 'norma' }) }),
  spec('maxReducoes', 'Máximo de reduções no ramal', 'num', { min: 0, passo: 1, vis: r => C.regrasReajuste(r).modo !== 'unico', omissao: () => ({ v: '', origem: 'norma', nota: 'sem limite' }) })
];
const ER = PN.esquemas.ramal;
const pfR = ER.porFazer;
ER.porFazer = function (r, p) { const a = pfR.call(this, r, p); return (r.aumentaJusante || []).length ? a.concat(['a secção aumenta a jusante (' + r.aumentaJusante.join('; ') + '): confirme a secção fixa']) : a; };
ER.campos = ER.campos.concat(camposSpec);
const resR = ER.resultado;
ER.resultado = function (r, p) {
  const out = resR.call(this, r, p), R = r.reducoesCalc || [], F = Object.keys(r.trocosFix || {}).length;
  out.push(['Superfície de conduta', fmt(r.superficie_m2, 2) + ' m²', 'perímetro × comprimento, troço a troço']);
  const th = r.termica;
  if (th) {
    out.push([th.phi >= 0 ? 'Ganho térmico pela parede' : 'Perda térmica pela parede', fmt(Math.abs(th.phi), 0) + ' W', 'U ' + fmt(th.U, 2) + ' W/(m²·K) · ' + (th.e ? fmt(th.e, 0) + ' mm de isolamento' : 'sem isolamento térmico') + ' · ' + fmt(th.tAr, 1) + ' → ' + fmt(th.tEnv, 1) + ' °C']);
    out.push(['Variação da temperatura do ar', (th.dT >= 0 ? '+' : '') + fmt(th.dT, 2) + ' K', 'ao longo do ramal']);
    out.push(['Superfície exterior', fmt(th.ts, 1) + ' °C', 'ponto de orvalho ' + fmt(th.td, 1) + ' °C' + (th.risco ? ' · CONDENSA: isolamento ≥ ' + th.eMin + ' mm' : ' · sem condensação')]);
  }
  out.push(['Fugas (estanquidade)', r.Q_fugas != null ? fmt(r.Q_fugas, 1) + ' m³/h' : '—', r.Q_fugas != null ? 'classe ' + r.classeEstanquidade + ' a ' + fmt(r.p_fugas, 0) + ' Pa' + (Number(r.Q) > 0 ? ' · ' + fmt(100 * r.Q_fugas / r.Q, 1) + ' % do caudal' : '') : 'defina a classe de estanquidade (Avançado)']);
  const u = !r.parente && r.utaRef && porId('utas', r.utaRef);
  if (u && u.Q_fugas > 0) out.push(['Fugas da rede de ' + u.nome, fmt(u.Q_fugas, 1) + ' m³/h', 'ventilador: ' + fmt(u.Q * 3600, 0) + ' + ' + fmt(u.Q_fugas, 0) + ' = ' + fmt(u.Q_ventilador_mh, 0) + ' m³/h; potência e SFP com este caudal' + (u.fugasDefinidas < u.fugasRamais ? ' (' + (u.fugasRamais - u.fugasDefinidas) + ' ramais sem classe)' : '')]);
  if (r.sugCirc) out.splice(4, 0, ['Sugestão no início', 'Ø' + r.sugCirc.D + (r.sugRect ? ' · ou ' + r.sugRect.b + '×' + r.sugRect.h : ''), r.secaoAdotada === 'retangular' ? 'adotada a retangular' + (r.sugCirc.cabe ? '' : ' (a circular não cabe)') : 'adotada a circular (mais barata)']);
  out.push(['Reduções', R.length ? R.map(x => (x.deTxt || 'Ø' + x.de) + '→' + (x.paraTxt || x.para) + ' a ' + fmt(x.s, 1) + ' m').join(' · ') : 'nenhuma', F ? F + ' troço(s) com Ø fixo' : 'clique num troço para o ver']);
  return out;
};

/* ── troço: seleção e painel ── */
P.trocoSel = null;   // { r: id do ramal, key }
P.redSel = null;     // chave da redução selecionada (no ramal do troço selecionado)
const trocosDaChave = (r, key) => (r.trocos || []).filter(t => t.key === key);
P.selecionarTrocoEm = function (r, q) {
  const p = this.pisoAtual(); if (!r || !r.planta || !p) return;
  const pr = C._projetarNoTracado ? C._projetarNoTracado(q, r.planta.pts) : null; if (!pr) return;
  const s = pr.frac * (Number(r.L) || 0), t = (r.trocos || []).find(x => s >= x.de - 1e-6 && s <= x.ate + 1e-6) || (r.trocos || [])[0];
  if (!t) return;
  this.trocoSel = { r: r.id, key: t.key }; this.redSel = null; this.redesenhar();
};
PN.esquemas.troco = {
  titulo: o => o.r.nome + ' · troço ' + (o.i + 1) + ' de ' + o.n, icone: 'fa-grip-lines', rotulo: 'Troço',
  avisos: o => [o.r.nome],
  campos: [
    { id: 'secFixa', rot: 'Secção fixa neste troço', tipo: 'texto', ess: true,
      ler: o => { const f = (o.r.trocosFix || {})[o.key]; return f ? String(f).replace('x', '×') : ''; },
      proposto: o => ({ v: '', origem: 'calculo', nota: o.t.secNom && o.t.secNom.forma === 'retangular' ? o.t.secNom.b + '×' + o.t.secNom.h : 'Ø' + o.t.Dnom }),
      escrever: (o, v) => {
        const F = o.r.trocosFix = Object.assign({}, o.r.trocosFix);
        if (vazio(v)) delete F[o.key];
        else { const sc = C.lerSeccao(v); if (!sc) { VC.ui.toast('Escreva um Ø (ex.: 250) ou largura × altura (ex.: 400×200).'); return; } F[o.key] = sc.forma === 'circular' ? sc.D : sc.b + '×' + sc.h; }
        if (!Object.keys(F).length) delete o.r.trocosFix;
      },
      ajuda: 'Ø (ex.: 250) ou largura × altura em mm (ex.: 400×200). Manda sobre o cálculo e as regras; vazio volta ao calculado.' },
    { id: 'tipoReducao', rot: 'Tipo da redução no início', tipo: 'opcoes', ess: true, vis: o => (o.r.reducoesCalc || []).some(x => x.key === o.key),
      opcoes: () => [['', '—'], ['gradual', 'gradual (concêntrica ou excêntrica, ~30°)'], ['brusca', 'brusca (sem cone)']],
      ler: o => ((o.r.reducoes || {})[o.key] || {}).tipo || '', proposto: () => ({ v: 'gradual', origem: 'norma', nota: 'ζ da biblioteca' }),
      escrever: (o, v) => { const R = o.r.reducoes = Object.assign({}, o.r.reducoes), x = Object.assign({}, R[o.key]); if (vazio(v)) delete x.tipo; else x.tipo = v; if (Object.keys(x).length) R[o.key] = x; else delete R[o.key]; if (!Object.keys(R).length) delete o.r.reducoes; },
      ajuda: 'A excêntrica mantém a face de cima encostada ao teto; o ζ é o da gradual.' }
  ],
  resultado: o => {
    const T = trocosDaChave(o.r, o.key), t = T[0], u = T[T.length - 1];
    const rd = T.find(x => x.dpReducao > 0);
    const L = T.reduce((s, x) => s + x.L, 0), dp = T.reduce((s, x) => s + (x.dpLin || 0) + (x.dpTe || 0) + (x.dpReducao || 0), 0);
    const vmax = Math.max.apply(null, T.map(x => Number(x.v) || 0)), lim = C.vMaxDe(o.r);
    return [
      ['Posição no ramal', fmt(t.de, 2) + ' a ' + fmt(u.ate, 2) + ' m', 'L ' + fmt(L, 2) + ' m'],
      ['Caudal', fmt(t.Q, 0) + ' m³/h'],
      ['Secção adotada', T.map(x => x.forma === 'retangular' ? x.b + '×' + x.h : 'Ø' + x.Dcom).join(' → '), t.motivo || (T.length > 1 ? 'redução adiada' : 'a sugerida')],
      t.sugCirc ? ['Sugestão circular', 'Ø' + t.sugCirc.D + ' · ' + fmt(t.sugCirc.v, 2) + ' m/s · ' + fmt(t.sugCirc.R, 2) + ' Pa/m', t.sugCirc.cabe ? 'preferida: mais barata' : 'não cabe na altura disponível'] : null,
      t.sugRect ? ['Alternativa retangular', t.sugRect.b + '×' + t.sugRect.h + ' · ' + fmt(t.sugRect.v, 2) + ' m/s · ' + fmt(t.sugRect.R, 2) + ' Pa/m', 'Ø equivalente ' + t.sugRect.De] : ['Alternativa retangular', '—', 'nenhuma cabe na altura disponível'],
      ['Velocidade', fmt(vmax, 2) + ' m/s', vmax > lim + 1e-9 ? 'acima do limite de ' + fmt(lim, 1) + ' m/s' : 'limite ' + fmt(lim, 1) + ' m/s'],
      ['Perda linear R', fmt(t.R, 2) + ' Pa/m'],
      ['Superfície de conduta', fmt(T.reduce((s, x) => s + (x.area_m2 || 0), 0), 2) + ' m²'],
      ['Δp do troço', fmt(dp, 1) + ' Pa', 'linear + tê + redução'],
      rd ? ['Redução', (rd.tipoReducao || 'gradual') + ' · ζ ' + fmt(rd.zetaReducao, 2), fmt(rd.dpReducao, 1) + ' Pa'] : null
    ].filter(Boolean);
  },
  porFazer: o => { const T = trocosDaChave(o.r, o.key); const v = Math.max.apply(null, T.map(x => Number(x.v) || 0)); return v > C.vMaxDe(o.r) + 1e-9 ? ['velocidade acima do limite: aumente o Ø fixo ou volte ao calculado'] : []; },
  acoes: o => {
    const red = (o.r.reducoes || {})[o.key], calc = (o.r.reducoesCalc || []).some(x => x.key === o.key), a = [];
    if (o.i > 0 && calc && C.regrasReajuste(o.r).modo !== 'marcados') a.push(['Remover a redução no início (Delete)', "VC.planta.removerReducao('" + esc(o.r.id) + "','" + o.key + "')"]);
    if (o.i > 0 && C.regrasReajuste(o.r).modo === 'marcados') {
      if (red && red.marcada) a.push(['Tirar a redução marcada (Delete)', "VC.planta.marcarReducao('" + esc(o.r.id) + "','" + o.key + "', false)"]);
      else a.push(['Reduzir no início deste troço', "VC.planta.marcarReducao('" + esc(o.r.id) + "','" + o.key + "', true)", true]);
    }
    if (red && red.removida) a.push(['Repor a redução', "VC.planta.reporReducao('" + esc(o.r.id) + "','" + o.key + "')", true]);
    if (red && red.s) a.push(['Reduzir logo na derivação', "VC.planta.reporReducao('" + esc(o.r.id) + "','" + o.key + "')"]);
    const t = o.t, def = "VC.paineis.definir('troco','" + esc(o.id) + "','secFixa',";
    const atual = (o.r.trocosFix || {})[o.key];
    if (t.sugCirc && String(atual) !== String(t.sugCirc.D)) a.push(['Usar circular Ø' + t.sugCirc.D, def + "'" + t.sugCirc.D + "')", t.sugCirc.cabe && !atual]);
    if (t.sugRect && String(atual) !== t.sugRect.b + '×' + t.sugRect.h) a.push(['Usar retangular ' + t.sugRect.b + '×' + t.sugRect.h, def + "'" + t.sugRect.b + '×' + t.sugRect.h + "')"]);
    if (atual) a.push(['Voltar à secção calculada', def + "'')", true]);
    a.push(['Voltar ao ramal', 'VC.planta.trocoSel=null;VC.planta.redesenhar()']);
    return a;
  }
};
P.removerReducao = function (rid, key) { const r = porId('ramais', rid); return this._mudarRamal(r, x => { const R = Object.assign({}, x.reducoes), y = Object.assign({}, R[key]); delete y.s; delete y.marcada; y.removida = true; R[key] = y; x.reducoes = R; }, 'redução removida em «' + (r && r.nome) + '»'); };
P.reporReducao = function (rid, key) { const r = porId('ramais', rid); return this._mudarRamal(r, x => { const R = Object.assign({}, x.reducoes); delete R[key]; if (Object.keys(R).length) x.reducoes = R; else delete x.reducoes; }, 'redução reposta em «' + (r && r.nome) + '»'); };
P.marcarReducao = function (rid, key, on) { const r = porId('ramais', rid); return this._mudarRamal(r, x => { const R = Object.assign({}, x.reducoes), y = Object.assign({}, R[key]); if (on) { y.marcada = true; delete y.removida; } else delete y.marcada; if (Object.keys(y).length) R[key] = y; else delete R[key]; if (Object.keys(R).length) x.reducoes = R; else delete x.reducoes; }, (on ? 'redução marcada' : 'redução desmarcada') + ' em «' + (r && r.nome) + '»'); };
P.adiarReducao = function (rid, key, s) { const r = porId('ramais', rid); return this._mudarRamal(r, x => { const R = Object.assign({}, x.reducoes), y = Object.assign({}, R[key]); delete y.removida; y.s = n2(s); R[key] = y; x.reducoes = R; }, 'redução movida em «' + (r && r.nome) + '»'); };

/* objeto do painel e seleção */
const obterBase = PN._obter.bind(PN);
PN._obter = function (tipo, id) {
  if (tipo !== 'troco') return obterBase(tipo, id);
  const [rid, key] = String(id).split('|'), r = porId('ramais', rid); if (!r) return null;
  const keys = [...new Set((r.trocos || []).map(t => t.key))], i = keys.indexOf(key); if (i < 0) return null;
  return { id: rid + '|' + key, r, key, t: trocosDaChave(r, key)[0], i, n: keys.length };
};
const selBase = PN.selecao.bind(PN);
PN.selecao = function () {
  const s = selBase();
  if (s && s.tipo === 'ramal' && P.trocoSel && String(P.trocoSel.r) === String(s.o.id)) { const o = PN._obter('troco', s.o.id + '|' + P.trocoSel.key); if (o) return { tipo: 'troco', o }; }
  if (!s || s.tipo !== 'ramal') P.trocoSel = null;
  return s;
};
// o painel da planta desenha o troço como desenha os outros (29 trata «sel.tipo» genericamente)

/* ── desenho: símbolo das reduções e troço selecionado ── */
const pontoEm = (pts, f) => { const q = P._subTracado(pts, Math.max(0, Math.min(0.9999, f)), Math.min(1, f + 0.0001)); return q && q.length >= 2 ? { p: q[0], d: [q[1][0] - q[0][0], q[1][1] - q[0][1]] } : null; };
const svgBase = P._svg;
P._svg = function (p) {
  if (this.trocoSel && String(this.ramalSel) !== String(this.trocoSel.r)) { this.trocoSel = null; this.redSel = null; }
  const s = svgBase.call(this, p); if (!p) return s;
  const z = this.zoom || 1; let x = '';
  const larg = (r, D) => { const d = Number(D) || 160; return p.escala ? Math.max(d / 1000 / p.escala, 2.5 / z) : Math.max(2.5, Math.min(9, d / 45)) / z; };
  (this.ramaisDoPiso ? this.ramaisDoPiso(p) : []).forEach(r => {
    const L = Number(r.L) || 0, pts = r.planta.pts; if (!(L > 0)) return;
    if (this.trocoSel && String(this.trocoSel.r) === String(r.id)) {
      trocosDaChave(r, this.trocoSel.key).forEach(t => {
        const q = this._subTracado(pts, t.de / L, t.ate / L);
        x += '<polyline class="planta-troco-sel" points="' + q.map(c => c.join(',')).join(' ') + '" fill="none" stroke="#ff6a00" stroke-opacity="0.55" stroke-width="' + (larg(r, t.forma === 'retangular' ? t.b : t.Dcom) + 10 / z) + '" stroke-linecap="round" pointer-events="none"/>';
      });
    }
    const Lpx = this.comprimentoPx(pts) || 1;
    (r.reducoesCalc || []).forEach(rd => {
      // na derivação há quase sempre um terminal ou um sub-ramal: o símbolo fica logo a seguir ao tê (como em obra)
      const f = rd.movida ? rd.s / L : Math.min(rd.s / L + 18 / z / Lpx, 0.999);
      const e = pontoEm(pts, f); if (!e) return;
      const l = Math.hypot(e.d[0], e.d[1]) || 1, ux = e.d[0] / l, uy = e.d[1] / l, nx = -uy, ny = ux;
      const w1 = (larg(r, rd.de) + 4 / z) / 2, w2 = (larg(r, rd.para) + 4 / z) / 2, h = Math.max(7 / z, w1 * 0.9);
      const a = [e.p[0] - ux * h / 2, e.p[1] - uy * h / 2], b = [e.p[0] + ux * h / 2, e.p[1] + uy * h / 2];
      const pol = [[a[0] + nx * w1, a[1] + ny * w1], [b[0] + nx * w2, b[1] + ny * w2], [b[0] - nx * w2, b[1] - ny * w2], [a[0] - nx * w1, a[1] - ny * w1]];
      const on = this.redSel === rd.key && this.trocoSel && String(this.trocoSel.r) === String(r.id);
      x += '<g class="planta-red' + (on ? ' sel' : '') + '" data-r="' + r.id + '" data-k="' + rd.key + '"><title>Redução ' + (rd.deTxt || 'Ø' + rd.de) + ' → ' + (rd.paraTxt || 'Ø' + rd.para) + ' a ' + fmt(rd.s, 2) + ' m' + (rd.movida ? ' (adiada)' : '') + ' · arraste para a adiar; clique e Delete para a remover</title>'
        + '<polygon points="' + pol.map(c => n2(c[0]) + ',' + n2(c[1])).join(' ') + '" fill="' + (on ? '#f2c94c' : '#fff') + '" stroke="#1e293b" stroke-width="1.6" vector-effect="non-scaling-stroke"/></g>';
    });
  });
  if (!x) return s;
  return s.replace(/<\/svg>$/, x + '</svg>');   // por cima das alças de edição: arrastar a redução não move o segmento
};

/* ── interação: arrastar / selecionar a redução ── */
const ligarBase = P.ligar;
P.ligar = function () {
  ligarBase.apply(this, arguments);
  const palco = document.getElementById('plantaTela'), svg = document.getElementById('plantaSVG'); if (!palco || !svg) return;
  /* duplo clique no nome do ramal (o texto que não é «Ø…»): seleciona-o e foca o campo Nome */
  palco.addEventListener('dblclick', ev => {
    if (this.ferramenta !== 'sel') return;
    // os textos não recebem o rato (pointer-events: none): procura o nome de ramal debaixo do ponteiro
    const tx = [...svg.querySelectorAll('.planta-ramal > text')].find(t => { if (/^Ø|^\d/.test(t.textContent)) return false; const b = t.getBoundingClientRect(); return ev.clientX >= b.left - 3 && ev.clientX <= b.right + 3 && ev.clientY >= b.top - 3 && ev.clientY <= b.bottom + 3; });
    if (!tx) return;
    const g = tx.closest('.planta-ramal'), id = g && Number(g.dataset.r); if (!id) return;
    ev.stopPropagation(); ev.preventDefault();
    if (String(this.ramalSel) !== String(id)) this.selecionarRamal(id);
    this.focarNome();
  }, true);
  let arr = null;
  palco.addEventListener('pointerdown', ev => {
    if (ev.button !== 0 || this.ferramenta !== 'sel' || this._espaco) return;
    const g = ev.target.closest && ev.target.closest('.planta-red'); if (!g) return;
    const r = porId('ramais', g.dataset.r); if (!r || this._bloqueado()) return;
    ev.stopPropagation(); ev.preventDefault();
    const T = trocosDaChave(r, g.dataset.k), i = (r.trocos || []).indexOf(T[0]);
    const de = (r.trocos[i - 1] && r.trocos[i - 1].key === g.dataset.k) ? r.trocos[i - 1].de : T[0].de;
    arr = { r, key: g.dataset.k, g, x0: ev.clientX, y0: ev.clientY, de: Math.min(de, T[0].de), ate: T[T.length - 1].ate, mexeu: false };
    try { palco.setPointerCapture(ev.pointerId); } catch (e) { /* opcional */ }
  }, true);
  palco.addEventListener('pointermove', ev => {
    if (!arr) return; ev.stopPropagation();
    if (!arr.mexeu && Math.hypot(ev.clientX - arr.x0, ev.clientY - arr.y0) < 4) return;
    arr.mexeu = true;
    const q = this._pontoBruto ? this._pontoBruto(ev) : this._ponto(ev), pr = C._projetarNoTracado(q, arr.r.planta.pts), L = Number(arr.r.L) || 0;
    if (!pr) return;
    arr.s = Math.max(arr.de, Math.min(arr.ate - 0.05, pr.frac * L));
    const e = pontoEm(arr.r.planta.pts, arr.s / L), poly = arr.g.querySelector('polygon');
    if (e && poly) { const b = poly.getAttribute('points').split(' ').map(c => c.split(',').map(Number)); const cx = (b[0][0] + b[2][0]) / 2, cy = (b[0][1] + b[2][1]) / 2; arr.g.setAttribute('transform', 'translate(' + n2(e.p[0] - cx) + ',' + n2(e.p[1] - cy) + ')'); }
  }, true);
  palco.addEventListener('pointerup', ev => {
    if (!arr) return; const a = arr; arr = null; ev.stopPropagation();
    if (!a.mexeu) { this.ramalSel = a.r.id; this.trocoSel = { r: a.r.id, key: a.key }; this.redSel = a.key; this.redesenhar(); return; }
    if (a.s == null) { this.redesenhar(); return; }
    if (a.s <= a.de + 0.02) this.reporReducao(a.r.id, a.key); else this.adiarReducao(a.r.id, a.key, a.s);
  }, true);
};
/* Delete com uma redução selecionada: remove-a; Esc larga o troço */
const apagarBase = P.gestoApagar;
P.gestoApagar = function () {
  if (this.redSel && this.trocoSel) { const k = this.redSel; this.redSel = null; return this.removerReducao(this.trocoSel.r, k) ? 'reducao' : 'recusado'; }
  return apagarBase.apply(this, arguments);
};
const escBase = P.gestoEsc;
P.gestoEsc = function () { if (this.trocoSel) { this.trocoSel = null; this.redSel = null; this.redesenhar(); return 'troco'; } return escBase.apply(this, arguments); };
const temBase = P.temSelecao;
P.temSelecao = function () { return !!this.trocoSel || temBase.call(this); };
if (P.DICAS) P.DICAS.sel += ' Num ramal selecionado, clique num troço para o ver; arraste o símbolo de redução para a adiar.';
})();
