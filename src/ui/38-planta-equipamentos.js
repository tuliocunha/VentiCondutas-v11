/* ============================================================
   VentiCondutas · Planta: equipamentos (Fase 3A)
   ------------------------------------------------------------
   O equipamento (ventilador, UTA, VMC/VCM) passa a ter lugar na planta:
     · ferramenta Equipamento (U): um clique no início de um ramal principal
       (ou onde fica a máquina) põe aí o equipamento desse ramal;
     · numa VCM / VMC (duplo fluxo) as duas metades ficam juntas: uma caixa
       com 4 ligações — ar exterior ODA e rejeição EHA para fora, insuflação
       SUP e extração ETA para as condutas;
     · com Selecionar arrasta-se; Delete tira-o da planta; Esc larga-o;
     · um ramal principal que não começa no equipamento fica ligado por um
       traço interrompido e o painel propõe «Ligar os ramais ao equipamento»;
     · traçar um ramal a partir de um equipamento propõe esse equipamento.
   Os dados (componentes, curva, Ecodesign) continuam no passo UTAs; o
   painel mostra o resultado: caudal, fugas, Δp, potência e SFP.
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('38-planta-equipamentos');
const P = VC.planta, PN = VC.paineis;
if (!P || !P._svg || !PN || !PN.esquemas) return;
const esc = s => VC.utils.esc(s), fmt = (v, d) => VC.utils.fmt(v, d == null ? 1 : d);
const r1 = v => Math.round(v * 10) / 10, n2 = v => Math.round(v * 100) / 100;
const porId = (l, id) => (VC.dados[l] || []).find(x => String(x.id) === String(id));

/* ── ferramenta ── */
P.FERRAMENTAS.push(['equip', 'fa-fan', 'Equipamento']);
P.TECLAS.equip = 'U';
if (P.ICONES) P.ICONES.equip = 'M3 6h18v12H3zM9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0M12 9v1.2M12 13.8V15M9 12h1.2M13.8 12H15';
if (P.DICAS) P.DICAS.equip = 'Clique no início de um ramal principal, ou onde fica a máquina, para pôr aí o equipamento. Numa VCM as duas metades ficam juntas (4 ligações). Arraste-o com Selecionar.';

/* ── dados ── */
P.equipSel = null;
P.tipoDe = u => (VC.uta && VC.uta.tipoSistemaDe ? VC.uta.tipoSistemaDe(u) : null);
/* a outra metade de uma VCM/VMC (duplo fluxo), quando o par está definido */
P.metadePar = function (u) {
  const t = this.tipoDe(u); if (!u || !u.uvbPar || !(t && t.par)) return null;
  const o = porId('utas', u.uvbPar); return o && o !== u ? o : null;
};
/* VCM/VMC sem par definido: a outra metade com o mesmo nome-base («VCM Refeitório (insuflação)» ↔ «… (extração copa)») */
const nomeBase = n => String(n || '').replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase();
P.parProposto = function (u) {
  const t = this.tipoDe(u); if (!u || u.uvbPar || !(t && t.par)) return null;
  const lado = x => VC.redes.ehExtracao(x.rede);
  return (VC.dados.utas || []).find(x => x !== u && !x.uvbPar && (this.tipoDe(x) || {}).par && lado(x) !== lado(u) && nomeBase(x.nome) === nomeBase(u.nome)) || null;
};
P.juntarPar = function (id, outroId) {
  const u = porId('utas', id), o = porId('utas', outroId); if (!u || !o || this._bloqueado()) return false;
  const antes = this._estado();
  u.uvbPar = o.id; o.uvbPar = u.id;
  if (u.planta) o.planta = Object.assign({}, u.planta); else if (o.planta) u.planta = Object.assign({}, o.planta);
  this._empilhar(u.nome + ' + ' + o.nome + ': uma VCM', antes);
  if (VC.estado && VC.estado.forcarSync) VC.estado.forcarSync();
  VC.ui.toast('«' + u.nome + '» e «' + o.nome + '» são agora as duas metades da mesma unidade (4 ligações).');
  this.redesenhar(); return true;
};
P.equipamentosDoPiso = function (p) { return (VC.dados.utas || []).filter(u => u.planta && p && u.planta.pisoId === p.id); };
P.ramaisDoEquip = function (u, p) { return (this.ramaisDoPiso ? this.ramaisDoPiso(p) : []).filter(r => !r.parente && String(r.utaRef) === String(u.id)); };
const D2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
P._ligadoAoEquip = function (r, u) { return D2(r.planta.pts[0], [u.planta.x, u.planta.y]) <= 0.6; };

/* põe um equipamento em q: o do ramal principal que começa ali; senão o primeiro por colocar com ramais neste piso; senão qualquer um */
P.colocarEquipamento = function (q, uId) {
  const p = this.pisoAtual(); if (!p || this._bloqueado()) return null;
  const tol = 30 / (this.zoom || 1), aqui = u => u.planta && u.planta.pisoId === p.id;
  let u = uId != null ? porId('utas', uId) : null;
  if (!u) {
    const perto = (this.ramaisDoPiso ? this.ramaisDoPiso(p) : []).filter(r => !r.parente && r.utaRef && D2(r.planta.pts[0], q) < tol)
      .map(r => porId('utas', r.utaRef)).filter(x => x && !aqui(x));
    u = perto[0] || null;
  }
  if (!u) u = (VC.dados.utas || []).find(x => !aqui(x) && !x.planta && this.ramaisDoEquip(x, p).length) || null;
  if (!u) u = (VC.dados.utas || []).find(x => !x.planta && x.ativo !== false) || null;
  if (!u) { VC.ui.toast('Todos os equipamentos já estão na planta. Arraste-os com Selecionar (V); crie outros no passo UTAs ou ao traçar um ramal.'); return null; }
  const antes = this._estado(), pos = { pisoId: p.id, x: r1(q[0]), y: r1(q[1]) }, par = this.metadePar(u);
  u.planta = Object.assign({}, pos);
  if (par && !par.planta) par.planta = Object.assign({}, pos);   // VCM: as duas metades na mesma caixa
  this._empilhar('equipamento ' + u.nome + ' colocado', antes);
  this.equipSel = u.id;
  const soltos = this.ramaisDoEquip(u, p).filter(r => !this._ligadoAoEquip(r, u)).length;
  VC.ui.toast('«' + u.nome + '»' + (par ? ' + «' + par.nome + '»' : '') + ' na planta' + (soltos ? ' · ' + soltos + ' ramal(is) por ligar: use «Ligar os ramais ao equipamento» no painel' : '') + '.');
  this.redesenhar();
  return u;
};
P.moverEquipamento = function (id, q, antes) {
  const u = porId('utas', id); if (!u || !u.planta) return;
  u.planta.x = r1(q[0]); u.planta.y = r1(q[1]);
  const par = this.metadePar(u); if (par && par.planta && par.planta.pisoId === u.planta.pisoId) { par.planta.x = u.planta.x; par.planta.y = u.planta.y; }
  if (antes) this._empilhar('equipamento ' + u.nome + ' movido', antes);
};
P.retirarEquipamento = function (id) {
  const u = porId('utas', id); if (!u || !u.planta || this._bloqueado()) return false;
  const antes = this._estado(), par = this.metadePar(u);
  delete u.planta; if (par && par.planta) delete par.planta;
  this.equipSel = null; this._empilhar('equipamento ' + u.nome + ' tirado da planta', antes);
  VC.ui.toast('«' + u.nome + '» tirado da planta (os dados ficam no passo UTAs). Ctrl+Z repõe.');
  this.redesenhar(); return true;
};
/* os ramais principais deste equipamento passam a começar nele (um ponto acrescentado no início; o L acompanha se era o medido) */
P.ligarRamaisAoEquip = function (id) {
  const u = porId('utas', id), p = this.pisoAtual(); if (!u || !u.planta || !p || this._bloqueado()) return 0;
  const lista = [u].concat(this.metadePar(u) || []).reduce((a, x) => a.concat(this.ramaisDoEquip(x, p)), []).filter(r => !this._ligadoAoEquip(r, u));
  if (!lista.length) { VC.ui.toast('Os ramais de «' + u.nome + '» já começam no equipamento.'); return 0; }
  const antes = this._estado(), q = [u.planta.x, u.planta.y];
  lista.forEach(r => {
    const L0 = p.escala ? this.comprimentoM(r.planta.pts, p) : 0, Lt = Number(r.L) || 0;
    r.planta.pts = [[q[0], q[1]]].concat(r.planta.pts);
    if (L0 && Math.abs(L0 - Lt) <= Math.max(0.05, Lt * 0.02)) r.L = n2(this.comprimentoM(r.planta.pts, p));
  });
  this._empilhar(lista.length + ' ramal(is) ligado(s) a ' + u.nome, antes);
  if (VC.perf) ['cacheMaterializacao', 'ordenacaoTopologica', 'cacheBalanco'].forEach(k => { if (VC.perf[k] && VC.perf[k].invalidar) VC.perf[k].invalidar(); });
  if (VC.estado && VC.estado.forcarSync) VC.estado.forcarSync();
  VC.ui.toast(lista.map(r => r.nome).join(', ') + ' passa(m) a começar em «' + u.nome + '».');
  this.redesenhar();
  return lista.length;
};
P.renomearEquipamento = function (id, novo) {
  const u = porId('utas', id); novo = String(novo == null ? '' : novo).trim();
  if (!u || this._bloqueado() || novo === u.nome) return;
  if (!novo) { VC.ui.toast('O nome não pode ficar vazio.'); this.redesenhar(); return; }
  if ((VC.dados.utas || []).some(x => x !== u && String(x.nome).toLowerCase() === novo.toLowerCase())) { VC.ui.toast('Já existe um equipamento «' + novo + '».'); this.redesenhar(); return; }
  const antes = this._estado(), velho = u.nome; u.nome = novo;
  this._empilhar('equipamento ' + velho + ' → ' + novo, antes);
  if (VC.estado && VC.estado.forcarSync) VC.estado.forcarSync();
  this.redesenhar();
};

/* ── seleção exclusiva: escolher outro objeto larga o equipamento, e vice-versa ── */
['selecionado', 'ramalSel', 'trfSel', 'termSel'].forEach(k => {
  const d = Object.getOwnPropertyDescriptor(P, k);
  if (d && d.set) Object.defineProperty(P, k, { configurable: true, enumerable: true, get: d.get, set(x) { d.set.call(this, x); if (x != null) this.equipSel = null; } });
  else { let v = d ? d.value : null; Object.defineProperty(P, k, { configurable: true, enumerable: true, get() { return v; }, set(x) { v = x; if (x != null) this.equipSel = null; } }); }
});
P.selecionarEquip = function (id) {
  this.selecionado = null; this.ramalSel = null; this.trfSel = null; this.termSel = null; this.trocoSel = null;
  this.pendente = null; this.pendenteRamal = null; this.pendenteTrf = null; this.pendenteTerm = null;
  this.equipSel = id; this.redesenhar();
};
['cancelar', 'setPiso', 'limparSelecao'].forEach(nome => {
  const base = P[nome]; if (typeof base !== 'function') return;
  P[nome] = function () { this.equipSel = null; return base.apply(this, arguments); };
});
const temSelBase = P.temSelecao;
if (temSelBase) P.temSelecao = function () { return this.equipSel != null || temSelBase.call(this); };
const escBase = P.gestoEsc;
if (escBase) P.gestoEsc = function () { if (this.equipSel != null && !this.pendenteAtual()) { this.equipSel = null; this.redesenhar(); return 'equipamento'; } return escBase.apply(this, arguments); };
const apagarBase = P.gestoApagar;
if (apagarBase) P.gestoApagar = function () {
  if (this.equipSel != null && !this.pendenteAtual() && !(this.rascunho || []).length && !(this.tracado || []).length) return this.retirarEquipamento(this.equipSel) ? 'equipamento' : 'recusado';
  return apagarBase.apply(this, arguments);
};
const reporBase = P._repor;
P._repor = function () { const r = reporBase.apply(this, arguments); if (this.equipSel != null && !(porId('utas', this.equipSel) || {}).planta) this.equipSel = null; return r; };

/* ── encaixe no equipamento ao traçar ramais (e ao medir) ── */
const encBase = P.encaixe;
P.encaixe = function (raw, opts) {
  const e = encBase.call(this, raw, opts);
  if (!opts || !opts.ramais) return e;
  const p = this.pisoAtual(), tol = 14 / (this.zoom || 1);
  let best = null;
  this.equipamentosDoPiso(p).forEach(u => { const q = [u.planta.x, u.planta.y], d = D2(raw, q); if (d < tol && (!best || d < best.d)) best = { d, q, tipo: 'equipamento', rot: 'equipamento ' + u.nome }; });
  if (best && (!e.tipo || e.tipo === 'aresta' || e.tipo === 'ramal' || e.tipo === 'grelha' || best.d <= (e.d || 0))) return best;
  return e;
};
/* traçado que começa num equipamento: propõe esse equipamento para o ramal principal */
const termBase = P.terminarTracado;
P.terminarTracado = function () {
  const ini = (this.tracado || [])[0], p = this.pisoAtual();
  const r = termBase.apply(this, arguments);
  const pr = this.pendenteRamal;
  if (pr && ini && p) {
    const u = this.equipamentosDoPiso(p).find(x => D2([x.planta.x, x.planta.y], pr.pts[0]) <= 1);
    if (u) {
      pr.pai = null;   // começa no equipamento (mesmo que outro ramal principal comece no mesmo ponto)
      const par = this.metadePar(u);
      pr.equip = u.id; this._utaEscolhida = u.id; this._utaEscolhidaPar = par ? par.id : null;
      this.redesenhar();
    }
  }
  return r;
};
const painelBase0 = P._painel;
P._painel = function (p) {
  let h = painelBase0.call(this, p);
  const pr = this.pendenteRamal, u = pr && pr.equip != null && porId('utas', pr.equip);
  if (u) {
    const par = this.metadePar(u);
    const nota = '<p class="planta-meta">Começa no equipamento <b>' + esc(u.nome) + '</b>' + (par ? ' (VCM com <b>' + esc(par.nome) + '</b>: escolha a metade da rede deste ramal)' : '') + '.</p>';
    h = h.replace('<label for="rmExistente">', nota + '<label for="rmExistente">');
  }
  return h;
};

/* ── desenho ── */
const eqInicioBase = P._equipamentoNoInicio;
P._equipamentoNoInicio = function (r, z) {
  const u = porId('utas', r.utaRef), p = this.pisoAtual();
  if (u && u.planta && p && u.planta.pisoId === p.id) return '';   // desenhado no seu lugar (abaixo)
  return eqInicioBase ? eqInicioBase.call(this, r, z) : '';
};
/* seta da ligação ao exterior: ODA entra, EHA sai; (ux,uy) aponta para fora */
const ligExterior = (o, ux, uy, z, cor, entra, rot) => {
  const p0 = [o[0], o[1]], p1 = [o[0] + ux * 30 / z, o[1] + uy * 30 / z], [de, para] = entra ? [p1, p0] : [p0, p1];
  const ang = Math.atan2(para[1] - de[1], para[0] - de[0]) * 180 / Math.PI, s = 5 / z;
  const lx = p1[0] + ux * 6 / z, ly = p1[1] + uy * 6 / z;
  const anc = Math.abs(ux) > Math.abs(uy) ? (ux > 0 ? 'start' : 'end') : 'middle', dy = Math.abs(uy) >= Math.abs(ux) ? (uy > 0 ? 9 / z : -3 / z) : 3.5 / z;
  return '<line class="planta-eq-ext" data-lig="' + (entra ? 'ODA' : 'EHA') + '" x1="' + n2(de[0]) + '" y1="' + n2(de[1]) + '" x2="' + n2(para[0]) + '" y2="' + n2(para[1]) + '" stroke="' + cor + '" stroke-width="' + n2(2.6 / z) + '" stroke-dasharray="' + n2(5 / z) + ' ' + n2(3 / z) + '"/>'
    + '<path d="M' + n2(-s * 1.4) + ',' + n2(-s) + ' L0,0 L' + n2(-s * 1.4) + ',' + n2(s) + ' z" transform="translate(' + n2(para[0]) + ',' + n2(para[1]) + ') rotate(' + n2(ang) + ')" fill="' + cor + '"/>'
    + (z >= 0.8 ? '<text x="' + n2(lx) + '" y="' + n2(ly + dy) + '" text-anchor="' + anc + '" font-size="' + n2(9 / z) + '" font-weight="700" fill="' + cor + '" paint-order="stroke" stroke="#fff" stroke-width="' + n2(3 / z) + '">' + rot + '</text>' : '');
};
P._equipHTML = function (u, p, z) {
  const par = this.metadePar(u), duplo = par && par.planta && par.planta.pisoId === p.id && D2([par.planta.x, par.planta.y], [u.planta.x, u.planta.y]) < 0.6;
  const o = [u.planta.x, u.planta.y], C = this.cores ? this.cores() : { ODA: '#2e8b3e', EHA: '#7a4a24' };
  const metades = duplo ? [u, par] : [u];
  const ramais = metades.reduce((a, x) => a.concat(this.ramaisDoEquip(x, p)), []);
  // para fora = ao contrário da média das direções para os ramais (sem ramais: para a esquerda)
  let vx = 0, vy = 0;
  ramais.forEach(r => { const q = this._ligadoAoEquip(r, u) && r.planta.pts[1] ? r.planta.pts[1] : r.planta.pts[0], l = D2(q, o) || 1; vx += (q[0] - o[0]) / l; vy += (q[1] - o[1]) / l; });
  let l = Math.hypot(vx, vy); if (l < 1e-6) { vx = 1; vy = 0; l = 1; }
  const ux = -vx / l, uy = -vy / l;
  const t = this.tipoDe(u), cod = duplo ? (t ? t.codigo : 'VCM') : (t ? t.codigo : 'UTA');
  const w = (duplo ? 40 : 30) / z, hh = (duplo ? 24 : 18) / z;
  const sel = String(this.equipSel) === String(u.id) || (duplo && String(this.equipSel) === String(par.id));
  let x = '';
  // ligações aos ramais que não começam no equipamento
  ramais.filter(r => !this._ligadoAoEquip(r, u)).forEach(r => {
    const q = r.planta.pts[0], dist = p.escala ? D2(q, o) * p.escala : null;
    x += '<line class="planta-eq-solto" data-r="' + esc(r.id) + '" x1="' + n2(o[0]) + '" y1="' + n2(o[1]) + '" x2="' + n2(q[0]) + '" y2="' + n2(q[1]) + '" stroke="' + this.corRede(r.rede) + '" stroke-width="' + n2(2 / z) + '" stroke-dasharray="' + n2(2 / z) + ' ' + n2(4 / z) + '" pointer-events="none"><title>' + esc(r.nome) + ' não começa no equipamento' + (dist ? ' (' + fmt(dist, 2) + ' m)' : '') + '</title></line>';
  });
  // ligações ao exterior: uma (ventilador) ou duas (VCM: ODA entra, EHA sai, lado a lado)
  const borda = [o[0] + ux * w * 0.55, o[1] + uy * hh * 0.55 + uy * (w - hh) * 0.0];
  if (duplo) {
    const px = -uy, py = ux, off = hh * 0.28;
    x += ligExterior([borda[0] + px * off, borda[1] + py * off], ux, uy, z, C.ODA, true, 'ODA');
    x += ligExterior([borda[0] - px * off, borda[1] - py * off], ux, uy, z, C.EHA, false, 'EHA');
  } else {
    const ext = !VC.redes.ehExtracao(u.rede);
    x += ligExterior(borda, ux, uy, z, ext ? C.ODA : C.EHA, ext, ext ? 'ar exterior · ODA' : 'rejeição · EHA');
  }
  x += '<rect x="' + n2(o[0] - w / 2) + '" y="' + n2(o[1] - hh / 2) + '" width="' + n2(w) + '" height="' + n2(hh) + '" rx="' + n2(3 / z) + '" fill="#1e293b" stroke="' + (sel ? '#f2c94c' : '#fff') + '" stroke-width="' + n2((sel ? 3.2 : 1.6) / z) + '"/>';
  if (duplo) x += '<line x1="' + n2(o[0]) + '" y1="' + n2(o[1] - hh / 2 + 2 / z) + '" x2="' + n2(o[0]) + '" y2="' + n2(o[1] + hh / 2 - 2 / z) + '" stroke="#64748b" stroke-width="' + n2(1 / z) + '"/>';
  x += '<text x="' + n2(o[0]) + '" y="' + n2(o[1] + 3.4 / z) + '" text-anchor="middle" font-size="' + n2((duplo ? 9.5 : 8.5) / z) + '" font-weight="800" fill="#fff">' + esc(cod) + '</text>';
  if (z >= 0.5) x += '<text class="planta-eq-nome" x="' + n2(o[0]) + '" y="' + n2(o[1] + hh / 2 + 10 / z) + '" text-anchor="middle" font-size="' + n2(8.5 / z) + '" font-weight="700" fill="#1e293b" paint-order="stroke" stroke="#fff" stroke-width="' + n2(3 / z) + '">' + esc(duplo ? String(u.nome).replace(/\s*\((insufla|extra)[^)]*\)\s*$/i, '') : u.nome) + '</text>';
  const tit = esc(u.nome) + (duplo ? ' + ' + esc(par.nome) : '') + (t ? ' · ' + esc(t.nome) : '') + ' · ' + fmt((Number(u.Q) || 0) * 3600, 0) + ' m³/h' + (duplo ? ' + ' + fmt((Number(par.Q) || 0) * 3600, 0) + ' m³/h' : '');
  return '<g class="planta-eq" data-u="' + esc(u.id) + '"' + (duplo ? ' data-par="' + esc(par.id) + '"' : '') + ' data-tipo="' + esc(cod) + '" style="cursor:move"><title>' + tit + '</title>' + x + '</g>';
};
const svgBase = P._svg;
P._svg = function (p) {
  const s = svgBase.call(this, p);
  if (!p) return s;
  const z = this.zoom || 1, feitos = new Set();
  let g = '';
  this.equipamentosDoPiso(p).forEach(u => {
    if (feitos.has(String(u.id))) return;
    const par = this.metadePar(u);
    if (par && par.planta && par.planta.pisoId === p.id && D2([par.planta.x, par.planta.y], [u.planta.x, u.planta.y]) < 0.6) {
      feitos.add(String(par.id));
      if (VC.redes.ehExtracao(u.rede) && !VC.redes.ehExtracao(par.rede)) { feitos.add(String(u.id)); g += this._equipHTML(par, p, z); return; }   // a insuflação dá o nome à caixa
    }
    feitos.add(String(u.id)); g += this._equipHTML(u, p, z);
  });
  if (!g) return s;
  const corte = s.indexOf('<g class="planta-term"') >= 0 ? s.indexOf('<g class="planta-term"') : s.lastIndexOf('</svg>');
  return s.slice(0, corte) + '<g class="planta-equips">' + g + '</g>' + s.slice(corte);
};

/* ── rato: colocar (U) e arrastar (V) ── */
const prepBase = P.prepararVista;
P.prepararVista = function () {
  prepBase.apply(this, arguments);
  const palco = this._palco && this._palco();
  if (!palco || palco._vcEquip) return;
  palco._vcEquip = true;
  let arr = null;
  palco.addEventListener('pointerdown', ev => {
    if (ev.button !== 0 || this._espaco) return;
    if (ev.target.closest && ev.target.closest('.planta-flut, .planta-estado')) return;
    if (this.ferramenta === 'equip') { ev.stopPropagation(); ev.preventDefault(); this.colocarEquipamento(this._ponto(ev)); return; }
    if (this.ferramenta !== 'sel') return;
    const g = ev.target.closest && ev.target.closest('.planta-eq'); if (!g) return;
    ev.stopPropagation(); ev.preventDefault();
    const u = porId('utas', g.dataset.u); if (!u || !u.planta) return;
    // seleciona sem redesenhar tudo (o palco seria trocado a meio do gesto); o painel atualiza no fim
    const novo = String(this.equipSel) !== String(u.id) && !(g.dataset.par && String(this.equipSel) === String(g.dataset.par));
    if (novo) { this.selecionado = null; this.ramalSel = null; this.trfSel = null; this.termSel = null; this.trocoSel = null; this.equipSel = u.id; }
    const q = this._pontoBruto ? this._pontoBruto(ev) : this._ponto(ev);
    arr = { id: u.id, novo, antes: this._estado(), dx: u.planta.x - q[0], dy: u.planta.y - q[1], x0: ev.clientX, y0: ev.clientY, mexeu: false, livre: !this._bloqueado() };
    try { palco.setPointerCapture(ev.pointerId); } catch (e) { /* opcional */ }
  }, true);
  palco.addEventListener('pointermove', ev => {
    if (!arr) return; ev.stopPropagation();
    if (!arr.livre || (!arr.mexeu && Math.hypot(ev.clientX - arr.x0, ev.clientY - arr.y0) < 4)) return;
    arr.mexeu = true;
    const q = this._pontoBruto ? this._pontoBruto(ev) : this._ponto(ev);
    this.moverEquipamento(arr.id, [q[0] + arr.dx, q[1] + arr.dy]);
    this.redesenharDesenho ? this.redesenharDesenho() : this.redesenhar();   // só o desenho: o palco (e a captura do rato) fica
  }, true);
  const fim = ev => {
    if (!arr) return; ev.stopPropagation();
    const a = arr; arr = null;
    if (a.mexeu) { this._empilhar('equipamento movido', a.antes); if (VC.estado && VC.estado.forcarSync) VC.estado.forcarSync(); }
    if (a.mexeu || a.novo) this.redesenhar();
  };
  palco.addEventListener('pointerup', fim, true);
  palco.addEventListener('pointercancel', fim, true);
};

/* ── painel do equipamento ── */
const equipamento = {
  titulo: u => u.nome, icone: 'fa-fan', rotulo: 'Equipamento',
  avisos: u => [u.nome],
  campos: [
    { id: 'nome', rot: 'Nome', tipo: 'texto', ess: true, ler: u => u.nome, acao: (u, v) => P.renomearEquipamento(u.id, v), ajuda: 'Os ramais referem o equipamento pelo código, por isso o nome muda sem mais nada.' },
    { id: 'tipoSistema', rot: 'Tipo de sistema', tipo: 'opcoes', ess: true,
      opcoes: u => [['', '— por definir —']].concat((VC.constantes.TIPOS_SISTEMA || []).filter(t => t.redes.indexOf(u.rede) >= 0).map(t => [t.codigo, t.nome])),
      ler: u => u.tipoSistema || '', proposto: u => { const t = !u.tipoSistema ? P.tipoDe(u) : null; return t ? { v: t.codigo, origem: 'nome' } : null; },
      escrever: (u, v) => { if (!VC.uta.definirTipoSistema(u, v)) VC.ui.toast('Esse tipo não serve a rede de ' + VC.redes.rotulo(u.rede) + '.'); },
      ajuda: 'VCM/VMC: duplo fluxo; as duas metades ficam na mesma caixa da planta.' }
  ],
  resultado: (u, p) => {
    const par = P.metadePar(u), c = u.sfpClass || {}, rs = p ? [u].concat(par || []).reduce((a, x) => a.concat(P.ramaisDoEquip(x, p)), []) : [];
    return [
      ['Rede', VC.redes.rotulo(u.rede), par ? 'par: ' + par.nome + ' (' + VC.redes.rotulo(par.rede) + ')' : ''],
      ['Caudal servido', fmt((Number(u.Q) || 0) * 3600, 0) + ' m³/h', 'soma dos ramais principais'],
      ['Fugas → ventilador', u.Q_fugas > 0 ? fmt(u.Q_fugas, 1) + ' → ' + fmt(u.Q_ventilador_mh, 0) + ' m³/h' : '—', u.Q_fugas > 0 ? (u.fugasDefinidas < u.fugasRamais ? (u.fugasRamais - u.fugasDefinidas) + ' ramais sem classe' : 'todos os ramais com classe') : 'defina a estanquidade nos ramais'],
      ['Δp externo', fmt(u.dpExt, 0) + ' Pa', 'percurso crítico da rede'],
      ['Δp interno', fmt(u.dpInt, 0) + ' Pa', (u.componentes || []).length + ' componentes (passo UTAs)'],
      ['Potência', fmt(u.P_motor, 0) + ' W', 'com o fator de serviço'],
      ['SFP', fmt(u.sfpE, 0) + ' W/(m³/s)', u.sfpCategoria || ''],
      ['SFPint Ecodesign', fmt(c.sfpInt != null ? c.sfpInt : u.sfpIntEco, 0), c.limite != null ? 'limite ' + c.limite + (u.status === 'OK' ? ' · conforme' : ' · NÃO conforme') : 'sem limite'],
      ['Ramais ligados', rs.length ? rs.map(r => r.nome + (P._ligadoAoEquip(r, u) ? '' : ' (solto)')).join(', ') : '—', '']
    ];
  },
  porFazer: (u, p) => {
    const f = []; if (!p) return f;
    [u].concat(P.metadePar(u) || []).forEach(x => P.ramaisDoEquip(x, p).forEach(r => { if (!P._ligadoAoEquip(r, u)) f.push(r.nome + ' não começa no equipamento'); }));
    if (!(VC.dados.ramais || []).some(r => String(r.utaRef) === String(u.id))) f.push('sem ramais: trace um ramal a partir do equipamento (L)');
    const pp = P.parProposto(u); if (pp) f.push('duplo fluxo sem a outra metade: junte com «' + pp.nome + '»');
    return f;
  },
  acoes: (u, p) => {
    const a = [], id = "'" + esc(String(u.id)) + "'";
    if (p && [u].concat(P.metadePar(u) || []).some(x => P.ramaisDoEquip(x, p).some(r => !P._ligadoAoEquip(r, u)))) a.push(['Ligar os ramais ao equipamento', 'VC.planta.ligarRamaisAoEquip(' + id + ')', true]);
    const pp = P.parProposto(u);
    if (pp) a.push(['Juntar com «' + pp.nome + '» (4 ligações)', 'VC.planta.juntarPar(' + id + ",'" + esc(String(pp.id)) + "')", true]);
    a.push(['Abrir no passo UTAs', "VC.nav.irPasso('utas')"]);
    a.push(['Tirar da planta (Delete)', 'VC.planta.retirarEquipamento(' + id + ')']);
    return a;
  }
};
PN.esquemas.equipamento = equipamento;
const obterBase = PN._obter.bind(PN);
PN._obter = function (tipo, id) { return tipo === 'equipamento' ? porId('utas', id) : obterBase(tipo, id); };
const selBase = PN.selecao.bind(PN);
PN.selecao = function () {
  if (P.equipSel != null && !P.pendenteAtual() && !(P.rascunho || []).length && !(P.tracado || []).length) { const u = porId('utas', P.equipSel); if (u && u.planta) return { tipo: 'equipamento', o: u }; }
  return selBase();
};
})();
