/* ============================================================
   VentiCondutas v11.3 · Navegação única (PR 1 do plano Planta + Navegação)
   ------------------------------------------------------------
   Antes havia 4 sistemas de navegação sobrepostos: janelas (6), lentes (4),
   modos (7, com a barra escondida) e passos (16). Os números não batiam
   (a janela "4 · Topologia" abria "4 · Verificação · Balanço") e os gráficos
   tapavam o ecrã sem forma clara de voltar.

   Agora há um só caminho:
   · Fases no topo  = os 5 grupos do menu lateral (mesma numeração).
   · Menu lateral   = os passos, sempre todos visíveis, com o estado.
   · Vistas         = separadores dentro do passo, só onde fazem sentido.
                      Os gráficos e as antigas lentes vivem no passo que explicam.
   · Rodapé         = "← anterior · seguinte →".
   · Conceitos      = coluna à direita, recolhível, do passo atual.

   Nada de cálculo muda: as vistas chamam as mesmas funções de desenho.
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('16-navegacao');

const esc = s => VC.utils.esc(s);

VC.nav = {
  /* vistas de cada passo: 'passo' = o ecrã normal do passo; lente = desenha no passo; modo = ecrã gráfico */
  VISTAS: {
    levantamento: [{ id: 'passo', nome: 'Tabela', icone: 'fa-table' }, { id: 'planta', nome: 'Planta', icone: 'fa-map', desenhar: 'planta' }],
    classificacao: [{ id: 'passo', nome: 'Tabela', icone: 'fa-table' }, { id: 'kanban', nome: 'Por grupo G1–G4', icone: 'fa-table-columns', lente: 'kanban' }, { id: 'planta', nome: 'Planta', icone: 'fa-map', desenhar: 'planta' }],
    requisitos: [{ id: 'passo', nome: 'Definições', icone: 'fa-list-check' }, { id: 'tabela', nome: 'Resumo dos espaços', icone: 'fa-table', lente: 'tabela' }],
    associacao: [{ id: 'passo', nome: 'Ligações', icone: 'fa-link' }, { id: 'planta', nome: 'Planta', icone: 'fa-map', desenhar: 'planta' }, { id: 'hasse', nome: 'Árvore UTA → espaços', icone: 'fa-sitemap', lente: 'hasse' }, { id: 'arvore', nome: 'Árvore interativa', icone: 'fa-diagram-project', modo: 'arvore' }, { id: 'construtor', nome: 'Construtor', icone: 'fa-compass-drafting', modo: 'construtor' }],
    rede: [{ id: 'passo', nome: 'Tabela', icone: 'fa-table' }, { id: 'planta', nome: 'Planta', icone: 'fa-map', desenhar: 'planta' }, { id: 'diagrama-rede', nome: 'Diagrama da rede', icone: 'fa-network-wired', modo: 'diagrama-rede' }, { id: 'grafico-condutas', nome: 'Gráfico das condutas', icone: 'fa-cube', modo: 'grafico-condutas' }],
    balanco: [{ id: 'passo', nome: 'Tabela', icone: 'fa-table' }, { id: 'planta', nome: 'Planta', icone: 'fa-map', desenhar: 'planta' }, { id: 'grafico-conceitual', nome: 'Fluxos entre espaços', icone: 'fa-diagram-project', modo: 'grafico-conceitual' }],
    terminais: [{ id: 'passo', nome: 'Tabela', icone: 'fa-table' }, { id: 'planta', nome: 'Planta', icone: 'fa-map', desenhar: 'planta' }],
    transferencias: [{ id: 'passo', nome: 'Tabela', icone: 'fa-table' }, { id: 'planta', nome: 'Planta', icone: 'fa-map', desenhar: 'planta' }],
    relatorios: [{ id: 'passo', nome: 'Entrega', icone: 'fa-box-open' }, { id: 'relatorios', nome: 'Relatórios técnicos', icone: 'fa-file-lines', modo: 'relatorios' }]
  },
  vistaAtiva: 'passo',

  fases() {
    const out = [];
    (VC.passosCatalogo || []).forEach(p => {
      let f = out.find(x => x.id === p.grupo);
      if (!f) { f = { id: p.grupo, nome: p.grupoNome, passos: [] }; out.push(f); }
      f.passos.push(p.id);
    });
    return out;
  },
  faseDe(passo) { return this.fases().find(f => f.passos.indexOf(passo) >= 0) || null; },
  vistasDe(passo) { return this.VISTAS[passo] || [{ id: 'passo', nome: 'Passo' }]; },

  irPasso(id) {
    if (VC._modoAtivo !== 'condutas' && VC.modos && VC.modos.set) VC.modos.set('condutas');
    if (VC.ui && typeof VC.ui.setPasso === 'function') VC.ui.setPasso(id); else VC.passos.render(id);
    if (VC.urlSync && VC.urlSync.sync) VC.urlSync.sync({ push: true });   // o passo fica no endereço (voltar atrás do navegador funciona)
  },
  irFase(id) { const f = this.fases().find(x => x.id === id); if (f) this.irPasso(f.passos[0]); },

  setVista(id) {
    const passo = VC._passoAtivo || 'setup';
    const v = this.vistasDe(passo).find(x => x.id === id);
    if (!v) return;
    if (v.modo) {
      VC.modos.set(v.modo);   // o ecrã gráfico abre na área de trabalho; as fases, os passos e os separadores ficam à vista
    } else {
      if (VC._modoAtivo !== 'condutas') VC.modos.set('condutas');
      if (v.desenhar === 'planta' && VC.planta) { const el = document.getElementById('conteudoPasso'); if (el) VC.planta.mostrar(el); }
      else if (v.lente) { VC.layoutV2.renderLens(v.lente); VC.flags.layoutV2Lente = v.lente; }
      else VC.passos.render(passo);
    }
    this.vistaAtiva = id;
    this.desenharVistas();
  },

  /* ── desenho ───────────────────────────── */
  desenharFases() {
    const bar = document.querySelector('.janelas-bar');
    if (!bar) return;
    const atual = this.faseDe(VC._passoAtivo || 'setup');
    bar.setAttribute('aria-label', 'Fases do projeto');
    bar.innerHTML = this.fases().map(f => {
      const est = this._estadoFase(f);
      return '<button class="janela-btn fase-btn' + (atual && atual.id === f.id ? ' ativo' : '') + '" data-fase="' + f.id + '" onclick="VC.nav.irFase(\'' + f.id + '\')"' + (atual && atual.id === f.id ? ' aria-current="step"' : '') + '>'
        + '<span class="fase-estado fase-' + est + '" aria-hidden="true"></span>' + esc(f.nome) + '</button>';
    }).join('');
  },
  _estadoFase(f) {
    if (!VC.ui || typeof VC.ui.estadoPasso !== 'function') return 'vazio';
    const est = f.passos.map(id => { try { const r = VC.ui.estadoPasso(id); return (r && r.estado) || r || 'vazio'; } catch (e) { return 'vazio'; } });
    if (est.some(e => e === 'atencao' || e === 'erro')) return 'atencao';
    if (est.every(e => e === 'ok')) return 'ok';
    return 'vazio';
  },
  desenharVistas() {
    let bar = document.getElementById('vistasPasso');
    const area = document.getElementById('areaTrabalho');
    if (!area) return;
    if (!bar) { bar = document.createElement('nav'); bar.id = 'vistasPasso'; bar.className = 'vistas-bar'; bar.setAttribute('aria-label', 'Vistas do passo'); area.insertBefore(bar, area.firstChild); }
    const passo = VC._passoAtivo || 'setup';
    const meta = (VC.passosCatalogo || []).find(p => p.id === passo) || {};
    const vistas = this.vistasDe(passo);
    let h = '<div class="vistas-titulo"><span class="vistas-fase">' + esc(meta.grupoNome || '') + '</span> › <b>' + esc(meta.titulo || passo) + '</b></div>';
    if (vistas.length > 1) {
      h += '<div class="vistas-tabs" role="tablist">' + vistas.map(v => {
        const on = this.vistaAtiva === v.id;
        return '<button role="tab" aria-selected="' + on + '" class="vista-tab' + (on ? ' ativo' : '') + '" data-vista="' + v.id + '" onclick="VC.nav.setVista(\'' + v.id + '\')"><i class="fa-solid ' + (v.icone || 'fa-table') + '"></i> ' + esc(v.nome) + '</button>';
      }).join('') + '</div>';
    }
    const aberto = this._conceitosAbertos();
    h += '<button class="btn btn-mini vistas-conceitos" onclick="VC.nav.alternarConceitos()" aria-pressed="' + aberto + '"><i class="fa-solid fa-book-open"></i> ' + (aberto ? 'Esconder conceitos' : 'Conceitos do passo') + '</button>';
    bar.innerHTML = h;
  },
  desenharRodape() {
    const ws = document.getElementById('workspaceCondutas');
    if (!ws) return;
    let r = document.getElementById('navRodape');
    if (!r) {
      r = document.createElement('nav'); r.id = 'navRodape'; r.className = 'nav-rodape'; r.setAttribute('aria-label', 'Passo anterior e seguinte');
      const sec = ws.querySelectorAll('.secao-colapsavel')[0];
      if (sec && sec.nextSibling) ws.insertBefore(r, sec.nextSibling); else ws.appendChild(r);
    }
    const lista = (VC.passosCatalogo || []).map(p => p);
    const i = lista.findIndex(p => p.id === VC._passoAtivo);
    const ant = lista[i - 1], seg = lista[i + 1];
    r.innerHTML = (ant ? '<button class="btn" onclick="VC.nav.irPasso(\'' + ant.id + '\')"><i class="fa-solid fa-arrow-left"></i> ' + esc(ant.titulo) + '</button>' : '<span></span>')
      + '<span class="nav-rodape-pos">Passo ' + (i + 1) + ' de ' + lista.length + '</span>'
      + (seg ? '<button class="btn primario" onclick="VC.nav.irPasso(\'' + seg.id + '\')">' + esc(seg.titulo) + ' <i class="fa-solid fa-arrow-right"></i></button>' : '<span></span>');
  },

  /* conceitos do passo numa coluna à direita (antes: painel 2×3 abaixo da dobra) */
  _conceitosAbertos() { try { return localStorage.getItem('VC_nav_conceitos') === '1'; } catch (e) { return false; } },
  alternarConceitos() {
    const novo = !this._conceitosAbertos();
    try { localStorage.setItem('VC_nav_conceitos', novo ? '1' : '0'); } catch (e) { /* sem armazenamento: fica só nesta página */ this._conceitosMem = novo; }
    this._aplicarConceitos(); this.desenharVistas();
  },
  _aplicarConceitos() {
    const ws = document.getElementById('workspaceCondutas');
    if (ws) { const sec = ws.querySelector('#painelInferior'); const c = sec && sec.closest('.secao-colapsavel'); if (c) c.classList.add('secao-conceitos'); }
    if (ws) ws.classList.toggle('com-conceitos', this._conceitosAbertos() || this._conceitosMem === true);
  },

  sincronizar() {
    const fase = this.faseDe(VC._passoAtivo || 'setup');
    if (fase && VC.layoutV2) VC.layoutV2.janelaAtiva = fase.id;   // a URL guarda a fase (12-url-sync)
    this.desenharFases(); this.desenharVistas(); this.desenharRodape(); this._aplicarConceitos(); this.atualizarSelo();
  },
  /* selo do topo: o mesmo número de avisos que a Entrega mostra; clicar leva ao estado do projeto */
  atualizarSelo() {
    const bar = document.getElementById('vc-status-bar');
    if (!bar || !VC.calculo) return;
    let x; try { x = VC.calculo.calcularTudo(); } catch (e) { return; }
    this._desenharSelo(x);
  },
  _desenharSelo(x) {
    const bar = document.getElementById('vc-status-bar');
    if (!bar) return;
    const n = (x && x.findings) ? x.findings.length : 0;
    const erros = n ? x.findings.filter(f => f.severidade === 'ERRO').length : 0;
    const est = erros ? 'erro' : (n ? 'atencao' : 'ok');
    const txt = erros ? erros + ' erro' + (erros > 1 ? 's' : '') : (n ? n + ' aviso' + (n > 1 ? 's' : '') : 'Sem avisos');
    bar.className = 'selo-estado selo-' + est;
    bar.setAttribute('role', 'button'); bar.setAttribute('tabindex', '0');
    bar.setAttribute('title', 'Ver o estado do projeto na Entrega');
    bar.onclick = () => VC.nav.irPasso('relatorios');
    bar.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); VC.nav.irPasso('relatorios'); } };
    bar.innerHTML = '<span class="selo-ponto" aria-hidden="true"></span>' + txt;
  },

  instalar() {
    if (this._instalado) return; this._instalado = true;
    /* As "janelas" passam a ser as fases: a URL (?janela=N&passo=…) continua válida. */
    if (VC.layoutV2) {
      VC.layoutV2.JANELAS = this.fases().map((f, i) => ({ id: f.id, num: i + 1, nome: f.nome, passos: f.passos.slice() }));
      VC.layoutV2._aplicarFiltroSidebar = function () { /* v11.3: o menu mostra sempre todos os passos */ };
      VC.layoutV2.setJanelaAtiva = function (num) { const j = this.JANELAS.find(x => x.num === Number(num)); if (j) this.janelaAtiva = j.id; };
    }
    VC.modos._setJanela = function (num) {
      const j = VC.layoutV2 && VC.layoutV2.JANELAS.find(x => x.num === Number(num));
      if (!j) return;
      VC.layoutV2.janelaAtiva = j.id;
      if (j.passos.indexOf(VC._passoAtivo) < 0) VC.nav.irPasso(j.passos[0]); else VC.nav.sincronizar();
    };
    /* abrir um passo repõe a vista normal e redesenha a navegação */
    const render = VC.passos.render;
    VC.passos.render = function (passo) {
      /* o mesmo passo redesenhado (depois de uma edição) mantém a vista em que o utilizador estava */
      const mesmo = passo === VC._passoAtivo, antes = VC.nav.vistaAtiva;
      const r = render.apply(this, arguments);
      VC.nav.vistaAtiva = 'passo';
      const v = mesmo && antes !== 'passo' && VC._modoAtivo === 'condutas' ? VC.nav.vistasDe(passo).find(x => x.id === antes && !x.modo) : null;
      if (v) { try { VC.nav.setVista(v.id); return r; } catch (e) { VC.debug.erro(e); } }
      try { VC.nav.sincronizar(); } catch (e) { VC.debug.erro(e); }
      return r;
    };
    /* um ecrã gráfico aberto por outro caminho (botão "Voltar", atalho) mantém os separadores certos */
    const set = VC.modos.set;
    VC.modos.set = function (nome) {
      const r = set.apply(this, arguments);
      try {
        if (nome === 'condutas') { const v = VC.nav.vistasDe(VC._passoAtivo).find(x => x.id === VC.nav.vistaAtiva); if (!v || v.modo) VC.nav.vistaAtiva = 'passo'; }
        else { const v = VC.nav.vistasDe(VC._passoAtivo).find(x => x.modo === nome); VC.nav.vistaAtiva = v ? v.id : nome; }
        VC.nav.desenharVistas();
      } catch (e) { VC.debug.erro(e); }
      return r;
    };
    /* os ecrãs gráficos tinham um botão "Voltar"; agora diz para onde volta */
    document.querySelectorAll('.modo-painel button[onclick*="VC.modos.set(\'condutas\')"]').forEach(b => { b.innerHTML = '<i class="fa-solid fa-table"></i> Voltar à tabela'; });
    /* o selo antigo era reescrito aqui em inglês ("findings"); agora usa o mesmo desenho */
    if (VC.eventos && VC.eventos.on) VC.eventos.on('calculo:fim', x => { setTimeout(() => { try { VC.nav._desenharSelo(x); } catch (e) { VC.debug.erro(e); } }, 0); });
    this.sincronizar();
  }
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => VC.nav.instalar());
else VC.nav.instalar();
})();
