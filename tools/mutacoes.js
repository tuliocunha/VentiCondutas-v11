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
    const o = VC.exemplos.save; VC.exemplos.save = function () { try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._lista || [])); } catch (e) { /* engolido */ } return true; };
    return () => { VC.exemplos.save = o; };
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
