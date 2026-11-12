/* ============================================================  
 VENTICONDUTAS · 07-editores  
 ============================================================ */  
(function () {  
'use strict';  
const VC = window.VC;  
window.VC6 = window.VC6 || {};  
const VC6 = window.VC6;  
VC._boot = VC._boot || { partes: [] };  
VC._boot.partes.push('07-editores');  
  
/* ============================================================  
 §20.1 · ESTADO EXPANDIDO  
 ============================================================ */  
VC._espacosUI = VC._espacosUI || {  
 ordenacao: 'nome',  
 direcao: 'asc',  
 selecionados: new Set(),  
 ultimoSelecionado: null,  
 linhaAtiva: null  
};  
  
const _collator = new Intl.Collator('pt-PT', { numeric: true, sensitivity: 'base' });  
  
function _validarNome(nome, idxExcluir) {  
 if (!nome || !String(nome).trim()) return { ok: false, erro: 'Nome vazio' };  
 const nomeTrim = String(nome).trim().toLowerCase();  
 const duplicado = VC.dados.espacos.some((e, i) =>  
 i !== idxExcluir && String(e.nome || '').trim().toLowerCase() === nomeTrim  
 );  
 if (duplicado) return { ok: false, erro: 'Nome duplicado' };  
 return { ok: true };  
}  
  
const _tiposTerminalCompletos = [  
 { nome: 'Difusor', desc: 'Difusor de teto ou parede' },  
 { nome: 'Grelha Insuflação', desc: 'Grelha de insuflacao' },  
 { nome: 'Grelha Extração', desc: 'Grelha de extracao' },  
 { nome: 'Difusor Linear', desc: 'Difusor linear em fenda' },  
 { nome: 'Jato de Ar', desc: 'Jato de ar de longo alcance' },  
 { nome: 'Válvula', desc: 'Valvula de regulacao de caudal' },  
 { nome: 'Boca de Extração', desc: 'Boca de extracao pontual' },  
 { nome: 'Fresta sob Porta', desc: 'Fresta sob porta (transferencia)' },  
 { nome: 'Grelha de Transferência', desc: 'Grelha de transferencia' },  
 { nome: 'Vão de Passagem', desc: 'Vao de passagem entre espacos' },  
 { nome: 'Abertura Natural', desc: 'Abertura natural existente' }  
];  
  
/* ============================================================  
 §20.1 · EDITOR DE ESPAÇOS  
 ============================================================ */  
VC.editorEspacos = {  
 caminhoAtivo: 'tabela',  
 _filtro: '',  
 _manualForm: null,  
  
 render() {  
 const c = this.caminhoAtivo;  
 let h = '<div style="display:flex;gap:2px;padding:3px;background:var(--superf3);border-radius:8px;margin-bottom:12px;width:fit-content">' +  
 '<button class="btn btn-mini ' + (c === 'tabela' ? 'primario' : '') + '" onclick="VC.editorEspacos.setCaminho(\'tabela\')"><i class="fa-solid fa-table"></i> Tabela</button>' +  
 '<button class="btn btn-mini ' + (c === 'manual' ? 'primario' : '') + '" onclick="VC.editorEspacos.setCaminho(\'manual\')"><i class="fa-solid fa-pen"></i> Manual</button>' +  
 '</div>';  
 if (c === 'tabela') h += this.renderTabela();  
 else if (c === 'manual') h += this.renderManual();  
 return h;  
 },  
  
 setCaminho(c) { this.caminhoAtivo = c; VC.passos.render('levantamento'); },  
  
 irParaDefinicao(espIdx) {  
 const e = VC.dados.espacos[espIdx];  
 if (!e) return;  
 VC._espacoAlvo = espIdx;  
 VC._linhaOrigem = espIdx;  
 VC.ui.setPasso('requisitos');  
 },  
  
 renderTabela() {  
 if (!VC.dados.espacos.length) {  
 return '<div class="vazio"><i class="fa-solid fa-inbox"></i><div class="vazio-titulo">Sem espacos</div>' +  
 '<div>Adiciona o primeiro espaco ou carrega o exemplo.</div>' +  
 '<div class="vazio-acoes">' +  
 '<button class="btn primario" onclick="VC.editorEspacos.setCaminho(\'manual\')"><i class="fa-solid fa-pen"></i> Adicionar manualmente</button>' +  
 '<button class="btn verde" onclick="VC.exemplos.carregar(\'polune-v8\')"><i class="fa-solid fa-clipboard-list"></i> Exemplo PoliUne V8</button>' +  
 '<button class="btn violeta" onclick="VC.csv.importar()"><i class="fa-solid fa-file-import"></i> Importar CSV</button>' +  
 '</div></div>';  
 }  
 const dis = VC.dados.congelado ? 'disabled' : '';  
 const ui = VC._espacosUI;  
 const nSel = ui.selecionados.size;  
 let h = '';  
 h += '<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;align-items:center">';  
 h += '<button class="btn primario" onclick="VC.editorEspacos.setCaminho(\'manual\')" ' + dis + '><i class="fa-solid fa-plus"></i> Novo espaco</button>';  
 h += '<button class="btn" onclick="VC.csv.importar()" ' + dis + '><i class="fa-solid fa-file-import"></i> Importar CSV</button>';  
 h += '<button class="btn" onclick="VC.csv.exportar()"><i class="fa-solid fa-file-export"></i> Exportar CSV</button>';  
 if (nSel > 0) {  
 h += '<span style="margin-left:auto;font-size:11px;color:var(--texto-med)">';  
 h += '<b style="color:var(--primario-esc)">' + nSel + ' selecionado(s)</b>';  
 h += '</span>';  
 }  
 h += '</div>';  
 if (nSel > 0) {  
 h += '<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;padding:8px 12px;background:var(--primario-soft);border:1px solid var(--primario-borda);border-radius:6px;flex-wrap:wrap">';  
 h += '<span style="font-size:11.5px;color:var(--primario-esc)"><b>' + nSel + '</b> espaco(s) selecionado(s)</span>';  
 h += '<span style="flex:1"></span>';  
 h += '<button class="btn btn-mini violeta" onclick="VC.operacoesLote.abrirDialogoTipo()" ' + dis + '>Alterar tipo</button>';  
 h += '<button class="btn btn-mini violeta" onclick="VC.operacoesLote.abrirDialogoGrupo()" ' + dis + '>Alterar grupo</button>';  
 h += '<button class="btn btn-mini violeta" onclick="VC.operacoesLote.abrirDialogoRPH()" ' + dis + '>Alterar RPH</button>';  
 h += '<button class="btn btn-mini coral" onclick="VC.editorEspacos.eliminarSelecionados()" ' + dis + '>Eliminar</button>';  
 h += '<button class="btn btn-mini" onclick="VC.editorEspacos.limparSelecao()">Limpar selecao</button>';  
 h += '</div>';  
 }  
 
 const filtroTxt = (this._filtro || '').trim().toLowerCase();  
 let listaFiltro = VC.dados.espacos.slice();  
 if (filtroTxt) {  
 listaFiltro = listaFiltro.filter(e => (e.nome || '').toLowerCase().indexOf(filtroTxt) >= 0 || (e.tipo || '').toLowerCase().indexOf(filtroTxt) >= 0);  
 }  
 let contagem = listaFiltro.length;  

 h += '<details class="tabela-progressiva" open style="margin-top:16px; background:var(--superf); border:1px solid var(--borda); border-radius:8px; padding:4px;">';  
 h += '<summary style="cursor:pointer; font-weight:800; font-size:12px; color:var(--primario-esc); padding:8px; background:var(--superf3); border-radius:6px; list-style:none; display:flex; align-items:center; gap:6px; justify-content:space-between">';  
 h += '<div style="display:flex; align-items:center; gap:6px"><i class="fa-solid fa-table-list"></i> Tabela de Espaços</div>';  
 h += '<div style="font-weight:400; font-size:11px; display:flex; gap:8px; align-items:center">';  
 h += '<input type="text" placeholder="Pesquisar espaço..." value="' + VC.utils.esc(this._filtro || '') + '" oninput="VC.editorEspacos.setFiltro(this.value)" onclick="event.stopPropagation()" style="padding:4px 8px; border:1px solid var(--borda-media); border-radius:4px; width:200px; font-family:inherit; background:#fff">';  
 if (this._filtro) h += '<button class="btn btn-mini ghost" onclick="event.stopPropagation(); VC.editorEspacos.limparFiltro()" style="padding:2px 6px">x</button>';  
 h += '<span>' + contagem + ' itens</span>';  
 h += '</div></summary>';  
 h += '<div style="margin-top:10px"></div>';  
 h += '<div class="tabela-wrap" style="max-height:600px;overflow-y:auto">';  
 h += '<table class="tabela densa" id="tabelaEspacos"><thead><tr>';  
 h += '<th style="width:40px;text-align:center">#</th>';  
 const tt = (k) => ' ' + VC.tabelas.botao(k);
  const colunas = [  
  { id: 'nome', label: 'Nome' },  
  { id: 'tipo', label: 'Tipo' + tt('tipo_espaco') },  
  { id: 'localizacao', label: 'Localização' },  
  { id: 'A', label: 'A (m²)' + tt('area_geometrica'), width: '70px' },  
  { id: 'H', label: 'H (m)' + tt('pe_direito'), width: '60px' },  
  { id: 'V', label: 'V (m³)' + tt('volume_espaco'), width: '75px' },  
  { id: 'N', label: 'N (–)' + tt('ocupacao'), width: '50px' },  
  { id: 'Q', label: 'Q_normas' + tt('Q_normas'), width: '95px' }  
  ];  
 colunas.forEach(col => {  
 const ativa = ui.ordenacao === col.id;  
 const seta = ativa ? (ui.direcao === 'asc' ? ' A' : ' D') : '';  
 const cor = ativa ? 'color:var(--primario-esc)' : '';  
 h += '<th style="' + (col.width ? 'width:' + col.width + ';' : '') + 'cursor:pointer;user-select:none;' + cor + '" onclick="VC.editorEspacos.ordenarPor(\'' + col.id + '\')">' + col.label + seta + '</th>';  
 });  
 h += '<th style="width:70px">RPH' + tt('RPH') + '</th>';  
  h += '<th style="width:85px">Q_ConTerm' + tt('Q_ConTerm') + '</th>';  
  h += '<th style="width:110px">QAI_projeto' + tt('QAI_projeto') + '</th>';  
  h += '<th style="width:85px">Q_total' + tt('Q_total') + '</th>';  
  h += '<th style="width:110px">Terminais</th>';  
 h += '<th style="width:90px;text-align:center">';  
 h += '<input type="checkbox" ' + (nSel > 0 && nSel === VC.dados.espacos.length ? 'checked' : '') + ' onchange="VC.editorEspacos.toggleSelecionarTodos(this.checked)" style="cursor:pointer;width:15px;height:15px;vertical-align:middle;accent-color:var(--primario)"> ';  
 h += '<button class="btn btn-mini coral" onclick="VC.editorEspacos.eliminarSelecionados()" style="padding:1px 5px;vertical-align:middle" ' + (nSel > 0 ? '' : 'disabled') + '>x</button>';  
 h += '</th></tr></thead><tbody>';  
 const filtro = (this._filtro || '').trim().toLowerCase();  
 let lista = VC.dados.espacos.slice();  
 if (filtro) lista = lista.filter(e => (e.nome || '').toLowerCase().indexOf(filtro) >= 0 || (e.tipo || '').toLowerCase().indexOf(filtro) >= 0);  
 lista = this._ordenarListaComCache(lista, ui.ordenacao, ui.direcao);  
 const idxOriginal = new Map();  
 VC.dados.espacos.forEach((e, i) => idxOriginal.set(e, i));  
 lista.forEach((e, ordem) => {  
 const i = idxOriginal.get(e);  
 const c = VC.calculo.calcularQEspaco(e);  
 const loc = e.localizacao || VC.utils.parseZona(e.zona);  
 const locTxt = [loc.piso, loc.ala].filter(Boolean).join(' - ') || (e.zona || '-');  
 const nTerm = VC.dados.terminais.filter(t => t.espacos.some(x => x.nome === e.nome)).length;  
 const sel = ui.selecionados.has(i);  
 const linhaAtiva = (ui.linhaAtiva === i);  
 const rphAplicado = Number(e.rphAplicado) || 0;  
 const rphOrigem = e.rphOrigem || 'norma';  
 const Q_ConTerm = Number(c.Q_ConTerm) || 0;  
 const Q_total = Number(c.Q_total) || 0;  
 const temConf = Q_ConTerm > 0;  
 const badge = temConf ? (rphOrigem === 'utilizador' ? 'U' : 'N') : '';  
 const qaiAplicado = Number(e.QAI_projeto) || 0;  
 const qaiOrigem = e.QAI_projeto_origem || 'norma';  
 const qaiRede = e.QAI_projeto_rede || 'auto';  
 const temQAI = qaiAplicado > 0;  
 const badgeQAI = temQAI ? (qaiOrigem === 'utilizador' ? 'E' : 'N') : '';  
 const modoManualV = e.geometriaMetodo === 'V';  
 const classes = [];  
 if (sel) classes.push('selecionado');  
 if (linhaAtiva) classes.push('linha-ativa');  
 h += '<tr data-idx="' + i + '"' + (classes.length ? ' class="' + classes.join(' ') + '"' : '') + '>';  
 h += '<td style="text-align:center;color:var(--texto-suave);font-family:ui-monospace,monospace;font-size:10.5px;font-weight:700">' + (ordem + 1) + '</td>';  
 h += '<td><input class="celula" data-campo="nome" data-idx="' + i + '" value="' + VC.utils.esc(e.nome) + '" onchange="VC.editorEspacos.editarCampo(' + i + ', \'nome\', this.value); VC.editorEspacos.validarNome(' + i + ', this)" ' + dis + '></td>';  
 h += '<td><button class="btn btn-mini" onclick="VC.popupTipo.abrir(' + i + ', this)" ' + dis + '>' + VC.utils.esc(e.tipo || '-') + ' v</button></td>';  
 h += '<td><input class="celula" data-campo="zona" data-idx="' + i + '" value="' + VC.utils.esc(locTxt) + '" onchange="VC.editorEspacos.editarCampo(' + i + ', \'zona\', this.value)" ' + dis + '></td>';  
 h += '<td><input class="celula" type="number" step="0.01" data-campo="A" data-idx="' + i + '" value="' + VC.utils.fmt(c.A, 2) + '" onchange="VC.editorEspacos.editarCampo(' + i + ', \'A\', this.value)" ' + dis + '></td>';  
 h += '<td><input class="celula" type="number" step="0.01" data-campo="H" data-idx="' + i + '" value="' + VC.utils.fmt(c.H, 2) + '" onchange="VC.editorEspacos.editarCampo(' + i + ', \'H\', this.value)" ' + dis + '></td>';  
 h += '<td style="position:relative"><input class="celula' + (modoManualV ? ' modo-manual-v' : '') + '" type="number" step="0.01" data-campo="V" data-idx="' + i + '" value="' + VC.utils.fmt(c.V, 2) + '" onchange="VC.editorEspacos.editarCampo(' + i + ', \'V\', this.value)" ' + dis + '>' + (modoManualV ? '<span style="position:absolute;top:1px;right:2px;font-size:8px;color:#9e8256;font-weight:900" title="Volume manual">M</span>' : '') + '</td>';  
 h += '<td><input class="celula" type="number" data-campo="N" data-idx="' + i + '" value="' + (c.N || 0) + '" onchange="VC.editorEspacos.editarCampo(' + i + ', \'N\', this.value)" ' + dis + '></td>';  
 h += '<td><span class="valor-derivado">' + VC.utils.fmt(c.Q_normas, 0) + '</span></td>';  
 const rphHTML = '<div style="display:flex;gap:3px;align-items:center">' +  
 '<input class="celula" type="number" step="0.1" min="0" value="' + rphAplicado + '" onchange="VC.editorEspacos.editarRPH(' + i + ', this.value)" ' + dis + ' style="width:50px;padding:2px 4px;border:1px solid var(--borda-media);border-radius:3px;font-size:10.5px;font-family:inherit">' +  
 (badge ? '<span style="font-size:10px;font-weight:800;color:var(--texto-med)">' + badge + '</span>' : '') +  
 (rphOrigem === 'utilizador' ? '<button class="btn btn-mini" onclick="VC.editorEspacos.reporNorma(' + i + ')" ' + dis + ' style="padding:0 3px;font-size:9px">R</button>' : '') +  
 '</div>';  
 h += '<td>' + rphHTML + '</td>';  
 h += '<td><span class="valor-derivado" style="' + (temConf ? 'background:var(--primario-soft);color:var(--primario-esc)' : '') + '">' + VC.utils.fmt(Q_ConTerm, 0) + '</span></td>';  
 let qaiCellHTML = '<div style="display:flex;gap:3px;align-items:center;flex-wrap:nowrap">';  
 qaiCellHTML += '<input class="celula" type="number" step="1" min="0" value="' + qaiAplicado + '" onchange="VC.editorEspacos.editarQAI(' + i + ', this.value)" ' + dis + ' style="width:55px;padding:2px 4px;border:1px solid var(--borda-media);border-radius:3px;font-size:10.5px;font-family:inherit' + (temQAI ? ';background:#faf3e8;font-weight:800;color:#8a6a3a' : '') + '">';  
 if (badgeQAI) qaiCellHTML += '<button class="btn btn-mini" onclick="VC.popupQAI.abrir(' + i + ')" style="padding:0 3px;font-size:10px;border:1px solid ' + (qaiOrigem === 'utilizador' ? '#b88a4a' : '#7fa88b') + ';background:' + (qaiOrigem === 'utilizador' ? '#faf3e8' : '#eef5f0') + '">' + badgeQAI + '</button>';  
 else qaiCellHTML += '<button class="btn btn-mini" onclick="VC.popupQAI.abrir(' + i + ')" style="padding:0 3px;font-size:9px;opacity:.5">+</button>';  
 if (qaiOrigem === 'utilizador') qaiCellHTML += '<button class="btn btn-mini" onclick="VC.editorEspacos.reporNormaQAI(' + i + ')" ' + dis + ' style="padding:0 3px;font-size:9px">R</button>';  
 qaiCellHTML += '</div>';  
 h += '<td>' + qaiCellHTML + '</td>';  
 h += '<td><span class="valor-derivado" style="font-weight:900;color:var(--primario-esc)">' + VC.utils.fmt(Q_total, 0) + '</span></td>';  
 h += '<td style="font-size:10.5px;white-space:nowrap"><b style="color:' + (nTerm > 0 ? 'var(--verde-esc)' : 'var(--texto-suave)') + '">' + nTerm + '</b>';  
 if (nTerm === 0) h += ' <a href="javascript:void(0)" onclick="VC.editorEspacos.irParaDefinicao(' + i + ')" style="font-size:10px;color:var(--primario);text-decoration:underline;font-weight:700">Definir</a>';  
 else h += ' <a href="javascript:void(0)" onclick="VC.editorEspacos.irParaDefinicao(' + i + ')" style="font-size:10px;color:var(--verde-esc);text-decoration:underline;font-weight:700">Editar</a>';  
 h += '</td>';  
 h += '<td style="text-align:center;white-space:nowrap">';  
 h += '<input type="checkbox" ' + (sel ? 'checked' : '') + ' onclick="VC.editorEspacos._clickSelecao(event, ' + i + ')" style="cursor:pointer;width:16px;height:16px;accent-color:var(--primario);vertical-align:middle"> ';  
 h += '<button class="btn btn-mini" onclick="VC.editorEspacos.duplicarLinha(' + i + ')" ' + dis + ' style="padding:2px 5px;vertical-align:middle">D</button>';  
 h += '</td></tr>';  
 });  
 h += '</tbody></table></div></details>';  
 setTimeout(() => this._ligarNavegacao(), 50);  
 return h;  
 },  
  
 _ordenarLista(lista, campo, direcao) {  
 const mult = direcao === 'desc' ? -1 : 1;  
 const arr = lista.slice();  
 arr.sort((a, b) => {  
 if (campo === 'nome') return _collator.compare(String(a.nome || '').trim(), String(b.nome || '').trim()) * mult;  
 if (campo === 'tipo') return _collator.compare(String(a.tipo || '').trim(), String(b.tipo || '').trim()) * mult;  
 if (campo === 'localizacao') {  
 const la = a.localizacao || {}, lb = b.localizacao || {};  
 const sa = String((la.piso || '') + ' ' + (la.ala || '')).trim();  
 const sb = String((lb.piso || '') + ' ' + (lb.ala || '')).trim();  
 return _collator.compare(sa, sb) * mult;  
 }  
 let ca, cb;  
 try { ca = VC.perf.cacheCalculo.get('esp_' + a.id, () => VC.calculo.calcularQEspaco(a)); } catch (e) { ca = {}; }  
 try { cb = VC.perf.cacheCalculo.get('esp_' + b.id, () => VC.calculo.calcularQEspaco(b)); } catch (e) { cb = {}; }  
 let va = 0, vb = 0;  
 if (campo === 'A') { va = Number(ca.A) || 0; vb = Number(cb.A) || 0; }  
 else if (campo === 'H') { va = Number(ca.H) || 0; vb = Number(cb.H) || 0; }  
 else if (campo === 'V') { va = Number(ca.V) || 0; vb = Number(cb.V) || 0; }  
 else if (campo === 'N') { va = Number(ca.N) || 0; vb = Number(cb.N) || 0; }  
 else if (campo === 'Q') { va = Number(ca.Q_normas) || 0; vb = Number(cb.Q_normas) || 0; }  
 return va < vb ? -1 * mult : va > vb ? 1 * mult : 0;  
 });  
 return arr;  
 },  
  
 _cacheOrdenacao: { chave: null, lista: null },  
  
 _ordenarListaComCache(lista, campo, direcao) {  
 const chave = lista.length + '|' + campo + '|' + direcao + '|' + (VC.estado._ultimoHash || '');  
 if (this._cacheOrdenacao.chave === chave && this._cacheOrdenacao.lista) return this._cacheOrdenacao.lista;  
 const ordenada = this._ordenarLista(lista, campo, direcao);  
 this._cacheOrdenacao.chave = chave;  
 this._cacheOrdenacao.lista = ordenada;  
 return ordenada;  
 },  
  
 ordenarPor(campo) {  
 const ui = VC._espacosUI;  
 if (ui.ordenacao === campo) ui.direcao = ui.direcao === 'asc' ? 'desc' : 'asc';  
 else { ui.ordenacao = campo; ui.direcao = 'asc'; }  
 this._cacheOrdenacao = { chave: null, lista: null };  
 VC.passos.render('levantamento');  
 },  
  
 _clickSelecao(ev, idx) {  
 const ui = VC._espacosUI;  
 if (ev.shiftKey && ui.ultimoSelecionado != null) {  
 const [a, b] = ui.ultimoSelecionado < idx ? [ui.ultimoSelecionado, idx] : [idx, ui.ultimoSelecionado];  
 for (let k = a; k <= b; k++) ui.selecionados.add(k);  
 ui.ultimoSelecionado = idx;  
 ui.linhaAtiva = idx;  
 VC.passos.render('levantamento');  
 return;  
 }  
 if (ui.selecionados.has(idx)) ui.selecionados.delete(idx);  
 else ui.selecionados.add(idx);  
 ui.ultimoSelecionado = idx;  
 ui.linhaAtiva = idx;  
 VC.passos.render('levantamento');  
 },  
  
 toggleSelecao(idx, ligado) {  
 const ui = VC._espacosUI;  
 if (ligado) ui.selecionados.add(idx);  
 else ui.selecionados.delete(idx);  
 ui.ultimoSelecionado = idx;  
 ui.linhaAtiva = idx;  
 VC.passos.render('levantamento');  
 },  
  
 toggleSelecionarTodos(ligado) {  
 const ui = VC._espacosUI;  
 ui.selecionados.clear();  
 if (ligado) VC.dados.espacos.forEach((e, i) => ui.selecionados.add(i));  
 VC.passos.render('levantamento');  
 },  
  
 limparSelecao() {  
 VC._espacosUI.selecionados.clear();  
 VC._espacosUI.ultimoSelecionado = null;  
 VC._espacosUI.linhaAtiva = null;  
 VC.passos.render('levantamento');  
 },  
  
 eliminarSelecionados() {  
 const ui = VC._espacosUI;  
 const indices = Array.from(ui.selecionados).sort((a, b) => b - a);  
 if (!indices.length) { VC.ui.toast('Nenhum espaco selecionado.'); return; }  
 const nomes = indices.map(i => VC.dados.espacos[i] ? VC.dados.espacos[i].nome : '?');  
 const msg = indices.length === 1  
 ? 'Eliminar o espaco «' + nomes[0] + '?'  
 : 'Eliminar ' + indices.length + ' espacos?\n\n' + nomes.slice(0, 5).map(n => '- ' + n).join('\n') + (nomes.length > 5 ? '\n- ... e mais ' + (nomes.length - 5) : '');  
 if (!confirm(msg)) return;  
 const removidos = indices.map(i => ({ idx: i, espaco: VC.dados.espacos[i] })).filter(r => r.espaco);  
 indices.forEach(i => { if (VC.dados.espacos[i]) VC.dados.espacos.splice(i, 1); });  
 const nomesRemovidos = new Set(removidos.map(r => r.espaco.nome));  
 VC.dados.terminais = VC.dados.terminais.filter(t => !t.espacos.some(x => nomesRemovidos.has(x.nome)));  
 if (VC.historico) VC.historico.push(removidos.length + ' espaco(s) eliminado(s)');  
 ui.selecionados.clear();  
 ui.ultimoSelecionado = null;  
 ui.linhaAtiva = null;  
 VC.estado.forcarSync();  
 if (VC._passoAtivo === 'levantamento') VC.passos.render('levantamento');  
 VC.ui.toast(removidos.length + ' espaco(s) eliminado(s).');  
 },  
  
 setFiltro(v) { this._filtro = v; this._renderDebounced(); },  
 limparFiltro() { this._filtro = ''; this._renderDebounced(); },  
  
 _renderDebounced: (function () {  
 let timer = null;  
 return function () {  
 clearTimeout(timer);  
 timer = setTimeout(() => { if (VC._passoAtivo === 'levantamento') VC.passos.render('levantamento'); }, 200);  
 };  
 })(),  
  
 editarCampo(idx, campo, valor) {  
 const e = VC.dados.espacos[idx];  
 if (!e) return;  
 if (campo === 'A' || campo === 'H') {  
 e[campo] = VC.utils.num(valor);  
 if (e.geometriaMetodo !== 'V') { e.V = (Number(e.A) || 0) * (Number(e.H) || 0); e.geometriaMetodo = 'AH'; }  
 } else if (campo === 'V') {  
 e.V = VC.utils.num(valor);  
 e.geometriaMetodo = 'V';  
 } else if (campo === 'N') {  
 e.N = VC.utils.num(valor);  
 } else if (campo === 'nome') {  
 const val = _validarNome(valor, idx);  
 if (!val.ok) {  
 VC.ui.toast(val.erro);  
 const inputs = document.querySelectorAll('#tabelaEspacos input[data-campo="nome"][data-idx="' + idx + '"]');  
 inputs.forEach(inp => { inp.value = e.nome; inp.style.borderColor = 'var(--coral)'; inp.style.background = 'var(--coral-soft)'; setTimeout(() => { inp.style.borderColor = ''; inp.style.background = ''; }, 1500); });  
 return;  
 }  
 e.nome = String(valor || '').trim();  
 } else if (campo === 'zona') {  
 e.zona = valor;  
 e.localizacao = VC.utils.parseZona(valor);  
 } else { e[campo] = valor; }  
 this._cacheOrdenacao = { chave: null, lista: null };  
 if (VC.historico) VC.historico.push('edicao de ' + campo + ' em «' + e.nome + '»');  
 VC.estado.sincronizar();  
 },  
  
 validarNome(idx, input) {  
 const val = _validarNome(input.value, idx);  
 if (!val.ok) {  
 input.style.borderColor = 'var(--coral)';  
 input.style.background = 'var(--coral-soft)';  
 VC.ui.toast(val.erro + ' em «' + input.value + '»');  
 } else {  
 input.style.borderColor = '';  
 input.style.background = '';  
 }  
 },  
  
 editarRPH(idx, valor) {  
 const e = VC.dados.espacos[idx];  
 if (!e) return;  
 const v = Math.max(0, VC.utils.num(valor));  
 VC.rph.aplicarUtilizador(e, v);  
 this._cacheOrdenacao = { chave: null, lista: null };  
 VC.estado.forcarSync();  
 if (VC._passoAtivo === 'levantamento') VC.passos.render('levantamento');  
 VC.ui.toast('RPH de «' + e.nome + '» -> ' + v + ' h-1 (U)');  
 },  
  
 reporNorma(idx) {  
 const e = VC.dados.espacos[idx];  
 if (!e) return;  
 VC.rph.reporNorma(e);  
 this._cacheOrdenacao = { chave: null, lista: null };  
 VC.estado.forcarSync();  
 if (VC._passoAtivo === 'levantamento') VC.passos.render('levantamento');  
 VC.ui.toast('RPH de «' + e.nome + '» reposto');  
 },  
  
 editarQAI(idx, valor) {  
 const e = VC.dados.espacos[idx];  
 if (!e) return;  
 const v = Math.max(0, VC.utils.num(valor));  
 if (v === 0) {  
 VC.qai.reporNorma(e);  
 e.QAI_projeto = 0; e.QAI_projeto_origem = 'norma'; e.QAI_projeto_motivo = ''; e.QAI_projeto_rede = 'auto';  
 this._cacheOrdenacao = { chave: null, lista: null };  
 VC.estado.forcarSync();  
 if (VC._passoAtivo === 'levantamento') VC.passos.render('levantamento');  
 VC.ui.toast('QAI de «' + e.nome + '» reposto');  
 return;  
 }  
 if (!e.QAI_projeto_motivo || !String(e.QAI_projeto_motivo).trim()) {  
 VC.popupQAI.abrir(idx, { valorForcado: v });  
 return;  
 }  
 const r = VC.qai.aplicarUtilizador(e, v, e.QAI_projeto_motivo, e.QAI_projeto_rede);  
 if (!r.ok) { VC.ui.toast(r.erro); return; }  
 e.QAI_projeto = v;  
 e.QAI_projeto_origem = 'utilizador';  
 this._cacheOrdenacao = { chave: null, lista: null };  
 VC.estado.forcarSync();  
 if (VC._passoAtivo === 'levantamento') VC.passos.render('levantamento');  
 VC.ui.toast('QAI de «' + e.nome + '» -> ' + v + ' m3/h');  
 },  
  
 reporNormaQAI(idx) {  
 const e = VC.dados.espacos[idx];  
 if (!e) return;  
 VC.qai.reporNorma(e);  
 e.QAI_projeto = 0; e.QAI_projeto_origem = 'norma'; e.QAI_projeto_motivo = ''; e.QAI_projeto_rede = 'auto';  
 this._cacheOrdenacao = { chave: null, lista: null };  
 VC.estado.forcarSync();  
 if (VC._passoAtivo === 'levantamento') VC.passos.render('levantamento');  
 VC.ui.toast('QAI de «' + e.nome + '» reposto');  
 },  
  
 eliminarUm(idx) {  
 const e = VC.dados.espacos[idx];  
 if (!e) return;  
 if (!confirm('Eliminar «' + e.nome + '»?')) return;  
 VC.dados.espacos.splice(idx, 1);  
 VC.dados.terminais = VC.dados.terminais.filter(t => !t.espacos.some(x => x.nome === e.nome));  
 VC._espacosUI.selecionados.clear();  
 VC._espacosUI.linhaAtiva = null;  
 this._cacheOrdenacao = { chave: null, lista: null };  
 if (VC.historico) VC.historico.push('1 espaco eliminado');  
 VC.estado.forcarSync();  
 if (VC._passoAtivo === 'levantamento') VC.passos.render('levantamento');  
 },  
  
 duplicarLinha(idx) {  
 const original = VC.dados.espacos[idx];  
 if (!original) return;  
 const copia = VC.utils.clonar(original);  
 copia.id = VC.dados.nextId.espaco++;  
 let nomeBase = (original.nome || 'Espaco') + ' (copia)';  
 let nome = nomeBase, guard = 0;  
 while (VC.dados.espacos.some(x => x.nome === nome) && guard++ < 50) nome = nomeBase + ' ' + (guard + 1);  
 copia.nome = nome;  
 copia.ramalRefInsuflacao = '';  
 copia.ramalRefExtracao = '';  
 copia.balanco = { Q_in_direto: 0, Q_out_direto: 0, Q_conforto_in: 0, Q_conforto_out: 0, QAI_aplicado: 0, QAI_rede: 'insuflacao', Q_transf_in: 0, Q_transf_out: 0, exfiltracao: 0, residuo: 0, pressao_relativa_Pa: 0, estado: 'PENDENTE' };  
 copia.transferencias = [];  
 copia.definicoes = [];  
 VC.dados.espacos.splice(idx + 1, 0, copia);  
 this._cacheOrdenacao = { chave: null, lista: null };  
 if (VC.historico) VC.historico.push('duplicacao de «' + original.nome + '»');  
 VC.estado.forcarSync();  
 if (VC._passoAtivo === 'levantamento') VC.passos.render('levantamento');  
 VC.ui.toast('Espaco duplicado: ' + copia.nome);  
 },  
  
 _ligarNavegacao() {  
 const container = document.getElementById('conteudoPasso');  
 if (!container) return;  
 if (container._navLigadaPasso === VC._passoAtivo) return;  
 container._navLigadaPasso = VC._passoAtivo;  
 if (container._navHandler) container.removeEventListener('keydown', container._navHandler);  
 const handler = (ev) => {  
 const alvo = ev.target;  
 if (!alvo.matches || !alvo.matches('input, select, textarea')) return;  
 const tr = alvo.closest('tr');  
 if (!tr || !tr.closest('#tabelaEspacos')) return;  
 const tds = Array.from(tr.children);  
 const td = alvo.closest('td');  
 const colIdx = tds.indexOf(td);  
 if (ev.key === 'Enter' && alvo.tagName !== 'SELECT') {  
 ev.preventDefault();  
 const proxTr = tr.nextElementSibling;  
 if (proxTr) { const proxInput = proxTr.children[colIdx]?.querySelector('input, select'); if (proxInput) { proxInput.focus(); proxInput.select(); } }  
 } else if (ev.key === 'ArrowDown' && ev.ctrlKey) {  
 ev.preventDefault();  
 const proxTr = tr.nextElementSibling;  
 if (proxTr) { const proxInput = proxTr.children[colIdx]?.querySelector('input, select'); if (proxInput) { proxInput.focus(); proxInput.select(); } }  
 } else if (ev.key === 'ArrowUp' && ev.ctrlKey) {  
 ev.preventDefault();  
 const antTr = tr.previousElementSibling;  
 if (antTr) { const antInput = antTr.children[colIdx]?.querySelector('input, select'); if (antInput) { antInput.focus(); antInput.select(); } }  
 } else if (ev.key === 'Escape') {  
 ev.preventDefault();  
 alvo.blur();  
 }  
 };  
 container._navHandler = handler;  
 container.addEventListener('keydown', handler);  
 },  
  
 renderManual() {  
 const f = this._manualForm || (this._manualForm = { nome: '', tipo: 'Escritorio', zona: '', H: 2.6, A: 20, V: 52, N: 1 });  
 let h = '<div class="cartao-titulo">Novo espaco</div>';  
 h += '<div class="grade-3" style="margin-bottom:10px">' +  
 '<div class="campo-grupo"><label>Nome *</label><input id="manNome" value="' + VC.utils.esc(f.nome) + '"></div>' +  
 '<div class="campo-grupo"><label>Tipo (G1-G4)</label><select id="manTipo">' + [1, 2, 3, 4].map(gNum => {  
 const nomesG = { 1: 'G1 · Ocupação Permanente', 2: 'G2 · Zona de Transferência', 3: 'G3 · Baixa Emissão', 4: 'G4 · Extração Dedicada' };  
 const tiposG = Object.keys(VC.tiposEspaco).filter(t => (VC.tiposEspaco[t].g || 1) === gNum).sort((a, b) => a.localeCompare(b, 'pt-PT'));  
 return '<optgroup label="' + nomesG[gNum] + ' (' + tiposG.length + ')">' + tiposG.map(t => '<option value="' + t + '"' + (t === f.tipo ? ' selected' : '') + '>G' + gNum + ' · ' + t + '</option>').join('') + '</optgroup>';  
 }).join('') + '</select></div>' +  
 '<div class="campo-grupo"><label>Zona</label><input id="manZona" value="' + VC.utils.esc(f.zona) + '"></div>' +  
 '</div>';  
 h += '<div class="grade-4" style="margin-bottom:10px">' +  
 '<div class="campo-grupo"><label>Area A</label><input type="number" step="0.01" id="manA" value="' + f.A + '"></div>' +  
 '<div class="campo-grupo"><label>Altura H</label><input type="number" step="0.01" id="manH" value="' + f.H + '"></div>' +  
 '<div class="campo-grupo"><label>Volume V</label><input type="number" step="0.01" id="manV" value="' + f.V + '"></div>' +  
 '<div class="campo-grupo"><label>Ocupacao N</label><input type="number" id="manN" value="' + f.N + '"></div>' +  
 '</div>';  
 h += '<div style="display:flex;gap:8px;justify-content:flex-end">' +  
 '<button class="btn" onclick="VC.editorEspacos.setCaminho(\'tabela\')">Cancelar</button>' +  
 '<button class="btn primario" onclick="VC.editorEspacos.adicionarManual()">Adicionar</button>' +  
 '</div>';  
 return h;  
 },  
  
 adicionarManual() {  
 const g = id => { const el = document.getElementById(id); return el ? el.value : null; };  
 const nome = (g('manNome') || '').trim();  
 if (!nome) { VC.ui.toast('Nome obrigatorio.'); return; }  
 const val = _validarNome(nome, -1);  
 if (!val.ok) { VC.ui.toast(val.erro + '. Escolhe outro nome.'); return; }  
 const A = VC.utils.num(g('manA'));  
 const H = VC.utils.num(g('manH'));  
 const V = VC.utils.num(g('manV')) || (A * H);  
 const esp = {  
 id: VC.dados.nextId.espaco++,  
 nome: nome, tipo: g('manTipo') || 'Escritorio',  
 zona: g('manZona') || 'Zona manual',  
 localizacao: VC.utils.parseZona(g('manZona') || ''),  
 geometriaMetodo: 'AH',  
 A: A, H: H, V: V, N: VC.utils.num(g('manN')),  
 origem: 'Manual', definicoes: [],  
 ramalRefInsuflacao: '', ramalRefExtracao: '',  
 balanco: { Q_in_direto: 0, Q_out_direto: 0, Q_conforto_in: 0, Q_conforto_out: 0, QAI_aplicado: 0, QAI_rede: 'insuflacao', Q_transf_in: 0, Q_transf_out: 0, exfiltracao: 0, residuo: 0, pressao_relativa_Pa: 0, estado: 'PENDENTE' },  
 transferencias: [],  
 rphDefault: 0, rphAplicado: 0, rphOrigem: 'norma', Q_ConTerm: 0,  
 QAI_projeto: 0, QAI_projeto_origem: 'norma', QAI_projeto_motivo: '', QAI_projeto_rede: 'auto',  
 Q_total: 0  
 };  
 VC.rph.aplicarDefaultSeVazio(esp);  
 VC.qai.aplicarDefaultSeVazio(esp);  
 VC.dados.espacos.push(esp);  
 this._cacheOrdenacao = { chave: null, lista: null };  
 if (VC.historico) VC.historico.push('novo espaco «' + nome + '»');  
 VC.estado.forcarSync();  
 VC.ui.toast('Espaco «' + nome + '» adicionado.');  
 this._manualForm = null;  
 this.setCaminho('tabela');  
 }  
};  
  
/* ============================================================  
 §20.1b · HISTORICO  
 ============================================================ */  
VC.historico = VC.historico || {  
 _stack: [], _indice: -1, _max: 30, _ativo: true,  
 push(motivo) {  
 if (!this._ativo) return;  
 this._stack = this._stack.slice(0, this._indice + 1);  
 this._stack.push({ timestamp: new Date().toISOString(), motivo: motivo || 'edicao', snapshot: VC.utils.clonar(VC.dados.espacos) });  
 if (this._stack.length > this._max) this._stack.shift();  
 this._indice = this._stack.length - 1;  
 },  
 desfazer() {  
 if (!this.podeDesfazer()) { VC.ui.toast('Nada para desfazer.'); return false; }  
 this._indice--;  
 this._aplicar(this._stack[this._indice].snapshot);  
 VC.ui.toast('Desfeito: ' + (this._stack[this._indice].motivo || 'edicao'));  
 return true;  
 },  
 refazer() {  
 if (!this.podeRefazer()) { VC.ui.toast('Nada para refazer.'); return false; }  
 this._indice++;  
 this._aplicar(this._stack[this._indice].snapshot);  
 VC.ui.toast('Refeito: ' + (this._stack[this._indice].motivo || 'edicao'));  
 return true;  
 },  
 _aplicar(snapshot) {  
 if (!snapshot) return;  
 VC.dados.espacos = VC.utils.clonar(snapshot);  
 if (VC.editorEspacos) VC.editorEspacos._cacheOrdenacao = { chave: null, lista: null };  
 VC.estado.forcarSync();  
 if (VC._passoAtivo === 'levantamento') VC.passos.render('levantamento');  
 },  
 podeDesfazer() { return this._indice > 0; },  
 podeRefazer() { return this._indice < this._stack.length - 1; },  
 limpar() { this._stack = []; this._indice = -1; }  
};  
  
setTimeout(function () {  
 if (VC.historico && VC.historico._stack.length === 0) VC.historico.push('estado inicial');  
}, 200);  
  
/* ============================================================  
 §20.1c · OPERACOES EM LOTE  
 ============================================================ */  
VC.operacoesLote = VC.operacoesLote || {  
 _snapshot(ids) { return ids.map(function (idx) { return { idx: idx, espaco: VC.utils.clonar(VC.dados.espacos[idx]) }; }); },  
 _restaurar(snapshot) {  
 snapshot.forEach(function (s) { if (s.espaco) VC.dados.espacos[s.idx] = s.espaco; });  
 if (VC.editorEspacos) VC.editorEspacos._cacheOrdenacao = { chave: null, lista: null };  
 VC.estado.forcarSync();  
 if (VC._passoAtivo === 'levantamento') VC.passos.render('levantamento');  
 VC.ui.toast('Operacao revertida.');  
 },  
 abrirDialogo(titulo, opcoes, callback) {  
 const modal = document.getElementById('modalGenerico');  
 const cont = document.getElementById('modalGenericoConteudo');  
 if (!modal || !cont) return;  
 const ids = Array.from(VC._espacosUI.selecionados);  
 if (!ids.length) { VC.ui.toast('Nenhum espaco selecionado.'); return; }  
 let h = '<div class="modal-cabecalho"><h3>' + titulo + ' - ' + ids.length + ' espaco(s)</h3>';  
 h += '<button class="fechar" onclick="VC.ui.fecharModal(\'modalGenerico\')">x</button></div>';  
 h += '<div class="modal-corpo">';  
 h += '<div class="campo-grupo"><label>' + (opcoes.label || 'Novo valor') + '</label>';  
 if (opcoes.tipo === 'select') {  
 h += '<select id="loteValor" style="width:100%;padding:8px 10px;border:1px solid var(--borda-media);border-radius:5px;font-size:12px;font-family:inherit">';  
 opcoes.lista.forEach(function (o) { h += '<option value="' + o.valor + '">' + o.label + '</option>'; });  
 h += '</select>';  
 } else if (opcoes.tipo === 'number') {  
 h += '<input type="number" id="loteValor" min="0" step="0.1" value="' + (opcoes.default || 0) + '" style="width:100%;padding:8px 10px;border:1px solid var(--borda-media);border-radius:5px;font-size:13px;font-family:inherit;font-weight:700">';  
 }  
 h += '</div>';  
 h += '<div id="lotePreview" style="margin-top:12px;padding:10px 14px;background:var(--superf2);border:1px solid var(--borda);border-radius:6px;font-size:11px;color:var(--texto-med);line-height:1.55"></div>';  
 h += '</div>';  
 h += '<div class="modal-rodape">';  
 h += '<button class="btn" onclick="VC.ui.fecharModal(\'modalGenerico\')">Cancelar</button>';  
 h += '<button class="btn primario" onclick="VC.operacoesLote._confirmarAplicar()">Aplicar</button>';  
 h += '</div>';  
 cont.innerHTML = h;  
 modal.classList.add('on');  
 this._callbackAtual = callback;  
 this._idsAtual = ids;  
 this._opcoesAtual = opcoes;  
 const self = this;  
 setTimeout(function () {  
 const el = document.getElementById('loteValor');  
 if (el) {  
 el.addEventListener('input', function () { self._atualizarPreview(); });  
 el.addEventListener('change', function () { self._atualizarPreview(); });  
 self._atualizarPreview();  
 }  
 }, 50);  
 },  
 _atualizarPreview() {  
 const el = document.getElementById('lotePreview');  
 const valEl = document.getElementById('loteValor');  
 if (!el || !valEl) return;  
 const v = valEl.value;  
 const ids = this._idsAtual;  
 const opcoes = this._opcoesAtual;  
 if (!ids || !opcoes) return;  
 let deltaTotal = 0;  
 const linhas = [];  
 ids.slice(0, 5).forEach(function (idx) {  
 try {  
 const e = VC.dados.espacos[idx];  
 if (!e) return;  
 const antes = VC.calculo.calcularQEspaco(e);  
 const copia = VC.utils.clonar(e);  
 if (typeof opcoes.aplicar === 'function') opcoes.aplicar(copia, v);  
 const depois = VC.calculo.calcularQEspaco(copia);  
 const delta = (depois.Q_total || 0) - (antes.Q_total || 0);  
 deltaTotal += delta;  
 linhas.push('- ' + (e.nome || '?').substring(0, 30) + ': ' + (antes.Q_total || 0).toFixed(0) + ' -> ' + (depois.Q_total || 0).toFixed(0) + ' m3/h (' + (delta >= 0 ? '+' : '') + delta.toFixed(0) + ')');  
 } catch (err) { linhas.push('- (erro na preview)'); }  
 });  
 let h = '<b>Impacto estimado:</b><br>' + linhas.join('<br>');  
 if (ids.length > 5) h += '<br>- ... e mais ' + (ids.length - 5) + ' espaco(s)';  
 h += '<br><br><b>Delta Q total (amostra): ' + (deltaTotal >= 0 ? '+' : '') + deltaTotal.toFixed(0) + ' m3/h</b>';  
 el.innerHTML = h;  
 },  
 _confirmarAplicar() {  
 const valEl = document.getElementById('loteValor');  
 if (!valEl) return;  
 const valor = valEl.value;  
 const ids = this._idsAtual;  
 const callback = this._callbackAtual;  
 if (!callback || !ids || !ids.length) return;  
 VC.ui.fecharModal('modalGenerico');  
 callback(ids, valor);  
 },  
 abrirDialogoTipo() {  
 const tipos = Object.keys(VC.tiposEspaco).sort();  
 this.abrirDialogo('Alterar tipo', { label: 'Novo tipo', tipo: 'select', lista: tipos.map(function (t) { return { valor: t, label: t }; }), aplicar: function (e, v) { e.tipo = v; } }, function (ids, tipo) { VC.operacoesLote.alterarTipo(ids, tipo); });  
 },  
 abrirDialogoGrupo() {  
 this.abrirDialogo('Alterar grupo', {  
 label: 'Novo grupo G1-G4',  
 tipo: 'select',  
 lista: [  
 { valor: '1', label: 'G1 - Ocupacao Permanente' },  
 { valor: '2', label: 'G2 - Zona de Transferencia' },  
 { valor: '3', label: 'G3 - Baixa Emissao' },  
 { valor: '4', label: 'G4 - Extracao Dedicada' }  
 ],  
 aplicar: function (e, v) { e.grupoForcado = Number(v); }  
 }, function (ids, grupo) { VC.operacoesLote.alterarGrupo(ids, Number(grupo)); });  
 },  
 abrirDialogoRPH() {  
 this.abrirDialogo('Alterar RPH', { label: 'Novo RPH (h-1)', tipo: 'number', default: 1.0, aplicar: function (e, v) { e.rphAplicado = Math.max(0, Number(v)); e.rphOrigem = 'utilizador'; } }, function (ids, rph) { VC.operacoesLote.alterarRPH(ids, Number(rph)); });  
 },  
 alterarTipo(ids, novoTipo) {  
 const snapshot = this._snapshot(ids);  
 ids.forEach(function (idx) {  
 const e = VC.dados.espacos[idx];  
 if (!e) return;  
 e.tipo = novoTipo;  
 if (e.rphOrigem !== 'utilizador') VC.rph.reporNorma(e);  
 if (e.QAI_projeto_origem !== 'utilizador') VC.qai.reporNorma(e);  
 });  
 if (VC.editorEspacos) VC.editorEspacos._cacheOrdenacao = { chave: null, lista: null };  
 if (VC.historico) VC.historico.push(ids.length + ' espacos -> tipo «' + novoTipo + '»');  
 VC.estado.forcarSync();  
 VC._espacosUI.selecionados.clear();  
 if (VC._passoAtivo === 'levantamento') VC.passos.render('levantamento');  
 VC.ui.toast(ids.length + ' espacos -> «' + novoTipo + '».', 'Desfazer', function () { VC.operacoesLote._restaurar(snapshot); }, 8000);  
 },  
 alterarGrupo(ids, novoGrupo) {  
 const snapshot = this._snapshot(ids);  
 ids.forEach(function (idx) {  
 const e = VC.dados.espacos[idx];  
 if (!e) return;  
 e.grupoForcado = Number(novoGrupo);  
 if (e.rphOrigem !== 'utilizador') VC.rph.reporNorma(e);  
 });  
 if (VC.editorEspacos) VC.editorEspacos._cacheOrdenacao = { chave: null, lista: null };  
 if (VC.historico) VC.historico.push(ids.length + ' espacos -> grupo G' + novoGrupo);  
 VC.estado.forcarSync();  
 VC._espacosUI.selecionados.clear();  
 if (VC._passoAtivo === 'levantamento') VC.passos.render('levantamento');  
 VC.ui.toast(ids.length + ' espacos -> G' + novoGrupo + '.', 'Desfazer', function () { VC.operacoesLote._restaurar(snapshot); }, 8000);  
 },  
 alterarRPH(ids, novoRPH) {  
 const snapshot = this._snapshot(ids);  
 ids.forEach(function (idx) {  
 const e = VC.dados.espacos[idx];  
 if (!e) return;  
 e.rphAplicado = Math.max(0, Number(novoRPH));  
 e.rphOrigem = 'utilizador';  
 });  
 if (VC.editorEspacos) VC.editorEspacos._cacheOrdenacao = { chave: null, lista: null };  
 if (VC.historico) VC.historico.push(ids.length + ' espacos -> RPH ' + novoRPH);  
 VC.estado.forcarSync();  
 VC._espacosUI.selecionados.clear();  
 if (VC._passoAtivo === 'levantamento') VC.passos.render('levantamento');  
 VC.ui.toast(ids.length + ' espacos -> RPH ' + novoRPH + ' h-1.', 'Desfazer', function () { VC.operacoesLote._restaurar(snapshot); }, 8000);  
 }  
};  
  
/* ============================================================  
 §20.1d · CSV  
 ============================================================ */  
VC.csv = VC.csv || {  
 _normalizarEncoding(arrayBuffer) {  
 const bytes = new Uint8Array(arrayBuffer);  
 if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) return new TextDecoder('utf-8').decode(bytes.slice(3));  
 if (bytes[0] === 0xFF && bytes[1] === 0xFE) return new TextDecoder('utf-16le').decode(bytes);  
 if (bytes[0] === 0xFE && bytes[1] === 0xFF) return new TextDecoder('utf-16be').decode(bytes);  
 try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }  
 catch (e) { try { return new TextDecoder('windows-1252').decode(bytes); } catch (e2) { return new TextDecoder('utf-8').decode(bytes); } }  
 },  
 _detetarSeparador(linha) {  
 let fora = ''; let dentro = false;  
 for (let i = 0; i < linha.length; i++) { const c = linha[i]; if (c === '"') { dentro = !dentro; continue; } if (!dentro) fora += c; }  
 const nC = (fora.match(/,/g) || []).length;  
 const nP = (fora.match(/;/g) || []).length;  
 const nT = (fora.match(/\t/g) || []).length;  
 if (nT > 0 && nT >= nC && nT >= nP) return '\t';  
 if (nP > nC) return ';';  
 return ',';  
 },  
 _splitLinha(linha, sep) {  
 const out = []; let atual = ''; let dentro = false;  
 for (let i = 0; i < linha.length; i++) {  
 const c = linha[i];  
 if (c === '"') { if (dentro && linha[i + 1] === '"') { atual += '"'; i++; } else dentro = !dentro; }  
 else if (c === sep && !dentro) { out.push(atual); atual = ''; }  
 else { atual += c; }  
 }  
 out.push(atual);  
 return out.map(s => s.trim());  
 },  
 _norm(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); },  
 _mapearHeaders(headersBrutos) {  
 const mapa = {  
 'nome': 'nome', 'espaco': 'nome', 'espacos': 'nome', 'name': 'nome', 'designacao': 'nome', 'descricao': 'nome', 'room': 'nome', 'space': 'nome',  
 'nivel': 'nivel', 'level': 'nivel', 'piso': 'nivel', 'floor': 'nivel', 'storey': 'nivel', 'andar': 'nivel', 'planta': 'nivel',  
 'ala': 'ala', 'zona': 'ala', 'zone': 'ala', 'wing': 'ala', 'setor': 'ala', 'sector': 'ala', 'bloco': 'ala', 'block': 'ala',  
 'tipo': 'tipo', 'type': 'tipo', 'categoria': 'tipo', 'utilizacao': 'tipo',  
 'a': 'A', 'area': 'A', 'm2': 'A', 'area_m2': 'A',  
 'h': 'H', 'altura': 'H', 'height': 'H', 'pe_direito': 'H',  
 'v': 'V', 'volume': 'V', 'm3': 'V',  
 'l': 'L', 'largura': 'L', 'width': 'L',  
 'c': 'C', 'comprimento': 'C', 'length': 'C',  
 'n': 'N', 'ocupacao': 'N', 'ocupantes': 'N', 'occupancy': 'N', 'pessoas': 'N'  
 };  
 return headersBrutos.map(h => { const norm = this._norm(h).replace(/[^a-z0-9_]/g, '_'); return mapa[norm] || null; });  
 },  
 _parseNivel(valor) {  
 const v = this._norm(valor);  
 if (!v) return null;  
 if (/^(m|mez|mezanino|mezzanine|entresuelo|entresol|mezz)$/.test(v)) return { nivel: 0.5, mezzanine: true, label: 'Mezzanino', pisoAntigo: 'Mezz' };  
 if (/^(0|00|rc|r\/c|r_c|pb|p_b|g|gf|ground|erdgeschoss|parterre|baja|rez)$/.test(v)) return { nivel: 0, mezzanine: false, label: 'R/C', pisoAntigo: 'P0' };  
 let m = v.match(/^p(\d+)$/);  
 if (m) { const n = parseInt(m[1], 10); return { nivel: n, mezzanine: false, label: n === 0 ? 'R/C' : 'Piso ' + n, pisoAntigo: 'P' + n }; }  
 m = v.match(/^p([oO])$/);  
 if (m) return { nivel: 0, mezzanine: false, label: 'R/C', pisoAntigo: 'P0' };  
 if (/^-?\d+$/.test(v)) { const n = parseInt(v, 10); return { nivel: n, mezzanine: false, label: (n < 0 ? 'Subsolo ' + Math.abs(n) : (n === 0 ? 'R/C' : 'Piso ' + n)), pisoAntigo: n < 0 ? 'Sub' + Math.abs(n) : 'P' + n }; }  
 m = v.match(/^(?:b|s|ss|sub)[-_]?(\d+)$/);  
 if (m) { const n = parseInt(m[1], 10); return { nivel: -n, mezzanine: false, label: 'Subsolo ' + n, pisoAntigo: 'Sub' + n }; }  
 m = v.match(/^(\d+)(?:o|er|do|to|st|nd|rd|th)?$/);  
 if (m) { const n = parseInt(m[1], 10); return { nivel: n, mezzanine: false, label: 'Piso ' + n, pisoAntigo: 'P' + n }; }  
 return null;  
 },  
 _parseAla(valor, nomeCompleto) {  
 const v = this._norm(valor);  
 const texto = v + ' ' + this._norm(nomeCompleto || '');  
 if (/\bn(orte)?\b|\bn\d|\bnorth\b|\bnord\b/.test(texto)) return 'Norte';  
 if (/\bs(ul)?\b|\bs\d|\bsouth\b|\bsud\b/.test(texto)) return 'Sul';  
 if (/\be(ste)?\b|\bl(este)?\b|\be\d|\beast\b|\best\b/.test(texto)) return 'Este';  
 if (/\bw(este)?\b|\bo(este)?\b|\bpoente\b|\bw\d|\bwest\b|\boest\b/.test(texto)) return 'Oeste';  
 if (/\bcentro\b|\bcentral\b|\bc\b|\bcenter\b/.test(texto)) return 'Centro';  
 const m = v.match(/^([a-z])$/i);  
 if (m) return m[1].toUpperCase();  
 const m2 = v.match(/^([a-z])\d$/i);  
 if (m2) return m2[1].toUpperCase();  
 return null;  
 },  
 _inferirTipo(nome) {  
 const n = this._norm(nome);  
 if (/casa.*banho|sanitari|wc|banho|lavabo/.test(n)) return 'Sanitarios';  
 if (/balneari|vestiari|duche/.test(n)) return 'Balnearios';  
 if (/circulacao|corredor|hall|atrio|patio/.test(n)) return 'Circulacao';  
 if (/escada|stair/.test(n)) return 'Escadas';  
 if (/garagem|parque|parking/.test(n)) return 'Garagem';  
 if (/cozinha|kitchen/.test(n)) return 'Cozinha';  
 if (/refeitorio|restaurante|cantina|bar/.test(n)) return 'Restauracao';  
 if (/laboratori|lab/.test(n)) return 'Laboratorio';  
 if (/arquivo|archive/.test(n)) return 'Arquivo';  
 if (/arrumo|arrecadacao|apoio|servico|storage/.test(n)) return 'Arrumo';  
 if (/sala.*aula|classroom/.test(n)) return 'Sala de aula';  
 if (/auditori/.test(n)) return 'Auditorio';  
 if (/reuniao|meeting/.test(n)) return 'Sala de reunioes';  
 if (/gina|desport|fitness/.test(n)) return 'Ginasio';  
 if (/consulta|consultation/.test(n)) return 'Consulta';  
 if (/internamento|ward/.test(n)) return 'Internamento';  
 if (/rececao|reception|lobby/.test(n)) return 'Rececao';  
 if (/sala|escritori|gabinete|office/.test(n)) return 'Escritorio';  
 return 'Escritorio';  
 },  
 deCSV(texto) {  
 const linhas = String(texto || '').replace(/^\ufeff/, '').split(/\r?\n/).filter(l => l.trim());  
 if (linhas.length < 2) return [];  
 const sep = this._detetarSeparador(linhas[0]);  
 const headersBrutos = this._splitLinha(linhas[0], sep);  
 const mapaHeaders = this._mapearHeaders(headersBrutos);  
 const espacos = [];  
 for (let i = 1; i < linhas.length; i++) {  
 const cols = this._splitLinha(linhas[i], sep);  
 if (!cols.length || cols.every(c => !c)) continue;  
 const obj = {};  
 mapaHeaders.forEach((chave, j) => { if (!chave) return; obj[chave] = cols[j]; });  
 const nome = String(obj.nome || '').trim();  
 if (!nome) continue;  
 const A = VC.utils.num(obj.A);  
 const H = VC.utils.num(obj.H);  
 const V = VC.utils.num(obj.V);  
 const L = VC.utils.num(obj.L);  
 const C = VC.utils.num(obj.C);  
 const N = VC.utils.num(obj.N);  
 const A_final = A > 0 ? A : (L > 0 && C > 0 ? L * C : 0);  
 const V_final = V > 0 ? V : (A_final > 0 && H > 0 ? A_final * H : 0);  
 const nivelInfo = this._parseNivel(obj.nivel) || this._parseNivel(nome.match(/(P\d+|PO|R\/C|Mez|Mezanino)/i)?.[0]);  
 const ala = this._parseAla(obj.ala, nome);  
 let zonaFinal = '';  
 if (nivelInfo || ala) { const piso = nivelInfo ? nivelInfo.pisoAntigo : ''; zonaFinal = [piso, ala].filter(Boolean).join(' - '); }  
 if (!zonaFinal) { const m = nome.match(/(P\d+)[\s-]\*(N\d+|S\d+|E\d+|W\d+|Mezanino|mezanino)/i); if (m) zonaFinal = m[1] + ' - ' + m[2]; }  
 const tipo = String(obj.tipo || '').trim() || this._inferirTipo(nome);  
 espacos.push({ nome: nome, tipo: tipo, zona: zonaFinal, A: A_final, H: H, V: V_final, N: N });  
 }  
 return espacos;  
 },  
 paraCSV(espacos) {  
 const headers = ['Espaco', 'Nivel', 'Ala', 'Tipo', 'A', 'H', 'V', 'N'];  
 const linhas = [headers.join(',')];  
 (espacos || VC.dados.espacos).forEach(e => {  
 const loc = e.localizacao || VC.utils.parseZona(e.zona || '');  
 const piso = loc.piso || '';  
 let nivel = '';  
 const m = piso.match(/P(\d+)/i);  
 if (m) nivel = parseInt(m[1], 10);  
 const ala = loc.ala || '';  
 linhas.push([  
 '"' + String(e.nome || '').replace(/"/g, '""') + '"',  
 nivel,  
 '"' + String(ala).replace(/"/g, '""') + '"',  
 '"' + String(e.tipo || '').replace(/"/g, '""') + '"',  
 Number(e.A) || 0, Number(e.H) || 0, Number(e.V) || 0, Number(e.N) || 0  
 ].join(','));  
 });  
 return '\ufeff' + linhas.join('\r\n');  
 },  
 importar() {  
 const self = this;  
 const inp = document.createElement('input');  
 inp.type = 'file'; inp.accept = '.csv,.txt';  
 inp.onchange = function (e) {  
 const f = e.target.files[0];  
 if (!f) return;  
 const r = new FileReader();  
 r.onload = function (ev) {  
 let texto;  
 try { texto = self._normalizarEncoding(ev.target.result); } catch (err) { VC.ui.toast('Erro ao descodificar: ' + err.message); return; }  
 let novos;  
 try { novos = self.deCSV(texto); } catch (err) { VC.ui.toast('Erro ao ler CSV: ' + err.message); return; }  
 if (!novos.length) { VC.ui.toast('Nenhuma linha valida encontrada.'); return; }  
 const substituir = confirm(novos.length + ' espacos encontrados.\n\nOK = Substituir todos\nCancelar = Adicionar aos existentes');  
 const criados = [];  
 novos.forEach(function (n) {  
 if (!n.nome || !String(n.nome).trim()) return;  
 const esp = {  
 id: VC.dados.nextId.espaco++,  
 nome: n.nome, tipo: n.tipo, zona: n.zona,  
 localizacao: VC.utils.parseZona(n.zona || ''),  
 geometriaMetodo: 'AH',  
 A: n.A, H: n.H, V: n.V, N: n.N,  
 origem: 'CSV', definicoes: [],  
 ramalRefInsuflacao: '', ramalRefExtracao: '',  
 balanco: { Q_in_direto: 0, Q_out_direto: 0, Q_conforto_in: 0, Q_conforto_out: 0, QAI_aplicado: 0, QAI_rede: 'insuflacao', Q_transf_in: 0, Q_transf_out: 0, exfiltracao: 0, residuo: 0, pressao_relativa_Pa: 0, estado: 'PENDENTE' },  
 transferencias: [],  
 rphDefault: 0, rphAplicado: 0, rphOrigem: 'norma', Q_ConTerm: 0,  
 QAI_projeto: 0, QAI_projeto_origem: 'norma', QAI_projeto_motivo: '', QAI_projeto_rede: 'auto', Q_total: 0  
 };  
 VC.rph.aplicarDefaultSeVazio(esp);  
 VC.qai.aplicarDefaultSeVazio(esp);  
 criados.push(esp);  
 });  
 if (substituir) { VC.dados.espacos = criados; VC.dados.terminais = []; }  
 else { VC.dados.espacos = VC.dados.espacos.concat(criados); }  
 if (VC.editorEspacos) VC.editorEspacos._cacheOrdenacao = { chave: null, lista: null };  
 if (VC.historico) VC.historico.push('importacao CSV - ' + criados.length + ' espacos');  
 VC.estado.forcarSync();  
 if (VC._passoAtivo === 'levantamento') VC.passos.render('levantamento');  
 VC.ui.toast(criados.length + ' espacos importados.');  
 };  
 r.readAsArrayBuffer(f);  
 };  
 inp.click();  
 },  
 exportar() {  
 if (!VC.dados.espacos.length) { VC.ui.toast('Sem espacos para exportar.'); return; }  
 const csv = this.paraCSV();  
 const nome = 'VentCondutas_espacos_IFC_' + new Date().toISOString().slice(0, 10) + '.csv';  
 VC.utils.download(nome, csv, 'text/csv;charset=utf-8');  
 VC.ui.toast('CSV exportado.');  
 }  
};  
  
/* ============================================================  
 §20.5 · POPUP TIPO  
 ============================================================ */  
VC.popupTipo = VC.popupTipo || {  
 _popupAtual: null,  
 abrir(idx, anchor) {  
 const esp = VC.dados.espacos[idx];  
 if (!esp) return;  
 if (this._popupAtual) { this._popupAtual.remove(); this._popupAtual = null; }  
 const grupos = { 1: [], 2: [], 3: [], 4: [] };  
 Object.keys(VC.tiposEspaco).forEach(function (t) {  
 const d = VC.tiposEspaco[t];  
 const g = d.g || 1;  
 if (!grupos[g]) grupos[g] = [];  
 grupos[g].push(t);  
 });  
 Object.keys(grupos).forEach(function (g) { grupos[g].sort(function (a, b) { return a.localeCompare(b, 'pt-PT'); }); });  
 const nomesGrupo = { 1: 'Ocupacao Permanente', 2: 'Zona de Transferencia', 3: 'Baixa Emissao', 4: 'Extracao Dedicada' };  
 const coresGrupo = {  
 1: { cor: '#2c5278', bg: '#eaf1f7' },  
 2: { cor: '#5a6b7c', bg: '#eef2f7' },  
 3: { cor: '#8a6a3a', bg: '#faf5eb' },  
 4: { cor: '#9a4a4a', bg: '#faeeee' }  
 };  
 const popup = document.createElement('div');  
 popup.className = 'tipo-popup on';  
 popup.style.cssText = 'position:fixed;background:#fff;border:1px solid #cdd5df;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);min-width:400px;max-width:460px;z-index:9999;overflow:hidden';  
 const rect = anchor.getBoundingClientRect();  
 popup.style.left = Math.min(rect.left, window.innerWidth - 460) + 'px';  
 popup.style.top = Math.min(rect.bottom + 4, window.innerHeight - 520) + 'px';  
 let h = '<div style="padding:8px 12px;border-bottom:1px solid #e3e8ee;display:flex;justify-content:space-between;align-items:center;background:#f8fafc">';  
 h += '<span style="font-size:11px;font-weight:800;color:#5a6b7c">Tipo de espaco (' + Object.keys(VC.tiposEspaco).length + ')</span>';  
 h += '<button onclick="this.closest(\'.tipo-popup\').remove()" style="background:none;border:none;cursor:pointer;font-size:16px;color:#94a3b8;padding:0 4px">x</button>';  
 h += '</div>';  
 h += '<div style="padding:6px 10px;border-bottom:1px solid #e3e8ee"><input type="text" id="tipoPesquisa" placeholder="Pesquisar tipo..." oninput="VC.popupTipo._filtrar(this.value)" style="width:100%;padding:5px 8px;border:1px solid #cdd5df;border-radius:5px;font-size:11px;font-family:inherit;box-sizing:border-box"></div>';  
 h += '<div id="tipoPopupGrade" style="max-height:460px;overflow-y:auto">';  
 Object.keys(grupos).sort().forEach(function (g) {  
 const lista = grupos[g];  
 if (!lista.length) return;  
 const meta = coresGrupo[g] || coresGrupo[1];  
 h += '<div class="tipo-grupo" data-grupo="' + g + '">';  
 h += '<div style="background:' + meta.bg + ';color:' + meta.cor + ';padding:5px 12px;font-size:9.5px;font-weight:900;letter-spacing:.4px;text-transform:uppercase;border-bottom:1px solid #e3e8ee;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:2">';  
 h += '<span>G' + g + ' - ' + nomesGrupo[g] + '</span>';  
 h += '<span style="font-weight:700;opacity:.75">' + lista.length + '</span>';  
 h += '</div>';  
 lista.forEach(function (t) {  
 const d = VC.tiposEspaco[t];  
 const ativo = t === esp.tipo;  
 h += '<button class="tipo-op" data-nome="' + VC.utils.esc(t.toLowerCase()) + '" onclick="VC.popupTipo.selecionar(' + idx + ', \'' + t.replace(/'/g, "\\'") + '\'); this.closest(\'.tipo-popup\').remove();" style="width:100%;text-align:left;background:' + (ativo ? '#eaf1f7' : '#fff') + ';border:none;border-bottom:1px solid #f0f3f7;padding:7px 12px;cursor:pointer;font-family:inherit;display:flex;justify-content:space-between;align-items:center;gap:8px">';  
 h += '<span style="font-size:11.5px;font-weight:700;color:#2c3e50">' + VC.utils.esc(t) + '</span>';  
 h += '<span style="font-size:10px;color:#94a3b8">' + VC.utils.esc(d.desc || ('G' + d.g)) + '</span>';  
 h += '</button>';  
 });  
 h += '</div>';  
 });  
 h += '</div>';  
 h += '<div id="tipoSemResultados" style="display:none;padding:14px;text-align:center;color:#94a3b8;font-size:11px;font-style:italic">Sem resultados.</div>';  
 popup.innerHTML = h;  
 document.body.appendChild(popup);  
 this._popupAtual = popup;  
 setTimeout(function () { const inp = document.getElementById('tipoPesquisa'); if (inp) inp.focus(); }, 60);  
 setTimeout(function () {  
 const fechar = function (ev) {  
 if (!popup.contains(ev.target)) { popup.remove(); VC.popupTipo._popupAtual = null; document.removeEventListener('click', fechar); }  
 };  
 document.addEventListener('click', fechar);  
 }, 50);  
 },  
 _filtrar(q) {  
 q = String(q || '').trim().toLowerCase();  
 const grade = document.getElementById('tipoPopupGrade');  
 const sem = document.getElementById('tipoSemResultados');  
 if (!grade) return;  
 let visiveis = 0;  
 grade.querySelectorAll('.tipo-grupo').forEach(function (g) {  
 let visiveisGrupo = 0;  
 g.querySelectorAll('.tipo-op').forEach(function (btn) {  
 const nome = btn.getAttribute('data-nome') || '';  
 const ok = !q || nome.indexOf(q) >= 0;  
 btn.style.display = ok ? '' : 'none';  
 if (ok) visiveisGrupo++;  
 });  
 g.style.display = visiveisGrupo > 0 ? '' : 'none';  
 visiveis += visiveisGrupo;  
 });  
 if (sem) sem.style.display = visiveis === 0 ? 'block' : 'none';  
 },  
 selecionar(idx, tipo) {  
 const e = VC.dados.espacos[idx];  
 if (!e) return;  
 e.tipo = tipo;  
 const def = VC.normas.getDef(tipo);  
 e.Rp = def.rp; e.Ra = def.ra;  
 if (e.rphOrigem !== 'utilizador') VC.rph.reporNorma(e);  
 else { const d = VC.rph.calcularDefault(e); e.rphDefault = d.rph; e.rphClasse = d.classe; e.rphClasseNome = d.classeNome; e.rphBase = d.base; }  
 if (e.QAI_projeto_origem !== 'utilizador') VC.qai.reporNorma(e);  
 if (VC.editorEspacos) VC.editorEspacos._cacheOrdenacao = { chave: null, lista: null };  
 if (VC.historico) VC.historico.push('tipo de «' + e.nome + '» -> ' + tipo);  
 VC.estado.forcarSync();  
 if (VC._passoAtivo === 'levantamento') VC.passos.render('levantamento');  
 VC.ui.toast('Tipo alterado para ' + tipo);  
 }  
};  
  
/* ============================================================  
 §20.5b · POPUP QAI  
 ============================================================ */  
VC.popupQAI = VC.popupQAI || {  
 _overlayAtual: null, _idxAtual: null,  
 abrir(idx, opts) {  
 opts = opts || {};  
 const esp = VC.dados.espacos[idx];  
 if (!esp) return;  
 this._idxAtual = idx;  
 const valorInicial = opts.valorForcado != null ? opts.valorForcado : (Number(esp.QAI_projeto) || 0);  
 const motivoAtual = esp.QAI_projeto_motivo || '';  
 const redeAtual = esp.QAI_projeto_rede || 'auto';  
 const origemAtual = esp.QAI_projeto_origem || 'norma';  
 const motivos = (VC.conhecimento && VC.conhecimento.qaiProjetoMotivosTipicos) || [];  
 const redeDefault = VC.qai.calcularRedeDefault(esp);  
 const g = VC.normas.getDef(esp.tipo).g;  
 const redeEfetiva = (redeAtual === 'auto') ? redeDefault : redeAtual;  
 let h = '<div class="modal-cabecalho"><h3>QAI_projeto - ' + VC.utils.esc(esp.nome) + '</h3><button class="fechar" onclick="VC.popupQAI.fechar()">x</button></div>';  
 h += '<div class="modal-corpo">';  
 h += '<div style="padding:10px 14px;background:#faf3e8;border-left:3px solid #b88a4a;border-radius:6px;font-size:11.5px;color:#6a4a1a;line-height:1.55;margin-bottom:12px">';  
 h += '<b>QAI_projeto</b> e um caudal adicional definido pelo engenheiro. Grupo: <b>G' + g + '</b> - Rede automatica: <b>' + redeDefault + '</b>.';  
 h += '</div>';  
 h += '<div class="campo-grupo" style="margin-bottom:12px"><label>QAI_projeto (m3/h)</label>';  
 h += '<input type="number" id="qaiValor" min="0" step="1" value="' + valorInicial + '" style="width:100%;padding:8px 10px;border:1px solid var(--borda-media);border-radius:5px;font-size:13px;font-family:inherit;font-weight:700">';  
 h += '<div style="font-size:10.5px;color:var(--texto-suave);margin-top:4px">Se for 0, o QAI fica em modo norma.</div></div>';  
 h += '<div class="campo-grupo" style="margin-bottom:12px"><label>Motivo tipico</label>';  
 h += '<select id="qaiMotivoTipico" style="width:100%;padding:8px 10px;border:1px solid var(--borda-media);border-radius:5px;font-size:12px;font-family:inherit">';  
 h += '<option value="">-- escolher --</option>';  
 motivos.forEach(function (m) { h += '<option value="' + VC.utils.esc(m) + '"' + (m === motivoAtual ? ' selected' : '') + '>' + VC.utils.esc(m) + '</option>'; });  
 h += '</select></div>';  
 h += '<div class="campo-grupo" style="margin-bottom:12px"><label>Motivo (obrigatorio se QAI > 0)</label>';  
 h += '<textarea id="qaiMotivo" rows="2" style="width:100%;padding:8px 10px;border:1px solid var(--borda-media);border-radius:5px;font-size:12px;font-family:inherit;resize:vertical">' + VC.utils.esc(motivoAtual) + '</textarea></div>';  
 h += '<div class="campo-grupo" style="margin-bottom:12px"><label>Rede aplicada</label>';  
 h += '<select id="qaiRede" style="width:100%;padding:8px 10px;border:1px solid var(--borda-media);border-radius:5px;font-size:12px;font-family:inherit">';  
 h += '<option value="auto"' + (redeAtual === 'auto' ? ' selected' : '') + '>Auto (G' + g + ' -> ' + redeDefault + ')</option>';  
 h += '<option value="insuflacao"' + (redeAtual === 'insuflacao' ? ' selected' : '') + '>Forcar insuflacao</option>';  
 h += '<option value="extracao"' + (redeAtual === 'extracao' ? ' selected' : '') + '>Forcar extracao</option>';  
 h += '<option value="extracao_suja"' + (redeAtual === 'extracao_suja' ? ' selected' : '') + '>Forcar extracao suja</option>';  
 h += '</select>';  
 h += '<div style="font-size:10.5px;color:var(--texto-suave);margin-top:4px">Rede efetiva: <b id="qaiRedeEfetiva">' + redeEfetiva + '</b></div></div>';  
 h += '<div style="padding:8px 12px;background:var(--superf2);border-radius:6px;font-size:10.5px;color:var(--texto-med);line-height:1.55">';  
 h += 'Origem atual: <b>' + (origemAtual === 'utilizador' ? 'Engenheiro' : 'Norma') + '</b>';  
 h += '</div>';  
 h += '<div id="qaiErro" style="display:none;margin-top:10px;padding:8px 12px;background:var(--coral-soft);border-left:3px solid var(--coral);border-radius:6px;font-size:11px;color:var(--coral-esc)"></div>';  
 h += '</div>';  
 h += '<div class="modal-rodape">';  
 h += '<button class="btn" onclick="VC.popupQAI.fechar()">Cancelar</button>';  
 h += '<button class="btn coral" onclick="VC.popupQAI.reporNorma()">Repor norma</button>';  
 h += '<button class="btn primario" onclick="VC.popupQAI.guardar()">Guardar</button>';  
 h += '</div>';  
 const modal = document.getElementById('modalGenerico');  
 const cont = document.getElementById('modalGenericoConteudo');  
 if (!modal || !cont) return;  
 cont.innerHTML = h;  
 modal.classList.add('on');  
 this._overlayAtual = modal;  
 setTimeout(function () {  
 const selMotivo = document.getElementById('qaiMotivoTipico');  
 const txtMotivo = document.getElementById('qaiMotivo');  
 const selRede = document.getElementById('qaiRede');  
 const spanRedeEfetiva = document.getElementById('qaiRedeEfetiva');  
 if (selMotivo && txtMotivo) selMotivo.addEventListener('change', function () { if (selMotivo.value) txtMotivo.value = selMotivo.value; });  
 if (selRede && spanRedeEfetiva) selRede.addEventListener('change', function () { let r = selRede.value; if (r === 'auto') r = redeDefault; spanRedeEfetiva.textContent = r; });  
 }, 50);  
 },  
 guardar() {  
 const idx = this._idxAtual;  
 const e = VC.dados.espacos[idx];  
 if (!e) { this.fechar(); return; }  
 const elValor = document.getElementById('qaiValor');  
 const elMotivo = document.getElementById('qaiMotivo');  
 const elRede = document.getElementById('qaiRede');  
 const elErro = document.getElementById('qaiErro');  
 const v = Math.max(0, VC.utils.num(elValor ? elValor.value : 0));  
 const motivo = elMotivo ? String(elMotivo.value || '').trim() : '';  
 const rede = elRede ? elRede.value : 'auto';  
 if (v > 0 && !motivo) { if (elErro) { elErro.textContent = 'Motivo obrigatorio quando QAI > 0.'; elErro.style.display = 'block'; } return; }  
 const r = VC.qai.aplicarUtilizador(e, v, motivo, rede);  
 if (!r.ok) { if (elErro) { elErro.textContent = r.erro || 'Erro'; elErro.style.display = 'block'; } return; }  
 e.QAI_projeto = v;  
 e.QAI_projeto_origem = v > 0 ? 'utilizador' : 'norma';  
 e.QAI_projeto_motivo = motivo;  
 e.QAI_projeto_rede = rede;  
 if (VC.editorEspacos) VC.editorEspacos._cacheOrdenacao = { chave: null, lista: null };  
 if (VC.historico) VC.historico.push('QAI de «' + e.nome + '» -> ' + v + ' m3/h');  
 VC.estado.forcarSync();  
 this.fechar();  
 if (VC._passoAtivo === 'levantamento') VC.passos.render('levantamento');  
 if (v > 0) VC.ui.toast('QAI de «' + e.nome + '» -> ' + v + ' m3/h');  
 else VC.ui.toast('QAI de «' + e.nome + '» -> 0');  
 },  
 reporNorma() {  
 const idx = this._idxAtual;  
 const e = VC.dados.espacos[idx];  
 if (!e) { this.fechar(); return; }  
 VC.qai.reporNorma(e);  
 e.QAI_projeto = 0; e.QAI_projeto_origem = 'norma'; e.QAI_projeto_motivo = ''; e.QAI_projeto_rede = 'auto';  
 if (VC.editorEspacos) VC.editorEspacos._cacheOrdenacao = { chave: null, lista: null };  
 if (VC.historico) VC.historico.push('QAI de «' + e.nome + '» reposto');  
 VC.estado.forcarSync();  
 this.fechar();  
 if (VC._passoAtivo === 'levantamento') VC.passos.render('levantamento');  
 VC.ui.toast('QAI de «' + e.nome + '» reposto');  
 },  
 fechar() { VC.ui.fecharModal('modalGenerico'); this._overlayAtual = null; this._idxAtual = null; }  
};  
  
/* ============================================================  
 §20.2 · EDITOR DE TERMINAIS  
 ============================================================ */  
VC.editorTerminais = VC.editorTerminais || {  
 _filtroVista: 'todos',  
 _filtroValor: '',  
 _ordenacao: 'nome',  
 _direcao: 'asc',  
 _listaFiltrada() {  
 let lista = (VC.dados.terminais || []).slice();  
 const vista = this._filtroVista;  
 const valor = this._filtroValor;  
 if (vista === 'rede') lista = lista.filter(t => t.rede === valor);  
 else if (vista === 'ramal') lista = lista.filter(t => t.ramalRef === valor);  
 else if (vista === 'tipo') lista = lista.filter(t => t.tipo === valor);  
 else if (vista === 'grupo') {  
 lista = lista.filter(t => {  
 const esp = (t.espacos && t.espacos[0]) ? VC.dados.espacos.find(x => x.nome === t.espacos[0].nome) : null;  
 if (!esp) return false;  
 const g = esp.g || (VC.normas.getDef(esp.tipo).g);  
 return String(g) === String(valor);  
 });  
 } else if (vista === 'localizacao') {  
 lista = lista.filter(t => {  
 const esp = (t.espacos && t.espacos[0]) ? VC.dados.espacos.find(x => x.nome === t.espacos[0].nome) : null;  
 if (!esp) return false;  
 const loc = esp.localizacao || {};  
 return (loc.piso || '') === valor;  
 });  
 }  
 const campo = this._ordenacao;  
 const dir = this._direcao === 'asc' ? 1 : -1;  
 lista.sort(function (a, b) {  
 if (campo === 'nome') return String(a.nome || '').localeCompare(String(b.nome || '')) * dir;  
 if (campo === 'Q') return ((Number(a.Q) || 0) - (Number(b.Q) || 0)) * dir;  
 if (campo === 'tipo') return String(a.tipo || '').localeCompare(String(b.tipo || '')) * dir;  
 if (campo === 'ramal') return String(a.ramalRef || '').localeCompare(String(b.ramalRef || '')) * dir;  
 if (campo === 'rede') return String(a.rede || '').localeCompare(String(b.rede || '')) * dir;  
 return 0;  
 });  
 return lista;  
 },  
 setVista(v) { this._filtroVista = v || 'todos'; this._filtroValor = ''; if (VC._passoAtivo === 'terminais') VC.passos.render('terminais'); },  
 setValorVista(v) { this._filtroValor = v || ''; if (VC._passoAtivo === 'terminais') VC.passos.render('terminais'); },  
 setOrdenacao(campo) {  
 if (this._ordenacao === campo) this._direcao = this._direcao === 'asc' ? 'desc' : 'asc';  
 else { this._ordenacao = campo; this._direcao = 'asc'; }  
 if (VC._passoAtivo === 'terminais') VC.passos.render('terminais');  
 },  
 render() {  
 const dis = VC.dados.congelado ? 'disabled' : '';  
 let h = '<div class="cartao-titulo">Dimensionamento de Terminais</div>';  
 h += '<p style="font-size:11.5px;color:var(--texto-med);margin-bottom:10px">Atribui fabricante, familia e tamanho a cada terminal.</p>';  
 if (!VC.dados.terminais.length) return h + '<div class="vazio"><div class="vazio-titulo">Sem terminais</div><div>Os terminais sao criados no passo Caudal por Terminal.</div></div>';  
 const valores = {  
 todos: [],  
 rede: [{ v: 'insuflacao', l: 'Insuflacao' }, { v: 'extracao', l: 'Extracao' }, { v: 'extracao_suja', l: 'Extracao suja' }],  
 ramal: VC.dados.ramais.map(rr => ({ v: rr.nome, l: rr.nome })),  
 tipo: Array.from(new Set(VC.dados.terminais.map(t => t.tipo))).map(tt => ({ v: tt, l: tt })),  
 grupo: [{ v: '1', l: 'G1' }, { v: '2', l: 'G2' }, { v: '3', l: 'G3' }, { v: '4', l: 'G4' }],  
 localizacao: Array.from(new Set(VC.dados.espacos.map(ee => (ee.localizacao && ee.localizacao.piso) || '').filter(Boolean))).map(pp => ({ v: pp, l: pp }))  
 };  
 h += '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px;padding:8px 12px;background:var(--superf2);border:1px solid var(--borda);border-radius:8px;font-size:11px">';  
 h += '<span style="font-weight:800;color:var(--texto-med);text-transform:uppercase;letter-spacing:.4px">Ver por:</span>';  
 h += '<select onchange="VC.editorTerminais.setVista(this.value)" style="padding:4px 8px;border:1px solid var(--borda-media);border-radius:5px;font-size:11px;font-family:inherit;background:#fff">';  
 [['todos', 'Todos'], ['rede', 'Rede'], ['ramal', 'Ramal'], ['tipo', 'Tipo'], ['grupo', 'Grupo'], ['localizacao', 'Localizacao']].forEach(function (pp) {  
 h += '<option value="' + pp[0] + '"' + (VC.editorTerminais._filtroVista === pp[0] ? ' selected' : '') + '>' + pp[1] + '</option>';  
 });  
 h += '</select>';  
 if (VC.editorTerminais._filtroVista !== 'todos' && valores[VC.editorTerminais._filtroVista].length) {  
 h += '<select onchange="VC.editorTerminais.setValorVista(this.value)" style="padding:4px 8px;border:1px solid var(--borda-media);border-radius:5px;font-size:11px;font-family:inherit;background:#fff">';  
 h += '<option value="">-- escolher --</option>';  
 valores[VC.editorTerminais._filtroVista].forEach(function (op) {  
 h += '<option value="' + VC.utils.esc(op.v) + '"' + (VC.editorTerminais._filtroValor === op.v ? ' selected' : '') + '>' + VC.utils.esc(op.l) + '</option>';  
 });  
 h += '</select>';  
 }  
 h += '<span style="margin-left:8px;font-weight:800;color:var(--texto-med);text-transform:uppercase;letter-spacing:.4px">Ordenar por:</span>';  
 h += '<select onchange="VC.editorTerminais.setOrdenacao(this.value)" style="padding:4px 8px;border:1px solid var(--borda-media);border-radius:5px;font-size:11px;font-family:inherit;background:#fff">';  
 [['nome', 'Nome'], ['tipo', 'Tipo'], ['Q', 'Caudal Q'], ['ramal', 'Ramal'], ['rede', 'Rede']].forEach(function (op) {  
 h += '<option value="' + op[0] + '"' + (VC.editorTerminais._ordenacao === op[0] ? ' selected' : '') + '>' + op[1] + '</option>';  
 });  
 h += '</select>';  
 h += '<button class="btn btn-mini" onclick="VC.editorTerminais.setOrdenacao(VC.editorTerminais._ordenacao)" style="padding:3px 8px">' + (VC.editorTerminais._direcao === 'asc' ? 'ASC' : 'DESC') + '</button>';  
 h += '<span style="margin-left:auto;font-size:10.5px;color:var(--texto-med)">' + VC.editorTerminais._listaFiltrada().length + ' terminais</span>';  
 h += '</div>';  
 const ordemAtual = VC.editorTerminais._ordenacao;  
 const dirAtual = VC.editorTerminais._direcao;  
 const seta = function (campo) { if (ordemAtual !== campo) return ''; return dirAtual === 'asc' ? ' A' : ' D'; };  
 const cor = function (campo) { return ordemAtual === campo ? 'color:var(--primario-esc);font-weight:900' : ''; };  
 const thClick = function (campo, label, style) {  
 return '<th style="' + (style || '') + 'cursor:pointer;user-select:none;' + cor(campo) + '" onclick="VC.editorTerminais.setOrdenacao(\'' + campo + '\')">' + label + seta(campo) + '</th>';  
 };  
 h += '<div class="tabela-wrap"><table class="tabela densa"><thead><tr>';  
 h += '<th style="width:30px">#</th>';  
 h += thClick('nome', 'ID');  
 h += thClick('tipo', 'Tipo' + ' ' + VC.tabelas.botao('tipo_terminal'));  
 h += '<th class="col-flex">Espaços</th>';  
 h += thClick('ramal', 'Ramal');  
 h += '<th>Fabricante</th><th>Família</th><th>Tamanho</th>';  
 h += thClick('Q', 'Q proj. (m³/h)');  
 h += '<th>Q_med TAB (m³/h)</th>';  
 h += '<th data-ajuda="v_saida">v (m/s)</th>';  
 h += '<th data-ajuda="dp_terminal">Δp (Pa)</th>';  
 h += '<th>Lw (dB(A))</th>';  
 h += '<th>Estado</th><th></th>';  
 h += '</tr></thead><tbody>';  
 VC.editorTerminais._listaFiltrada().forEach(function (t, visualIdx) {  
 const i = VC.dados.terminais.indexOf(t);  
 const v = VC.calculo.verificarTerminal(t);  
 const fabs = VC.catalogo.getFabricantes(t.tipo);  
 const fams = t.fabricante ? VC.catalogo.getFamilias(t.tipo, t.fabricante) : [];  
 const tams = (t.fabricante && t.familia) ? VC.catalogo.getTamanhos(t.tipo, t.fabricante, t.familia) : [];  
 const listaEsp = Array.isArray(t.espacos) ? t.espacos : [];  
 const espTxt = listaEsp.length ? listaEsp.map(function (x) { return VC.utils.esc(x.nome); }).join(', ') : '-';  
 h += '<tr onclick="this.closest(\'tbody\').querySelectorAll(\'tr\').forEach(r=>r.classList.remove(\'linha-destaque\')); this.classList.add(\'linha-destaque\')">' +  
 '<td class="center mono" style="font-weight:800;color:var(--texto-suave)">' + (visualIdx + 1) + '</td>' +  
 '<td><input value="' + VC.utils.esc(t.nome) + '" onchange="VC.editorTerminais.editar(' + i + ', \'nome\', this.value)" ' + dis + '></td>' +  
 '<td><input value="' + VC.utils.esc(t.tipo) + '" readonly></td>' +  
 '<td style="font-size:10.5px;color:var(--texto-med)">' + espTxt + '</td>' +  
 '<td><select onchange="VC.editorTerminais.editar(' + i + ', \'ramalRef\', this.value)" ' + dis + '><option value="">-</option>' + VC.dados.ramais.map(function (r) { return '<option value="' + VC.utils.esc(r.nome) + '"' + (r.nome === t.ramalRef ? ' selected' : '') + '>' + VC.utils.esc(r.nome) + '</option>'; }).join('') + '</select></td>' +  
 '<td><select onchange="VC.editorTerminais.editar(' + i + ', \'fabricante\', this.value)" ' + dis + '><option value="">-</option>' + fabs.map(function (f) { return '<option value="' + VC.utils.esc(f) + '"' + (f === t.fabricante ? ' selected' : '') + '>' + VC.utils.esc(f) + '</option>'; }).join('') + '</select></td>' +  
 '<td><select onchange="VC.editorTerminais.editar(' + i + ', \'familia\', this.value)" ' + dis + '><option value="">-</option>' + fams.map(function (f) { return '<option value="' + VC.utils.esc(f) + '"' + (f === t.familia ? ' selected' : '') + '>' + VC.utils.esc(f) + '</option>'; }).join('') + '</select></td>' +  
 '<td><select onchange="VC.editorTerminais.editar(' + i + ', \'tamanho\', this.value)" ' + dis + '><option value="">-</option>' + tams.map(function (x) { return '<option value="' + VC.utils.esc(x) + '"' + (x === t.tamanho ? ' selected' : '') + '>' + VC.utils.esc(x) + '</option>'; }).join('') + '</select></td>' +  
 '<td><span class="valor-derivado">' + VC.utils.fmt(t.Q, 0) + '</span></td>' +  
 '<td><input type="number" step="1" min="0" placeholder="—" value="' + (t.Q_medido != null ? t.Q_medido : '') + '" onchange="VC.editorTerminais.editar(' + i + ', \'Q_medido\', this.value)" title="Caudal medido em comissionamento TAB (m³/h)" style="background:#f0fdf4;border-color:#bbf7d0;font-weight:700;color:#166534" ' + dis + '></td>' +  
 '<td><input type="number" step="0.1" value="' + (t.v_saida || 0) + '" onchange="VC.editorTerminais.editar(' + i + ', \'v_saida\', this.value)" ' + dis + '></td>' +  
 '<td><b>' + VC.utils.fmt(v.dPCalc, 1) + '</b></td>' +  
 '<td><b>' + VC.utils.fmt(v.LwCalc, 1) + '</b></td>' +  
 '<td>' + (v.status === 'OK' ? '<span class="badge ok">OK</span>' : (v.status === 'ATENÇÃO' ? '<span class="badge atencao">ATENCAO</span>' : '<span class="badge erro">NAO CONF.</span>')) + '</td>' +  
 '<td style="text-align:center"><button class="btn btn-mini coral" onclick="event.stopPropagation(); VC.editorTerminais.eliminarUm(' + i + ')" ' + dis + '>x</button></td>' +  
 '</tr>';  
 });  
 h += '</tbody></table></div>';  
 return h;  
 },  
 editar(idx, campo, valor) {  
 const t = VC.dados.terminais[idx];  
 if (!t) return;  
 if (campo === 'v_saida') t[campo] = VC.utils.num(valor);  
 else if (campo === 'Q_medido') t.Q_medido = (valor === '' || valor == null) ? null : VC.utils.num(valor);  
 else t[campo] = valor;  
 if (campo === 'fabricante') { t.familia = ''; t.tamanho = ''; }  
 if (campo === 'familia') { t.tamanho = ''; }  
 VC.estado.sincronizar();  
 },  
 eliminarUm(idx) {  
 if (!confirm('Eliminar este terminal?')) return;  
 VC.dados.terminais.splice(idx, 1);  
 VC.estado.sincronizar();  
 }  
};  
  
/* ============================================================  
 §20.3 · EDITOR DE RAMAIS  
 ============================================================ */  
VC.editorRamais = VC.editorRamais || {  
 _filtroTexto: '',  
 setFiltro: function(v) { this._filtroTexto = String(v || '').toLowerCase(); if(VC._passoAtivo === 'rede') VC.passos.render('rede'); },  
 render() {  
 const dis = VC.dados.congelado ? 'disabled' : '';  
 let h = '<div class="cartao-titulo">Dimensionamento de Condutas</div>';  
 h += '<p style="font-size:11.5px;color:var(--texto-med);margin-bottom:10px">Edita L e zeta.</p>';  
 if (!VC.dados.ramais.length) return h + '<div class="vazio"><div class="vazio-titulo">Sem ramais</div></div>';  
  
 const filtro = this._filtroTexto;  
 let lista = VC.dados.ramais.slice();  
 if (filtro) {  
 lista = lista.filter(r => (r.nome || '').toLowerCase().includes(filtro) || (r.rede || '').toLowerCase().includes(filtro));  
 }  
  
 h += '<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;align-items:center">' +  
 '<button class="btn violeta" onclick="VC.optimizar.executar()" ' + dis + '>Optimizar</button>' +  
 '<button class="btn ambar" onclick="VC.decompor.executar(); VC.calculo.calcularTudo(); VC.passos.render(\'rede\');" ' + dis + '>Decompor</button>' +  
 '<input type="text" placeholder="Pesquisar ramal..." value="' + VC.utils.esc(filtro) + '" oninput="VC.editorRamais.setFiltro(this.value)" style="padding:4px 8px;border:1px solid var(--borda-media);border-radius:5px;font-size:11px;font-family:inherit;width:180px;margin-left:auto">' +  
 '</div>';  
  
 h += '<details style="margin-bottom:10px; background:var(--superf); border:1px solid var(--borda); border-radius:8px; padding:4px;"><summary style="cursor:pointer; font-weight:800; font-size:11.5px; color:var(--texto-med); padding:8px; background:var(--superf3); border-radius:6px; list-style:none; display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-gear"></i> Engenharia Avançada</summary>';  
 h += '<div class="tabela-wrap" style="margin-top:10px; border:none"><table class="tabela densa"><thead><tr>' +  
 '<th style="width:30px">#</th><th>Nome</th><th>Nível</th><th>L (m)</th>' +  
 '<th>ζ (–)</th>' +  
 '<th>Secção</th>' +  
 '<th>Q (m³/h)</th>' +  
 '<th>v (m/s)</th>' +  
 '<th>Re (–)</th>' +  
 '<th>Δp troço (Pa)</th>' +  
'<th>Δp acumulado (Pa)</th>' +  
'<th>Δp crítico (Pa)</th>' +  
 '<th>Ø travado</th><th>Estado</th>' +  
 '</tr></thead><tbody>';  
  
 const idxOriginal = new Map();  
 VC.dados.ramais.forEach((r, i) => idxOriginal.set(r, i));  
  
 lista.forEach(function (r, visualIdx) {  
 const i = idxOriginal.get(r);  
 const lock = r.lock && r.lock.D;  
 const nivelNum = r.nivelNumero || VC.utils.nivelTextoParaNumero(r.nivel || 'secundario');  
 h += '<tr onclick="this.closest(\'tbody\').querySelectorAll(\'tr\').forEach(r=>r.classList.remove(\'linha-destaque\')); this.classList.add(\'linha-destaque\')">' +  
 '<td class="center mono" style="font-weight:800;color:var(--texto-suave)">' + (visualIdx + 1) + '</td>' +  
 '<td><b>' + VC.utils.esc(r.nome) + '</b></td>' +  
 '<td><span class="badge nivel-r' + nivelNum + '" title="' + VC.utils.nivelRotulo(nivelNum, true) + '">' + VC.utils.nivelRotulo(nivelNum) + '</span></td>' +  
 '<td><input type="number" step="0.5" value="' + (r.L || 0) + '" onchange="VC.editorRamais.editar(' + i + ', \'L\', this.value)" ' + dis + '></td>' +  
 '<td><input type="number" step="0.1" value="' + VC.utils.fmt(r.zeta || 0, 1) + '" onchange="VC.editorRamais.editar(' + i + ', \'zeta\', this.value)" ' + dis + '></td>' +  
 '<td><select onchange="VC.editorRamais.editar(' + i + ', \'forma\', this.value)" ' + dis + ' style="font-size:11px">' +  
   '<option value="circular"' + (r.secaoAdotada !== 'retangular' ? ' selected' : '') + '>Circular</option>' +  
   '<option value="retangular"' + (r.secaoAdotada === 'retangular' ? ' selected' : '') + '>Retangular</option></select> ' +  
   '<b>' + VC.utils.esc(r.secaoCalc || (r.Dcom ? 'Ø' + r.Dcom : '-')) + '</b>' +  
   (r.avisoSecao ? ' <span title="' + VC.utils.esc(r.avisoSecao) + '" style="cursor:help;color:var(--ambar-esc)">⚠</span>' : '') + '</td>' +  
 '<td><span class="valor-derivado">' + VC.utils.fmt(r.Q, 0) + '</span></td>' +  
 '<td>' + VC.utils.fmt(r.v, 2) + '</td>' +  
 '<td>' + VC.utils.fmt(r.Re, 0) + '</td>' +  
 '<td>' + VC.utils.fmt(r.deltaPTroco, 1) + '</td>' +  
'<td>' + VC.utils.fmt(r.deltaPtotal, 1) + '</td>' +  
'<td><b>' + VC.utils.fmt(r.deltaPCritico, 1) + '</b></td>' +  
 '<td>' + (lock ? 'Travado' : 'Auto') + '</td>' +  
 '<td>' + (r.status === 'OK' ? '<span class="badge ok">OK</span>' : (r.status === 'ATENÇÃO' ? '<span class="badge atencao">ATENCAO</span>' : '<span class="badge erro">NAO CONF.</span>')) + '</td>' +  
 '</tr>';  
 });  
 h += '</tbody></table></div></details>';  
 return h;  
 },  
 editar(idx, campo, valor) {  
 const r = VC.dados.ramais[idx];  
 if (!r) return;  
 if (['L', 'zeta', 'Q'].indexOf(campo) >= 0) r[campo] = VC.utils.num(valor);  
 else if (campo === 'forma') r.geometriaInput = Object.assign({}, r.geometriaInput || {}, { forma: valor === 'retangular' ? 'retangular' : 'circular' });   // v11.1: escolha do utilizador  
 else r[campo] = valor;  
 VC.estado.sincronizar();  
 }  
};  

/* ============================================================
   v11.1 (4.3): ajudas contextuais e ecrã de Balanço de Ar.
   Vinham do remendo 16-bridge-v10-fixes.js (apagado); a ordem de carregamento é a mesma.
   ============================================================ */
if (!VC.tooltips) VC.tooltips = {};
if (!VC.tooltips.dicionario) VC.tooltips.dicionario = (VC.conhecimento && VC.conhecimento.tooltips) ? VC.conhecimento.tooltips : {};

if (!VC.tooltips._realImpl) {
  VC.tooltips._realImpl = true;
  /* v11.1: desenho do popup partilhado pelo hover (instalar) e pelo clique (mostrar) */
  VC.tooltips._desenhar = function (chave, x, y) {
    const info = (VC.conhecimento && VC.conhecimento.tooltips) ? VC.conhecimento.tooltips[chave] : null;
    const p = document.getElementById('ttPopup');
    if (!info || !p) return false;
    p.className = 'tt-popup on';
    let html = '<div class="tt-titulo">' + VC.utils.esc(info.titulo || chave) + '</div>';
    if (info.desc) html += '<div class="tt-desc">' + info.desc + '</div>';
    if (info.contexto) html += '<div class="tt-desc tt-contexto">' + info.contexto + '</div>';
    if (info.formula) html += '<div class="tt-formula">' + VC.utils.esc(info.formula) + '</div>';
    if (info.norma) html += '<div class="tt-norma">📘 ' + VC.utils.esc(info.norma) + '</div>';
    p.innerHTML = html;
    /* v11.3: posição pelo tamanho real do popup, para não sair do ecrã */
    const w = p.offsetWidth || 360, hh = p.offsetHeight || 200;
    p.style.left = Math.max(8, Math.min(x + 12, window.innerWidth - w - 8)) + 'px';
    p.style.top = Math.max(8, (y + 12 + hh > window.innerHeight) ? y - hh - 12 : y + 12) + 'px';
    return true;
  };

  VC.tooltips.instalar = function() {
    document.addEventListener('mouseover', (ev) => {
      const el = ev.target.closest('[data-tt],[data-tt-simbolo]');
      if (!el) return;
      VC.tooltips._desenhar(el.getAttribute('data-tt') || el.getAttribute('data-tt-simbolo'), ev.clientX, ev.clientY);
    });
    document.addEventListener('mouseout', (ev) => {
      if (!ev.target.closest('[data-tt],[data-tt-simbolo]')) return;
      const p = document.getElementById('ttPopup');
      if (p) p.classList.remove('on');
    });
  };

  /* v11.1: ajuda por clique nos botões "?" (necessária em ecrã tátil). Antes não existia e
     cada clique dava "VC.tooltips.mostrar is not a function". Fecha com novo clique ou Esc. */
  VC.tooltips.mostrar = function (chave, el) {
    const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : { right: 40, bottom: 40 };
    if (!VC.tooltips._desenhar(chave, r.right, r.bottom)) return;
    setTimeout(() => document.addEventListener('click', function fechar() {
      VC.tooltips.esconder();
      document.removeEventListener('click', fechar);
    }), 0);
  };

  VC.tooltips.esconder = function() {
    const p = document.getElementById('ttPopup');
    if (p) p.classList.remove('on');
  };

  VC.tooltips.reinstalar = function() {
  };
}

/* ============================================================
   v11.3: tabelas legíveis e ajudas consistentes.
   - Cada coluna técnica (grandeza, símbolo, norma) recebe o mesmo botão "?",
     em todas as tabelas da app: editores, relatórios, lentes, topologia.
     A chave vem do atributo data-ajuda do cabeçalho ou deste dicionário.
     data-ajuda="-" deixa a coluna sem ajuda.
   - As colunas só com números ficam alinhadas à direita (classe "num"), para
     que as casas decimais fiquem umas debaixo das outras.
   Corre sozinho sempre que aparece uma tabela nova (MutationObserver).
   ============================================================ */
VC.tabelas = {
  ajudaPorCabecalho: {
    'Tipo de espaço': 'tipo_espaco', 'Grupo': 'grupo_portaria', 'G': 'grupo_portaria',
    'A': 'area_geometrica', 'H': 'pe_direito', 'V': 'volume_espaco', 'N': 'ocupacao',
    'Localização': 'zona', 'Localizacao': 'zona', 'Zona': 'zona', 'Método': 'metodo_calculo',
    'T11': 'T11', 'T12': 'T12', 'ACH': 'ACH', 'RPH': 'RPH', 'Q_normas': 'Q_normas', 'Q EN 16798': 'Q_normas',
    'Q_ConTerm': 'Q_ConTerm', 'Q_conf_in': 'Q_ConTerm', 'Q_conf_out': 'Q_ConTerm',
    'QAI_projeto': 'QAI_projeto', 'QAI': 'QAI_projeto', 'QAI_in': 'QAI_projeto', 'QAI_out': 'QAI_projeto',
    'Q_total': 'Q_total', 'Q_in': 'Qin', 'Q_in dir.': 'Qin', 'Q_out': 'Qout', 'Q_out dir.': 'Qout',
    'Q_transf_in': 'Qtrf', 'Q_transf_out': 'Qtrf', 'Resíduo': 'residuo',
    'Rede': 'rede', 'Ramal': 'ramal', 'Nível': 'nivel_ramal', 'Nivel': 'nivel_ramal',
    'L': 'L', 'ζ': 'zeta', 'zeta': 'zeta', 'Secção': 'seccao', 'Ø': 'D', 'Q': 'Q', 'Q derivado': 'Q_derivado',
    'v': 'v', 'Re': 'Re', 'Δp troço': 'dp_troco', 'Δp acumulado': 'dp_acumulado', 'Δp crítico': 'dp_critico',
    'Lock D': 'lock_D', 'Ø travado': 'lock_D',
    'Q proj.': 'Q_terminal', 'Q_projeto': 'Q_terminal', 'Q_med': 'Q_medido', 'Q_medido': 'Q_medido',
    'Desvio': 'desvio_tab', 'Lw': 'Lw', 'Tamanho': 'catalogo_terminal',
    'Tipo (Ecodesign)': 'tipo_ecodesign', 'Δp externo': 'dp_externo', 'Δp interno': 'dp_interno',
    'Δp limpo': 'dp_filtro', 'Δp final': 'dp_filtro', 'SFPint': 'sfp', 'Limite SFPint': 'sfp_limite', 'P motor': 'P_motor',
    'Área': 'area_transferencia', 'ΔP': 'dp_transferencia'
  },
  /* o botão "?" (o mesmo em toda a app; o aspeto está no CSS, .btn-help) */
  botao(k) {
    return '<span class="btn-help" role="button" tabindex="0" aria-label="Ajuda" data-tt="' + k + '"'
      + ' onclick="event.stopPropagation(); VC.tooltips.mostrar(\'' + k + '\', this)"'
      + ' onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();this.click()}">?</span>';
  },
  /* texto do cabeçalho sem setas de ordenação, unidades entre parênteses nem "?" */
  rotulo(th) {
    const c = th.cloneNode(true);
    c.querySelectorAll('.btn-help').forEach(b => b.remove());
    let t = c.textContent.replace(/[▲▼?]/g, ''), a;
    do { a = t; t = t.replace(/\([^()]*\)/g, ''); } while (t !== a);   // "Lw (dB(A))" → "Lw"
    return t.replace(/\s+/g, ' ').trim();
  },
  chave(th) {
    if (th.hasAttribute('data-ajuda')) { const k = th.getAttribute('data-ajuda'); return k === '-' ? null : k; }
    return this.ajudaPorCabecalho[this.rotulo(th)] || null;
  },
  _numero: /^[−\-+]?\d[\d\s.,]*(\s?(%|m³\/h|m\/s|Pa|W|kW|mm|m|m²|m³|h⁻¹|kg|cm²|dB\(A\)))?$/,
  _celulaNumerica(td) {
    if (td.querySelector('input[type="number"]') && !td.querySelector('select, input:not([type="number"])')) return true;
    if (td.querySelector('input, select, button, .badge')) return false;
    const t = td.textContent.replace(/\s+/g, ' ').trim();
    if (t === '' || t === '—' || t === '-' || t === '–') return null;   // vazio: não decide
    return this._numero.test(t);
  },
  decorar(raiz) {
    const dic = (VC.conhecimento && VC.conhecimento.tooltips) || {};
    (raiz || document).querySelectorAll('table').forEach(tab => {
      if (tab.closest('.legenda-tabela, [data-sem-ajuda]')) return;
      const cab = tab.tHead ? tab.tHead.rows[tab.tHead.rows.length - 1] : null;
      if (!cab) return;
      const ths = [...cab.cells];
      ths.forEach(th => {
        if (th.querySelector('.btn-help')) return;
        const k = this.chave(th);
        if (k && dic[k]) th.insertAdjacentHTML('beforeend', ' ' + this.botao(k));
      });
      if (ths.some(th => th.colSpan > 1)) return;
      const linhas = [...(tab.tBodies[0] ? tab.tBodies[0].rows : [])].filter(r => r.cells.length === ths.length);
      if (!linhas.length) return;
      ths.forEach((th, i) => {
        let algum = false, todos = true;
        for (const r of linhas) { const n = this._celulaNumerica(r.cells[i]); if (n === null) continue; algum = true; if (!n) { todos = false; break; } }
        if (algum && todos) { th.classList.add('num'); linhas.forEach(r => r.cells[i].classList.add('num')); }
      });
    });
  },
  instalar() {
    if (this._obs || typeof MutationObserver === 'undefined') return;
    let pendente = false;
    this._obs = new MutationObserver(() => {
      if (pendente) return; pendente = true;
      requestAnimationFrame(() => { pendente = false; try { VC.tabelas.decorar(document); } catch (e) { if (VC.debug && VC.debug.aviso) VC.debug.aviso('VC.tabelas.decorar: ' + e.message); } });
    });
    this._obs.observe(document.body, { childList: true, subtree: true });
    this.decorar(document);
  }
};
if (document.body) VC.tabelas.instalar(); else document.addEventListener('DOMContentLoaded', () => VC.tabelas.instalar());

window.renderBalancoV6 = function () {  
 const bal = VC6.balanco.todos();  
 const ttBal = (k) => ' ' + VC.tabelas.botao(k);
let h = '<div class="cartao-titulo"><i class="fa-solid fa-scale-balanced"></i> Balanço de Ar</div>';   
h += '<p style="font-size:11.5px;color:var(--texto-med);margin-bottom:10px">Clica numa linha para ver o detalhe das parcelas (Conforto, QAI, Transferências).</p>';   
h += '<div class="tabela-wrap"><table class="tabela densa"><thead><tr>';   
h += '<th style="width:30px; text-align:center">#</th><th style="width:75px; text-align:center">Detalhes</th><th>Espaço</th><th style="width:50px; text-align:center">G' + ttBal('grupo_portaria') + '</th><th style="width:110px; text-align:right">Q_in (m³/h)' + ttBal('Qin') + '</th><th style="width:110px; text-align:right">Q_out (m³/h)' + ttBal('Qout') + '</th><th style="width:110px; text-align:right">Resíduo ΔQ (m³/h)' + ttBal('residuo') + '</th><th style="width:80px; text-align:center">Estado</th>';  
 h += '</tr></thead><tbody>';  
 bal.forEach((b, idx) => {
    const qai = Number(b.QAI_aplicado)||0;
    const qaiIn = b.QAI_rede==='insuflacao' ? qai : 0;
    const qaiOut = (b.QAI_rede==='extracao'||b.QAI_rede==='extracao_suja') ? qai : 0;
    const qInTotal = (b.Q_in_direto||0) + (b.Q_conforto_in||0) + qaiIn + (b.Q_transf_in||0);
    const qOutTotal = (b.Q_out_direto||0) + (b.Q_conforto_out||0) + qaiOut + (b.Q_transf_out||0);
    const corResiduo = Math.abs(b.residuo) <= 5 ? 'var(--verde-esc)' : (Math.abs(b.residuo) <= 10 ? 'var(--ambar-esc)' : 'var(--coral-esc)');
    
h += `<tr class="linha-balanco" onclick="this.closest('tbody').querySelectorAll('tr').forEach(r=>r.classList.remove('linha-destaque'));this.classList.add('linha-destaque'); document.getElementById('det-balc-${idx}').classList.toggle('oculto')" style="cursor:pointer">`;  
 h += `<td class="center mono" style="font-weight:800;color:var(--texto-suave)">${idx + 1}</td>`;  
 h += `<td style="text-align:center;"><span style="font-size:9px; font-weight:800; color:var(--primario-esc); background:var(--primario-soft); padding:3px 6px; border-radius:4px; display:inline-flex; align-items:center; gap:4px; border:1px solid var(--primario-borda);" title="Ver parcelas de caudal"><i class="fa-solid fa-chevron-down"></i> VER</span></td>`;  
 h += `<td><b>${VC.utils.esc(b.nome)}</b></td>`;  
 h += `<td style="text-align:center">G${b.g}</td>`;  
 h += `<td style="text-align:right; font-family:ui-monospace,monospace">${VC.utils.fmt(qInTotal, 1)}</td>`;  
 h += `<td style="text-align:right; font-family:ui-monospace,monospace">${VC.utils.fmt(qOutTotal, 1)}</td>`;  
 h += `<td style="text-align:right; font-family:ui-monospace,monospace; font-weight:900; color:${corResiduo}">${b.residuo >= 0 ? '+' : ''}${VC.utils.fmt(b.residuo, 1)}</td>`;  
 h += `<td style="text-align:center">${b.estado === 'OK' ? '<span class="badge ok">OK</span>' : b.estado==='DESEQUILIBRIO_LEVE' ? '<span class="badge atencao">LEVE</span>' : '<span class="badge erro">GRAVE</span>'}</td>`;  
 h += `</tr>`;
    
    h += `<tr id="det-balc-${idx}" class="oculto" style="background:var(--superf2); font-size:10.5px">`;
    h += `<td></td><td></td>`;
    h += `<td colspan="6" style="padding:10px 14px; border-bottom:1px solid var(--borda-media)">`;
    h += `<div style="display:grid; grid-template-columns:1fr 1fr; gap:20px">`;
    h += `<div><b style="color:var(--primario-esc); text-transform:uppercase; font-size:9.5px; display:block; margin-bottom:4px">Entradas (Q_in)</b>`;
    h += `<div style="display:flex; justify-content:space-between"><span>Insuflação Direta:</span> <span style="font-family:ui-monospace">${VC.utils.fmt(b.Q_in_direto,1)} m³/h</span></div>`;
    if (b.Q_conforto_in) h += `<div style="display:flex; justify-content:space-between"><span>F-RPH (Conforto):</span> <span style="font-family:ui-monospace">${VC.utils.fmt(b.Q_conforto_in,1)} m³/h</span></div>`;
    if (qaiIn) h += `<div style="display:flex; justify-content:space-between"><span>QAI Projeto:</span> <span style="font-family:ui-monospace; color:#b88a4a">${VC.utils.fmt(qaiIn,1)} m³/h</span></div>`;
    if (b.Q_transf_in) h += `<div style="display:flex; justify-content:space-between"><span>Transferências (Entrada):</span> <span style="font-family:ui-monospace; color:var(--ambar-esc)">${VC.utils.fmt(b.Q_transf_in,1)} m³/h</span></div>`;
    h += `</div>`;
    h += `<div><b style="color:var(--verde-esc); text-transform:uppercase; font-size:9.5px; display:block; margin-bottom:4px">Saídas (Q_out)</b>`;
    h += `<div style="display:flex; justify-content:space-between"><span>Extração Direta:</span> <span style="font-family:ui-monospace">${VC.utils.fmt(b.Q_out_direto,1)} m³/h</span></div>`;
    if (b.Q_conforto_out) h += `<div style="display:flex; justify-content:space-between"><span>F-RPH (Conforto):</span> <span style="font-family:ui-monospace">${VC.utils.fmt(b.Q_conforto_out,1)} m³/h</span></div>`;
    if (qaiOut) h += `<div style="display:flex; justify-content:space-between"><span>QAI Projeto:</span> <span style="font-family:ui-monospace; color:#b88a4a">${VC.utils.fmt(qaiOut,1)} m³/h</span></div>`;
    if (b.Q_transf_out) h += `<div style="display:flex; justify-content:space-between"><span>Transferências (Saída):</span> <span style="font-family:ui-monospace; color:var(--ambar-esc)">${VC.utils.fmt(b.Q_transf_out,1)} m³/h</span></div>`;
    h += `</div>`;
    h += `</div>`;
    h += `</td></tr>`;
  });
  h += '</tbody></table></div>';
  return h;
};

// instala os popups de ajuda ao passar o rato (o remendo fazia-o 500 ms depois do arranque)
setTimeout(function () { if (VC.tooltips.instalar) VC.tooltips.instalar(); }, 500);
})();
