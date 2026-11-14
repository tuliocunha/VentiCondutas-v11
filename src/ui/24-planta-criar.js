/* ============================================================
   VentiCondutas · Planta: criar no desenho (PR 2 · fluxo sem becos)
   ------------------------------------------------------------
   A planta cria o que falta sem mandar o utilizador para outro ecrã.
   Todas as operações passam pelo serviço único VC.associacoes e entram
   no desfazer da planta.
   · Terminal (D): numa sala sem terminais por colocar, abre o cartão
     «Novo terminal» (rede, caudal proposto pelo balanço/norma, n.º) e
     cria-o no ponto clicado; sobre um ramal da mesma rede fica associado.
   · Ramal: a UTA cria-se no próprio cartão (auditoria A4).
   · Sala: N no cartão com as parcelas T11·N e T12·A (aplica-se a maior),
     nome editável (em cascata) e calibrar a escala pela área (B1).
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('24-planta-criar');
const P = VC.planta;
if (!P || !P.colocarTerminal) return;
const esc = s => VC.utils.esc(s);
const fmt = (n, d) => VC.utils.fmt(n, d == null ? 0 : d);
const espPorId = id => (VC.dados.espacos || []).find(x => String(x.id) === String(id));

/* ── redes que um espaço pode ter (regra única: espaço sujo → extração suja, rede própria) ── */
P.redesDoEspaco = function (e) {
  const sujo = VC6.transferencias && VC6.transferencias.ehSujo ? VC6.transferencias.ehSujo(e) : false;
  return sujo ? ['extracao_suja'] : ['insuflacao', 'extracao'];
};
/* caudal proposto (P7): primeiro o que falta no balanço da sala, depois o que falta à norma */
P.qSugerido = function (e, rede) {
  const b = this._balancoSala ? this._balancoSala(e) : { res: 0 };
  const bn = VC.calculo.balancoEspaco(e.nome) || {}, c = VC.calculo.calcularQEspaco(e);
  const faltaNorma = Math.max(0, (Number(bn.Q_nec) || 0) - (Number(bn.Q_servido) || 0));
  const normaExtrai = c.tipoCaudal === 'EXTRACAO';   // a necessidade da norma é de extração (G4) ou de insuflação (restantes)
  let q = 0, porque = '';
  if (rede === 'insuflacao') {
    if (b.res < -5) { q = -b.res; porque = 'falta de entrada no balanço'; }
    else if (faltaNorma > 0 && !normaExtrai) { q = faltaNorma; porque = 'caudal da norma por servir'; }
  } else {
    if (b.res > 5) { q = b.res; porque = 'excesso de entrada no balanço'; }
    else if (faltaNorma > 0 && normaExtrai) { q = faltaNorma; porque = 'caudal da norma por servir'; }
  }
  return { Q: Math.round(q), porque };
};

/* ── Terminal (D): colocar o próximo ou, se não houver, criar ── */
const colocarBase = P.colocarTerminal;
P.colocarTerminal = function (q) {
  const p = this.pisoAtual(); if (!p || this._bloqueado()) return null;
  const sala = this.salaEm(q, p);
  if (sala) {
    const livres = this.terminaisDe(sala).filter(t => !(t.planta && t.planta.pisoId === p.id));
    if (!livres.length) {   // nada por colocar: a planta cria o terminal aqui
      this.pendenteTerm = { espId: sala.id, x: Math.round(q[0] * 10) / 10, y: Math.round(q[1] * 10) / 10 };
      this.redesenhar();
      return null;
    }
  }
  this.pendenteTerm = null;
  return colocarBase.call(this, q);
};
P.criarTerminalAqui = function (rede, Q, n) {
  const pt = this.pendenteTerm, p = this.pisoAtual(), e = pt && espPorId(pt.espId);
  if (!pt || !p || !e || this._bloqueado()) return null;
  const antes = this._estado();
  const res = VC.associacoes.criarTerminal(e, { rede, Q: VC.utils.num(Q), quantidade: VC.utils.num(n) || 1 });
  if (!res.ok) { VC.ui.toast(res.erro); return null; }
  const t = res.terminais[0];
  if (t) t.planta = { pisoId: p.id, x: pt.x, y: pt.y };
  this.pendenteTerm = null;
  let assoc = '';
  if (t) {
    const m = this._ramalPerto && this._ramalPerto([pt.x, pt.y], t.rede);
    if (m && VC.associacoes.associar(t, m.r.nome).n) assoc = ' · associado ao ramal ' + m.r.nome;
  }
  this._empilhar('terminal criado em «' + e.nome + '»', antes);
  if (VC.historico && VC.historico.push) VC.historico.push('terminal criado na planta em «' + e.nome + '»');
  VC.estado.forcarSync();
  const resto = res.terminais.length - 1;
  VC.ui.toast((t ? '«' + t.nome + '»' : 'Terminal') + ' criado em «' + e.nome + '» (' + VC.redes.rotulo(rede) + ', ' + fmt(res.definicao.Q_total) + ' m³/h)' + assoc + (resto ? ' · mais ' + resto + ' por colocar (D)' : '') + '.');
  this.redesenhar();
  return t;
};

/* ── UTA no cartão do ramal (A4) ── */
P.criarUtaAqui = function (rede, nome) {
  if (this._bloqueado()) return null;
  rede = VC.redes.normalizar(rede);
  nome = String(nome || '').trim() || (rede === 'extracao_suja' ? 'VEX-' : 'UTA-') + ((VC.dados.utas || []).filter(u => u.rede === rede).length + 1);
  if ((VC.dados.utas || []).some(u => String(u.nome).toLowerCase() === nome.toLowerCase())) { VC.ui.toast('Já existe uma UTA «' + nome + '».'); return null; }
  const u = VC.uta.criar(nome, rede, '');
  u.componentes = rede === 'insuflacao' ? VC.uta.componentesPadrao() : VC.uta.componentesExtracao();
  if (VC.historico && VC.historico.push) VC.historico.push('Nova UTA: ' + nome);
  this._utaEscolhida = u.id;
  VC.ui.toast('UTA «' + nome + '» criada (' + VC.redes.rotulo(rede) + '). Agora «Criar ramal».');
  this.redesenhar();
  return u;
};

/* ── sala: N, nome, escala pela área ── */
P.definirN = function (id, valor) {
  const e = espPorId(id); if (!e || this._bloqueado()) return;
  const idx = VC.dados.espacos.indexOf(e), antes = this._estado();
  if (VC.editorEspacos && VC.editorEspacos.editarCampo) VC.editorEspacos.editarCampo(idx, 'N', String(valor == null ? '' : valor));   // vazio = por definir
  else if (String(valor == null ? '' : valor).trim() === '') delete e.N; else e.N = VC.utils.num(valor);
  this._empilhar('ocupação de «' + e.nome + '»', antes);
  this.redesenhar();
};
P.renomearEspacoPlanta = function (id, novo) {
  const e = espPorId(id); if (!e || this._bloqueado()) return;
  const antes = this._estado(), antigo = e.nome;
  const r = VC.associacoes.renomearEspaco(e, novo);
  if (!r.ok) { VC.ui.toast(r.erro); return; }
  if (e.nome === antigo) return;
  this._empilhar('«' + antigo + '» → «' + e.nome + '»', antes);
  if (VC.historico && VC.historico.push) VC.historico.push('espaço «' + antigo + '» → «' + e.nome + '»');
  VC.estado.forcarSync();
  VC.ui.toast('Espaço «' + antigo + '» → «' + e.nome + '»' + (r.n ? ' (' + r.n + ' referências atualizadas)' : '') + '.');
  this.redesenhar();
};
/* B1: escala = √(área conhecida / área em píxeis) */
P.calibrarPorArea = function (pts, m2) {
  const p = this.pisoAtual(), A = VC.utils.num(m2), px = pts && pts.length >= 3 ? this.areaPx(pts) : 0;
  if (!p || !(A > 0) || !(px > 0)) { VC.ui.toast('Escreva a área conhecida da sala, em m².'); return false; }
  const antes = this._estado(), ant = p.escala;
  p.escala = Math.sqrt(A / px);
  this._empilhar('escala calibrada pela área', antes);
  VC.ui.toast('Escala pela área (' + fmt(A, 2) + ' m²): 1 m = ' + fmt(1 / p.escala, 1) + ' px da imagem' + (ant ? ' (antes ' + fmt(1 / ant, 1) + ' px)' : '') + '.');
  this.redesenhar();
  return true;
};
P.calibrarSelecionadaPorArea = function (id, m2) { const e = espPorId(id); if (e && e.planta) this.calibrarPorArea(e.planta.pts, m2); };
P.calibrarPendentePorArea = function (m2) { if (this.pendente) this.calibrarPorArea(this.pendente, m2); };

/* parcelas do caudal de ar novo (Portaria 138-I): o engenheiro define N; aplica-se o maior */
P._parcelasCaudal = function (e) {
  const def = VC.normas.getDef(e.tipo) || {}, c = VC.calculo.calcularQEspaco(e), g = Number(e.grupoForcado || c.g || def.g) || 0;
  const ev = Number(VC.dados.eficaciaRemocao) || 1;
  const A = Number(e.A) || 0, V = Number(e.V) || A * (Number(e.H) || 0);
  if (g === 1) {
    const semN = !!c.nPorDefinir;   // N vazio = por definir: só T12 conta, e a app avisa (por fazer)
    const N = semN ? 0 : Number(e.N) || 0, t11 = Number(def.t11) || 0, t12 = Number(def.t12) || 0;
    const q11 = t11 * N, q12 = t12 * A, ganha = !semN && q11 >= q12 ? 'T11' : 'T12';
    const lin = (k, txt, q) => '<tr' + (k === ganha ? ' class="planta-ganha"' : '') + '><th>' + k + '</th><td>' + txt + '</td><td>' + (q == null ? '<i>por definir</i>' : '<b>' + fmt(q) + '</b> m³/h') + '</td></tr>';
    return '<table class="planta-parcelas"><tbody>'
      + lin('T11', fmt(t11) + ' × N ' + (semN ? '?' : fmt(N)), semN ? null : q11) + lin('T12', fmt(t12) + ' × ' + fmt(A, 2) + ' m²', q12)
      + '</tbody></table>'
      + (semN ? '<p class="planta-porfazer">Ocupação (N) por definir: o ar novo é calculado só por T12 × A = <b>' + fmt(q12 / Math.max(ev, 0.1)) + ' m³/h</b>. Escreva N para comparar com T11 × N; aplica-se o maior.</p>'
        : '<p class="planta-meta">Ar novo = o maior: <b>' + ganha + '</b>' + (ev !== 1 ? ' ÷ ε_v ' + fmt(ev, 2) : '') + ' = <b>' + fmt(Math.max(q11, q12) / Math.max(ev, 0.1)) + ' m³/h</b>.' + (ganha === 'T12' ? ' Com mais ocupação, aumente N.' : '') + '</p>');
  }
  if (g === 3) return '<p class="planta-meta">G3: o maior de T12 × A = ' + fmt((Number(def.t12) || 0) * A) + ' e ACH × V = ' + fmt((Number(def.ach) || 0) * V) + ' m³/h (N não conta).</p>';
  if (g === 2) return '<p class="planta-meta">G2: isento de ar novo (Portaria 138-I); pode receber ar por transferência.</p>';
  if (g === 4) return '<p class="planta-meta">G4: extração ' + esc(c.metodoCaudal || '') + ' = ' + fmt(c.Q_extracao || c.Q_total) + ' m³/h, por rede própria (extração suja).</p>';
  return '';
};

/* ── cartões ── */
const painelBase = P._painel;
P._painel = function (p) {
  let h = painelBase.call(this, p);
  /* A4: UTA no cartão do novo ramal */
  if (this.pendenteRamal) {
    const utas = VC.dados.utas || [];
    const criar = '<details class="planta-sub"' + (utas.length ? '' : ' open') + '><summary>' + (utas.length ? 'Criar outra UTA aqui' : 'Ainda não há UTAs: crie a UTA do ramal principal aqui') + '</summary>'
      + '<label for="rmUtaRede">Rede</label><select id="rmUtaRede">' + VC.redes.LISTA.map(([v, l]) => '<option value="' + v + '">' + esc(l) + '</option>').join('') + '</select>'
      + '<label for="rmUtaNome">Nome</label><input id="rmUtaNome" placeholder="ex.: UTA-Mezanino">'
      + '<div class="planta-acoes"><button class="btn" onclick="VC.planta.criarUtaAqui(document.getElementById(\'rmUtaRede\').value, document.getElementById(\'rmUtaNome\').value)">Criar UTA</button></div></details>';
    h = h.replace(/(<label for="rmUta">[\s\S]*?<\/select>)/, (m) => {
      const sel = this._utaEscolhida;
      const m2 = sel ? m.replace('value="' + sel + '"', 'value="' + sel + '" selected') : m;
      return (utas.length ? m2 : '') + criar;
    });
  }
  /* Terminal (D): novo terminal */
  const pt = this.pendenteTerm, e = pt && espPorId(pt.espId);
  if (e) {
    const redes = this.redesDoEspaco(e);
    const sug = redes.map(r => Object.assign({ rede: r }, this.qSugerido(e, r)));
    const ini = sug.find(s => s.Q > 0) || sug[0];
    const nT = this.terminaisDe(e).length;
    h = '<div class="planta-card destaque"><div class="planta-card-t">Novo terminal em «' + esc(e.nome) + '»</div>'
      + '<p class="planta-meta">' + (nT ? 'Os ' + nT + ' terminais da sala já estão colocados.' : 'A sala ainda não tem terminais.') + ' O terminal é criado neste ponto.</p>'
      + '<label for="ptRede">Rede</label><select id="ptRede" onchange="var s=JSON.parse(this.selectedOptions[0].dataset.sug);document.getElementById(\'ptQ\').value=s.Q||\'\';document.getElementById(\'ptPorque\').textContent=s.porque?\'Proposto: \'+s.porque+\'.\':\'\'">'
      + sug.map(s => '<option value="' + s.rede + '"' + (s === ini ? ' selected' : '') + ' data-sug=\'' + esc(JSON.stringify({ Q: s.Q, porque: s.porque })) + '\'>' + esc(VC.redes.rotulo(s.rede)) + '</option>').join('') + '</select>'
      + '<label for="ptQ">Caudal total (m³/h)</label><input id="ptQ" type="number" min="1" step="1" value="' + (ini.Q || '') + '" onkeydown="if(event.key===\'Enter\')document.getElementById(\'ptCriar\').click()">'
      + '<p class="planta-meta" id="ptPorque">' + (ini.porque ? 'Proposto: ' + esc(ini.porque) + '.' : '') + '</p>'
      + '<label for="ptN">N.º de terminais</label><input id="ptN" type="number" min="1" step="1" value="1">'
      + '<div class="planta-acoes"><button class="btn primario" id="ptCriar" onclick="VC.planta.criarTerminalAqui(document.getElementById(\'ptRede\').value, document.getElementById(\'ptQ\').value, document.getElementById(\'ptN\').value)">Criar terminal</button><button class="btn" onclick="VC.planta.pendenteTerm=null;VC.planta.redesenhar()">Cancelar</button></div></div>' + h;
  }
  return h;
};
const cancelarBase = P.cancelar;
P.cancelar = function () { this.pendenteTerm = null; return cancelarBase.apply(this, arguments); };
const setFerrBase = P.setFerramenta;
P.setFerramenta = function (f) { if (f !== 'term') this.pendenteTerm = null; return setFerrBase.apply(this, arguments); };
P.DICAS.term = 'Clique dentro de uma sala desenhada: coloca o próximo terminal dela ou, se já estão todos, cria um novo nesse ponto (rede e caudal propostos). Sobre um ramal da mesma rede, fica associado a ele.';
if (P.DICAS.escala) P.DICAS.escala += ' Sem cotas? Desenhe uma sala e use «Calibrar pela área» no cartão dela.';
})();
