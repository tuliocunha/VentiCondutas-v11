/* ============================================================
   VentiCondutas · Planta: painel único (Fase 0 do plano de desenho)
   ------------------------------------------------------------
   Um só painel ao lado do desenho para Piso, Sala, Ramal, Terminal e
   Transferência, com a mesma estrutura:
     Cabeçalho · Essencial · Avançado · Resultado · Por fazer · Ações
   · Esquema declarativo por tipo de objeto (VC.paineis.esquemas): cada
     campo diz o rótulo, a unidade, se é essencial, quando aparece, como
     se lê e escreve e, quando a app o sabe estimar, o valor proposto e
     de onde vem (norma, piso, herdado do ramal-pai, Setup, rede).
   · Toda a alteração passa por VC.paineis.definir: entra no desfazer da
     planta (Ctrl+Z), recalcula e redesenha. O painel escreve nos mesmos
     campos das tabelas: não há cópias.
   · Regras de ergonomia E9–E16 do plano (uma ação, um painel; primeiro o
     essencial; valores propostos com origem; herança; erros prevenidos no
     campo; resultado sempre à vista; sem becos; linguagem do projetista).
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('29-planta-painel');
const P = VC.planta;
if (!P || !P._painel || !P._estado || !P._empilhar) return;
const esc = s => VC.utils.esc(s);
const fmt = (n, d) => VC.utils.fmt(Number(n), d == null ? 0 : d);
const vazio = v => v === undefined || v === null || String(v).trim() === '';
const porId = (lista, id) => (VC.dados[lista] || []).find(x => String(x.id) === String(id));
const C = () => VC.constantes;

/* ── seleção de terminal (novo na Fase 0) ──
   Só há um objeto selecionado de cada vez: escolher uma sala, um ramal ou uma transferência (em qualquer
   módulo da planta) larga o terminal selecionado. */
P.termSel = null;
const selV = { selecionado: P.selecionado, ramalSel: P.ramalSel, trfSel: P.trfSel };
Object.keys(selV).forEach(k => {
  Object.defineProperty(P, k, { configurable: true, enumerable: true, get() { return selV[k]; },
    set(x) { selV[k] = x; if (x != null) { this.termSel = null; Object.keys(selV).forEach(o => { if (o !== k) selV[o] = null; }); } } });
});
P.selecionarTerminal = function (id) {
  this.termSel = id; this.selecionado = null; this.ramalSel = null; this.trfSel = null;
  this.pendente = null; this.pendenteRamal = null; this.pendenteTrf = null; this.pendenteTerm = null;
  this.redesenhar();
};
['selecionar', 'selecionarRamal', 'cancelar', 'setPiso', 'limparSelecao'].forEach(nome => {
  const base = P[nome]; if (typeof base !== 'function') return;
  P[nome] = function () { this.termSel = null; return base.apply(this, arguments); };
});
// Esc larga o terminal; Delete retira-o da planta (os dados do terminal ficam na tabela)
const temSelBase = P.temSelecao;
if (temSelBase) P.temSelecao = function () { return this.termSel != null || temSelBase.call(this); };
const apagarBase = P.gestoApagar;
if (apagarBase) P.gestoApagar = function () {
  if (this.termSel != null && !this.pendenteAtual() && !(this.rascunho || []).length && !(this.tracado || []).length) { VC.paineis.retirarTerminal(this.termSel); return 'terminal'; }
  return apagarBase.apply(this, arguments);
};
const reporBase = P._repor;
P._repor = function () { this.termSel = null; return reporBase.apply(this, arguments); };
const svgBase = P._svg;
P._svg = function (p) {
  const s = svgBase.call(this, p);
  const t = this.termSel != null && porId('terminais', this.termSel);
  if (!t || !t.planta || t.planta.pisoId !== p.id) return s;
  const z = this.zoom || 1;
  const anel = '<circle class="planta-term-sel" cx="' + t.planta.x + '" cy="' + t.planta.y + '" r="' + 15 / z + '" fill="none" stroke="#f2c94c" stroke-width="4" vector-effect="non-scaling-stroke" pointer-events="none"/>';
  return s.replace(/<\/svg>$/, anel + '</svg>');
};

/* ── propostas (E11) ── */
const origemRotulo = { nome: 'pelo nome', norma: 'norma', piso: 'piso', herdado: 'herdado', setup: 'Setup', rede: 'rede', balanco: 'balanço', medido: 'desenho' };
function herdadoDe(r, campo) {   // o ramal que define o campo (ele ou um antecessor) e se é herdado
  const o = VC.calculo.origemPropria ? VC.calculo.origemPropria(r, campo) : null;
  return o ? { ramal: o, herdado: o !== r } : null;
}
const TIPOS_TERMINAL = {
  insuflacao: ['Difusor', 'Grelha Insuflação', 'Difusor Linear', 'Jato de Ar'],
  extracao: ['Grelha Extração', 'Válvula', 'Boca de Extração'],
  extracao_suja: ['Válvula', 'Grelha Extração', 'Boca de Extração']
};
const TIPO_TERMINAL_OMISSAO = { insuflacao: 'Difusor', extracao: 'Grelha Extração', extracao_suja: 'Válvula' };

/* ── esquemas ──
   campo: { id, rot, un, tipo: 'texto'|'num'|'opcoes'|'sim', ess, vis(o), opcoes(o) → [[v, l]], ler(o), escrever(o, v)
            ou acao(o, v) (usa um método da planta que já trata o desfazer), proposto(o, p) → { v, origem, nota },
            min, passo, ajuda } */
const sala = {
  titulo: e => e.nome, icone: 'fa-vector-square', rotulo: 'Sala',
  avisos: e => [e.nome].concat((P.terminaisDe ? P.terminaisDe(e) : []).map(t => t.nome || String(t.id))),
  campos: [
    { id: 'nome', rot: 'Nome', tipo: 'texto', ess: true, ler: e => e.nome, acao: (e, v) => P.renomearEspacoPlanta(e.id, v) },
    { id: 'tipo', rot: 'Tipo', tipo: 'opcoes', ess: true, ler: e => e.tipo,
      opcoes: () => Object.keys(VC.tiposEspaco || {}).sort((a, b) => a.localeCompare(b, 'pt')).map(t => [t, t]),
      escrever: (e, v) => { e.tipo = v; }, ajuda: 'Define o grupo G1–G4 e a norma do caudal.' },
    { id: 'H', rot: 'Pé-direito', un: 'm', tipo: 'num', ess: true, min: 0, passo: 0.05, ler: e => e.H,
      proposto: (e, p) => (p && Number(p.H) > 0 ? { v: Number(p.H), origem: 'piso' } : null),
      escrever: (e, v) => { if (vazio(v)) delete e.H; else e.H = VC.utils.num(v); if (e.geometriaMetodo !== 'V') { e.V = (Number(e.A) || 0) * (Number(e.H) || 0); e.geometriaMetodo = 'AH'; } } },
    { id: 'N', rot: 'Ocupação', un: 'pessoas', tipo: 'num', ess: true, min: 0, passo: 1, vis: e => Number(e.grupoForcado || VC.calculo.grupoDe(e)) === 1,
      ler: e => (VC.calculo.nVazio && VC.calculo.nVazio(e) ? '' : e.N), acao: (e, v) => P.definirN(e.id, v), ajuda: 'Conta na Tabela 11 (por ocupante).' },
    { id: 'regimeSanitario', rot: 'Regime (Tabela 13)', tipo: 'opcoes', ess: true, vis: e => /^(Sanitários|Balneários)$/.test(e.tipo),
      opcoes: () => [['', '— por definir —']].concat(Object.keys(VC.conhecimento.tabelas.T13.sanitarios).map(k => [k, VC.conhecimento.tabelas.T13.sanitarios[k].nome || k.replace(/_/g, ' ')])),
      ler: e => e.regimeSanitario || '', acao: (e, v) => P.definirSanitaria(e.id, 'regimeSanitario', v) },
    { id: 'numSanitas', rot: 'Sanitas', tipo: 'num', ess: true, min: 0, passo: 1, vis: e => /^(Sanitários|Balneários)$/.test(e.tipo), ler: e => e.numSanitas, acao: (e, v) => P.definirSanitaria(e.id, 'numSanitas', v) },
    { id: 'numUrinois', rot: 'Urinóis', tipo: 'num', ess: true, min: 0, passo: 1, vis: e => /^(Sanitários|Balneários)$/.test(e.tipo), ler: e => e.numUrinois, acao: (e, v) => P.definirSanitaria(e.id, 'numUrinois', v) },
    { id: 'numDuches', rot: 'Duches', tipo: 'num', ess: true, min: 0, passo: 1, vis: e => /^(Sanitários|Balneários)$/.test(e.tipo), ler: e => e.numDuches, acao: (e, v) => P.definirSanitaria(e.id, 'numDuches', v) },
    { id: 'lugares', rot: 'Lugares de estacionamento', tipo: 'num', ess: true, min: 0, passo: 1, vis: e => e.tipo === 'Garagem', ler: e => (Number(e.lugares) > 0 ? e.lugares : ''), acao: (e, v) => P.definirLugares(e.id, v),
      ajuda: 'Com 200 m² ou mais: parque (UT II), 300/600 m³/h por veículo. Abaixo: boa prática.' },
    { id: 'pressurizada', rot: 'Escada pressurizada', tipo: 'sim', ess: true, vis: e => e.tipo === 'Escadas', ler: e => !!e.pressurizada, acao: (e, v) => P.definirEscada(e.id, 'pressurizada', v) },
    { id: 'deltaP', rot: 'ΔP com as portas fechadas', un: 'Pa', tipo: 'num', ess: true, min: 0, passo: 1, vis: e => e.tipo === 'Escadas' && e.pressurizada, ler: e => e.deltaP, acao: (e, v) => P.definirEscada(e.id, 'deltaP', v), ajuda: 'RT-SCIE, art. 161.º: 20 a 80 Pa.' },
    { id: 'vPortaAberta', rot: 'Velocidade na porta aberta', un: 'm/s', tipo: 'num', vis: e => e.tipo === 'Escadas' && e.pressurizada, min: 0, passo: 0.1, ler: e => e.vPortaAberta, acao: (e, v) => P.definirEscada(e.id, 'vPortaAberta', v) },
    { id: 'forcaPorta', rot: 'Força de abertura da porta', un: 'N', tipo: 'num', vis: e => e.tipo === 'Escadas' && e.pressurizada, min: 0, passo: 1, ler: e => e.forcaPorta, acao: (e, v) => P.definirEscada(e.id, 'forcaPorta', v) },
    { id: 'camaraCortaFogo', rot: 'Com câmara corta-fogo', tipo: 'sim', vis: e => e.tipo === 'Escadas' && e.pressurizada, ler: e => !!e.camaraCortaFogo, acao: (e, v) => P.definirEscada(e.id, 'camaraCortaFogo', v) },
    { id: 'A', rot: 'Área na tabela', un: 'm²', tipo: 'num', min: 0, passo: 0.01, ler: e => e.A,
      proposto: (e, p) => { const a = e.planta && p && p.escala ? P.areaM2(e.planta.pts, p) : null; return a ? { v: Math.round(a * 100) / 100, origem: 'medido' } : null; },
      escrever: (e, v) => { e.A = VC.utils.num(v); if (e.geometriaMetodo !== 'V') { e.V = (Number(e.A) || 0) * (Number(e.H) || 0); e.geometriaMetodo = 'AH'; } },
      ajuda: 'É a área da tabela que entra no caudal da norma (T12 × A, 10 × A…).' },
    { id: 'grupoForcado', rot: 'Grupo', tipo: 'opcoes', ler: e => e.grupoForcado || '',
      opcoes: () => [['', 'automático (pelo tipo)'], ['1', 'G1 · ocupação'], ['2', 'G2 · transferência'], ['3', 'G3 · baixa emissão'], ['4', 'G4 · extração dedicada']],
      escrever: (e, v) => { if (vazio(v)) delete e.grupoForcado; else e.grupoForcado = Number(v); } },
    { id: 'QAI_projeto', rot: 'Caudal QAI de projeto', un: 'm³/h', tipo: 'num', min: 0, passo: 1, ler: e => (Number(e.QAI_projeto) > 0 ? e.QAI_projeto : ''),
      escrever: (e, v) => { e.QAI_projeto = VC.utils.num(v); e.QAI_projeto_origem = 'utilizador'; } },
    { id: 'QAI_projeto_rede', rot: 'Rede do caudal QAI', tipo: 'opcoes', vis: e => Number(e.QAI_projeto) > 0, ler: e => e.QAI_projeto_rede || 'auto',
      opcoes: () => [['auto', 'automática (pelo grupo)']].concat(VC.redes.LISTA), escrever: (e, v) => { e.QAI_projeto_rede = v; } },
    { id: 'QAI_projeto_motivo', rot: 'Motivo do caudal QAI', tipo: 'texto', vis: e => Number(e.QAI_projeto) > 0, ler: e => e.QAI_projeto_motivo || '', escrever: (e, v) => { e.QAI_projeto_motivo = String(v); } },
    { id: 'rphAplicado', rot: 'Renovações de conforto', un: 'ren/h', tipo: 'num', min: 0, passo: 0.5, ler: e => e.rphAplicado,
      proposto: e => (e.rphDefault != null ? { v: Number(e.rphDefault), origem: 'norma' } : null),
      escrever: (e, v) => { if (vazio(v)) { e.rphAplicado = e.rphDefault; e.rphOrigem = 'norma'; } else { e.rphAplicado = VC.utils.num(v); e.rphOrigem = 'utilizador'; } } },
    { id: 'Q_exterior', rot: 'Abertura para o exterior', un: 'm³/h', tipo: 'num', passo: 10, ler: e => (Number(e.Q_exterior) ? e.Q_exterior : ''),
      escrever: (e, v) => { const q = vazio(v) ? 0 : VC.utils.num(v); if (q) e.Q_exterior = q; else delete e.Q_exterior; },
      ajuda: '+ entra, − sai, por uma grelha permanente na fachada ou na porta.' },
    { id: 'zona', rot: 'Zona', tipo: 'texto', ler: e => e.zona || '', escrever: (e, v) => { e.zona = String(v); e.localizacao = VC.utils.parseZona ? VC.utils.parseZona(v) : e.localizacao; } }
  ],
  resultado: (e, p) => {
    const c = VC.calculo.calcularQEspaco(e), A = e.planta && p && p.escala ? P.areaM2(e.planta.pts, p) : null, b = P._balancoSala ? P._balancoSala(e) : null;
    const T = P.terminaisDe ? P.terminaisDe(e) : [];
    return [
      ['Área medida / tabela', (A ? fmt(A, 2) : '—') + ' / ' + fmt(e.A, 2) + ' m²'],
      ['Grupo', 'G' + (e.grupoForcado || c.g || '?')],
      ['Caudal mínimo', fmt(c.Q_normas, 0) + ' m³/h', c.metodoCaudal],
      ['Caudal da sala', fmt(c.Q_total, 0) + ' m³/h'],
      b ? ['Balanço (entra / sai)', fmt(b.ent, 0) + ' / ' + fmt(b.sai, 0) + ' m³/h', Math.abs(b.res) <= 5 ? 'equilibrada' : (b.res > 0 ? 'sobra ' : 'falta ') + fmt(Math.abs(b.res), 0) + ' m³/h'] : null,
      ['Terminais', T.length ? T.map(t => (t.rede === 'insuflacao' ? 'I' : 'E') + ' ' + fmt(t.Q, 0)).join(' · ') + ' m³/h' : 'nenhum']
    ].filter(Boolean);
  },
  porFazer: e => (P._falta ? P._falta(e) : []),
  acoes: (e, p) => {
    const A = e.planta && p && p.escala ? P.areaM2(e.planta.pts, p) : null, At = Number(e.A) || 0;
    const T = P.terminaisDe ? P.terminaisDe(e) : [], fora = T.filter(t => !(t.planta && t.planta.pisoId === (p && p.id)));
    const a = [];
    if (A && Math.abs(A - At) > Math.max(0.05, At * 0.01)) a.push(['Usar a área medida', 'VC.planta.usarAreaMedida(' + e.id + ')', true]);
    if (A && P.aceitarDiferencaArea && At > 0 && Math.abs(A - At) / At > 0.15 && !(e.planta.areaAceite != null && Math.abs(e.planta.areaAceite - At) < 1e-6)) a.push(['Aceitar a diferença', 'VC.planta.aceitarDiferencaArea(' + e.id + ')']);
    if (T.length && fora.length) a.push(['Colocar os terminais na sala', 'VC.planta.redistribuir(' + e.id + ')', true]);
    a.push(['Novo terminal (D)', "VC.planta.setFerramenta('term')"]);
    a.push(['Ver na tabela', 'VC.planta.verNaTabela(' + e.id + ')']);
    a.push(['Calibrar a escala por esta área', 'VC.planta.calibrarSelecionadaPorArea(' + e.id + ', ' + (At || 0) + ')']);
    a.push(['Apagar o desenho', 'VC.planta.apagarDesenho(' + e.id + ')', false, true]);
    return a;
  }
};

/* equipamento de onde sai o ramal (o do ramal principal, subindo pelos ramais-pai) */
function utaDoRamal(r) {
  const R = VC.dados.ramais || []; let x = r, g = 0;
  while (x && x.parente && g++ < 60) { const pai = R.find(y => y.nome === x.parente && y !== x); if (!pai) break; x = pai; }
  return x && x.utaRef ? porId('utas', x.utaRef) : null;
}
const rotuloUta = u => (u ? u.nome + ((VC.uta.tipoSistemaDe(u) && !new RegExp('^' + VC.uta.tipoSistemaDe(u).codigo, 'i').test(u.nome)) ? ' (' + VC.uta.tipoSistemaDe(u).codigo + ')' : '') : '—');
const ramal = {
  titulo: r => 'Ramal ' + r.nome, icone: 'fa-route', rotulo: 'Ramal',
  avisos: r => [r.nome],
  campos: [
    { id: 'nome', rot: 'Nome', tipo: 'texto', ess: true, ler: r => r.nome, acao: (r, v) => P.renomearRamalPlanta(r.id, v) },
    { id: 'material', rot: 'Material da conduta', tipo: 'opcoes', ess: true,
      opcoes: r => { const h = herdadoDe(r, 'rugosidade'), base = h && h.herdado ? 'herdado de ' + h.ramal.nome + ' · ' + (h.ramal.geometriaInput.material || 'próprio') : 'como no Setup · ' + String(VC.utils.num(VC.dados.params.rugosidade) || 0.15).replace('.', ',') + ' mm';
        return [['', base]].concat(C().MATERIAIS_CONDUTA.map(m => [m.nome, m.nome + ' · ' + String(m.rugosidade).replace('.', ',') + ' mm'])); },
      ler: r => (r.geometriaInput && r.geometriaInput.proprio && r.geometriaInput.proprio.rugosidade ? r.geometriaInput.material : ''),
      proposto: r => { const h = herdadoDe(r, 'rugosidade'); return h && h.herdado ? { v: '', origem: 'herdado', nota: 'de ' + h.ramal.nome } : { v: '', origem: 'setup' }; },
      escrever: (r, v) => {
        const g = r.geometriaInput = r.geometriaInput || {}; g.proprio = g.proprio || {};
        const m = C().MATERIAIS_CONDUTA.find(x => x.nome === v);
        if (!m) { delete g.proprio.rugosidade; delete g.material; return; }
        g.material = m.nome; g.rugosidade = m.rugosidade; g.proprio.rugosidade = true;
      }, ajuda: 'Os sub-ramais desenhados a partir deste herdam o material.' },
    { id: 'utaRef', rot: 'Equipamento', tipo: 'opcoes', ess: true, vis: r => !r.parente,
      opcoes: r => [['', '— sem equipamento —']].concat((VC.dados.utas || []).filter(u => VC.redes.compativeis(u.rede, r.rede) || u.id === r.utaRef).map(u => [u.id, rotuloUta(u)])),
      ler: r => r.utaRef || '', escrever: (r, v) => { r.utaRef = v || ''; }, ajuda: 'Os sub-ramais saem do mesmo equipamento.' },
    { id: 'tipoSistema', rot: 'Tipo de sistema', tipo: 'opcoes', ess: true, vis: r => !r.parente && !!(r.utaRef && porId('utas', r.utaRef)),
      opcoes: r => { const u = porId('utas', r.utaRef); return [['', '— por definir —']].concat(C().TIPOS_SISTEMA.filter(t => u && t.redes.indexOf(u.rede) >= 0).map(t => [t.codigo, t.nome])); },
      ler: r => { const u = porId('utas', r.utaRef); return (u && u.tipoSistema) || ''; },
      proposto: r => { const u = porId('utas', r.utaRef), t = u && !u.tipoSistema ? VC.uta.tipoSistemaDe(u) : null; return t ? { v: t.codigo, origem: 'nome' } : null; },
      escrever: (r, v) => { const u = porId('utas', r.utaRef); if (u && !VC.uta.definirTipoSistema(u, v)) VC.ui.toast('Esse tipo não serve a rede de ' + VC.redes.rotulo(u.rede) + '.'); },
      ajuda: 'Muda o equipamento; com a VMC, o tipo Ecodesign passa a UVB com recuperador.' },
    { id: 'forma', rot: 'Forma da secção', tipo: 'opcoes', ess: true, opcoes: () => [['circular', 'Circular'], ['retangular', 'Retangular']],
      ler: r => VC.calculo.formaDe(r), escrever: (r, v) => { (r.geometriaInput = r.geometriaInput || {}).forma = v === 'retangular' ? 'retangular' : 'circular'; } },
    { id: 'rugosidade', rot: 'Rugosidade própria', un: 'mm', tipo: 'num', min: 0, passo: 0.01,
      ler: r => (r.geometriaInput && r.geometriaInput.proprio && r.geometriaInput.proprio.rugosidade ? r.geometriaInput.rugosidade : ''),
      proposto: r => ({ v: VC.calculo.rugosidadeDe(r), origem: herdadoDe(r, 'rugosidade') ? 'herdado' : 'setup' }),
      escrever: (r, v) => { const g = r.geometriaInput = r.geometriaInput || {}; g.proprio = g.proprio || {}; if (vazio(v) || !(VC.utils.num(v) > 0)) { delete g.proprio.rugosidade; return; } g.rugosidade = VC.utils.num(v); g.proprio.rugosidade = true; g.material = g.material || 'Outro'; } },
    { id: 'H_max', rot: 'Altura disponível no teto', un: 'mm', tipo: 'num', min: 0, passo: 10,
      ler: r => (r.geometriaInput && r.geometriaInput.proprio && r.geometriaInput.proprio.H_max ? r.geometriaInput.H_max : ''),
      proposto: r => ({ v: VC.calculo.hMaxDe(r), origem: herdadoDe(r, 'H_max') ? 'herdado' : 'setup' }),
      escrever: (r, v) => { const g = r.geometriaInput = r.geometriaInput || {}; g.proprio = g.proprio || {}; if (vazio(v) || !(VC.utils.num(v) > 0)) { delete g.proprio.H_max; return; } g.H_max = VC.utils.num(v); g.proprio.H_max = true; } },
    { id: 'zeta', rot: 'Perdas localizadas ζ', tipo: 'num', min: 0, passo: 0.05, ler: r => r.zeta,
      proposto: (r, p) => (r.planta && P.zetaSugerido ? { v: P.zetaSugerido(r.planta.pts), origem: 'medido', nota: 'curvas do traçado' } : null),
      escrever: (r, v) => { r.zeta = Math.max(0, VC.utils.num(v)); } },
    { id: 'L', rot: 'Comprimento na tabela', un: 'm', tipo: 'num', min: 0, passo: 0.1, ler: r => r.L,
      proposto: (r, p) => { const L = r.planta && p ? P.comprimentoM(r.planta.pts, p) : null; return L ? { v: Math.round(L * 100) / 100, origem: 'medido' } : null; },
      escrever: (r, v) => { r.L = Math.max(0, VC.utils.num(v)); } },
    { id: 'Dfixo', rot: 'Ø fixo (todo o ramal)', un: 'mm', tipo: 'num', min: 0, passo: 5, ler: r => (r.lock && r.lock.D ? r.Dcom : ''),
      escrever: (r, v) => { if (vazio(v) || !(VC.utils.num(v) > 0)) { r.lock = Object.assign({}, r.lock, { D: false }); return; } r.lock = Object.assign({}, r.lock, { D: true }); r.Dcom = VC.utils.num(v); },
      ajuda: 'Vazio: a app escolhe o Ø troço a troço.' }
  ],
  resultado: (r, p) => {
    const u = r.utaRef && porId('utas', r.utaRef), L = r.planta && p ? P.comprimentoM(r.planta.pts, p) : null;
    const tr = Array.isArray(r.trocos) && r.trocos.length ? r.trocos.map(t => t.secao || ('Ø' + t.Dcom)).filter((s, i, a) => i === 0 || s !== a[i - 1]).join(' → ') : (r.secaoCalc || '—');
    return [
      ['Rede', VC.redes.rotulo(r.rede)],
      ['Sai de', r.parente ? r.parente + (r.sNoPai != null ? ' a ' + fmt(r.sNoPai, 1) + ' m' : '') : rotuloUta(u)],
      r.parente ? ['Equipamento', rotuloUta(utaDoRamal(r))] : null,
      ['Caudal', fmt(r.Q, 0) + ' m³/h'],
      ['Secção (troços)', tr],
      ['Velocidade máxima', fmt(Math.max(Number(r.v) || 0, Number(r.vMaxTrocos) || 0), 2) + ' m/s', 'limite ' + fmt(VC.calculo.vMaxDe(r), 1) + ' m/s'],
      ['Δp do ramal / acumulado', fmt(r.deltaPTroco, 1) + ' / ' + fmt(r.deltaPAcumulado, 1) + ' Pa'],
      ['L tabela / medido', fmt(r.L, 2) + ' / ' + (L ? fmt(L, 2) : '—') + ' m']
    ].filter(Boolean);
  },
  porFazer: r => (r.parente || r.utaRef ? [] : ['ligar a um ramal-pai ou a uma UTA']),
  acoes: (r, p) => {
    const L = r.planta && p ? P.comprimentoM(r.planta.pts, p) : null, a = [];
    if (L && Math.abs(L - (Number(r.L) || 0)) > Math.max(0.05, (Number(r.L) || 0) * 0.02)) a.push(['Usar o L medido', 'VC.planta.usarLMedido(' + r.id + ')', true]);
    a.push(['Desenhar um sub-ramal (L)', "VC.planta.setFerramenta('ramal')"]);
    a.push(['Ver na tabela', "VC.nav && VC.nav.setVista ? VC.nav.setVista('passo') : null"]);
    a.push(['Apagar o traçado', 'VC.planta.apagarTracado(' + r.id + ')', false, true]);
    return a;
  }
};

/* caudal de um terminal: a parcela da sala e a definição de onde vem passam a somar o novo valor */
function escreverQTerminal(t, v) {
  const q = Math.max(0, VC.utils.num(v));
  if (!t.espacos || !t.espacos.length) { t.Q = q; return; }
  const k = q / (Number(t.Q) || t.espacos.reduce((s, x) => s + (Number(x.Q_parcela) || 0), 0) || 1);
  if (t.espacos.length === 1) t.espacos[0].Q_parcela = q; else t.espacos.forEach(x => { x.Q_parcela = Math.round((Number(x.Q_parcela) || 0) * k * 10) / 10; });
  t.Q = q;
  const ref = t.definicaoRef, e = ref && porId('espacos', ref.espacoId), d = e && (e.definicoes || []).find(x => x.id === ref.definicaoId);
  if (d) {
    const irmaos = (VC.dados.terminais || []).filter(x => x.definicaoRef && x.definicaoRef.espacoId === e.id && x.definicaoRef.definicaoId === d.id);
    d.Q_total = Math.round(irmaos.reduce((s, x) => s + (x === t ? q : (Number(x.Q) || (x.espacos || []).reduce((a, y) => a + (Number(y.Q_parcela) || 0), 0))), 0) * 10) / 10;
  }
}
const terminal = {
  titulo: t => 'Terminal ' + (t.nome || t.id), icone: 'fa-circle-dot', rotulo: 'Terminal',
  avisos: t => [t.nome || String(t.id)],
  campos: [
    { id: 'tipo', rot: 'Tipo', tipo: 'opcoes', ess: true, opcoes: t => (TIPOS_TERMINAL[t.rede] || TIPOS_TERMINAL.insuflacao).map(x => [x, x]),
      ler: t => t.tipo, proposto: t => ({ v: TIPO_TERMINAL_OMISSAO[t.rede] || 'Difusor', origem: 'rede' }), escrever: (t, v) => { t.tipo = v; } },
    { id: 'Q', rot: 'Caudal', un: 'm³/h', tipo: 'num', ess: true, min: 0, passo: 5, ler: t => t.Q, escrever: escreverQTerminal,
      ajuda: 'Altera também o caudal da definição da sala de onde o terminal vem.' },
    { id: 'ramalRef', rot: 'Ligado ao ramal', tipo: 'opcoes', ess: true,
      opcoes: t => [['', '— sem ramal —']].concat((VC.dados.ramais || []).filter(r => VC.redes.compativeis(r.rede, t.rede)).map(r => [r.nome, r.nome + (r.planta ? '' : ' (sem traçado)')])),
      ler: t => t.ramalRef || '', escrever: (t, v) => { t.ramalRef = v || ''; if (!v) delete t.sRamal; } },
    { id: 'fabricante', rot: 'Fabricante', tipo: 'texto', ler: t => t.fabricante || '', escrever: (t, v) => { t.fabricante = String(v); } },
    { id: 'familia', rot: 'Família / modelo', tipo: 'texto', ler: t => t.familia || '', escrever: (t, v) => { t.familia = String(v); } },
    { id: 'tamanho', rot: 'Tamanho', tipo: 'texto', ler: t => t.tamanho || '', escrever: (t, v) => { t.tamanho = String(v); } },
    { id: 'v_saida', rot: 'Velocidade de saída', un: 'm/s', tipo: 'num', min: 0, passo: 0.1, ler: t => t.v_saida,
      proposto: () => ({ v: 2, origem: 'norma', nota: 'referência' }), escrever: (t, v) => { t.v_saida = VC.utils.num(v); } }
  ],
  resultado: t => [
    ['Rede', VC.redes.rotulo(t.rede)],
    ['Sala', (t.espacos || []).map(x => x.nome).join(', ') || '—'],
    ['Posição no ramal', t.ramalRef ? t.ramalRef + (t.sRamal != null ? ' a ' + fmt(t.sRamal, 1) + ' m' : '') : 'sem ramal'],
    ['Δp do terminal', fmt(t.dPCalc, 1) + ' Pa'],
    ['Potência sonora', t.LwCalc ? fmt(t.LwCalc, 0) + ' dB(A)' : '—']
  ],
  porFazer: t => (t.ramalRef ? [] : ['ligar a um ramal (arraste o terminal para cima do traçado)']),
  acoes: t => {
    const e = (t.espacos || []).map(x => (VC.dados.espacos || []).find(s => s.nome === x.nome)).find(Boolean);
    return [e ? ['Ver a sala', 'VC.planta.selecionar(' + e.id + ')'] : null, ['Retirar da planta', 'VC.paineis.retirarTerminal(\'' + esc(t.id) + '\')', false, true]].filter(Boolean);
  }
};

const transferencia = {
  titulo: t => 'Transferência', icone: 'fa-right-left', rotulo: 'Transferência',
  avisos: t => [t.deNome + ' → ' + t.paraNome],
  campos: [
    { id: 'Q', rot: 'Caudal', un: 'm³/h', tipo: 'num', ess: true, min: 0, passo: 5, ler: t => t.Q,
      proposto: t => { const Q = P._sugerirQ ? P._sugerirQ(t.deId, t.paraId) : 0; return Q ? { v: Q, origem: 'balanco' } : null; },
      escrever: (t, v) => { t.Q = Math.max(0, VC.utils.num(v)); } },
    { id: 'tipo', rot: 'Tipo de passagem', tipo: 'opcoes', ess: true,
      opcoes: () => (VC6.transferencias && VC6.transferencias.CATALOGO || []).map(c => [c.codigo, c.nome]),
      ler: t => t.tipo, escrever: (t, v) => { t.tipo = v; const c = (VC6.transferencias.CATALOGO || []).find(x => x.codigo === v); if (c && c.dp_tipico) t.dP_Pa = c.dp_tipico; } },
    { id: 'dP_Pa', rot: 'ΔP admissível', un: 'Pa', tipo: 'num', ess: true, min: 0.5, passo: 0.5, ler: t => t.dP_Pa,
      proposto: t => { const c = (VC6.transferencias && VC6.transferencias.CATALOGO || []).find(x => x.codigo === t.tipo); return c ? { v: c.dp_tipico, origem: 'norma', nota: 'típico do tipo' } : null; },
      escrever: (t, v) => { t.dP_Pa = Math.max(0.5, VC.utils.num(v)); } }
  ],
  resultado: t => {
    const de = porId('espacos', t.deId), para = porId('espacos', t.paraId), b1 = de && P._balancoSala ? P._balancoSala(de) : null, b2 = para && P._balancoSala ? P._balancoSala(para) : null;
    const est = b => (!b ? '—' : (Math.abs(b.res) <= 5 ? 'equilibrada' : (b.res > 0 ? 'sobra ' : 'falta ') + fmt(Math.abs(b.res), 0) + ' m³/h'));
    return [['De → para', t.deNome + ' → ' + t.paraNome], ['Área da passagem', fmt(t.area_cm2, 0) + ' cm²'], ['Balanço da origem', est(b1)], ['Balanço do destino', est(b2)]];
  },
  porFazer: () => [],
  acoes: t => {
    const de = porId('espacos', t.deId), b1 = de && P._balancoSala ? P._balancoSala(de) : null, a = [];
    if (!t.compensacao && b1 && b1.res < -5 && P.compensarTransferencia) a.push(['Compensar na origem', 'VC.planta.compensarTransferencia(\'' + esc(t.id) + '\')', true]);
    a.push(['Remover', 'VC.planta.removerTransferencia(\'' + esc(t.id) + '\')', false, true]);
    return a;
  }
};

const piso = {
  titulo: p => p.nome, icone: 'fa-layer-group', rotulo: 'Piso',
  avisos: () => [],
  campos: [
    { id: 'nome', rot: 'Nome do piso', tipo: 'texto', ess: true, ler: p => p.nome, escrever: (p, v) => { if (String(v).trim()) p.nome = String(v).trim(); } },
    { id: 'H', rot: 'Pé-direito por omissão', un: 'm', tipo: 'num', ess: true, min: 0, passo: 0.05, ler: p => p.H, escrever: (p, v) => { if (vazio(v)) delete p.H; else p.H = VC.utils.num(v); },
      ajuda: 'Proposto às salas deste piso que não têm pé-direito.' },
    { id: 'cota', rot: 'Cota do pavimento', un: 'm', tipo: 'num', passo: 0.05, ler: p => p.cota, escrever: (p, v) => { if (vazio(v)) delete p.cota; else p.cota = VC.utils.num(v); } }
  ],
  resultado: p => {
    const S = P.espacosDoPiso(p), R = P.ramaisDoPiso ? P.ramaisDoPiso(p) : [], T = (VC.dados.terminais || []).filter(t => t.planta && t.planta.pisoId === p.id);
    return [['Escala', p.escala ? '1 m = ' + fmt(1 / p.escala, 1) + ' px' : 'por calibrar'], ['Salas desenhadas', S.length + ' de ' + (VC.dados.espacos || []).length], ['Ramais desenhados', R.length + ' de ' + (VC.dados.ramais || []).length], ['Terminais colocados', String(T.length)]];
  },
  porFazer: p => (p.escala ? [] : ['calibrar a escala (S, ou pela área de uma sala)']),
  acoes: () => [['Calibrar a escala (S)', "VC.planta.setFerramenta('escala')"], ['Desenhar uma sala (R)', "VC.planta.setFerramenta('ret')"], ['Desenhar um ramal (L)', "VC.planta.setFerramenta('ramal')"]]
};

/* ── motor ── */
VC.paineis = {
  esquemas: { sala, ramal, terminal, transferencia, piso },
  abertos: {},   // «Avançado» aberto por tipo (fica como o utilizador o deixou)
  _obter(tipo, id) {
    if (tipo === 'sala') return porId('espacos', id);
    if (tipo === 'ramal') return porId('ramais', id);
    if (tipo === 'terminal') return porId('terminais', id);
    if (tipo === 'transferencia') return porId('transferencias', id);
    if (tipo === 'piso') return (VC.dados.plantas || []).find(p => String(p.id) === String(id));
    return null;
  },
  _visivel(c, o) { return !c.vis || !!c.vis(o); },
  /* valor a mostrar, valor proposto e a etiqueta de origem */
  estadoCampo(c, o, p) {
    const val = c.ler ? c.ler(o) : o[c.id];
    const pr = c.proposto ? c.proposto(o, p) : null;
    let origem = null;
    if (pr) {
      if (vazio(val)) origem = { tipo: 'proposto', txt: 'proposto · ' + (origemRotulo[pr.origem] || pr.origem) + (pr.nota ? ' ' + pr.nota : '') };
      else if (String(val) === String(pr.v) || (isFinite(Number(val)) && isFinite(Number(pr.v)) && Math.abs(Number(val) - Number(pr.v)) < 1e-6)) origem = { tipo: 'igual', txt: origemRotulo[pr.origem] || pr.origem };
      else origem = { tipo: 'escrito', txt: 'escrito' };
    }
    return { val, pr, origem };
  },
  _campoHTML(tipo, o, c, p) {
    const id = 'pn-' + tipo + '-' + c.id, { val, pr, origem } = this.estadoCampo(c, o, p);
    const ch = "VC.paineis.definir('" + tipo + "','" + esc(String(o.id)) + "','" + c.id + "',";
    const un = c.un ? ' <small>' + esc(c.un) + '</small>' : '';
    const bad = origem ? '<span class="pn-origem pn-' + origem.tipo + '" title="De onde vem o valor">' + esc(origem.txt) + '</span>' : '';
    const repor = origem && origem.tipo === 'escrito' ? '<button type="button" class="pn-repor" title="Repor o valor proposto (' + esc(String(pr.v)) + ')" onclick="VC.paineis.repor(\'' + tipo + '\',\'' + esc(String(o.id)) + '\',\'' + c.id + '\')">↺</button>' : '';
    let inp;
    if (c.tipo === 'opcoes') {
      const op = c.opcoes(o), atual = vazio(val) && pr ? String(pr.v) : String(val == null ? '' : val);
      const tem = op.some(([v]) => String(v) === atual);
      inp = '<select id="' + id + '" onchange="' + ch + 'this.value)">' + (tem ? '' : '<option value="' + esc(atual) + '" selected>' + esc(atual ? atual.replace(/_/g, ' ') : '— escolher —') + '</option>') + op.map(([v, l]) => '<option value="' + esc(v) + '"' + (String(v) === atual ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '</select>';
    } else if (c.tipo === 'sim') {
      inp = '<input id="' + id + '" type="checkbox"' + (val ? ' checked' : '') + ' onchange="' + ch + 'this.checked)">';
    } else {
      const ph = pr && !vazio(pr.v) ? String(pr.v).replace('.', ',') : (c.tipo === 'num' ? 'por definir' : '');
      inp = '<input id="' + id + '" type="' + (c.tipo === 'num' ? 'number' : 'text') + '"' + (c.min != null ? ' min="' + c.min + '"' : '') + (c.passo ? ' step="' + c.passo + '"' : '') + ' value="' + esc(vazio(val) ? '' : val) + '" placeholder="' + esc(ph) + '" onchange="' + ch + 'this.value)" onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur()}">';
    }
    const cls = c.tipo === 'sim' ? 'pn-campo pn-sim' : 'pn-campo';
    return '<div class="' + cls + '"><label for="' + id + '">' + esc(c.rot) + un + '</label><div class="pn-entrada">' + inp + repor + '</div>' + bad + (c.ajuda ? '<small class="pn-ajuda">' + esc(c.ajuda) + '</small>' : '') + '</div>';
  },
  /* pior severidade entre os avisos dos elementos do objeto (para o cabeçalho) */
  _estado(esq, o) {
    const A = P.avisosPorElemento ? P.avisosPorElemento() : new Map(), L = [];
    (esq.avisos ? esq.avisos(o) : []).forEach(n => (A.get(n) || []).forEach(f => L.push(f)));
    const sev = L.some(f => f.severidade === 'ERRO') ? 'erro' : L.some(f => f.severidade === 'ATENÇÃO') ? 'atencao' : L.some(f => f.severidade === 'POR FAZER') ? 'porfazer' : 'ok';
    return { sev, lista: L };
  },
  render(tipo, o, p) {
    const esq = this.esquemas[tipo]; if (!esq || !o) return '';
    const vis = esq.campos.filter(c => this._visivel(c, o)), ess = vis.filter(c => c.ess), av = vis.filter(c => !c.ess);
    const est = this._estado(esq, o), rot = { ok: 'OK', atencao: 'atenção', erro: 'erro', porfazer: 'por fazer' }[est.sev];
    const falta = (esq.porFazer ? esq.porFazer(o, p) : []).concat(est.lista.map(f => (f.severidade === 'POR FAZER' ? '' : f.severidade.toLowerCase() + ': ') + f.tipo + (f.msg ? ' — ' + f.msg : '')));
    const res = esq.resultado ? esq.resultado(o, p) : [];
    const acoes = esq.acoes ? esq.acoes(o, p) : [];
    let h = '<section class="pn" data-pn="' + tipo + '" aria-label="' + esc(esq.rotulo + ' ' + esq.titulo(o)) + '">';
    h += '<header class="pn-cab"><i class="fa-solid ' + esq.icone + '" aria-hidden="true"></i><div><small>' + esc(esq.rotulo) + '</small><b>' + esc(esq.titulo(o)) + '</b></div><span class="pn-estado pn-' + est.sev + '">' + rot + '</span></header>';
    h += '<div class="pn-sec"><div class="pn-sec-t">Essencial</div>' + ess.map(c => this._campoHTML(tipo, o, c, p)).join('') + '</div>';
    if (av.length) h += '<details class="pn-sec pn-av"' + (this.abertos[tipo] ? ' open' : '') + ' ontoggle="VC.paineis.abertos[\'' + tipo + '\']=this.open"><summary class="pn-sec-t">Avançado <small>(' + av.length + ')</small></summary>' + av.map(c => this._campoHTML(tipo, o, c, p)).join('') + '</details>';
    if (res.length) h += '<div class="pn-sec pn-res" aria-live="polite"><div class="pn-sec-t">Resultado</div><dl>' + res.map(([k, v, n]) => '<dt>' + esc(k) + '</dt><dd>' + esc(v) + (n ? '<small>' + esc(n) + '</small>' : '') + '</dd>').join('') + '</dl></div>';
    if (falta.length) h += '<div class="pn-sec pn-falta"><div class="pn-sec-t">Por fazer e avisos</div><ul>' + falta.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>';
    if (acoes.length) h += '<div class="pn-acoes">' + acoes.map(([l, js, prim, perigo]) => '<button type="button" class="btn' + (prim ? ' primario' : '') + (perigo ? ' coral' : '') + '" onclick="' + esc(js) + '">' + esc(l) + '</button>').join('') + '</div>';
    return h + '</section>';
  },
  /* alteração vinda do painel: desfazer, recálculo e redesenho (E7, E5) */
  definir(tipo, id, campoId, valor) {
    const esq = this.esquemas[tipo], o = this._obter(tipo, id), c = esq && esq.campos.find(x => x.id === campoId);
    if (!o || !c || P._bloqueado()) return false;
    if (c.acao) { c.acao(o, valor); return true; }   // método da planta: já trata desfazer e redesenho
    const antes = P._estado();
    c.escrever(o, valor);
    const nome = tipo === 'piso' ? o.nome : (esq.titulo(o) || '');
    P._empilhar(c.rot.toLowerCase() + ' de «' + nome + '»', antes);
    if (VC.editorEspacos) VC.editorEspacos._cacheOrdenacao = { chave: null, lista: null };
    if (VC.perf) ['cacheFisica', 'cacheMaterializacao', 'ordenacaoTopologica', 'cacheBalanco'].forEach(k => { if (VC.perf[k] && VC.perf[k].invalidar) VC.perf[k].invalidar(); });
    if (VC.historico && VC.historico.push) VC.historico.push(c.rot.toLowerCase() + ' de «' + nome + '» (planta)');
    if (VC.estado && VC.estado.forcarSync) VC.estado.forcarSync();
    P.redesenhar();
    return true;
  },
  repor(tipo, id, campoId) {
    const esq = this.esquemas[tipo], o = this._obter(tipo, id), c = esq && esq.campos.find(x => x.id === campoId);
    if (!o || !c || !c.proposto) return false;
    const pr = c.proposto(o, P.pisoAtual());
    return this.definir(tipo, id, campoId, pr ? pr.v : '');
  },
  retirarTerminal(id) {
    const t = porId('terminais', id); if (!t || P._bloqueado()) return;
    const antes = P._estado(); delete t.planta;
    P._empilhar('terminal «' + (t.nome || t.id) + '» retirado da planta', antes);
    P.termSel = null; P.redesenhar();
  },
  /* objeto selecionado na planta (null se nenhum ou se há um desenho a meio) */
  selecao() {
    if (P.pendente || P.pendenteRamal || P.pendenteTrf || P.pendenteTerm || (P.rascunho || []).length || (P.tracado || []).length) return null;
    if (P.termSel != null) { const t = porId('terminais', P.termSel); if (t) return { tipo: 'terminal', o: t }; }
    if (P.trfSel != null) { const t = porId('transferencias', P.trfSel); if (t) return { tipo: 'transferencia', o: t }; }
    if (P.ramalSel != null) { const r = porId('ramais', P.ramalSel); if (r && r.planta) return { tipo: 'ramal', o: r }; }
    if (P.selecionado != null) { const e = porId('espacos', P.selecionado); if (e && e.planta) return { tipo: 'sala', o: e }; }
    return null;
  }
};

/* ── painel da planta: o painel único substitui os cartões de seleção antigos ── */
const painelBase = P._painel;
P._painel = function (p) {
  const sel = VC.paineis.selecao();
  const desenhoAMeio = P.pendente || P.pendenteRamal || P.pendenteTrf || P.pendenteTerm || (P.rascunho || []).length || (P.tracado || []).length || (P.ferramenta === 'escala' && (P.escalaPts || []).length === 2);
  if (!sel) {
    const h = painelBase.call(this, p);
    return (desenhoAMeio || !p ? '' : VC.paineis.render('piso', p, p)) + h;
  }
  // a base é montada sem a seleção (lista de salas, rodapé, cartões de criação); o painel único vem por cima
  const guard = { selecionado: this.selecionado, ramalSel: this.ramalSel, trfSel: this.trfSel };
  this.selecionado = null; this.ramalSel = null; this.trfSel = null;
  let h;
  try { h = painelBase.call(this, p); } finally { Object.assign(this, guard); }
  if (sel.tipo === 'sala') h = h.replace('class="planta-item" onclick="VC.planta.selecionar(' + sel.o.id + ')"', 'class="planta-item ativo" onclick="VC.planta.selecionar(' + sel.o.id + ')"');   // a sala continua marcada na lista
  return VC.paineis.render(sel.tipo, sel.o, p) + h;
};
})();
