#!/usr/bin/env node
/* ============================================================
   VentiCondutas · cenários da planta com rato e teclado reais
   ------------------------------------------------------------
   Contrato da planta, secção 9 e fase 5: tarefas reais feitas só com
   gestos (cliques, arrastos, teclas), num Chromium sem janela. Cada
   cenário confere o resultado nos dados e no ecrã. Os casos de teste são
   construídos aqui (planta sintética), não vêm dos projetos de exemplo.

   Uso:   npm run cenarios            (todos)
          node tools/cenarios-planta.js --so gestos
          node tools/cenarios-planta.js --imagens <pasta>   (grava imagens)
   Termina com código 1 se algum cenário falhar ou houver erros JS.
   ============================================================ */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const RAIZ = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const SO = args.includes('--so') ? args[args.indexOf('--so') + 1] : null;
const IMAGENS = args.includes('--imagens') ? path.resolve(args[args.indexOf('--imagens') + 1]) : null;
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

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

/* ── ajudas de gestos: coordenadas em píxeis da imagem → ecrã ── */
function ajudas(pg) {
  const ecra = (x, y) => pg.evaluate(([x, y]) => { const s = document.getElementById('plantaSVG'), m = s.getScreenCTM(), p = s.createSVGPoint(); p.x = x; p.y = y; const q = p.matrixTransform(m); return [q.x, q.y]; }, [x, y]);
  return {
    ecra,
    arrastar: async (a, b) => { const [x0, y0] = await ecra(...a), [x1, y1] = await ecra(...b); await pg.mouse.move(x0, y0); await pg.mouse.down(); await pg.mouse.move(x1, y1, { steps: 10 }); await pg.mouse.up(); await pg.waitForTimeout(250); },
    clicar: async (a, n) => { const [x, y] = await ecra(...a); await pg.mouse.click(x, y, { clickCount: n || 1 }); await pg.waitForTimeout(200); },
    tecla: async k => { await pg.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur()); await pg.keyboard.press(k); await pg.waitForTimeout(200); },
    separador: async v => { await pg.click('[data-vista="' + v + '"]'); await pg.waitForTimeout(350); },
    passo: async id => { await pg.evaluate(i => VC.nav.irPasso(i), id); await pg.waitForTimeout(400); },
    criarSala: async (nome, tipo, N) => { await pg.fill('#plantaNovoNome', nome); await pg.selectOption('#plantaNovoTipo', tipo); if (N != null) await pg.fill('#plantaNovoN', String(N)); await pg.click('button:has-text("Criar espaço")'); await pg.waitForTimeout(300); },
    v: f => pg.evaluate(f)
  };
}

/* planta sintética (1000 × 700 px), num projeto sem UTAs nem ramais */
async function prepararPlanta(pg, escala) {
  await pg.evaluate(e => {
    const c = document.createElement('canvas'); c.width = 1000; c.height = 700; const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, 1000, 700); g.strokeStyle = '#333'; g.lineWidth = 3; g.strokeRect(100, 100, 400, 300); g.strokeRect(500, 100, 200, 300);
    VC.dados.plantas = [{ id: 'pS', nome: 'Mezanino', imagem: c.toDataURL('image/png'), w: 1000, h: 700, escala: e }]; VC.planta.piso = 'pS';
    const t = VC.ui.toast; VC.ui.toast = function (m) { (window.__t = window.__t || []).push(m); return t.apply(this, arguments); };
  }, escala === undefined ? 0.01 : escala);
  await pg.evaluate(() => VC.nav.irPasso('levantamento')); await pg.waitForTimeout(400);
  await pg.click('[data-vista="planta"]'); await pg.waitForTimeout(350);
  await pg.evaluate(() => { VC.dados.utas = []; VC.dados.ramais = []; VC.dados.terminais.forEach(t => { t.ramalRef = ''; }); VC.planta.redesenhar(); });
  await pg.keyboard.press('f'); await pg.waitForTimeout(250);
}

/* ── cenários ── */
const CENARIOS = {
  /* PR 1 · A2: o desfazer da planta não apaga trabalho feito noutro ecrã */
  async desfazer(pg, ok) {
    const h = ajudas(pg); await prepararPlanta(pg);
    await h.tecla('r'); await h.arrastar([100, 100], [500, 400]); await h.criarSala('Sala A2', 'Escritório');
    const idx = await h.v(() => VC.dados.espacos.findIndex(e => e.nome === 'Sala A2'));
    await h.separador('passo');
    const inN = pg.locator('input[data-campo="N"][data-idx="' + idx + '"]'); await inN.scrollIntoViewIfNeeded(); await inN.fill('6'); await inN.press('Tab'); await pg.waitForTimeout(300);
    await h.separador('planta'); await pg.locator('#plantaSVG').hover(); await pg.keyboard.press('Control+z'); await pg.waitForTimeout(300);
    const e = await h.v(() => { const x = VC.dados.espacos.find(y => y.nome === 'Sala A2'); return { tem: !!x.planta, N: x.N }; });
    ok(!e.tem && e.N === 6, 'Ctrl+Z tira o desenho e mantém N = 6 escrito na Tabela', e);
    await pg.keyboard.press('Control+y'); await pg.waitForTimeout(300);
    ok(await h.v(() => !!VC.dados.espacos.find(y => y.nome === 'Sala A2').planta), 'Ctrl+Y repõe o desenho');
  },

  /* PR 2: a planta cria; transferência com direção; UTA no cartão; nomes ligados à tabela */
  async criar(pg, ok) {
    const h = ajudas(pg); await prepararPlanta(pg, null);
    await h.tecla('r'); await h.arrastar([100, 100], [500, 400]);
    await pg.fill('#plantaAreaConh', '12'); await pg.click('.planta-sub button:has-text("Calibrar pela área")'); await pg.waitForTimeout(250);
    ok(Math.abs(await h.v(() => VC.dados.plantas[0].escala) - 0.01) < 1e-6, 'Escala pela área: 400 × 300 px com 12 m² → 0,01 m/px');
    await h.criarSala('Circ', 'Circulação');
    await h.tecla('r'); await h.arrastar([500, 100], [700, 400]); await h.criarSala('WC', 'Sanitários');
    await h.tecla('t'); await h.arrastar([600, 250], [300, 250]);
    ok(await pg.locator('button:has-text("Criar transferência")').isDisabled(), 'Transferência WC → Circulação bloqueada (Portaria 138-I, 1.2.2 f)');
    await pg.click('button:has-text("Inverter direção")'); await pg.waitForTimeout(250);
    await pg.fill('#plantaTrfQ', '45'); await pg.locator('#plantaTrfQ').press('Enter'); await pg.waitForTimeout(300);
    ok(await h.v(() => (VC.dados.transferencias || []).some(t => t.deNome === 'Circ' && t.paraNome === 'WC')), 'Inverter + Enter cria Circulação → WC');
    await h.tecla('d'); await h.clicar([200, 300]); await pg.fill('#ptQ', '107'); await pg.click('#ptCriar'); await pg.waitForTimeout(300);
    ok(await h.v(() => VC.dados.terminais.some(t => t.definicaoRef && VC.dados.espacos.find(e => e.id === t.definicaoRef.espacoId && e.nome === 'Circ') && t.Q === 107 && t.planta)), 'Terminal (D) cria a insuflação de 107 m³/h no ponto clicado');
    await h.tecla('l'); await h.clicar([150, 450]); await h.clicar([200, 450]); await h.clicar([200, 300]); await h.tecla('Enter');
    await pg.selectOption('#rmUtaRede', 'insuflacao'); await pg.fill('#rmUtaNome', 'UTA-Mez'); await pg.click('button:has-text("Criar UTA")'); await pg.waitForTimeout(250);
    await pg.click('button:has-text("Criar ramal")'); await pg.waitForTimeout(300);
    const r = await h.v(() => { const r = VC.dados.ramais[VC.dados.ramais.length - 1]; return { nome: r.nome, uta: !!r.utaRef, term: VC.dados.terminais.some(t => t.ramalRef === r.nome) }; });
    ok(r.uta && r.term, 'Ramal com UTA criada no cartão e o terminal associado', r);
    await h.tecla('v'); await h.clicar([200, 400]);
    await pg.fill('#pn-ramal-nome', 'Mez-P'); await pg.press('#pn-ramal-nome', 'Enter'); await pg.waitForTimeout(300);
    await h.passo('rede');
    ok(await h.v(() => [...document.querySelectorAll('#conteudoPasso input.ramal-nome')].some(i => i.value === 'Mez-P')), 'Nome do ramal mudado no desenho aparece na Tabela');
    await h.passo('levantamento'); await h.separador('planta'); await h.tecla('v'); await h.clicar([300, 350]);
    await pg.fill('#pn-sala-nome', 'Circulação Mez'); await pg.press('#pn-sala-nome', 'Enter'); await pg.waitForTimeout(300);
    ok(await h.v(() => VC.dados.transferencias.some(t => t.deNome === 'Circulação Mez') && VC.dados.terminais.some(t => (t.espacos || []).some(x => x.nome === 'Circulação Mez'))), 'Renomear o espaço leva o nome às transferências e aos terminais');
  },

  /* nome do ramal: o mesmo em todo o lado (Topologia, Tabela, desenho), em cascata */
  async nomes(pg, ok) {
    const h = ajudas(pg); await prepararPlanta(pg);
    await h.tecla('l'); await h.clicar([150, 450]); await h.clicar([400, 450]); await h.tecla('Enter');
    await pg.selectOption('#rmUtaRede', 'insuflacao'); await pg.fill('#rmUtaNome', 'UTA-N'); await pg.click('button:has-text("Criar UTA")'); await pg.waitForTimeout(250);
    await pg.click('button:has-text("Criar ramal")'); await pg.waitForTimeout(300);
    const nome0 = await h.v(() => VC.dados.ramais[VC.dados.ramais.length - 1].nome);
    // Topologia → Tabela e desenho
    await h.passo('associacao'); await h.separador('passo');
    const inT = pg.locator('input.topo-nome[value="' + nome0 + '"]'); await inT.scrollIntoViewIfNeeded(); await inT.fill('Norte-1'); await inT.press('Enter'); await pg.waitForTimeout(400);
    await h.passo('rede');
    ok(await h.v(() => [...document.querySelectorAll('#conteudoPasso input.ramal-nome')].some(i => i.value === 'Norte-1')), 'Nome mudado na Topologia aparece na Tabela');
    // Tabela → desenho
    await h.v(() => { const i = [...document.querySelectorAll('#conteudoPasso input.ramal-nome')].find(x => x.value === 'Norte-1'); let d = i && i.closest('details'); while (d) { d.open = true; d = d.parentElement.closest('details'); } i && i.scrollIntoView(); });
    const inR = pg.locator('#conteudoPasso input.ramal-nome[value="Norte-1"]').first(); await inR.fill('Norte-2'); await inR.press('Tab'); await pg.waitForTimeout(400);
    await h.passo('levantamento'); await h.separador('planta');
    ok(await h.v(() => [...document.querySelectorAll('.planta-ramal text')].some(t => /^Norte-2/.test(t.textContent))), 'Nome mudado na Tabela aparece no desenho');
    // desenho → Topologia
    await h.tecla('v'); await h.clicar([275, 450]);
    await pg.fill('#pn-ramal-nome', 'Norte-3'); await pg.press('#pn-ramal-nome', 'Enter'); await pg.waitForTimeout(300);
    await h.passo('associacao'); await h.separador('passo');
    ok(await pg.locator('input.topo-nome[value="Norte-3"]').count() === 1, 'Nome mudado no desenho aparece na Topologia');
  },

  /* PR 6: Esc, Enter e Delete coerentes; sem perder um pendente */
  async gestos(pg, ok) {
    const h = ajudas(pg); await prepararPlanta(pg);
    await h.tecla('r'); await h.arrastar([100, 100], [500, 400]);
    await h.tecla('p');
    ok(await h.v(() => VC.planta.ferramenta === 'ret' && !!VC.planta.pendente), 'Trocar de ferramenta com um pendente é recusado');
    await h.tecla('Escape'); ok(await h.v(() => !VC.planta.pendente), 'Esc cancela o pendente');
    await h.tecla('p'); for (const q of [[100, 100], [500, 100], [480, 300], [500, 400]]) await h.clicar(q);
    await h.tecla('Backspace'); ok(await h.v(() => VC.planta.rascunho.length === 3), 'Backspace apaga o último vértice');
    await h.clicar([100, 400]); await h.tecla('Enter'); ok(await h.v(() => !!VC.planta.pendente), 'Enter fecha o polígono');
    await h.criarSala('Circ G', 'Circulação');
    await h.tecla('r'); await h.arrastar([500, 100], [700, 400]); await h.criarSala('WC G', 'Sanitários');
    await h.tecla('v'); await h.clicar([300, 250]); await h.tecla('Escape');
    ok(await h.v(() => VC.planta.selecionado === null), 'Esc limpa a seleção');
    await h.tecla('t'); await h.arrastar([300, 250], [600, 250]); await pg.fill('#plantaTrfQ', '45'); await pg.locator('#plantaTrfQ').press('Enter'); await pg.waitForTimeout(300);
    await h.tecla('Delete');
    ok(await h.v(() => !(VC.dados.transferencias || []).some(t => t.deNome === 'Circ G')), 'Delete na seta selecionada remove a transferência');
    await h.passo('associacao');
    ok(await h.v(() => VC.planta.selecionado === null && VC.planta.trfSel === null && VC.planta.ramalSel === null), 'Mudar de passo limpa a seleção');
  },

  /* PR 7 + PR 8: avisos no desenho; desenho ligado à tabela */
  async coerencia(pg, ok) {
    const h = ajudas(pg); await prepararPlanta(pg);
    await h.tecla('r'); await h.arrastar([100, 100], [500, 400]); await h.criarSala('Sala T', 'Escritório', 2);
    const aviso = () => h.v(() => { VC.calculo.calcularTudo(); return VC.calculo.ultimo.findings.some(f => f.elemento === 'Sala T' && f.tipo === 'Área desenhada ≠ tabela'); });
    ok(!(await aviso()), 'Sala desenhada com a área da tabela: sem aviso');
    const idx = await h.v(() => VC.dados.espacos.findIndex(e => e.nome === 'Sala T'));
    await h.separador('passo');
    const inA = pg.locator('input[data-campo="A"][data-idx="' + idx + '"]'); await inA.scrollIntoViewIfNeeded(); await inA.fill('15'); await inA.press('Tab'); await pg.waitForTimeout(300);
    await h.separador('planta');
    ok(await aviso(), 'Área mudada na Tabela (15 m² vs 12 desenhados) → aviso');
    await h.tecla('v'); await h.clicar([300, 250]);
    ok(await h.v(() => !!document.querySelector('.planta-aviso-sala[data-sev="atencao"]')) && await pg.locator('.pn-falta li:has-text("Área desenhada")').count() > 0, 'O aviso aparece na sala (marca) e no painel');
    await pg.click('button:has-text("Aceitar a diferença")'); await pg.waitForTimeout(250);
    ok(!(await aviso()), 'Aceitar a diferença tira o aviso');
    await pg.locator('#plantaSVG').hover(); await pg.keyboard.press('Control+z'); await pg.waitForTimeout(250);
    ok(await aviso(), 'Ctrl+Z repõe o aviso');
  },

  /* Fase 0: painel único — seleção, edição com desfazer, herança do material, terminal */
  async painel(pg, ok) {
    const h = ajudas(pg); await prepararPlanta(pg);
    ok(await pg.locator('.pn[data-pn="piso"]').count() === 1, 'Sem seleção: painel do piso');
    await pg.fill('#pn-piso-H', '2.8'); await pg.press('#pn-piso-H', 'Enter'); await pg.waitForTimeout(250);
    await h.tecla('r'); await h.arrastar([100, 100], [500, 400]); await h.criarSala('Sala P', 'Escritório', 3);
    await h.tecla('v'); await h.clicar([300, 250]);
    ok(await pg.locator('.pn[data-pn="sala"] .pn-cab b:has-text("Sala P")').count() === 1, 'Clicar na sala abre o painel da sala');
    const ph = await pg.getAttribute('#pn-sala-H', 'placeholder');
    ok(ph === '2,8', 'Pé-direito vazio: proposto pelo piso (2,8 m)', ph);
    await pg.selectOption('#pn-sala-tipo', 'Sala de reuniões'); await pg.waitForTimeout(300);
    ok(await h.v(() => VC.dados.espacos.find(e => e.nome === 'Sala P').tipo === 'Sala de reuniões'), 'Tipo mudado no painel fica nos dados');
    await pg.locator('#plantaSVG').hover(); await pg.keyboard.press('Control+z'); await pg.waitForTimeout(300);
    ok(await h.v(() => VC.dados.espacos.find(e => e.nome === 'Sala P').tipo === 'Escritório'), 'Ctrl+Z desfaz a alteração feita no painel');
    // ramal e sub-ramal: o material passa ao sub-ramal
    await h.tecla('l'); await h.clicar([150, 450]); await h.clicar([600, 450]); await h.tecla('Enter');
    await pg.selectOption('#rmUtaRede', 'insuflacao'); await pg.fill('#rmUtaNome', 'UTA-P'); await pg.click('button:has-text("Criar UTA")'); await pg.waitForTimeout(250);
    await pg.click('button:has-text("Criar ramal")'); await pg.waitForTimeout(300);
    await h.tecla('l'); await h.clicar([400, 450]); await h.clicar([400, 550]); await h.tecla('Enter');
    await pg.click('button:has-text("Criar ramal")'); await pg.waitForTimeout(300);
    const nomes = await h.v(() => VC.dados.ramais.map(r => [r.nome, r.parente || '']));
    await h.tecla('v'); await h.clicar([250, 450]);
    ok(await pg.locator('.pn[data-pn="ramal"]').count() === 1, 'Clicar no ramal abre o painel do ramal');
    await pg.selectOption('#pn-ramal-material', 'Alumínio'); await pg.waitForTimeout(300);
    const filho = await h.v(() => { const f = VC.dados.ramais.find(r => r.parente); return f ? VC.calculo.rugosidadeDe(f) : null; });
    ok(filho === 0.05, 'O sub-ramal herda o material do ramal-pai (0,05 mm)', { filho, nomes });
    await h.clicar([400, 520]);
    ok(await pg.locator('.pn[data-pn="ramal"] .pn-origem:has-text("herdado")').count() > 0, 'No sub-ramal o material aparece como herdado');
    // terminal
    await h.tecla('d'); await h.clicar([200, 300]); await pg.fill('#ptQ', '90'); await pg.click('#ptCriar'); await pg.waitForTimeout(300);
    await h.tecla('v'); await h.clicar([200, 300]);
    ok(await pg.locator('.pn[data-pn="terminal"]').count() === 1, 'Clicar no terminal abre o painel do terminal');
    await pg.fill('#pn-terminal-Q', '120'); await pg.press('#pn-terminal-Q', 'Enter'); await pg.waitForTimeout(300);
    ok(await h.v(() => { const t = VC.dados.terminais.find(x => x.planta && Math.abs(x.planta.x - 200) < 2); return t && t.Q === 120 && t.espacos[0].Q_parcela === 120; }), 'Caudal do terminal mudado no painel (120 m³/h)');
    await h.tecla('Escape');
    ok(await pg.locator('.pn[data-pn="piso"]').count() === 1, 'Esc volta ao painel do piso');
  },

  /* PR 9: nome legível numa sala em L; zona útil nítida; Entrega recortada */
  async representacao(pg, ok) {
    const h = ajudas(pg);
    await pg.evaluate(() => {
      const t = VC.ui.toast; VC.ui.toast = function (m) { (window.__t = window.__t || []).push(m); return t.apply(this, arguments); };
      VC.dados.plantas = []; VC.planta.piso = null;
      const b = document.createElement('canvas'); b.width = 4000; b.height = 3000; const g = b.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 4000, 3000);
      g.strokeStyle = '#000'; for (let i = 0; i < 60; i++) { g.beginPath(); g.moveTo(1200 + i * 4, 900); g.lineTo(1200 + i * 4, 1500); g.stroke(); }
      window.__big = b.toDataURL('image/png');
    });
    await h.passo('levantamento'); await h.separador('planta');
    await h.v(() => VC.planta.usarImagem(window.__big)); await pg.waitForTimeout(1000);
    ok(await h.v(() => VC.planta.pisoAtual().w === 2400), 'Imagem 4000 px carregada a 2400 px');
    await pg.click('button:has-text("Escolher a zona útil")'); await pg.waitForTimeout(250);
    await h.arrastar([640, 460], [1280, 980]); await pg.click('button:has-text("Usar esta zona")'); await pg.waitForTimeout(1200);
    const w = await h.v(() => { const p = VC.planta.pisoAtual(); return [p.w, p.h]; });
    ok(Math.max(...w) === 2400 && w[0] < 2500, 'Zona útil (640 × 520) relida a 2400 px no lado maior', w);
    await h.v(() => { VC.dados.plantas[0].escala = 0.004; VC.planta.redesenhar(); });
    await h.tecla('p'); for (const q of [[200, 200], [1900, 200], [1900, 600], [700, 600], [700, 1300], [200, 1300]]) await h.clicar(q);
    await h.tecla('Enter'); await h.criarSala('Circulação em L do mezanino norte', 'Circulação');
    const n = await h.v(() => { const e = VC.dados.espacos.find(x => x.nome === 'Circulação em L do mezanino norte'); const t = document.querySelector('.planta-rotulo[data-esp="' + e.id + '"] text'); const bb = t.getBBox(); return [[bb.x, bb.y], [bb.x + bb.width, bb.y], [bb.x, bb.y + bb.height], [bb.x + bb.width, bb.y + bb.height]].every(c => VC.planta.dentro(c, e.planta.pts)) && !VC.planta.dentro(VC.planta.centro(e.planta.pts), e.planta.pts); });
    ok(n, 'Sala em L: o nome fica todo dentro da sala (o centro geométrico fica fora)');
    await h.passo('relatorios');
    ok(await h.v(() => { const s = document.querySelector('.entrega-planta svg'); const vb = s && s.getAttribute('viewBox').split(' ').map(Number); return !!vb && vb[2] < 2400 && !s.querySelector('.planta-aviso-sala'); }), 'Entrega: planta recortada à zona desenhada e sem marcas de aviso');
  }
};

(async () => {
  const srv = await servidor();
  const base = 'http://127.0.0.1:' + srv.address().port + '/index.html';
  const browser = await chromium.launch();
  let falhas = 0, total = 0;
  for (const [nome, fn] of Object.entries(CENARIOS)) {
    if (SO && SO !== nome) continue;
    const pg = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const erros = [];
    pg.on('pageerror', e => erros.push(String(e.message)));
    pg.on('dialog', d => d.accept(d.defaultValue()));
    await pg.goto(base); await pg.waitForTimeout(2500);
    console.log('\n▸ ' + nome);
    const ok = (cond, texto, extra) => { total++; if (cond) console.log('  ✓ ' + texto); else { falhas++; console.log('  ✗ ' + texto + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); } };
    try { await fn(pg, ok); } catch (e) { falhas++; total++; console.log('  ✗ o cenário parou: ' + String(e.message).split('\n')[0]); }
    if (erros.length) { falhas++; console.log('  ✗ erros JS: ' + erros.join(' | ')); }
    if (IMAGENS) { fs.mkdirSync(IMAGENS, { recursive: true }); await pg.screenshot({ path: path.join(IMAGENS, nome + '.png') }); }
    await pg.close();
  }
  await browser.close(); srv.close();
  console.log('\n' + (falhas ? '✗ ' + falhas + ' de ' + total + ' verificações falharam' : '✓ ' + total + ' verificações dos cenários da planta passaram'));
  process.exit(falhas ? 1 : 0);
})();
