/* ============================================================
   VENTICONDUTAS · 11-construtor-visual
   Vista visual (arvore + drag & drop + filtros padrao V11)
   ============================================================ */
(function () {
'use strict';
const VC = window.VC;
if (!VC) return;
VC._boot = VC._boot || { partes: [] };
VC._boot.partes.push('11-construtor-visual');

const TIPOS_RAMAL_UI = [
  { id: 'insuflacao',    label: 'Insuflacao',    cor: '#2563eb' },
  { id: 'extracao',      label: 'Extracao',      cor: '#16a34a' },
  { id: 'extracao_suja', label: 'Extracao suja', cor: '#a855f7' },
  { id: 'retorno',       label: 'Retorno',       cor: '#ca8a04' },
  { id: 'exaustao_fumo', label: 'Desenfumagem',  cor: '#dc2626' }
];

const _corPorRede = (rede) => {
  const t = TIPOS_RAMAL_UI.find(x => x.id === rede);
  return t ? t.cor : '#64748b';
};

const _collator = new Intl.Collator('pt-PT', { numeric: true, sensitivity: 'base' });

VC.construtorVisual = {
  _expandidos: {},
  _selecionados: new Set(),
  _filtroVista: 'todos',
  _filtroValor: '',
  _filtroTexto: '',
  _ordenacao: 'nome',
  _direcao: 'asc',

  _slotsNecessarios(esp) {
    const g = esp.g || 1;
    if (g === 2) return [];
    if (g === 4) return ['extracao'];
    return ['insuflacao', 'extracao'];
  },
  _slotRefAtual(esp, rede) {
    return (rede === 'insuflacao' ? esp.ramalRefInsuflacao : esp.ramalRefExtracao) || '';
  },
  _todosOsSlots() {
    const out = [];
    (VC.dados.espacos || []).forEach(esp => {
      this._slotsNecessarios(esp).forEach(rede => {
        out.push({ espacoId: esp.id, rede, espaco: esp, ramalAtual: this._slotRefAtual(esp, rede) });
      });
    });
    return out;
  },
  _slotsOrfaos() { return this._todosOsSlots().filter(s => !s.ramalAtual); },
  _slotsConectados() { return this._todosOsSlots().filter(s => !!s.ramalAtual); },
  _slotsAtribuidosAramal(ramalNome) {
    const out = [];
    (VC.dados.espacos || []).forEach(esp => {
      if (esp.ramalRefInsuflacao === ramalNome) out.push({ espacoId: esp.id, rede: 'insuflacao', espaco: esp });
      if (esp.ramalRefExtracao === ramalNome) out.push({ espacoId: esp.id, rede: 'extracao', espaco: esp });
    });
    return out;
  },
  _valoresDisponiveis(vista) {
    const espacos = VC.dados.espacos || [];
    if (vista === 'grupo') { const gs = new Set(); espacos.forEach(e => gs.add(String(e.g || 1))); return Array.from(gs).sort().map(g => ({ v: g, l: 'G' + g })); }
    if (vista === 'localizacao') { const pisos = new Set(); espacos.forEach(e => { const p = (e.localizacao && e.localizacao.piso) || ''; if (p) pisos.add(p); }); return Array.from(pisos).sort().map(p => ({ v: p, l: p })); }
    if (vista === 'tipo') { const ts = new Set(); espacos.forEach(e => { if (e.tipo) ts.add(e.tipo); }); return Array.from(ts).sort().map(t => ({ v: t, l: t })); }
    if (vista === 'estado') return [{ v: 'conectados', l: 'Conectados' }, { v: 'nao_conectados', l: 'Nao conectados' }];
    return [];
  },
  _aplicarFiltros(slots) {
    let lista = slots.slice();
    if (this._filtroVista !== 'todos' && this._filtroValor) {
      if (this._filtroVista === 'grupo') lista = lista.filter(s => String(s.espaco.g || 1) === String(this._filtroValor));
      else if (this._filtroVista === 'localizacao') lista = lista.filter(s => ((s.espaco.localizacao || {}).piso || '') === this._filtroValor);
      else if (this._filtroVista === 'tipo') lista = lista.filter(s => (s.espaco.tipo || '') === this._filtroValor);
      else if (this._filtroVista === 'estado') {
        if (this._filtroValor === 'conectados') lista = lista.filter(s => !!s.ramalAtual);
        else if (this._filtroValor === 'nao_conectados') lista = lista.filter(s => !s.ramalAtual);
      }
    }
    const txt = (this._filtroTexto || '').trim().toLowerCase();
    if (txt) lista = lista.filter(s => (s.espaco.nome || '').toLowerCase().indexOf(txt) >= 0);
    const dir = this._direcao === 'asc' ? 1 : -1;
    const campo = this._ordenacao;
    lista.sort((a, b) => {
      if (campo === 'Q') { const qa = Number(a.espaco.Q_total || a.espaco.Q_normas || 0); const qb = Number(b.espaco.Q_total || b.espaco.Q_normas || 0); return (qa - qb) * dir; }
      if (campo === 'tipo') return _collator.compare(a.espaco.tipo || '', b.espaco.tipo || '') * dir;
      return _collator.compare(a.espaco.nome || '', b.espaco.nome || '') * dir;
    });
    return lista;
  },
  setVista(v) { this._filtroVista = v || 'todos'; this._filtroValor = ''; this.render(); },
  setValorVista(v) { this._filtroValor = v || ''; this.render(); },
  setFiltroTexto(v) { this._filtroTexto = String(v || ''); this.render(); },
  setOrdenacao(v) { if (this._ordenacao === v) this._direcao = this._direcao === 'asc' ? 'desc' : 'asc'; else { this._ordenacao = v; this._direcao = 'asc'; } this.render(); },
  setFiltroEstado(v) { this._filtroVista = 'estado'; this._filtroValor = v || ''; this.render(); },

  _flatParaArvore() {
    const ramais = VC.dados.ramais || [];
    const byParente = {};
    ramais.forEach(r => { const p = r.parente || ''; if (!byParente[p]) byParente[p] = []; byParente[p].push(r); });
    const construir = (parente) => (byParente[parente] || []).slice().sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt', { numeric: true })).map(r => ({ ...r, filhos: construir(r.nome) }));
    return construir('');
  },

  render() {
    const todosSlots = this._todosOsSlots();
    const nConectados = todosSlots.filter(s => !!s.ramalAtual).length;
    const nOrfaos = todosSlots.length - nConectados;
    const pct = todosSlots.length > 0 ? Math.round(100 * nConectados / todosSlots.length) : 0;

    let h = '';
    h += '<div class="cv-header">';
    h += '<button class="btn btn-mini" onclick="VC.associacao.setVista(\'tabela\')"><i class="fa-solid fa-table"></i> Vista tabela</button>';
    h += '<span class="cv-info"><b>' + nConectados + '/' + todosSlots.length + '</b> slots atribuidos (' + pct + '%)</span>';
    h += '<span style="flex:1"></span>';
    h += '<button class="btn btn-mini" onclick="VC.construtorVisual.limparSelecao()">Limpar selecao</button>';
    h += '<button class="btn btn-mini primario" onclick="VC.construtorVisual.criarRamalPrincipal()"><i class="fa-solid fa-plus"></i> Ramal principal</button>';
    h += '</div>';
    h += this._renderFiltros();
    h += '<div class="cv-layout">';
    h += this._renderPainelEsquerdo(nConectados, nOrfaos);
    h += this._renderPainelArvore();
    h += '</div>';
    return h;
  },

  _renderFiltros() {
    const valores = this._valoresDisponiveis(this._filtroVista);
    const opcoesVista = [['todos','Todos'],['grupo','Grupo'],['localizacao','Localizacao'],['tipo','Tipo'],['estado','Estado']];
    let h = '<div class="cv-filtros">';
    h += '<span class="cv-filtros-lbl">Filtros:</span>';
    h += '<input type="text" placeholder="Pesquisar espaco..." value="' + VC.utils.esc(this._filtroTexto) + '" oninput="VC.construtorVisual.setFiltroTexto(this.value)" class="cv-input-pesquisa">';
    h += '<select onchange="VC.construtorVisual.setVista(this.value)" class="cv-select">';
    opcoesVista.forEach(o => { h += '<option value="' + o[0] + '"' + (this._filtroVista === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; });
    h += '</select>';
    if (valores.length > 0) {
      h += '<select onchange="VC.construtorVisual.setValorVista(this.value)" class="cv-select">';
      h += '<option value="">- todos -</option>';
      valores.forEach(o => { h += '<option value="' + VC.utils.esc(o.v) + '"' + (this._filtroValor === o.v ? ' selected' : '') + '>' + VC.utils.esc(o.l) + '</option>'; });
      h += '</select>';
    }
    h += '<span class="cv-filtros-lbl" style="margin-left:6px">Ordenar:</span>';
    h += '<select onchange="VC.construtorVisual.setOrdenacao(this.value)" class="cv-select">';
    [['nome','Nome'],['Q','Caudal'],['tipo','Tipo']].forEach(o => { h += '<option value="' + o[0] + '"' + (this._ordenacao === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; });
    h += '</select>';
    h += '<button class="cv-btn-ordem" onclick="VC.construtorVisual.setOrdenacao(VC.construtorVisual._ordenacao)" title="Inverter">' + (this._direcao === 'asc' ? '&#9650;' : '&#9660;') + '</button>';
    h += '</div>';
    return h;
  },

  _renderPainelEsquerdo(nConectados, nOrfaos) {
    let h = '<div class="cv-painel cv-painel-esq">';
    h += '<div class="cv-bloco cv-bloco-conectados">';
    h += '<div class="cv-bloco-cab"><span class="cv-bloco-titulo"><i class="fa-solid fa-link"></i> Conectados a ramais</span>';
    h += '<span class="cv-badge-contagem cv-badge-verde">' + nConectados + ' slot' + (nConectados === 1 ? '' : 's') + '</span></div>';
    h += '<div class="cv-dropzone-orfaos" ondragover="VC.construtorVisual._onDragOver(event)" ondragleave="VC.construtorVisual._onDragLeave(event)" ondrop="VC.construtorVisual._onDropOnOrfaos(event)"><i class="fa-solid fa-arrow-down"></i> Largar aqui para desassociar</div>';
    h += this._renderListaSlots(this._aplicarFiltros(this._slotsConectados()), 'conectados');
    h += '</div>';
    h += '<div class="cv-bloco cv-bloco-orfaos">';
    h += '<div class="cv-bloco-cab"><span class="cv-bloco-titulo"><i class="fa-solid fa-link-slash"></i> Nao conectados a ramais</span>';
    h += '<span class="cv-badge-contagem cv-badge-ambar">' + nOrfaos + ' slot' + (nOrfaos === 1 ? '' : 's') + '</span></div>';
    h += '<div class="cv-barra-lote"><label><input type="checkbox" onchange="VC.construtorVisual.toggleTodos(this.checked)"> Selecionar todos os orfaos</label><span>' + this._selecionados.size + ' sel.</span></div>';
    h += this._renderListaSlots(this._aplicarFiltros(this._slotsOrfaos()), 'orfaos');
    h += '</div>';
    h += '</div>';
    return h;
  },

  _renderListaSlots(slots, contexto) {
    if (slots.length === 0) {
      const msg = contexto === 'conectados' ? 'Nenhum slot conectado corresponde aos filtros.' : 'Nenhum slot nao conectado corresponde aos filtros.';
      return '<div class="cv-lista-vazia">' + msg + '</div>';
    }
    const porEspaco = {};
    slots.forEach(s => { if (!porEspaco[s.espacoId]) porEspaco[s.espacoId] = { espaco: s.espaco, slots: [] }; porEspaco[s.espacoId].slots.push(s); });
    let h = '<div class="cv-lista">';
    Object.keys(porEspaco).forEach(k => {
      const g = porEspaco[k];
      h += '<div class="cv-linha-espaco"><div class="cv-linha-cab">';
      h += '<span class="cv-espaco-nome">' + VC.utils.esc(g.espaco.nome) + '</span>';
      h += '<span class="cv-espaco-meta">G' + (g.espaco.g || '?') + ' . Q=' + VC.utils.fmt(g.espaco.Q_total || g.espaco.Q_normas || 0, 0) + '</span>';
      h += '</div><div class="cv-slots">';
      g.slots.forEach(s => {
        const sel = this._selecionados.has(s.espacoId + '::' + s.rede);
        const cor = _corPorRede(s.rede);
        const redeLabel = s.rede === 'insuflacao' ? 'IN' : 'EXT';
        const tooltip = s.ramalAtual ? 'Conectado a ' + s.ramalAtual + ' - arrasta para mover' : 'Arrasta para um ramal';
        h += '<div class="cv-slot' + (sel ? ' cv-slot-selecionado' : '') + (s.ramalAtual ? ' cv-slot-conectado' : '') + '" draggable="true" title="' + VC.utils.esc(tooltip) + '" data-espaco="' + s.espacoId + '" data-rede="' + s.rede + '" ondragstart="VC.construtorVisual._onDragStartSlot(event, ' + s.espacoId + ', \'' + s.rede + '\')" ondragend="VC.construtorVisual._onDragEnd(event)" style="border-color:' + cor + '">';
        h += '<input type="checkbox" ' + (sel ? 'checked' : '') + ' onclick="event.stopPropagation(); VC.construtorVisual.toggleSelecao(' + s.espacoId + ', \'' + s.rede + '\')">';
        h += '<span class="cv-slot-badge" style="background:' + cor + '">' + redeLabel + '</span>';
        h += '<span class="cv-slot-nome">' + VC.utils.esc(g.espaco.nome) + '</span>';
        h += '<span class="cv-slot-q">' + VC.utils.fmt(g.espaco.Q_total || g.espaco.Q_normas || 0, 0) + '</span>';
        if (s.ramalAtual) h += '<span class="cv-slot-ramal" title="Ramal atual">&#8594; ' + VC.utils.esc(s.ramalAtual) + '</span>';
        h += '</div>';
      });
      h += '</div></div>';
    });
    h += '</div>';
    return h;
  },

  _renderPainelArvore() {
    const arvore = this._flatParaArvore();
    let h = '<div class="cv-painel cv-painel-dir"><div class="cv-painel-cab"><span>Arvore de ramais</span></div>';
    if (arvore.length === 0) {
      h += '<div class="cv-vazio"><i class="fa-solid fa-sitemap" style="color:var(--primario,#2563eb);font-size:32px;margin-bottom:10px"></i><div>Sem ramais. Cria um Ramal Principal para comecar.</div></div>';
    } else {
      h += '<div class="cv-arvore">';
      arvore.forEach(ramal => { h += this._renderNoArvore(ramal, 0); });
      h += '</div>';
    }
    h += '</div>';
    return h;
  },

  _renderNoArvore(ramal, nivel) {
    const cor = _corPorRede(ramal.rede);
    const Q = Number(ramal.Q) || 0;
    const temFilhos = (ramal.filhos || []).length > 0;
    const expandido = this._expandidos[ramal.nome] !== false;
    const slots = this._slotsAtribuidosAramal(ramal.nome);
    let h = '<div class="cv-no' + (nivel === 0 ? ' cv-no-raiz' : '') + '" data-ramal="' + VC.utils.esc(ramal.nome) + '" style="margin-left:' + (nivel * 16) + 'px;border-left-color:' + cor + '" ondragover="VC.construtorVisual._onDragOver(event)" ondragleave="VC.construtorVisual._onDragLeave(event)" ondrop="VC.construtorVisual._onDropOnRamal(event, \'' + VC.utils.esc(ramal.nome) + '\')" draggable="true" ondragstart="VC.construtorVisual._onDragStartRamal(event, \'' + VC.utils.esc(ramal.nome) + '\')" ondragend="VC.construtorVisual._onDragEnd(event)">';
    h += '<div class="cv-no-cab">';
    if (temFilhos) h += '<span class="cv-toggle" onclick="VC.construtorVisual.toggleExpandir(\'' + VC.utils.esc(ramal.nome) + '\')">' + (expandido ? '&#9660;' : '&#9654;') + '</span>';
    else h += '<span class="cv-toggle" style="opacity:.3">.</span>';
    h += '<i class="fa-solid fa-code-branch" style="color:' + cor + '"></i> ';
    h += '<b style="color:' + cor + '">' + VC.utils.esc(ramal.nome) + '</b>';
    h += ' <select class="cv-select-tipo" onclick="event.stopPropagation()" onchange="VC.construtorVisual.alterarTipo(\'' + VC.utils.esc(ramal.nome) + '\', this.value)" style="border-color:' + cor + '">';
    TIPOS_RAMAL_UI.forEach(t => { h += '<option value="' + t.id + '"' + (t.id === ramal.rede ? ' selected' : '') + '>' + t.label + '</option>'; });
    h += '</select>';
    h += ' <span class="cv-badge-q">Q=' + VC.utils.fmt(Q, 0) + '</span>';
    h += ' <span class="cv-badge-contagem cv-badge-slots">' + slots.length + ' slot' + (slots.length === 1 ? '' : 's') + '</span>';
    h += ' <button class="cv-btn-mini" onclick="event.stopPropagation(); VC.construtorVisual.criarSubRamal(\'' + VC.utils.esc(ramal.nome) + '\')" title="Adicionar sub-ramal">+</button>';
    h += '</div>';
    if (slots.length > 0) {
      h += '<div class="cv-chips">';
      slots.forEach(s => {
        const sc = _corPorRede(s.rede);
        h += '<div class="cv-chip" style="border-color:' + sc + '">';
        h += '<span class="cv-chip-badge" style="background:' + sc + '">' + (s.rede === 'insuflacao' ? 'IN' : 'EXT') + '</span>';
        h += '<span class="cv-chip-nome">' + VC.utils.esc(s.espaco.nome) + '</span>';
        h += '<span class="cv-chip-remover" onclick="VC.construtorVisual.desatribuirSlot(' + s.espacoId + ', \'' + s.rede + '\')" title="Remover">&times;</span>';
        h += '</div>';
      });
      h += '</div>';
    }
    if (temFilhos && expandido) {
      h += '<div class="cv-filhos">';
      ramal.filhos.forEach(f => { h += this._renderNoArvore(f, nivel + 1); });
      h += '</div>';
    }
    h += '</div>';
    return h;
  },

  atribuirSlot(espacoId, rede, ramalNome) {
    const e = (VC.dados.espacos || []).find(x => String(x.id) === String(espacoId));
    if (!e) return;
    if (VC.snap && VC.snap.capturar) { try { VC.snap.capturar('Associar ' + e.nome + ' (' + rede + ') -> ' + ramalNome); } catch (err) { VC.debug && VC.debug.erro && VC.debug.erro(err); } }
    const res = VC.associacoes.associarEspaco(e, rede, ramalNome);
    if (!res.ok) { VC.ui.toast(res.erro); return; }
    VC.estado.forcarSync();
    this.render();
    VC.ui.toast(e.nome + ' (' + rede + ') -> ' + ramalNome);
  },
  desatribuirSlot(espacoId, rede) {
    const e = (VC.dados.espacos || []).find(x => String(x.id) === String(espacoId));
    if (!e) return;
    if (VC.snap && VC.snap.capturar) { try { VC.snap.capturar('Remover ' + e.nome + ' (' + rede + ')'); } catch (err) { VC.debug && VC.debug.erro && VC.debug.erro(err); } }
    if (rede === 'insuflacao') e.ramalRefInsuflacao = ''; else e.ramalRefExtracao = '';
    (VC.dados.terminais || []).forEach(t => {
      const serve = (t.espacos || []).some(x => x.nome === e.nome);
      if (!serve) return;
      const ehIns = (t.rede || 'insuflacao') === 'insuflacao';
      if ((ehIns && rede === 'insuflacao') || (!ehIns && rede !== 'insuflacao')) t.ramalRef = '';
    });
    VC.estado.forcarSync();
    this.render();
    VC.ui.toast(e.nome + ' desassociado de ' + rede);
  },
  moverRamal(ramalNome, novoPai) {
    if (!VC.topologia || !VC.topologia.mover || !VC.topologia.mover.ramal) { VC.ui.toast('Modulo de topologia indisponivel.'); return; }
    if (VC.snap && VC.snap.capturar) { try { VC.snap.capturar('Mover ' + ramalNome + ' -> ' + novoPai); } catch (err) { VC.debug && VC.debug.erro && VC.debug.erro(err); } }
    const r = VC.topologia.mover.ramal(ramalNome, novoPai);
    if (!r.ok) { VC.ui.toast('Nao foi possivel mover: ' + (r.erro || 'erro')); return; }
    VC.estado.forcarSync();
    this.render();
    VC.ui.toast(ramalNome + ' -> ' + novoPai);
  },
  criarRamalPrincipal() {
    const raizes = (VC.dados.ramais || []).filter(r => !r.parente);
    const nomeBase = 'R1.' + (raizes.length + 1);
    let nome = nomeBase, guard = 0;
    while ((VC.dados.ramais || []).some(r => r.nome === nome) && guard++ < 50) nome = nomeBase + '_' + (guard + 1);
    if (VC.snap && VC.snap.capturar) { try { VC.snap.capturar('Novo ramal ' + nome); } catch (err) { VC.debug && VC.debug.erro && VC.debug.erro(err); } }
    const opts = {
      nome, parente: '', nivelNumero: 1, rede: 'insuflacao',
      utaRef: null, L: 25, zeta: 0.8,
      localizacao: { piso: 'P0', ala: null, cota: null }
    };
    if (VC.topologia && VC.topologia._criarRamal) {
      VC.topologia._criarRamal(opts);
    } else {
      const id = (VC.dados.nextId && VC.dados.nextId.ramal) || 1;
      if (VC.dados.nextId) VC.dados.nextId.ramal = id + 1;
      VC.dados.ramais.push(Object.assign({
        id, tipo: 'Principal', nivel: 'primario',
        geometriaInput: { material: 'Aço galvanizado', forma: 'circular' },
        lock: { D: false }
      }, opts));
    }
    VC.estado.forcarSync();
    this.render();
    VC.ui.toast('Ramal ' + nome + ' criado.');
  },
  criarSubRamal(paiNome) {
    const pai = (VC.dados.ramais || []).find(r => r.nome === paiNome);
    if (!pai) return;
    const nivelPai = pai.nivelNumero || 1;
    if (nivelPai >= 4) { VC.ui.toast('Nivel maximo (R4) atingido.'); return; }
    const irmaos = (VC.dados.ramais || []).filter(r => r.parente === paiNome);
    const nomeBase = paiNome + '.' + (irmaos.length + 1);
    let nome = nomeBase, guard = 0;
    while ((VC.dados.ramais || []).some(r => r.nome === nome) && guard++ < 50) nome = nomeBase + '_' + (guard + 1);
    if (VC.snap && VC.snap.capturar) { try { VC.snap.capturar('Novo sub-ramal ' + nome); } catch (err) { VC.debug && VC.debug.erro && VC.debug.erro(err); } }
    const opts = {
      nome, parente: paiNome, nivelNumero: nivelPai + 1,
      rede: pai.rede || 'insuflacao', utaRef: pai.utaRef || null,
      L: 10, zeta: 0.5,
      localizacao: pai.localizacao || { piso: 'P0', ala: null, cota: null }
    };
    if (VC.topologia && VC.topologia._criarRamal) {
      VC.topologia._criarRamal(opts);
    } else {
      const id = (VC.dados.nextId && VC.dados.nextId.ramal) || 1;
      if (VC.dados.nextId) VC.dados.nextId.ramal = id + 1;
      VC.dados.ramais.push(Object.assign({
        id, tipo: 'Sub-ramal',
        nivel: ['primario', 'secundario', 'terciario', 'quaternario'][nivelPai] || 'secundario',
        geometriaInput: { material: 'Aço galvanizado', forma: 'circular' },
        lock: { D: false }
      }, opts));
    }
    VC.estado.forcarSync();
    this.render();
    VC.ui.toast('Sub-ramal ' + nome + ' criado.');
  },
  alterarTipo(ramalNome, novoTipo) {
    const r = (VC.dados.ramais || []).find(x => x.nome === ramalNome);
    if (!r || r.rede === novoTipo) return;
    if (VC.snap && VC.snap.capturar) { try { VC.snap.capturar('Alterar tipo ' + ramalNome + ' -> ' + novoTipo); } catch (err) { VC.debug && VC.debug.erro && VC.debug.erro(err); } }
    r.rede = novoTipo;
    const sync = (nome) => { (VC.dados.ramais || []).forEach(x => { if (x.parente === nome) { x.rede = novoTipo; sync(x.nome); } }); };
    sync(ramalNome);
    VC.estado.forcarSync();
    this.render();
    VC.ui.toast(ramalNome + ' -> ' + novoTipo);
  },
  toggleSelecao(espacoId, rede) {
    const k = espacoId + '::' + rede;
    if (this._selecionados.has(k)) this._selecionados.delete(k); else this._selecionados.add(k);
    this.render();
  },
  toggleTodos(ligado) {
    this._selecionados.clear();
    if (ligado) this._aplicarFiltros(this._slotsOrfaos()).forEach(s => this._selecionados.add(s.espacoId + '::' + s.rede));
    this.render();
  },
  limparSelecao() { this._selecionados.clear(); this.render(); },
  toggleExpandir(nome) { this._expandidos[nome] = this._expandidos[nome] === false ? true : false; this.render(); },
  _onDragStartSlot(e, espacoId, rede) {
    if (this._selecionados.size > 0 && this._selecionados.has(espacoId + '::' + rede)) {
      this._arrastando = { tipo: 'slots', itens: Array.from(this._selecionados).map(k => { const parts = k.split('::'); return { espacoId: Number(parts[0]), rede: parts[1] }; }) };
    } else {
      this._arrastando = { tipo: 'slots', itens: [{ espacoId, rede }] };
    }
    try { e.dataTransfer.setData('application/vc-slot', JSON.stringify(this._arrastando)); e.dataTransfer.effectAllowed = 'move'; } catch (err) { /* dataTransfer indisponível neste navegador */ }
    e.currentTarget.style.opacity = '0.4';
  },
  _onDragStartRamal(e, nome) {
    this._arrastando = { tipo: 'ramal', nome };
    try { e.dataTransfer.setData('application/vc-ramal', JSON.stringify({ nome })); e.dataTransfer.effectAllowed = 'move'; } catch (err) { /* dataTransfer indisponível neste navegador */ }
    e.currentTarget.style.opacity = '0.4';
  },
  _onDragOver(e) { if (!this._arrastando) return; e.preventDefault(); try { e.dataTransfer.dropEffect = 'move'; } catch (err) { /* dataTransfer indisponível neste navegador */ } e.currentTarget.classList.add('cv-drag-over'); },
  _onDragLeave(e) { e.currentTarget.classList.remove('cv-drag-over'); },
  _onDropOnRamal(e, ramalNome) {
    e.preventDefault(); e.stopPropagation();
    e.currentTarget.classList.remove('cv-drag-over');
    const arr = this._arrastando; this._arrastando = null;
    if (!arr) return;
    if (arr.tipo === 'ramal') { if (arr.nome === ramalNome) return; this.moverRamal(arr.nome, ramalNome); return; }
    if (arr.tipo === 'slots') {
      const ramal = (VC.dados.ramais || []).find(r => r.nome === ramalNome);
      if (!ramal) return;
      let atribuidos = 0, rejeitados = 0;
      arr.itens.forEach(slot => {
        const esp = (VC.dados.espacos || []).find(x => String(x.id) === String(slot.espacoId));
        if (esp && VC.associacoes.associarEspaco(esp, slot.rede, ramalNome).ok) atribuidos++;
        else rejeitados++;
      });
      if (atribuidos > 0) {
        if (VC.snap && VC.snap.capturar) { try { VC.snap.capturar(atribuidos + ' slot(s) -> ' + ramalNome); } catch (err) { VC.debug && VC.debug.erro && VC.debug.erro(err); } }
        this._selecionados.clear();
        VC.estado.forcarSync();
        this.render();
        let msg = atribuidos + ' slot(s) -> ' + ramalNome;
        if (rejeitados > 0) msg += ' . ' + rejeitados + ' rejeitado(s) (rede incompativel)';
        VC.ui.toast(msg);
      } else if (rejeitados > 0) {
        VC.ui.toast('Rede incompativel: slot nao pode entrar em ' + ramalNome + ' (' + ramal.rede + ')');
      }
    }
  },
  _onDropOnOrfaos(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('cv-drag-over');
    const arr = this._arrastando; this._arrastando = null;
    if (!arr || arr.tipo !== 'slots') return;
    let removidos = 0;
    arr.itens.forEach(slot => {
      const esp = (VC.dados.espacos || []).find(x => String(x.id) === String(slot.espacoId));
      if (!esp) return;
      if (slot.rede === 'insuflacao') esp.ramalRefInsuflacao = ''; else esp.ramalRefExtracao = '';
      (VC.dados.terminais || []).forEach(t => {
        const serve = (t.espacos || []).some(x => x.nome === esp.nome);
        if (!serve) return;
        const ehIns = (t.rede || 'insuflacao') === 'insuflacao';
        if ((ehIns && slot.rede === 'insuflacao') || (!ehIns && slot.rede !== 'insuflacao')) t.ramalRef = '';
      });
      removidos++;
    });
    if (removidos > 0) {
      if (VC.snap && VC.snap.capturar) { try { VC.snap.capturar(removidos + ' slot(s) desassociados'); } catch (err) { VC.debug && VC.debug.erro && VC.debug.erro(err); } }
      this._selecionados.clear();
      VC.estado.forcarSync();
      this.render();
      VC.ui.toast(removidos + ' slot(s) desassociados.');
    }
  },
  _onDragEnd(e) {
    e.currentTarget.style.opacity = '';
    document.querySelectorAll('.cv-drag-over').forEach(el => el.classList.remove('cv-drag-over'));
  }
};
console.log('%c[VentiCondutas] 11-construtor-visual carregado',
  'color:#6d8fb0;font-weight:bold;background:#eaf1f7;padding:3px 6px;border-radius:3px');

/* v11.1 (4.3): vista árvore por omissão na Associação.
   Vinha de 11-construtor-visual-loader.js (apagado), carregado logo a seguir a este ficheiro. */
if (VC.associacao) {
  VC.associacao._vista = 'arvore';

  const _origRender = VC.associacao.renderVisaoGeral;

  VC.associacao.setVista = function (v) {
    this._vista = v || 'arvore';
    if (VC.passos && typeof VC.passos.render === 'function') {
      VC.passos.render('associacao');
    }
  };

  VC.associacao.renderVisaoGeral = function () {
    if (this._vista === 'arvore' && VC.construtorVisual && typeof VC.construtorVisual.render === 'function') {
      return VC.construtorVisual.render();
    }
    if (typeof _origRender !== 'function') return '';
    var html = _origRender.call(this);
    var header = '<div style="display:flex;gap:6px;align-items:center;padding:10px 12px;background:var(--superf2,#f8fafc);border:1px solid var(--borda,#e2e8f0);border-radius:6px;margin-bottom:10px">'
      + '<button class="btn btn-mini primario" onclick="VC.associacao.setVista(\'arvore\')"><i class="fa-solid fa-sitemap"></i> Vista árvore (construtor visual)</button>'
      + '<span style="flex:1"></span>'
      + '<span style="font-size:11px;color:var(--texto-med,#475569)">Vista tabela (original)</span>'
      + '</div>';
    return header + html;
  };
}
})();
