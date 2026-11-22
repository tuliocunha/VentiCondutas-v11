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
    await h.tecla('x'); await h.arrastar([600, 250], [300, 250]);
    ok(await pg.locator('button:has-text("Criar transferência")').isDisabled(), 'Transferência WC → Circulação bloqueada (Portaria 138-I, 1.2.2 f)');
    await pg.click('button:has-text("Inverter direção")'); await pg.waitForTimeout(250);
    await pg.fill('#plantaTrfQ', '45'); await pg.locator('#plantaTrfQ').press('Enter'); await pg.waitForTimeout(300);
    ok(await h.v(() => (VC.dados.transferencias || []).some(t => t.deNome === 'Circ' && t.paraNome === 'WC')), 'Inverter + Enter cria Circulação → WC');
    await h.tecla('d'); await h.clicar([200, 300]); await pg.fill('#ptQ', '107'); await pg.click('#ptCriar'); await pg.waitForTimeout(300);
    ok(await h.v(() => VC.dados.terminais.some(t => t.definicaoRef && VC.dados.espacos.find(e => e.id === t.definicaoRef.espacoId && e.nome === 'Circ') && t.Q === 107 && t.planta)), 'Terminal (D) cria a insuflação de 107 m³/h no ponto clicado');
    await h.tecla('l'); await h.clicar([150, 450]); await h.clicar([200, 450]); await h.clicar([200, 300]); await h.tecla('Enter');
    await pg.selectOption('#rmUtaRede', 'insuflacao'); await pg.fill('#rmUtaNome', 'UTA-Mez'); await pg.click('button:has-text("Criar equipamento")'); await pg.waitForTimeout(250);
    await pg.click('button:has-text("Criar ramal")'); await pg.waitForTimeout(300);
    const r = await h.v(() => { const r = VC.dados.ramais[VC.dados.ramais.length - 1]; return { nome: r.nome, uta: !!r.utaRef, term: VC.dados.terminais.some(t => t.ramalRef === r.nome) }; });
    ok(r.uta && r.term, 'Ramal com UTA criada no cartão e o terminal associado', r);
    await h.tecla('v'); await h.clicar([200, 430]); await pg.evaluate(() => { if (VC.planta.trocoSel) { VC.planta.trocoSel = null; VC.planta.redesenhar(); } }); await pg.waitForTimeout(150);
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
    await pg.selectOption('#rmUtaRede', 'insuflacao'); await pg.fill('#rmUtaNome', 'UTA-N'); await pg.click('button:has-text("Criar equipamento")'); await pg.waitForTimeout(250);
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
    await h.tecla('x'); await h.arrastar([300, 250], [600, 250]); await pg.fill('#plantaTrfQ', '45'); await pg.locator('#plantaTrfQ').press('Enter'); await pg.waitForTimeout(300);
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
    await pg.selectOption('#rmUtaRede', 'insuflacao'); await pg.fill('#rmUtaNome', 'UTA-P'); await pg.click('button:has-text("Criar equipamento")'); await pg.waitForTimeout(250);
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

  /* menu «Ferramentas»: nome e atalho de cada ícone; escolher no menu = ícone = tecla */
  async menu(pg, ok) {
    const h = ajudas(pg); await prepararPlanta(pg);
    await pg.click('#plantaMenuBt'); await pg.waitForTimeout(200);
    const linhas = await h.v(() => [...document.querySelectorAll('#plantaMenu .pm-item')].map(b => [b.querySelector('.pm-rot').textContent, (b.querySelector('kbd') || {}).textContent || '']));
    const ferr = await h.v(() => VC.planta.FERRAMENTAS.map(f => [f[2], VC.planta.TECLAS[f[0]] || '']));
    ok(ferr.every(([n, k]) => linhas.some(([a, b]) => a === n && b === k)), 'O menu lista todas as ferramentas com o nome e a tecla', { linhas });
    ok(linhas.some(([a, b]) => a === 'Desfazer' && b === 'Ctrl+Z') && linhas.some(([a, b]) => /Cancelar/.test(a) && b === 'Esc'), 'O menu lista os comandos (Ctrl+Z, Esc…)');
    await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('ArrowDown');
    const foco = await h.v(() => document.activeElement.querySelector('.pm-rot').textContent);
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(250);
    const st = await h.v(() => [(VC.planta.FERRAMENTAS.find(f => f[0] === VC.planta.ferramenta) || [])[2], document.getElementById('plantaMenu').hidden]);
    ok(st[0] === foco && st[1], 'Setas + Enter escolhem a ferramenta e fecham o menu', [foco, st]);
    await pg.click('#plantaMenuBt'); await pg.click('#plantaMenu .pm-item:has-text("Retângulo")'); await pg.waitForTimeout(200);
    ok(await h.v(() => VC.planta.ferramenta === 'ret'), 'Clique em «Retângulo» no menu = tecla R');
    await pg.click('#plantaMenuBt'); await pg.keyboard.press('Escape'); await pg.waitForTimeout(150);
    ok(await pg.locator('#plantaMenu').isHidden() && await h.v(() => VC.planta.ferramenta === 'ret'), 'Esc fecha o menu sem mudar de ferramenta');
    await pg.click('#plantaMenuBt'); await h.clicar([800, 600]); await pg.waitForTimeout(150);
    ok(await pg.locator('#plantaMenu').isHidden(), 'Clicar fora fecha o menu');
  },

  /* Fase 1: editar a geometria (vértices, arestas, mover) e o tipo de sistema */
  async edicao(pg, ok) {
    const h = ajudas(pg); await prepararPlanta(pg);
    await h.tecla('r'); await h.arrastar([100, 100], [500, 400]); await h.criarSala('Sala E', 'Escritório', 2);
    const sala = () => h.v(() => { const e = VC.dados.espacos.find(x => x.nome === 'Sala E'); return { n: e.planta.pts.length, pts: e.planta.pts, A: e.A }; });
    await h.tecla('v'); await h.clicar([300, 250]);
    ok(await pg.locator('.pe .pe-v').count() === 4 && await pg.locator('.pe .pe-m').count() === 4, 'Sala selecionada: 4 vértices e 4 alças de meio de aresta');
    await h.arrastar([500, 400], [500, 500]);
    let e = await sala();
    ok(e.pts.some(q => q[0] === 500 && q[1] === 500) && Math.abs(e.A - 14) < 0.05, 'Arrastar um vértice muda o desenho e a área acompanha (12 → 14 m²)', e);
    await h.clicar([300, 250]);
    ok(await h.v(() => VC.planta.selecionado != null && !!document.querySelector('.pn[data-pn="sala"]')), 'Clicar dentro da sala selecionada mantém a seleção');
    await pg.locator('#plantaSVG').hover(); await pg.keyboard.press('Control+z'); await pg.waitForTimeout(300);
    e = await sala();
    ok(e.pts.some(q => q[0] === 500 && q[1] === 400) && Math.abs(e.A - 12) < 0.05, 'Ctrl+Z repõe o vértice e a área', e);
    await h.clicar([300, 250]); await h.clicar([300, 100]);
    e = await sala(); ok(e.n === 5, 'Clicar na alça ○ acrescenta um vértice no meio da aresta', e);
    await h.arrastar([300, 100], [300, 60]);
    e = await sala(); ok(e.pts.some(q => q[0] === 300 && q[1] === 60), 'O vértice novo arrasta-se como os outros', e);
    await h.clicar([300, 60]); await h.tecla('Delete');
    e = await sala(); ok(e.n === 4 && !e.pts.some(q => q[1] === 60), 'Clique no vértice + Delete apaga-o', e);
    // Shift: ângulo reto
    const [x0, y0] = await h.ecra(500, 400), [x1, y1] = await h.ecra(512, 470);
    await pg.mouse.move(x0, y0); await pg.mouse.down(); await pg.keyboard.down('Shift'); await pg.mouse.move(x1, y1, { steps: 8 }); await pg.mouse.up(); await pg.keyboard.up('Shift'); await pg.waitForTimeout(250);
    e = await sala(); ok(e.pts.some(q => q[0] === 500 && Math.abs(q[1] - 470) < 1), 'Shift ao arrastar: o vértice fica em ângulo reto (x mantém-se)', e);
    await pg.keyboard.press('Control+z'); await pg.waitForTimeout(250);
    // mover a sala inteira (o terminal vai junto)
    await h.tecla('d'); await h.clicar([200, 200]); await pg.fill('#ptQ', '60'); await pg.click('#ptCriar'); await pg.waitForTimeout(300);
    await h.tecla('v'); await h.clicar([300, 300]); await h.arrastar([300, 300], [350, 330]);
    e = await sala();
    const t = await h.v(() => { const t = VC.dados.terminais.find(x => (x.espacos || []).some(y => y.nome === 'Sala E') && x.planta); return t && [t.planta.x, t.planta.y]; });
    ok(e.pts.some(q => q[0] === 150 && q[1] === 130) && t && t[0] === 250 && t[1] === 230, 'Arrastar o interior move a sala e o terminal dela', { e, t });
    // segmento
    await h.arrastar([550, 200], [600, 200]);
    e = await sala(); ok(e.pts.filter(q => q[0] === 600).length === 2, 'Arrastar uma aresta move o segmento inteiro', e);
    // ramal: tipo de sistema VMC, vértice novo, inverter
    await h.tecla('l'); await h.clicar([100, 600]); await h.clicar([700, 600]); await h.tecla('Enter');
    await pg.selectOption('#rmUtaTipo', 'VMC'); await pg.fill('#rmUtaNome', 'VMC-Mez'); await pg.click('button:has-text("Criar equipamento")'); await pg.waitForTimeout(250);
    const par = await h.v(() => { const a = VC.dados.utas.find(u => u.nome === 'VMC-Mez (insuflação)'), b = VC.dados.utas.find(u => u.nome === 'VMC-Mez (extração)'); return !!(a && b && a.uvbPar === b.id && b.uvbPar === a.id && a.tipoSistema === 'VMC' && a.tipoUV === 'BVU_HRS'); });
    ok(par, 'Tipo VMC cria as duas metades (insuflação e extração) em par UVB');
    await pg.click('button:has-text("Criar ramal")'); await pg.waitForTimeout(300);
    await h.tecla('v'); await h.clicar([250, 600]); await pg.evaluate(() => { if (VC.planta.trocoSel) { VC.planta.trocoSel = null; VC.planta.redesenhar(); } }); await pg.waitForTimeout(150);
    ok(await h.v(() => { const s = document.getElementById('pn-ramal-tipoSistema'); return !!s && s.value === 'VMC'; }), 'No painel do ramal principal aparece o tipo de sistema (VMC)');
    await h.arrastar([400, 600], [400, 650]);
    const rm = await h.v(() => { const r = VC.dados.ramais[VC.dados.ramais.length - 1]; return r.planta.pts; });
    ok(rm.length === 3 && rm[1][0] === 400 && rm[1][1] === 650, 'Arrastar a alça ○ do ramal cria um vértice e dobra o traçado', rm);
    await pg.click('.pn-acoes button:has-text("Inverter o sentido")'); await pg.waitForTimeout(250);
    ok(await h.v(() => { const p = VC.dados.ramais[VC.dados.ramais.length - 1].planta.pts; return p[0][0] === 700 && p[2][0] === 100; }), 'Inverter o sentido do ramal');
    ok(await h.v(() => !document.querySelector('.planta-vert')), 'As alças antigas (só cantos) deixaram de aparecer');
  },

  /* sentido do ar automático: setas nos ramais, pontas nos terminais, equipamento com ar exterior / rejeição */
  async sentido(pg, ok) {
    const h = ajudas(pg); await prepararPlanta(pg);
    await h.tecla('r'); await h.arrastar([100, 100], [500, 400]); await h.criarSala('Sala A', 'Escritório', 2);
    const criar = async (y, rede, tipo, nome) => {
      await h.tecla('l'); await h.clicar([100, y]); await h.clicar([700, y]); await h.tecla('Enter');
      await pg.evaluate(() => { const t = document.getElementById('rmUtaTipo'); const d = t && t.closest('details'); if (d) d.open = true; });
      await pg.selectOption('#rmUtaTipo', tipo); await pg.selectOption('#rmUtaRede', rede); await pg.fill('#rmUtaNome', nome); await pg.click('button:has-text("Criar equipamento")'); await pg.waitForTimeout(250);
      await pg.click('button:has-text("Criar ramal")'); await pg.waitForTimeout(300);
    };
    await criar(500, 'insuflacao', 'VAN', 'VAN-A'); await criar(600, 'extracao', 'VEG', 'VEG-A');
    const ang = await h.v(() => [...document.querySelectorAll('.planta-seta-ar')].map(p => [p.dataset.sentido, Number((p.getAttribute('transform').match(/rotate\(([-\d.]+)\)/) || [])[1])]));
    ok(ang.some(([s, a]) => s === '1' && Math.abs(a) < 1) && ang.some(([s, a]) => s === '-1' && Math.abs(Math.abs(a) - 180) < 1), 'Insuflação: setas no sentido do traçado; extração: ao contrário (para o equipamento)', ang.slice(0, 6));
    const eq = await h.v(() => [...document.querySelectorAll('.planta-equip')].map(g => g.dataset.tipo + ':' + g.dataset.lig).sort());
    ok(eq.join() === 'VAN:ar-exterior,VEG:rejeicao', 'Equipamento no início do ramal com a ligação ao exterior do tipo (VAN capta, VEG rejeita)', eq);
    await h.tecla('v'); await h.clicar([300, 500]); await pg.evaluate(() => { if (VC.planta.trocoSel) { VC.planta.trocoSel = null; VC.planta.redesenhar(); } }); await pg.waitForTimeout(150); await pg.click('.pn-acoes button:has-text("Inverter o sentido")'); await pg.waitForTimeout(250);
    const inv = await h.v(() => { const r = VC.dados.ramais.find(x => x.rede === 'insuflacao'); return r.planta.pts[0][0]; });
    ok(inv === 700 && await h.v(() => [...document.querySelectorAll('.planta-equip')].some(g => g.dataset.tipo === 'VAN' && Number(g.querySelector('rect').getAttribute('x')) > 690)), 'Inverter o sentido muda as setas e leva o equipamento para a outra ponta');
    ok(await h.v(() => { const l = document.querySelector('.planta-leg-redes'); return !!l && /SUP/.test(l.textContent) && /ETA/.test(l.textContent) && /ODA/.test(l.textContent) && /EHA/.test(l.textContent); }), 'Legenda com as redes do piso (SUP, ETA) e ar exterior / rejeição (ODA, EHA)');
    await h.tecla('Escape'); await h.tecla('Escape'); await pg.waitForTimeout(150);
    await pg.evaluate(() => { const d = document.querySelector('.pn[data-pn="piso"] details'); if (d) d.open = true; });
    await pg.evaluate(() => { const i = document.getElementById('pn-piso-cor_SUP'); i.value = '#aa00aa'; i.dispatchEvent(new Event('change')); }); await pg.waitForTimeout(250);
    ok(await h.v(() => [...document.querySelectorAll('.planta-troco')].some(x => x.getAttribute('stroke') === '#aa00aa')), 'Cor da insuflação mudada no painel do piso: as condutas mudam');
    await pg.click('.pn[data-pn="piso"] .pn-repor'); await pg.waitForTimeout(250);
    ok(await h.v(() => ![...document.querySelectorAll('.planta-troco')].some(x => x.getAttribute('stroke') === '#aa00aa') && !(VC.dados.params.paletaRedes || {}).SUP), '↺ repõe a cor da norma');
    await pg.click('#plantaMenuBt'); await pg.click('#plantaMenu .pm-item:has-text("sentido do ar")'); await pg.waitForTimeout(200);
    ok(await pg.locator('.planta-sentido').count() === 0, 'O menu ☰ esconde o sentido do ar');
  },

  /* textos proporcionais e sem sobreposição (exemplo Degrade, planta afastada) */
  async textos(pg, ok) {
    const h = ajudas(pg);
    await pg.evaluate(async () => { await VC._carregarExemploDeFicheiro(['exemplos/degrade-21nov26-corrigido.json'], 'x'); VC.nav.irPasso('rede'); VC.nav.setVista('planta'); VC.planta.setPiso('piso-p0'); });
    await pg.waitForTimeout(1200);   // a vista ajusta-se e o desenho refaz-se no zoom final
    const sobre = () => h.v(() => {
      const T = [...document.querySelectorAll('#plantaSVG .planta-ramal > text, #plantaSVG .planta-trf text, #plantaSVG .planta-rotulo text')].filter(t => t.getAttribute('visibility') !== 'hidden');
      const B = T.map(t => { const b = t.getBoundingClientRect(), g = t.closest('[data-esp],[data-r],[data-trf]'); return [b.left, b.top, b.right, b.bottom, g ? g.outerHTML.slice(0, 40) : '']; });
      let n = 0; for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) { const a = B[i], b = B[j]; if (a[4] !== b[4] && a[0] < b[2] - 1 && a[2] > b[0] + 1 && a[1] < b[3] - 1 && a[3] > b[1] + 1) n++; }
      return n;
    });
    const n = await sobre();
    ok(n === 0, 'Planta afastada: nenhum nome de ramal, Ø, transferência ou nome de sala tapa outro', n);
    const fs = await h.v(() => { const t = [...document.querySelectorAll('#plantaSVG .planta-ramal > text')].find(x => !/^Ø/.test(x.textContent)); return parseFloat(t.getAttribute('font-size')) * VC.planta.zoom; });
    ok(fs >= 7.4 && fs < 11.5, 'Afastada, o nome do ramal fica menor que o tamanho fixo antigo (11,5 px) e legível', fs);
    await pg.click('#plantaMenuBt'); await pg.click('#plantaMenu .pm-item:has-text("Textos maiores")'); await pg.waitForTimeout(300);
    const fs2 = await h.v(() => { const t = [...document.querySelectorAll('#plantaSVG .planta-ramal > text')].find(x => !/^Ø/.test(x.textContent)); return parseFloat(t.getAttribute('font-size')) * VC.planta.zoom; });
    ok(Math.abs(fs2 / fs - 1.1) < 0.02 && await h.v(() => VC.dados.params.escalaTextos === 1.1), '«Textos maiores» no menu: +10 % e fica no projeto', [fs, fs2]);
    ok(await sobre() === 0, 'Com textos maiores continua sem sobreposições (escondem-se mais)');
    await pg.click('#plantaMenuBt'); await pg.click('#plantaMenu .pm-item:has-text("automático")'); await pg.waitForTimeout(200);
    ok(await h.v(() => VC.dados.params.escalaTextos === undefined), 'Volta ao tamanho automático');
  },

  /* Fase 1B: encaixe, Shift, Alt, comprimento escrito, grelha, medir */
  async precisao(pg, ok) {
    const h = ajudas(pg); await prepararPlanta(pg);
    await h.tecla('r'); await h.arrastar([100, 100], [500, 400]); await h.criarSala('Sala P', 'Escritório', 2);
    await h.tecla('p');
    let [x, y] = await h.ecra(504, 97); await pg.mouse.move(x, y); await pg.waitForTimeout(120);
    ok(await h.v(() => { const g = document.getElementById('plantaEncaixe'); return !!g && /vértice/.test(g.textContent); }), 'Perto de um canto aparece o marcador «vértice»');
    await pg.mouse.click(x, y); await pg.waitForTimeout(200);
    ok(await h.v(() => JSON.stringify(VC.planta.rascunho[0]) === '[500,100]'), 'O clique encaixa no canto (500, 100)', await h.v(() => VC.planta.rascunho));
    [x, y] = await h.ecra(700, 104); await pg.mouse.move(x, y); await pg.waitForTimeout(100);
    await pg.keyboard.type('3'); await pg.waitForTimeout(80);
    ok(await h.v(() => { const c = document.getElementById('plantaComprimento'); return !!c && /3/.test(c.textContent); }), 'Ao escrever um número aparece a caixa do comprimento');
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(250);
    const p2 = await h.v(() => VC.planta.rascunho[1]);
    ok(p2 && Math.abs(Math.hypot(p2[0] - 500, p2[1] - 100) - 300) < 0.5, '«3» + Enter: o ponto seguinte fica a 3,00 m na direção do rato', p2);
    // Shift: ângulo reto
    [x, y] = await h.ecra(810, 300);
    await pg.keyboard.down('Shift'); await pg.mouse.move(x, y); await pg.mouse.click(x, y); await pg.keyboard.up('Shift'); await pg.waitForTimeout(200);
    const p3 = await h.v(() => VC.planta.rascunho[2]);
    ok(p3 && Math.abs(p3[0] - p2[0]) < 0.01, 'Shift: o ponto fica na vertical do anterior (ângulo reto)', [p2, p3]);
    // Alt: sem encaixe
    [x, y] = await h.ecra(503, 404);
    await pg.keyboard.down('Alt'); await pg.mouse.move(x, y); await pg.mouse.click(x, y); await pg.keyboard.up('Alt'); await pg.waitForTimeout(200);
    const p4 = await h.v(() => VC.planta.rascunho[3]);
    ok(p4 && Math.abs(p4[0] - 503) < 1 && Math.abs(p4[1] - 404) < 1, 'Alt premido: o ponto fica onde se clicou (sem encaixe)', p4);
    await h.tecla('Escape');
    // grelha
    await h.tecla('g'); await h.tecla('p'); await h.clicar([623, 573]);
    ok(await h.v(() => JSON.stringify(VC.planta.rascunho[0]) === '[600,550]'), 'Grelha (G) de 0,50 m: o ponto vai para (600, 550)', await h.v(() => VC.planta.rascunho[0]));
    await h.tecla('Escape'); await h.tecla('g');
    // medir
    await h.tecla('t'); await h.clicar([100, 100]); await h.clicar([500, 100]); await h.clicar([500, 400]); await h.tecla('Enter');
    ok(await h.v(() => Math.abs(VC.planta.medidaTotal() - 7) < 1e-6 && VC.planta.medidaFim && /total 7[.,]00 m/.test(document.getElementById('plantaMedicao').textContent)), 'Medir: 4,00 + 3,00 m, total 7,00 m no desenho', await h.v(() => [VC.planta.medida, VC.planta.medidaTotal(), VC.planta.medidaFim, (document.getElementById('plantaMedicao') || {}).textContent]));
    ok(await h.v(() => VC.dados.espacos.filter(e => e.planta).length === 1 && !VC.planta.pendente), 'Medir não cria nada');
    await h.tecla('Escape');
    ok(await h.v(() => VC.planta.medida.length === 0), 'Esc limpa a medição');
    // arrastar vértice: encaixa no canto de outra sala
    await h.tecla('r'); await h.arrastar([520, 120], [700, 400]); await h.criarSala('Sala Q', 'Escritório', 1);
    await h.tecla('v'); await h.clicar([600, 250]); await h.arrastar([520, 120], [504, 103]);
    ok(await h.v(() => VC.dados.espacos.find(e => e.nome === 'Sala Q').planta.pts.some(q => q[0] === 500 && q[1] === 100)), 'Ao arrastar um vértice ele encaixa no canto da sala vizinha');
    // duplicar e rodar
    await h.clicar([300, 250]); await pg.keyboard.press('Control+d'); await pg.waitForTimeout(300);
    const dup = await h.v(() => { const e = VC.dados.espacos.find(x => x.nome === 'Sala P (2)'), o = VC.dados.espacos.find(x => x.nome === 'Sala P'); return e && { pts: e.planta.pts, A: e.A, N: e.N, H: e.H, tipo: e.tipo, sel: VC.planta.selecionado === e.id, oH: o.H }; });
    ok(dup && dup.pts[0][0] === 200 && dup.pts[0][1] === 200 && Math.abs(dup.A - 12) < 0.01 && dup.N === 2 && dup.H === dup.oH && dup.sel, 'Ctrl+D duplica a sala 1 m ao lado, com o mesmo tipo, N e pé-direito, e seleciona a cópia', dup);
    await pg.click('.pn-acoes button:has-text("Rodar 90°")'); await pg.waitForTimeout(250);
    const rod = await h.v(() => { const e = VC.dados.espacos.find(x => x.nome === 'Sala P (2)'); const xs = e.planta.pts.map(q => q[0]), ys = e.planta.pts.map(q => q[1]); return [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), e.A]; });
    ok(Math.abs(rod[0] - 300) < 0.5 && Math.abs(rod[1] - 400) < 0.5 && Math.abs(rod[2] - 12) < 0.01, 'Rodar 90°: 4 × 3 m passa a 3 × 4 m, a área mantém-se', rod);
    await pg.locator('#plantaSVG').hover(); await pg.keyboard.press('Control+z'); await pg.waitForTimeout(250);
    ok(await h.v(() => { const e = VC.dados.espacos.find(x => x.nome === 'Sala P (2)'); return e && e.planta.pts[0][0] === 200; }), 'Ctrl+Z desfaz a rotação');
  },

  /* atalhos e gestos ao estilo SketchUp / AutoCAD */
  async cad(pg, ok) {
    const h = ajudas(pg); await prepararPlanta(pg);
    const fer = () => h.v(() => VC.planta.ferramenta);
    await h.tecla('x'); ok(await fer() === 'trf', 'X: Transferência');
    await h.tecla('t'); ok(await fer() === 'medir', 'T: Medir (fita métrica do SketchUp)');
    await h.tecla(' '); ok(await fer() === 'sel', 'Espaço (toque): Selecionar, como no SketchUp');
    // retângulo por dois cliques e por «4;3»
    await h.tecla('r'); await h.clicar([100, 100]);
    let [x, y] = await h.ecra(400, 300); await pg.mouse.move(x, y); await pg.waitForTimeout(80);
    await pg.keyboard.type('4;3'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(250);
    const perto = (A, B) => !!A && A.length === B.length && A.every((q, i) => Math.abs(q[0] - B[i][0]) < 0.05 && Math.abs(q[1] - B[i][1]) < 0.05);
    ok(perto(await h.v(() => VC.planta.pendente), [[100, 100], [500, 100], [500, 400], [100, 400]]), 'R + clique + «4;3» Enter: retângulo de 4 × 3 m', await h.v(() => VC.planta.pendente));
    await h.criarSala('Sala C', 'Escritório', 1);
    await h.tecla('r'); await h.clicar([600, 100]); await h.clicar([800, 300]);
    ok(perto(await h.v(() => VC.planta.pendente), [[600, 100], [800, 100], [800, 300], [600, 300]]), 'R por dois cliques (canto e canto oposto)', await h.v(() => VC.planta.pendente));
    await h.tecla('Escape');
    // mover 2 m com distância escrita
    await h.tecla('m'); await h.clicar([300, 250]);
    [x, y] = await h.ecra(300, 500); await pg.mouse.move(x, y); await pg.waitForTimeout(80);
    await pg.keyboard.type('2'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(250);
    ok(await h.v(() => { const e = VC.dados.espacos.find(x => x.nome === 'Sala C'); return e.planta.pts[0][0] === 100 && e.planta.pts[0][1] === 300; }), 'M: clique na sala, rato para baixo, «2» Enter → a sala desce 2,00 m');
    // mover com Ctrl = copiar
    await h.clicar([300, 450]); [x, y] = await h.ecra(800, 450);
    await pg.keyboard.down('Control'); await pg.mouse.move(x, y); await pg.mouse.click(x, y); await pg.keyboard.up('Control'); await pg.waitForTimeout(300);
    ok(await h.v(() => { const c = VC.dados.espacos.find(x => x.nome === 'Sala C (2)'); return c && c.planta.pts[0][0] === 600 && c.planta.pts[0][1] === 300 && VC.dados.espacos.find(x => x.nome === 'Sala C').planta.pts[0][0] === 100; }), 'M com Ctrl: copia a sala para o destino e o original fica');
    // rodar com ângulo escrito
    await h.tecla('q'); await h.clicar([300, 450]); await pg.keyboard.type('90'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(250);
    ok(await h.v(() => { const e = VC.dados.espacos.find(x => x.nome === 'Sala C'); const xs = e.planta.pts.map(q => q[0]), ys = e.planta.pts.map(q => q[1]); return Math.abs(Math.max(...xs) - Math.min(...xs) - 300) < 0.5 && Math.abs(Math.max(...ys) - Math.min(...ys) - 400) < 0.5; }), 'Q: clique na sala, «90» Enter → rodada 90°');
    // apagar
    await h.tecla('e'); await h.clicar([700, 400]);
    ok(await h.v(() => { const c = VC.dados.espacos.find(x => x.nome === 'Sala C (2)'); return c && !c.planta; }), 'E: clique apaga o desenho da sala (fica na tabela)');
    await pg.locator('#plantaSVG').hover(); await pg.keyboard.press('Control+z'); await pg.waitForTimeout(250);
    ok(await h.v(() => !!VC.dados.espacos.find(x => x.nome === 'Sala C (2)').planta), 'Ctrl+Z repõe o desenho apagado');
    // F8 orto, F3, F9, Shift+Z
    await h.tecla('F8'); ok(await h.v(() => VC.planta.orto && /ORTO/.test(document.getElementById('plantaEstado').textContent)), 'F8 liga o orto (indicado na barra de estado)');
    await h.tecla('p'); await h.clicar([150, 600]); await h.clicar([400, 640]);
    ok(await h.v(() => Math.abs(VC.planta.rascunho[1][1] - VC.planta.rascunho[0][1]) < 1e-9), 'Com orto, o segundo ponto fica na horizontal do primeiro', await h.v(() => VC.planta.rascunho));
    await h.tecla('Escape'); await h.tecla('F8');
    await h.tecla('F3'); ok(await h.v(() => VC.planta.encaixeDesligado), 'F3 desliga o encaixe'); await h.tecla('F3');
    await h.tecla('F9'); ok(await h.v(() => VC.planta.grelha), 'F9 liga a grelha'); await h.tecla('F9');
    await pg.evaluate(() => { VC.planta.zoom = 3; VC.planta.aplicarVista(); }); await pg.keyboard.press('Shift+Z'); await pg.waitForTimeout(200);
    ok(await h.v(() => VC.planta.zoom < 3), 'Shift+Z mostra a planta inteira (Zoom Extents)');
  },

  /* Fase 2: troços, Ø fixo, reduções (remover, adiar) e regras do reajuste (Degrade, ramal R1.1) */
  async condutas(pg, ok) {
    const h = ajudas(pg);
    await pg.evaluate(async () => { await VC._carregarExemploDeFicheiro(['exemplos/degrade-21nov26-corrigido.json'], 'x'); VC.nav.irPasso('rede'); VC.nav.setVista('planta'); VC.planta.setPiso('piso-p0'); });
    await pg.waitForTimeout(1200);
    await pg.evaluate(() => { const P = VC.planta; P.zoom = 1.1; P.vx = 600; P.vy = 120; P.aplicarVista(); }); await pg.waitForTimeout(600);
    const ponto = s => h.v(`(() => { const r = VC.dados.ramais.find(x => x.nome === 'R1.1'); const q = VC.planta._subTracado(r.planta.pts, ${'${s}'} / r.L, ${'${s}'} / r.L + 0.0005); return q[0]; })()`.replace(/\$\{s\}/g, s));
    await pg.evaluate(() => { const r = VC.dados.ramais.find(x => x.nome === 'R1.1'); VC.planta.selecionarRamal(r.id); }); await pg.waitForTimeout(300);
    const p1 = await ponto(10.3); await h.clicar(p1);
    ok(await pg.locator('.pn[data-pn="troco"]').count() === 1 && /troço 2 de 6/.test(await pg.locator('.pn-cab').first().textContent()), 'Clicar num troço do ramal selecionado abre o painel do troço (2 de 6)');
    await pg.selectOption('#pn-troco-Dfixo', '200'); await pg.waitForTimeout(350);
    ok(await h.v(() => { const r = VC.dados.ramais.find(x => x.nome === 'R1.1'); return r.trocosFix && r.trocosFix['9.28'] === 200 && r.trocos[1].Dcom === 200; }), 'Ø fixo 200 no troço: fica Ø200 e manda sobre o cálculo');
    await pg.locator('#plantaSVG').hover(); await pg.keyboard.press('Control+z'); await pg.waitForTimeout(350);
    ok(await h.v(() => { const r = VC.dados.ramais.find(x => x.nome === 'R1.1'); return !r.trocosFix && r.trocos[1].Dcom === 250; }), 'Ctrl+Z volta ao Ø calculado (250)');
    const nRed = await pg.locator('.planta-red[data-k="9.28"]').count();
    ok(nRed === 1, 'Há o símbolo da redução Ø315 → Ø250 a 9,28 m');
    await pg.click('.planta-red[data-k="9.28"]'); await pg.waitForTimeout(250); await h.tecla('Delete');
    ok(await h.v(() => { const r = VC.dados.ramais.find(x => x.nome === 'R1.1'); return r.reducoes && r.reducoes['9.28'].removida && r.trocos[1].Dcom === 315 && r.trocos[1].motivo === 'redução removida'; }), 'Clique na redução + Delete: o troço seguinte fica Ø315 («redução removida»)');
    await pg.click('.pn-acoes button:has-text("Repor a redução")'); await pg.waitForTimeout(300);
    ok(await h.v(() => !VC.dados.ramais.find(x => x.nome === 'R1.1').reducoes), '«Repor a redução» desfaz a remoção');
    const a = await h.v(() => { const g = document.querySelector('.planta-red[data-k="11.42"] polygon'), b = g.getBBox(); return [b.x + b.width / 2, b.y + b.height / 2]; }), b = await ponto(13.5);
    await h.arrastar(a, b); await pg.waitForTimeout(300);
    const adi = await h.v(() => { const r = VC.dados.ramais.find(x => x.nome === 'R1.1'); return r.reducoes && r.reducoes['11.42'] && r.reducoes['11.42'].s; });
    ok(adi > 12.5 && adi < 14.5, 'Arrastar a redução Ø250 → Ø200 para dentro do troço adia-a (≈ 13,5 m)', adi);
    await h.tecla('Escape'); await h.tecla('Escape');
    await pg.evaluate(() => { const r = VC.dados.ramais.find(x => x.nome === 'R1.1'); VC.planta.selecionarRamal(r.id); VC.paineis.abertos.ramal = true; VC.planta.redesenhar(); }); await pg.waitForTimeout(300);
    await pg.fill('#pn-ramal-esp_maxReducoes', '2'); await pg.press('#pn-ramal-esp_maxReducoes', 'Enter'); await pg.waitForTimeout(400);
    ok(await h.v(() => { const r = VC.dados.ramais.find(x => x.nome === 'R1.1'); return r.especificacao.maxReducoes === 2 && r.reducoesCalc.length <= 2; }), 'Regra «máximo de reduções» = 2 no painel do ramal: ficam 2 reduções');
    ok(await h.v(() => { const f = VC.dados.ramais.find(x => x.parente === 'R1.1'); return f && VC.calculo.regrasReajuste(f).maxReducoes === 2; }), 'Os sub-ramais herdam a regra');
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
