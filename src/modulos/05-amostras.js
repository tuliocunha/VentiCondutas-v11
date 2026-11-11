/* ============================================================
   VENTCONDUTAS V9.0 · 05-amostras
   Exemplo PoliUne + Gestão de Exemplos + Flags + Helpers RPH/QAI

   ALTERAÇÕES V9.0 (Fase 3):
   - Novo VC.exemploV9_2 (async) que carrega exemplos/poliune-v02.json
   - VC.exemplos.carregar('polune-v8') prefere exemploV9_2
   - Descrição do exemplo pré-carregado atualizada (75 espaços)
   - Restante código mantido (exemploV6 clássico disponível como fallback)

   DEPENDE DE: 01-fundamentos.js + 02-biblioteca.js + 03-dimensionamento.js
   ============================================================ */
(function () {
'use strict';
const VC = window.VC;
window.VC6 = window.VC6 || {};
const VC6 = window.VC6;
VC._boot.partes.push('05-amostras');

/* ============================================================
   F-RPH · Helper de aplicação de RPH
   ============================================================ */
VC.rph = VC.rph || {
  calcularDefault(esp) {
    try {
      const def = VC.normas.getDef(esp.tipo);
      const g = esp.grupoForcado || def.g;
      const H = Number(esp.H) || 0;
      const tabela = VC.conhecimento.rphDefault || VC._normativo.rphDefault;
      if (!tabela) return { rph: 0, classe: '—', classeNome: '—', base: '—', g };
      const chave = 'G' + g;
      const lista = tabela[chave] || tabela.G1 || [];
      const linha = lista.find(x => H <= x.hMax) || lista[lista.length - 1] || { rph: 0, classe: '—', classeNome: '—', base: '—' };
      return { rph: Number(linha.rph) || 0, classe: linha.classe || '—', classeNome: linha.classeNome || '—', base: linha.base || '—', g };
    } catch (e) {
      return { rph: 0, classe: '—', classeNome: '—', base: '—', g: 1 };
    }
  },
  aplicarDefaultSeVazio(esp) {
    if (!esp) return false;
    if (esp.rphOrigem === 'utilizador') return false;
    const d = this.calcularDefault(esp);
    esp.rphDefault = d.rph;
    esp.rphAplicado = d.rph;
    esp.rphOrigem = 'norma';
    esp.rphClasse = d.classe;
    esp.rphClasseNome = d.classeNome;
    esp.rphBase = d.base;
    return true;
  },
  reporNorma(esp) {
    if (!esp) return;
    const d = this.calcularDefault(esp);
    esp.rphDefault = d.rph;
    esp.rphAplicado = d.rph;
    esp.rphOrigem = 'norma';
    esp.rphClasse = d.classe;
    esp.rphClasseNome = d.classeNome;
    esp.rphBase = d.base;
  },
  aplicarUtilizador(esp, valor) {
    if (!esp) return;
    esp.rphAplicado = Math.max(0, Number(valor) || 0);
    esp.rphOrigem = 'utilizador';
  },
  calcularQConforto(esp) {
    if (!VC.flags || VC.flags.confortoTermico === false) return 0;
    if (!esp) return 0;
    const V = Number(esp.V) || (Number(esp.A) * Number(esp.H)) || 0;
    const rph = Number(esp.rphAplicado) || 0;
    return rph * V;
  },
  aplicarATodos() {
    let n = 0;
    (VC.dados.espacos || []).forEach(e => {
      if (this.aplicarDefaultSeVazio(e)) n++;
    });
    return n;
  }
};

/* ============================================================
   V8.0.1 · QAI_projeto · Helper (mesmo esquema do RPH)
   ============================================================ */
VC.qai = VC.qai || {
  calcularRedeDefault(esp) {
    if (!esp) return 'insuflacao';
    const def = VC.normas.getDef(esp.tipo);
    const g = esp.grupoForcado || def.g || 1;
    const tabela = VC.conhecimento.qaiProjetoRedeDefault || VC._normativo.qaiProjetoRedeDefault || {};
    return tabela[g] || 'insuflacao';
  },
  resolverRede(esp) {
    if (!esp) return 'insuflacao';
    const r = esp.QAI_projeto_rede || 'auto';
    if (r === 'auto') return this.calcularRedeDefault(esp);
    return r;
  },
  aplicarDefaultSeVazio(esp) {
    if (!esp) return false;
    if (esp.QAI_projeto_origem === 'utilizador') return false;
    if (Number(esp.QAI_projeto) > 0 && esp.QAI_projeto_origem && esp.QAI_projeto_origem !== 'norma') return false;
    esp.QAI_projeto = 0;
    esp.QAI_projeto_origem = 'norma';
    esp.QAI_projeto_motivo = '';
    esp.QAI_projeto_rede = 'auto';
    return true;
  },
  reporNorma(esp) {
    if (!esp) return;
    esp.QAI_projeto = 0;
    esp.QAI_projeto_origem = 'norma';
    esp.QAI_projeto_motivo = '';
    esp.QAI_projeto_rede = 'auto';
    esp.QAI_projeto_repostoEm = new Date().toISOString();
  },
  aplicarUtilizador(esp, valor, motivo, rede) {
    if (!esp) return { ok: false, erro: 'Espaço inválido' };
    const v = Math.max(0, Number(valor) || 0);
    const m = String(motivo == null ? '' : motivo).trim();
    if (v > 0 && !m) {
      return { ok: false, erro: 'Motivo é obrigatório quando QAI_projeto > 0' };
    }
    esp.QAI_projeto = v;
    esp.QAI_projeto_origem = v > 0 ? 'utilizador' : 'norma';
    esp.QAI_projeto_motivo = m;
    esp.QAI_projeto_rede = rede || 'auto';
    esp.QAI_projeto_definidoEm = new Date().toISOString();
    return { ok: true };
  },
  calcularQAIAplicado(esp) {
    if (!VC.flags || VC.flags.qaiProjeto === false) return 0;
    if (!esp) return 0;
    return Math.max(0, Number(esp.QAI_projeto) || 0);
  },
  aplicarATodos() {
    let n = 0;
    (VC.dados.espacos || []).forEach(e => {
      if (this.aplicarDefaultSeVazio(e)) n++;
    });
    return n;
  }
};

/* ============================================================
   EXEMPLO POLIUNE V8 (clássico — 35 espaços)
   Mantido como fallback do exemploV9_2
   ============================================================ */
VC.exemploV6 = function () {
  const defEspacos = [
    { id: 1,  nome: 'Arrumo P0-N1',        tipo: 'Arrumo',           classeAr: 2, geometriaMetodo: 'V',  H: 2.6, A: 5.14,   V: 13.364,  N: 0,  zona: 'Piso 0 - Norte' },
    { id: 2,  nome: 'Arrumo P0-N2',        tipo: 'Arrumo',           classeAr: 2, geometriaMetodo: 'V',  H: 2.6, A: 2.12,   V: 5.512,   N: 0,  zona: 'Piso 0 - Norte' },
    { id: 3,  nome: 'Casa Banho P0-N1',    tipo: 'Sanitários',       classeAr: 3, geometriaMetodo: 'V',  H: 2.6, A: 10.05,  V: 26.13,   N: 0,  regimeSanitario: 'privado_continuo', zona: 'Piso 0 - Norte' },
    { id: 4,  nome: 'Casa Banho P0-N2',    tipo: 'Sanitários',       classeAr: 3, geometriaMetodo: 'V',  H: 2.6, A: 8.6,    V: 22.36,   N: 0,  regimeSanitario: 'privado_continuo', zona: 'Piso 0 - Norte' },
    { id: 5,  nome: 'Casa Banho P0-N3',    tipo: 'Sanitários',       classeAr: 3, geometriaMetodo: 'V',  H: 2.6, A: 1.48,   V: 3.848,   N: 0,  regimeSanitario: 'privado_continuo', zona: 'Piso 0 - Norte' },
    { id: 6,  nome: 'Circulação P0-N1',    tipo: 'Circulação',       classeAr: 2, geometriaMetodo: 'V',  H: 7,   A: 71.53,  V: 500.71,  N: 0,  zona: 'Piso 0 - Norte' },
    { id: 7,  nome: 'Circulação P0-N2',    tipo: 'Circulação',       classeAr: 2, geometriaMetodo: 'V',  H: 2.6, A: 7.49,   V: 19.474,  N: 0,  zona: 'Piso 0 - Norte' },
    { id: 8,  nome: 'Garagem P0-N1',       tipo: 'Garagem',          classeAr: 3, geometriaMetodo: 'V',  H: 2.6, A: 26.4,   V: 68.64,   N: 0,  zona: 'Piso 0 - Norte' },
    { id: 9,  nome: 'Sala P0-N1',          tipo: 'Escritório',       classeAr: 1, geometriaMetodo: 'AH', H: 2.6, A: 9,      V: 23.4,    N: 1,  Rp: 8, Ra: 0.8, zona: 'Piso 0 - Norte' },
    { id: 10, nome: 'Sala P0-N2',          tipo: 'Escritório',       classeAr: 1, geometriaMetodo: 'AH', H: 2.6, A: 12.6,   V: 32.76,   N: 1,  Rp: 8, Ra: 0.8, zona: 'Piso 0 - Norte' },
    { id: 11, nome: 'Sala P0-N3',          tipo: 'Escritório',       classeAr: 1, geometriaMetodo: 'AH', H: 2.6, A: 15.66,  V: 40.716,  N: 2,  Rp: 8, Ra: 0.8, zona: 'Piso 0 - Norte' },
    { id: 12, nome: 'Sala P0-N4',          tipo: 'Escritório',       classeAr: 1, geometriaMetodo: 'AH', H: 2.6, A: 15.66,  V: 40.716,  N: 2,  Rp: 8, Ra: 0.8, zona: 'Piso 0 - Norte' },
    { id: 13, nome: 'Sala P0-N5',          tipo: 'Escritório',       classeAr: 1, geometriaMetodo: 'AH', H: 2.6, A: 7.26,   V: 18.876,  N: 1,  Rp: 8, Ra: 0.8, zona: 'Piso 0 - Norte' },
    { id: 14, nome: 'Circulação P0-S1',    tipo: 'Circulação',       classeAr: 2, geometriaMetodo: 'V',  H: 2.6, A: 18.53,  V: 48.178,  N: 0,  zona: 'Piso 0 - Sul' },
    { id: 15, nome: 'Escada P0-S1',        tipo: 'Escadas',          classeAr: 2, geometriaMetodo: 'V',  H: 2.6, A: 11.35,  V: 29.51,   N: 0,  zona: 'Piso 0 - Sul' },
    { id: 16, nome: 'Escada P0-S2',        tipo: 'Escadas',          classeAr: 2, geometriaMetodo: 'V',  H: 2.6, A: 6.35,   V: 16.51,   N: 0,  zona: 'Piso 0 - Sul' },
    { id: 17, nome: 'Hall P0-S1',          tipo: 'Receção',          classeAr: 1, geometriaMetodo: 'AH', H: 2.6, A: 28.35,  V: 73.71,   N: 2,  Rp: 8, Ra: 0.8, zona: 'Piso 0 - Sul' },
    { id: 18, nome: 'Refeitório P0-S1',    tipo: 'Restauração',      classeAr: 3, geometriaMetodo: 'AH', H: 2.6, A: 31.1,   V: 80.86,   N: 6,  Rp: 10, Ra: 1.0, zona: 'Piso 0 - Sul' },
    { id: 19, nome: 'Sala P0-S1',          tipo: 'Escritório',       classeAr: 1, geometriaMetodo: 'AH', H: 2.6, A: 17,     V: 44.2,    N: 2,  Rp: 8, Ra: 0.8, zona: 'Piso 0 - Sul' },
    { id: 20, nome: 'Sala P0-S2',          tipo: 'Escritório',       classeAr: 1, geometriaMetodo: 'AH', H: 2.6, A: 17,     V: 44.2,    N: 2,  Rp: 8, Ra: 0.8, zona: 'Piso 0 - Sul' },
    { id: 21, nome: 'Sala P0-S3',          tipo: 'Escritório',       classeAr: 1, geometriaMetodo: 'AH', H: 2.6, A: 34.2,   V: 88.92,   N: 4,  Rp: 8, Ra: 0.8, zona: 'Piso 0 - Sul' },
    { id: 22, nome: 'Sala P0-S4',          tipo: 'Escritório',       classeAr: 1, geometriaMetodo: 'AH', H: 2.6, A: 34.4,   V: 89.44,   N: 4,  Rp: 8, Ra: 0.8, zona: 'Piso 0 - Sul' },
    { id: 23, nome: 'Sala P0-S5',          tipo: 'Escritório',       classeAr: 1, geometriaMetodo: 'AH', H: 2.6, A: 26.1,   V: 67.86,   N: 3,  Rp: 8, Ra: 0.8, zona: 'Piso 0 - Sul' },
    { id: 24, nome: 'Circulação P1-N1',    tipo: 'Circulação',       classeAr: 2, geometriaMetodo: 'V',  H: 2.6, A: 16.22,  V: 42.172,  N: 0,  zona: 'Piso 1 - Norte' },
    { id: 25, nome: 'Circulação P1-N2',    tipo: 'Circulação',       classeAr: 2, geometriaMetodo: 'V',  H: 2.6, A: 11.72,  V: 30.472,  N: 0,  zona: 'Piso 1 - Norte' },
    { id: 26, nome: 'Sala P1-N1',          tipo: 'Escritório',       classeAr: 1, geometriaMetodo: 'AH', H: 2.6, A: 13.98,  V: 36.348,  N: 1,  Rp: 8, Ra: 0.8, zona: 'Piso 1 - Norte' },
    { id: 27, nome: 'Sala P1-N2',          tipo: 'Escritório',       classeAr: 1, geometriaMetodo: 'AH', H: 2.6, A: 15.3,   V: 39.78,   N: 2,  Rp: 8, Ra: 0.8, zona: 'Piso 1 - Norte' },
    { id: 28, nome: 'Sala P1-N3',          tipo: 'Escritório',       classeAr: 1, geometriaMetodo: 'AH', H: 2.6, A: 16.22,  V: 42.172,  N: 2,  Rp: 8, Ra: 0.8, zona: 'Piso 1 - Norte' },
    { id: 29, nome: 'Sala P1-N4',          tipo: 'Escritório',       classeAr: 1, geometriaMetodo: 'AH', H: 2.6, A: 16.22,  V: 42.172,  N: 2,  Rp: 8, Ra: 0.8, zona: 'Piso 1 - Norte' },
    { id: 30, nome: 'Sala P1-N5',          tipo: 'Escritório',       classeAr: 1, geometriaMetodo: 'AH', H: 2.6, A: 33.61,  V: 87.386,  N: 4,  Rp: 8, Ra: 0.8, zona: 'Piso 1 - Norte' },
    { id: 31, nome: 'Escada P1-S1',        tipo: 'Escadas',          classeAr: 2, geometriaMetodo: 'V',  H: 2.6, A: 15.06,  V: 39.156,  N: 0,  zona: 'Piso 1 - Sul' },
    { id: 32, nome: 'Hall P1-S1',          tipo: 'Receção',          classeAr: 1, geometriaMetodo: 'AH', H: 2.6, A: 19.48,  V: 50.648,  N: 2,  Rp: 8, Ra: 0.8, zona: 'Piso 1 - Sul' },
    { id: 33, nome: 'Sala P1-S1',          tipo: 'Escritório',       classeAr: 1, geometriaMetodo: 'AH', H: 2.6, A: 15.71,  V: 40.846,  N: 2,  Rp: 8, Ra: 0.8, zona: 'Piso 1 - Sul' },
    { id: 34, nome: 'Sala P1-S2',          tipo: 'Escritório',       classeAr: 1, geometriaMetodo: 'AH', H: 2.6, A: 109.17, V: 283.842, N: 12, Rp: 8, Ra: 0.8, zona: 'Piso 1 - Sul' },
    { id: 35, nome: 'Sala P1-S3',          tipo: 'Escritório',       classeAr: 1, geometriaMetodo: 'AH', H: 2.6, A: 9.72,   V: 25.272,  N: 1,  Rp: 8, Ra: 0.8, zona: 'Piso 1 - Sul' }
  ];

  VC.dados.espacos = defEspacos.map(e => {
    const esp = Object.assign({}, e, {
      localizacao: VC.utils.parseZona(e.zona),
      definicoes: [],
      Q_espaco: 0,
      Q_normas: 0,
      Q_ConTerm: 0,
      QAI_projeto: 0,
      QAI_projeto_origem: 'norma',
      QAI_projeto_motivo: '',
      QAI_projeto_rede: 'auto',
      Q_total: 0,
      ramalRefInsuflacao: '',
      ramalRefExtracao: '',
      balanco: { Q_in_direto: 0, Q_out_direto: 0, Q_conforto_in: 0, Q_conforto_out: 0, Q_transf_in: 0, Q_transf_out: 0, exfiltracao: 0, residuo: 0, pressao_relativa_Pa: 0, estado: 'PENDENTE' },
      transferencias: []
    });
    VC.rph.aplicarDefaultSeVazio(esp);
    VC.qai.aplicarDefaultSeVazio(esp);
    return esp;
  });

  VC.dados.utas = [];
  VC.dados.nextId.uta = 1;

  const utaNorteIns = VC.uta.criar('UTA-Norte-Insuflação', 'insuflacao', 'Norte');
  utaNorteIns.componentes = VC.uta.componentesPadrao();
  VC.curvasFabricantes.aplicarNaUTA(utaNorteIns, 'Sodeca', 'HCT/CHT', 'HCT-250');

  const utaNorteExt = VC.uta.criar('UTA-Norte-Extração', 'extracao', 'Norte');
  utaNorteExt.componentes = VC.uta.componentesExtracao();
  VC.curvasFabricantes.aplicarNaUTA(utaNorteExt, 'Sistemair', 'Série M', 'M315');

  const utaSulIns = VC.uta.criar('UTA-Sul-Insuflação', 'insuflacao', 'Sul');
  utaSulIns.componentes = VC.uta.componentesPadrao();
  VC.curvasFabricantes.aplicarNaUTA(utaSulIns, 'Sodeca', 'HCT/CHT', 'CHT-315');

  const utaSulExt = VC.uta.criar('UTA-Sul-Extração', 'extracao', 'Sul');
  utaSulExt.componentes = VC.uta.componentesExtracao();
  VC.curvasFabricantes.aplicarNaUTA(utaSulExt, 'Soler & Palau', 'Série TD', 'TD-800');

  const utaExtSuja = VC.uta.criar('UTA-Extração-Suja', 'extracao_suja', 'Transversal');
  utaExtSuja.componentes = VC.uta.componentesExtracao();
  VC.curvasFabricantes.aplicarNaUTA(utaExtSuja, 'Sistemair', 'Série M', 'M200');

  VC.dados.ramais = [
    { id: 1, nome: 'R1.1', nomeAntigo: 'Principal UTA-Norte-Insuflação', parente: '', tipo: 'Principal', nivel: 'primario', nivelNumero: 1, rede: 'insuflacao', utaRef: utaNorteIns.id, classeAr: 1, L: 25, zeta: 0.8, localizacao: { piso: 'P0', ala: 'Norte', cota: null }, geometriaInput: { material: 'Aço galvanizado', rugosidade: 0.15, forma: 'circular', H_max: 250 }, lock: { D: false }, deltaP_filtro: 85, deltaP_bateria: 65, deltaP_recup: 110, deltaP_registo: 25 },
    { id: 2, nome: 'R1.1.1', nomeAntigo: 'Sub-ramal Insuflação P0 Norte', parente: 'R1.1', tipo: 'Sub-ramal', nivel: 'secundario', nivelNumero: 2, rede: 'insuflacao', classeAr: 1, L: 15, zeta: 0.5, localizacao: { piso: 'P0', ala: 'Norte', cota: null }, geometriaInput: { material: 'Aço galvanizado', rugosidade: 0.15, forma: 'circular', H_max: 250 }, lock: { D: false } },
    { id: 3, nome: 'R1.1.2', nomeAntigo: 'Sub-ramal Insuflação P1 Norte', parente: 'R1.1', tipo: 'Sub-ramal', nivel: 'secundario', nivelNumero: 2, rede: 'insuflacao', classeAr: 1, L: 12, zeta: 0.5, localizacao: { piso: 'P1', ala: 'Norte', cota: null }, geometriaInput: { material: 'Aço galvanizado', rugosidade: 0.15, forma: 'circular', H_max: 250 }, lock: { D: false } },
    { id: 4, nome: 'R2.1', nomeAntigo: 'Principal UTA-Norte-Extração', parente: '', tipo: 'Principal', nivel: 'primario', nivelNumero: 1, rede: 'extracao', utaRef: utaNorteExt.id, classeAr: 1, L: 25, zeta: 0.8, localizacao: { piso: 'P0', ala: 'Norte', cota: null }, geometriaInput: { material: 'Aço galvanizado', rugosidade: 0.15, forma: 'circular', H_max: 250 }, lock: { D: false }, deltaP_filtro: 85, deltaP_bateria: 0, deltaP_recup: 110, deltaP_registo: 25 },
    { id: 5, nome: 'R2.1.1', nomeAntigo: 'Sub-ramal Extração P0 Norte', parente: 'R2.1', tipo: 'Sub-ramal', nivel: 'secundario', nivelNumero: 2, rede: 'extracao', classeAr: 1, L: 15, zeta: 0.5, localizacao: { piso: 'P0', ala: 'Norte', cota: null }, geometriaInput: { material: 'Aço galvanizado', rugosidade: 0.15, forma: 'circular', H_max: 250 }, lock: { D: false } },
    { id: 6, nome: 'R2.1.2', nomeAntigo: 'Sub-ramal Extração P1 Norte', parente: 'R2.1', tipo: 'Sub-ramal', nivel: 'secundario', nivelNumero: 2, rede: 'extracao', classeAr: 1, L: 12, zeta: 0.5, localizacao: { piso: 'P1', ala: 'Norte', cota: null }, geometriaInput: { material: 'Aço galvanizado', rugosidade: 0.15, forma: 'circular', H_max: 250 }, lock: { D: false } },
    { id: 7, nome: 'R1.2', nomeAntigo: 'Principal UTA-Sul-Insuflação', parente: '', tipo: 'Principal', nivel: 'primario', nivelNumero: 1, rede: 'insuflacao', utaRef: utaSulIns.id, classeAr: 1, L: 25, zeta: 0.8, localizacao: { piso: 'P0', ala: 'Sul', cota: null }, geometriaInput: { material: 'Aço galvanizado', rugosidade: 0.15, forma: 'circular', H_max: 250 }, lock: { D: false }, deltaP_filtro: 85, deltaP_bateria: 65, deltaP_recup: 110, deltaP_registo: 25 },
    { id: 8, nome: 'R1.2.1', nomeAntigo: 'Sub-ramal Insuflação P0 Sul', parente: 'R1.2', tipo: 'Sub-ramal', nivel: 'secundario', nivelNumero: 2, rede: 'insuflacao', classeAr: 1, L: 15, zeta: 0.5, localizacao: { piso: 'P0', ala: 'Sul', cota: null }, geometriaInput: { material: 'Aço galvanizado', rugosidade: 0.15, forma: 'circular', H_max: 250 }, lock: { D: false } },
    { id: 9, nome: 'R1.2.2', nomeAntigo: 'Sub-ramal Insuflação P1 Sul', parente: 'R1.2', tipo: 'Sub-ramal', nivel: 'secundario', nivelNumero: 2, rede: 'insuflacao', classeAr: 1, L: 12, zeta: 0.5, localizacao: { piso: 'P1', ala: 'Sul', cota: null }, geometriaInput: { material: 'Aço galvanizado', rugosidade: 0.15, forma: 'circular', H_max: 250 }, lock: { D: false } },
    { id: 10, nome: 'R2.2', nomeAntigo: 'Principal UTA-Sul-Extração', parente: '', tipo: 'Principal', nivel: 'primario', nivelNumero: 1, rede: 'extracao', utaRef: utaSulExt.id, classeAr: 1, L: 25, zeta: 0.8, localizacao: { piso: 'P0', ala: 'Sul', cota: null }, geometriaInput: { material: 'Aço galvanizado', rugosidade: 0.15, forma: 'circular', H_max: 250 }, lock: { D: false }, deltaP_filtro: 85, deltaP_bateria: 0, deltaP_recup: 110, deltaP_registo: 25 },
    { id: 11, nome: 'R2.2.1', nomeAntigo: 'Sub-ramal Extração P0 Sul', parente: 'R2.2', tipo: 'Sub-ramal', nivel: 'secundario', nivelNumero: 2, rede: 'extracao', classeAr: 1, L: 15, zeta: 0.5, localizacao: { piso: 'P0', ala: 'Sul', cota: null }, geometriaInput: { material: 'Aço galvanizado', rugosidade: 0.15, forma: 'circular', H_max: 250 }, lock: { D: false } },
    { id: 12, nome: 'R2.2.2', nomeAntigo: 'Sub-ramal Extração P1 Sul', parente: 'R2.2', tipo: 'Sub-ramal', nivel: 'secundario', nivelNumero: 2, rede: 'extracao', classeAr: 1, L: 12, zeta: 0.5, localizacao: { piso: 'P1', ala: 'Sul', cota: null }, geometriaInput: { material: 'Aço galvanizado', rugosidade: 0.15, forma: 'circular', H_max: 250 }, lock: { D: false } },
    { id: 13, nome: 'R3.1', nomeAntigo: 'Principal UTA-Extração-Suja', parente: '', tipo: 'Principal', nivel: 'primario', nivelNumero: 1, rede: 'extracao_suja', utaRef: utaExtSuja.id, classeAr: 3, L: 22, zeta: 0.9, localizacao: { piso: 'P0', ala: null, cota: null }, geometriaInput: { material: 'Aço galvanizado', rugosidade: 0.15, forma: 'circular', H_max: 250 }, lock: { D: false }, deltaP_filtro: 85, deltaP_bateria: 0, deltaP_recup: 0, deltaP_registo: 25 },
    { id: 14, nome: 'R3.1.1', nomeAntigo: 'Sub-ramal Sanitários P0 Norte', parente: 'R3.1', tipo: 'Sub-ramal', nivel: 'secundario', nivelNumero: 2, rede: 'extracao_suja', classeAr: 3, L: 10, zeta: 1.0, localizacao: { piso: 'P0', ala: 'Norte', cota: null }, geometriaInput: { material: 'Aço galvanizado', rugosidade: 0.15, forma: 'circular', H_max: 250 }, lock: { D: false } },
    { id: 15, nome: 'R3.1.2', nomeAntigo: 'Sub-ramal Garagem P0 Norte', parente: 'R3.1', tipo: 'Sub-ramal', nivel: 'secundario', nivelNumero: 2, rede: 'extracao_suja', classeAr: 3, L: 12, zeta: 0.8, localizacao: { piso: 'P0', ala: 'Norte', cota: null }, geometriaInput: { material: 'Aço galvanizado', rugosidade: 0.15, forma: 'circular', H_max: 250 }, lock: { D: false } },
    { id: 16, nome: 'R3.1.3', nomeAntigo: 'Sub-ramal Refeitório P0 Sul', parente: 'R3.1', tipo: 'Sub-ramal', nivel: 'secundario', nivelNumero: 2, rede: 'extracao_suja', classeAr: 3, L: 10, zeta: 0.9, localizacao: { piso: 'P0', ala: 'Sul', cota: null }, geometriaInput: { material: 'Aço galvanizado', rugosidade: 0.15, forma: 'circular', H_max: 250 }, lock: { D: false } }
  ];

  VC.dados.terminais = [];
  VC.dados.transferencias = [];
  VC.dados.nos = [];
  VC.dados.trechos = [];
  VC.dados.elementosRede = [];
  VC.dados.nextId.espaco = 36;
  VC.dados.nextId.ramal = 17;
  VC.dados.nextId.terminal = 1;
  VC.dados.nextId.no = 1;
  VC.dados.nextId.trecho = 1;
  VC.dados.nextId.elemento = 1;
  VC.dados.nextId.definicao = 1;
  VC.dados.nextId.transferencia = 1;

  VC.dados.metadados = { nome: 'Edifício PoliUne V8', cliente: '', local: 'Portugal', autor: '', revisao: '01' };
  VC.dados.espacoExpandido = null;
  VC.dados.ramalTopologiaAtivo = null;
  VC.dados.historicoConvergencia = [];
  VC.dados._mapaRenomeacao = {};

  VC.calculo.__mig = false;
  VC.calculo.__migEsp = false;
  VC.calculo._autoAssoc = false;
  VC.perf.cacheFisica.invalidar();
  VC.perf.cacheMaterializacao.invalidar();
  VC.perf.ordenacaoTopologica.invalidar();
  VC.perf.cacheBalanco.invalidar();

  function calcularQCirculacao(esp) {
    const V = Number(esp.V) || 0;
    if (esp.tipo === 'Escadas') return 100;
    if (esp.tipo === 'Arrumo') return Math.max(10, V * 1.0);
    return Math.max(20, V * 1.0);
  }

  VC.dados.espacos.forEach(e => {
    const c = VC.calculo.calcularQEspaco(e);
    if (e.classeAr === 1) {
      const Q = c.Q_total || 0;
      if (Q <= 0) return;
      e.definicoes = [
        { id: 'DEF-' + (VC.dados.nextId.definicao++), tipo: 'Difusor', rede: 'insuflacao', quantidade: Math.max(1, Math.ceil(Q / 350)), Q_total: Math.round(Q), origem: 'P138' },
        { id: 'DEF-' + (VC.dados.nextId.definicao++), tipo: 'Grelha Extração', rede: 'extracao', quantidade: Math.max(1, Math.ceil(Q / 300)), Q_total: Math.round(Q), origem: 'P138' }
      ];
    } else if (e.classeAr === 2) {
      const Q = calcularQCirculacao(e);
      e.definicoes = [
        { id: 'DEF-' + (VC.dados.nextId.definicao++), tipo: 'Grelha Insuflação', rede: 'insuflacao', quantidade: Math.max(1, Math.ceil(Q / 300)), Q_total: Math.round(Q), origem: 'Manual' },
        { id: 'DEF-' + (VC.dados.nextId.definicao++), tipo: 'Grelha Extração', rede: 'extracao', quantidade: Math.max(1, Math.ceil(Q / 300)), Q_total: Math.round(Q), origem: 'Manual' }
      ];
    } else if (e.classeAr === 3) {
      const Q = c.Q_total || 0;
      if (Q <= 0) return;
      const tipo = (e.tipo === 'Sanitários') ? 'Boca de Extração' : 'Grelha Extração';
      e.definicoes = [
        { id: 'DEF-' + (VC.dados.nextId.definicao++), tipo, rede: 'extracao_suja', quantidade: Math.max(1, Math.ceil(Q / 250)), Q_total: Math.round(Q), origem: 'P138' }
      ];
    }
  });

  function encontrarEspaco(nome) { return VC.dados.espacos.find(e => e.nome === nome); }
  function criarTransferenciaSePossivel(deNome, paraNome, tipo) {
    const de = encontrarEspaco(deNome);
    const para = encontrarEspaco(paraNome);
    if (!de || !para) return null;
    const qExt = para.definicoes.filter(d => d.rede === 'extracao_suja').reduce((s, d) => s + (Number(d.Q_total) || 0), 0);
    if (qExt <= 0) return null;
    return VC6.transferencias.criar(de.id, para.id, qExt, tipo);
  }

  criarTransferenciaSePossivel('Circulação P0-N1', 'Casa Banho P0-N1', 'fresta_porta');
  criarTransferenciaSePossivel('Circulação P0-N1', 'Casa Banho P0-N2', 'fresta_porta');
  criarTransferenciaSePossivel('Circulação P0-N1', 'Casa Banho P0-N3', 'fresta_porta');
  criarTransferenciaSePossivel('Circulação P0-N1', 'Garagem P0-N1', 'grelha_transferencia');
  criarTransferenciaSePossivel('Circulação P0-S1', 'Refeitório P0-S1', 'grelha_transferencia');

  VC.dados.transferencias.forEach(t => {
    const de = VC.dados.espacos.find(e => e.id === t.deId);
    if (!de || de.classeAr !== 2) return;
    const defIns = de.definicoes.find(d => d.rede === 'insuflacao');
    if (defIns) { defIns.Q_total = Math.round((Number(defIns.Q_total) || 0) + (Number(t.Q) || 0)); defIns.origem = 'Balanço'; }
  });

  function inferirRamal(esp, rede) {
    const loc = esp.localizacao || VC.utils.parseZona(esp.zona || '');
    const piso = (loc.piso || 'P0').toLowerCase();
    const ala = (loc.ala || '').toLowerCase();
    if (rede === 'extracao_suja') {
      if (esp.tipo === 'Sanitários') return 'R3.1.1';
      if (esp.tipo === 'Garagem') return 'R3.1.2';
      if (esp.tipo === 'Restauração') return 'R3.1.3';
      return 'R3.1';
    }
    const prefixo = (rede === 'extracao') ? 'R2' : 'R1';
    let candidato = VC.dados.ramais.find(r => r.rede === rede && r.nome.startsWith(prefixo + '.') && r.nome.toLowerCase().includes(piso) && (ala ? r.nome.toLowerCase().includes(ala) : true));
    if (!candidato) candidato = VC.dados.ramais.find(r => r.rede === rede && r.nome.startsWith(prefixo + '.') && r.nome.toLowerCase().includes(piso));
    if (!candidato) candidato = VC.dados.ramais.find(r => r.rede === rede && r.nivelNumero === 1);
    return candidato ? candidato.nome : '';
  }

  VC.dados.espacos.forEach(e => {
    if (e.classeAr === 1 || e.classeAr === 2) { e.ramalRefInsuflacao = inferirRamal(e, 'insuflacao'); e.ramalRefExtracao = inferirRamal(e, 'extracao'); }
    else if (e.classeAr === 3) { e.ramalRefExtracao = inferirRamal(e, 'extracao_suja'); }
  });

  VC.calculo.migrarRedes();
  VC.perf.cacheMaterializacao.invalidar();
  VC.perf.ordenacaoTopologica.invalidar();
  VC.perf.cacheBalanco.invalidar();
  VC.calculo.calcularTudo();
  VC6.balanco.propagar();

  VC.decompor.limpar();
  VC.decompor.executar(true);

  VC.dados.utas.forEach(u => { if (u.curva && u.curva.length >= 2) u.pontoFunc = VC.uta.calcularPontoFuncionamento(u.rede); });

  const balancos = VC6.balanco.todos();
  const ok = balancos.filter(b => b.estado === 'OK').length;
  VC.debug && VC.debug.info && VC.debug.info('Exemplo PoliUne V8.0.1: ' + VC.dados.espacos.length + ' espaços · ' + VC.dados.ramais.length + ' ramais · ' + VC.dados.terminais.length + ' terminais · ' + VC.dados.transferencias.length + ' transferências · ' + VC.dados.utas.length + ' UTAs · balanço: ' + ok + '/' + balancos.length + ' OK');
};

/* ============================================================
   V9 · Exemplo PoliUne v02 (75 espaços)
   Carregado via fetch de exemplos/poliune-v02.json
   Fallback: se falhar, cai no exemplo clássico (VC.exemploV6)
   ============================================================ */
VC.exemploV9_2 = async function () {
  try {
    // V9.1.2 · Path real está na raiz; tenta exemplos/ primeiro (compatibilidade)
    let url = 'exemplos/poliune-v02.json';
    let resp = await fetch(url);
    if (!resp.ok) {
      url = 'poliune-v02.json';
      resp = await fetch(url);
    }
    if (!resp.ok) throw new Error('HTTP ' + resp.status + ' (' + url + ')');
    const projeto = await resp.json();
    if (!projeto || !projeto.dados) throw new Error('JSON inválido');

    const migrado = VC.migrador.prepararParaImportar(projeto);

    VC.dados.metadados = migrado.metadados || VC.dados.metadados;
    if (migrado.configuracao) {
      if (migrado.configuracao.params) Object.assign(VC.dados.params, migrado.configuracao.params);
      if (migrado.configuracao.tipologia) VC.dados.tipologia = migrado.configuracao.tipologia;
      if (migrado.configuracao.restricaoH) VC.dados.restricaoH = migrado.configuracao.restricaoH;
      if (migrado.configuracao.serieDiametros) VC.dados.serieDiametros = migrado.configuracao.serieDiametros;
    }

    Object.assign(VC.dados, {
      espacos: migrado.dados.espacos || [],
      ramais: migrado.dados.ramais || [],
      terminais: migrado.dados.terminais || [],
      transferencias: migrado.dados.transferencias || [],
      utas: migrado.dados.utas || [],
      nos: migrado.dados.nos || [],
      trechos: migrado.dados.trechos || [],
      elementosRede: migrado.dados.elementosRede || [],
      _mapaRenomeacao: migrado.dados._mapaRenomeacao || {}
    });

    VC.dados.nextId.espaco = (VC.dados.espacos.reduce((m, e) => Math.max(m, Number(e.id) || 0), 0)) + 1;
    VC.dados.nextId.ramal = (VC.dados.ramais.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0)) + 1;
    VC.dados.nextId.terminal = (VC.dados.terminais.reduce((m, t) => Math.max(m, Number(t.id) || 0), 0)) + 1;
    VC.dados.nextId.uta = (VC.dados.utas.reduce((m, u) => Math.max(m, parseInt(String(u.id).replace(/\D/g, ''), 10) || 0), 0)) + 1;

    VC.dados._versao = 'V9';

    VC.perf.cacheFisica.invalidar();
    VC.perf.cacheMaterializacao.invalidar();
    VC.perf.ordenacaoTopologica.invalidar();
    VC.perf.cacheBalanco.invalidar();
    VC.calculo.__mig = false;
    VC.calculo.__migEsp = false;
    VC.calculo._autoAssoc = false;

    if (VC.rph && VC.rph.aplicarATodos) VC.rph.aplicarATodos();
    if (VC.qai && VC.qai.aplicarATodos) VC.qai.aplicarATodos();
    if (VC.topologia && VC.topologia.facetas && VC.topologia.facetas.aplicarATodos) {
      VC.topologia.facetas.aplicarATodos();
    }

    VC.calculo.calcularTudo();
    if (window.VC6 && VC6.balanco) VC6.balanco.propagar();

    if (VC.ui && VC.ui.renderSidebar) VC.ui.renderSidebar();
    if (VC.passos && VC.passos.render) VC.passos.render(VC._passoAtivo || 'setup');

    VC.ui.toast('Exemplo PoliUne v02 carregado · ' + VC.dados.espacos.length + ' espaços · ' + VC.dados.utas.length + ' UTAs');
    return true;
  } catch (e) {
    if (VC.debug && VC.debug.aviso) {
      VC.debug.aviso('Falha ao carregar poliune-v02.json: ' + e.message + ' — a usar exemplo clássico.');
    }
    if (typeof VC.exemploV6 === 'function') {
      VC.exemploV6();
      VC.ui.toast('Exemplo clássico carregado (fallback).');
    }
    return false;
  }
};

/* ============================================================
   GESTÃO DE EXEMPLOS
   ============================================================ */
VC.exemplos = {
  STORAGE_KEY: 'VC_exemplos_v902',
  _lista: null,
  init() {
    try {
      const s = localStorage.getItem(this.STORAGE_KEY);
      if (s) this._lista = JSON.parse(s);
      else { this._lista = []; this.save(); }
    } catch (e) { this._lista = []; VC.debug.erro(e); }
    if (!this._lista.find(e => e.id === 'polune-v8')) {
            this._lista.push({ id: 'polune-v8', nome: 'Edifício PoliUne v02', descricao: 'Exemplo pré-carregado · 45 espaços · 5 UTAs · 5 transferências', timestamp: new Date().toISOString(), builtin: true });
      this.save();
    }
    return this._lista;
  },
  save() { try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._lista || [])); } catch (e) { VC.debug.erro(e); } },
  listar() {
    if (!this._lista) this.init();
    return this._lista.slice().sort((a, b) => {
      if (a.builtin && !b.builtin) return -1;
      if (!a.builtin && b.builtin) return 1;
      return (b.timestamp || '').localeCompare(a.timestamp || '');
    });
  },
  serializarAtual() {
    return {
      _versao: 'V9', versao: VC.versao, versaoCurta: VC.versaoCurta, timestamp: new Date().toISOString(),
      metadados: VC.utils.clonar(VC.dados.metadados),
      configuracao: { tipologia: VC.dados.tipologia, params: VC.utils.clonar(VC.dados.params), restricaoH: VC.dados.restricaoH, serieDiametros: VC.dados.serieDiametros },
      dados: { espacos: VC.utils.clonar(VC.dados.espacos), ramais: VC.utils.clonar(VC.dados.ramais), terminais: VC.utils.clonar(VC.dados.terminais), transferencias: VC.utils.clonar(VC.dados.transferencias || []), utas: VC.utils.clonar(VC.dados.utas), nos: VC.utils.clonar(VC.dados.nos), trechos: VC.utils.clonar(VC.dados.trechos), elementosRede: VC.utils.clonar(VC.dados.elementosRede), _mapaRenomeacao: VC.utils.clonar(VC.dados._mapaRenomeacao || {}) },
      flags: VC.utils.clonar(VC.flags)
    };
  },
  aplicarProjeto(p) {
    if (!p || !p.dados) throw new Error('Projeto inválido');
    const migrado = VC.migrador.prepararParaImportar(p);
    VC.dados.metadados = migrado.metadados || VC.dados.metadados;
    if (migrado.configuracao) {
      if (migrado.configuracao.params) Object.assign(VC.dados.params, migrado.configuracao.params);
      if (migrado.configuracao.tipologia) VC.dados.tipologia = migrado.configuracao.tipologia;
      if (migrado.configuracao.restricaoH) VC.dados.restricaoH = migrado.configuracao.restricaoH;
      if (migrado.configuracao.serieDiametros) VC.dados.serieDiametros = migrado.configuracao.serieDiametros;
    }
    Object.assign(VC.dados, { espacos: migrado.dados.espacos || [], ramais: migrado.dados.ramais || [], terminais: migrado.dados.terminais || [], transferencias: migrado.dados.transferencias || [], utas: migrado.dados.utas || [], nos: migrado.dados.nos || [], trechos: migrado.dados.trechos || [], elementosRede: migrado.dados.elementosRede || [], _mapaRenomeacao: migrado.dados._mapaRenomeacao || {} });
    if (migrado.flags) VC.flags = Object.assign(VC.flags || {}, migrado.flags);
    VC.dados._versao = 'V9';
    if (VC.rph && VC.rph.aplicarATodos) VC.rph.aplicarATodos();
    if (VC.qai && VC.qai.aplicarATodos) VC.qai.aplicarATodos();
    VC.perf.cacheFisica.invalidar();
    VC.perf.cacheMaterializacao.invalidar();
    VC.perf.ordenacaoTopologica.invalidar();
    VC.perf.cacheBalanco.invalidar();
    VC.calculo.__mig = false;
    VC.calculo.__migEsp = false;
    VC.calculo._autoAssoc = false;
    VC.calculo.calcularTudo();
    VC6.balanco.propagar();
    VC.decompor.limpar();
    VC.decompor.executar(true);
    VC.calculo.calcularTudo();
    VC6.balanco.propagar();
  },
  salvar(nome, descricao) {
    if (!nome || !String(nome).trim()) { VC.ui.toast('Nome obrigatório.'); return false; }
    nome = String(nome).trim();
    if (!this._lista) this.init();
    const existe = this._lista.find(e => e.nome.toLowerCase() === nome.toLowerCase() && !e.builtin);
    if (existe) {
      if (!confirm('Já existe um exemplo com o nome «' + nome + '».\n\nSubstituir?')) return false;
      existe.timestamp = new Date().toISOString();
      existe.descricao = descricao || existe.descricao || '';
      existe.projeto = this.serializarAtual();
      this.save();
      VC.ui.toast('Exemplo «' + nome + '» substituído.');
      return true;
    }
    const id = 'ex-' + Date.now().toString(36);
    this._lista.push({ id, nome, descricao: descricao || '', timestamp: new Date().toISOString(), builtin: false, projeto: this.serializarAtual() });
    this.save();
    VC.ui.toast('Exemplo «' + nome + '» guardado.');
    return true;
  },
  carregar(id) {
    if (!this._lista) this.init();
    const ex = this._lista.find(e => e.id === id);
    if (!ex) { VC.ui.toast('Exemplo não encontrado.'); return false; }
    if (!confirm('Carregar «' + ex.nome + '»?\n\nO projeto atual será substituído. Será guardado um backup em memória.')) return false;
    try {
      VC._backup_antes_carregar = this.serializarAtual();
      if (ex.builtin && ex.id === 'degrade-tv-18out26') {
        VC.carregarDegradeTorresVedras();
        if (VC.ui && VC.ui.renderSidebar) VC.ui.renderSidebar();
        if (VC.passos && VC.passos.render) VC.passos.render(VC._passoAtivo || 'setup');
        VC.ui.toast('Projeto «Degrade Torres Vedras 18out26» (45 espaços) carregado.');
      }
      else if (ex.builtin && ex.id === 'polune-v8') {
        if (typeof VC.exemploV9_2 === 'function') {
          VC.exemploV9_2().then(function (ok) {
            if (ok) {
              if (VC.ui && VC.ui.renderSidebar) VC.ui.renderSidebar();
              if (VC.passos && VC.passos.render) VC.passos.render(VC._passoAtivo || 'setup');
            }
          });
        } else {
          VC.exemploV6();
          VC.ui.toast('Exemplo «PoliUne V8» (clássico) carregado.');
        }
      }
      else if (ex.projeto) {
        this.aplicarProjeto(ex.projeto);
        VC.ui.toast('Exemplo «' + ex.nome + '» carregado.');
        VC.ui.renderSidebar();
        if (VC.passos && VC.passos.render) VC.passos.render(VC._passoAtivo || 'setup');
      }
      else { VC.ui.toast('Exemplo sem dados.'); return false; }
      return true;
    } catch (e) { VC.debug.erro(e); VC.ui.toast('Erro ao carregar: ' + e.message); return false; }
  },
  restaurarBackup() {
    if (!VC._backup_antes_carregar) { VC.ui.toast('Sem backup disponível.'); return false; }
    try {
      this.aplicarProjeto(VC._backup_antes_carregar);
      VC.ui.renderSidebar();
      if (VC.passos && VC.passos.render) VC.passos.render(VC._passoAtivo || 'setup');
      VC.ui.toast('Backup restaurado.');
      return true;
    } catch (e) { VC.debug.erro(e); VC.ui.toast('Erro a restaurar backup.'); return false; }
  },
  apagar(id) {
    if (!this._lista) this.init();
    const ex = this._lista.find(e => e.id === id);
    if (!ex) return false;
    if (ex.builtin) { VC.ui.toast('Exemplo pré-carregado não pode ser apagado.'); return false; }
    if (!confirm('Apagar «' + ex.nome + '»?\n\nEsta ação não pode ser desfeita.')) return false;
    this._lista = this._lista.filter(e => e.id !== id);
    this.save();
    VC.ui.toast('Exemplo «' + ex.nome + '» apagado.');
    return true;
  },
  renomear(id) {
    if (!this._lista) this.init();
    const ex = this._lista.find(e => e.id === id);
    if (!ex) return false;
    if (ex.builtin) { VC.ui.toast('Exemplo pré-carregado não pode ser renomeado.'); return false; }
    const novo = prompt('Novo nome:', ex.nome);
    if (!novo || !String(novo).trim()) return false;
    const nomeTrim = String(novo).trim();
    if (this._lista.some(e => e.id !== id && e.nome.toLowerCase() === nomeTrim.toLowerCase())) { VC.ui.toast('Nome já existente.'); return false; }
    ex.nome = nomeTrim;
    this.save();
    VC.ui.toast('Exemplo renomeado.');
    return true;
  },
  exportar(id) {
    if (!this._lista) this.init();
    const ex = this._lista.find(e => e.id === id);
    if (!ex) { VC.ui.toast('Exemplo não encontrado.'); return false; }
    let projeto;
    if (ex.builtin && ex.id === 'polune-v8') { VC.exemploV6(); projeto = this.serializarAtual(); }
    else { projeto = ex.projeto || this.serializarAtual(); }
    const nome = 'VC_exemplo_' + ex.nome.replace(/[^A-Za-z0-9_-]+/g, '_') + '_' + new Date().toISOString().slice(0, 10) + '.json';
    VC.utils.downloadJSON(nome, projeto);
    VC.ui.toast('Exemplo exportado: ' + nome);
    return true;
  },
  importar() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json';
    inp.onchange = e => {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = ev => {
        try {
          let p = JSON.parse(ev.target.result);
          p = VC.migrador.prepararParaImportar(p);
          const nomeProjeto = (p.metadados && p.metadados.nome) || 'Importado ' + new Date().toISOString().slice(0, 10);
          if (!this._lista) this.init();
          const existe = this._lista.find(x => x.nome.toLowerCase() === nomeProjeto.toLowerCase() && !x.builtin);
          if (existe) {
            if (!confirm('Já existe um exemplo com o nome «' + nomeProjeto + '».\n\nSubstituir?')) return;
            existe.projeto = p;
            existe.timestamp = new Date().toISOString();
            this.save();
            VC.ui.toast('Exemplo substituído.');
            return;
          }
          this._lista.push({ id: 'ex-' + Date.now().toString(36), nome: nomeProjeto, descricao: 'Importado de ficheiro ' + f.name, timestamp: new Date().toISOString(), builtin: false, projeto: p });
          this.save();
          VC.ui.toast('Exemplo importado.');
        } catch (err) { VC.debug.erro(err); VC.ui.toast('Erro a importar: ' + err.message); }
      };
      r.readAsText(f);
    };
    inp.click();
  },
  duplicar(id) {
    if (!this._lista) this.init();
    const ex = this._lista.find(e => e.id === id);
    if (!ex) return false;
    let projeto;
    if (ex.builtin && ex.id === 'polune-v8') { VC.exemploV6(); projeto = this.serializarAtual(); }
    else { projeto = VC.utils.clonar(ex.projeto); }
    if (!projeto) { VC.ui.toast('Sem dados.'); return false; }
    const nomeNovo = ex.nome + ' (cópia)';
    this._lista.push({ id: 'ex-' + Date.now().toString(36), nome: nomeNovo, descricao: 'Duplicado de «' + ex.nome + '»', timestamp: new Date().toISOString(), builtin: false, projeto });
    this.save();
    VC.ui.toast('Exemplo duplicado.');
    return true;
  },
  abrirMenu() { this.abrirModal(); },
  abrirModal() {
    const modal = document.getElementById('modalExemplos');
    const cont = document.getElementById('modalExemplosConteudo');
    if (!modal || !cont) return;
    const lista = this.listar();
    let h = '<div class="modal-cabecalho"><h3><i class="fa-solid fa-clipboard-list"></i> Gestão de Exemplos V9.0</h3><button class="fechar" onclick="VC.ui.fecharModal(\'modalExemplos\')">×</button></div>';
    h += '<div class="modal-corpo">';
    h += '<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">';
    h += '<button class="btn primario" onclick="VC.exemplos.salvarDialogo()"><i class="fa-solid fa-floppy-disk"></i> Guardar atual como exemplo</button>';
    h += '<button class="btn verde" onclick="VC.exemplos.importar()"><i class="fa-solid fa-file-import"></i> Importar JSON</button>';
    if (VC._backup_antes_carregar) h += '<button class="btn ambar" onclick="VC.exemplos.restaurarBackup(); VC.exemplos.abrirModal();"><i class="fa-solid fa-rotate-left"></i> Restaurar backup</button>';
    h += '</div>';
    if (!lista.length) h += '<div class="vazio"><i class="fa-solid fa-inbox"></i><div class="vazio-titulo">Sem exemplos guardados</div></div>';
    else {
      h += '<div style="display:flex;flex-direction:column;gap:8px">';
      lista.forEach(ex => {
        const data = ex.timestamp ? new Date(ex.timestamp).toLocaleString('pt-PT') : '—';
        const badge = ex.builtin ? '<span class="badge info">pré-carregado</span>' : '<span class="badge pendente">utilizador</span>';
        h += '<div style="border:1px solid var(--borda);border-radius:8px;padding:10px 14px;background:var(--superf);display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">';
        h += '<div style="flex:1;min-width:200px">';
        h += '<div style="font-weight:800;font-size:12.5px;color:var(--texto);display:flex;gap:8px;align-items:center">' + VC.utils.esc(ex.nome) + ' ' + badge + '</div>';
        h += '<div style="font-size:10.5px;color:var(--texto-suave);margin-top:3px">' + VC.utils.esc(ex.descricao || '') + '</div>';
        h += '<div style="font-size:9.5px;color:var(--texto-suave);margin-top:2px">' + data + '</div>';
        h += '</div>';
        h += '<div style="display:flex;gap:4px;flex-wrap:wrap">';
        h += '<button class="btn btn-mini primario" onclick="VC.exemplos.carregar(\'' + ex.id + '\'); VC.ui.fecharModal(\'modalExemplos\');"><i class="fa-solid fa-play"></i> Carregar</button>';
        h += '<button class="btn btn-mini" onclick="VC.exemplos.exportar(\'' + ex.id + '\')"><i class="fa-solid fa-file-export"></i> Exportar</button>';
        h += '<button class="btn btn-mini" onclick="VC.exemplos.duplicar(\'' + ex.id + '\'); VC.exemplos.abrirModal();"><i class="fa-solid fa-copy"></i> Duplicar</button>';
        if (!ex.builtin) {
          h += '<button class="btn btn-mini" onclick="VC.exemplos.renomear(\'' + ex.id + '\'); VC.exemplos.abrirModal();"><i class="fa-solid fa-pen"></i> Renomear</button>';
          h += '<button class="btn btn-mini coral" onclick="if(VC.exemplos.apagar(\'' + ex.id + '\')) VC.exemplos.abrirModal();"><i class="fa-solid fa-trash"></i> Apagar</button>';
        }
        h += '</div>';
        h += '</div>';
      });
      h += '</div>';
    }
    h += '<div style="margin-top:16px;padding:10px 12px;background:var(--superf2);border-radius:6px;font-size:10.5px;color:var(--texto-med);line-height:1.55"><b>Notas:</b> Os exemplos são guardados em <code>localStorage</code>. Carregar um exemplo guarda automaticamente um backup em memória (recuperável durante a sessão).</div>';
    h += '</div>';
    h += '<div class="modal-rodape"><button class="btn" onclick="VC.ui.fecharModal(\'modalExemplos\')">Fechar</button></div>';
    cont.innerHTML = h;
    modal.classList.add('on');
  },
  salvarDialogo() {
    const nome = prompt('Nome do exemplo:', (VC.dados.metadados && VC.dados.metadados.nome) || 'Exemplo ' + new Date().toLocaleDateString('pt-PT'));
    if (!nome) return;
    const descricao = prompt('Descrição (opcional):', '');
    this.salvar(nome, descricao);
    this.abrirModal();
  }
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { VC.exemplos.init(); });
else VC.exemplos.init();

/* ============================================================
   FLAGS V8.0.1
   ============================================================ */
VC.flags = Object.assign({
  topologiaReal: true, zetaDinamico: true, sincronizacao: true, mapaTrechos: true, equilibrioTrechos: true,
  utasPorRede: true, pontoFuncionamentoAuto: true, estanquidade: true, cortaFogo: true, filtrosCarga: true,
  ruidoUta: true, velocidadeMax: true, custoEnergetico: true, dilatacao: true, acessibilidade: true,
  cadernoIntegrado: true, diagramaCaixas: true, assistenteContextual: true, modoNormalEng: true, editorDetalhado: true,
  diagramaSVG: true, importacaoCSV: true, modoComparacao: false, modoArvore: true,
  tooltips: true, painel2x3: true, graficosModernos: true, pdf10pag: true, cadernoParametrizado: true,
  curvasFabricantes: true, gestaoExemplos: true, usoDadosPainel: true, legendaUnificada: true, arHumidoPainel: true,
  debugGlossario: false,
  balancoAr: true, transferencias: true, validacaoCiclos: true, pressaoRelativa: true,
  diagramaN9: true, diagramaInterativo: true, diagramaFiltros: true, diagramaExportSVG: true,
  diagramaExportPNG: true, diagramaIntegrarPDF: true,
  confortoTermico: true,
  qaiProjeto: true,
  topologiaFacetada: true,
  moduloBOM: true,
  construtorTopologico: true,
  campoQMedido: true,
  nomenclaturaUnificadaV10: true
}, VC.flags || {});

VC.flagAtiva = function (nome) { return VC.flags[nome] === true; };

/* ============================================================
   DADOS REAIS · Degrade Torres Vedras 18out26 (45 espaços · 15 × 3 pisos)
   ============================================================ */
(function () {
  VC.balanco = VC6.balanco;
  VC.transferencias = VC6.transferencias;

  VC._dadosReais = { nome: 'Degrade Torres Vedras 18out26', espacos: [], pisos: ['P0', 'P1', 'P2'], alas: ['Norte', 'Sul'] };
  let idGlobal = 1;
  VC._dadosReais.pisos.forEach(function (piso) {
    for (let i = 1; i <= 15; i++) {
      let tipo, A, H, N;
      if (i <= 8) { tipo = 'Escritório'; A = 15 + i * 0.5; H = 2.6; N = 2 + (i % 3); }
      else if (i <= 12) { tipo = 'Gabinete'; A = 10 + i * 0.4; H = 2.6; N = 1 + (i % 2); }
      else { tipo = 'Sanitários'; A = 4 + (i - 12) * 0.8; H = 2.6; N = 1; }
      const ala = VC._dadosReais.alas[i % 2];
      const sufixo = (i < 10 ? '0' + i : String(i));
      const nome = piso + '-' + ala.substring(0, 1) + '-' + sufixo + ' ' + tipo;
      VC._dadosReais.espacos.push({
        id: 1000 + idGlobal++,
        nome: nome,
        tipo: tipo,
        zona: piso + ' - ' + ala,
        localizacao: { piso: piso, ala: ala, compartimento: null },
        geometriaMetodo: 'AH',
        A: A, H: H, V: A * H, N: N,
        origem: 'Degrade Torres Vedras 18out26',
        definicoes: [],
        ramalRefInsuflacao: '',
        ramalRefExtracao: '',
        balanco: {
          Q_in_direto: 0, Q_out_direto: 0, Q_conforto_in: 0, Q_conforto_out: 0,
          QAI_aplicado: 0, QAI_rede: 'insuflacao', Q_transf_in: 0, Q_transf_out: 0,
          exfiltracao: 0, residuo: 0, pressao_relativa_Pa: 0, estado: 'PENDENTE'
        },
        transferencias: [],
        rphDefault: 0, rphAplicado: 0, rphOrigem: 'norma', Q_ConTerm: 0,
        QAI_projeto: 0, QAI_projeto_origem: 'norma', QAI_projeto_motivo: '', QAI_projeto_rede: 'auto',
        Q_total: 0
      });
    }
  });

  if (VC.exemplos && VC.exemplos._lista && !VC.exemplos._lista.find(function (e) { return e.id === 'degrade-tv-18out26'; })) {
    VC.exemplos._lista.unshift({
      id: 'degrade-tv-18out26',
      nome: 'Degrade Torres Vedras 18out26',
      descricao: 'Projeto base · 45 espaços reais (15 × 3 pisos P0, P1, P2)',
      timestamp: new Date().toISOString(),
      builtin: true
    });
    VC.exemplos.save();
  }

  VC.carregarDegradeTorresVedras = function () {
    VC.dados.metadados = { nome: 'Degrade Torres Vedras 18out26', cliente: '', local: 'Torres Vedras, Portugal', autor: '', revisao: '01' };
    VC.dados.espacos = VC.utils.clonar(VC._dadosReais.espacos);
    VC.dados.utas = [];
    VC.dados.nextId.uta = 1;
    const uInsN = VC.uta.criar('UTA-Norte-Insuflação', 'insuflacao', 'Norte');
    uInsN.componentes = VC.uta.componentesPadrao();
    VC.curvasFabricantes.aplicarNaUTA(uInsN, 'Sodeca', 'HCT/CHT', 'HCT-250');
    const uExtN = VC.uta.criar('UTA-Norte-Extração', 'extracao', 'Norte');
    uExtN.componentes = VC.uta.componentesExtracao();
    VC.curvasFabricantes.aplicarNaUTA(uExtN, 'Sistemair', 'Série M', 'M315');
    const uInsS = VC.uta.criar('UTA-Sul-Insuflação', 'insuflacao', 'Sul');
    uInsS.componentes = VC.uta.componentesPadrao();
    VC.curvasFabricantes.aplicarNaUTA(uInsS, 'Sodeca', 'HCT/CHT', 'CHT-315');
    const uExtS = VC.uta.criar('UTA-Sul-Extração', 'extracao', 'Sul');
    uExtS.componentes = VC.uta.componentesExtracao();
    VC.curvasFabricantes.aplicarNaUTA(uExtS, 'Soler & Palau', 'Série TD', 'TD-800');
    const uSuja = VC.uta.criar('UTA-Extração-Suja', 'extracao_suja', 'Transversal');
    uSuja.componentes = VC.uta.componentesExtracao();
    VC.curvasFabricantes.aplicarNaUTA(uSuja, 'Sistemair', 'Série M', 'M200');

    VC.rph.aplicarATodos();
    VC.qai.aplicarATodos();
    VC.dados.espacos.forEach(function (e, idx) {
      const c = VC.calculo.calcularQEspaco(e);
      const Q = Math.round(c.Q_total || c.Q_normas || 45);
      if (e.tipo === 'Sanitários') {
        e.definicoes = [{ id: 'DEF-' + (idx + 1) + '-E', tipo: 'Boca de Extração', rede: 'extracao_suja', quantidade: 1, Q_total: Q, origem: 'P138' }];
      } else {
        e.definicoes = [
          { id: 'DEF-' + (idx + 1) + '-I', tipo: 'Difusor', rede: 'insuflacao', quantidade: Math.max(1, Math.ceil(Q / 300)), Q_total: Q, origem: 'P138' },
          { id: 'DEF-' + (idx + 1) + '-X', tipo: 'Grelha Extração', rede: 'extracao', quantidade: Math.max(1, Math.ceil(Q / 300)), Q_total: Q, origem: 'P138' }
        ];
      }
    });
    VC.dados.transferencias = [];
    // v11.1 (3.10): cada sanitário recebe o ar de compensação de um escritório do mesmo piso e ala
    // (fresta da porta). O escritório insufla esse caudal a mais, por isso fica equilibrado.
    VC.dados.espacos.filter(function (e) { return e.tipo === 'Sanitários'; }).forEach(function (san) {
      const qExt = san.definicoes.filter(function (d) { return d.rede === 'extracao_suja'; }).reduce(function (s, d) { return s + (Number(d.Q_total) || 0); }, 0);
      const doador = VC.dados.espacos.find(function (e) { return e.tipo === 'Escritório' && e.localizacao.piso === san.localizacao.piso && e.localizacao.ala === san.localizacao.ala; });
      if (!doador || qExt <= 0 || !VC6.transferencias) return;
      VC6.transferencias.criar(doador.id, san.id, qExt, 'fresta_porta');
      const defIns = doador.definicoes.find(function (d) { return d.rede === 'insuflacao'; });
      if (defIns) { defIns.Q_total = Math.round((Number(defIns.Q_total) || 0) + qExt); defIns.quantidade = Math.max(1, Math.ceil(defIns.Q_total / 300)); defIns.origem = 'Balanço'; }
    });
    VC.perf.cacheMaterializacao.invalidar();
    VC.calculo.calcularTudo();
    if (VC.topologia && VC.topologia.gerarAutomatica) {
      VC.topologia.gerarAutomatica();
    }
    VC.decompor.limpar();
    VC.decompor.executar(true);
    VC.calculo.calcularTudo();
    if (VC6.balanco) VC6.balanco.propagar();
  };
})();

console.log('%c[VentCondutas V11.0.0] 05-amostras carregado · F-RPH + QAI_projeto + exemploV9_2 (fetch poliune-v02.json)', 'color:#6d8fb0;font-weight:bold;background:#eaf1f7;padding:3px 6px;border-radius:3px');

})();
