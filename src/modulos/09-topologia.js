/* ============================================================
   VENTCONDUTAS V9.0 · 09-topologia
   Fase 1 · Facetas + Multi-vista + Migrador V9
   Fase 3 · Geração automática de topologia (gerarAutomatica)

   ADITIVO — não remove nem altera nada do V8.0.1
   
   DEPENDE DE: 01 a 08
   ============================================================ */
(function () {
'use strict';
const VC = window.VC;
window.VC6 = window.VC6 || {};
VC._boot = VC._boot || { partes: [] };
VC._boot.partes.push('09-topologia');

/* ============================================================
   FLAG GLOBAL
   ============================================================ */
VC.flags = VC.flags || {};
if (VC.flags.topologiaFacetada === undefined) {
  VC.flags.topologiaFacetada = true;   // ← ativa na Fase 1
}

/* ============================================================
   1 · FACETAS
   ============================================================ */
VC.topologia = VC.topologia || {};

VC.topologia.facetas = {
  /**
   * Deriva facetas a partir de um ramal existente.
   * Não altera o ramal — devolve só o objeto `meta`.
   */
  derivarDoRamal(ramal) {
    if (!ramal) return null;
    const loc = ramal.localizacao || {};
    const piso = (loc.piso || 'P0').toUpperCase();
    const ala = loc.ala || 'Centro';
    const nome = (ramal.nome || '').toLowerCase();

    let zona = ala;
    if (/atrio|átrio/.test(nome)) zona = 'ATRIO';
    else if (/mezanino|mez/.test(nome)) zona = 'MEZ';

    return {
      pisoFisico: this._parsePiso(piso),
      zona,
      ala,
      rede: ramal.rede || 'insuflacao',
      funcao: ['primario', 'secundario', 'terciario', 'quaternario'][
        Math.max(0, Math.min(3, (ramal.nivelNumero || 2) - 1))
      ],
      caminho: [
        piso.toLowerCase(),
        ala.toLowerCase(),
        ramal.rede || 'insuflacao'
      ].join('.'),
      utaRef: ramal.utaRef || null
    };
  },

  _parsePiso(piso) {
    const s = String(piso || '').toUpperCase();
    if (/^P\d+$/.test(s)) return [s];
    if (/MEZ/.test(s)) return ['MEZ'];
    if (/ATRIO|ÁTRIO/.test(s)) return ['ATRIO'];
    return [s || 'P0'];
  },

  /**
   * Aplica facetas a todos os ramais sem meta.
   * Idempotente — se já existe meta, não toca.
   * Devolve o número de ramais alterados.
   */
  aplicarATodos() {
    let n = 0;
    (VC.dados.ramais || []).forEach(r => {
      if (!r.meta) {
        r.meta = this.derivarDoRamal(r);
        if (r.meta) n++;
      }
    });
    return n;
  },

  /**
   * Verifica se meta.pisoFisico bate com localizacao.piso.
   * Devolve array de problemas (vazio se tudo OK).
   */
  validarCoerencia() {
    const probs = [];
    (VC.dados.ramais || []).forEach(r => {
      if (!r.meta) return;
      const locPiso = (r.localizacao?.piso || '').toUpperCase();
      const metaPiso = (r.meta.pisoFisico || [])[0] || '';
      if (locPiso && metaPiso && locPiso !== metaPiso) {
        probs.push({ ramal: r.nome, locPiso, metaPiso });
      }
    });
    return probs;
  }
};

/* ============================================================
   2 · MOTOR DE AGRUPAMENTO GENÉRICO
   ============================================================ */
VC.topologia.agruparPor = function (opcoes) {
  opcoes = opcoes || {};
  const criterios = opcoes.criterios || ['pisoFisico', 'zona', 'rede'];
  const filtros = opcoes.filtros || {};
  const fonte = opcoes.fonte || 'ramais';

  let itens = (VC.dados[fonte] || []).slice();

  // Extrair valor de uma faceta (com Átrio/Mezanino a forçar zona)
  const valorFaceta = (item, criterio) => {
    if (item.meta?.zona === 'ATRIO' || item.meta?.zona === 'MEZ') {
      return item.meta.zona;
    }
    if (item.meta && item.meta[criterio] !== undefined) {
      const v = item.meta[criterio];
      return Array.isArray(v) ? (v[0] || '—') : v;
    }
    if (item[criterio] !== undefined && item[criterio] !== null) {
      return item[criterio];
    }
    return '—';
  };

  // Filtros
  itens = itens.filter(item => {
    for (const k in filtros) {
      if (String(valorFaceta(item, k)) !== String(filtros[k])) return false;
    }
    return true;
  });

  // Construir árvore
  const raiz = {
    id: '__root__', nivel: 0, valor: 'Raiz',
    pai: null, filhos: [], itens: [],
    agregado: { Q_total: 0, nItens: 0, nTerminais: 0, dpMax: 0 }
  };
  const nos = new Map([['__root__', raiz]]);

  itens.forEach(item => {
    const valores = criterios.map(c => String(valorFaceta(item, c)));
    let pai = raiz;

    valores.forEach((valor, nivel) => {
      const id = valores.slice(0, nivel + 1).join('¦');
      let no = nos.get(id);
      if (!no) {
        no = {
          id, nivel: nivel + 1,
          criterio: criterios[nivel], valor,
          pai: pai.id, filhos: [], itens: [],
          agregado: { Q_total: 0, nItens: 0, nTerminais: 0, dpMax: 0 }
        };
        nos.set(id, no);
        pai.filhos.push(id);
      }
      pai = no;
    });
    pai.itens.push(item);
  });

  // Agregados (pós-ordem)
  const calc = (no) => {
    let Q = 0, nI = 0, nT = 0, dp = 0;
    no.itens.forEach(r => {
      Q += Number(r.Q || 0);
      nI++;
      dp = Math.max(dp, Number(r.deltaPtotal || 0));
      if (r.nome) {
        nT += (VC.dados.terminais || []).filter(t => t.ramalRef === r.nome).length;
      }
    });
    no.filhos.forEach(idF => {
      const a = calc(nos.get(idF));
      Q += a.Q_total;
      nI += a.nItens;
      nT += a.nTerminais;
      dp = Math.max(dp, a.dpMax);
    });
    no.agregado = { Q_total: Q, nItens: nI, nTerminais: nT, dpMax: dp };
    return no.agregado;
  };
  calc(raiz);

  // Ordem DFS pré-ordem
  const ordem = [];
  const dfs = (no) => {
    ordem.push(no.id);
    no.filhos.forEach(idF => dfs(nos.get(idF)));
  };
  dfs(raiz);

  return { raiz, nos, ordem };
};

/* ============================================================
   3 · MOVIMENTO (usado na Fase 2 pelo drag-and-drop)
   ============================================================ */
VC.topologia.mover = {

  /**
   * Move um ramal para debaixo de outro.
   * Valida: existência, anti-ciclo, mesma rede.
   */
  ramal(ramalNome, novoPaiNome) {
    const r = VC.dados.ramais.find(x => x.nome === ramalNome);
    const pai = VC.dados.ramais.find(x => x.nome === novoPaiNome);
    if (!r || !pai) return { ok: false, erro: 'Ramal não encontrado' };
    if (ramalNome === novoPaiNome) return { ok: false, erro: 'Não pode ser pai de si próprio' };

    // Anti-ciclo: subir a partir do novo pai
    let p = novoPaiNome, guard = 0;
    while (p && guard++ < 100) {
      if (p === ramalNome) return { ok: false, erro: 'Criaria um ciclo' };
      const rr = VC.dados.ramais.find(x => x.nome === p);
      p = rr ? rr.parente : null;
    }

    // Mesma rede
    const redeR = r.rede || 'insuflacao';
    const redePai = pai.rede || 'insuflacao';
    if (redeR !== redePai) {
      return { ok: false, erro: 'Redes diferentes (' + redeR + ' vs ' + redePai + ')' };
    }

    // Aplicar
    r.parente = novoPaiNome;
    if (pai.meta) {
      r.meta = Object.assign({}, r.meta || {}, {
        pisoFisico: (pai.meta.pisoFisico || []).slice(),
        zona: pai.meta.zona,
        ala: pai.meta.ala,
        utaRef: pai.meta.utaRef
      });
    }
    r.utaRef = pai.utaRef || r.utaRef;

    return { ok: true };
  },

  /**
   * Associa um terminal a um ramal.
   * Valida: existência, mesma rede.
   */
  terminal(terminalId, ramalNome) {
    const t = VC.dados.terminais.find(x => String(x.id) === String(terminalId));
    const r = VC.dados.ramais.find(x => x.nome === ramalNome);
    if (!t || !r) return { ok: false, erro: 'Terminal ou ramal não encontrado' };

    const redeR = r.rede || 'insuflacao';
    const redeT = t.rede || 'insuflacao';

    if (redeR !== redeT) {
      return { ok: false, erro: 'Terminal é «' + redeT + '», ramal é «' + redeR + '»' };
    }

    t.ramalRef = ramalNome;

    (t.espacos || []).forEach(e => {
      const esp = VC.dados.espacos.find(x => x.nome === e.nome);
      if (!esp) return;
      if (redeT === 'extracao' || redeT === 'extracao_suja') {
        esp.ramalRefExtracao = ramalNome;
      } else {
        esp.ramalRefInsuflacao = ramalNome;
      }
    });

    return { ok: true };
  }
};

/* ============================================================
   4 · INTEGRAÇÃO COM O CICLO DE VIDA
   ============================================================ */

// 4.1 Aplicar facetas após sincronização de estado
const _sincOriginal = VC.estado && VC.estado.sincronizar;
if (_sincOriginal) {
  VC.estado.sincronizar = function (opcoes) {
    const r = _sincOriginal.call(this, opcoes);
    if (VC.flags.topologiaFacetada && VC.topologia?.facetas) {
      try { VC.topologia.facetas.aplicarATodos(); }
      catch (e) { VC.debug && VC.debug.erro && VC.debug.erro(e); }
    }
    return r;
  };
}

// 4.2 Aplicar facetas ao arrancar
const _bootstrapOriginal = window.bootstrapFinal;
if (typeof _bootstrapOriginal === 'function') {
  window.bootstrapFinal = function () {
    const r = _bootstrapOriginal.apply(this, arguments);
    if (VC.flags.topologiaFacetada && VC.topologia?.facetas) {
      const n = VC.topologia.facetas.aplicarATodos();
      if (n > 0) {
        console.log('%c[V9 · Topologia] Facetas derivadas em ' + n + ' ramais', 
          'color:#7fa88b;font-weight:bold');
      }
    }
    return r;
  };
}

// 4.3 Fallback: aplicar após load inicial
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(() => {
    if (VC.flags.topologiaFacetada && VC.topologia?.facetas) {
      VC.topologia.facetas.aplicarATodos();
    }
  }, 500);
} else {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      if (VC.flags.topologiaFacetada && VC.topologia?.facetas) {
        VC.topologia.facetas.aplicarATodos();
      }
    }, 500);
  });
}

/* ============================================================
   V9 · FASE 3 · GERAÇÃO AUTOMÁTICA DE TOPOLOGIA
   Aditivo — não altera facetas, agruparPor, mover, migrador.
   ============================================================ */

/* ────────────────────────────────────────────────
   CONSTANTES
   ──────────────────────────────────────────────── */
VC.topologia._TIPOS_SUJOS = [
  'sanitario', 'balneario', 'vestiario',
  'cozinha', 'garagem', 'laboratorio'
];

/* ────────────────────────────────────────────────
   §3.1 · CLASSIFICAR UTA
   ──────────────────────────────────────────────── */
VC.topologia._classificarUta = function (uta) {
  if (!uta) return 'normal';
  if (uta.rede === 'extracao_suja') return 'ext_suja';
  const texto = (uta.nome || '') + ' ' + (uta.zona || '');
  if (uta.rede === 'extracao' && /atrio|átrio/i.test(texto)) return 'atrio';
  return 'normal';
};

/* ────────────────────────────────────────────────
   §3.2 · DETEÇÃO DE ESPAÇO SUJO
   ──────────────────────────────────────────────── */
VC.topologia._normalizarTipo = function (tipo) {
  return String(tipo || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/s$/, '');
};

VC.topologia._eEspacoSujo = function (esp) {
  if (!esp) return false;
  const tipoNorm = VC.topologia._normalizarTipo(esp.tipo);
  if (VC.topologia._TIPOS_SUJOS.indexOf(tipoNorm) >= 0) return true;
  if ((esp.definicoes || []).some(d => d.rede === 'extracao_suja')) return true;
  const temTerminal = (VC.dados.terminais || []).some(t =>
    t.rede === 'extracao_suja' &&
    (t.espacos || []).some(x => x.nome === esp.nome)
  );
  return temTerminal;
};

VC.topologia._eEspacoSujoPorTerminal = function (t) {
  return (t.espacos || []).some(e => {
    const esp = VC.dados.espacos.find(x => x.nome === e.nome);
    return esp && VC.topologia._eEspacoSujo(esp);
  });
};

/* ────────────────────────────────────────────────
   §3.3 · PISO NORMALIZADO
   ──────────────────────────────────────────────── */
VC.topologia._pisoDe = function (obj) {
  if (!obj) return 'P0';
  const loc = obj.localizacao || {};
  if (loc.piso) return String(loc.piso).toUpperCase();
  const zona = obj.zona || '';
  const m = zona.match(/\b(P\d+|Mezz\w*|Mezanino|Átrio|Atrio)\b/i);
  if (m) {
    const v = m[1].toUpperCase();
    if (/^P\d+$/.test(v)) return v;
    if (/^MEZ/i.test(v)) return 'MEZ';
    if (/^ATRIO|^ÁTRIO/i.test(v)) return 'ATRIO';
  }
  return 'P0';
};

/* ────────────────────────────────────────────────
   §3.4 · ESPAÇOS DA UTA (filtro por zona)
   ──────────────────────────────────────────────── */
VC.topologia._espacosDaUta = function (uta) {
  const espacos = VC.dados.espacos || [];
  const tipo = VC.topologia._classificarUta(uta);

  if (tipo === 'ext_suja') return espacos;
  if (tipo === 'atrio') {
    return espacos.filter(e => /atrio|átrio/i.test(e.nome));
  }

  const zona = (uta.zona || '').toLowerCase().trim();
  if (!zona || zona === 'transversal') return espacos;

  return espacos.filter(e => {
    const ala = ((e.localizacao || {}).ala || '').toLowerCase();
    const zz = (e.zona || '').toLowerCase();
    return ala.includes(zona) || zz.includes(zona);
  });
};

/* ────────────────────────────────────────────────
   §3.5 · TERMINAIS VÁLIDOS
   ──────────────────────────────────────────────── */
VC.topologia._terminaisValidos = function (rede, uta) {
  const espacosDaUta = uta ? VC.topologia._espacosDaUta(uta) : VC.dados.espacos;
  const nomesValidos = new Set(espacosDaUta.map(e => e.nome));

  return (VC.dados.terminais || []).filter(t => {
    if (t.rede !== rede) return false;
    if (!(Number(t.Q) > 0)) return false;

    const ref = t.definicaoRef;
    if (ref && ref.espacoId) {
      const espRef = VC.dados.espacos.find(e => e.id === ref.espacoId);
      if (espRef) {
        const def = (espRef.definicoes || []).find(d => d.id === ref.definicaoId);
        if (def && def.rede !== rede) return false;
      }
    }

    if (!(t.espacos || []).some(x => nomesValidos.has(x.nome))) return false;

    return true;
  });
};

/* ────────────────────────────────────────────────
   §3.6 · AGRUPAMENTO POR PISO
   ──────────────────────────────────────────────── */
VC.topologia._agruparPorPiso = function (rede, uta) {
  const terminais = VC.topologia._terminaisValidos(rede, uta);
  const grupos = new Map();
  terminais.forEach(t => {
    (t.espacos || []).forEach(e => {
      const esp = VC.dados.espacos.find(x => x.nome === e.nome);
      if (!esp) return;
      const piso = VC.topologia._pisoDe(esp);
      if (!grupos.has(piso)) grupos.set(piso, new Map());
      const mapa = grupos.get(piso);
      if (!mapa.has(esp.nome)) mapa.set(esp.nome, { espaco: esp, terminais: [] });
      const entrada = mapa.get(esp.nome);
      if (entrada.terminais.indexOf(t) < 0) entrada.terminais.push(t);
    });
  });
  return grupos;
};

/* ────────────────────────────────────────────────
   §3.7 · CRIAR RAMAL
   ──────────────────────────────────────────────── */
VC.topologia._criarRamal = function (opts) {
  const id = VC.dados.nextId.ramal++;
  const novo = {
    id,
    nome: opts.nome,
    parente: opts.parente || '',
    tipo: opts.nivelNumero === 1 ? 'Principal' : 'Sub-ramal',
    nivel: ['primario', 'secundario', 'terciario', 'quaternario'][opts.nivelNumero - 1] || 'secundario',
    nivelNumero: opts.nivelNumero || 2,
    rede: opts.rede || 'insuflacao',
    utaRef: opts.utaRef || null,
    L: opts.L || 10,
    zeta: opts.zeta || 0.5,
    localizacao: opts.localizacao || { piso: 'P0', ala: null, cota: null },
    geometriaInput: {
      material: 'Aço galvanizado',
      rugosidade: 0.15,
      forma: 'circular',
      H_max: 250
    },
    lock: { D: false },
    deltaP_registo: opts.deltaP_registo || 0,
    deltaP_filtro: opts.deltaP_filtro || 0,
    deltaP_bateria: 0,
    deltaP_recup: 0,
    _auto: true
  };
  VC.dados.ramais.push(novo);
  novo.meta = VC.topologia.facetas.derivarDoRamal(novo);
  return novo;
};

/* ────────────────────────────────────────────────
   §3.8 · ATRIBUIR TERMINAIS (por objeto, não por id)
   ──────────────────────────────────────────────── */
VC.topologia._atribuirTerminaisAoRamal = function (ramalNome, terminais) {
  const ramal = VC.dados.ramais.find(r => r.nome === ramalNome);
  if (!ramal) return 0;

  const redeR = ramal.rede || 'insuflacao';
  let n = 0;

  terminais.forEach(t => {
    const redeT = t.rede || 'insuflacao';

    const exato = (redeR === redeT);
    const extSujaOverride =
      (redeR === 'extracao_suja') &&
      (redeT === 'extracao') &&
      VC.topologia._eEspacoSujoPorTerminal(t);

    if (!exato && !extSujaOverride) return;

    t.ramalRef = ramalNome;

    (t.espacos || []).forEach(e => {
      const esp = VC.dados.espacos.find(x => x.nome === e.nome);
      if (!esp) return;
      if (redeR === 'insuflacao') esp.ramalRefInsuflacao = ramalNome;
      else esp.ramalRefExtracao = ramalNome;
    });

    n++;
  });

  return n;
};

/* ────────────────────────────────────────────────
   §3.9 · GERADOR · UTA NORMAL
   ──────────────────────────────────────────────── */
VC.topologia._gerarParaUtaNormal = function (uta, idxUta, cont) {
  const rede = uta.rede;
  const ramalR1 = 'R' + idxUta + '.1';

  VC.topologia._criarRamal({
    nome: ramalR1, parente: '', nivelNumero: 1, rede,
    utaRef: uta.id, L: 25, zeta: 0.8,
    localizacao: { piso: 'P0', ala: uta.zona || null, cota: null }
  });
  cont.R1++;

  const grupos = VC.topologia._agruparPorPiso(rede, uta);
  if (grupos.size === 0) { cont.ignorados++; return; }

  let pi = 0;
  grupos.forEach((mapaEsp, piso) => {
    pi++;
    const ramalR2 = ramalR1 + '.' + pi;

    VC.topologia._criarRamal({
      nome: ramalR2, parente: ramalR1, nivelNumero: 2, rede,
      utaRef: uta.id, L: 15, zeta: 0.5,
      localizacao: { piso, ala: uta.zona || null, cota: null }
    });
    cont.R2++;

    let si = 0;
    mapaEsp.forEach(({ espaco, terminais }) => {
      si++;
      const ramalR3 = ramalR2 + '.' + si;

      VC.topologia._criarRamal({
        nome: ramalR3, parente: ramalR2, nivelNumero: 3, rede,
        utaRef: uta.id, L: 3, zeta: 0.5,
        localizacao: espaco.localizacao || { piso, ala: null, cota: null }
      });
      cont.R3++;

      VC.topologia._atribuirTerminaisAoRamal(ramalR3, terminais);
    });
  });
};

/* ────────────────────────────────────────────────
   §3.10 · GERADOR · UTA EXT-SUJA (VEX dedicado)
   ──────────────────────────────────────────────── */
VC.topologia._gerarParaUtaExtSuja = function (uta, idxUta, cont) {
  const espacosSujos = (VC.dados.espacos || [])
    .filter(e => VC.topologia._eEspacoSujo(e));

  if (espacosSujos.length === 0) { cont.ignorados++; return; }

  let i = 0;
  espacosSujos.forEach(esp => {
    i++;
    const nome = 'R' + idxUta + '.' + i;

    VC.topologia._criarRamal({
      nome, parente: '', nivelNumero: 1, rede: 'extracao_suja',
      utaRef: uta.id, L: 8, zeta: 1.0,
      localizacao: esp.localizacao || { piso: 'P0', ala: null, cota: null },
      deltaP_registo: 25, deltaP_filtro: 35
    });
    cont.R1++;

    const termos = (VC.dados.terminais || []).filter(t =>
      (t.rede === 'extracao_suja' || t.rede === 'extracao') &&
      Number(t.Q) > 0 &&
      (t.espacos || []).some(x => x.nome === esp.nome)
    );

    if (termos.length > 0) {
      VC.topologia._atribuirTerminaisAoRamal(nome, termos);
    }
  });
};

/* ────────────────────────────────────────────────
   §3.11 · GERADOR · UTA ÁTRIO
   ──────────────────────────────────────────────── */
VC.topologia._gerarParaUtaAtrio = function (uta, idxUta, cont) {
  const nome = 'R' + idxUta + '.1';

  const espacoAtrio = (VC.dados.espacos || []).find(e =>
    /atrio|átrio/i.test(e.nome)
  );

  VC.topologia._criarRamal({
    nome, parente: '', nivelNumero: 1, rede: 'extracao',
    utaRef: uta.id, L: 20, zeta: 0.5,
    localizacao: { piso: 'ATRIO', ala: 'ATRIO', cota: null }
  });
  cont.R1++;

  if (!espacoAtrio) return;

  const termos = (VC.dados.terminais || []).filter(t =>
    t.rede === 'extracao' &&
    Number(t.Q) > 0 &&
    (t.espacos || []).some(x => /atrio|átrio/i.test(x.nome))
  );

  if (termos.length > 0) {
    VC.topologia._atribuirTerminaisAoRamal(nome, termos);
  }
};

/* ────────────────────────────────────────────────
   §3.12 · UTA ÁTRIO · DETEÇÃO E CRIAÇÃO
   ──────────────────────────────────────────────── */
VC.topologia._temEspacoAtrio = function () {
  return (VC.dados.espacos || []).some(e => /atrio|átrio/i.test(e.nome));
};

VC.topologia._temUtaAtrio = function () {
  return (VC.dados.utas || []).some(u =>
    /atrio|átrio/i.test((u.nome || '') + ' ' + (u.zona || ''))
  );
};

VC.topologia._criarUtaAtrio = function () {
  if (VC.topologia._temUtaAtrio()) return null;
  if (!VC.topologia._temEspacoAtrio()) return null;

  let maxId = 0;
  (VC.dados.utas || []).forEach(u => {
    const m = String(u.id || '').match(/(\d+)/);
    if (m) maxId = Math.max(maxId, parseInt(m[1], 10));
  });
  const novoId = 'UTA-' + String(maxId + 1).padStart(2, '0');

  const nova = {
    id: novoId,
    nome: 'UTA-Atrio-Extração',
    rede: 'extracao',
    zona: 'Atrio',
    componentes: (VC.uta && VC.uta.componentesExtracao) ? VC.uta.componentesExtracao() : [],
    curva: [],
    curvaFabricante: null,
    eta: 0.65,
    etaRec: 0.75,
    fs: 1.15,
    transmissao: 1.0,
    classeIE: 'IE3',
    recuperadorAtivo: true,
    ativo: true,
    Q: 0, dpInt: 0, dpExt: 0, sfpInt: 0, P_motor: 0,
    sfpClass: null,
    status: 'PENDENTE',
    pontoFunc: null,
    _auto: true
  };

  VC.dados.utas.push(nova);
  if (VC.debug && VC.debug.info) {
    VC.debug.info('[V9 · Fase 3] UTA-Atrio criada automaticamente: ' + novoId);
  }
  return nova;
};

/* ────────────────────────────────────────────────
   §3.13 · VALIDAÇÃO ANTI-CICLO
   ──────────────────────────────────────────────── */
VC.topologia._validarAntiCiclo = function () {
  const byName = {};
  (VC.dados.ramais || []).forEach(r => { byName[r.nome] = r; });
  const erros = [];
  (VC.dados.ramais || []).forEach(r => {
    const visitados = new Set([r.nome]);
    let p = r.parente, guard = 0;
    while (p && guard++ < 100) {
      if (visitados.has(p)) { erros.push(r.nome); break; }
      visitados.add(p);
      p = byName[p] ? byName[p].parente : null;
    }
  });
  return { ok: erros.length === 0, erros };
};

/* ────────────────────────────────────────────────
   §3.14 · RECALCULAR nextId.ramal
   ──────────────────────────────────────────────── */
VC.topologia._recalcularNextIdRamal = function () {
  let maxId = 0;
  (VC.dados.ramais || []).forEach(r => {
    if (Number(r.id) > maxId) maxId = Number(r.id);
  });
  VC.dados.nextId.ramal = maxId + 1;
};

/* ────────────────────────────────────────────────
   §3.15 · ORQUESTRADOR · gerarAutomatica()
   ──────────────────────────────────────────────── */
VC.topologia.gerarAutomatica = function (opcoes) {
  opcoes = opcoes || {};

  if (!VC.topologia || !VC.topologia.facetas) {
    VC.ui.toast('Erro: facetas não carregadas.');
    return { ok: false, erro: 'Sem facetas' };
  }
  if (!VC.dados || !VC.dados.espacos || !VC.dados.espacos.length) {
    VC.ui.toast('Sem espaços para gerar topologia.');
    return { ok: false, erro: 'Sem espaços' };
  }

  // 1. Snapshot
  if (VC.snap && typeof VC.snap.capturar === 'function') {
    try { VC.snap.capturar('gerar topologia automática'); }
    catch (e) { /* opcional */ }
  }

  // 2. Apagar tudo (C1)
  VC.dados.ramais = [];
  (VC.dados.espacos || []).forEach(e => {
    e.ramalRefInsuflacao = '';
    e.ramalRefExtracao = '';
  });
  (VC.dados.terminais || []).forEach(t => { t.ramalRef = ''; });
  VC.dados.nextId.ramal = 1;

  // 3. Criar UTA-Átrio se aplicável
  const utaAtrioCriada = VC.topologia._criarUtaAtrio();

  // 4. Listar UTAs ativas, ordenar por id numérico
  const utasAtivas = (VC.dados.utas || [])
    .filter(u => u.ativo !== false)
    .slice()
    .sort((a, b) => {
      const ma = String(a.id).match(/(\d+)/);
      const mb = String(b.id).match(/(\d+)/);
      const na = ma ? parseInt(ma[1], 10) : 0;
      const nb = mb ? parseInt(mb[1], 10) : 0;
      return na - nb;
    });

  const cont = { R1: 0, R2: 0, R3: 0, ignorados: 0 };

  utasAtivas.forEach(uta => {
    const m = String(uta.id).match(/(\d+)/);
    const idxUta = m ? parseInt(m[1], 10) : 0;

    const tipo = VC.topologia._classificarUta(uta);
    if (tipo === 'ext_suja') VC.topologia._gerarParaUtaExtSuja(uta, idxUta, cont);
    else if (tipo === 'atrio') VC.topologia._gerarParaUtaAtrio(uta, idxUta, cont);
    else VC.topologia._gerarParaUtaNormal(uta, idxUta, cont);
  });

  // 5. Validar anti-ciclo
  const val = VC.topologia._validarAntiCiclo();
  if (!val.ok) {
    VC.ui.toast('Erro: ciclo detetado em ' + val.erros.length + ' ramal(is).');
    return { ok: false, erro: 'Ciclo', erros: val.erros };
  }

  // 6. Aplicar facetas
  if (VC.topologia.facetas && VC.topologia.facetas.aplicarATodos) {
    VC.topologia.facetas.aplicarATodos();
  }

  // 7. Sincronizar
  VC.estado.forcarSync();
  if (VC._modoAtivo === 'arvore' && VC.arvore && VC.arvore.render) {
    VC.arvore.render();
  }

  // 8. Toast
  const total = cont.R1 + cont.R2 + cont.R3;
  const partes = [];
  partes.push(total + ' ramais');
  partes.push(cont.R1 + ' R1');
  if (cont.R2) partes.push(cont.R2 + ' R2');
  if (cont.R3) partes.push(cont.R3 + ' R3');
  if (cont.ignorados) partes.push(cont.ignorados + ' ignorada(s)');

  let msg = 'Topologia gerada · ' + partes.join(' · ');
  if (utaAtrioCriada) msg += ' · UTA-Atrio criada';

  VC.ui.toast(msg, 'Desfazer', () => {
    if (VC.snap && VC.snap.desfazer) VC.snap.desfazer();
  }, 8000);

  if (VC.debug && VC.debug.info) {
    VC.debug.info('[V9 · Fase 3] ' + msg);
  }

  return {
    ok: true,
    criados: total,
    R1: cont.R1,
    R2: cont.R2,
    R3: cont.R3,
    ignorados: cont.ignorados,
    utaAtrioCriada: utaAtrioCriada ? utaAtrioCriada.id : null
  };
};

/* ============================================================
   5 · TIPOS DE RAMAL (5 tipos) + CONSTRUTOR TOPOLÓGICO
   ============================================================ */
VC.topologia.TIPOS_RAMAL = [
  { id: 'insuflacao', nome: 'Insuflação (Ar Novo / Conforto)', cor: '#6d8fb0' },
  { id: 'extracao', nome: 'Extração Geral (Ar Limpo)', cor: '#7fa88b' },
  { id: 'extracao_suja', nome: 'Extração Dedicada (G4 / Suja)', cor: '#c88a8a' },
  { id: 'retorno', nome: 'Retorno / Recirculação', cor: '#c9a876' },
  { id: 'exaustao_fumo', nome: 'Desenfumagem / Exaustão Técnica', cor: '#9488b8' }
];

VC.topologia.construtor = {
  _pisoFiltro: 'todos',
  _redeFiltro: 'todas',

  atribuirEspaco(espacoId, ramalNome) {
    const esp = (VC.dados.espacos || []).find(e => String(e.id) === String(espacoId) || e.nome === espacoId);
    const ramal = (VC.dados.ramais || []).find(r => r.nome === ramalNome);
    if (!esp || !ramal) return { ok: false, erro: 'Espaço ou ramal inválido' };
    if (VC.snap && VC.snap.capturar) VC.snap.capturar('Atribuir ' + esp.nome + ' a ' + ramalNome);
    const redeR = ramal.rede || 'insuflacao';
    if (redeR === 'insuflacao') esp.ramalRefInsuflacao = ramal.nome;
    else esp.ramalRefExtracao = ramal.nome;
    (VC.dados.terminais || []).forEach(t => {
      const serveEspaco = (t.espacos || []).some(x => x.nome === esp.nome);
      if (!serveEspaco) return;
      if (t.rede === redeR || (redeR === 'extracao_suja' && t.rede === 'extracao')) {
        t.ramalRef = ramal.nome;
      }
    });
    VC.estado.forcarSync();
    return { ok: true };
  },

  render() {
    const cont = document.getElementById('construtorCorpo');
    if (!cont) return;
    const ramais = VC.dados.ramais || [];
    const espacos = VC.dados.espacos || [];
    let h = '<div class="cartao" style="margin-bottom:14px">';
    h += '<div class="cartao-titulo"><i class="fa-solid fa-compass-drafting"></i> Construtor Topológico · Associação Rápida Espaços ↔ Ramais</div>';
    h += '<p style="font-size:11.5px;color:var(--texto-med);margin-bottom:12px">Atribua rapidamente os ramais de insuflação e extração a cada espaço e consulte abaixo o <b>Mapa de Obra (BOM)</b> em tempo real.</p>';
    const ramaisIns = ramais.filter(r => r.rede === 'insuflacao');
    const ramaisExt = ramais.filter(r => r.rede !== 'insuflacao');
    h += '<div class="tabela-wrap" style="max-height:360px;overflow-y:auto"><table class="tabela densa"><thead><tr>';
    h += '<th>Espaço</th><th>Tipo</th><th>Zona</th><th>Q_total (m³/h)</th><th>Ramal Insuflação</th><th>Ramal Extração</th>';
    h += '</tr></thead><tbody>';
    espacos.forEach(e => {
      const c = VC.calculo.calcularQEspaco(e);
      h += '<tr>';
      h += '<td><b>' + VC.utils.esc(e.nome) + '</b></td>';
      h += '<td>' + VC.utils.esc(e.tipo) + '</td>';
      h += '<td>' + VC.utils.esc(e.zona || '—') + '</td>';
      h += '<td><span class="valor-derivado">' + VC.utils.fmt(c.Q_total, 0) + '</span></td>';
      h += '<td><select onchange="VC.topologia.construtor.atribuirEspaco(' + e.id + ', this.value);VC.topologia.construtor.render();"><option value="">—</option>';
      ramaisIns.forEach(r => {
        h += '<option value="' + VC.utils.esc(r.nome) + '"' + (e.ramalRefInsuflacao === r.nome ? ' selected' : '') + '>' + VC.utils.esc(r.nome) + ' (Ø' + (r.Dcom || '—') + ')</option>';
      });
      h += '</select></td>';
      h += '<td><select onchange="VC.topologia.construtor.atribuirEspaco(' + e.id + ', this.value);VC.topologia.construtor.render();"><option value="">—</option>';
      ramaisExt.forEach(r => {
        h += '<option value="' + VC.utils.esc(r.nome) + '"' + (e.ramalRefExtracao === r.nome ? ' selected' : '') + '>' + VC.utils.esc(r.nome) + ' (Ø' + (r.Dcom || '—') + ')</option>';
      });
      h += '</select></td>';
      h += '</tr>';
    });
    h += '</tbody></table></div></div>';

    h += '<div class="cartao">';
    h += '<div class="cartao-titulo"><i class="fa-solid fa-cubes"></i> Mapa de Quantidades de Obra (BOM · Condutas e Acessórios)</div>';
    h += (VC.bom ? VC.bom.renderTabela() : '');
    h += '</div>';
    cont.innerHTML = h;
  }
};

/* ============================================================
   6 · MÓDULO 11-BOM (Mapa de Obra · Agregação por Diâmetro Comercial)
   ============================================================ */
VC._boot.partes.push('11-bom');

VC.bom = {
  extrair: function (opcoes) {
    opcoes = opcoes || {};
    const trechos = VC.dados.trechos || [];
    const elementos = VC.dados.elementosRede || [];
    const ramais = VC.dados.ramais || [];

    if (!trechos.length && !ramais.length) {
      return {
        linhas: [],
        totais: { metros: 0, trechos: 0, elementos: 0, peso: 0, n_diametros: 0, elementosPorTipo: {} },
        vazio: true
      };
    }

    const DENSIDADES = {
      'aco galvanizado': 7850,
      'aco inox': 7900,
      'aluminio': 2700,
      'pvc': 1400,
      'fibra': 2000
    };

    function normalizarMaterial(mat) {
      return String(mat || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    }

    function pegarComprimento(tr, ramal) {
      if (tr && tr.L_total !== undefined && tr.L_total !== null) return Number(tr.L_total);
      if (tr && tr.L_reto !== undefined && tr.L_reto !== null) return Number(tr.L_reto);
      if (ramal && ramal.L !== undefined && ramal.L !== null) return Number(ramal.L);
      return 0;
    }

    const porDiametro = new Map();
    const fonteIteracao = trechos.length ? trechos : ramais.map(r => ({ ramalRef: r.nome, L_total: r.L, material: (r.geometriaInput && r.geometriaInput.material) || 'Aço galvanizado' }));

    fonteIteracao.forEach(function (tr) {
      const ramal = ramais.find(function (r) { return r.nome === tr.ramalRef; });
      if (!ramal) return;
      const D = Number(ramal.Dcom) || 0;
      if (D <= 0) return;
      const L = pegarComprimento(tr, ramal) || 0;
      const material = tr.material || (ramal.geometriaInput && ramal.geometriaInput.material) || 'Aço galvanizado';
      const rede = ramal.rede || 'insuflacao';

      const chave = D + '|' + material + '|' + rede;
      if (!porDiametro.has(chave)) {
        porDiametro.set(chave, {
          diametro: D,
          material: material,
          rede: rede,
          metros: 0,
          n_trechos: 0,
          ramais: []
        });
      }
      const item = porDiametro.get(chave);
      item.metros += L;
      item.n_trechos++;
      item.ramais.push(tr.ramalRef);
    });

    const elementosPorTipo = {};
    elementos.forEach(function (el) {
      const k = el.tipo || 'Outro';
      elementosPorTipo[k] = (elementosPorTipo[k] || 0) + 1;
    });

    const linhas = Array.from(porDiametro.values()).sort(function (a, b) {
      return a.diametro - b.diametro;
    });

    linhas.forEach(function (l) {
      const chaveMat = normalizarMaterial(l.material);
      const rhoMat = DENSIDADES[chaveMat] || DENSIDADES['aco galvanizado'];
      const esp = Math.max(0.5, l.diametro / 100);
      l.peso_kg = Math.PI * (l.diametro / 1000) * (esp / 1000) * rhoMat * l.metros;
      l.peso_kg = Math.round(l.peso_kg * 100) / 100;
    });

    const totais = {
      metros: Math.round(linhas.reduce(function (s, l) { return s + l.metros; }, 0) * 10) / 10,
      trechos: linhas.reduce(function (s, l) { return s + l.n_trechos; }, 0),
      elementos: elementos.length,
      peso: Math.round(linhas.reduce(function (s, l) { return s + l.peso_kg; }, 0) * 10) / 10,
      n_diametros: linhas.length,
      elementosPorTipo: elementosPorTipo
    };

    return { linhas: linhas, totais: totais, vazio: linhas.length === 0 };
  },

  renderTabela: function () {
    const r = VC.bom.extrair();
    if (r.vazio) {
      return '<div class="vazio" style="padding:20px">Sem condutas dimensionadas. Execute a decomposição primeiro.</div>';
    }

    let h = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px">';
    h += '<div style="background:#f8fafc;border:1px solid #cbd5e1;border-left:3px solid #2563eb;border-radius:5px;padding:8px 10px">'
       + '<div style="font-size:9.5px;color:#64748b;text-transform:uppercase;font-weight:800">Total metros</div>'
       + '<div style="font-size:18px;font-weight:900;color:#1e40af">' + r.totais.metros + ' m</div></div>';
    h += '<div style="background:#f8fafc;border:1px solid #cbd5e1;border-left:3px solid #16a34a;border-radius:5px;padding:8px 10px">'
       + '<div style="font-size:9.5px;color:#64748b;text-transform:uppercase;font-weight:800">Trechos</div>'
       + '<div style="font-size:18px;font-weight:900;color:#166534">' + r.totais.trechos + '</div></div>';
    h += '<div style="background:#f8fafc;border:1px solid #cbd5e1;border-left:3px solid #ca8a04;border-radius:5px;padding:8px 10px">'
       + '<div style="font-size:9.5px;color:#64748b;text-transform:uppercase;font-weight:800">Diâmetros</div>'
       + '<div style="font-size:18px;font-weight:900;color:#854d0e">' + r.totais.n_diametros + '</div></div>';
    h += '<div style="background:#f8fafc;border:1px solid #cbd5e1;border-left:3px solid #7c3aed;border-radius:5px;padding:8px 10px">'
       + '<div style="font-size:9.5px;color:#64748b;text-transform:uppercase;font-weight:800">Peso estimado</div>'
       + '<div style="font-size:18px;font-weight:900;color:#6d28d9">' + r.totais.peso + ' kg</div></div>';
    h += '</div>';

    h += '<div style="overflow:auto;border:1px solid #cbd5e1;border-radius:6px">'
       + '<table style="width:100%;border-collapse:collapse;font-size:11.5px">';
    h += '<thead><tr style="background:#eef2f7">';
    ['Ø (mm)', 'Material', 'Rede', 'Metros (m)', 'Nº Trechos', 'Peso (kg)'].forEach(function (c) {
      h += '<th style="text-align:left;padding:7px 9px;font-size:10px;text-transform:uppercase;color:#5a6b7c;font-weight:800;border-bottom:1px solid #cbd5e1">' + c + '</th>';
    });
    h += '</tr></thead><tbody>';
    r.linhas.forEach(function (l) {
      h += '<tr>';
      h += '<td style="padding:6px 9px;border-bottom:1px solid #eef2f7;font-weight:800;color:#1e40af">Ø' + l.diametro + '</td>';
      h += '<td style="padding:6px 9px;border-bottom:1px solid #eef2f7">' + VC.utils.esc(l.material) + '</td>';
      h += '<td style="padding:6px 9px;border-bottom:1px solid #eef2f7">' + VC.utils.esc(l.rede) + '</td>';
      h += '<td style="padding:6px 9px;border-bottom:1px solid #eef2f7;font-family:ui-monospace,monospace;font-weight:800">' + VC.utils.fmt(l.metros, 1) + '</td>';
      h += '<td style="padding:6px 9px;border-bottom:1px solid #eef2f7;text-align:center">' + l.n_trechos + '</td>';
      h += '<td style="padding:6px 9px;border-bottom:1px solid #eef2f7;font-family:ui-monospace,monospace">' + l.peso_kg + '</td>';
      h += '</tr>';
    });
    h += '</tbody></table></div>';

    const tipos = r.totais.elementosPorTipo;
    if (Object.keys(tipos).length) {
      h += '<h4 style="margin:16px 0 8px;font-size:11.5px;font-weight:800;color:#0f172a">Elementos de Rede (singularidades)</h4>';
      h += '<div style="display:flex;flex-wrap:wrap;gap:6px">';
      Object.keys(tipos).forEach(function (k) {
        h += '<span style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:700">'
          + VC.utils.esc(k) + ': ' + tipos[k] + '</span>';
      });
      h += '</div>';
    }
    return h;
  },

  exportarCSV: function () {
    const r = VC.bom.extrair();
    if (r.vazio) { VC.ui.toast('Sem dados para exportar.'); return; }
    const linhas = [['Diametro_mm', 'Material', 'Rede', 'Metros', 'N_Trechos', 'Peso_kg']];
    r.linhas.forEach(function (l) {
      linhas.push([l.diametro, l.material, l.rede, l.metros, l.n_trechos, l.peso_kg]);
    });
    const csv = '\ufeff' + linhas.map(function (row) {
      return row.map(function (v) { return '"' + String(v) + '"'; }).join(';');
    }).join('\r\n');
    VC.utils.download(
      'VentiCondutas_v' + VC.versaoCurta + '_BOM_' + new Date().toISOString().slice(0, 10) + '.csv',
      csv,
      'text/csv;charset=utf-8'
    );
    VC.ui.toast('BOM exportado em CSV.');
  }
};

console.log(
  '%c[VentiCondutas v9.0.2] 09-topologia + Construtor + 11-bom carregados',
  'color:#6d8fb0;font-weight:bold;background:#eaf1f7;padding:3px 6px;border-radius:3px'
);

})();