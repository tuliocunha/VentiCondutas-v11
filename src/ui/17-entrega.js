/* ============================================================
   VentiCondutas v11.3 · Ecrã Entrega (maquete validada pelo utilizador)
   ------------------------------------------------------------
   Ordem de leitura: 1) o projeto está pronto?  2) o resultado em números
   3) a rede numa imagem  4) o que entregar a quem (Licenciamento · Obra ·
   Ensaios)  5) os 15 relatórios técnicos, recolhidos, para o engenheiro.
   Tudo é lido dos dados do projeto; nenhum número é escrito à mão.
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('17-entrega');

const esc = s => VC.utils.esc(s);
const fmt = (n, d) => VC.utils.fmt(n, d || 0);
const milhar = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

VC.entrega = {
  /* onde se resolve cada tipo de aviso da auditoria */
  _passoDoAviso(tipo) {
    const t = String(tipo || '');
    if (/sec[cç][aã]o|velocidade|di[aâ]metro|conduta|perda/i.test(t)) return 'rede';
    if (/ventilador|sfp|uta|motor|ecodesign|curva/i.test(t)) return 'utas';
    if (/balan|res[ií]duo/i.test(t)) return 'balanco';
    if (/transfer/i.test(t)) return 'transferencias';
    if (/terminal/i.test(t)) return 'terminais';
    if (/caudal|espa[cç]o|grupo/i.test(t)) return 'classificacao';
    return 'normativa';
  },
  _piso(zona) {
    const z = String(zona || '');
    let m = z.match(/^\s*P\s*(\d+)/i); if (m) return 'Piso ' + m[1];
    if (/^\s*mez/i.test(z)) return 'Mezanino';
    m = z.match(/piso\s*(\d+)/i); if (m) return 'Piso ' + m[1];
    return 'Sem piso';
  },
  _ordemPiso(p) { const m = /^Piso (\d+)/.exec(p); return m ? Number(m[1]) : (p === 'Mezanino' ? 50 : 99); },   // Piso 0, Piso 1, …, Mezanino
  ehVEX(u) { return u.rede === 'extracao_suja' || /^VEX\b/i.test(u.nome || ''); },

  dados() {
    const x = VC.calculo.calcularTudo();
    const D = VC.dados;
    const avisos = x.findings || [];
    const porTipo = {};
    avisos.forEach(f => {
      const k = (f.severidade || '') + '|' + (f.tipo || 'Aviso');
      if (!porTipo[k]) porTipo[k] = { sev: f.severidade, tipo: f.tipo || 'Aviso', n: 0, elementos: [], msg: f.msg || '', passo: this._passoDoAviso(f.tipo) };
      porTipo[k].n++; if (f.elemento) porTipo[k].elementos.push(f.elemento);
    });
    const pontos = Object.values(porTipo).sort((a, b) => (a.sev === 'ERRO' ? 0 : 1) - (b.sev === 'ERRO' ? 0 : 1) || b.n - a.n);
    const nErros = avisos.filter(f => f.severidade === 'ERRO').length;

    const utas = (D.utas || []).filter(u => !this.ehVEX(u));
    const vex = (D.utas || []).filter(u => this.ehVEX(u));
    const Qmh = u => (Number(u.Q) || 0) * 3600;
    const insufl = (D.utas || []).filter(u => u.rede === 'insuflacao').reduce((s, u) => s + Qmh(u), 0);
    const extr = (D.utas || []).filter(u => u.rede !== 'insuflacao').reduce((s, u) => s + Qmh(u), 0);
    const potencias = utas.map(u => Number(u.P_motor) || 0).filter(p => p > 0);

    /* caudal de cada unidade por piso: terminal → ramal → UTA; espaço → piso */
    const ramalPorNome = {}; (D.ramais || []).forEach(r => { ramalPorNome[r.nome] = r; });
    const espPorId = {}; (D.espacos || []).forEach(e => { espPorId[e.id] = e; espPorId[e.nome] = e; });
    const porUta = {};
    (D.terminais || []).forEach(t => {
      const r = ramalPorNome[t.ramalRef]; if (!r) return;
      const u = (D.utas || []).find(v => v.id === r.utaRef || v.nome === r.utaRef); if (!u) return;
      (t.espacos || []).forEach(pe => {
        const e = espPorId[pe.id] || espPorId[pe.nome] || {};
        const piso = this._piso(e.zona || e.localizacao);
        porUta[u.id] = porUta[u.id] || {}; porUta[u.id][piso] = (porUta[u.id][piso] || 0) + (Number(pe.Q_parcela) || 0);
      });
    });
    const maxQ = Math.max(1, ...utas.map(Qmh));
    const redes = utas.map(u => ({
      nome: u.nome, rede: u.rede, Q: Qmh(u), P: Number(u.P_motor) || 0,
      pisos: Object.entries(porUta[u.id] || {}).sort((a, b) => this._ordemPiso(a[0]) - this._ordemPiso(b[0])).map(([piso, q]) => ({ piso, q, pct: Math.round(q / maxQ * 100) }))
    }));

    let bom = { linhas: [], totais: { metros: 0, trechos: 0 } };
    try { bom = VC.bom.extrair(); } catch (e) { VC.debug.erro(e); }
    const porD = {};
    (bom.linhas || []).forEach(l => { const k = l.diametro; porD[k] = porD[k] || { d: k, n: 0, m: 0 }; porD[k].n += l.n_trechos || 0; porD[k].m += l.metros || 0; });
    const condutas = Object.values(porD).sort((a, b) => (Number(a.d) || 0) - (Number(b.d) || 0));
    const dNum = condutas.map(c => Number(c.d)).filter(n => n > 0);

    return {
      meta: D.metadados || {}, pontos, nErros, nAvisos: avisos.length,
      insufl, extr, utas, vex, potencias, redes, bom, condutas,
      dMin: dNum.length ? Math.min(...dNum) : null, dMax: dNum.length ? Math.max(...dNum) : null,
      nTerminais: (D.terminais || []).length, nEspacos: (D.espacos || []).length,
      vexQ: vex.reduce((s, u) => s + Qmh(u), 0)
    };
  },

  abrirRelatorio(id) {
    VC.modos.set('relatorios');
    if (VC.modoRelatorios) VC.modoRelatorios.set(id);
  },

  /* relatórios técnicos agrupados como na maquete */
  GRUPOS: [
    { titulo: 'Caudais e espaços', itens: [['requisitos', 'Caudal por espaço'], ['balanco', 'Balanço de ar'], ['pressoes', 'Pressões entre espaços']] },
    { titulo: 'Rede de condutas', itens: [['dimensionamento', 'Dimensionamento das condutas'], ['arvore', 'Árvore de ramais'], ['associacao', 'Ligação terminais–ramais'], ['redeAr', 'Rede de ar']] },
    { titulo: 'Equipamentos', itens: [['ventilador', 'Ventiladores e UTAs'], ['engenharia', 'Cálculo de engenharia']] },
    { titulo: 'Conformidade e obra', itens: [['geral', 'Resumo geral'], ['conformidade', 'Conformidade regulamentar'], ['bom', 'Mapa de quantidades'], ['tab', 'Ensaios e equilibragem'], ['caderno', 'Caderno de encargos'], ['diagnostico', 'Diagnóstico da app']] }
  ],

  render() {
    const d = this.dados();
    const m = d.meta;
    let estado, classe;
    if (d.nErros) { estado = 'Por resolver · ' + d.nErros + ' erro' + (d.nErros > 1 ? 's' : '') + ' impede' + (d.nErros > 1 ? 'm' : '') + ' a entrega'; classe = 'erro'; }
    else if (d.pontos.length) { estado = 'Quase pronto · ' + d.pontos.length + ' ponto' + (d.pontos.length > 1 ? 's' : '') + ' a rever antes de entregar'; classe = 'atencao'; }
    else { estado = 'Pronto a entregar'; classe = 'ok'; }

    let h = '<div class="entrega">';
    h += '<div class="entrega-proj">' + esc(m.nome || 'Projeto') + (m.local ? ' · ' + esc(m.local) : '') + (m.revisao ? ' · Rev. ' + esc(m.revisao) : '') + '</div>';

    /* 1 · estado */
    h += '<section class="entrega-estado entrega-' + classe + '" aria-label="Estado do projeto"><h2>' + esc(estado) + '</h2>';
    if (d.pontos.length) {
      h += '<ul class="entrega-pontos">' + d.pontos.map(p => '<li><span class="badge ' + (p.sev === 'ERRO' ? 'erro' : 'atencao') + '">' + p.n + ' ×</span> <b>' + esc(p.tipo) + '</b>'
        + (p.elementos.length ? ' <span class="entrega-el">(' + esc(p.elementos.slice(0, 4).join(', ') + (p.elementos.length > 4 ? '…' : '')) + ')</span>' : '')
        + '<span class="entrega-msg">' + esc(p.msg) + '</span>'
        + '<button class="btn btn-mini" onclick="VC.nav.irPasso(\'' + p.passo + '\')">Resolver <i class="fa-solid fa-arrow-right"></i></button></li>').join('') + '</ul>';
    } else h += '<p>Caudais, balanço de ar, condutas e equipamentos sem avisos.</p>';
    h += '</section>';

    /* 2 · resultado */
    const pot = d.potencias.length ? fmt(Math.min(...d.potencias)) + '–' + fmt(Math.max(...d.potencias)) + ' W' : '—';
    h += '<section aria-label="Resultado do projeto"><h3 class="entrega-h">O resultado do projeto</h3><div class="entrega-kpis">'
      + '<div class="entrega-kpi"><b>' + milhar(d.insufl) + ' m³/h</b><span>de ar insuflado · ' + milhar(d.extr) + ' m³/h extraídos</span></div>'
      + '<div class="entrega-kpi"><b>' + d.utas.length + (d.vex.length ? ' + ' + d.vex.length : '') + ' unidades</b><span>' + d.utas.length + ' UTAs (motores ' + pot + ')' + (d.vex.length ? ' e ' + d.vex.length + ' extratores' : '') + '</span></div>'
      + '<div class="entrega-kpi"><b>' + fmt(d.bom.totais.metros || 0) + ' m</b><span>de conduta' + (d.dMin ? ', Ø' + d.dMin + ' a Ø' + d.dMax : '') + ' · ' + (d.bom.totais.trechos || 0) + ' troços</span></div>'
      + '</div></section>';

    /* 3 · a rede numa imagem */
    if (d.redes.length) {
      h += '<section aria-label="A rede numa imagem"><h3 class="entrega-h">A rede numa imagem <small>caudal de cada unidade e quanto vai para cada piso (m³/h)</small></h3><div class="entrega-redes">';
      d.redes.forEach(r => {
        const cor = r.rede === 'insuflacao' ? 'var(--primario)' : 'var(--verde)';
        h += '<div class="entrega-rede"><div class="entrega-rede-cab"><b>' + esc(r.nome) + '</b><span>' + milhar(r.Q) + ' m³/h · motor ' + fmt(r.P) + ' W</span></div>';
        h += r.pisos.map(p => '<div class="entrega-barra"><span class="entrega-piso">' + esc(p.piso) + '</span><span class="entrega-trilho"><span style="width:' + p.pct + '%;background:' + cor + '"></span></span><span class="entrega-q">' + milhar(p.q) + '</span></div>').join('');
        h += '</div>';
      });
      h += '</div>';
      if (d.vex.length) h += '<p class="entrega-nota">Mais ' + d.vex.length + ' extratores dedicados (VEX), ' + milhar(d.vexQ) + ' m³/h no total.</p>';
      h += '</section>';
    }

    /* 4 · por destinatário */
    h += '<section aria-label="Entregar por destinatário"><h3 class="entrega-h">Entregar · por destinatário</h3><div class="entrega-dest">';
    h += '<div class="entrega-card"><div class="entrega-card-t">Licenciamento · dono de obra</div><div class="entrega-card-s">Projeto e conformidade</div><ul>'
      + '<li>Memória descritiva e justificativa</li><li>Caudais pela Portaria 138-I/2021 (' + d.nEspacos + ' espaços)</li><li>Ecodesign das ' + d.utas.length + ' UTAs · Reg. (UE) 1253/2014</li></ul>'
      + '<div class="entrega-acoes"><button class="btn primario" onclick="VC.exportacoes.pdf()"><i class="fa-solid fa-file-pdf"></i> Descarregar PDF do projeto</button>'
      + '<button class="btn" onclick="VC.entrega.abrirRelatorio(\'conformidade\')">Ver conformidade</button></div></div>';
    h += '<div class="entrega-card"><div class="entrega-card-t">Obra · instalador</div><div class="entrega-card-s">Quantidades e equipamentos</div><ul>'
      + '<li>Mapa de quantidades por diâmetro</li><li>Equipamentos: ' + d.utas.length + ' UTAs' + (d.vex.length ? ' + ' + d.vex.length + ' VEX' : '') + '</li><li>Caderno de encargos</li></ul>';
    if (d.condutas.length) {
      h += '<details class="entrega-det"><summary>Ver condutas por diâmetro</summary><table class="tabela densa"><thead><tr><th>Conduta</th><th>Troços</th><th>Metros (m)</th></tr></thead><tbody>'
        + d.condutas.map(c => '<tr><td>Ø' + esc(c.d) + '</td><td>' + c.n + '</td><td>' + fmt(c.m, 1) + '</td></tr>').join('') + '</tbody></table></details>';
    }
    h += '<div class="entrega-acoes"><button class="btn primario" onclick="VC.bom.exportarCSV()"><i class="fa-solid fa-file-csv"></i> Descarregar mapa de quantidades</button>'
      + '<button class="btn" onclick="VC.exportacoes.excel()"><i class="fa-solid fa-file-excel"></i> Excel completo</button>'
      + '<button class="btn" onclick="VC.nav.irPasso(\'caderno\')">Caderno de encargos</button></div></div>';
    h += '<div class="entrega-card"><div class="entrega-card-t">Ensaios · equilibragem</div><div class="entrega-card-s">Caudal a medir em cada terminal</div><ul>'
      + '<li>' + d.nTerminais + ' difusores, grelhas e bocas com o caudal de projeto</li><li>Tolerância de receção ±15 % (EN 12599)</li><li>Registo do valor medido no passo Terminais</li></ul>'
      + '<div class="entrega-acoes"><button class="btn primario" onclick="VC.entrega.abrirRelatorio(\'tab\')"><i class="fa-solid fa-clipboard-check"></i> Ver tabela de ensaios</button>'
      + '<button class="btn" onclick="VC.nav.irPasso(\'terminais\')">Registar medições</button></div></div>';
    h += '</div><p class="entrega-nota">Todos os documentos saem dos mesmos dados' + (m.revisao ? ' · Revisão ' + esc(m.revisao) : '') + '.</p></section>';

    /* 5 · relatórios técnicos, recolhidos */
    const n = this.GRUPOS.reduce((s, g) => s + g.itens.length, 0);
    h += '<details class="entrega-tec"><summary>Relatórios técnicos (' + n + ') · para o engenheiro rever o cálculo</summary><div class="entrega-tec-grupos">'
      + this.GRUPOS.map(g => '<div><div class="entrega-tec-t">' + esc(g.titulo) + '</div>' + g.itens.map(([id, nome]) => '<button class="btn btn-mini" onclick="VC.entrega.abrirRelatorio(\'' + id + '\')">' + esc(nome) + '</button>').join('') + '</div>').join('')
      + '</div></details>';
    h += '</div>';
    return h;
  }
};
})();
