/* ============================================================
   VentiCondutas · Planta: campos da Fase 0B
   ------------------------------------------------------------
   Piso: altura livre do teto falso (passa a ser a altura disponível dos
   ramais desenhados nesse piso) e norte (seta na planta).
   Sala: tipo proposto pelo nome; ocupação proposta pela densidade
   (EN 16798-1, Anexo B); eficácia de remoção εv (Manual SCE, Tabela 68);
   categoria EN 16798-1 da sala; deteção de CO nas garagens.
   Ramal: nível (N1 a N4) e a velocidade máxima que daí vem.
   Terminal: montagem (teto, parede, pavimento, conduta).
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('48-planta-campos');
const P = VC.planta, PN = VC.paineis;
if (!P || !PN || !PN.esquemas || !PN.esquemas.sala || !PN.esquemas.piso) return;
const fmt = (v, d) => VC.utils.fmt(v, d == null ? 1 : d), vazio = v => v === undefined || v === null || String(v).trim() === '';
const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const esq = n => PN.esquemas[n], campo = (n, id) => esq(n) && esq(n).campos.find(c => c.id === id);
const depoisDe = (n, id, novos) => { const L = esq(n).campos, i = L.findIndex(c => c.id === id); L.splice(i >= 0 ? i + 1 : L.length, 0, ...novos); };

/* ── tipo pelo nome: só quando o nome diz mesmo alguma coisa ── */
P.tipoPeloNome = function (nome) {
  const E = VC.csv, n = norm(nome);
  if (!E || !E._inferirTipo || !n) return null;
  const t = E._inferirTipo(nome);
  if (norm(t) === 'escritorio' && !/escritori|gabinete|office/.test(n)) return null;   // «Escritório» é o valor por omissão da função
  return Object.keys(VC.tiposEspaco || {}).find(k => norm(k) === norm(t)) || null;
};
P.nPelaDensidade = function (e) {
  const d = (VC.constantes.DENSIDADE_OCUPACAO || {})[e && e.tipo], A = Number(e && e.A) || 0;
  return d && A > 0 ? { N: Math.max(1, Math.round(A / d)), d } : null;
};

/* ── piso ── */
depoisDe('piso', 'cota', [
  { id: 'hTeto', rot: 'Altura livre do teto falso', un: 'mm', tipo: 'num', ess: true, min: 0, passo: 10,
    ler: p => p.hTeto, proposto: () => ({ v: Number(VC.dados.restricaoH) || 250, origem: 'setup' }),
    escrever: (p, v) => { const n = VC.utils.num(v); if (vazio(v) || !(n > 0)) delete p.hTeto; else p.hTeto = Math.round(n); },
    ajuda: 'Espaço entre o teto falso e a laje. É a altura disponível dos ramais deste piso (a do ramal, se tiver, vem primeiro); a secção retangular fica abaixo dela.' },
  { id: 'norte', rot: 'Norte', un: '°', tipo: 'num', min: 0, passo: 5,
    ler: p => p.norte, escrever: (p, v) => { const n = VC.utils.num(v); if (vazio(v) || !isFinite(n)) delete p.norte; else p.norte = ((Math.round(n) % 360) + 360) % 360; },
    ajuda: 'Ângulo do norte medido a partir do topo da imagem, no sentido dos ponteiros do relógio (0 = norte para cima). Aparece uma seta no canto da planta.' }
]);

/* seta do norte, fixa no canto do ecrã */
const svgBase = P._svg;
P._svg = function (p) {
  const s = svgBase.call(this, p);
  if (!p || p.norte == null || p.norte === '') return s;
  const vb = this.viewBox ? this.viewBox(p) : [0, 0, p.w, p.h], z = this.zoom || 1, R = 22 / z;
  const cx = vb[0] + vb[2] - 44 / z, cy = vb[1] + 140 / z;   // abaixo da barra dos pisos
  const g = '<g class="planta-norte" pointer-events="none" transform="translate(' + cx + ',' + cy + ') rotate(' + Number(p.norte) + ')"><title>Norte (' + Number(p.norte) + '°)</title>'
    + '<circle r="' + R + '" fill="#fff" fill-opacity=".9" stroke="#334155" stroke-width="' + 1.2 / z + '"/>'
    + '<path d="M0,' + (-R * 0.8) + 'L' + (R * 0.35) + ',' + (R * 0.45) + 'L0,' + (R * 0.2) + 'L' + (-R * 0.35) + ',' + (R * 0.45) + 'Z" fill="#334155"/>'
    + '<text y="' + (-R - 4 / z) + '" text-anchor="middle" font-size="' + 12 / z + '" font-weight="700" fill="#334155">N</text></g>';
  return s.slice(0, s.lastIndexOf('</svg>')) + g + '</svg>';
};

/* ── sala ── */
const tipo = campo('sala', 'tipo');
if (tipo) {
  tipo.proposto = e => { const t = P.tipoPeloNome(e.nome); return t ? { v: t, origem: 'nome' } : null; };
}
const N = campo('sala', 'N');
if (N) {
  const prB = N.proposto;
  N.proposto = (e, p) => { const d = P.nPelaDensidade(e); return d ? { v: d.N, origem: 'norma', nota: d.d + ' m²/pessoa (EN 16798-1, Anexo B)' } : (prB ? prB(e, p) : null); };
}
const EV = () => (VC.conhecimento.tabelas.EPSILON_V || []);
depoisDe('sala', 'H', [
  { id: 'detecaoCO', rot: 'Deteção de CO', tipo: 'opcoes', ess: true, vis: e => e.tipo === 'Garagem',
    opcoes: () => [['', '— por definir —'], ['sim', 'sim · liga a ventilação a 50 e a 100 ppm'], ['nao', 'não se aplica · parque aberto']],
    ler: e => e.detecaoCO || '', escrever: (e, v) => { if (v === 'sim' || v === 'nao') e.detecaoCO = v; else delete e.detecaoCO; },
    ajuda: 'RT-SCIE, arts. 180.º–183.º: num parque coberto a ventilação é comandada pela deteção de CO (300 m³/h por veículo a 50 ppm, 600 m³/h a 100 ppm).' }
]);
esq('sala').campos.push(
  { id: 'eficaciaRemocaoTipo', rot: 'Eficácia de remoção εv', tipo: 'opcoes',
    opcoes: () => [['', 'como no Setup (' + fmt(Number(VC.dados.eficaciaRemocao) || 1, 1) + ')']].concat(EV().map(t => [t.id, fmt(t.ev, 1) + ' · ' + t.nome])),
    ler: e => e.eficaciaRemocaoTipo || '',
    escrever: (e, v) => { const t = EV().find(x => x.id === v); if (t) { e.eficaciaRemocao = t.ev; e.eficaciaRemocaoTipo = t.id; } else { delete e.eficaciaRemocao; delete e.eficaciaRemocaoTipo; } },
    ajuda: 'Manual SCE, Tabela 68: divide o caudal de ar novo. Num sistema que aquece e arrefece, escolha o pior caso.' },
  { id: 'categoria', rot: 'Categoria EN 16798-1', tipo: 'opcoes',
    opcoes: () => [['', 'como no Setup (' + ((VC.dados.params && VC.dados.params.categoria) || 'II') + ')'], ['I', 'I · exigência alta'], ['II', 'II · normal'], ['III', 'III · moderada'], ['IV', 'IV · baixa']],
    ler: e => e.categoria || '', escrever: (e, v) => { if (['I', 'II', 'III', 'IV'].indexOf(v) >= 0) e.categoria = v; else delete e.categoria; },
    ajuda: 'Só para comparação (Q EN 16798-1 nos relatórios); o caudal de projeto segue a Portaria 138-I.' }
);
const resB = esq('sala').resultado, pfB = esq('sala').porFazer;
esq('sala').resultado = (e, p) => {
  const out = resB(e, p), c = VC.calculo.calcularQ_normas ? VC.calculo.calcularQ_normas(e) : null;
  if (c && c.Q_EN16798 > 0 && Number(VC.calculo.grupoDe(e)) === 1) out.push(['Q EN 16798-1 (comparação)', fmt(c.Q_EN16798, 0) + ' m³/h', 'categoria ' + (e.categoria || (VC.dados.params && VC.dados.params.categoria) || 'II')]);
  return out;
};
esq('sala').porFazer = (e, p) => {
  const out = pfB ? pfB(e, p) : [], t = P.tipoPeloNome(e.nome);
  if (t && e.tipo && t !== e.tipo) out.push('o nome sugere o tipo «' + t + '» (está «' + e.tipo + '»)');
  return out;
};

/* ── ramal: nível ── */
const NIV = ['', 'primario', 'secundario', 'terciario', 'quaternario'];
if (esq('ramal')) {
  const lim = n => fmt((VC.constantes.VMAX_NIVEL || {})[n] || 6, 1);
  depoisDe('ramal', 'forma', [
    { id: 'nivel', rot: 'Nível', tipo: 'opcoes', ess: true,
      opcoes: () => [1, 2, 3, 4].map(n => [String(n), 'N' + n + ' · ' + ['', 'principal', 'secundário', 'terciário', 'quaternário'][n] + ' · v ≤ ' + lim(n) + ' m/s']),
      ler: r => String(r.nivelNumero || VC.utils.nivelTextoParaNumero(r.nivel) || ''),
      proposto: r => ({ v: String(r.parente ? 2 : 1), origem: 'rede' }),
      escrever: (r, v) => { const n = Number(v); if (n >= 1 && n <= 4) { r.nivelNumero = n; r.nivel = NIV[n]; } },
      ajuda: 'O nível dá a velocidade máxima do ramal (principal mais rápido, terminais mais lentos, por causa do ruído).' }
  ]);
}

const hmax = campo('ramal', 'H_max');
if (hmax) {
  const prB = hmax.proposto;
  hmax.proposto = r => { const o = prB(r), p = r.planta && (VC.dados.plantas || []).find(x => x.id === r.planta.pisoId); return o && o.origem === 'setup' && p && Number(p.hTeto) > 0 ? { v: Number(p.hTeto), origem: 'piso', nota: 'teto falso de ' + p.nome } : o; };
}

/* ── terminal: montagem ── */
if (esq('terminal')) {
  esq('terminal').campos.push({ id: 'montagem', rot: 'Montagem', tipo: 'opcoes',
    opcoes: () => [['', '—'], ['teto', 'teto / teto falso'], ['parede', 'parede'], ['pavimento', 'pavimento'], ['conduta', 'na conduta (à vista)']],
    ler: t => t.montagem || '',
    proposto: t => { const s = norm(t.tipo); return /grelha|linear|tomada/.test(s) ? { v: 'parede', origem: 'nome' } : /difus|valvula|plafon/.test(s) ? { v: 'teto', origem: 'nome' } : null; },
    escrever: (t, v) => { if (vazio(v)) delete t.montagem; else t.montagem = v; },
    ajuda: 'Onde o terminal fica preso; sai no Excel dos terminais.' });
}
})();
