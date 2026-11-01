/* ============================================================
   VENTCONDUTAS V9.2.0 · 11-lentes
   Fase 3 · Lentes Tabela e Kanban
   Fase 4.2 · Lente Visual Hasse (hierarquia UTA → Ramais → Espaços)
             · FIX A: SVG com dimensões reais (scroll horizontal, texto legível)
             · FIX B: nó "Sem ramal" agora é uma caixa renderizada
             · FIX C: espaços com 2 ramais distintos aparecem 2×
   ============================================================ */
(function () {
'use strict';
const VC = window.VC;
VC._boot = VC._boot || { partes: [] };
VC._boot.partes.push('11-lentes');

VC.lentes = {
  renderTabelaEspacos: function () {
    const espacos = VC.dados.espacos || [];
    if (!espacos.length) return '<div class="vazio"><i class="fa-solid fa-inbox"></i><div class="vazio-titulo">Sem espaços</div></div>';
    
    let h = '<div class="cartao-titulo"><i class="fa-solid fa-table"></i> Tabela Universal de Espaços</div>';
    h += '<div class="tabela-wrap"><table class="tabela densa"><thead><tr>';
    h += '<th>Nome</th><th>Tipo</th><th>Grupo</th><th>A (m²)</th><th>H (m)</th><th>V (m³)</th><th>N</th>';
    h += '<th>Q_normas (m³/h)</th><th>Q_ConTerm (m³/h)</th><th>QAI_projeto (m³/h)</th><th>Q_total (m³/h)</th>';
    h += '</tr></thead><tbody>';
    
    espacos.forEach(e => {
      const c = VC.calculo.calcularQEspaco(e);
      const g = e.grupoForcado || c.g;
      h += '<tr>';
      h += '<td>' + VC.utils.esc(e.nome) + '</td>';
      h += '<td>' + VC.utils.esc(e.tipo) + '</td>';
      h += '<td><span class="badge info">G' + g + '</span></td>';
      h += '<td>' + VC.utils.fmt(c.A, 1) + '</td>';
      h += '<td>' + VC.utils.fmt(c.H, 1) + '</td>';
      h += '<td>' + VC.utils.fmt(c.V, 1) + '</td>';
      h += '<td>' + (c.N || 0) + '</td>';
      h += '<td><span class="valor-derivado">' + VC.utils.fmt(c.Q_normas, 0) + '</span></td>';
      h += '<td><span class="valor-derivado">' + VC.utils.fmt(c.Q_ConTerm, 0) + '</span></td>';
      h += '<td><span class="valor-derivado">' + VC.utils.fmt(c.QAI_projeto, 0) + '</span></td>';
      h += '<td><span class="valor-derivado" style="font-weight:900;color:var(--primario-esc)">' + VC.utils.fmt(c.Q_total, 0) + '</span></td>';
      h += '</tr>';
    });
    h += '</tbody></table></div>';
    return h;
  },

  renderKanbanEspacos: function () {
    const espacos = VC.dados.espacos || [];
    if (!espacos.length) return '<div class="vazio"><i class="fa-solid fa-inbox"></i><div class="vazio-titulo">Sem espaços</div></div>';

    const grupos = { 1: [], 2: [], 3: [], 4: [] };
    espacos.forEach(e => {
      const c = VC.calculo.calcularQEspaco(e);
      const g = e.grupoForcado || c.g || 1;
      if (!grupos[g]) grupos[g] = [];
      grupos[g].push({ esp: e, calc: c });
    });

    const nomesGrupo = { 1: 'G1 · Ocupação Permanente', 2: 'G2 · Zona de Transferência', 3: 'G3 · Baixa Emissão', 4: 'G4 · Extração Dedicada' };
    
    let h = '<div class="cartao-titulo"><i class="fa-solid fa-columns"></i> Kanban de Espaços por Grupo</div>';
    h += '<div class="kanban-requisitos">';
    
    [1, 2, 3, 4].forEach(g => {
      const itens = grupos[g] || [];
      h += '<div class="kanban-col" data-g="' + g + '">';
      h += '<div class="kanban-col-cab"><span>' + nomesGrupo[g] + '</span><span class="kanban-col-num">' + itens.length + '</span></div>';
      h += '<div class="kanban-col-body">';
      
      if (itens.length === 0) {
        h += '<div class="kanban-vazio">Sem espaços</div>';
      } else {
        itens.forEach(item => {
          const e = item.esp;
          const c = item.calc;
          const temQAI = (Number(e.QAI_projeto) || 0) > 0;
          const temRPH = (Number(e.Q_ConTerm) || 0) > 0;
          
          h += '<div class="kanban-card">';
          h += '<div class="kanban-card-cab"><div class="kanban-card-nome">' + VC.utils.esc(e.nome) + '</div></div>';
          h += '<div class="kanban-card-tipo">' + VC.utils.esc(e.tipo) + '</div>';
          
          h += '<div class="kanban-card-kpis">';
          h += '<div class="kanban-kpi"><span class="lbl">Q_normas</span><span class="val">' + VC.utils.fmt(c.Q_normas, 0) + '</span></div>';
          h += '<div class="kanban-kpi"><span class="lbl">Q_total</span><span class="val">' + VC.utils.fmt(c.Q_total, 0) + '</span></div>';
          if (temRPH) h += '<div class="kanban-kpi destaque"><span class="lbl">RPH</span><span class="val">' + (e.rphAplicado || 0) + '</span></div>';
          if (temQAI) h += '<div class="kanban-kpi qai"><span class="lbl">QAI</span><span class="val">' + VC.utils.fmt(e.QAI_projeto, 0) + '</span></div>';
          h += '</div>';
          
          h += '</div>';
        });
      }
      
      h += '</div></div>';
    });
    
    h += '</div>';
    return h;
  },

  /* ────────────────────────────────────────────────
     FASE 4.2 · LENTE VISUAL (HASSE)
     Hierarquia UTA → Ramais (por parente) → Espaços
     Layout horizontal (depth em X, ordem em Y)
     ──────────────────────────────────────────────── */
  renderVisualHasse: function () {
    const espacos = VC.dados.espacos || [];
    const ramais = VC.dados.ramais || [];

    if (!espacos.length && !ramais.length) {
      return '<div class="vazio" style="padding:40px">' +
        '<i class="fa-solid fa-sitemap"></i>' +
        '<div class="vazio-titulo">Sem dados</div>' +
        '<div>Adiciona espaços no <b>Levantamento</b> e ramais na <b>Topologia</b>.</div>' +
        '</div>';
    }

    if (!ramais.length) {
      return '<div class="vazio" style="padding:40px">' +
        '<i class="fa-solid fa-sitemap"></i>' +
        '<div class="vazio-titulo">Sem ramais</div>' +
        '<div>Executa a <b>Topologia dos Ramais</b> (ou Gerar Topologia Automática) para ver a árvore.</div>' +
        '</div>';
    }

    let arvore, layout, svg;
    try {
      arvore = this._construirArvoreHasse();
      layout = this._calcularLayoutArvore(arvore);
      svg = this._renderArvoreSVG(layout);
    } catch (err) {
      if (VC.debug && VC.debug.erro) VC.debug.erro(err);
      return '<div class="vazio" style="padding:40px">' +
        '<i class="fa-solid fa-triangle-exclamation"></i>' +
        '<div class="vazio-titulo">Erro a construir a árvore</div>' +
        '<div>' + VC.utils.esc(err.message) + '</div>' +
        '</div>';
    }

    const nUtas = arvore.raizes.filter(r => r.tipo === 'uta').length;
    const nRamais = ramais.length;
    const nEspacos = espacos.length;

    let h = '<div class="cartao-titulo" style="margin-bottom:8px"><i class="fa-solid fa-sitemap"></i> Lente Visual · Hierarquia UTA → Ramais → Espaços</div>';
    h += '<p style="font-size:11.5px;color:var(--texto-med);margin-bottom:10px">Cada <b>caixa</b> é uma UTA ou um ramal (cor por rede). Cada <b>bolha</b> é um espaço, dimensionado por <b>Q_total</b> (cor por grupo G1–G4). Espaços que servem duas redes aparecem <b>duas vezes</b> (uma por rede). Passa o rato para tooltip; clica nas bolhas para toast.</p>';
    h += '<div style="background:var(--superf);border:1px solid var(--borda);border-radius:8px;overflow:auto;max-height:calc(100vh - 300px);padding:10px">';
    h += svg;
    h += '</div>';
    h += '<div style="margin-top:10px;display:flex;gap:14px;flex-wrap:wrap;font-size:10.5px;color:var(--texto-med);align-items:center">';
    h += '<span><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#6d8fb0;margin-right:4px;vertical-align:middle"></span>G1 · Ocup. Permanente</span>';
    h += '<span><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#94a3b8;margin-right:4px;vertical-align:middle"></span>G2 · Zona Transferência</span>';
    h += '<span><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#c9a876;margin-right:4px;vertical-align:middle"></span>G3 · Baixa Emissão</span>';
    h += '<span><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#c88a8a;margin-right:4px;vertical-align:middle"></span>G4 · Extração Dedicada</span>';
    h += '<span style="margin-left:auto;font-style:italic">' + nUtas + ' UTA(s) · ' + nRamais + ' ramal(is) · ' + nEspacos + ' espaço(s) · tamanho da bolha ∝ Q_total</span>';
    h += '</div>';

    return h;
  },

  /* Constrói a árvore: raízes = UTAs (cada uma com a sua subárvore de ramais)
     + um nó "Sem UTA" para ramais sem utaRef + um nó "Sem ramal" para espaços órfãos.
     FIX C: espaços com 2 ramais distintos aparecem sob AMBOS. */
  _construirArvoreHasse: function () {
    const utas = VC.dados.utas || [];
    const ramais = VC.dados.ramais || [];
    const espacos = VC.dados.espacos || [];

    const byNome = {};
    ramais.forEach(r => { byNome[r.nome] = r; });

    const filhosPorRamal = {};
    ramais.forEach(r => {
      const p = r.parente || '__root__';
      if (!filhosPorRamal[p]) filhosPorRamal[p] = [];
      filhosPorRamal[p].push(r);
    });

    const espacosPorRamal = {};
    const espacosOrfaos = [];
    espacos.forEach(e => {
      let temAlgum = false;
      const insOk = e.ramalRefInsuflacao && byNome[e.ramalRefInsuflacao];
      const extOk = e.ramalRefExtracao && byNome[e.ramalRefExtracao];
      const saoDistintos = insOk && extOk && e.ramalRefInsuflacao !== e.ramalRefExtracao;

      if (insOk) {
        if (!espacosPorRamal[e.ramalRefInsuflacao]) espacosPorRamal[e.ramalRefInsuflacao] = [];
        espacosPorRamal[e.ramalRefInsuflacao].push({ espaco: e, rede: 'insuflacao' });
        temAlgum = true;
      }
      if (extOk && (saoDistintos || !insOk)) {
        if (!espacosPorRamal[e.ramalRefExtracao]) espacosPorRamal[e.ramalRefExtracao] = [];
        espacosPorRamal[e.ramalRefExtracao].push({ espaco: e, rede: 'extracao' });
        temAlgum = true;
      }

      if (!temAlgum) espacosOrfaos.push(e);
    });

    const construirNoRamal = (r) => {
      const no = {
        tipo: 'ramal',
        id: 'RAM-' + r.id,
        nome: r.nome,
        rede: r.rede || 'insuflacao',
        dados: r,
        filhos: []
      };
      const subs = (filhosPorRamal[r.nome] || []).slice().sort((a, b) =>
        String(a.nome).localeCompare(String(b.nome), 'pt', { numeric: true })
      );
      subs.forEach(sub => { no.filhos.push(construirNoRamal(sub)); });

      const eps = (espacosPorRamal[r.nome] || []).slice().sort((a, b) =>
        String(a.espaco.nome).localeCompare(String(b.espaco.nome), 'pt', { numeric: true })
      );
      eps.forEach(item => {
        const e = item.espaco;
        no.filhos.push({
          tipo: 'espaco',
          id: 'ESP-' + e.id + '-' + r.id + '-' + (item.rede === 'extracao' ? 'E' : 'I'),
          nome: e.nome,
          rede: item.rede,
          dados: e,
          filhos: []
        });
      });

      return no;
    };

    const raizes = [];
    const ramaisRaiz = ramais.filter(r => !r.parente || !byNome[r.parente]);

    const grupos = {};
    ramaisRaiz.forEach(r => {
      let utaId = r.utaRef;
      if (!utaId) {
        let p = r.parente, guard = 0;
        while (!utaId && p && byNome[p] && guard++ < 20) {
          utaId = byNome[p].utaRef;
          p = byNome[p].parente;
        }
      }
      if (!utaId) {
        const u = utas.find(x => x.rede === (r.rede || 'insuflacao'));
        utaId = u ? u.id : '__orfa__';
      }
      if (!grupos[utaId]) grupos[utaId] = [];
      grupos[utaId].push(r);
    });

    const utasOrdenadas = utas.slice().sort((a, b) => {
      const ma = String(a.id).match(/(\d+)/);
      const mb = String(b.id).match(/(\d+)/);
      const na = ma ? parseInt(ma[1], 10) : 0;
      const nb = mb ? parseInt(mb[1], 10) : 0;
      return na - nb;
    });

    utasOrdenadas.forEach(u => {
      const lista = grupos[u.id];
      if (!lista || !lista.length) return;
      const no = {
        tipo: 'uta',
        id: 'UTA-' + u.id,
        nome: u.nome,
        rede: u.rede,
        dados: u,
        filhos: []
      };
      lista.sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt', { numeric: true }));
      lista.forEach(r => { no.filhos.push(construirNoRamal(r)); });
      raizes.push(no);
      delete grupos[u.id];
    });

    Object.keys(grupos).forEach(utaId => {
      const lista = grupos[utaId];
      if (!lista.length) return;
      const no = {
        tipo: 'uta',
        id: 'UTA-ORF-' + utaId,
        nome: utaId === '__orfa__' ? 'Sem UTA' : 'UTA desconhecida (' + utaId + ')',
        rede: lista[0].rede || 'insuflacao',
        dados: null,
        filhos: []
      };
      lista.sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt', { numeric: true }));
      lista.forEach(r => { no.filhos.push(construirNoRamal(r)); });
      raizes.push(no);
    });

    if (espacosOrfaos.length) {
      const no = {
        tipo: 'orfaos',
        id: 'ORFAOS',
        nome: 'Sem ramal (' + espacosOrfaos.length + ')',
        rede: 'insuflacao',
        dados: null,
        filhos: []
      };
      espacosOrfaos.slice().sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt', { numeric: true })).forEach(e => {
        no.filhos.push({
          tipo: 'espaco',
          id: 'ESP-ORF-' + e.id,
          nome: e.nome,
          rede: 'insuflacao',
          dados: e,
          filhos: []
        });
      });
      raizes.push(no);
    }

    return { raizes };
  },

  _calcularLayoutArvore: function (arvore) {
    const COL_W = 150;
    const LINHA_H = 32;
    const PADDING_TOP = 24;
    const PADDING_LEFT = 20;

    let Qmax = 1;
    const coletar = (no) => {
      if (no.tipo === 'espaco' && no.dados) {
        const c = VC.calculo.calcularQEspaco(no.dados);
        const Q = Number(c.Q_total) || 0;
        if (Q > Qmax) Qmax = Q;
      }
      (no.filhos || []).forEach(coletar);
    };
    arvore.raizes.forEach(coletar);

    const mapa = new Map();
    let cursorY = PADDING_TOP;

    const posicionarNo = (no, depth) => {
      const x = PADDING_LEFT + depth * COL_W;

      if (!no.filhos || !no.filhos.length) {
        const y = cursorY;
        cursorY += LINHA_H;
        mapa.set(no.id, { no, x, y, depth });
        return y;
      }

      const ysFilhos = no.filhos.map(f => posicionarNo(f, depth + 1));
      const y = (ysFilhos[0] + ysFilhos[ysFilhos.length - 1]) / 2;
      mapa.set(no.id, { no, x, y, depth });
      return y;
    };

    arvore.raizes.forEach(raiz => posicionarNo(raiz, 0));

    let maxX = 0;
    let maxY = 0;
    mapa.forEach(item => {
      const p = item.no;
      if (p.tipo === 'espaco') {
        const larguraTexto = Math.min(260, Math.max(20, p.nome.length * 6.2));
        maxX = Math.max(maxX, item.x + 14 + 14 + 8 + larguraTexto);
      } else {
        const w = this._larguraNo(p);
        maxX = Math.max(maxX, item.x + w);
      }
      maxY = Math.max(maxY, item.y);
    });

    return {
      W: maxX + 20,
      H: maxY + 40,
      mapa,
      Qmax,
      raizes: arvore.raizes
    };
  },

  _larguraNo: function (no) {
    if (no.tipo === 'uta') return 110;
    if (no.tipo === 'ramal') return 90;
    if (no.tipo === 'orfaos') return 110;
    return 20;
  },

  _renderArvoreSVG: function (layout) {
    const W = layout.W;
    const H = layout.H;
    const mapa = layout.mapa;
    const Qmax = layout.Qmax;

    const corRede = { insuflacao: '#6d8fb0', extracao: '#7fa88b', extracao_suja: '#9488b8' };
    const corGrupo = { 1: '#6d8fb0', 2: '#94a3b8', 3: '#c9a876', 4: '#c88a8a' };

    // FIX A: dimensões reais (sem width="100%") → scroll horizontal em vez de miniaturizar
    let svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" style="display:block;background:#fbfcfe;border-radius:6px" preserveAspectRatio="xMinYMin meet">';

    mapa.forEach((item, id) => {
      const no = item.no;
      if (!no.filhos || !no.filhos.length) return;
      const x1 = item.x + this._larguraNo(no);
      const y1 = item.y;
      const cor = corRede[no.rede] || '#94a3b8';

      no.filhos.forEach(filho => {
        const itemFilho = mapa.get(filho.id);
        if (!itemFilho) return;
        const x2 = itemFilho.x;
        const y2 = itemFilho.y;
        const cx = (x1 + x2) / 2;
        svg += '<path d="M' + x1.toFixed(1) + ',' + y1.toFixed(1) +
          ' C' + cx.toFixed(1) + ',' + y1.toFixed(1) +
          ' ' + cx.toFixed(1) + ',' + y2.toFixed(1) +
          ' ' + x2.toFixed(1) + ',' + y2.toFixed(1) + '"' +
          ' fill="none" stroke="' + cor + '" stroke-opacity="0.4" stroke-width="1.5"/>';
      });
    });

    mapa.forEach((item, id) => {
      const no = item.no;
      const x = item.x;
      const y = item.y;

      if (no.tipo === 'uta') {
        const cor = corRede[no.rede] || '#94a3b8';
        const w = 110, h = 28;
        svg += '<g style="cursor:pointer" data-id="' + id + '">';
        svg += '<title>' + VC.utils.esc(no.nome) + ' · ' + (no.rede || '') + '</title>';
        svg += '<rect x="' + x.toFixed(1) + '" y="' + (y - h/2).toFixed(1) + '" width="' + w + '" height="' + h + '" rx="6" fill="' + cor + '" stroke="' + cor + '"/>';
        const label = no.nome.length > 15 ? no.nome.substring(0, 14) + '…' : no.nome;
        svg += '<text x="' + (x + w/2).toFixed(1) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="middle" font-size="11" font-weight="800" fill="#fff" style="pointer-events:none">' + VC.utils.esc(label) + '</text>';
        svg += '</g>';
      } else if (no.tipo === 'ramal') {
        const cor = corRede[no.rede] || '#94a3b8';
        const w = 90, h = 24;
        svg += '<g style="cursor:pointer" data-id="' + id + '">';
        svg += '<title>' + VC.utils.esc(no.nome) + ' · ' + (no.rede || '') + '</title>';
        svg += '<rect x="' + x.toFixed(1) + '" y="' + (y - h/2).toFixed(1) + '" width="' + w + '" height="' + h + '" rx="4" fill="#fff" stroke="' + cor + '" stroke-width="1.5"/>';
        const label = no.nome.length > 11 ? no.nome.substring(0, 10) + '…' : no.nome;
        svg += '<text x="' + (x + w/2).toFixed(1) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="middle" font-size="10" font-weight="800" fill="' + cor + '" style="pointer-events:none">' + VC.utils.esc(label) + '</text>';
        svg += '</g>';
      } else if (no.tipo === 'orfaos') {
        // FIX B: cabeçalho do grupo "Sem ramal" agora é uma caixa tracejada
        const cor = '#94a3b8';
        const w = 110, h = 28;
        svg += '<g style="cursor:pointer" data-id="' + id + '">';
        svg += '<title>' + VC.utils.esc(no.nome) + '</title>';
        svg += '<rect x="' + x.toFixed(1) + '" y="' + (y - h/2).toFixed(1) + '" width="' + w + '" height="' + h + '" rx="6" fill="#f1f5f9" stroke="' + cor + '" stroke-width="1.5" stroke-dasharray="4 3"/>';
        const label = no.nome.length > 15 ? no.nome.substring(0, 14) + '…' : no.nome;
        svg += '<text x="' + (x + w/2).toFixed(1) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="middle" font-size="10" font-weight="800" fill="' + cor + '" style="pointer-events:none">' + VC.utils.esc(label) + '</text>';
        svg += '</g>';
      } else if (no.tipo === 'espaco') {
        const c = VC.calculo.calcularQEspaco(no.dados);
        const Q = Number(c.Q_total) || 0;
        const g = no.dados.grupoForcado || c.g || 1;
        const raio = Math.max(6, Math.min(14, VC.escalas.raioPorQ(Q, Qmax, 6, 14)));
        const cor = corGrupo[g] || '#94a3b8';
        const cx = x + 14;
        const cy = y;
        const xTexto = cx + raio + 6;
        const label = no.nome.length > 40 ? no.nome.substring(0, 39) + '…' : no.nome;
        const sufixoRede = (no.rede === 'extracao' || no.rede === 'extracao_suja') ? ' ⏵' : '';

        svg += '<g style="cursor:pointer" data-id="' + id + '" onclick="VC.lentes._clickHasse(' + (no.dados.id) + ')">';
        svg += '<title>' + VC.utils.esc(no.nome) + '\n' + VC.utils.esc(no.dados.tipo || '?') + '\nG' + g + ' · Q_total ' + VC.utils.fmt(Q, 0) + ' m³/h\nRede: ' + VC.utils.esc(no.rede) + '</title>';
        svg += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + raio.toFixed(1) + '" fill="' + cor + '" stroke="#ffffff" stroke-width="1.5"/>';
        svg += '<text x="' + xTexto.toFixed(1) + '" y="' + (cy + 3.5).toFixed(1) + '" font-size="10" font-weight="600" fill="#2c3e50" style="pointer-events:none">' + VC.utils.esc(label) + sufixoRede + '</text>';
        svg += '</g>';
      }
    });

    svg += '</svg>';
    return svg;
  },

  _clickHasse: function (id) {
    const esp = (VC.dados.espacos || []).find(x => String(x.id) === String(id));
    if (!esp) return;
    const c = VC.calculo.calcularQEspaco(esp);
    const g = esp.grupoForcado || c.g || '?';
    VC.ui.toast(esp.nome + ' · G' + g + ' · Q_total ' + VC.utils.fmt(c.Q_total, 0) + ' m³/h');
  }
};

console.log('%c[VentCondutas V11.0.0 · Fase 4.2] 11-lentes carregado · Tabela + Kanban + Hasse (hierarquia real UTA → Ramais → Espaços)', 'color:#6d8fb0;font-weight:bold;background:#eaf1f7;padding:3px 6px;border-radius:3px');
})();
/* FIM DO PATCH FASE 4.2 */