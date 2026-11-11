#!/usr/bin/env node
/* ============================================================
   VentiCondutas · verificação automática (fora do navegador)
   ------------------------------------------------------------
   Abre o index.html num Chromium sem janela e verifica:
     1. arranque sem erros JS
     2. suite interna VC6.testes (todos devem passar)
     3. auditoria calcularTudo() (resumo de findings por tipo)
     4. os 15 relatórios (sem exceções, sem "undefined"/"NaN")
     5. exportações PDF e Excel (ficheiro gerado)
     6. funções VC.* chamadas pelo código e que não existem
     7. percurso pelos ecrãs (6 etapas × 4 lentes × passos) a clicar
        em cada botão seguro e a registar erros JS

   Uso:
     npm install                 (uma vez)
     npx playwright install chromium   (uma vez)
     npm run verificar

   Opções:
     --sem-percurso        não percorre os ecrãs (mais rápido)
     --libs <pasta>        usa cópias locais das bibliotecas CDN
                           (jspdf.umd.min.js, jspdf.plugin.autotable.min.js,
                            xlsx.full.min.js) em vez da internet
     --json <ficheiro>     grava o resultado completo em JSON

   Termina com código 1 se houver testes a falhar, erros JS,
   relatórios com exceção ou exportações sem ficheiro.
   ============================================================ */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const RAIZ = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opc = {
  percurso: !args.includes('--sem-percurso'),
  libs: args.includes('--libs') ? path.resolve(args[args.indexOf('--libs') + 1]) : null,
  json: args.includes('--json') ? path.resolve(args[args.indexOf('--json') + 1]) : null
};

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

/* scripts carregados pelo index.html, pela ordem */
function scriptsCarregados() {
  const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  return [...html.matchAll(/<script src="([^"]+\.js)[^"]*"/g)].map(m => m[1]).filter(s => !/^https?:/.test(s));
}

/* caminhos VC.a.b( / VC6.a.b( usados no código */
function chamadasNoCodigo() {
  const pat = /\b(VC6?(?:\.[A-Za-z_$][\w$]*)+)\(/g;   // chamada = nome colado ao '('
  const mapa = {};
  const ficheiros = scriptsCarregados().concat(['index.html']);
  ficheiros.forEach(f => {
    fs.readFileSync(path.join(RAIZ, f), 'utf8').split('\n').forEach((linha, i) => {
      if (/^\s*(\/\/|\/\*|\*)/.test(linha)) return;   // ignora comentários
      if (/_cartaoVisualCard\(/.test(linha)) return;      // cartões de gráficos: protegidos ('Em desenvolvimento' se a função não existir)
      for (const m of linha.matchAll(pat)) (mapa[m[1]] = mapa[m[1]] || []).push(f + ':' + (i + 1));
    });
  });
  return mapa;
}

(async () => {
  const srv = await servidor();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const erros = [];
  page.on('pageerror', e => erros.push(String(e.message)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) erros.push(m.text()); });
  page.on('dialog', d => d.accept());
  if (opc.libs) {
    const lib = n => path.join(opc.libs, n);
    await page.route(/jspdf\.umd/, r => r.fulfill({ path: lib('jspdf.umd.min.js'), contentType: 'application/javascript' }));
    await page.route(/autotable/, r => r.fulfill({ path: lib('jspdf.plugin.autotable.min.js'), contentType: 'application/javascript' }));
    await page.route(/xlsx/, r => r.fulfill({ path: lib('xlsx.full.min.js'), contentType: 'application/javascript' }));
    await page.route(/font-awesome/, r => r.fulfill({ body: '', contentType: 'text/css' }));
  }

  const R = { versao: null, arranque: {}, testes: {}, auditoria: {}, relatorios: [], exportacoes: {}, funcoesEmFalta: [], percurso: {} };

  /* 1. arranque */
  await page.goto(base + 'index.html');
  await page.waitForTimeout(2500);
  R.versao = await page.evaluate(() => window.VC && VC.versao);
  R.arranque = { erros: erros.slice(), modulos: await page.evaluate(() => (VC._boot && VC._boot.partes || []).length) };

  /* 2. testes internos */
  R.testes = await page.evaluate(() => {
    const r = VC6.testes.correr();
    return { total: r.total, pass: r.pass, fail: r.fail, falhas: r.detalhe.filter(t => t.estado !== 'pass').map(t => t.id + ' · ' + t.nome) };
  });

  /* 3. auditoria */
  R.auditoria = await page.evaluate(() => {
    const x = VC.calculo.calcularTudo();
    const porTipo = {};
    (x.findings || []).forEach(f => { const k = f.severidade + ' · ' + f.tipo; porTipo[k] = (porTipo[k] || 0) + 1; });
    return { estado: x.overall, total: (x.findings || []).length, porTipo };
  });

  /* 4. relatórios */
  R.relatorios = await page.evaluate(() => (VC.listaRelatorios || []).map(r => {
    try {
      const txt = String(VC.relatorios[r.id]()).replace(/<[^>]+>/g, ' ');
      const suspeito = (txt.match(/.{0,30}\b(undefined|NaN|\[object Object\])\b.{0,20}/) || [])[0] || '';
      return { id: r.id, ok: !suspeito, tamanho: txt.length, suspeito };
    } catch (e) { return { id: r.id, ok: false, erro: e.message }; }
  }));

  /* 5. exportações */
  for (const [nome, chamada] of [['pdf', 'VC.exportacoes.pdf()'], ['excel', 'VC.exportacoes.excel()']]) {
    const antes = erros.length;
    const dl = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
    await page.evaluate(c => { try { (0, eval)(c); } catch (e) { console.error('EXCEÇÃO ' + e.message); } }, chamada);
    const d = await dl;
    R.exportacoes[nome] = { ficheiro: d ? d.suggestedFilename() : null, erros: erros.slice(antes) };
  }

  /* 6. funções chamadas que não existem */
  const chamadas = chamadasNoCodigo();
  R.funcoesEmFalta = await page.evaluate(ch => {
    const out = [];
    for (const [p, locs] of Object.entries(ch)) {
      let o = window, ok = true;
      for (const k of p.split('.')) { if (o == null || !(k in Object(o))) { ok = false; break; } o = o[k]; }
      if (!ok || typeof o !== 'function') out.push({ funcao: p, onde: locs.slice(0, 3) });
    }
    return out;
  }, chamadas);

  /* 7. percurso pelos ecrãs */
  if (opc.percurso) {
    const proibido = /apagar|remover|eliminar|limpar|reset|repor|novo|nova|importar|carregar|excluir|desfazer|refazer|imprimir|exportar|descarregar|download|pdf|xlsx|csv|json|window\.open|location|confirm|prompt|gerarAutomatica|regenerar|autoBalanc|aplicarATodos|delete|splice|setLente|setJanela|fechada|classList\.toggle/i;
    const visiveis = () => page.evaluate(() => [...document.querySelectorAll('[onclick]')].filter(e => e.offsetParent).map(e => e.getAttribute('onclick')));
    const clicar = a => page.evaluate(a => { const el = [...document.querySelectorAll('[onclick]')].find(e => e.getAttribute('onclick') === a && e.offsetParent); if (el) el.click(); }, a);
    const ir = async (j, l, passo) => {
      await page.click(`button[data-janela="${j}"]`); await page.waitForTimeout(150);
      await page.click(`button[data-lente="${l}"]`); await page.waitForTimeout(200);
      if (passo) { await clicar(passo); await page.waitForTimeout(200); }
    };
    const visto = new Set(); const comErro = {}; let cliques = 0;
    for (const j of [1, 2, 3, 4, 5, 6]) for (const l of ['passo', 'hasse', 'tabela', 'kanban']) {
      await ir(j, l);
      const passos = (await visiveis()).filter(a => /^VC\.ui\.setPasso\(/.test(a));
      for (const ps of [null, ...passos]) {
        await ir(j, l, ps);
        for (const a of [...new Set(await visiveis())]) {
          const k = a.replace(/\d+/g, 'N');
          if (visto.has(k) || proibido.test(a) || /^VC\.ui\.setPasso/.test(a)) continue;
          visto.add(k);
          const antes = erros.length;
          await clicar(a).catch(e => erros.push('CLIQUE ' + e.message));
          cliques++; await page.waitForTimeout(100);
          if (erros.length > antes) comErro[`J${j}/${l}${ps ? '/' + (ps.match(/'(.+)'/) || [])[1] : ''} · ${a.slice(0, 90)}`] = [...new Set(erros.slice(antes))];
          await page.keyboard.press('Escape').catch(() => {});
          await page.evaluate(() => { try { VC.ui.fecharModal && VC.ui.fecharModal(); } catch (e) {} });
          await ir(j, l, ps);
        }
      }
    }
    R.percurso = { cliques, acoesComErro: comErro };
  }

  await browser.close(); srv.close();

  /* ---------- resumo ---------- */
  const ok = s => (s ? '✓' : '✗');
  const relFalhados = R.relatorios.filter(r => !r.ok);
  const expFalhadas = Object.entries(R.exportacoes).filter(([, v]) => !v.ficheiro);
  const nPercurso = Object.keys(R.percurso.acoesComErro || {}).length;
  console.log('\nVentiCondutas · verificação · ' + (R.versao || '?'));
  console.log('──────────────────────────────────────────');
  console.log(`${ok(!R.arranque.erros.length)} Arranque: ${R.arranque.modulos} módulos, ${R.arranque.erros.length} erros JS`);
  R.arranque.erros.forEach(e => console.log('    · ' + e.slice(0, 160)));
  console.log(`${ok(!R.testes.fail)} Testes internos: ${R.testes.pass}/${R.testes.total}`);
  R.testes.falhas.forEach(f => console.log('    ✗ ' + f));
  console.log(`  Auditoria do exemplo: ${R.auditoria.estado} · ${R.auditoria.total} findings`);
  Object.entries(R.auditoria.porTipo).forEach(([k, v]) => console.log(`    · ${v} × ${k}`));
  console.log(`${ok(!relFalhados.length)} Relatórios: ${R.relatorios.length - relFalhados.length}/${R.relatorios.length}`);
  relFalhados.forEach(r => console.log(`    ✗ ${r.id}: ${r.erro || r.suspeito}`));
  Object.entries(R.exportacoes).forEach(([k, v]) => {
    console.log(`${ok(!!v.ficheiro)} Exportação ${k.toUpperCase()}: ${v.ficheiro || 'sem ficheiro'}`);
    v.erros.forEach(e => console.log('    · ' + e.slice(0, 160)));
  });
  console.log(`${ok(!R.funcoesEmFalta.length)} Funções chamadas que não existem: ${R.funcoesEmFalta.length}`);
  R.funcoesEmFalta.forEach(f => console.log(`    · ${f.funcao}  (${f.onde.join(', ')})`));
  if (opc.percurso) {
    console.log(`${ok(!nPercurso)} Percurso pelos ecrãs: ${R.percurso.cliques} ações, ${nPercurso} com erro`);
    Object.entries(R.percurso.acoesComErro).forEach(([k, v]) => console.log(`    ✗ ${k}\n        ${v[0].slice(0, 150)}`));
  }
  if (opc.json) fs.writeFileSync(opc.json, JSON.stringify(R, null, 2));

  const falhou = R.arranque.erros.length || R.testes.fail || relFalhados.length || expFalhadas.length || nPercurso;
  console.log('──────────────────────────────────────────');
  console.log(falhou ? '✗ VERIFICAÇÃO COM FALHAS' : '✓ VERIFICAÇÃO OK');
  process.exit(falhou ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
