#!/usr/bin/env node
/* ============================================================
   VentiCondutas · testes de mutação (os testes apanham os erros?)
   ------------------------------------------------------------
   Para cada erro corrigido na v11.1, volta a pôr o erro na app
   (só em memória, no navegador sem janela) e confirma que o teste
   interno que o vigia passa a FALHAR, e que volta a PASSAR quando
   o erro é retirado. Se um teste não reage, não protege nada.

   Uso:  npm run mutacoes      (opção --libs <pasta>, como verificar.js)
   Termina com código 1 se algum teste não apanhar o seu erro.
   ============================================================ */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const RAIZ = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const LIBS = args.includes('--libs') ? path.resolve(args[args.indexOf('--libs') + 1]) : null;

/* [erro reintroduzido, teste que o deve apanhar, função que mete o erro e devolve a que o retira] */
const CASOS = [
  ['A1 · caudal da UTA = soma de todos os níveis (triplicado)', 'N6.T1', () => {
    const o = VC.calculo.calcularVentiladores;
    VC.calculo.calcularVentiladores = function () { const r = o.apply(this, arguments); VC.dados.utas.forEach(u => { u.Q = VC.dados.ramais.filter(x => x.utaRef === u.id).reduce((s, x) => s + (Number(x.Q) || 0), 0) / 3600; }); return r; };
    VC.calculo.calcularTudo(); return () => { VC.calculo.calcularVentiladores = o; VC.calculo.calcularTudo(); };
  }],
  ['A2 · balanço do espaço soma insuflação e extração', 'N4.T11', () => {
    const o = VC.calculo.QservidoAoEspaco;
    VC.calculo.QservidoAoEspaco = function (n) { return o.call(this, n, 'insuflacao') + o.call(this, n, 'extracao'); };
    return () => { VC.calculo.QservidoAoEspaco = o; };
  }],
  ['A3 · categoria EN 16798-1 sem efeito', 'N2.T16', () => {
    const o = VC.normas.getDef;
    VC.normas.getDef = function (t) { const p = VC.dados.params, c = p.categoria; p.categoria = 'II'; try { return o.call(this, t); } finally { p.categoria = c; } };
    return () => { VC.normas.getDef = o; };
  }],
  ['A4 · balanços sem nome nem id', 'N3.T18', () => {
    const o = VC6.balanco.todos;
    VC6.balanco.todos = function () { return o.apply(this, arguments).map(b => Object.assign({}, b, { nome: undefined })); };
    return () => { VC6.balanco.todos = o; };
  }],
  ['R1 com menos caudal do que R1.1 (caudal dos filhos não sobe)', 'N4.T19', () => {
    const o = VC.calculo.propagarCaudal;
    VC.calculo.propagarCaudal = function () { o.apply(this, arguments); VC.dados.ramais.forEach(r => { if (!r.parente) r.Q = r.Q_proprio; }); };
    VC.calculo.calcularTudo(); return () => { VC.calculo.propagarCaudal = o; VC.calculo.calcularTudo(); };
  }],
  ['3.5 · velocidade sem limite por nível', 'N4.T16', () => {
    const o = VC.calculo.vMaxDe;
    VC.calculo.vMaxDe = () => 99;
    VC.calculo.calcularTudo(); return () => { VC.calculo.vMaxDe = o; VC.calculo.calcularTudo(); };
  }],
  ['3.8 · limite SFPint fixo (1300) para todas as UTAs', 'N6.T11', () => {
    const o = VC.normas.classificarSFP;
    VC.normas.classificarSFP = function (t, s) { const lim = 1300; return { tipo: t, classe: s <= lim * 0.5 ? 1 : (s <= lim * 0.75 ? 2 : (s <= lim ? 3 : 4)), sfpInt: s, limite: lim, limiteBase: lim, conforme: s <= lim, etaOK: true }; };
    return () => { VC.normas.classificarSFP = o; };
  }],
  ['3.9 · lado do balanço decidido pelo nome do terminal', 'N3.T19', () => {
    const o = VC.calculo.calcularVentiladores;
    VC.calculo.calcularVentiladores = function () { const r = o.apply(this, arguments); const ext = VC.dados.terminais.filter(t => /extra|retorno/i.test(t.nome || '') || t.rede !== 'insuflacao'); r.ext = ext.reduce((s, t) => s + (Number(t.Q) || 0), 0); r.ins = VC.dados.terminais.filter(t => ext.indexOf(t) < 0).reduce((s, t) => s + (Number(t.Q) || 0), 0); return r; };
    return () => { VC.calculo.calcularVentiladores = o; };
  }],
  ['3.10 · ar transferido fora da insuflação necessária', 'N3.T20', () => {
    const o = VC.calculo.balancoEspaco;
    VC.calculo.balancoEspaco = function () { const b = o.apply(this, arguments); return Object.assign({}, b, { Q_nec: b.Q_nec - (b.Q_transf_out || 0) }); };
    return () => { VC.calculo.balancoEspaco = o; };
  }],
  ['B1 · PDF rebenta a meio', 'N8.T6', () => {
    const o = VC.utils.fmt; let n = 0;
    VC.utils.fmt = function () { if (++n > 40) throw new Error('falha simulada'); return o.apply(this, arguments); };
    return () => { VC.utils.fmt = o; };
  }],
  ['B1 · Excel rebenta', 'N8.T7', () => {
    const o = XLSX.utils.json_to_sheet;
    XLSX.utils.json_to_sheet = () => { throw new Error('falha simulada'); };
    return () => { XLSX.utils.json_to_sheet = o; };
  }],
  ['B2/B7 · botão chama uma função que não existe', 'UI.T11', () => {
    const o = window.renderSetup;
    window.renderSetup = function () { return o.apply(this, arguments) + '<button onclick="VC.ui.funcaoQueNaoExiste()">x</button>'; };
    return () => { window.renderSetup = o; };
  }],
  ['B4 · ajuda por clique em falta', 'UI.T12', () => {
    const o = VC.tooltips.mostrar; delete VC.tooltips.mostrar;
    return () => { VC.tooltips.mostrar = o; };
  }],
  ['Resíduo ignora as transferências', 'N3.T7', () => {
    const o = VC6.balanco.QTransfOut; VC6.balanco.QTransfOut = () => 0;
    return () => { VC6.balanco.QTransfOut = o; };
  }],
  ['E1 · série e método fora do estado', 'N1.T20', () => {
    const o = VC.estado._hashEstado;
    VC.estado._hashEstado = function () { const d = VC.dados, s = d.serieDiametros, m = d.metodoCalculo; d.serieDiametros = 'S1'; d.metodoCalculo = { metodo: 'loss' }; try { return o.call(this); } finally { d.serieDiametros = s; d.metodoCalculo = m; } };
    return () => { VC.estado._hashEstado = o; };
  }],
  ['E2 · ponto de funcionamento por rede (1.ª UTA)', 'N6.T12', () => {
    const o = VC.uta.calcularPontoFuncionamento;
    VC.uta.calcularPontoFuncionamento = function (rede) { return o.call(this, rede); };
    VC.calculo.calcularTudo(); return () => { VC.uta.calcularPontoFuncionamento = o; VC.calculo.calcularTudo(); };
  }],
  ['v11.2 · ramais ignoram a altura e a rugosidade do Setup', 'N4.T20', () => {
    const oh = VC.calculo.hMaxDe, orr = VC.calculo.rugosidadeDe;
    VC.calculo.hMaxDe = () => 250; VC.calculo.rugosidadeDe = () => 0.15;
    return () => { VC.calculo.hMaxDe = oh; VC.calculo.rugosidadeDe = orr; };
  }],
  ['v11.2 · estado dos filtros sem efeito', 'N6.T14', () => {
    const o = VC.calculo.calcularVentiladores;
    VC.calculo.calcularVentiladores = function () { const f = VC.dados.filtros.modo; VC.dados.filtros.modo = 'sujo'; try { return o.apply(this, arguments); } finally { VC.dados.filtros.modo = f; } };
    return () => { VC.calculo.calcularVentiladores = o; };
  }],
  ['v11.2 · tipologia em implementação sem aviso', 'N2.T17', () => {
    const o = VC.normas.tipologiaAtual; VC.normas.tipologiaAtual = () => 'comercio';
    return () => { VC.normas.tipologiaAtual = o; };
  }],
  ['v11.3 · colunas técnicas sem ajuda "?"', 'UI.T13', () => {
    const o = VC.tabelas.decorar; VC.tabelas.decorar = function () {};
    return () => { VC.tabelas.decorar = o; };
  }],
  ['v11.3 · gráfico sem porta de entrada (diagrama da rede sem vista)', 'UI.T14', () => {
    const o = VC.nav.VISTAS.rede; VC.nav.VISTAS.rede = o.filter(v => v.modo !== 'diagrama-rede');
    return () => { VC.nav.VISTAS.rede = o; };
  }],
  ['v11.3 · Entrega esconde avisos da auditoria', 'UI.T15', () => {
    const o = VC.entrega.dados; VC.entrega.dados = function () { const d = o.apply(this, arguments); d.pontos = d.pontos.slice(1); return d; };
    return () => { VC.entrega.dados = o; };
  }],
  ['v11.3 · área da planta sem a escala ao quadrado', 'UI.T16', () => {
    const o = VC.planta.areaM2; VC.planta.areaM2 = function (pts, piso) { return piso && piso.escala ? this.areaPx(pts) * piso.escala : null; };
    return () => { VC.planta.areaM2 = o; };
  }],
  ['v11.3 · terminais distribuídos fora da sala (sem puxar para o centro)', 'UI.T17', () => {
    const o = VC.planta.dentro; VC.planta.dentro = () => true;
    return () => { VC.planta.dentro = o; };
  }],
  ['v11.3 · L do ramal medido em píxeis (sem a escala)', 'UI.T18', () => {
    const o = VC.planta.comprimentoM; VC.planta.comprimentoM = function (pts, piso) { return piso && piso.escala ? this.comprimentoPx(pts) : null; };
    return () => { VC.planta.comprimentoM = o; };
  }],
  ['v11.3 · exemplo "guardado" sem espaço no navegador (falha silenciosa)', 'UI.T19', () => {
    const o = VC.exemplos.save; VC.exemplos.save = function () { try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._lista || [])); } catch { /* engolido */ } return true; };
    return () => { VC.exemplos.save = o; };
  }],
  ['v11.3 · zoom no centro em vez de no cursor', 'UI.T20', () => {
    const o = VC.planta.zoomEm; VC.planta.zoomEm = function (z) { this.zoom = z; this.aplicarVista(); };
    return () => { VC.planta.zoomEm = o; };
  }],
  ['v11.3 · renomear ramal só muda o nome (sub-ramais e terminais ficam órfãos)', 'UI.T21', () => {
    const o = VC.topologia.renomearRamal; VC.topologia.renomearRamal = function (a, n) { const r = VC.dados.ramais.find(x => x.nome === a); if (!r) return { ok: false }; r.nome = String(n).trim(); return { ok: true, n: 0 }; };
    return () => { VC.topologia.renomearRamal = o; };
  }],
  ['v11.3 · Terminal colocado fora de uma sala', 'UI.T22', () => {
    const o = VC.planta.salaEm; VC.planta.salaEm = function () { return (VC.dados.espacos || []).find(e => e.planta) || null; };
    return () => { VC.planta.salaEm = o; };
  }],
  ['v11.3 · seta da transferência a meio entre os centros das salas (não na porta)', 'UI.T24', () => {
    const o = VC.planta.portaEntre; VC.planta.portaEntre = function (A, B) { const a = this.centro(A.planta.pts), b = this.centro(B.planta.pts); return { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, ang: Math.atan2(b[1] - a[1], b[0] - a[0]), folga: 0 }; };
    return () => { VC.planta.portaEntre = o; };
  }],
  ['v11.3 · compensar a origem não atualiza os terminais', 'UI.T24', () => {
    const o = VC6.transferencias._parcelas; VC6.transferencias._parcelas = function () {};
    return () => { VC6.transferencias._parcelas = o; };
  }],
  ['v11.3 · selecionar uma sala não tira a seleção da transferência (duas seleções)', 'UI.T25', () => {
    const o = VC.planta.selecionar; VC.planta.selecionar = function () { const t = this.trfSel; const r = o.apply(this, arguments); this.trfSel = t; return r; };
    return () => { VC.planta.selecionar = o; };
  }],
  ['PR 1 · desfazer volta a repor objetos inteiros (como antes da A2)', 'UI.T26', () => {
    const P = VC.planta, od = P._diferencas, oa = P._aplicar, oi = P._igual;
    P._diferencas = function (A, B) {   // guarda todos os campos do objeto, não só os que a ação mudou
      return od.call(this, A, B).map(d => { if (!d.campos) return d; const k = { e: 'e', t: 't', r: 'r', tr: 'tr', pl: 'pl' }[d.col]; const a = (A[k] || []).find(o => 'id:' + o.id === d.id) || {}, b = (B[k] || []).find(o => 'id:' + o.id === d.id) || {}; return Object.assign({}, d, { campos: { antes: Object.assign({}, a), depois: Object.assign({}, b) } }); });
    };
    P._aplicar = function () { P._igual = () => true; try { return oa.apply(this, arguments); } finally { P._igual = oi; } };   // sem ver o que mudou depois
    return () => { P._diferencas = od; P._aplicar = oa; P._igual = oi; };
  }],
  ['PR 2 · renomear espaço só muda o nome (terminais ficam órfãos)', 'UI.T27', () => {
    const o = VC.associacoes.renomearEspaco; VC.associacoes.renomearEspaco = function (e, novo) { e.nome = String(novo).trim(); return { ok: true, n: 0 }; };
    return () => { VC.associacoes.renomearEspaco = o; };
  }],
  ['PR 2 · associar sem verificar a rede', 'UI.T28', () => {
    const o = VC.redes.compativeis; VC.redes.compativeis = () => true;
    return () => { VC.redes.compativeis = o; };
  }],
  ['PR 2 · transferência de espaço sujo para limpo aceite', 'UI.T29', () => {
    const o = VC6.transferencias.direcaoValida; VC6.transferencias.direcaoValida = () => ({ ok: true });
    return () => { VC6.transferencias.direcaoValida = o; };
  }],
  ['PR 2 · escala pela área sem a raiz quadrada', 'UI.T30', () => {
    const o = VC.planta.areaPx; VC.planta.areaPx = function () { return Math.sqrt(o.apply(this, arguments)); };
    return () => { VC.planta.areaPx = o; };
  }],
  ['N vazio volta a valer N = 1 em silêncio', 'UI.T31', () => {
    const o = VC.calculo.nVazio; VC.calculo.nVazio = () => false;
    const q = VC.calculo.calcularQ_normas; VC.calculo.calcularQ_normas = function (esp) { return q.call(this, esp.N == null ? Object.assign({}, esp, { N: 1 }) : esp); };
    return () => { VC.calculo.nVazio = o; VC.calculo.calcularQ_normas = q; };
  }],
  ['Portaria 1.2.2 f) · só recusa sujo → limpo (aceita WC → WC)', 'UI.T32', () => {
    const T = VC6.transferencias, o = T.direcaoValida; T.direcaoValida = function (de, para) { return this.ehSujo(de) && !this.ehSujo(para) ? o.call(this, de, para) : { ok: true }; };
    return () => { T.direcaoValida = o; };
  }],
  ['Arquivo volta a ser isento (0 m³/h)', 'UI.T33', () => {
    const L = VC.regulamento.isencoesArNovo; L.push('Arquivo');
    return () => { L.splice(L.indexOf('Arquivo'), 1); };
  }],
  ['Tabela 13: pública volta a ter o mínimo de 45 que a norma não tem', 'UI.T34', () => {
    const c = VC.conhecimento.tabelas.T13.sanitarios.publico_normal, o = c.min; c.min = 45;
    return () => { c.min = o; };
  }],
  // Fase 5 da auditoria: requisitos dos sistemas e escadas
  ['Recuperação de calor: limiar de 80 kW sobe para 800 kW', 'N2.T23', () => {
    const P = VC.constantes.P138_SISTEMAS, o = P.REJEICAO_RECUPERACAO_W; P.REJEICAO_RECUPERACAO_W = 800000;
    return () => { P.REJEICAO_RECUPERACAO_W = o; };
  }],
  ['Free-cooling: limiar de 10 000 m³/h sobe para 100 000', 'N2.T24', () => {
    const P = VC.constantes.P138_SISTEMAS, o = P.FREE_COOLING_M3H; P.FREE_COOLING_M3H = 100000;
    return () => { P.FREE_COOLING_M3H = o; };
  }],
  ['Escadas: velocidade na porta aberta deixa de ser verificada', 'N2.T25', () => {
    const E = VC.constantes.ESCADAS, o = [E.vPortaSemCamara, E.vPortaComCamara]; E.vPortaSemCamara = 0; E.vPortaComCamara = 0;
    return () => { E.vPortaSemCamara = o[0]; E.vPortaComCamara = o[1]; };
  }],
  ['Garagem: limiar de UT II (200 m²) deixa de existir', 'UI.T33', () => {
    const C = VC.constantes, o = C.GARAGEM_UT2_AREA_MIN; C.GARAGEM_UT2_AREA_MIN = 0;
    return () => { C.GARAGEM_UT2_AREA_MIN = o; };
  }],
  ['Painel: o sub-ramal deixa de herdar o material do ramal-pai', 'N11.T11', () => {
    const c = VC.calculo, o = c.origemPropria; c.origemPropria = function (r, campo) { return this._proprio(r, campo) ? r : null; };
    return () => { c.origemPropria = o; };
  }],
  ['Edição: a área da tabela deixa de acompanhar o desenho', 'N11.T12', () => {
    const P = VC.planta, o = P.areaM2; let n = 0; P.areaM2 = function () { return n++ % 2 ? o.apply(this, arguments) : -1; };
    return () => { P.areaM2 = o; };
  }],
  ['Tipo de sistema: VMC sem o par UVB', 'N11.T12', () => {
    const U = VC.uta, o = U.criarDeTipo; U.criarDeTipo = function (c, n, r, z) { const u = o.call(this, c, n, r, z); delete u.uvbPar; return u; };
    return () => { U.criarDeTipo = o; };
  }],
  ['Cores: a paleta do utilizador é ignorada', 'N11.T13', () => {
    const P = VC.planta, o = P.cores; P.cores = function () { return Object.assign({}, VC.constantes.PALETA_REDES); };
    return () => { P.cores = o; };
  }],
  ['Textos: tamanho fixo outra vez (deixa de seguir a escala)', 'N11.T14', () => {
    const P = VC.planta, o = P._pxTexto; P._pxTexto = function (cat) { return P.CAT_TEXTOS[cat].orig * P.fatorTextos(); };
    return () => { P._pxTexto = o; };
  }],
  ['Encaixe: a aresta ganha ao vértice', 'N11.T15', () => {
    const P = VC.planta, o = P.encaixe; P.encaixe = function (raw, opts) { const r = o.call(this, raw, opts); if (r.tipo === 'vertice') { const a = o.call(this, raw, Object.assign({}, opts)); a.tipo = 'aresta'; return a; } return r; };
    return () => { P.encaixe = o; };
  }],
  ['Siglas: a legenda do projeto é ignorada', 'N11.T15', () => {
    const U = VC.uta, o = U.siglasProjeto; U.siglasProjeto = () => [];
    return () => { U.siglasProjeto = o; };
  }],
  ['Atalhos: duas ferramentas com a mesma tecla', 'N11.T16', () => {
    const T = VC.planta.TECLAS, o = T.medir; T.medir = 'M';
    return () => { T.medir = o; };
  }],
  ['Reajuste: o Ø fixo do troço é ignorado', 'N11.T17', () => {
    const C = VC.calculo, o = C._aplicarReajuste; C._aplicarReajuste = function (r) { const f = r.trocosFix; delete r.trocosFix; try { return o.apply(this, arguments); } finally { if (f) r.trocosFix = f; } };
    return () => { C._aplicarReajuste = o; };
  }],
  ['Reajuste: o troço mínimo deixa de contar', 'N11.T17', () => {
    const C = VC.calculo, o = C._aplicarReajuste; C._aplicarReajuste = function (r, regras, a, b, c) { return o.call(this, r, Object.assign({}, regras, { minL: 0 }), a, b, c); };
    return () => { C._aplicarReajuste = o; };
  }],
  ['Secções: «automática» nunca passa a retangular', 'N11.T18', () => {
    const C = VC.calculo, o = C.formaPedida; C.formaPedida = function (r) { const f = o.call(this, r); return f === 'auto' ? 'circular' : f; };
    return () => { C.formaPedida = o; };
  }],
  ['Fugas: a classe de estanquidade não conta (todas como A)', 'N11.T19', () => {
    const K = VC.calculo.CLASSES_ESTANQUIDADE, o = Object.assign({}, K); Object.keys(K).forEach(k => { K[k] = 0.027; });
    return () => { Object.assign(K, o); };
  }],
  ['Fugas: a pressão entra linear (sem o expoente 0,65)', 'N11.T19', () => {
    const o = Math.pow; Math.pow = function (b, e) { return e === 0.65 ? b : o(b, e); };
    return () => { Math.pow = o; };
  }],
  ['Redução: a brusca usa o ζ da gradual', 'N11.T20', () => {
    const C = VC.calculo, o = C.zetaReducao; C.zetaReducao = function (t, e, a) { return o.call(this, 'gradual', e, a); };
    return () => { C.zetaReducao = o; };
  }],
  ['Reajuste «marcados» reduz em todas as derivações', 'N11.T20', () => {
    const C = VC.calculo, o = C._aplicarReajuste; C._aplicarReajuste = function (r, regras, a, b, c) { return o.call(this, r, Object.assign({}, regras, regras.modo === 'marcados' ? { modo: 'derivacao' } : {}), a, b, c); };
    return () => { C._aplicarReajuste = o; };
  }],
  ['Série própria ignorada (usa sempre S1)', 'N11.T20', () => {
    const C = VC.calculo, o = C.listaSerie; C.listaSerie = function () { return VC.constantes.COMM_S1; };
    return () => { C.listaSerie = o; };
  }],
  ['Renomear: o prefixo não passa aos sub-ramais', 'N11.T21', () => {
    const T = VC.topologia, o = T.subRamaisComPrefixo; T.subRamaisComPrefixo = function () { return []; };
    return () => { T.subRamaisComPrefixo = o; };
  }],
  ['Ventilador: as fugas não entram na potência', 'N11.T22', () => {
    const C = VC.calculo, o = C.calcularVentiladores; C.calcularVentiladores = function () { const f = (VC.dados.utas || []).map(u => u.Q_fugas); VC.dados.utas.forEach(u => { u.Q_fugas = 0; }); try { return o.apply(this, arguments); } finally { VC.dados.utas.forEach((u, i) => { u.Q_fugas = f[i]; }); } };
    return () => { C.calcularVentiladores = o; };
  }],
  ['Equipamento: a VCM não leva a outra metade', 'N11.T22', () => {
    const P = VC.planta, o = P.metadePar; P.metadePar = function () { return null; };
    return () => { P.metadePar = o; };
  }],
  ['Exterior: a distância ao ar sujo usa o mínimo de 2 m', 'N11.T23', () => {
    const E = VC.constantes.EXTERIOR, o = E.DIST_MIN_SUJO; E.DIST_MIN_SUJO = E.DIST_MIN;
    return () => { E.DIST_MIN_SUJO = o; };
  }],
  ['Exterior: a conduta até à grelha não conta', 'N11.T23', () => {
    const E = VC.constantes.EXTERIOR, o = E.ZETA_LIGACAO, C = VC.calculo, d = C.dimensionarConduta; E.ZETA_LIGACAO = 0; C.dimensionarConduta = function () { return Object.assign(d.apply(this, arguments), { R: 0 }); };
    return () => { E.ZETA_LIGACAO = o; C.dimensionarConduta = d; };
  }],
  ['Térmica: λ do isolamento errado', 'N11.T24', () => {
    const K = VC.constantes.TERMICA, o = K.LAMBDA; K.LAMBDA = 0.07;
    return () => { K.LAMBDA = o; };
  }],
  ['Térmica: a espessura do isolamento é ignorada', 'N11.T24', () => {
    const C = VC.calculo, o = C.specDe; C.specDe = function (r, k) { return k === 'isolEsp' ? 0 : o.apply(this, arguments); };
    return () => { C.specDe = o; };
  }],
  // Fase 4 da auditoria: qualidade de cálculo
  ['ε_v do espaço ignorado (só o do Setup)', 'N2.T21', () => {
    const o = VC.calculo.evDe; VC.calculo.evDe = function () { return Number(VC.dados.eficaciaRemocao) || 1; };
    return () => { VC.calculo.evDe = o; };
  }],
  ['EN 16798-1 sem o mínimo de 4 l/s por pessoa', 'N2.T22', () => {
    const T = VC.conhecimento.tabelas.EN16798_1, o = T.minimoPorPessoa; T.minimoPorPessoa = 0;
    return () => { T.minimoPorPessoa = o; };
  }],
  ['Retangular volta a ignorar a perda alvo', 'N4.T24', () => {
    const o = VC.calculo.retangular; VC.calculo.retangular = function (h, r, v, q) { return o.call(this, h, r, v, q); };
    return () => { VC.calculo.retangular = o; };
  }],
  ['Ruído do terminal volta a 10·log(Q/Q0)', 'N7.T20', () => {
    const T = VC.constantes.TERMINAL, o = T.expoenteLw; T.expoenteLw = 10;
    return () => { T.expoenteLw = o; };
  }],
  ['Grelhas de transferência voltam a Cd ≈ 0,78', 'N5.T1', () => {
    const o = VC.constantes.CD_TRANSFERENCIA; VC.constantes.CD_TRANSFERENCIA = 0.78;
    return () => { VC.constantes.CD_TRANSFERENCIA = o; };
  }],
  // Fase 3 da auditoria: bases legais
  ['UVB: cada metade volta a ser comparada sozinha com o limite da unidade', 'N6.T15', () => {
    const o = VC.calculo.classificarUVB; VC.calculo.classificarUVB = function () {};
    return () => { VC.calculo.classificarUVB = o; };
  }],
  ['Ecodesign: correção F dos filtros ignorada', 'N6.T16', () => {
    const o = VC.normas.classificarSFP; VC.normas.classificarSFP = function (t, s, q, e) { return o.call(this, t, s, q, e, 0); };
    return () => { VC.normas.classificarSFP = o; };
  }],
  ['SFP: categorias da EN 16798-3 trocadas', 'N6.T17', () => {
    const T = VC.conhecimento.tabelas.SFP_CATEGORIAS, o = T[3].max; T[3].max = 1000;
    return () => { T[3].max = o; };
  }],
  ['DL 101-D volta a usar a potência dos ventiladores', 'N2.T20', () => {
    const o = VC.normas.potenciaTermicaW; VC.normas.potenciaTermicaW = function () { return (VC.calculo.ultimo && VC.calculo.ultimo.power) || 0; };
    return () => { VC.normas.potenciaTermicaW = o; };
  }],
  // Fase 2 da auditoria: encadeamento
  ['Filtro, bateria e recuperador do ramal voltam a somar ao Δp total', 'N4.T23', () => {
    const o = VC.calculo.calcularDeltaPAcumulado;
    VC.calculo.calcularDeltaPAcumulado = function () { o.apply(this, arguments); VC.dados.ramais.forEach(r => { r.deltaPtotal += (Number(r.deltaP_filtro) || 0) + (Number(r.deltaP_bateria) || 0) + (Number(r.deltaP_recup) || 0); }); };
    return () => { VC.calculo.calcularDeltaPAcumulado = o; };
  }],
  ['Sono volta a usar T12 × A', 'N2.T18', () => {
    const d = VC.conhecimento.tiposEspaco['Sono']; delete d.semT12;
    return () => { d.semT12 = true; };
  }],
  ['Balneário volta a ficar NÃO CONFORME por renovações/hora', 'N2.T19', () => {
    const o = VC.calculo.calcularQ_normas;
    VC.calculo.calcularQ_normas = function (esp) { const c = o.apply(this, arguments); if (esp && esp.tipo === 'Balneários' && c.ACH < c.achMin) c.status = 'NÃO CONF.'; return c; };
    return () => { VC.calculo.calcularQ_normas = o; };
  }],
  ['G4 volta a ficar isento da comparação servido / exigido', 'N3.T21', () => {
    const o = VC.calculo.balancoEspaco;
    VC.calculo.balancoEspaco = function () { const b = o.apply(this, arguments); if (b.g === 3 || b.g === 4) b.estado = 'ISENTO'; return b; };
    return () => { VC.calculo.balancoEspaco = o; };
  }],
  ['Quadro legal do balanço volta a ver só os ciclos', 'N3.T21', () => {
    const B = VC6.balanco, o = B.propagar; B.propagar = function () { const r = o.apply(this, arguments); return r.map(x => Object.assign({}, x, { estado: 'OK' })); };
    return () => { B.propagar = o; };
  }],
  // Fase 2A da auditoria: caudal variável ao longo do ramal
  ['Troços: o caudal total percorre o ramal inteiro (volta o troço único)', 'N4.T21', () => {
    const o = VC.calculo.trocosDe; VC.calculo.trocosDe = function (r) { return { modo: 'simplificado', trocos: [{ de: 0, ate: Number(r.L) || 0, L: Number(r.L) || 0, Q: Number(r.Q) || 0 }] }; };
    return () => { VC.calculo.trocosDe = o; };
  }],
  ['Troços: o sub-ramal conta o Δp do pai até ao fim (ignora onde sai)', 'N4.T21', () => {
    const o = VC.calculo.dpAte; VC.calculo.dpAte = function (r) { return o.call(this, r, Number(r.L) || 0); };
    return () => { VC.calculo.dpAte = o; };
  }],
  ['Troços: sem perdas nos tês e nas reduções', 'N4.T21', () => {
    const z = VC.constantes.ZETA_DERIVACAO, o = { t: z.TE_PASSAGEM, c: z.REDUCAO.contracao }; z.TE_PASSAGEM = 0; z.REDUCAO.contracao = 0;
    return () => { z.TE_PASSAGEM = o.t; z.REDUCAO.contracao = o.c; };
  }],
  ['Planta: a posição projetada no traçado é ignorada', 'N4.T22', () => {
    const o = VC.calculo._projetarNoTracado; VC.calculo._projetarNoTracado = function () { return null; };
    return () => { VC.calculo._projetarNoTracado = o; };
  }],
  // Fase 1 da auditoria (dados normativos): cada erro corrigido volta a ser posto e o teste tem de o apanhar
  ['Tabela 13: linha «pública intensiva» (125 × aparelhos) volta a 90', 'N2.T5', () => {
    const c = VC.conhecimento.tabelas.T13.sanitarios.publico_intensivo, o = c.porAparelho; c.porAparelho = 90;
    return () => { c.porAparelho = o; };
  }],
  ['Balneário volta a contar só os duches', 'N2.T5b', () => {
    const o = VC.normas.calcExtracaoSanitaria;
    VC.normas.calcExtracaoSanitaria = function (esp) { return o.call(this, esp && esp.tipo === 'Balneários' ? Object.assign({}, esp, { numSanitas: 0, numUrinois: 0 }) : esp); };
    return () => { VC.normas.calcExtracaoSanitaria = o; };
  }],
  ['Tabela 11: Ginásio volta a 49 m³/(h·ocupante)', 'N2.T5c', () => {
    const d = VC.conhecimento.tiposEspaco['Ginásio'], o = d.t11; d.t11 = 49;
    return () => { d.t11 = o; };
  }],
  ['Escadas: mínimo volta a 50 Pa', 'N2.T9', () => {
    const l = VC.conhecimento.tabelas.pressaoLimites.Escadas, o = l.min; l.min = 50;
    return () => { l.min = o; };
  }],
  ['Copa volta a ser «Tabela 13» (sem alerta de boa prática)', 'UI.T35', () => {
    const d = VC.conhecimento.tiposEspaco['Copa']; d.t13 = true;
    return () => { delete d.t13; };
  }],
  ['Confirmação do projetista ignorada (alerta de boa prática nunca sai)', 'UI.T35', () => {
    const o = VC.calculo.grupoDe; VC.calculo.grupoDe = function (e) { const g = o.call(this, e); if (e && e.boaPraticaConfirmada) { delete e.boaPraticaConfirmada; e._mut = 1; } return g; };
    return () => { VC.calculo.grupoDe = o; };
  }],
  ['Trocar de ferramenta descarta o pendente sem aviso (D5)', 'UI.T36', () => {
    const P = VC.planta, o = P.escolherFerramenta; P.escolherFerramenta = function (f) { this.setFerramenta(f); return true; };
    return () => { P.escolherFerramenta = o; };
  }],
  ['Avisos só na Entrega (nada no desenho)', 'UI.T37', () => {
    const P = VC.planta, o = P.avisosPorElemento; P.avisosPorElemento = () => new Map();
    return () => { P.avisosPorElemento = o; };
  }],
  ['Área desenhada comparada sem a escala ao quadrado', 'UI.T38', () => {
    const P = VC.planta, o = P.areaM2; P.areaM2 = function (pts, piso) { return piso && piso.escala ? this.areaPx(pts) * piso.escala : null; };
    return () => { P.areaM2 = o; };
  }],
  ['Nome da sala volta ao centro geométrico (fora de uma sala em L)', 'UI.T39', () => {
    const P = VC.planta, o = P.pontoInterior; P.pontoInterior = function (pts) { return this.centro(pts); };
    return () => { P.pontoInterior = o; };
  }],
  ['Renomear na Topologia sem cascata (sub-ramais órfãos)', 'UI.T40', () => {
    const A = VC.associacoes, o = A.renomearRamal; A.renomearRamal = function (antigo, novo) { const r = VC.dados.ramais.find(x => x.nome === antigo); if (r) r.nome = String(novo).trim(); return { ok: true, n: 0 }; };
    return () => { A.renomearRamal = o; };
  }],
  ['E3 · sem aviso de ventilador fora da curva', 'N6.T13', () => {
    const o = VC.uta.calcularPontoFuncionamento;
    VC.uta.calcularPontoFuncionamento = function () { const r = o.apply(this, arguments); if (r) r.foraDaCurva = false; return r; };
    VC.calculo.calcularTudo(); return () => { VC.uta.calcularPontoFuncionamento = o; VC.calculo.calcularTudo(); };
  }]
];

const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json' };
function servidor() {
  return new Promise(res => {
    const s = http.createServer((req, resp) => {
      const p = path.join(RAIZ, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { resp.writeHead(404); return resp.end(); }
      resp.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(resp);
    });
    s.listen(0, '127.0.0.1', () => res(s));
  });
}

(async () => {
  const srv = await servidor();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('dialog', d => d.accept());
  if (LIBS) {
    const lib = n => path.join(LIBS, n);
    await page.route(/jspdf\.umd/, r => r.fulfill({ path: lib('jspdf.umd.min.js'), contentType: 'application/javascript' }));
    await page.route(/autotable/, r => r.fulfill({ path: lib('jspdf.plugin.autotable.min.js'), contentType: 'application/javascript' }));
    await page.route(/xlsx/, r => r.fulfill({ path: lib('xlsx.full.min.js'), contentType: 'application/javascript' }));
    await page.route(/font-awesome/, r => r.fulfill({ body: '', contentType: 'text/css' }));
  }
  await page.goto('http://127.0.0.1:' + srv.address().port + '/index.html');
  await page.waitForTimeout(2500);
  console.log('VentiCondutas · testes de mutação\n──────────────────────────────────────────');
  let falhas = 0;
  for (const [nome, id, mutar] of CASOS) {
    const r = await page.evaluate(([id, src]) => {
      const estado = () => { const t = VC6.testes.correr().detalhe.find(x => x.id === id); return t ? t.estado : 'inexistente'; };
      const antes = estado(); let durante = 'erro', depois;
      try { const repor = (0, eval)('(' + src + ')')(); try { durante = estado(); } finally { repor(); } }
      catch (e) { durante = 'erro: ' + e.message; }
      depois = estado();
      return { antes, durante, depois };
    }, [id, mutar.toString()]);
    const ok = r.antes === 'pass' && r.durante === 'fail' && r.depois === 'pass';
    if (!ok) falhas++;
    console.log((ok ? '✓ ' : '✗ ') + id.padEnd(7) + ' apanha: ' + nome + (ok ? '' : '  (' + r.antes + ' → ' + r.durante + ' → ' + r.depois + ')'));
  }
  console.log('──────────────────────────────────────────');
  console.log(falhas ? '✗ ' + falhas + ' teste(s) não apanham o erro que vigiam' : '✓ ' + CASOS.length + '/' + CASOS.length + ' erros apanhados pelos testes');
  await browser.close(); srv.close();
  process.exitCode = falhas ? 1 : 0;
})();
