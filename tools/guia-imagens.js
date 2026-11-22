#!/usr/bin/env node
/* ============================================================
   VentiCondutas · imagens do manual (docs/guia/img)
   ------------------------------------------------------------
   Cada cena abre a app, carrega o exemplo Degrade, põe a planta no estado
   pretendido, desenha as marcas numeradas (os números dos passos do
   manual) e grava só a zona útil. Corre em cada PR que mude a interface:

     node tools/guia-imagens.js --libs <pasta das libs>          todas
     node tools/guia-imagens.js --libs <…> --so ecra,multi        só essas

   As marcas são quase pretas com contorno branco, para não se confundirem
   com nenhuma cor da app (redes, grupos, seleção magenta, avisos).
   ============================================================ */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const RAIZ = path.resolve(__dirname, '..');
const SAIDA = path.join(RAIZ, 'docs', 'guia', 'img');
const args = process.argv.slice(2);
const LIBS = args.includes('--libs') ? path.resolve(args[args.indexOf('--libs') + 1]) : null;
const SO = args.includes('--so') ? String(args[args.indexOf('--so') + 1] || '').split(',') : null;
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

/* Cada cena: prep (corpo de uma função async que corre na página), marcas e recorte.
   Marca: { sel, txt?, n, caixa?, lado? } ou { svg: [x, y] (coordenadas da planta), n }.
   recorte: lista de seletores (a união, com folga) ou [x, y, w, h] na página. */
/* utilidades na página: __centrar(q, zoom, x, y) põe o ponto q da planta em (x, y) do ecrã da planta */
const UTIL = `
  window.__centrar = (q, z, x, y) => { const P = VC.planta; P.zoom = z; P.vx = q[0] - x / z; P.vy = q[1] - y / z; P.aplicarVista(); P.redesenhar(); };
  window.__espera = ms => new Promise(f => setTimeout(f, ms || 300));
  window.__equipR = nomes => nomes.forEach(n => { const P = VC.planta, r = VC.dados.ramais.find(x => x.nome === n), u = VC.dados.utas.find(x => x.id === r.utaRef), a = r.planta.pts[0], b = r.planta.pts[1], l = Math.hypot(b[0]-a[0], b[1]-a[1]); P.colocarEquipamento([a[0] - (b[0]-a[0])/l*45, a[1] - (b[1]-a[1])/l*45], u.id); P.ligarRamaisAoEquip(u.id); });
`;
/* recortes habituais (coordenadas do ecrã 1440 de largura): planta + painel, só a planta (metade), só o painel */
const TUDO = [[315, 146, 1110, 744]], PLANTA = [[315, 146, 760, 574]];
/* Cada cena: prep (corpo de uma função async que corre na página), marcas e recorte.
   Marca: { sel, txt?, n, caixa?, lado? } ou { svgPonto: 'nome' (de pontos), n, lado? }.
   lado: tl, tr, bl, br (canto da caixa, ou do ponto). recorte: [[x, y, w, h]] ou lista de seletores (a união). */
const CENAS = [
  { id: 'ecra', alt: 'O ecrã da planta', prep: `VC.planta.setPiso('piso-p0'); VC.planta.ajustar && VC.planta.ajustar(); await __espera();`,
    marcas: [{ sel: '.planta-ferrbar', n: 1, caixa: true, lado: 'bl' }, { sel: '.planta-topo', n: 2, caixa: true }, { sel: '#plantaPainel', n: 3, caixa: true },
      { sel: '.planta-legenda', n: 4, caixa: true }, { sel: '.planta-zoombar', n: 5, caixa: true, lado: 'tr' }, { sel: '#plantaEstado', n: 6, caixa: true, lado: 'bl' }],
    recorte: ['#plantaTela', '#plantaPainel'], folga: 16 },

  { id: 'grupos', alt: 'Um grupo de ícones aberto', prep: `
      document.querySelector('.planta-grupo[data-grupo="condutas"]').classList.add('aberto'); await __espera(500);`,
    marcas: [{ sel: '.planta-grupo[data-grupo="condutas"] > .planta-ft', n: 1, caixa: true }, { sel: '.planta-grupo[data-grupo="condutas"] .planta-flyout', n: 2, caixa: true, lado: 'tr' }],
    recorte: ['.planta-ferrbar', '.planta-grupo[data-grupo="condutas"] .planta-flyout'], folga: 18 },

  { id: 'contexto', alt: 'Menu do botão direito num ramal', prep: `
      const r = VC.dados.ramais.find(x => x.nome === 'R1.1'), a = r.planta.pts[0], b = r.planta.pts[1], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      __centrar(m, 1.3, 250, 330); await __espera(); window.__m = m;`,
    acao: async pg => { const [x, y] = await pg.evaluate(() => { const s = document.getElementById('plantaSVG'), M = s.getScreenCTM(), p = s.createSVGPoint(); p.x = window.__m[0]; p.y = window.__m[1]; const z = p.matrixTransform(M); return [z.x, z.y]; }); await pg.mouse.click(x, y, { button: 'right' }); await pg.waitForTimeout(500); },
    marcas: [{ svgPonto: 'm', n: 1, lado: 'tl' }, { sel: '#plantaCtx', n: 2, caixa: true, lado: 'tr' }],
    pontos: `return { m: window.__m };`, recorte: TUDO.map(r => [315, 160, 760, 620]) },

  { id: 'escala', alt: 'Calibrar a escala por uma cota', prep: `
      const P = VC.planta, e = VC.dados.espacos.find(x => x.nome === 'Sala P0-S3'), a = e.planta.pts[0], b = e.planta.pts[1];
      __centrar([(a[0] + b[0]) / 2, a[1]], 1.1, 380, 330); P.setFerramenta('escala'); P.escalaPts = [a, b]; P.redesenhar(); await __espera();
      const i = document.getElementById('plantaMetros'); if (i) i.value = '6,35'; window.__p = { a, b };`,
    marcas: [{ svgPonto: 'a', n: 1, lado: 'tl' }, { svgPonto: 'b', n: 2, lado: 'tr' }, { sel: '#plantaMetros', n: 3, caixa: true }],
    pontos: `return window.__p;`, recorte: [[315, 160, 1110, 600]] },

  { id: 'retangulo', alt: 'Retângulo acabado de desenhar', prep: `
      const P = VC.planta, e = VC.dados.espacos.find(x => x.nome === 'Sala P0-S3'), pts = e.planta.pts.map(q => q.slice());
      delete e.planta; __centrar(P.centro(pts), 0.85, 330, 360); P.setFerramenta('ret'); P.pendente = pts; P.redesenhar(); await __espera();
      window.__p = { c0: pts[0], c2: pts[2] };`,
    marcas: [{ svgPonto: 'c0', n: 1, lado: 'tl' }, { svgPonto: 'c2', n: 2, lado: 'br' }, { sel: '#plantaPainel > *:first-child', n: 3, caixa: true }],
    pontos: `return window.__p;`, recorte: TUDO },

  { id: 'paredes', alt: 'O ponto agarra o canto das paredes da imagem', prep: `
      const P = VC.planta, p = P.pisoAtual(); P.paredesDaImagem(p); await __espera(1800);
      const e = VC.dados.espacos.find(x => x.nome === 'Sala P0-S3'), v = e.planta.pts[0];
      delete e.planta; __centrar(v, 1.6, 220, 260); P.setFerramenta('pol'); P.redesenhar(); await __espera(400);
      const q = P.encaixe([v[0] + 4, v[1] + 4], { salas: true }); window.__p = { q: q.q };
      const svg = document.getElementById('plantaSVG'), g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.innerHTML = P._marcadorHTML(q); svg.appendChild(g);`,
    marcas: [{ svgPonto: 'q', n: 1, lado: 'bl' }], pontos: `return window.__p;`, recorte: PLANTA },

  { id: 'editar', alt: 'Sala selecionada com as alças de edição', prep: `
      const P = VC.planta, e = VC.dados.espacos.find(x => x.nome === 'Sala P0-S2'), c = P.centro(e.planta.pts), pts = e.planta.pts;
      __centrar(c, 1.6, 230, 330); P.selecionar(e.id); await __espera();
      const lo = pts.reduce((m, q) => (q[1] > m[1] ? q : m), pts[0]); window.__p = { v: lo, m: [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2], c };`,
    marcas: [{ svgPonto: 'v', n: 1, lado: 'br' }, { svgPonto: 'm', n: 2, lado: 'tr' }, { svgPonto: 'c', n: 3, lado: 'tl' }],
    pontos: `return window.__p;`, recorte: PLANTA },

  { id: 'multi', alt: 'Seleção múltipla e o painel com os campos comuns', prep: `
      const P = VC.planta, e = VC.dados.espacos.find(x => x.nome === 'Sala P0-S1'), f = VC.dados.espacos.find(x => x.nome === 'Sala P0-S3'), c = P.centro(e.planta.pts);
      __centrar(c, 1.0, 230, 360); P.selecionarJanela([c[0] - 60, c[1] - 40], [c[0] + 220, c[1] + 60], true, false); await __espera();
      window.__p = { a: c, b: P.centro(f.planta.pts) };`,
    marcas: [{ svgPonto: 'a', n: 1, lado: 'tl' }, { svgPonto: 'b', n: 1, lado: 'tl' }, { sel: '.pn-multi-nomes', n: 2, caixa: true }, { sel: '#pn-multi-sala-tipo', n: 3, caixa: true }],
    pontos: `return window.__p;`, recorte: TUDO },

  { id: 'contar', alt: 'Pessoas contadas na sala', prep: `
      const P = VC.planta, p = P.pisoAtual(), of = P.espacosDoPiso(p).find(e => /^Sala P0-S3/.test(e.nome)), c = P.centro(of.planta.pts);
      [[-30,30],[-10,30],[10,30],[30,30],[-20,50],[0,50],[20,50]].forEach(d => P.porIcone([c[0]+d[0], c[1]+d[1]], 'pessoa'));
      P.setFerramenta('icPessoa'); P.selecionar(of.id); __centrar(c, 1.4, 460, 300); await __espera();
      document.querySelector('.planta-grupo[data-grupo="contar"]').classList.add('aberto'); await __espera(450);
      window.__p = { c: [c[0], c[1] + 40] };`,
    marcas: [{ sel: '.planta-grupo[data-grupo="contar"] .planta-flyout', n: 1, caixa: true, lado: 'tr' }, { svgPonto: 'c', n: 2, lado: 'br' }, { sel: '#pn-sala-N', n: 3, caixa: true }],
    pontos: `return window.__p;`, recorte: TUDO },

  { id: 'ramal', alt: 'Painel do ramal R1.1', alto: 1700, prep: `
      const P = VC.planta, r = VC.dados.ramais.find(x => x.nome === 'R1.1'); P.selecionarRamal(r.id); await __espera();`,
    marcas: [{ sel: '.pn[data-pn="ramal"] .pn-cab', n: 1, caixa: true }, { sel: '#pn-ramal-utaRef', n: 2, caixa: true }, { sel: '#pn-ramal-nivel', n: 3, caixa: true }],
    recorte: ['.pn[data-pn="ramal"] .pn-cab', '#pn-ramal-nivel'], folga: 20, largura: '.pn[data-pn="ramal"]' },

  { id: 'troco', alt: 'Um troço selecionado e o seu painel', alto: 1150, prep: `
      const P = VC.planta, r = VC.dados.ramais.find(x => x.nome === 'R1.1'), a = r.planta.pts[0], b = r.planta.pts[1], t = [a[0] + (b[0] - a[0]) * 0.15, a[1] + (b[1] - a[1]) * 0.15];
      P.selecionarRamal(r.id); P.selecionarTrocoEm(r, t); __centrar(t, 1.4, 380, 360); await __espera(); window.__p = { t };`,
    marcas: [{ svgPonto: 't', n: 1, lado: 'tl' }, { sel: '.pn .pn-sec', n: 2, caixa: true }, { sel: '.pn .pn-res', n: 3, caixa: true }],
    pontos: `return window.__p;`, recorte: ['#plantaTela', '.pn .pn-res'], folga: 8 },

  { id: 'equipamento', alt: 'Equipamento na planta, ligado aos ramais', alto: 1200, prep: `
      const P = VC.planta; __equipR(['R1.1', 'R2.1']); const u = VC.dados.utas.find(x => x.nome === 'VAN P0 N'); P.selecionarEquip(u.id);
      __centrar([u.planta.x, u.planta.y], 1.7, 300, 380); await __espera(); window.__p = { u: [u.planta.x, u.planta.y] };`,
    marcas: [{ svgPonto: 'u', n: 1, lado: 'bl' }, { sel: '.pn .pn-res', n: 2, caixa: true }],
    pontos: `return window.__p;`, recorte: ['#plantaTela', '.pn .pn-res'], folga: 8 },

  { id: 'vcm', alt: 'VCM do refeitório com as 4 ligações', prep: `
      const P = VC.planta, p = P.pisoAtual(), i = VC.dados.utas.find(u => /VCM Refeit.*insufla/.test(u.nome)), r = P.ramaisDoPiso(p).find(r => r.utaRef === i.id), a = r.planta.pts[0];
      P.colocarEquipamento([a[0] - 30, a[1]], i.id); P.ligarRamaisAoEquip(i.id); P.selecionarEquip(i.id);
      __centrar([i.planta.x, i.planta.y], 1.8, 230, 340); await __espera(); window.__p = { u: [i.planta.x, i.planta.y] };`,
    marcas: [{ svgPonto: 'u', n: 1, lado: 'tl' }], pontos: `return window.__p;`, recorte: PLANTA },

  { id: 'exterior', alt: 'Tomada e rejeição na fachada', alto: 1200, prep: `
      const P = VC.planta; __equipR(['R1.1', 'R2.1']);
      const van = VC.dados.utas.find(x => x.nome === 'VAN P0 N'), veg = VC.dados.utas.find(x => x.nome === 'VEG P0 N');
      P.colocarGrelha([van.planta.x + 60, van.planta.y - 40], van.id); P.colocarGrelha([veg.planta.x - 60, veg.planta.y + 50], veg.id);
      P.extSel = veg.id; __centrar([van.planta.x, van.planta.y], 1.4, 330, 360); await __espera();
      window.__p = { t: [van.planta.x + 60, van.planta.y - 40], r: [veg.planta.x - 60, veg.planta.y + 50] };`,
    marcas: [{ svgPonto: 't', n: 1, lado: 'tr' }, { svgPonto: 'r', n: 2, lado: 'bl' }, { sel: '.pn .pn-res', n: 3, caixa: true }],
    pontos: `return window.__p;`, recorte: ['#plantaTela', '.pn .pn-res'], folga: 8 },

  { id: 'acessorios', alt: 'Acessórios em cima do ramal', prep: `
      const P = VC.planta, r = VC.dados.ramais.find(x => x.nome === 'R1.1'), a = r.planta.pts[0], b = r.planta.pts[1], L = Math.hypot(b[0]-a[0], b[1]-a[1]);
      const at = k => [a[0] + (b[0]-a[0])*k/L, a[1] + (b[1]-a[1])*k/L];
      P.colocarAcessorio(at(40), 'cortafogo'); P.colocarAcessorio(at(110), 'registo'); P.colocarAcessorio(at(200), 'silenciador');
      P.escolherFerramenta('acess'); P.acessTipo = 'silenciador'; const rr = VC.dados.ramais.find(x => x.nome === 'R1.1'); P.acessSel = { r: rr.id, a: rr.acessorios[2].id };
      __centrar(at(120), 1.8, 380, 360); await __espera(); window.__p = { a: at(40), b: at(110), c: at(200) };`,
    marcas: [{ svgPonto: 'a', n: 1, lado: 'tl' }, { svgPonto: 'b', n: 2, lado: 'tl' }, { svgPonto: 'c', n: 3, lado: 'tl' }, { sel: '.acess-tipos', n: 4, caixa: true }],
    pontos: `return window.__p;`, recorte: [[315, 160, 1110, 520]] },

  { id: 'prumada', alt: 'Cartão da prumada nova', prep: `
      const P = VC.planta; P.setPiso('piso-mez');
      VC.dados.plantas.find(p => p.id === 'piso-mez').cota = 3.5; VC.dados.plantas.find(p => p.id === 'piso-p1').cota = 6.6;
      const r = VC.dados.ramais.find(x => x.nome === 'R5.1'), q = r.planta.pts[r.planta.pts.length - 1];
      P.ferramenta = 'prumada'; P.iniciarPrumada(q); __centrar(q, 1.3, 380, 360); await __espera(); window.__p = { q };`,
    marcas: [{ svgPonto: 'q', n: 1, lado: 'tl' }, { sel: '#plantaPainel > *:first-child', n: 2, caixa: true }],
    pontos: `return window.__p;`, recorte: [[315, 160, 1110, 600]] },

  { id: 'terminais', alt: 'Terminal com a direção e o alcance do jato', alto: 1200, prep: `
      const P = VC.planta, p = P.pisoAtual(), of = P.espacosDoPiso(p).find(e => /^Sala P0-S3/.test(e.nome)), c = P.centro(of.planta.pts);
      const ts = P.terminaisDe(of).filter(t => t.planta && t.rede === 'insuflacao'); P.mostrarAlcances = true; P.selecionarTerminal(ts[0].id);
      __centrar(c, 1.1, 380, 330); await __espera(400); window.__p = { t: [ts[0].planta.x, ts[0].planta.y] };`,
    marcas: [{ svgPonto: 't', n: 1, lado: 'bl' }, { sel: '#pn-terminal-dir', n: 2, caixa: true }, { sel: '.pn .pn-res', n: 3, caixa: true }],
    pontos: `return window.__p;`, recorte: ['#plantaTela', '.pn .pn-res'], folga: 8 },

  { id: 'fumo', alt: 'Controlo de fumo no refeitório', prep: `
      const P = VC.planta, e = VC.dados.espacos.find(x => x.nome === 'Refeitório P0-S1'), c = P.centro(e.planta.pts), v = e.planta.pts[0];
      e.N = 520; e.desenfumagem = 'passiva'; e.planta.fumo = [{ tipo: 'ext', x: c[0] + (v[0] - c[0]) * 0.4, y: c[1] + (v[1] - c[1]) * 0.4 }, { tipo: 'adm', x: c[0] - (v[0] - c[0]) * 0.4, y: c[1] - (v[1] - c[1]) * 0.4 }];
      VC.calculo.calcularTudo(); P.selecionar(e.id); __centrar(c, 1.0, 470, 330);
      document.querySelector('.planta-grupo[data-grupo="fumo"]').classList.add('aberto'); await __espera(450);
      window.__p = { x: [e.planta.fumo[0].x, e.planta.fumo[0].y], a: [e.planta.fumo[1].x, e.planta.fumo[1].y] };`,
    marcas: [{ sel: '.planta-grupo[data-grupo="fumo"] .planta-flyout', n: 1, caixa: true, lado: 'tr' }, { svgPonto: 'x', n: 2, lado: 'tr' }, { svgPonto: 'a', n: 3, lado: 'br' }],
    pontos: `return window.__p;`, recorte: [[315, 160, 760, 620]] },

  { id: 'painel', alt: 'As partes do painel lateral', alto: 1900, prep: `
      const P = VC.planta, e = VC.dados.espacos.find(x => x.nome === 'Sala P0-S3'); P.selecionar(e.id); await __espera();`,
    marcas: [{ sel: '.pn[data-pn="sala"] .pn-cab', n: 1, caixa: true }, { sel: '.pn[data-pn="sala"] > .pn-sec', n: 2, caixa: true }, { sel: '.pn[data-pn="sala"] .pn-av', n: 3, caixa: true },
      { sel: '.pn[data-pn="sala"] .pn-res', n: 4, caixa: true }, { sel: '.pn[data-pn="sala"] .pn-falta', n: 5, caixa: true }, { sel: '.pn[data-pn="sala"] .pn-acoes', n: 6, caixa: true }],
    recorte: ['.pn[data-pn="sala"]'], folga: 22 },

  { id: 'verificar', alt: 'Salas coloridas por dados em falta', prep: `
      const sel = document.querySelector('.planta-topo select'); const o = [...sel.options].find(o => /falta/i.test(o.textContent)); sel.value = o.value; sel.dispatchEvent(new Event('change', { bubbles: true }));
      const e = VC.dados.espacos.find(x => x.nome === 'Átrio Central P0'); __centrar(VC.planta.centro(e.planta.pts), 0.8, 300, 340); await __espera(400);`,
    marcas: [{ sel: '.planta-topo select', n: 1, caixa: true, lado: 'tr' }, { sel: '.planta-aviso-sala', n: 2, lado: 'tr' }],
    recorte: [[315, 160, 760, 620]] }
];

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

/* na página: desenha as marcas e devolve a caixa a recortar (coordenadas da página) */
function marcar([marcas, pontos, recorte, folga, largura]) {
  document.querySelectorAll('.guia-marca').forEach(x => x.remove());
  const sx = window.scrollX, sy = window.scrollY, svg = document.getElementById('plantaSVG');
  const ecra = q => { const m = svg.getScreenCTM(), p = svg.createSVGPoint(); p.x = q[0]; p.y = q[1]; const z = p.matrixTransform(m); return [z.x, z.y]; };
  const div = (css, html) => { const d = document.createElement('div'); d.className = 'guia-marca'; d.style.cssText = 'position:absolute;z-index:99999;pointer-events:none;' + css; if (html) d.innerHTML = html; document.body.appendChild(d); return d; };
  const R = 13, faltam = [];
  marcas.forEach(m => {
    let r;
    if (m.svgPonto) { const q = pontos && pontos[m.svgPonto]; if (!q || !svg) { faltam.push(m.n); return; } const [x, y] = ecra(q); r = { left: x - 6, top: y - 6, right: x + 6, bottom: y + 6 }; }
    else { const el = [...document.querySelectorAll(m.sel)].find(e => !m.txt || e.textContent.indexOf(m.txt) >= 0); if (!el) { faltam.push(m.n); return; } const b = el.getBoundingClientRect(); if (!b.width) { faltam.push(m.n); return; } r = b; }
    if (m.caixa) div('left:' + (r.left + sx - 3) + 'px;top:' + (r.top + sy - 3) + 'px;width:' + (r.right - r.left + 6) + 'px;height:' + (r.bottom - r.top + 6) + 'px;border:2.5px solid #0f172a;border-radius:7px;box-shadow:0 0 0 2px #fff, inset 0 0 0 1.5px #fff;box-sizing:border-box');
    const lado = m.lado || 'tl', g = 9;
    // caixa: o número fica em cima do canto (metade dentro, metade fora); ponto: o número fica ao lado, a apontar
    const pos = m.caixa ? { tl: [r.left + 4, r.top + 4], tr: [r.right - 4, r.top + 4], bl: [r.left + 4, r.bottom - 4], br: [r.right - 4, r.bottom - 4] }[lado]
      : { tl: [r.left - R - g, r.top - R - g], tr: [r.right + R + g, r.top - R - g], bl: [r.left - R - g, r.bottom + R + g], br: [r.right + R + g, r.bottom + R + g] }[lado];
    div('left:' + (pos[0] + sx - R) + 'px;top:' + (pos[1] + sy - R) + 'px;width:' + 2 * R + 'px;height:' + 2 * R + 'px;border-radius:50%;background:#0f172a;color:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);font:700 14px/22px system-ui,-apple-system,Segoe UI,sans-serif;text-align:center;box-sizing:border-box', String(m.n));
  });
  let box;
  if (Array.isArray(recorte) && recorte.length && typeof recorte[0] === 'string') {
    const rs = recorte.map(s => document.querySelector(s)).filter(Boolean).map(e => e.getBoundingClientRect());
    box = [Math.min(...rs.map(r => r.left)), Math.min(...rs.map(r => r.top)), Math.max(...rs.map(r => r.right)), Math.max(...rs.map(r => r.bottom))];
    if (largura) { const L = document.querySelector(largura); if (L) { const b = L.getBoundingClientRect(); box[0] = Math.min(box[0], b.left); box[2] = Math.max(box[2], b.right); } }
    const f = folga || 8; box = [box[0] - f, box[1] - f, box[2] + f, box[3] + f];
  } else { const c = recorte[0]; box = [c[0], c[1], c[0] + c[2], c[1] + c[3]]; }
  const W = document.documentElement.scrollWidth, H = document.documentElement.scrollHeight;
  box = [Math.max(0, box[0] + sx), Math.max(0, box[1] + sy), Math.min(W, box[2] + sx), Math.min(H, box[3] + sy)];
  return { clip: { x: Math.round(box[0]), y: Math.round(box[1]), width: Math.round(box[2] - box[0]), height: Math.round(box[3] - box[1]) }, faltam };
}

(async () => {
  fs.mkdirSync(SAIDA, { recursive: true });
  const srv = await servidor();
  const browser = await chromium.launch();
  let erros = 0;
  for (const c of CENAS) {
    if (SO && SO.indexOf(c.id) < 0) continue;
    const pg = await browser.newPage({ viewport: { width: 1440, height: c.alto || 900 }, deviceScaleFactor: 1.5 });
    pg.on('pageerror', e => console.log('  erro JS (' + c.id + '):', e.message));
    pg.on('dialog', d => d.accept());
    if (LIBS) {
      await pg.route(/jspdf\.umd/, r => r.fulfill({ path: path.join(LIBS, 'jspdf.umd.min.js'), contentType: 'application/javascript' }));
      await pg.route(/autotable/, r => r.fulfill({ path: path.join(LIBS, 'jspdf.plugin.autotable.min.js'), contentType: 'application/javascript' }));
      await pg.route(/xlsx/, r => r.fulfill({ path: path.join(LIBS, 'xlsx.full.min.js'), contentType: 'application/javascript' }));
      await pg.route(/font-awesome/, r => r.fulfill({ body: '', contentType: 'text/css' }));
    }
    await pg.goto('http://127.0.0.1:' + srv.address().port + '/index.html');
    await pg.waitForTimeout(2500);
    await pg.evaluate(async () => { VC.ui.toast = () => {}; await VC._carregarExemploDeFicheiro(['exemplos/degrade-21nov26-corrigido.json'], 'x'); VC.nav.irPasso('rede'); VC.nav.setVista('planta'); VC.planta.setPiso('piso-p0'); });
    await pg.waitForTimeout(1200);
    try {
      await pg.evaluate(UTIL);
      await pg.evaluate('(async () => {' + c.prep + '})()');
      if (c.acao) await c.acao(pg);
      await pg.waitForTimeout(250);
      const pontos = c.pontos ? await pg.evaluate('(() => {' + c.pontos + '})()') : null;
      await pg.evaluate(() => document.querySelectorAll('#toast, .toast, [class*="toast"]').forEach(t => { t.style.display = 'none'; }));
      const r = await pg.evaluate(marcar, [c.marcas, pontos, c.recorte, c.folga, c.largura]);
      await pg.waitForTimeout(100);
      await pg.screenshot({ path: path.join(SAIDA, c.id + '.png'), clip: r.clip, fullPage: true });
      console.log((r.faltam.length ? '  ! ' : '  ✓ ') + c.id + '.png ' + r.clip.width + '×' + r.clip.height + (r.faltam.length ? ' · marcas sem alvo: ' + r.faltam.join(', ') : ''));
      if (r.faltam.length) erros++;
    } catch (e) { erros++; console.log('  ✗ ' + c.id + ': ' + e.message.split('\n')[0]); }
    await pg.close();
  }
  await browser.close(); srv.close();
  // PNG de 256 cores (cerca de 1/3 do tamanho, texto nítido); usa o Python com Pillow se houver, senão ficam como estão
  const py = 'import sys,glob\nfrom PIL import Image\nfor f in sys.argv[2:]:\n  i=Image.open(f).convert("RGB").quantize(colors=256,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE); i.save(f,optimize=True)';
  const feitas = CENAS.filter(c => !SO || SO.indexOf(c.id) >= 0).map(c => path.join(SAIDA, c.id + '.png')).filter(f => fs.existsSync(f));
  const q = require('child_process').spawnSync('python3', ['-c', py, '_'].concat(feitas), { encoding: 'utf8' });
  if (q.status !== 0) console.log('  (sem Pillow: as imagens ficam em PNG de 24 bits)');
  // largura e altura das imagens no manual (evita saltos da página enquanto as imagens carregam)
  const ind = path.join(RAIZ, 'docs', 'guia', 'index.html');
  if (fs.existsSync(ind)) {
    const tam = f => { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };   // cabeçalho IHDR do PNG
    const html = fs.readFileSync(ind, 'utf8').replace(/<img src="(img\/[^"]+\.png)"(?: width="\d+" height="\d+")?/g, (m, src) => {
      const f = path.join(RAIZ, 'docs', 'guia', src); if (!fs.existsSync(f)) return m;
      const [w, h] = tam(f); return '<img src="' + src + '" width="' + Math.round(w / 1.5) + '" height="' + Math.round(h / 1.5) + '"';
    });
    fs.writeFileSync(ind, html);
  }
  console.log(erros ? '✗ ' + erros + ' cena(s) com problemas' : '✓ imagens do manual em docs/guia/img');
  process.exit(erros ? 1 : 0);
})();
