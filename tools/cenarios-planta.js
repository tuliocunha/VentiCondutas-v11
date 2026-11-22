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
    VC.dados.params.encaixeImagem = false;   // estes cenários medem o encaixe nas salas desenhadas; o das paredes da imagem tem o seu (multi)
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
    await h.tecla('F9'); await h.tecla('p'); await h.clicar([623, 573]);
    ok(await h.v(() => JSON.stringify(VC.planta.rascunho[0]) === '[600,550]'), 'Grelha (F9) de 0,50 m: o ponto vai para (600, 550)', await h.v(() => VC.planta.rascunho[0]));
    await h.tecla('Escape'); await h.tecla('F9');
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
    await pg.fill('#pn-troco-secFixa', '200'); await pg.press('#pn-troco-secFixa', 'Enter'); await pg.waitForTimeout(350);
    ok(await h.v(() => { const r = VC.dados.ramais.find(x => x.nome === 'R1.1'); return r.trocosFix && r.trocosFix['9.28'] === 200 && r.trocos[1].Dcom === 200; }), 'Ø fixo 200 no troço: fica Ø200 e manda sobre o cálculo');
    await pg.locator('#plantaSVG').hover(); await pg.keyboard.press('Control+z'); await pg.waitForTimeout(350);
    ok(await h.v(() => { const r = VC.dados.ramais.find(x => x.nome === 'R1.1'); return !r.trocosFix && r.trocos[1].Dcom === 250; }), 'Ctrl+Z volta ao Ø calculado (250)');
    // secção retangular fixa a partir da sugestão do painel; volta à calculada
    await h.clicar(p1); await pg.waitForTimeout(250);
    if (await pg.locator('.pn[data-pn="troco"]').count() === 0) { await h.clicar(p1); await pg.waitForTimeout(250); }   // 1.º clique: o ramal; 2.º: o troço
    const alt = await h.v(() => { const r = VC.dados.ramais.find(x => x.nome === 'R1.1'); const t = r.trocos[1]; return t.sugRect ? t.sugRect.b + '×' + t.sugRect.h : null; });
    await pg.click('.pn-acoes button:has-text("Usar retangular")'); await pg.waitForTimeout(350);
    const fx = await h.v(() => { const r = VC.dados.ramais.find(x => x.nome === 'R1.1'); return [(r.trocosFix || {})['9.28'], r.trocos[1].forma, r.trocos[1].secao]; });
    ok(alt && fx[0] === alt && fx[1] === 'retangular' && fx[2] === alt, '«Usar retangular» fixa a alternativa retangular do troço e recalcula', [alt, fx]);
    await pg.click('.pn-acoes button:has-text("Voltar à secção calculada")'); await pg.waitForTimeout(350);
    ok(await h.v(() => { const r = VC.dados.ramais.find(x => x.nome === 'R1.1'); return !r.trocosFix && r.trocos[1].forma === 'circular' && r.trocos[1].Dcom === 250; }), '«Voltar à secção calculada» repõe o Ø250 sugerido');
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

  /* PR 56 · Fase 2C: fugas, reduções marcadas, tipo da redução, renomear ramais */
  async fase2c(pg, ok) {
    const h = ajudas(pg);
    await pg.evaluate(async () => { await VC._carregarExemploDeFicheiro(['exemplos/degrade-21nov26-corrigido.json'], 'x'); VC.nav.irPasso('rede'); VC.nav.setVista('planta'); VC.planta.setPiso('piso-p0'); });
    await pg.waitForTimeout(1200);
    await pg.evaluate(() => { const P = VC.planta; P.zoom = 1.1; P.vx = 600; P.vy = 120; P.aplicarVista(); }); await pg.waitForTimeout(600);
    const R = n => `VC.dados.ramais.find(x => x.nome === '${n}')`;
    await pg.evaluate(() => { const r = VC.dados.ramais.find(x => x.nome === 'R1.1'); VC.planta.selecionarRamal(r.id); VC.paineis.abertos.ramal = true; VC.planta.redesenhar(); }); await pg.waitForTimeout(300);
    await pg.selectOption('#pn-ramal-esp_estanquidade', 'B'); await pg.waitForTimeout(400);
    const fug = await h.v(() => { const r = VC.dados.ramais.find(x => x.nome === 'R1.1'), f = VC.dados.ramais.find(x => x.nome === 'R1.1.1'); return [r.Q_fugas, f.Q_fugas, r.classeEstanquidade, f.classeEstanquidade]; });
    ok(fug[0] > 0 && fug[1] > 0 && fug[3] === 'B', 'Classe B no ramal: fugas calculadas (m³/h) e herdadas pelo sub-ramal', fug);
    ok(/Fugas \(estanquidade\)[\s\S]*m³\/h/.test(await pg.locator('.pn[data-pn="ramal"]').textContent()), 'O painel do ramal mostra as fugas e a % do caudal');
    ok(await h.v(() => { const r = VC.dados.ramais.find(x => x.nome === 'R1.1'), u = VC.dados.utas.find(x => x.id === r.utaRef); return u && u.Q_fugas > 0 && Math.abs(u.Q_ventilador_mh - u.Q * 3600 - u.Q_fugas) < 1e-6 && u.Q > 0; }), 'O equipamento soma as fugas ao caudal do ventilador');
    // reduzir só nos pontos marcados
    await pg.selectOption('#pn-ramal-esp_reajuste', 'marcados'); await pg.waitForTimeout(400);
    ok(await h.v(new Function('return ' + R('R1.1') + '.trocos.every(t => t.Dcom === ' + R('R1.1') + '.trocos[0].Dcom)')), 'Reajuste «só nos pontos marcados» sem marcas: Ø único em todo o ramal');
    const p1 = await h.v(() => { const r = VC.dados.ramais.find(x => x.nome === 'R1.1'); return VC.planta._subTracado(r.planta.pts, 10.3 / r.L, 10.3 / r.L + 0.0005)[0]; });
    await h.clicar(p1); await pg.waitForTimeout(250);
    if (await pg.locator('.pn[data-pn="troco"]').count() === 0) { await h.clicar(p1); await pg.waitForTimeout(250); }
    await pg.click('.pn-acoes button:has-text("Reduzir no início deste troço")'); await pg.waitForTimeout(400);
    const mk = await h.v(() => { const r = VC.dados.ramais.find(x => x.nome === 'R1.1'); return [r.reducoes && r.reducoes['9.28'] && r.reducoes['9.28'].marcada, r.trocos[0].Dcom, r.trocos[1].Dcom, r.reducoesCalc.length]; });
    ok(mk[0] && mk[2] < mk[1] && mk[3] === 1, '«Reduzir no início deste troço» marca a redução a 9,28 m e só aí reduz', mk);
    // tipo da redução: brusca perde mais
    const dp0 = await h.v(() => VC.dados.ramais.find(x => x.nome === 'R1.1').trocos[1].dpReducao);
    await pg.selectOption('#pn-troco-tipoReducao', 'brusca'); await pg.waitForTimeout(400);
    const dp1 = await h.v(() => { const t = VC.dados.ramais.find(x => x.nome === 'R1.1').trocos[1]; return [t.dpReducao, t.tipoReducao]; });
    ok(dp1[0] > dp0 && dp1[1] === 'brusca', 'Redução brusca no painel do troço: mais perda de carga que a gradual', [dp0, dp1]);
    await pg.locator('#plantaSVG').hover(); await pg.keyboard.press('Control+z'); await pg.waitForTimeout(300);
    ok(await h.v(() => VC.dados.ramais.find(x => x.nome === 'R1.1').trocos[1].tipoReducao === 'gradual'), 'Ctrl+Z volta à redução gradual');
    await h.tecla('Escape'); await h.tecla('Escape');
    // renomear: duplo clique no nome do ramal foca o campo; o prefixo passa aos sub-ramais
    // põe o nome à vista (fora da legenda e do painel) antes do duplo clique
    await pg.evaluate(async () => {
      const P = VC.planta, alvo = () => { const r = VC.dados.ramais.find(x => x.nome === 'R1.1'); return [...document.querySelectorAll('.planta-ramal[data-r="' + r.id + '"] > text')].find(x => x.textContent.trim() === 'R1.1'); };
      for (const [dx, dy] of [[0, 0], [300, 0], [-300, 0], [0, 250], [0, -250], [300, 250], [-300, -250], [600, 0], [-600, 0]]) {
        const vx = P.vx, vy = P.vy; P.vx += dx; P.vy += dy; P.aplicarVista(); await new Promise(f => setTimeout(f, 80));
        const t = alvo(), b = t && t.getBoundingClientRect(), e = b && document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); if (e && e.closest('#plantaSVG')) return;
        P.vx = vx; P.vy = vy;
      }
    }); await pg.waitForTimeout(200);
    const nm = await h.v(() => { const r = VC.dados.ramais.find(x => x.nome === 'R1.1'), t = [...document.querySelectorAll('.planta-ramal[data-r="' + r.id + '"] > text')].find(x => x.textContent.trim() === 'R1.1'); if (!t) return null; const b = t.getBBox(); return [b.x + b.width / 2, b.y + b.height / 2]; });
    ok(!!nm, 'O nome «R1.1» está desenhado na planta');
    if (nm) await h.clicar(nm, 2);
    await pg.waitForTimeout(300);
    ok(await h.v(() => document.activeElement && document.activeElement.id === 'pn-ramal-nome'), 'Duplo clique no nome do ramal: seleciona-o e foca o campo «Nome»');
    ok(await pg.locator('#pn-ramal-prefixoSub').count() === 1, 'O painel oferece «mudar também o prefixo dos sub-ramais»');
    await pg.fill('#pn-ramal-nome', 'INS1'); await pg.press('#pn-ramal-nome', 'Enter'); await pg.waitForTimeout(450);
    const nomes = await h.v(() => VC.dados.ramais.filter(x => /^INS1|^R1\.1/.test(x.nome)).map(x => x.nome + '<' + (x.parente || '')).join(','));
    ok(nomes === 'INS1<,INS1.1<INS1,INS1.1.1<INS1.1,INS1.1.1.1<INS1.1.1', 'R1.1 → INS1 e os sub-ramais R1.1.x → INS1.x', nomes);
    ok(await h.v(() => VC.dados.terminais.filter(t => /^R1\.1/.test(t.ramalRef || '')).length === 0 && VC.dados.terminais.some(t => t.ramalRef === 'INS1.1')), 'Os terminais seguem os novos nomes');
    await pg.locator('#plantaSVG').hover(); await pg.keyboard.press('Control+z'); await pg.waitForTimeout(400);
    ok(await h.v(() => ['R1.1', 'R1.1.1', 'R1.1.1.1.1'].every(n => VC.dados.ramais.some(x => x.nome === n))), 'Um Ctrl+Z repõe o ramal e todos os sub-ramais');
    // F2 com o ramal selecionado foca o nome; sem o prefixo, só o ramal muda
    await pg.evaluate(() => { const r = VC.dados.ramais.find(x => x.nome === 'R1.1'); VC.planta.selecionarRamal(r.id); }); await pg.waitForTimeout(250);
    await h.tecla('F2'); await pg.waitForTimeout(200);
    ok(await h.v(() => document.activeElement && document.activeElement.id === 'pn-ramal-nome'), 'F2 foca o campo «Nome» do ramal selecionado');
    await pg.uncheck('#pn-ramal-prefixoSub'); await pg.waitForTimeout(250);
    await pg.fill('#pn-ramal-nome', 'Piso 0 · loja'); await pg.press('#pn-ramal-nome', 'Enter'); await pg.waitForTimeout(450);
    ok(await h.v(() => VC.dados.ramais.some(x => x.nome === 'Piso 0 · loja') && VC.dados.ramais.find(x => x.nome === 'R1.1.1').parente === 'Piso 0 · loja'), 'Sem o prefixo: só o ramal muda de nome; o sub-ramal R1.1.1 passa a apontar para «Piso 0 · loja»');
  },

  /* PR 57 · Fase 3A: equipamentos na planta */
  async equipamentos(pg, ok) {
    const h = ajudas(pg);
    await pg.evaluate(async () => { await VC._carregarExemploDeFicheiro(['exemplos/degrade-21nov26-corrigido.json'], 'x'); VC.nav.irPasso('rede'); VC.nav.setVista('planta'); VC.planta.setPiso('piso-p0'); });
    await pg.waitForTimeout(1200);
    const ini = await h.v(() => { const r = VC.dados.ramais.find(x => x.nome === 'R1.1'), a = r.planta.pts[0], b = r.planta.pts[1], l = Math.hypot(b[0] - a[0], b[1] - a[1]); const P = VC.planta; P.zoom = 1.1; P.vx = a[0] - 300 / 1.1; P.vy = a[1] - 250 / 1.1; P.aplicarVista(); return [a[0] - (b[0] - a[0]) / l * 45, a[1] - (b[1] - a[1]) / l * 45]; });
    await pg.waitForTimeout(400);
    ok(await h.v(() => document.querySelectorAll('.planta-equip').length > 0 && !document.querySelector('.planta-eq')), 'Sem posição, o equipamento aparece só como marca no início do ramal');
    await h.tecla('u');
    ok(await h.v(() => VC.planta.ferramenta === 'equip'), 'U escolhe a ferramenta Equipamento');
    await h.clicar(ini); await pg.waitForTimeout(300);
    const u1 = await h.v(() => { const u = VC.dados.utas.find(x => x.nome === 'VAN P0 N'); return u.planta && [u.planta.x, u.planta.y, String(VC.planta.equipSel) === String(u.id)]; });
    ok(u1 && u1[2], 'Clique junto ao início de R1.1: o VAN P0 N fica nesse ponto e selecionado', u1);
    ok(await h.v(() => document.querySelectorAll('.planta-eq').length === 1 && !!document.querySelector('.planta-eq-solto')), 'Desenha a caixa do equipamento e a ligação solta ao ramal');
    ok(/Ligar os ramais ao equipamento/.test(await pg.locator('.pn[data-pn="equipamento"]').textContent()), 'O painel do equipamento propõe «Ligar os ramais ao equipamento»');
    await pg.click('.pn-acoes button:has-text("Ligar os ramais ao equipamento")'); await pg.waitForTimeout(400);
    ok(await h.v(() => { const r = VC.dados.ramais.find(x => x.nome === 'R1.1'), u = VC.dados.utas.find(x => x.nome === 'VAN P0 N'); return r.planta.pts[0][0] === u.planta.x && r.planta.pts[0][1] === u.planta.y && !document.querySelector('.planta-eq-solto'); }), 'R1.1 passa a começar no equipamento');
    // arrastar com Selecionar
    await h.tecla('Escape'); await h.tecla('v');
    await h.arrastar(ini, [ini[0], ini[1] + 40]); await pg.waitForTimeout(300);
    const yMov = await h.v(() => VC.dados.utas.find(x => x.nome === 'VAN P0 N').planta.y);
    ok(Math.abs(yMov - ini[1]) > 30, 'Arrastar a caixa com Selecionar move o equipamento', [ini[1], yMov, await h.v(() => [VC.planta.ferramenta, VC.planta.equipSel, (window.__t || []).slice(-2)])]);
    await pg.locator('#plantaSVG').hover(); await pg.keyboard.press('Control+z'); await pg.waitForTimeout(350);
    ok(Math.abs(await h.v(() => VC.dados.utas.find(x => x.nome === 'VAN P0 N').planta.y) - ini[1]) < 1, 'Ctrl+Z devolve-o ao sítio');
    // Delete tira da planta; Ctrl+Z repõe
    await h.clicar(ini); await pg.waitForTimeout(200);
    ok(await h.v(() => VC.paineis.selecao() && VC.paineis.selecao().tipo === 'equipamento'), 'Clique na caixa seleciona o equipamento');
    await h.tecla('Delete');
    ok(await h.v(() => !VC.dados.utas.find(x => x.nome === 'VAN P0 N').planta), 'Delete tira o equipamento da planta (os dados ficam)');
    await pg.locator('#plantaSVG').hover(); await pg.keyboard.press('Control+z'); await pg.waitForTimeout(350);
    ok(await h.v(() => !!VC.dados.utas.find(x => x.nome === 'VAN P0 N').planta), 'Ctrl+Z repõe-no');
    // selecionar uma sala larga o equipamento
    await h.v(() => { const u = VC.dados.utas.find(x => x.nome === 'VAN P0 N'); VC.planta.selecionarEquip(u.id); VC.planta.selecionar(VC.dados.espacos.find(e => e.planta).id); });
    ok(await h.v(() => VC.planta.equipSel == null && VC.paineis.selecao().tipo === 'sala'), 'Escolher uma sala larga o equipamento (uma seleção de cada vez)');
    // VCM: juntar as metades (o exemplo já traz o par: desfaz-se para o juntar à mão)
    await h.v(() => { VC.dados.utas.filter(u => /VCM Refeit/.test(u.nome)).forEach(u => { delete u.uvbPar; delete u.planta; }); });
    await h.v(() => { const P = VC.planta, i = VC.dados.utas.find(u => /VCM Refeit.*insufla/.test(u.nome)), r = VC.dados.ramais.find(x => x.utaRef === i.id && x.planta); const a = r.planta.pts[0]; P.colocarEquipamento([a[0] - 30, a[1]], i.id); });
    await pg.waitForTimeout(300);
    await pg.click('.pn-acoes button:has-text("Juntar com")'); await pg.waitForTimeout(350);
    ok(await h.v(() => { const i = VC.dados.utas.find(u => /VCM Refeit.*insufla/.test(u.nome)), e = VC.dados.utas.find(u => /VCM Refeit.*extra/.test(u.nome)); return i.uvbPar === e.id && e.uvbPar === i.id && e.planta && e.planta.x === i.planta.x && document.querySelectorAll('.planta-eq[data-par]').length === 1 && document.querySelectorAll('.planta-eq[data-par] .planta-eq-ext').length === 2; }), 'VCM: «Juntar com…» faz uma caixa com 4 ligações (ODA e EHA para fora)');
    // traçar um ramal a partir do equipamento propõe-no
    const q0 = await h.v(() => { const u = VC.dados.utas.find(x => x.nome === 'VAN P0 N'); return [u.planta.x, u.planta.y]; });
    await h.tecla('Escape'); await h.tecla('l');
    await h.clicar([q0[0] + 4, q0[1] + 3]); await h.clicar([q0[0] + 4, q0[1] + 120]); await h.tecla('Enter'); await pg.waitForTimeout(300);
    ok(await h.v(() => { const pr = VC.planta.pendenteRamal, u = VC.dados.utas.find(x => x.nome === 'VAN P0 N'); return pr && String(pr.equip) === String(u.id) && pr.pts[0][0] === u.planta.x; }), 'Traçar a partir do equipamento: o ramal encaixa nele e fica proposto esse equipamento');
    ok(/Começa no equipamento/.test(await pg.locator('#plantaPainel, .planta-painel').first().textContent()), 'O cartão do traçado diz «Começa no equipamento»');
    await h.tecla('Escape');
  },

  /* PR 58 · Fase 3B: tomadas, rejeições, aberturas para o exterior e perdas térmicas */
  async exterior(pg, ok) {
    const h = ajudas(pg);
    await pg.evaluate(async () => { await VC._carregarExemploDeFicheiro(['exemplos/degrade-21nov26-corrigido.json'], 'x'); VC.nav.irPasso('rede'); VC.nav.setVista('planta'); VC.planta.setPiso('piso-p0'); });
    await pg.waitForTimeout(1200);
    const van = await h.v(() => { const P = VC.planta; VC.ui.toast = () => {}; ['R1.1', 'R2.1'].forEach(n => { const r = VC.dados.ramais.find(x => x.nome === n), u = VC.dados.utas.find(x => x.id === r.utaRef), a = r.planta.pts[0], b = r.planta.pts[1], l = Math.hypot(b[0] - a[0], b[1] - a[1]); P.colocarEquipamento([a[0] - (b[0] - a[0]) / l * 45, a[1] - (b[1] - a[1]) / l * 45], u.id); P.ligarRamaisAoEquip(u.id); });
      const u = VC.dados.utas.find(x => x.nome === 'VAN P0 N'); P.selecionarEquip(u.id); P.zoom = 1.4; P.vx = u.planta.x - 380 / 1.4; P.vy = u.planta.y - 260 / 1.4; P.aplicarVista(); return [u.planta.x, u.planta.y, u.dpExt]; });
    await pg.waitForTimeout(400);
    ok(/Desenhar a tomada de ar exterior/.test(await pg.locator('.pn[data-pn="equipamento"]').textContent()), 'O painel do equipamento propõe desenhar a tomada (G)');
    await h.tecla('g');
    ok(await h.v(() => VC.planta.ferramenta === 'grelhaExt'), 'G escolhe a ferramenta Tomada / rejeição');
    await h.clicar([van[0] + 60, van[1] - 30]); await pg.waitForTimeout(400);
    const oda = await h.v(() => { const u = VC.dados.utas.find(x => x.nome === 'VAN P0 N'); return u.exterior && u.ext && [u.ext.lado, u.ext.b, u.ext.h, u.ext.vFace, u.ext.dp, u.dpExt, u.dpRede]; });
    ok(oda && oda[0] === 'ODA' && oda[3] <= 2 + 1e-9 && oda[4] > 0, 'Clique na fachada: tomada ODA do VAN P0 N, dimensão proposta a ≤ 2 m/s', oda);
    ok(oda && Math.abs(oda[5] - oda[6] - oda[4]) < 1e-6 && oda[5] > van[2], 'O Δp da grelha e da conduta soma ao Δp externo do equipamento');
    ok(await h.v(() => !!document.querySelector('.planta-grelha-ext[data-lado="ODA"]') && !document.querySelector('.planta-eq-ext[data-lig="ODA"]')), 'Desenha a grelha ODA e a conduta até ela (sem a seta genérica)');
    ok(/Tomada de ar exterior · VAN P0 N/.test(await pg.locator('.pn').first().textContent()), 'Fica selecionada com o seu painel');
    // rejeição do VEG muito perto → aviso e traço vermelho
    await h.v(() => { const P = VC.planta, u = VC.dados.utas.find(x => x.nome === 'VEG P0 N'), t = VC.dados.utas.find(x => x.nome === 'VAN P0 N'); P.selecionarEquip(u.id); P.colocarGrelha([t.exterior.x + 15, t.exterior.y], u.id); });
    await pg.waitForTimeout(300);
    const eha = await h.v(() => { const u = VC.dados.utas.find(x => x.nome === 'VEG P0 N'); return [u.ext.lado, u.ext.distMin, u.ext.avisos.length, !!document.querySelector('.planta-dist-ext')]; });
    ok(eha[0] === 'EHA' && eha[1] < 2 && eha[2] > 0 && eha[3], 'Rejeição a menos de 2 m da tomada: aviso no painel e traço vermelho com a medida', eha);
    ok(await h.v(() => (VC.calculo.calcularTudo().findings || []).some(f => f.tipo === 'Rejeição para o exterior' && /mínimo 2 m/.test(f.msg))), 'A verificação lista a distância curta (EN 13779)');
    // arrastar a rejeição para longe resolve
    const pe = await h.v(() => { const u = VC.dados.utas.find(x => x.nome === 'VEG P0 N'); return [u.exterior.x, u.exterior.y]; });
    await h.tecla('v'); await h.arrastar(pe, [pe[0] - 160, pe[1]]); await pg.waitForTimeout(300);
    ok(await h.v(() => { const u = VC.dados.utas.find(x => x.nome === 'VEG P0 N'); return u.ext.distMin >= 2 && !u.ext.avisos.length && !document.querySelector('.planta-dist-ext'); }), 'Arrastar a rejeição para mais de 2 m tira o aviso');
    // dimensão escrita e Δp do catálogo
    await h.v(() => { const u = VC.dados.utas.find(x => x.nome === 'VAN P0 N'); VC.planta.extSel = u.id; VC.planta.redesenhar(); });
    await pg.fill('#pn-exterior-dim', '600×400'); await pg.press('#pn-exterior-dim', 'Enter'); await pg.waitForTimeout(350);
    ok(await h.v(() => { const u = VC.dados.utas.find(x => x.nome === 'VAN P0 N'); return u.ext.b === 600 && u.ext.h === 400 && !u.ext.bProposto; }), 'Dimensão escrita 600×400 substitui a proposta');
    await pg.fill('#pn-exterior-dpFab', '25'); await pg.press('#pn-exterior-dpFab', 'Enter'); await pg.waitForTimeout(350);
    ok(await h.v(() => VC.dados.utas.find(x => x.nome === 'VAN P0 N').ext.dpGrelha === 25), 'Δp do catálogo usado em vez do ζ típico');
    await h.tecla('Delete');
    ok(await h.v(() => !VC.dados.utas.find(x => x.nome === 'VAN P0 N').exterior), 'Delete tira a grelha');
    await pg.locator('#plantaSVG').hover(); await pg.keyboard.press('Control+z'); await pg.waitForTimeout(350);
    ok(await h.v(() => { const u = VC.dados.utas.find(x => x.nome === 'VAN P0 N'); return u.exterior && u.exterior.b === 600; }), 'Ctrl+Z repõe-na com a dimensão escrita');
    // abertura para o exterior numa garagem
    const gar = await h.v(() => { const e = VC.dados.espacos.find(x => /Garagem/.test(x.nome) && x.planta); const pts = e.planta.pts; const P = VC.planta; const c = [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2]; P.zoom = 1; P.vx = c[0] - 380; P.vy = c[1] - 250; P.aplicarVista(); return { id: e.id, q: c, Q: e.Q_exterior || 0 }; });
    await pg.waitForTimeout(300);
    await h.tecla('Escape'); await h.tecla('o');
    await h.clicar(gar.q); await pg.waitForTimeout(400);
    ok(await pg.evaluate(id => { const e = VC.dados.espacos.find(x => x.id === id); return !!(e.planta.abertura && document.querySelector('.planta-abert-ext')); }, gar.id), 'O na parede da garagem marca a abertura para o exterior');
    ok(/Abertura · /.test(await pg.locator('.pn').first().textContent()) && /Área livre/.test(await pg.locator('.pn').first().textContent()), 'Painel da abertura com o caudal e a área livre');
    // perdas térmicas: sem isolamento e ar a 12 °C condensa; com o isolamento proposto deixa de condensar
    await h.v(() => { const r = VC.dados.ramais.find(x => x.nome === 'R1.1'); r.especificacao = Object.assign({}, r.especificacao, { tAr: 12, hrEnv: 70 }); VC.calculo.calcularTudo(); });
    const th = await h.v(() => { const t = VC.dados.ramais.find(x => x.nome === 'R1.1').termica; return [t.risco, t.eMin, t.ts, t.td]; });
    ok(th[0] && th[1] > 0, 'Ar a 12 °C sem isolamento com 70 % à volta: risco de condensação e espessura mínima proposta', th);
    await pg.evaluate(e => { const r = VC.dados.ramais.find(x => x.nome === 'R1.1'); r.especificacao = Object.assign({}, r.especificacao, { isolamento: 'termico', isolEsp: e }); VC.calculo.calcularTudo(); }, th[1]);
    ok(await h.v(() => { const r = VC.dados.ramais.find(x => x.nome === 'R1.1'), t = r.termica; return t && !t.risco && t.e > 0; }), 'Com essa espessura deixa de condensar');
  },

  /* PR 59 · Fase 4A: prumadas entre pisos */
  async prumadas(pg, ok) {
    const h = ajudas(pg);
    await pg.evaluate(async () => { await VC._carregarExemploDeFicheiro(['exemplos/degrade-21nov26-corrigido.json'], 'x'); VC.nav.irPasso('rede'); VC.nav.setVista('planta'); VC.planta.setPiso('piso-mez'); });
    await pg.waitForTimeout(1200);
    const fim = await h.v(() => { const P = VC.planta, r = VC.dados.ramais.find(x => x.nome === 'R5.1'), q = r.planta.pts[r.planta.pts.length - 1]; VC.dados.plantas.find(p => p.id === 'piso-mez').cota = 3.5; VC.dados.plantas.find(p => p.id === 'piso-p1').cota = 6.6; P.zoom = 1; P.vx = q[0] - 380; P.vy = q[1] - 260; P.aplicarVista(); return q; });
    await pg.waitForTimeout(400);
    await h.tecla('k');
    ok(await h.v(() => VC.planta.ferramenta === 'prumada'), 'K escolhe a ferramenta Prumada');
    await h.clicar(fim); await pg.waitForTimeout(300);
    ok(await h.v(() => VC.planta.pendentePrum && VC.planta.pendentePrum.pai === 'R5.1'), 'Clique no fim de R5.1: prumada a sair de R5.1');
    const txt = await pg.locator('.planta-card.destaque').first().textContent();
    ok(/Nova prumada/.test(txt) && /R5\.1\.1 · ainda sem desenho/.test(txt), 'O cartão propõe o R5.1.1, que ainda não tem desenho', txt.slice(0, 200));
    await pg.selectOption('#pmPara', 'piso-p1'); await pg.selectOption('#pmRamal', 'R5.1.1'); await pg.check('#pmUsarL');
    await pg.click('button:has-text("Criar prumada")'); await pg.waitForTimeout(400);
    const r = await h.v(() => { const r = VC.dados.ramais.find(x => x.nome === 'R5.1.1'); return [!!r.prumada, r.L, r.prumada && r.prumada.para.pisoId, r.sNoPaiOrigem, VC.planta.prumSel === r.id, !!document.querySelector('.planta-prumada')]; });
    ok(r[0] && Math.abs(r[1] - 3.1) < 1e-9 && r[2] === 'piso-p1', 'R5.1.1 passa a prumada Mezanino → Piso 1 com L = 6,6 − 3,5 = 3,1 m (cotas)', r);
    ok(r[3] === 'planta' && r[4] && r[5], 'A derivação em R5.1 lê-se do ponto de saída; círculo desenhado e selecionado', r);
    ok(/Prumada R5\.1\.1/.test(await pg.locator('.pn').first().textContent()), 'Painel da prumada');
    // no Piso 1: o círculo está lá e o traçado a partir dele fica sub-ramal da prumada
    await pg.click('.pn-acoes button:has-text("Ver no Piso 1")'); await pg.waitForTimeout(500);
    ok(await h.v(() => VC.planta.piso === 'piso-p1' && !!document.querySelector('.planta-prumada[data-lado="para"]')), '«Ver no Piso 1» mostra o círculo de chegada');
    const q1 = await h.v(() => { const r = VC.dados.ramais.find(x => x.nome === 'R5.1.1'); return [r.prumada.para.x, r.prumada.para.y]; });
    await h.tecla('Escape'); await h.tecla('l'); await h.clicar([q1[0] + 3, q1[1] + 2]); await h.clicar([q1[0] + 150, q1[1] + 2]); await h.tecla('Enter'); await pg.waitForTimeout(300);
    ok(await h.v(() => { const pr = VC.planta.pendenteRamal; return pr && pr.pai === 'R5.1.1'; }), 'Traçar a partir do círculo no Piso 1: o ramal sai da prumada R5.1.1');
    await h.tecla('Escape');
    // arrastar, Delete, Ctrl+Z
    await h.tecla('v'); await h.arrastar(q1, [q1[0] - 70, q1[1] - 70]); await pg.waitForTimeout(300);
    const px = await h.v(() => [VC.dados.ramais.find(x => x.nome === 'R5.1.1').prumada.para.x, VC.planta.prumSel, VC.planta.ferramenta, (() => { const g = document.querySelector('.planta-prumada'); const b = g && g.getBoundingClientRect(); const e = b && document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return e && (e.getAttribute('class') || e.tagName) + '/' + (e.parentNode.getAttribute && e.parentNode.getAttribute('class')); })()]);
    ok(Math.abs(px[0] - q1[0]) > 30, 'Arrastar o círculo move a chegada da prumada', [q1, px]);
    await h.tecla('Delete');
    ok(await h.v(() => !VC.dados.ramais.find(x => x.nome === 'R5.1.1').prumada), 'Delete tira a prumada da planta (o ramal fica)');
    await pg.locator('#plantaSVG').hover(); await pg.keyboard.press('Control+z'); await pg.waitForTimeout(350);
    ok(await h.v(() => !!VC.dados.ramais.find(x => x.nome === 'R5.1.1').prumada), 'Ctrl+Z repõe-na');
  },

  /* PR 61 · Fase 4B: acessórios e curvas pela planta */
  async acessorios(pg, ok) {
    const h = ajudas(pg);
    await pg.evaluate(async () => { await VC._carregarExemploDeFicheiro(['exemplos/degrade-21nov26-corrigido.json'], 'x'); VC.nav.irPasso('rede'); VC.nav.setVista('planta'); VC.planta.setPiso('piso-p0'); });
    await pg.waitForTimeout(1200);
    const q = await h.v(() => { const P = VC.planta, r = VC.dados.ramais.find(x => x.nome === 'R1.1'), a = r.planta.pts[0], b = r.planta.pts[1]; P.zoom = 1.3; P.vx = a[0] - 300 / 1.3; P.vy = a[1] - 250 / 1.3; P.aplicarVista(); const k = Math.min(1, 60 / Math.hypot(b[0] - a[0], b[1] - a[1])); return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, r.deltaPTroco, r.deltaPtotal]; });
    await pg.waitForTimeout(400);
    await h.tecla('a');
    ok(await h.v(() => VC.planta.ferramenta === 'acess') && /Acessório a colocar/.test(await pg.locator('.planta-card.destaque').first().textContent()), 'A escolhe Acessório e o painel mostra os tipos');
    await pg.click('.acess-tipos button:has-text("Registo corta-fogo")'); await pg.waitForTimeout(250);
    await h.v(() => { const t = VC.ui.toast; window.__t2 = []; VC.ui.toast = function (m) { window.__t2.push(m); return t.apply(this, arguments); }; });
    await h.clicar([q[0], q[1]]); await pg.waitForTimeout(400);
    const c = await h.v(() => { const r = VC.dados.ramais.find(x => x.nome === 'R1.1'); return [(r.acessorios || []).length, r.acessorios && r.acessorios[0].tipo, r.deltaPacess, r.deltaPTroco, !!document.querySelector('.planta-acess')]; });
    ok(c[0] === 1 && c[1] === 'cortafogo' && c[2] > 0 && Math.abs(c[3] - q[2] - c[2]) < 1e-6 && c[4], 'Clique no ramal: corta-fogo colocado; o seu Δp soma ao ramal', [q[2], c, await h.v(() => [VC.planta.ferramenta, VC.planta.acessTipo, window.__t2])]);
    ok(/Registo corta-fogo · R1\.1/.test(await pg.locator('.pn').first().textContent()), 'Fica selecionado com o seu painel');
    await pg.fill('#pn-acessorio-dpFab', '12'); await pg.press('#pn-acessorio-dpFab', 'Enter'); await pg.waitForTimeout(350);
    ok(await h.v(() => Math.abs(VC.dados.ramais.find(x => x.nome === 'R1.1').deltaPacess - 12) < 1e-9), 'Δp do catálogo (12 Pa) usado em vez do ζ');
    await h.tecla('Delete');
    ok(await h.v(() => !VC.dados.ramais.find(x => x.nome === 'R1.1').acessorios), 'Delete tira o acessório');
    await pg.locator('#plantaSVG').hover(); await pg.keyboard.press('Control+z'); await pg.waitForTimeout(350);
    ok(await h.v(() => (VC.dados.ramais.find(x => x.nome === 'R1.1').acessorios || []).length === 1), 'Ctrl+Z repõe-no');
    // curvas pela planta
    const cv = await h.v(() => { const r = VC.dados.ramais.find(x => x.planta && VC.calculo.curvasDoTracado(x).length && Math.abs((Number(x.zeta) || 0) - 0.3) > 0.05); const antes = r.deltaPsing; r.especificacao = Object.assign({}, r.especificacao, { curvas: 'planta' }); VC.calculo.calcularTudo(); return [antes, r.deltaPsing, (r.curvasCalc || []).length, r.deltaPcurvas, VC.calculo.curvasDoTracado(r).length]; });
    ok(cv[2] === cv[4] && cv[2] > 0 && cv[3] > 0 && cv[1] !== cv[0], 'Curvas pela planta: cada curva do desenho conta e o ζ global sai', cv);
  },

  /* PR 60 · barra por grupos com sub-ícones e menu de contexto */
  async barra(pg, ok) {
    const h = ajudas(pg);
    await pg.evaluate(async () => { await VC._carregarExemploDeFicheiro(['exemplos/degrade-21nov26-corrigido.json'], 'x'); VC.nav.irPasso('rede'); VC.nav.setVista('planta'); VC.planta.setPiso('piso-p0'); });
    await pg.waitForTimeout(1200);
    await h.v(() => { const P = VC.planta, r = VC.dados.ramais.find(x => x.nome === 'R1.1'), a = r.planta.pts[1]; P.zoom = 1.1; P.vx = a[0] - 300 / 1.1; P.vy = a[1] - 250 / 1.1; P.aplicarVista(); });
    await pg.waitForTimeout(400);
    const n = await h.v(() => [document.querySelectorAll('.planta-ferrbar .planta-grupo').length, document.querySelectorAll('.planta-ferrbar .pfo-item').length, VC.planta.FERRAMENTAS.length, !!document.getElementById('plantaMenuBt')]);
    ok(n[0] === 8 && n[1] === n[2] && n[3], 'Barra com 8 grupos; os sub-ícones têm todas as ferramentas; o menu ☰ fica', n);
    await pg.hover('.planta-grupo[data-grupo="condutas"] .planta-ft'); await pg.waitForTimeout(600);
    ok(await pg.isVisible('.planta-grupo[data-grupo="condutas"] .pfo-item:has-text("Prumada")'), 'Passar o rato em Condutas mostra Ramal, Prumada, Equipamento, Tomada / rejeição');
    await pg.click('.planta-grupo[data-grupo="condutas"] .pfo-item:has-text("Prumada")'); await pg.waitForTimeout(300);
    ok(await h.v(() => VC.planta.ferramenta === 'prumada' && !!document.querySelector('.planta-grupo[data-grupo="condutas"] .planta-ft.ativo') && /Prumada/.test(document.querySelector('.planta-grupo[data-grupo="condutas"] .planta-ft').getAttribute('aria-label'))), 'O sub-ícone escolhe a ferramenta e o grupo passa a mostrá-la');
    await h.tecla('Escape'); await h.tecla('v'); await pg.mouse.move(800, 650);
    await pg.mouse.click(700, 410, { button: 'right' }); await pg.waitForTimeout(400);
    const m = await h.v(() => { const c = document.getElementById('plantaCtx'); return c ? c.innerText : ''; });
    ok(/Ramal R1\.1/i.test(m) && /sub-ramal a partir de R1\.1/.test(m) && /Prumada/.test(m), 'Botão direito no ramal: menu com as ações do ramal', m.slice(0, 120));
    await pg.click('#plantaCtx .pctx-item:has-text("Traçar um sub-ramal")'); await pg.waitForTimeout(300);
    ok(await h.v(() => VC.planta.ferramenta === 'ramal' && !document.getElementById('plantaCtx')), 'Escolher a ação fecha o menu e liga a ferramenta Ramal');
    await h.tecla('Escape'); await h.tecla('v');
    const sala = await h.v(() => { const e = VC.dados.espacos.find(x => x.nome === 'Garagem P0-N1'), g = document.querySelector('.planta-sala[data-esp="' + e.id + '"] polygon'), b = g.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height * 0.75]; });
    await pg.mouse.click(sala[0], sala[1], { button: 'right' }); await pg.waitForTimeout(400);
    const ms = await h.v(() => { const c = document.getElementById('plantaCtx'); return c ? c.innerText : ''; });
    ok(/garagem p0-n1/i.test(ms) && /Colocar um terminal nesta sala/.test(ms) && /Abertura para o exterior/.test(ms) && await h.v(() => VC.paineis.selecao() && VC.paineis.selecao().tipo === 'sala'), 'Botão direito na sala: seleciona-a e mostra terminal, abertura, duplicar, rodar…', ms.slice(0, 120));
    await h.tecla('Escape');
    ok(await h.v(() => !document.getElementById('plantaCtx')), 'Esc fecha o menu');
  },

  /* PR 62 · Fase 5A: contagens por ícones */
  async contagens(pg, ok) {
    const h = ajudas(pg);
    await pg.evaluate(async () => { await VC._carregarExemploDeFicheiro(['exemplos/degrade-21nov26-corrigido.json'], 'x'); VC.nav.irPasso('rede'); VC.nav.setVista('planta'); VC.planta.setPiso('piso-p0'); });
    await pg.waitForTimeout(1200);
    const info = await h.v(() => { const P = VC.planta, p = P.pisoAtual(); const of = P.espacosDoPiso(p).find(e => /Sala|Escrit/.test(e.tipo || '') || /^Sala/.test(e.nome)), san = P.espacosDoPiso(p).find(e => /^(Sanitários|Balneários)$/.test(e.tipo)); const c = P.centro(of.planta.pts); P.zoom = 1.2; P.vx = c[0] - 380 / 1.2; P.vy = c[1] - 250 / 1.2; P.aplicarVista(); return { of: of.id, nome: of.nome, c, san: san && san.id, N0: of.N }; });
    await pg.waitForTimeout(400);
    await h.tecla('c');
    ok(await h.v(() => VC.planta.ferramenta === 'icPessoa'), 'C escolhe Contar pessoas');
    for (const d of [[-20, 0], [0, 0], [20, 0]]) await h.clicar([info.c[0] + d[0], info.c[1] + 25 + d[1]]);
    await pg.waitForTimeout(300);
    const n = await pg.evaluate(id => { const e = VC.dados.espacos.find(x => x.id === id); return [e.N, (e.planta.icones || []).length, document.querySelectorAll('.planta-icone').length]; }, info.of);
    ok(n[0] === 3 && n[1] === 3 && n[2] >= 3, '3 cliques na sala: 3 pessoas e N = 3', n);
    await pg.locator('#plantaSVG').hover(); await pg.keyboard.press('Control+z'); await pg.waitForTimeout(300);
    ok(await pg.evaluate(id => VC.dados.espacos.find(x => x.id === id).N === 2, info.of), 'Ctrl+Z tira a última e N volta a 2');
    await h.tecla('v'); await h.clicar([info.c[0] - 20, info.c[1] + 25]); await pg.waitForTimeout(200); await h.tecla('Delete');
    ok(await pg.evaluate(id => { const e = VC.dados.espacos.find(x => x.id === id); return e.N === 1 && e.planta.icones.length === 1; }, info.of), 'Selecionar um ícone e Delete: N = 1');
    // sanita numa sala que não é sanitário: recusa
    await h.v(() => VC.planta.setFerramenta('icSanita'));
    await h.clicar([info.c[0] + 40, info.c[1] + 25]);
    ok(await pg.evaluate(id => !(VC.dados.espacos.find(x => x.id === id).planta.icones || []).some(i => i.tipo === 'sanita'), info.of), 'Sanita fora de um sanitário é recusada (com aviso)');
    if (info.san) {
      const ok2 = await pg.evaluate(id => { const P = VC.planta, e = VC.dados.espacos.find(x => x.id === id), c = P.centro(e.planta.pts); P.porIcone(c, 'sanita'); P.porIcone([c[0] + 5, c[1]], 'sanita'); P.porIcone([c[0], c[1] + 5], 'urinol'); return [e.numSanitas, e.numUrinois]; }, info.san);
      ok(ok2[0] === 2 && ok2[1] === 1, 'No sanitário: 2 sanitas e 1 urinol contados para a Tabela 13', ok2);
    }
    await h.v(() => VC.planta.setFerramenta('sel'));
    ok(await h.v(() => !!document.querySelector('.planta-grupo[data-grupo="contar"]')), 'Grupo «Ocupação e aparelhos» na barra');
  },

  /* PR 63 · Fase 5B: direção e alcance dos terminais, difusor linear */
  async alcance(pg, ok) {
    const h = ajudas(pg);
    await pg.evaluate(async () => { await VC._carregarExemploDeFicheiro(['exemplos/degrade-21nov26-corrigido.json'], 'x'); VC.nav.irPasso('rede'); VC.nav.setVista('planta'); VC.planta.setPiso('piso-p0'); });
    await pg.waitForTimeout(1200);
    const id = await h.v(() => { const P = VC.planta, p = P.pisoAtual(), of = P.espacosDoPiso(p).find(e => /^Sala P0-S3/.test(e.nome)), t = P.terminaisDe(of).find(x => x.planta && x.rede === 'insuflacao'), c = P.centro(of.planta.pts); P.zoom = 1.2; P.vx = c[0] - 380 / 1.2; P.vy = c[1] - 250 / 1.2; P.aplicarVista(); P.selecionarTerminal(t.id); return t.id; });
    await pg.waitForTimeout(400);
    ok(await pg.evaluate(id => { const t = VC.dados.terminais.find(x => x.id === id); return t.alcance && t.alcance.L > 0 && !!document.querySelector('.planta-alcance[data-t="' + id + '"]'); }, id), 'Terminal selecionado: alcance L0,25 calculado e desenhado');
    ok(/Alcance L0,25/.test(await pg.locator('.pn').first().textContent()) && /Até à parede/.test(await pg.locator('.pn').first().textContent()), 'O painel mostra o alcance e a distância à parede');
    const d0 = await pg.evaluate(id => VC.planta.jatosDe(VC.dados.terminais.find(x => x.id === id), VC.planta.pisoAtual())[0].ang, id);
    await pg.click('.pn-acoes button:has-text("Rodar 90°")'); await pg.waitForTimeout(350);
    const d1 = await pg.evaluate(id => VC.planta.jatosDe(VC.dados.terminais.find(x => x.id === id), VC.planta.pisoAtual())[0].ang, id);
    ok(Math.abs(((d1 - d0) * 180 / Math.PI + 360) % 360 - 90) < 1e-6, '«Rodar 90°» roda o jato 90°');
    await pg.locator('#plantaSVG').hover(); await pg.keyboard.press('Control+z'); await pg.waitForTimeout(300);
    ok(await pg.evaluate(id => VC.dados.terminais.find(x => x.id === id).planta.dir == null, id), 'Ctrl+Z volta à direção proposta');
    await h.v(() => VC.planta.alternarAlcances()); await pg.waitForTimeout(300);
    ok(await h.v(() => document.querySelectorAll('.planta-alcance').length > 1), '«Mostrar os alcances» desenha os de todos os terminais de insuflação');
    // difusor linear
    await pg.evaluate(id => { const t = VC.dados.terminais.find(x => x.id === id); t.tipo = 'Difusor Linear'; t.planta.comp = 2; VC.calculo.calcularTudo(); VC.planta.redesenhar(); }, id);
    await pg.waitForTimeout(300);
    ok(await pg.evaluate(id => { const t = VC.dados.terminais.find(x => x.id === id); return t.alcance.vias === 2 && !!document.querySelector('.planta-linear') && VC.planta.jatosDe(t, VC.planta.pisoAtual()).length === 2; }, id), 'Difusor linear de 2 m: desenhado com o comprimento e 2 jatos');
  },

  /* PR 64 · Fase 6A: retorno e recirculação */
  async retorno(pg, ok) {
    const h = ajudas(pg);
    await pg.evaluate(async () => { await VC._carregarExemploDeFicheiro(['exemplos/degrade-21nov26-corrigido.json'], 'x'); VC.nav.irPasso('rede'); VC.nav.setVista('planta'); VC.planta.setPiso('piso-p0'); });
    await pg.waitForTimeout(1200);
    // VAN P0 N + VEG P0 N como UTA de duplo fluxo com caixa de mistura
    const ids = await h.v(() => { const P = VC.planta; VC.ui.toast = () => {}; const i = VC.dados.utas.find(u => u.nome === 'VAN P0 N'), e = VC.dados.utas.find(u => u.nome === 'VEG P0 N'); i.uvbPar = e.id; e.uvbPar = i.id; const r = VC.dados.ramais.find(x => x.nome === 'R1.1'), a = r.planta.pts[0]; P.colocarEquipamento([a[0] - 40, a[1]], i.id); e.planta = Object.assign({}, i.planta); P.selecionarEquip(i.id); P.zoom = 1.4; P.vx = a[0] - 380 / 1.4; P.vy = a[1] - 250 / 1.4; P.aplicarVista(); VC.calculo.calcularTudo(); P.redesenhar(); return [i.id, e.id, Math.round(i.Q * 3600), Math.round(e.Q * 3600)]; });
    await pg.waitForTimeout(400);
    ok(await pg.isVisible('#pn-equipamento-recirculacao'), 'O painel do equipamento de insuflação com par tem «Recirculação»');
    const rca = Math.round(ids[2] * 0.25);
    await pg.fill('#pn-equipamento-recirculacao', String(rca)); await pg.press('#pn-equipamento-recirculacao', 'Enter'); await pg.waitForTimeout(400);
    const r = await pg.evaluate(id => { const u = VC.dados.utas.find(x => x.id === id); return [u.fracaoArNovo, u.Q_rca_mh]; }, ids[0]);
    ok(Math.abs(r[0] - (1 - rca / ids[2])) < 0.01 && r[1] === rca, 'Recirculação de 25 %: ar novo 75 %', r);
    ok(/Ar novo/.test(await pg.locator('.pn').first().textContent()) && await h.v(() => !!document.querySelector('.planta-rca')), 'O painel mostra o ar novo e a caixa mostra a seta RCA');
    ok(await h.v(() => { const e = VC.dados.espacos.find(x => VC.calculo.QservidoAoEspaco(x.nome, 'insuflacao') > 0 && VC.calculo.QarNovoAoEspaco(x.nome) < VC.calculo.QservidoAoEspaco(x.nome, 'insuflacao') - 1); return !!e; }), 'Nas salas servidas, o ar novo passa a ser menor do que a insuflação');
    await pg.locator('#plantaSVG').hover(); await pg.keyboard.press('Control+z'); await pg.waitForTimeout(350);
    ok(await pg.evaluate(id => !VC.dados.utas.find(x => x.id === id).recirculacao, ids[0]), 'Ctrl+Z tira a recirculação');
    // ar sujo não se recircula
    ok(await h.v(() => { const i = VC.dados.utas.find(u => /VCM Refeit.*insufla/.test(u.nome)), e = VC.dados.utas.find(u => /VCM Refeit.*extra/.test(u.nome)); i.uvbPar = e.id; e.uvbPar = i.id; i.recirculacao = 50; const f = VC.calculo.calcularTudo().findings || []; delete i.recirculacao; return f.some(x => x.tipo === 'Recirculação de ar sujo' && x.elemento === i.nome); }), 'VCM do refeitório (extração da copa): «Recirculação de ar sujo» é erro');
  },

  /* PR 72 · o desenho manda na posição das derivações (caso R9.1 / VEISP0) */
  async derivacoes(pg, ok) {
    const h = ajudas(pg);
    await pg.evaluate(async () => { await VC._carregarExemploDeFicheiro(['exemplos/degrade-21nov26-corrigido.json'], 'x'); VC.nav.irPasso('rede'); VC.nav.setVista('planta'); VC.planta.setPiso('piso-p0'); });
    await pg.waitForTimeout(1200);
    const r = await h.v(() => { const P = VC.planta, u = VC.dados.utas.find(x => x.nome === 'VEISP0'); P.colocarEquipamento([1727, 333], u.id); P.ligarRamaisAoEquip(u.id); VC.calculo.calcularTudo();
      const R = VC.dados.ramais.find(x => x.nome === 'R9.1'), f = n => VC.dados.ramais.find(x => x.nome === n);
      return { n: R.planta.pts.length, L: R.L, fim: R.trocos[R.trocos.length - 1].ate, s2: f('R9.1.2').sNoPai, ig: f('R9.1.2').sEscritoIgnorado, id: R.id }; });
    ok(r.n === 3, 'Ligar ao VEISP0: o início passa para o equipamento, sem o traçado voltar para trás', r);
    ok(Math.abs(r.fim - r.L) < 0.01 && Math.abs(r.s2 - r.L) < 0.01, 'A conduta do R9.1 vai até à junção do R9.1.2 e R9.1.3, apesar dos 3,42 m escritos na tabela', r);
    ok(r.ig === 3.42, 'O valor escrito que já não conta fica assinalado', r.ig);
    await h.v(id => VC.planta.selecionarRamal(id), r.id);
    await pg.evaluate(id => VC.planta.selecionarRamal(id), r.id); await pg.waitForTimeout(300);
    const bt = pg.locator('.pn[data-pn="ramal"] .pn-acoes button:has-text("Apagar as posições escritas")');
    ok(await bt.count() === 1, 'Painel do R9.1: botão «Apagar as posições escritas (vale o desenho)»');
    await bt.click(); await pg.waitForTimeout(300);
    ok(await h.v(() => VC.dados.ramais.filter(x => x.parente === 'R9.1').every(x => x.sPai == null)), 'O botão apaga as posições escritas dos sub-ramais');
    await pg.locator('#plantaSVG').hover(); await pg.keyboard.press('Control+z'); await pg.waitForTimeout(300);
    ok(await h.v(() => VC.dados.ramais.find(x => x.nome === 'R9.1.2').sPai === 3.42), 'Ctrl+Z repõe-nas');
  },

  /* PR 70 · manual de desenho dentro da app */
  async guia(pg, ok) {
    const h = ajudas(pg);
    await pg.evaluate(async () => { await VC._carregarExemploDeFicheiro(['exemplos/degrade-21nov26-corrigido.json'], 'x'); VC.nav.irPasso('rede'); VC.nav.setVista('planta'); VC.planta.setPiso('piso-p0'); });
    await pg.waitForTimeout(1200);
    ok(await h.v(() => !!document.querySelector('.dropdown [data-guia]')), 'Menu Docs → Manual de desenho');
    ok(await h.v(() => document.querySelectorAll('.planta-flyout .pfo-cab .guia-ajuda').length === document.querySelectorAll('.planta-grupo[data-grupo]').length), '«?» em cada grupo de ícones');
    await h.v(() => { const r = VC.dados.ramais.find(x => x.nome === 'R1.1'); VC.planta.selecionarRamal(r.id); });
    await pg.waitForTimeout(300);
    await pg.click('.pn[data-pn="ramal"] .pn-cab .guia-ajuda'); await pg.waitForTimeout(1200);
    const a = await h.v(() => { const f = document.getElementById('guiaQuadro'); return [document.getElementById('guiaJanela').classList.contains('aberto'), f.getAttribute('src'), !!(f.contentDocument && f.contentDocument.getElementById('tracar-ramal'))]; });
    ok(a[0] && /#tracar-ramal$/.test(a[1]) && a[2], '«?» do painel do ramal abre o manual em «Traçar um ramal»', a);
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);
    const esc = await h.v(() => [document.getElementById('guiaJanela').classList.contains('aberto'), VC.planta.ramalSel, document.activeElement && document.activeElement.tagName, VC.guia.aberto]);
    ok(!esc[0] && esc[1] != null, 'Esc fecha o manual sem largar a seleção', esc);
    await h.v(() => { const r = VC.dados.ramais.find(x => x.nome === 'R1.1'), a = r.planta.pts[0], b = r.planta.pts[1]; VC.planta.selecionarTrocoEm(r, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]); });
    await pg.locator('#plantaSVG').hover(); await pg.keyboard.press('F1'); await pg.waitForTimeout(500);
    ok(await h.v(() => /#ajustar-troco$/.test(document.getElementById('guiaQuadro').getAttribute('src')) || document.getElementById('guiaQuadro').dataset.ancora === 'ajustar-troco'), 'F1 com um troço selecionado abre «Ajustar o Ø de um troço»');
    const faltam = await h.v(() => { const d = document.getElementById('guiaQuadro').contentDocument, G = VC.guia; return [].concat(Object.values(G.GRUPOS), Object.values(G.PAINEIS), Object.values(G.FERRAMENTAS), ['comecar', 'ref-painel']).filter(id => !d.getElementById(id)); });
    ok(faltam.length === 0, 'Todas as ligações da app existem no manual', faltam);
    const img = await h.v(async () => { const d = document.getElementById('guiaQuadro').contentDocument; const L = [...d.images]; await Promise.all(L.map(i => { i.loading = 'eager'; return i.decode().catch(() => null); })); return [L.length, L.filter(i => !i.naturalWidth).map(i => i.getAttribute('src'))]; });
    ok(img[0] >= 18 && img[1].length === 0, 'O manual tem as imagens todas (' + img[0] + ')', img[1]);
  },

  /* PR 68 · Fases 1C e 0B: nomes sempre, cores/textos no Ctrl+Z, campos novos */
  async campos(pg, ok) {
    const h = ajudas(pg);
    await pg.evaluate(async () => { await VC._carregarExemploDeFicheiro(['exemplos/degrade-21nov26-corrigido.json'], 'x'); VC.nav.irPasso('rede'); VC.nav.setVista('planta'); VC.planta.setPiso('piso-p0'); VC.planta.zoom = 0.35; VC.planta.aplicarVista(); VC.planta.redesenhar(); });
    await pg.waitForTimeout(1200);
    const esc0 = await h.v(() => document.querySelectorAll('.planta-rotulo text[data-escondido]').length);
    await h.v(() => VC.paineis.definir('piso', 'piso-p0', 'nomesSalasSempre', true));
    await pg.waitForTimeout(400);
    const esc1 = await h.v(() => [...document.querySelectorAll('.planta-rotulo')].filter(g => { const t = g.querySelector('text'); return t && t.getAttribute('data-escondido'); }).length);
    ok(esc1 === 0, '«Mostrar sempre os nomes das salas»: nenhum nome escondido', [esc0, esc1]);
    await pg.locator('#plantaSVG').hover(); await pg.keyboard.press('Control+z'); await pg.waitForTimeout(300);
    ok(await h.v(() => !VC.dados.params.nomesSalasSempre), 'Ctrl+Z desfaz a opção');
    await h.v(() => VC.paineis.definir('piso', 'piso-p0', 'cor_SUP', '#ff0000'));
    ok(await h.v(() => VC.planta.cores().SUP === '#ff0000'), 'Cor da insuflação mudada');
    await pg.locator('#plantaSVG').hover(); await pg.keyboard.press('Control+z'); await pg.waitForTimeout(300);
    ok(await h.v(() => VC.planta.cores().SUP !== '#ff0000'), 'Ctrl+Z repõe a cor');
    await h.v(() => VC.planta.mudarTextos(0.2));
    await pg.locator('#plantaSVG').hover(); await pg.keyboard.press('Control+z'); await pg.waitForTimeout(300);
    ok(await h.v(() => !VC.dados.params.escalaTextos), 'Ctrl+Z repõe o tamanho dos textos');
    await h.v(() => { VC.paineis.definir('piso', 'piso-p0', 'norte', 30); VC.paineis.definir('piso', 'piso-p0', 'hTeto', 300); });
    await pg.waitForTimeout(300);
    ok(await h.v(() => { const g = document.querySelector('.planta-norte'); return g && /rotate\(30\)/.test(g.getAttribute('transform')); }), 'Seta do norte a 30°');
    ok(await h.v(() => { const r = VC.dados.ramais.find(x => x.planta && x.planta.pisoId === 'piso-p0' && !(x.geometriaInput && x.geometriaInput.proprio && x.geometriaInput.proprio.H_max)); return !r || VC.calculo.hMaxDe(r) === 300; }), 'Ramais do piso usam o teto falso (300 mm)');
    const nv = await h.v(() => { const P = VC.planta, r = VC.dados.ramais.find(x => x.planta && x.planta.pisoId === 'piso-p0'); P.selecionarRamal(r.id); VC.paineis.definir('ramal', r.id, 'nivel', '4'); return [r.nivelNumero, VC.calculo.vMaxDe(r), !!document.querySelector('#pn-ramal-nivel'), VC.constantes.VMAX_NIVEL[4]]; });
    ok(nv[0] === 4 && nv[1] === nv[3] && nv[2], 'Nível do ramal no painel: N4 → v máx. ' + nv[1] + ' m/s', nv);
    const sala = await h.v(() => { const P = VC.planta, e = VC.dados.espacos.find(x => x.nome === 'Sala P0-S3'); e.tipo = 'Escritório'; const n = e.N; delete e.N; P.selecionar(e.id); const ph = document.querySelector('#pn-sala-N'); const r = ph ? ph.getAttribute('placeholder') : null; e.N = n; return [r, P.nPelaDensidade(e), P.tipoPeloNome('Casa de Banho P1'), P.tipoPeloNome('Sala 3')]; });
    ok(sala[1] && sala[1].N === Math.round(34.21 / 10) && sala[2] === 'Sanitários' && sala[3] === null, 'N proposto pela densidade (10 m²/pessoa) e tipo pelo nome', sala);
    ok(await h.v(() => { const e = VC.dados.espacos.find(x => x.tipo === 'Garagem'); VC.planta.selecionar(e.id); return !!document.querySelector('#pn-sala-detecaoCO'); }), 'Garagem: campo «Deteção de CO» no painel');
  },

  /* PR 67 · Fase 1C: seleção múltipla e cor de seleção */
  async multi(pg, ok) {
    const h = ajudas(pg); await prepararPlanta(pg);
    const ids = await h.v(() => { const E = VC.dados.espacos, P = VC.planta; E.forEach(e => delete e.planta);
      E[0].planta = { pisoId: 'pS', pts: [[100, 100], [500, 100], [500, 400], [100, 400]] }; E[1].planta = { pisoId: 'pS', pts: [[500, 100], [700, 100], [700, 400], [500, 400]] };
      E[0].tipo = 'Escritório'; E[1].tipo = 'Escritório'; P.setFerramenta('sel'); P.redesenhar(); return [E[0].id, E[1].id]; });
    await h.clicar([300, 250]);
    ok(await h.v(() => { const g = document.querySelector('.planta-sala.sel polygon'); return g && g.getAttribute('stroke') === VC.planta.COR_SEL && VC.planta.COR_SEL === '#c026d3'; }), 'Sala selecionada com a cor de seleção única (magenta)');
    await pg.keyboard.down('Shift'); await h.clicar([600, 250]); await pg.keyboard.up('Shift');
    ok(await h.v(() => VC.planta.multi.length === 2 && !!document.querySelector('.pn-multi') && document.querySelectorAll('.planta-multi polygon').length === 2), 'Shift+clique junta a segunda sala: painel de 2 objetos');
    await pg.selectOption('#pn-multi-sala-tipo', 'Sala de reuniões').catch(async () => { const v = await h.v(() => [...document.querySelectorAll('#pn-multi-sala-tipo option')].map(o => o.value).find(x => x && x !== 'Escritório')); await pg.selectOption('#pn-multi-sala-tipo', v); });
    await pg.waitForTimeout(300);
    const tipos = await pg.evaluate(ids => ids.map(i => VC.dados.espacos.find(e => e.id === i).tipo), ids);
    ok(tipos[0] === tipos[1] && tipos[0] !== 'Escritório', 'Mudar o tipo no painel muda-o nas duas salas', tipos);
    await pg.locator('#plantaSVG').hover(); await pg.keyboard.press('Control+z'); await pg.waitForTimeout(300);
    ok(await pg.evaluate(ids => ids.every(i => VC.dados.espacos.find(e => e.id === i).tipo === 'Escritório'), ids), 'Um só Ctrl+Z repõe as duas');
    await pg.keyboard.down('Shift'); await h.clicar([600, 250]); await pg.keyboard.up('Shift');
    ok(await h.v(() => !VC.planta.multi.length && VC.planta.selecionado != null), 'Shift+clique outra vez tira-a: fica a seleção simples');
    await h.tecla('Escape'); await h.tecla('Escape');
    await h.arrastar([60, 60], [600, 450]);
    ok(await pg.evaluate(id => VC.planta.selecionado === id && !VC.planta.multi.length, ids[0]), 'Janela da esquerda para a direita: só a sala toda dentro');
    await h.arrastar([650, 450], [60, 60]);
    ok(await h.v(() => VC.planta.multi.length === 2), 'Janela da direita para a esquerda: apanha também a que toca');
    await h.tecla('Delete');
    ok(await pg.evaluate(ids => ids.every(i => !VC.dados.espacos.find(e => e.id === i).planta), ids), 'Delete apaga os dois desenhos');
    await pg.locator('#plantaSVG').hover(); await pg.keyboard.press('Control+z'); await pg.waitForTimeout(300);
    ok(await pg.evaluate(ids => ids.every(i => !!VC.dados.espacos.find(e => e.id === i).planta), ids), 'Ctrl+Z repõe os dois');
    await h.v(() => { VC.planta.multi = [{ k: 'sala', id: VC.dados.espacos[0].id }, { k: 'sala', id: VC.dados.espacos[1].id }]; VC.planta._aplicarMulti(); });
    await h.tecla('Escape');
    ok(await h.v(() => !VC.planta.multi.length && !document.querySelector('.pn-multi')), 'Esc limpa a seleção múltipla');
    // PR 69 · item 12: encaixe nas paredes da imagem (a planta sintética tem paredes de 3 px em x = 100 e 500)
    const pi = await h.v(async () => { const P = VC.planta; delete VC.dados.params.encaixeImagem; P._paredes = {}; P.paredesDaImagem(P.pisoAtual()); await new Promise(r => setTimeout(r, 1200)); const sv = P.espacosDoPiso; P.espacosDoPiso = () => []; try { return [P.encaixe([103, 250], { salas: true }), P.encaixe([103, 103], { salas: true })]; } finally { P.espacosDoPiso = sv; VC.dados.params.encaixeImagem = false; } });
    ok(pi[0].tipo === 'paredeImg' && Math.abs(pi[0].q[0] - 101.5) < 1.6 && pi[1].tipo === 'cantoImg', 'Encaixe nas paredes da imagem: face e canto', pi);
  },

  /* PR 66 · Fase 6B: controlo de fumo */
  async fumo(pg, ok) {
    const h = ajudas(pg);
    await pg.evaluate(async () => { await VC._carregarExemploDeFicheiro(['exemplos/degrade-21nov26-corrigido.json'], 'x'); VC.nav.irPasso('rede'); VC.nav.setVista('planta'); VC.planta.setPiso('piso-p0'); });
    await pg.waitForTimeout(1200);
    const info = await h.v(() => { const P = VC.planta, e = VC.dados.espacos.find(x => x.nome === 'Refeitório P0-S1'), c = P.centro(e.planta.pts), v = e.planta.pts[0], a = [c[0] + (v[0] - c[0]) * 0.35, c[1] + (v[1] - c[1]) * 0.35], b2 = [c[0] - (v[0] - c[0]) * 0.35, c[1] - (v[1] - c[1]) * 0.35]; e.N = 520; VC.calculo.calcularTudo(); P.zoom = 1; P.vx = c[0] - 380; P.vy = c[1] - 250; P.aplicarVista(); P.selecionar(e.id); return { id: e.id, c, a, b: b2 }; });
    await pg.waitForTimeout(400);
    ok(await h.v(() => (VC.calculo.calcularTudo().findings || []).some(f => f.tipo === 'Controlo de fumo por definir' && f.elemento === 'Refeitório P0-S1')), 'Efetivo 520 (> 500): a Verificação pede o controlo de fumo (art. 135.º)');
    await pg.evaluate(() => { const d = document.querySelector('.pn[data-pn="sala"] .pn-av'); if (d) d.open = true; });
    await pg.selectOption('#pn-sala-desenfumagem', 'ativa'); await pg.waitForTimeout(350);
    const txt = await pg.locator('.pn').first().textContent();
    ok(/Extração de fumo/.test(txt) && /1\.50 m³\/s/.test(txt) && /Bocas de extração/.test(txt), 'Ativa: 1,5 m³/s (mínimo) e as bocas pedidas no painel', txt.match(/Extração de fumo[^A]{0,60}/));
    await h.v(() => VC.planta.setFerramenta('fumoExt')); await h.clicar(info.a);
    await h.v(() => VC.planta.setFerramenta('fumoAdm')); await h.clicar(info.b);
    ok(await pg.evaluate(id => { const e = VC.dados.espacos.find(x => x.id === id); return e.planta.fumo.length === 2 && document.querySelectorAll('.planta-fumo').length === 2; }, info.id), 'Extração e admissão de fumo desenhadas na sala');
    await h.v(() => VC.planta.setFerramenta('sel'));
    await h.clicar(info.a); await pg.waitForTimeout(200); await h.tecla('Delete');
    ok(await pg.evaluate(id => VC.dados.espacos.find(x => x.id === id).planta.fumo.length === 1, info.id), 'Selecionar a boca e Delete tira-a');
    await pg.locator('#plantaSVG').hover(); await pg.keyboard.press('Control+z'); await pg.waitForTimeout(300);
    ok(await pg.evaluate(id => VC.dados.espacos.find(x => x.id === id).planta.fumo.length === 2, info.id), 'Ctrl+Z repõe-na');
    // passiva: círculo de alcance com a sala selecionada
    await pg.evaluate(id => { const e = VC.dados.espacos.find(x => x.id === id); e.desenfumagem = 'passiva'; VC.calculo.calcularTudo(); VC.planta.selecionar(id); }, info.id);
    await pg.waitForTimeout(300);
    ok(await h.v(() => !!document.querySelector('.planta-fumos circle')), 'Passiva: o alcance da abertura (7 × pé-direito) aparece com a sala selecionada');
    ok(await h.v(() => !!document.querySelector('.planta-grupo[data-grupo="fumo"]')), 'Grupo «Segurança contra incêndio» na barra');
    ok(await h.v(() => { const P = VC.planta, e = VC.dados.espacos.find(x => x.tipo === 'Escadas' && x.planta && x.planta.pisoId === 'piso-p0'); P.definirEscada(e.id, 'pressurizada', true); P.definirEscada(e.id, 'deltaP', 50); return !!document.querySelector('.planta-pressao') && /50 Pa/.test(document.querySelector('.planta-pressao').textContent); }), 'Escada pressurizada marcada na planta (P+ 50 Pa)');
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
    if (SO && SO.split(',').indexOf(nome) < 0) continue;   // --so a,b,c: só esses cenários
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
