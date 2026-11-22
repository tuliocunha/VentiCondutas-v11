/* ============================================================
   VentiCondutas · Planta: barra de ferramentas por grupos e menu de contexto
   ------------------------------------------------------------
   Como nos programas de desenho técnico (AutoCAD, Revit, SketchUp):
     · a barra vertical mostra um ícone por grupo; o canto ◢ indica que há
       mais ferramentas. Passar o rato (ou clicar no canto) abre os
       sub-ícones com o nome e a tecla; o grupo passa a mostrar a última
       ferramenta usada;
     · clique com o botão direito num objeto da planta: menu de contexto com
       as ações desse objeto (traçar um sub-ramal a partir dele, pôr um
       terminal, prumada, mudar o nome, mover, apagar…). Em sítio vazio, as
       ferramentas de criar mais usadas.
   Os atalhos de teclado continuam, mas nada depende de os saber de cor.
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('41-planta-barra');
const P = VC.planta;
if (!P || typeof P.render !== 'function' || !P.FERRAMENTAS) return;
const esc = s => VC.utils.esc(s);
const porId = (l, id) => (VC.dados[l] || []).find(x => String(x.id) === String(id));
const q = s => "'" + esc(String(s)) + "'";

P.GRUPOS = [
  ['navegar', 'Selecionar e navegar', ['sel', 'mao']],
  ['medir', 'Escala e medir', ['escala', 'medir']],
  ['salas', 'Salas', ['ret', 'pol']],
  ['condutas', 'Condutas e equipamentos', ['ramal', 'prumada', 'equip', 'grelhaExt']],
  ['ar', 'Terminais e passagens de ar', ['term', 'trf', 'abertExt']],
  ['modificar', 'Modificar', ['mover', 'rodar', 'apagar']]
];
P._ultimaDoGrupo = {};
const iconeSVG = (id, ic, tam) => (P.ICONES && P.ICONES[id])
  ? '<svg viewBox="0 0 24 24" width="' + (tam || 22) + '" height="' + (tam || 22) + '" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + P.ICONES[id] + '"/></svg>'
  : '<i class="fa-solid ' + (ic || 'fa-circle') + '" aria-hidden="true"></i>';
const ferr = id => P.FERRAMENTAS.find(f => f[0] === id);
const escolher = id => "VC.planta.escolherFerramenta ? VC.planta.escolherFerramenta('" + id + "') : VC.planta.setFerramenta('" + id + "')";

/* lembra a última ferramenta de cada grupo */
const setBase = P.setFerramenta;
P.setFerramenta = function (f) { (P.GRUPOS || []).forEach(([g, , ids]) => { if (ids.indexOf(f) >= 0) P._ultimaDoGrupo[g] = f; }); return setBase.apply(this, arguments); };

P._barraHTML = function () {
  const usados = new Set();
  let h = '<div class="planta-flut planta-ferrbar planta-ferrbar-grupos" role="toolbar" aria-label="Ferramentas de desenho" aria-orientation="vertical">';
  if (this._menuHTML) h += this._menuHTML();   // menu ☰ com todas as ferramentas e comandos
  this.GRUPOS.forEach(([g, nomeG, ids]) => {
    const lista = ids.map(ferr).filter(Boolean); if (!lista.length) return;
    lista.forEach(f => usados.add(f[0]));
    const ativoAqui = lista.find(f => f[0] === this.ferramenta);
    const mostra = ativoAqui || ferr(this._ultimaDoGrupo[g]) || lista[0];
    const [id, ic, nome] = mostra, k = this.TECLAS[id] || '';
    h += '<div class="planta-grupo" data-grupo="' + g + '">'
      + '<button class="planta-ft' + (ativoAqui ? ' ativo' : '') + '" aria-pressed="' + !!ativoAqui + '" aria-label="' + esc(nome) + (k ? ' (atalho ' + k + ')' : '') + ' · ' + esc(nomeG) + '" onclick="' + escolher(id) + '">' + iconeSVG(id, ic)
      + (lista.length > 1 ? '<span class="planta-ft-mais" aria-hidden="true"></span>' : '') + '</button>';
    h += '<div class="planta-flyout" role="menu" aria-label="' + esc(nomeG) + '"><div class="pfo-cab">' + esc(nomeG) + '</div>'
      + lista.map(([fid, fic, fnome]) => '<button role="menuitem" class="pfo-item' + (this.ferramenta === fid ? ' ativo' : '') + '" onclick="' + escolher(fid) + '" title="' + esc(this.DICAS[fid] || '') + '">' + iconeSVG(fid, fic, 18) + '<span class="pfo-nome">' + esc(fnome) + '</span>' + (this.TECLAS[fid] ? '<kbd>' + this.TECLAS[fid] + '</kbd>' : '') + '</button>').join('')
      + '<div class="pfo-dica">' + esc(this.DICAS[(ativoAqui || mostra)[0]] || '') + '</div></div></div>';
  });
  // ferramentas fora dos grupos (módulos futuros): botão simples
  this.FERRAMENTAS.filter(f => !usados.has(f[0])).forEach(([id, ic, nome]) => {
    const k = this.TECLAS[id] || '';
    h += '<div class="planta-grupo"><button class="planta-ft' + (this.ferramenta === id ? ' ativo' : '') + '" aria-label="' + esc(nome) + (k ? ' (atalho ' + k + ')' : '') + '" onclick="' + escolher(id) + '">' + iconeSVG(id, ic) + '</button>'
      + '<div class="planta-flyout"><button class="pfo-item" onclick="' + escolher(id) + '">' + iconeSVG(id, ic, 18) + '<span class="pfo-nome">' + esc(nome) + '</span>' + (k ? '<kbd>' + k + '</kbd>' : '') + '</button><div class="pfo-dica">' + esc(this.DICAS[id] || '') + '</div></div></div>';
  });
  return h + '</div>';
};
const renderBase = P.render;
P.render = function () {
  const h = renderBase.apply(this, arguments);
  // troca a barra inteira (com o menu ☰ que vem lá dentro): procura o </div> que fecha a barra
  const i = h.indexOf('<div class="planta-flut planta-ferrbar"'); if (i < 0) return h;
  const re = /<div\b|<\/div>/g; re.lastIndex = i; let n = 0, m, fim = -1;
  while ((m = re.exec(h))) { n += m[0] === '</div>' ? -1 : 1; if (n === 0) { fim = m.index + 6; break; } }
  return fim < 0 ? h : h.slice(0, i) + this._barraHTML() + h.slice(fim);
};

/* ── menu de contexto (botão direito) ── */
const acao = (ic, rot, js, k, perigo) => ({ ic, rot, js, k, perigo });
P._acoesContexto = function (alvo) {
  const A = [];
  const ferrA = (id, rot) => acao(id, rot, escolher(id), this.TECLAS[id]);
  if (!alvo) {
    return [ferrA('ret', 'Desenhar uma sala (retângulo)'), ferrA('pol', 'Desenhar uma sala (polígono)'), ferrA('ramal', 'Traçar um ramal'), ferrA('equip', 'Pôr um equipamento'), ferrA('term', 'Colocar um terminal'), acao('fit', 'Mostrar a planta inteira', 'VC.planta.ajustar()', 'Shift+Z')];
  }
  const { tipo, o } = alvo, id = q(o.id);
  if (tipo === 'ramal') {
    A.push(acao('ramal', 'Traçar um sub-ramal a partir de ' + o.nome, escolher('ramal') + ";VC.ui.toast('Clique em cima de " + esc(o.nome) + " para começar o sub-ramal.')", 'L'));
    A.push(acao('prumada', 'Prumada a partir de ' + o.nome, escolher('prumada'), 'K'));
    A.push(acao('term', 'Colocar terminais (ligam-se a este ramal)', escolher('term'), 'D'));
    if (this.inverterRamal) A.push(acao('inv', 'Inverter o sentido do traçado', 'VC.planta.inverterRamal(' + id + ')'));
    A.push(acao('nome', 'Mudar o nome', 'VC.planta.selecionarRamal(' + id + ');VC.planta.focarNome()', 'F2'));
    A.push(acao('mover', 'Mover', escolher('mover'), 'M'));
    A.push(acao('apagar', 'Apagar o traçado', 'VC.planta.apagarTracado(' + id + ')', 'Delete', true));
  } else if (tipo === 'sala') {
    A.push(acao('term', 'Colocar um terminal nesta sala', escolher('term'), 'D'));
    A.push(acao('abertExt', 'Abertura para o exterior', escolher('abertExt'), 'O'));
    A.push(acao('trf', 'Transferência de ar para outra sala', escolher('trf'), 'X'));
    A.push(acao('nome', 'Mudar o nome', 'VC.planta.selecionar(' + id + ');VC.planta.focarNome()', 'F2'));
    if (this.duplicarSala) A.push(acao('dup', 'Duplicar', 'VC.planta.duplicarSala(' + id + ')', 'Ctrl+D'));
    if (this.rodarSala) A.push(acao('rodar', 'Rodar 90°', 'VC.planta.rodarSala(' + id + ', 90)'));
    A.push(acao('mover', 'Mover', escolher('mover'), 'M'));
    A.push(acao('apagar', 'Apagar o desenho', 'VC.planta.apagarDesenho(' + id + ')', 'Delete', true));
  } else if (tipo === 'equipamento') {
    A.push(acao('ramal', 'Traçar um ramal a partir do equipamento', escolher('ramal') + ";VC.ui.toast('Clique na caixa do equipamento para começar o ramal.')", 'L'));
    if ([o].concat((this.metadePar && this.metadePar(o)) || []).some(x => !x.exterior)) A.push(acao('grelhaExt', 'Tomada / rejeição na fachada', 'VC.planta.selecionarEquip(' + id + ');' + escolher('grelhaExt'), 'G'));
    A.push(acao('prumada', 'Prumada a partir do equipamento', escolher('prumada'), 'K'));
    if (this.ligarRamaisAoEquip) A.push(acao('ligar', 'Ligar os ramais ao equipamento', 'VC.planta.ligarRamaisAoEquip(' + id + ')'));
    const pp = this.parProposto && this.parProposto(o);
    if (pp) A.push(acao('par', 'Juntar com «' + pp.nome + '» (VCM)', 'VC.planta.juntarPar(' + id + ',' + q(pp.id) + ')'));
    A.push(acao('utas', 'Abrir no passo UTAs', "VC.nav.irPasso('utas')"));
    A.push(acao('apagar', 'Tirar da planta', 'VC.planta.retirarEquipamento(' + id + ')', 'Delete', true));
  } else if (tipo === 'terminal') {
    if (this.ligarTerminalAoRamal) A.push(acao('ligar', 'Ligar ao ramal mais perto', 'VC.planta.ligarTerminalAoRamal(' + id + ');VC.planta.redesenhar()'));
    A.push(acao('apagar', 'Tirar da planta', 'VC.paineis.retirarTerminal(' + id + ')', 'Delete', true));
  } else if (tipo === 'prumada') {
    const p = this.pisoAtual(), ali = p && o.prumada.de.pisoId === p.id ? 'para' : 'de';
    A.push(acao('prumada', 'Ver no outro piso', 'VC.planta.verPrumada(' + id + ",'" + ali + "')"));
    A.push(acao('nome', 'Mudar o nome', 'VC.planta.prumSel=' + id + ';VC.planta.redesenhar();setTimeout(()=>{const e=document.getElementById(\'pn-prumada-nome\');if(e){e.focus();e.select()}},0)', 'F2'));
    A.push(acao('apagar', 'Tirar da planta', 'VC.planta.retirarPrumada(' + id + ')', 'Delete', true));
  } else if (tipo === 'grelha') {
    A.push(acao('apagar', 'Tirar a grelha da planta', 'VC.planta.retirarGrelha(' + id + ')', 'Delete', true));
  } else if (tipo === 'abertura') {
    A.push(acao('apagar', 'Tirar a abertura da planta', 'VC.planta.retirarAbertura(' + id + ')', 'Delete', true));
  }
  return A;
};
const ICONES_ACAO = { inv: 'M7 7h11l-3-3M17 17H6l3 3', nome: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4', dup: 'M8 8h11v11H8zM5 16V5h11', ligar: 'M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1', par: 'M3 7h8v10H3zM13 7h8v10h-8z', utas: 'M4 5h16v14H4zM9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0', fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5' };
/* objeto debaixo do rato */
P._alvoContexto = function (t) {
  const c = s => t.closest && t.closest(s);
  let g;
  // alças de edição do objeto selecionado (vértices, arestas): o menu é o desse objeto
  if (c('.pe, .pe-a, .pe-v, .planta-vert')) {
    const sel = VC.paineis && VC.paineis.selecao();
    if (sel && sel.tipo === 'ramal') return { tipo: 'ramal', o: sel.o, sel: null };
    if (sel && sel.tipo === 'sala') return { tipo: 'sala', o: sel.o, sel: null };
  }
  if ((g = c('.planta-eq'))) { const u = porId('utas', g.dataset.u); return u && { tipo: 'equipamento', o: u, sel: () => this.selecionarEquip(u.id) }; }
  if ((g = c('.planta-grelha-ext'))) { const u = porId('utas', g.dataset.u); return u && { tipo: 'grelha', o: u, sel: () => { this.selecionado = null; this.equipSel = null; this.extSel = u.id; } }; }
  if ((g = c('.planta-abert-ext'))) { const e = porId('espacos', g.dataset.esp); return e && { tipo: 'abertura', o: e, sel: () => { this.selecionado = null; this.abertSel = e.id; } }; }
  if ((g = c('.planta-prumada'))) { const r = porId('ramais', g.dataset.r); return r && { tipo: 'prumada', o: r, sel: () => { this.selecionado = null; this.prumSel = r.id; } }; }
  if ((g = c('.planta-term'))) { const x = porId('terminais', g.dataset.t); return x && { tipo: 'terminal', o: x, sel: () => this.selecionarTerminal && this.selecionarTerminal(x.id) }; }
  if ((g = c('.planta-ramal'))) { const r = porId('ramais', g.dataset.r); return r && { tipo: 'ramal', o: r, sel: () => this.selecionarRamal(r.id) }; }
  if ((g = c('.planta-sala, .planta-rotulo'))) { const e = porId('espacos', g.dataset.esp); return e && { tipo: 'sala', o: e, sel: () => this.selecionar(e.id) }; }
  return null;
};
P.fecharContexto = function () { const m = document.getElementById('plantaCtx'); if (m) m.remove(); };
P.abrirContexto = function (ev) {
  const palco = this._palco && this._palco(); if (!palco) return;
  this.fecharContexto();
  const alvo = this.pendenteAtual() ? null : this._alvoContexto(ev.target);
  if (alvo && alvo.sel) { alvo.sel(); this.redesenhar(); }
  const A = this._acoesContexto(alvo); if (!A.length) return;
  const pal = this._palco(), b = pal.getBoundingClientRect();
  const tit = alvo ? ({ ramal: 'Ramal ', sala: '', equipamento: '', terminal: 'Terminal ', prumada: 'Prumada ', grelha: 'Grelha de ', abertura: 'Abertura · ' }[alvo.tipo] || '') + (alvo.o.nome || alvo.o.id) : 'Criar';
  const m = document.createElement('div');
  m.id = 'plantaCtx'; m.className = 'planta-ctx'; m.setAttribute('role', 'menu');
  m.innerHTML = '<div class="pctx-cab">' + esc(tit) + '</div>' + A.map((a, i) => '<button role="menuitem" class="pctx-item' + (a.perigo ? ' perigo' : '') + '" data-i="' + i + '">'
    + ((P.ICONES && P.ICONES[a.ic]) || ICONES_ACAO[a.ic] ? '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + ((P.ICONES && P.ICONES[a.ic]) || ICONES_ACAO[a.ic]) + '"/></svg>' : '<span class="pctx-ic"></span>')
    + '<span>' + esc(a.rot) + '</span>' + (a.k ? '<kbd>' + esc(a.k) + '</kbd>' : '') + '</button>').join('');
  const novoPalco = this._palco(); (novoPalco || pal).appendChild(m);
  const x = Math.min(ev.clientX - b.left, b.width - 290), y = Math.min(ev.clientY - b.top, b.height - (A.length * 34 + 44));
  m.style.left = Math.max(4, x) + 'px'; m.style.top = Math.max(4, y) + 'px';
  m.addEventListener('click', e2 => {
    const it = e2.target.closest('.pctx-item'); if (!it) return;
    const a = A[Number(it.dataset.i)]; this.fecharContexto();
    try { (new Function(a.js))(); } catch (err) { if (VC.debug && VC.debug.erro) VC.debug.erro(err); }
  });
};
const prepBase = P.prepararVista;
P.prepararVista = function () {
  prepBase.apply(this, arguments);
  const palco = this._palco && this._palco();
  if (!palco || palco._vcCtx) return;
  palco._vcCtx = true;
  palco.addEventListener('contextmenu', ev => {
    if (ev.target.closest && ev.target.closest('.planta-flut, .planta-estado, .planta-ctx')) return;
    ev.preventDefault(); this.abrirContexto(ev);
  });
  palco.addEventListener('pointerdown', ev => { if (!(ev.target.closest && ev.target.closest('.planta-ctx'))) this.fecharContexto(); }, true);
  palco.addEventListener('wheel', () => this.fecharContexto(), { passive: true });
  // canto ◢ / toque: abre e fecha os sub-ícones (o rato abre-os ao passar)
  palco.addEventListener('click', ev => {
    const mais = ev.target.closest && ev.target.closest('.planta-ft-mais'); if (!mais) return;
    ev.stopPropagation(); ev.preventDefault();
    const g = mais.closest('.planta-grupo'); const aberto = g.classList.contains('aberto');
    palco.querySelectorAll('.planta-grupo.aberto').forEach(x => x.classList.remove('aberto'));
    if (!aberto) g.classList.add('aberto');
  }, true);
};
const escBase = P.gestoEsc;
P.gestoEsc = function () { if (document.getElementById('plantaCtx')) { this.fecharContexto(); return 'menu'; } return escBase.apply(this, arguments); };
})();
