/* ============================================================
   VentiCondutas v11.3 · Planta como entrada de dados (PR 2: espaços)
   ------------------------------------------------------------
   · Uma imagem (PNG/JPG) por piso, comprimida e guardada no projeto.
   · Calibrar a escala: 2 cliques numa cota conhecida + a medida em metros.
   · Desenhar o espaço (retângulo ou polígono): a área sai da escala.
   · O desenho cria um espaço novo ou liga-se a um que já está na tabela.
   · Clicar numa sala seleciona o espaço; a lista ao lado localiza-o.
   · Colorir por grupo G1–G4, por dados em falta ou pelo balanço.
   Dados: VC.dados.plantas = [{ id, nome, imagem, w, h, escala }] (escala em m por píxel
   da imagem) e, em cada espaço, espaco.planta = { pisoId, pts: [[x, y], …] }.
   A planta não entra no cálculo: só ajuda a entrar e a ver os dados.
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('18-planta');

const esc = s => VC.utils.esc(s);
const fmt = (n, d) => VC.utils.fmt(n, d == null ? 2 : d);
const LADO_MAX = 2400;          // a imagem é reduzida a 2400 px no lado maior
const QUALIDADE = 0.82;         // JPEG

if (!Array.isArray(VC.dados.plantas)) VC.dados.plantas = [];

VC.planta = {
  piso: null, ferramenta: 'sel', zoom: null, rascunho: [], ponteiro: null,
  selecionado: null, pendente: null, escalaPts: [], corPor: 'grupo',

  /* ── geometria ───────────────────────────── */
  areaPx(pts) {   // fórmula do laço (shoelace), em píxeis²
    let s = 0;
    for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; s += x1 * y2 - x2 * y1; }
    return Math.abs(s) / 2;
  },
  areaM2(pts, piso) { return piso && piso.escala ? this.areaPx(pts) * piso.escala * piso.escala : null; },
  centro(pts) { const n = pts.length || 1; return [pts.reduce((s, p) => s + p[0], 0) / n, pts.reduce((s, p) => s + p[1], 0) / n]; },
  pisoAtual() { const P = VC.dados.plantas || []; return P.find(p => p.id === this.piso) || P[0] || null; },
  espacosDoPiso(piso) { return (VC.dados.espacos || []).filter(e => e.planta && piso && e.planta.pisoId === piso.id && Array.isArray(e.planta.pts) && e.planta.pts.length >= 3); },
  _bloqueado() { if (VC.dados.congelado) { VC.ui.toast('Projeto congelado: reabra para editar.'); return true; } return false; },

  /* ── pisos e imagem ──────────────────────── */
  adicionarPiso() {
    if (this._bloqueado()) return;
    const n = (VC.dados.plantas || []).length;
    const p = { id: 'piso' + Date.now().toString(36), nome: n === 0 ? 'Piso 0' : (n === 1 ? 'Piso 1' : 'Piso ' + n), imagem: null, w: 0, h: 0, escala: null };
    VC.dados.plantas.push(p); this.piso = p.id; this.zoom = null; this.redesenhar();
  },
  renomearPiso(nome) { const p = this.pisoAtual(); if (p && String(nome).trim()) { p.nome = String(nome).trim(); this.redesenhar(); } },
  escolherImagem() {
    if (this._bloqueado()) return;
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/png,image/jpeg';
    inp.onchange = e => { const f = e.target.files && e.target.files[0]; if (f) this.lerImagem(f); };
    inp.click();
  },
  lerImagem(ficheiro) {
    if (!/^image\/(png|jpe?g)$/i.test(ficheiro.type || '')) { VC.ui.toast('Use uma imagem PNG ou JPG. Um PDF exporta-se primeiro para imagem.'); return; }
    const r = new FileReader();
    r.onload = ev => this.usarImagem(ev.target.result);
    r.readAsDataURL(ficheiro);
  },
  /* reduz e comprime a imagem para caber no ficheiro do projeto */
  usarImagem(dataURL) {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, LADO_MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * k), h = Math.round(img.height * k);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h);
        let p = this.pisoAtual(); if (!p) { this.adicionarPiso(); p = this.pisoAtual(); }
        const escAntiga = p.escala && p.w ? p.escala * p.w / w : null;   // manter a escala se a imagem só mudou de resolução
        p.imagem = c.toDataURL('image/jpeg', QUALIDADE); p.w = w; p.h = h; p.escala = escAntiga;
        this.zoom = null; this.redesenhar();
        VC.ui.toast('Planta carregada (' + Math.round(p.imagem.length / 1024) + ' kB). ' + (p.escala ? '' : 'Calibre a escala.'));
        res(p);
      };
      img.onerror = () => { VC.ui.toast('Não foi possível ler a imagem.'); res(null); };
      img.src = dataURL;
    });
  },
  removerPiso() {
    const p = this.pisoAtual(); if (!p || this._bloqueado()) return;
    const n = this.espacosDoPiso(p).length;
    if (!confirm('Remover «' + p.nome + '» e a sua imagem?' + (n ? ' Os ' + n + ' espaços ficam na tabela, só perdem o desenho.' : ''))) return;
    (VC.dados.espacos || []).forEach(e => { if (e.planta && e.planta.pisoId === p.id) delete e.planta; });
    VC.dados.plantas = VC.dados.plantas.filter(x => x !== p); this.piso = null; this.selecionado = null; this.redesenhar();
  },
  setPiso(id) { this.piso = id; this.zoom = null; this.selecionado = null; this.pendente = null; this.rascunho = []; this.redesenhar(); },

  /* ── ferramentas ─────────────────────────── */
  setFerramenta(f) { this.ferramenta = f; this.rascunho = []; this.escalaPts = []; this.pendente = null; this.redesenhar(); },
  setZoom(z) { this.zoom = Math.max(0.05, Math.min(4, z)); this.redesenhar(); },
  ajustar() { this.zoom = null; this.redesenhar(); },
  setCor(m) { this.corPor = m; this.redesenhar(); },
  aplicarEscala(metros) {
    const p = this.pisoAtual(); const m = VC.utils.num(metros);
    if (!p || this.escalaPts.length !== 2 || !(m > 0)) { VC.ui.toast('Clique nas duas pontas da cota e escreva a medida em metros.'); return; }
    const [[x1, y1], [x2, y2]] = this.escalaPts; const px = Math.hypot(x2 - x1, y2 - y1);
    if (px < 5) { VC.ui.toast('Os dois pontos estão demasiado próximos.'); return; }
    p.escala = m / px; this.escalaPts = []; this.ferramenta = 'sel';
    VC.ui.toast('Escala: 1 m = ' + fmt(1 / p.escala, 1) + ' px da imagem.');
    this.redesenhar();
  },
  fecharPoligono() {
    if (this.rascunho.length < 3) { VC.ui.toast('Um polígono precisa de pelo menos 3 pontos.'); return; }
    this.pendente = this.rascunho.slice(); this.rascunho = []; this.redesenhar();
  },
  cancelar() { this.rascunho = []; this.escalaPts = []; this.pendente = null; this.redesenhar(); },

  /* ── ligar o desenho a um espaço ─────────── */
  ligarDesenho(idEsp, usarArea) {
    const p = this.pisoAtual(); const e = (VC.dados.espacos || []).find(x => String(x.id) === String(idEsp));
    if (!p || !e || !this.pendente || this._bloqueado()) return;
    e.planta = { pisoId: p.id, pts: this.pendente.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]) };
    const A = this.areaM2(e.planta.pts, p);
    this.pendente = null; this.selecionado = e.id;
    if (usarArea && A) this._definirArea(e, A); else this._guardar('desenho de «' + e.nome + '»');
    VC.ui.toast('«' + e.nome + '» ligado à planta' + (usarArea && A ? ' · A = ' + fmt(A) + ' m²' : '') + '.');
    this.redesenhar();
  },
  criarEspaco(nome, tipo, usarArea) {
    const p = this.pisoAtual(); nome = String(nome || '').trim();
    if (!p || !this.pendente || this._bloqueado()) return;
    if (!nome) { VC.ui.toast('Escreva o nome do espaço.'); return; }
    if ((VC.dados.espacos || []).some(e => String(e.nome).trim().toLowerCase() === nome.toLowerCase())) { VC.ui.toast('Já existe um espaço «' + nome + '». Escolha-o na lista para o ligar.'); return; }
    const Hs = (VC.dados.espacos || []).map(e => Number(e.H)).filter(h => h > 0).sort((a, b) => a - b);
    const H = Hs.length ? Hs[Math.floor(Hs.length / 2)] : 3;   // pé-direito mais comum no projeto
    const A = usarArea ? (this.areaM2(this.pendente, p) || 0) : 0;
    const e = {
      id: VC.dados.nextId.espaco++, nome, tipo: tipo || 'Escritório', zona: p.nome, localizacao: VC.utils.parseZona ? VC.utils.parseZona(p.nome) : {}, geometriaMetodo: 'AH',
      A: Math.round(A * 100) / 100, H, V: Math.round(A * H * 100) / 100, N: 0, origem: 'Planta', definicoes: [], ramalRefInsuflacao: '', ramalRefExtracao: '',
      balanco: { Q_in_direto: 0, Q_out_direto: 0, Q_conforto_in: 0, Q_conforto_out: 0, QAI_aplicado: 0, QAI_rede: 'insuflacao', Q_transf_in: 0, Q_transf_out: 0, exfiltracao: 0, residuo: 0, pressao_relativa_Pa: 0, estado: 'PENDENTE' },
      transferencias: [], rphDefault: 0, rphAplicado: 0, rphOrigem: 'norma', Q_ConTerm: 0, QAI_projeto: 0, QAI_projeto_origem: 'norma', QAI_projeto_motivo: '', QAI_projeto_rede: 'auto', Q_total: 0,
      planta: { pisoId: p.id, pts: this.pendente.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]) }
    };
    if (VC.rph && VC.rph.aplicarDefaultSeVazio) VC.rph.aplicarDefaultSeVazio(e);
    if (VC.qai && VC.qai.aplicarDefaultSeVazio) VC.qai.aplicarDefaultSeVazio(e);
    VC.dados.espacos.push(e);
    if (VC.editorEspacos) VC.editorEspacos._cacheOrdenacao = { chave: null, lista: null };
    this.pendente = null; this.selecionado = e.id;
    this._guardar('novo espaço «' + nome + '» na planta');
    VC.ui.toast('Espaço «' + nome + '» criado' + (A ? ' com ' + fmt(A) + ' m²' : '') + '. Falta a ocupação (N) na tabela.');
    this.redesenhar();
  },
  usarAreaMedida(idEsp) {
    const e = (VC.dados.espacos || []).find(x => String(x.id) === String(idEsp)); const p = this.pisoAtual();
    if (!e || !e.planta || this._bloqueado()) return;
    const A = this.areaM2(e.planta.pts, p); if (!A) return;
    this._definirArea(e, A); VC.ui.toast('«' + e.nome + '»: A = ' + fmt(A) + ' m² (medida na planta).'); this.redesenhar();
  },
  apagarDesenho(idEsp) {
    const e = (VC.dados.espacos || []).find(x => String(x.id) === String(idEsp));
    if (!e || this._bloqueado()) return;
    delete e.planta; this.selecionado = null; this._guardar('desenho apagado'); this.redesenhar();
  },
  _definirArea(e, A) {
    const idx = VC.dados.espacos.indexOf(e);
    if (VC.editorEspacos && typeof VC.editorEspacos.editarCampo === 'function') VC.editorEspacos.editarCampo(idx, 'A', String(Math.round(A * 100) / 100));
    else { e.A = Math.round(A * 100) / 100; this._guardar('área'); }
  },
  _guardar(motivo) {
    if (VC.historico && VC.historico.push) VC.historico.push(motivo);
    if (VC.estado && VC.estado.forcarSync) VC.estado.forcarSync();
  },
  selecionar(id) { this.selecionado = id; this.pendente = null; this.redesenhar(); },
  verNaTabela(id) {
    const idx = (VC.dados.espacos || []).findIndex(e => String(e.id) === String(id));
    VC.nav.setVista('passo');
    setTimeout(() => {
      const inp = document.querySelector('#tabelaEspacos [data-idx="' + idx + '"]');
      const tr = inp && inp.closest('tr');
      if (tr) { tr.classList.add('linha-destaque'); tr.scrollIntoView({ block: 'center' }); }
    }, 50);
  },

  /* ── cores ───────────────────────────────── */
  PALETA: { 1: ['#dbe6f1', '#4f6d8c'], 2: ['#e7ecf1', '#64748b'], 3: ['#ebe6f5', '#6b5b95'], 4: ['#f3e1e1', '#a14b4b'] },
  _falta(e) {
    const c = VC.calculo.calcularQEspaco(e);
    const m = [];
    if (!(Number(e.A) > 0)) m.push('área');
    if (!(Number(e.H) > 0)) m.push('pé-direito');
    if (Number(c.g) === 1 && !(Number(e.N) > 0)) m.push('ocupação (N)');
    return m;
  },
  cor(e) {
    if (this.corPor === 'falta') return this._falta(e).length ? ['#fbecc8', '#9a6a12'] : ['#eef2f7', '#94a3b8'];
    if (this.corPor === 'balanco') {
      const b = (VC6.balanco && VC6.balanco.todos ? VC6.balanco.todos() : []).find(x => x.id === e.id || x.nome === e.nome);
      return b && Math.abs(Number(b.residuo) || 0) > 5 ? ['#fbecc8', '#9a6a12'] : ['#e3f0e7', '#3f7a52'];
    }
    const g = e.grupoForcado || VC.calculo.calcularQEspaco(e).g || 1;
    return this.PALETA[g] || this.PALETA[1];
  },
  _legenda() {
    if (this.corPor === 'falta') return [['falta um dado', ['#fbecc8', '#9a6a12']], ['completo', ['#eef2f7', '#94a3b8']]];
    if (this.corPor === 'balanco') return [['|ΔQ| ≤ 5 m³/h', ['#e3f0e7', '#3f7a52']], ['desequilibrado', ['#fbecc8', '#9a6a12']]];
    return [['G1 ocupação', this.PALETA[1]], ['G2 transferência', this.PALETA[2]], ['G3 baixa emissão', this.PALETA[3]], ['G4 extração', this.PALETA[4]]];
  },

  /* ── desenho do ecrã ─────────────────────── */
  FERRAMENTAS: [['sel', 'fa-arrow-pointer', 'Selecionar'], ['escala', 'fa-ruler', 'Escala'], ['ret', 'fa-vector-square', 'Retângulo'], ['pol', 'fa-draw-polygon', 'Polígono']],
  DICAS: {
    sel: 'Clique numa sala para a selecionar. A lista ao lado localiza cada espaço.',
    escala: 'Clique nas duas pontas de uma cota conhecida e escreva a medida no painel.',
    ret: 'Arraste para desenhar um retângulo por cima da sala.',
    pol: 'Clique nos cantos da sala. Para fechar: clique no primeiro ponto, duplo clique ou Enter. Esc cancela.'
  },
  render() {
    const P = VC.dados.plantas || [];
    const p = this.pisoAtual(); if (p) this.piso = p.id;
    let h = '<div class="planta">';
    h += '<div class="planta-barra" role="toolbar" aria-label="Planta">';
    h += '<div class="planta-pisos" role="tablist" aria-label="Pisos">' + P.map(x => '<button role="tab" aria-selected="' + (p && x.id === p.id) + '" class="planta-piso' + (p && x.id === p.id ? ' ativo' : '') + '" onclick="VC.planta.setPiso(\'' + x.id + '\')">' + esc(x.nome) + '</button>').join('')
      + '<button class="planta-piso planta-mais" onclick="VC.planta.adicionarPiso()" aria-label="Adicionar piso">+ Piso</button></div>';
    if (p && p.imagem) {
      const F = this.FERRAMENTAS;
      h += '<div class="planta-ferr">' + F.map(([id, ic, nome]) => '<button class="planta-f' + (this.ferramenta === id ? ' ativo' : '') + '" aria-pressed="' + (this.ferramenta === id) + '" onclick="VC.planta.setFerramenta(\'' + id + '\')"><i class="fa-solid ' + ic + '"></i> ' + nome + '</button>').join('') + '</div>';
      h += '<div class="planta-zoom"><button class="btn btn-mini" onclick="VC.planta.setZoom((VC.planta.zoom||1)/1.25)" aria-label="Afastar">−</button><span>' + Math.round((this.zoom || 1) * 100) + '%</span><button class="btn btn-mini" onclick="VC.planta.setZoom((VC.planta.zoom||1)*1.25)" aria-label="Aproximar">+</button><button class="btn btn-mini" onclick="VC.planta.ajustar()">Ajustar</button></div>';
      h += '<label class="planta-corlbl">Colorir por <select onchange="VC.planta.setCor(this.value)">'
        + [['grupo', 'Grupo G1–G4'], ['falta', 'Dados em falta'], ['balanco', 'Balanço ΔQ']].map(([v, t]) => '<option value="' + v + '"' + (this.corPor === v ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></label>';
    }
    h += '</div>';
    if (!p) {
      h += '<div class="planta-vazia"><i class="fa-solid fa-map"></i><h3>Use a planta para entrar os espaços</h3><p>Carregue uma imagem de cada piso (PNG ou JPG), calibre a escala numa cota e desenhe as salas. A área é medida e o espaço fica ligado à tabela. Tudo continua a poder entrar pela tabela.</p><button class="btn primario" onclick="VC.planta.adicionarPiso();VC.planta.escolherImagem()"><i class="fa-solid fa-image"></i> Escolher imagem da planta</button></div></div>';
      return h;
    }
    if (!p.imagem) {
      h += '<div class="planta-vazia"><i class="fa-solid fa-image"></i><h3>' + esc(p.nome) + ' ainda sem imagem</h3><p>PNG ou JPG. Uma planta em PDF exporta-se primeiro para imagem (por exemplo, com a captura de ecrã ou "Exportar como imagem").</p>'
        + '<div class="planta-nome"><label for="plantaNomePiso">Nome do piso</label><input id="plantaNomePiso" value="' + esc(p.nome) + '" onchange="VC.planta.renomearPiso(this.value)"></div>'
        + '<button class="btn primario" onclick="VC.planta.escolherImagem()"><i class="fa-solid fa-image"></i> Escolher imagem</button> <button class="btn" onclick="VC.planta.removerPiso()">Remover este piso</button></div></div>';
      return h;
    }
    h += '<div class="planta-dica" id="plantaDica"><b>' + (this.FERRAMENTAS.find(f => f[0] === this.ferramenta) || ['sel', '', 'Selecionar'])[2] + ':</b> ' + this.DICAS[this.ferramenta]
      + '<span class="planta-escala">' + (p.escala ? 'Escala: 1 m = ' + fmt(1 / p.escala, 1) + ' px' : '<b>Sem escala</b>: as áreas não podem ser medidas') + '</span></div>';
    h += '<div class="planta-corpo"><div class="planta-tela" id="plantaTela">' + this._svg(p) + '</div><aside class="planta-painel" aria-label="Espaço e lista">' + this._painel(p) + '</aside></div>';
    h += '<div class="planta-legenda">' + this._legenda().map(([t, c]) => '<span><i style="background:' + c[0] + ';border-color:' + c[1] + '"></i>' + t + '</span>').join('') + '</div>';
    h += '</div>';
    return h;
  },
  _svg(p) {
    const z = this.zoom || 1, fs = 13 / z, sw = 1.5;
    let s = '<svg id="plantaSVG" width="' + Math.round(p.w * z) + '" height="' + Math.round(p.h * z) + '" viewBox="0 0 ' + p.w + ' ' + p.h + '" role="img" aria-label="Planta de ' + esc(p.nome) + '">';
    s += '<image href="' + p.imagem + '" x="0" y="0" width="' + p.w + '" height="' + p.h + '" preserveAspectRatio="none"/>';
    this.espacosDoPiso(p).forEach(e => {
      const c = this.cor(e), on = String(this.selecionado) === String(e.id);
      const pts = e.planta.pts.map(q => q.join(',')).join(' ');
      const [cx, cy] = this.centro(e.planta.pts); const A = this.areaM2(e.planta.pts, p);
      s += '<g class="planta-sala' + (on ? ' sel' : '') + '" data-esp="' + e.id + '"><polygon points="' + pts + '" fill="' + c[0] + '" fill-opacity="0.72" stroke="' + c[1] + '" stroke-width="' + (on ? 3.5 : sw) + '" vector-effect="non-scaling-stroke"/>'
        + '<text x="' + cx + '" y="' + cy + '" font-size="' + fs + '" text-anchor="middle" font-weight="700" fill="#1e293b">' + esc(e.nome) + '</text>'
        + (this._rotuloQ ? '<text x="' + cx + '" y="' + (cy + fs * 1.2) + '" font-size="' + (fs * 0.9) + '" text-anchor="middle" fill="#334155">' + fmt(VC.calculo.calcularQEspaco(e).Q_total, 0) + ' m³/h</text>' : (A ? '<text x="' + cx + '" y="' + (cy + fs * 1.2) + '" font-size="' + (fs * 0.9) + '" text-anchor="middle" fill="#334155">' + fmt(A) + ' m²</text>' : '')) + '</g>';
    });
    if (this.pendente) s += '<polygon points="' + this.pendente.map(q => q.join(',')).join(' ') + '" fill="#4f6d8c" fill-opacity="0.15" stroke="#4f6d8c" stroke-width="2.5" stroke-dasharray="6 4" vector-effect="non-scaling-stroke"/>';
    const pr = this.rascunho.concat(this.ponteiro && this.ferramenta === 'pol' && this.rascunho.length ? [this.ponteiro] : []);
    if (pr.length) s += '<polyline id="plantaRascunho" points="' + pr.map(q => q.join(',')).join(' ') + '" fill="none" stroke="#4f6d8c" stroke-width="2.5" vector-effect="non-scaling-stroke"/>' + this.rascunho.map((q, i) => '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="' + (i === 0 ? 7 : 4) / z + '" fill="' + (i === 0 ? '#fff' : '#4f6d8c') + '" stroke="#4f6d8c" stroke-width="2" vector-effect="non-scaling-stroke"/>').join('');
    else s += '<polyline id="plantaRascunho" points="" fill="none" stroke="#4f6d8c" stroke-width="2.5" vector-effect="non-scaling-stroke"/>';
    if (this.escalaPts.length) s += '<polyline points="' + this.escalaPts.map(q => q.join(',')).join(' ') + '" stroke="#9a6a12" stroke-width="3" vector-effect="non-scaling-stroke" fill="none"/>' + this.escalaPts.map(q => '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="' + 6 / z + '" fill="#9a6a12"/>').join('');
    return s + '</svg>';
  },
  _opcoesTipo(sel) {
    return Object.keys(VC.tiposEspaco || {}).sort((a, b) => a.localeCompare(b, 'pt')).map(t => '<option' + (t === sel ? ' selected' : '') + '>' + esc(t) + '</option>').join('');
  },
  _painel(p) {
    let h = '';
    if (this.ferramenta === 'escala' && this.escalaPts.length === 2) {
      const [[x1, y1], [x2, y2]] = this.escalaPts;
      h += '<div class="planta-card destaque"><div class="planta-card-t">Calibrar a escala</div><p>Linha de ' + Math.round(Math.hypot(x2 - x1, y2 - y1)) + ' px na imagem.</p>'
        + '<label for="plantaMetros">Medida real (m)</label><input id="plantaMetros" type="number" step="0.01" min="0" placeholder="ex.: 6,00" onkeydown="if(event.key===\'Enter\')VC.planta.aplicarEscala(this.value)">'
        + '<div class="planta-acoes"><button class="btn primario" onclick="VC.planta.aplicarEscala(document.getElementById(\'plantaMetros\').value)">Aplicar</button><button class="btn" onclick="VC.planta.cancelar()">Cancelar</button></div></div>';
    }
    if (this.pendente) {
      const A = this.areaM2(this.pendente, p);
      const semDesenho = (VC.dados.espacos || []).filter(e => !e.planta).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
      h += '<div class="planta-card destaque"><div class="planta-card-t">Novo desenho</div><p>Área medida: <b>' + (A ? fmt(A) + ' m²' : '— (calibre a escala)') + '</b></p>'
        + (A ? '<label class="planta-chk"><input type="checkbox" id="plantaUsarA" checked> Usar a área medida no espaço</label>' : '')
        + '<label for="plantaLigar">Ligar a um espaço da tabela</label><select id="plantaLigar"><option value="">— escolher —</option>' + semDesenho.map(e => '<option value="' + e.id + '">' + esc(e.nome) + (Number(e.A) > 0 ? ' · ' + fmt(e.A) + ' m²' : '') + '</option>').join('') + '</select>'
        + '<div class="planta-acoes"><button class="btn primario" onclick="VC.planta.ligarDesenho(document.getElementById(\'plantaLigar\').value, (document.getElementById(\'plantaUsarA\')||{}).checked)">Ligar</button></div>'
        + '<div class="planta-ou">ou criar um espaço novo</div>'
        + '<label for="plantaNovoNome">Nome</label><input id="plantaNovoNome" placeholder="ex.: Sala ' + esc(p.nome.replace('Piso ', 'P')) + '-N1">'
        + '<label for="plantaNovoTipo">Tipo</label><select id="plantaNovoTipo">' + this._opcoesTipo('Escritório') + '</select>'
        + '<div class="planta-acoes"><button class="btn primario" onclick="VC.planta.criarEspaco(document.getElementById(\'plantaNovoNome\').value, document.getElementById(\'plantaNovoTipo\').value, (document.getElementById(\'plantaUsarA\')||{}).checked)">Criar espaço</button><button class="btn" onclick="VC.planta.cancelar()">Cancelar</button></div></div>';
    }
    const e = !this.pendente && (VC.dados.espacos || []).find(x => String(x.id) === String(this.selecionado));
    if (e && e.planta) {
      const A = this.areaM2(e.planta.pts, p), At = Number(e.A) || 0, c = VC.calculo.calcularQEspaco(e), falta = this._falta(e);
      const difere = A && Math.abs(A - At) > Math.max(0.05, At * 0.01);
      h += '<div class="planta-card"><div class="planta-card-t">' + esc(e.nome) + '</div>'
        + '<div class="planta-kpis"><div><span>Área na tabela</span><b>' + fmt(At) + ' m²</b></div><div><span>Área medida</span><b>' + (A ? fmt(A) + ' m²' : '—') + '</b></div><div><span>Q_total</span><b>' + fmt(c.Q_total, 0) + ' m³/h</b></div></div>'
        + '<p class="planta-meta">' + esc(e.tipo || '—') + ' · G' + (e.grupoForcado || c.g || '?') + ' · ' + esc(e.zona || '') + '</p>'
        + (falta.length ? '<p class="planta-aviso">Falta: ' + falta.join(', ') + '.</p>' : '')
        + '<div class="planta-acoes">' + (difere ? '<button class="btn primario" onclick="VC.planta.usarAreaMedida(' + e.id + ')">Usar área medida</button>' : '')
        + '<button class="btn" onclick="VC.planta.verNaTabela(' + e.id + ')">Ver na tabela</button><button class="btn" onclick="VC.planta.apagarDesenho(' + e.id + ')">Apagar desenho</button></div></div>';
    }
    const lista = this.espacosDoPiso(p).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
    const nSem = (VC.dados.espacos || []).filter(x => !x.planta).length;
    h += '<div class="planta-lista-t">Espaços desenhados em ' + esc(p.nome) + ' (' + lista.length + ')</div><div class="planta-lista">'
      + (lista.length ? lista.map(x => { const c = this.cor(x), on = String(this.selecionado) === String(x.id), A = this.areaM2(x.planta.pts, p);
        return '<button class="planta-item' + (on ? ' ativo' : '') + '" onclick="VC.planta.selecionar(' + x.id + ')"><i style="background:' + c[0] + ';border-color:' + c[1] + '"></i><span>' + esc(x.nome) + '</span><b>' + (A ? fmt(A, 1) : fmt(x.A, 1)) + ' m²</b></button>'; }).join('') : '<p class="planta-meta">Ainda nenhum. Escolha Retângulo ou Polígono e desenhe por cima de uma sala.</p>')
      + '</div><p class="planta-meta">' + nSem + ' espaço' + (nSem === 1 ? '' : 's') + ' da tabela ainda sem desenho.</p>';
    h += '<div class="planta-acoes planta-rodape"><button class="btn btn-mini" onclick="VC.planta.escolherImagem()">Trocar imagem</button><button class="btn btn-mini" onclick="VC.planta.removerPiso()">Remover piso</button></div>';
    return h;
  },

  /* ── interação no desenho ────────────────── */
  redesenhar() {
    const el = document.getElementById('conteudoPasso');
    if (!el || !el.querySelector('.planta')) return;
    const tela = document.getElementById('plantaTela'); const sx = tela ? tela.scrollLeft : 0, sy = tela ? tela.scrollTop : 0;
    el.innerHTML = this.render(); this.ligar();
    const t2 = document.getElementById('plantaTela'); if (t2) { t2.scrollLeft = sx; t2.scrollTop = sy; }
  },
  mostrar(el) { el.innerHTML = this.render(); this.ligar(); },
  _ponto(ev) {
    const svg = document.getElementById('plantaSVG'); if (!svg) return [0, 0];
    const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM().inverse());
    const p = this.pisoAtual();
    return [Math.max(0, Math.min(p.w, q.x)), Math.max(0, Math.min(p.h, q.y))];
  },
  ligar() {
    const p = this.pisoAtual(), tela = document.getElementById('plantaTela'), svg = document.getElementById('plantaSVG');
    if (!p || !tela || !svg) return;
    if (this.zoom == null) { this.zoom = Math.min(1, Math.max(0.05, (tela.clientWidth - 4) / p.w)); svg.setAttribute('width', Math.round(p.w * this.zoom)); svg.setAttribute('height', Math.round(p.h * this.zoom)); }
    let arrasto = null;
    svg.addEventListener('pointerdown', ev => {
      if (ev.button !== 0) return;
      const q = this._ponto(ev);
      if (this.ferramenta === 'sel') { const g = ev.target.closest('.planta-sala'); if (g) this.selecionar(Number(g.dataset.esp)); else if (this.selecionado != null) { this.selecionado = null; this.redesenhar(); } return; }
      if (this._bloqueado()) return;
      if (this.ferramenta === 'escala') { this.escalaPts = this.escalaPts.length >= 2 ? [q] : this.escalaPts.concat([q]); this.redesenhar(); if (this.escalaPts.length === 2) setTimeout(() => { const i = document.getElementById('plantaMetros'); if (i) i.focus(); }, 0); return; }
      if (this.ferramenta === 'ret') { arrasto = q; svg.setPointerCapture(ev.pointerId); this.pendente = null; return; }
      if (this.ferramenta === 'pol') {
        if (this.rascunho.length >= 3) { const [x0, y0] = this.rascunho[0], z = this.zoom || 1; if (Math.hypot(q[0] - x0, q[1] - y0) * z < 10) { this.fecharPoligono(); return; } }
        this.rascunho.push(q); this.pendente = null; this.redesenhar();
      }
    });
    svg.addEventListener('pointermove', ev => {
      const q = this._ponto(ev), r = document.getElementById('plantaRascunho');
      if (this.ferramenta === 'ret' && arrasto && r) { const [x0, y0] = arrasto; r.setAttribute('points', [[x0, y0], [q[0], y0], q, [x0, q[1]], [x0, y0]].map(a => a.join(',')).join(' ')); }
      if (this.ferramenta === 'pol' && this.rascunho.length && r) { this.ponteiro = q; r.setAttribute('points', this.rascunho.concat([q]).map(a => a.join(',')).join(' ')); }
    });
    svg.addEventListener('pointerup', ev => {
      if (this.ferramenta !== 'ret' || !arrasto) return;
      const q = this._ponto(ev), [x0, y0] = arrasto; arrasto = null;
      if (Math.abs(q[0] - x0) * (this.zoom || 1) < 6 || Math.abs(q[1] - y0) * (this.zoom || 1) < 6) { this.redesenhar(); return; }
      this.pendente = [[x0, y0], [q[0], y0], q, [x0, q[1]]]; this.redesenhar();
    });
    svg.addEventListener('dblclick', ev => { if (this.ferramenta === 'pol' && this.rascunho.length >= 3) { ev.preventDefault(); this.fecharPoligono(); } });
  }
};

/* teclas: Enter fecha o polígono, Esc cancela (só com a planta à vista e fora de campos de texto) */
document.addEventListener('keydown', ev => {
  if (!document.getElementById('plantaSVG')) return;
  if (ev.target && /^(INPUT|SELECT|TEXTAREA)$/.test(ev.target.tagName)) return;
  if (ev.key === 'Escape' && (VC.planta.rascunho.length || VC.planta.pendente || VC.planta.escalaPts.length)) { ev.preventDefault(); VC.planta.cancelar(); }
  if (ev.key === 'Enter' && VC.planta.ferramenta === 'pol' && VC.planta.rascunho.length >= 3) { ev.preventDefault(); VC.planta.fecharPoligono(); }
});

/* As plantas viajam com o projeto: qualquer importação (abrir ficheiro, exemplo, projeto guardado)
   passa pelo migrador; aí repõem-se as plantas do projeto que entra (ou nenhuma). */
if (VC.migrador && VC.migrador.prepararParaImportar && !VC.migrador._comPlantas) {
  const orig = VC.migrador.prepararParaImportar;
  VC.migrador.prepararParaImportar = function (p) {
    const r = orig.apply(this, arguments);
    VC.dados.plantas = (p && p.dados && Array.isArray(p.dados.plantas)) ? p.dados.plantas : [];
    VC.planta.piso = null; VC.planta.selecionado = null; VC.planta.pendente = null; VC.planta.zoom = null;
    return r;
  };
  VC.migrador._comPlantas = true;
}
/* projeto novo e exemplo embutido: sem plantas */
if (VC.ui && typeof VC.ui.novo === 'function') { const o = VC.ui.novo; VC.ui.novo = function () { const r = o.apply(this, arguments); if (!(VC.dados.espacos || []).length) VC.dados.plantas = []; return r; }; }
if (typeof VC.exemploV6 === 'function') { const o = VC.exemploV6; VC.exemploV6 = function () { VC.dados.plantas = []; return o.apply(this, arguments); }; }
})();
