#!/usr/bin/env node
/* ============================================================
   VentiCondutas · fotografia da app (guarda contra regressões)
   ------------------------------------------------------------
   Abre o index.html num Chromium sem janela, carrega o exemplo e
   regista tudo o que a app produz:
     · cálculo: espaços, ramais, terminais, UTAs, totais, auditoria
     · os relatórios (texto)
     · cada passo do menu e cada modo (texto do ecrã)
     · as funções que existem em VC / VC6 / window.render*
     · os botões (onclick) visíveis depois do arranque
     · o estado de cada teste interno

   Uso:
     node tools/fotografia.js --gravar antes.json    (antes de mexer)
     node tools/fotografia.js --comparar antes.json  (depois)
   Opção --libs <pasta>: bibliotecas CDN locais (como em verificar.js).

   --comparar termina com código 1 se alguma coisa mudou e lista
   as diferenças por secção. Números de versão e datas não contam.
   ============================================================ */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const RAIZ = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const val = k => (args.includes(k) ? path.resolve(args[args.indexOf(k) + 1]) : null);
const opc = { gravar: val('--gravar'), comparar: val('--comparar'), libs: val('--libs') };
if (!opc.gravar && !opc.comparar) { console.error('Uso: --gravar <f.json> | --comparar <f.json>'); process.exit(2); }

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

async function fotografar() {
  const srv = await servidor();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const erros = [];
  page.on('pageerror', e => erros.push(String(e.message)));
  page.on('dialog', d => d.accept());
  if (opc.libs) {
    const lib = n => path.join(opc.libs, n);
    await page.route(/jspdf\.umd/, r => r.fulfill({ path: lib('jspdf.umd.min.js'), contentType: 'application/javascript' }));
    await page.route(/autotable/, r => r.fulfill({ path: lib('jspdf.plugin.autotable.min.js'), contentType: 'application/javascript' }));
    await page.route(/xlsx/, r => r.fulfill({ path: lib('xlsx.full.min.js'), contentType: 'application/javascript' }));
    await page.route(/font-awesome/, r => r.fulfill({ body: '', contentType: 'text/css' }));
  }
  await page.goto('http://127.0.0.1:' + srv.address().port + '/index.html');
  await page.waitForTimeout(2500);

  const foto = await page.evaluate(() => {
    const n = x => (typeof x === 'number' && isFinite(x)) ? Math.round(x * 1000) / 1000 : x;
    // O texto de um SVG compara-se como conjunto ordenado: a ordem de desenho dos elementos varia entre corridas.
    const texto = html => {
      const d = document.createElement('div'); d.innerHTML = String(html || '');
      d.querySelectorAll('svg').forEach(s => { const t = [...s.querySelectorAll('text')].map(e => e.textContent.trim()).filter(Boolean).sort(); s.replaceWith('[SVG: ' + t.join(' · ') + ']'); });
      return d.textContent.replace(/\s+/g, ' ').trim();
    };
    const F = {};
    const x = VC.calculo.calcularTudo();
    F.calculo = {
      totais: { ins: n(x.ins), ext: n(x.ext), bal: n(x.bal), maxPerda: n(x.maxPerda), sfpInt: n(x.sfpInt), power: n(x.power), overall: x.overall },
      auditoria: (x.findings || []).map(f => f.severidade + ' · ' + f.tipo + ' · ' + f.elemento + ' · ' + f.msg),
      espacos: VC.dados.espacos.map(e => { const c = VC.calculo.calcularQEspaco(e); const b = VC.calculo.balancoEspaco(e.nome); return [e.nome, e.tipo, c.g, n(c.Q_normas), n(c.Q_ConTerm), n(c.QAI_projeto), n(c.Q_espaco), b.estado, n(b.Q_servido)].join(' | '); }),
      ramais: VC.dados.ramais.map(r => [r.nome, r.parente || '', r.nivelNumero, r.rede, n(r.Q), r.Dcom, r.secaoCalc || '', n(r.v), n(r.deltaP), n(r.deltaPtotal), n(r.deltaPCritico), r.avisoSecao || ''].join(' | ')),
      terminais: VC.dados.terminais.map(t => [t.id, t.rede, t.ramalRef, n(t.Q), (t.espacos || []).map(e => e.nome + ':' + n(e.Q_parcela)).join(',')].join(' | ')),
      utas: VC.dados.utas.map(u => [u.nome, u.rede, n(u.Q), n(u.dpInt), n(u.dpExt), n(u.sfpInt), u.sfpClass && u.sfpClass.limite, n(u.P_motor), u.status, u.pontoFunc ? n(u.pontoFunc.Qmh) + '/' + n(u.pontoFunc.dP) : ''].join(' | ')),
      balanco: (VC6.balanco.todos() || []).map(b => [b.nome, n(b.residuo), b.estado, n(b.pressao_relativa_Pa)].join(' | ')),
      transferencias: (VC.dados.transferencias || []).map(t => t.deId + '>' + t.paraId + ':' + t.Q)
    };
    F.relatorios = {};
    (VC.listaRelatorios || []).forEach(r => { try { F.relatorios[r.id] = texto(VC.relatorios[r.id]()); } catch (e) { F.relatorios[r.id] = 'EXCEÇÃO ' + e.message; } });
    F.passos = {};
    (VC.passosCatalogo || []).forEach(p => {
      try { VC.passos.render(p.id); const el = document.getElementById('conteudoPasso'); F.passos[p.id] = el ? texto(el.innerHTML) : '(sem #conteudoPasso)'; } catch (e) { F.passos[p.id] = 'EXCEÇÃO ' + e.message; }
    });
    F.funcoes = [];
    const visto = new Set();
    const andar = (o, p, d) => {
      if (!o || d > 3 || visto.has(o)) return; visto.add(o);
      Object.keys(o).forEach(k => { let v; try { v = o[k]; } catch (e) { return; } if (typeof v === 'function') F.funcoes.push(p + '.' + k); else if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Node) && k !== 'dados') andar(v, p + '.' + k, d + 1); });
    };
    andar(window.VC, 'VC', 0); andar(window.VC6, 'VC6', 0);
    Object.keys(window).filter(k => /^render|^bootstrap/.test(k) && typeof window[k] === 'function').forEach(k => F.funcoes.push('window.' + k));
    F.funcoes = [...new Set(F.funcoes)].sort();
    VC.passos.render('setup');
    F.botoes = [...new Set([...document.querySelectorAll('[onclick]')].map(e => e.getAttribute('onclick').replace(/\d+/g, 'N')))].sort();
    const t = VC6.testes.correr();
    F.testes = t.detalhe.map(d => d.id + ' ' + d.estado);
    return F;
  });
  foto.errosJS = erros;
  await browser.close(); srv.close();
  return foto;
}

/* versões e datas não contam como diferença */
const normalizar = s => String(s).replace(/v?\d+\.\d+\.\d+(-[\w.]+)?/gi, 'vX').replace(/\b\d{4}-\d{2}-\d{2}\b/g, 'DATA').replace(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, 'DATA');

function comparar(a, b) {
  const dif = [];
  const lista = (sec, la, lb) => {
    const A = (la || []).map(normalizar), B = (lb || []).map(normalizar);
    const sa = new Set(A), sb = new Set(B);
    A.filter(x => !sb.has(x)).forEach(x => dif.push(sec + '  − ' + x.slice(0, 220)));
    B.filter(x => !sa.has(x)).forEach(x => dif.push(sec + '  + ' + x.slice(0, 220)));
  };
  const mapa = (sec, ma, mb) => {
    new Set([...Object.keys(ma || {}), ...Object.keys(mb || {})]).forEach(k => {
      const va = normalizar((ma || {})[k] || '(não existe)'), vb = normalizar((mb || {})[k] || '(não existe)');
      if (va === vb) return;
      let i = 0; while (i < va.length && va[i] === vb[i]) i++;
      dif.push(sec + '.' + k + '  difere a partir de: «' + va.slice(Math.max(0, i - 40), i + 80) + '» → «' + vb.slice(Math.max(0, i - 40), i + 80) + '»');
    });
  };
  Object.keys(a.calculo).forEach(k => Array.isArray(a.calculo[k]) ? lista('calculo.' + k, a.calculo[k], b.calculo[k]) : mapa('calculo.' + k, a.calculo[k], b.calculo[k]));
  mapa('relatorios', a.relatorios, b.relatorios);
  mapa('passos', a.passos, b.passos);
  lista('funcoes', a.funcoes, b.funcoes);
  lista('botoes', a.botoes, b.botoes);
  lista('testes', a.testes, b.testes);
  lista('errosJS', a.errosJS, b.errosJS);
  return dif;
}

(async () => {
  const foto = await fotografar();
  if (opc.gravar) {
    fs.writeFileSync(opc.gravar, JSON.stringify(foto, null, 1));
    console.log('Fotografia gravada em ' + opc.gravar + ': ' + foto.funcoes.length + ' funções, ' + Object.keys(foto.relatorios).length + ' relatórios, ' + Object.keys(foto.passos).length + ' passos, ' + foto.testes.length + ' testes.');
    return;
  }
  const antes = JSON.parse(fs.readFileSync(opc.comparar, 'utf8'));
  const dif = comparar(antes, foto);
  if (!dif.length) { console.log('✓ Sem diferenças face a ' + path.basename(opc.comparar)); return; }
  console.log('✗ ' + dif.length + ' diferença(s) face a ' + path.basename(opc.comparar) + ':');
  dif.forEach(d => console.log('  ' + d));
  process.exitCode = 1;
})();
