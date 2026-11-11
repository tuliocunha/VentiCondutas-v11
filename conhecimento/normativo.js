/* ============================================================
   VENTICONDUTAS · BASE DE CONHECIMENTO · NORMATIVO
   Ficheiro 5.1 — Conteúdo estático

   ALTERAÇÕES V10.0.0:
   - P11: min 45 para todos os regimes de sanitários
   - P14: nota sobre ACH vs RPH no rphDefault
   - P15: ASHRAE tipo 'norma-ashrae'
   ============================================================ */
(function () {
'use strict';
window.VC = window.VC || {};
VC._normativo = {

  bibliografia: [
    { codigo: 'Portaria n.º 138-I/2021', titulo: 'Regulamento de desempenho energético', tipo: 'legislacao' },
    { codigo: 'Decreto-Lei n.º 101-D/2020', titulo: 'Certificação energética', tipo: 'legislacao' },
    { codigo: 'NP 1037-1/-2', titulo: 'Ventilação residencial', tipo: 'norma-pt' },
    { codigo: 'EN 16798-1:2019', titulo: 'Energy performance — Ventilation', tipo: 'norma-eu' },
    { codigo: 'EN 16798-3:2017', titulo: 'Energy performance — SFPint', tipo: 'norma-eu' },
    { codigo: 'EN 12599:2012', titulo: 'Test procedures', tipo: 'norma-eu' },
    { codigo: 'EN 1505:1998', titulo: 'Dimensões de condutas retangulares', tipo: 'norma-eu' },
    { codigo: 'EN 1506:2007', titulo: 'Dimensões de condutas circulares', tipo: 'norma-eu' },
    { codigo: 'EN 12237:2003', titulo: 'Estanquidade circular', tipo: 'norma-eu' },
    { codigo: 'EN 1507:2006', titulo: 'Estanquidade retangular', tipo: 'norma-eu' },
    { codigo: 'EN 1886:2007', titulo: 'Desempenho mecânico UTA', tipo: 'norma-eu' },
    { codigo: 'ISO 16890:2016', titulo: 'Air filters', tipo: 'norma-iso' },
    { codigo: 'VDI 2081:2018', titulo: 'Noise generation', tipo: 'norma-de' },
    { codigo: 'Regulamento (UE) 1253/2014', titulo: 'Ecodesign ventiladores', tipo: 'legislacao-eu' },
    { codigo: 'ISO 2533:1975', titulo: 'Standard Atmosphere', tipo: 'norma-iso' },
    { codigo: 'DL 220/2008 + Portaria 1532/2008', titulo: 'SCIE', tipo: 'legislacao' },
    { codigo: 'ASHRAE 55:2020', titulo: 'Thermal Environmental Conditions', tipo: 'norma-ashrae' }
  ],

  hierarquia: {
    nivel1: [
      { codigo: 'Portaria 138-I/2021', funcao: 'SCE · caudais T11 / T12 / T13', obrigatorio: true },
      { codigo: 'DL 101-D/2020', funcao: 'Desempenho energético · BACS', obrigatorio: true },
      { codigo: 'NP 1037-1/-2', funcao: 'Ventilação residencial', obrigatorio: true }
    ],
    nivel2: [
      { codigo: 'EN 16798-1:2019', funcao: 'QAI — referência informativa' },
      { codigo: 'EN 16798-3:2017', funcao: 'Categorias SFP do sistema (os limites de SFPint vêm do Reg. (UE) 1253/2014)' },
      { codigo: 'EN 12599:2012', funcao: 'TAB e comissionamento' },
      { codigo: 'EN 1506:2007', funcao: 'Dimensões de condutas circulares' },
      { codigo: 'EN 1505:1998', funcao: 'Dimensões de condutas retangulares' },
      { codigo: 'EN 12237:2003', funcao: 'Estanquidade circular' },
      { codigo: 'EN 1507:2006', funcao: 'Estanquidade retangular' },
      { codigo: 'EN 1886:2007', funcao: 'Desempenho mecânico UTA' }
    ],
    nivel3: [
      { codigo: 'ISO 16890:2016', funcao: 'Filtragem de ar' },
      { codigo: 'VDI 2081:2018', funcao: 'Acústica AVAC' },
      { codigo: 'UE 1253/2014', funcao: 'Ecodesign ventiladores' }
    ],
    nivel4: [
      { codigo: 'CIBSE Guide B2', funcao: 'Boas práticas — ventilação' },
      { codigo: 'ASHRAE Handbook', funcao: 'Fundamentos HVAC' },
      { codigo: 'ASHRAE 55:2020', funcao: 'Conforto térmico adaptativo · estratificação' },
      { codigo: 'ISO 2533:1975', funcao: 'Atmosfera padrão ISA' }
    ]
  },

  principiosBalanco: [
    { id: 'P1', texto: 'Em cada espaço: Σ Q_in = Σ Q_out (tolerância ±5 m³/h)', norma: 'Balanço de massa' },
    { id: 'P2', texto: 'G2 (Circulação, Escadas): isentos de renovação mas podem transferir', norma: 'Portaria 138-I/2021' },
    { id: 'P3', texto: 'G3 (Arquivo): mínimo por diluição basal (T12) ou ACH ≥ 2', norma: 'Portaria 138-I/2021' },
    { id: 'P4', texto: 'G4 (Sanitários, Cozinha, Garagem): extração dedicada, entram por transferência', norma: 'Portaria 138-I T13' },
    { id: 'P5', texto: 'Escadas pressurizadas: ΔP ≥ 50 Pa em caso de incêndio', norma: 'Portaria 1532/2008' },
    { id: 'P6', texto: 'RPH de conforto aplicável a todos os grupos (G1-G4): Q_ConTerm = RPH × V', norma: 'F-RPH · EN 16798-1 · ASHRAE 55' },
    { id: 'P7', texto: 'QAI_projeto: caudal adicional definido pelo engenheiro, auditável com motivo', norma: 'V8.0.1 · Boas práticas' },
    { id: 'P8', texto: 'Topologia facetada: cada ramal tem meta derivado (pisoFisico, zona, rede, caminho)', norma: 'V9 · Boas práticas de organização' }
  ],

  isencoesArNovo: [ 'Circulação', 'Escadas', 'Sanitários', 'Balneários', 'Arquivo', 'Garagem', 'Cozinha', 'Arrumo', 'Vestiário' ],

  tiposTransferencia: [
    { codigo: 'grelha_transferencia', nome: 'Grelha de transferência', dp_tipico: 2, aplicacao: 'Porta ou parede', cor: '#c9a876' },
    { codigo: 'fresta_porta', nome: 'Fresta sob porta', dp_tipico: 2, aplicacao: 'Portas interiores', cor: '#c9a876' },
    { codigo: 'grelha_parede', nome: 'Grelha de parede', dp_tipico: 5, aplicacao: 'Passagem dedicada', cor: '#c9a876' },
    { codigo: 'abertura_natural', nome: 'Abertura natural', dp_tipico: 1, aplicacao: 'Espaços abertos', cor: '#8eb8b8' }
  ],

  tiposEspaco: {
    'Sono':                { g:1, gn:'Ocupação Permanente', rp:5,  ra:0.5, t11:16, t12:3, ach:2,  desc:'G1 · Dormitórios' },
    'Descanso':            { g:1, gn:'Ocupação Permanente', rp:5,  ra:0.5, t11:20, t12:3, ach:2,  desc:'G1 · Repouso' },
    'Retalho seco':        { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:24, t12:3, ach:6,  desc:'G1 · Comércio seco' },
    'Loja':                { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:24, t12:3, ach:6,  desc:'G1 · Lojas' },
    'Escritório':          { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:24, t12:3, ach:6,  desc:'G1 · Escritórios' },
    'Gabinete':            { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:24, t12:3, ach:4,  desc:'G1 · Gabinete' },
    'Receção':             { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:24, t12:3, ach:6,  desc:'G1 · Receção' },
    'Auditório':           { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:24, t12:3, ach:8,  desc:'G1 · Auditórios' },
    'Sala de reuniões':    { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:24, t12:3, ach:4,  desc:'G1 · Reuniões' },
    'Serviços':            { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:24, t12:3, ach:6,  desc:'G1 · Serviços' },
    'Restauração':         { g:1, gn:'Ocupação Permanente', rp:10, ra:1.0, t11:28, t12:3, ach:8,  desc:'G1 · Restauração' },
    'Laboratório':         { g:1, gn:'Ocupação Permanente', rp:10, ra:1.0, t11:49, t12:5, ach:8,  desc:'G1 · Laboratório' },
    'Sala de aula':        { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:28, t12:3, ach:6,  desc:'G1 · Salas de aula' },
    'Jardim de infância':  { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:28, t12:3, ach:6,  desc:'G1 · Jardins' },
    'Ginásio':             { g:1, gn:'Ocupação Permanente', rp:10, ra:1.0, t11:49, t12:3, ach:8,  desc:'G1 · Ginásio' },
    'Recinto desportivo':  { g:1, gn:'Ocupação Permanente', rp:10, ra:1.0, t11:98, t12:3, ach:8,  desc:'G1 · Desportivo' },
    'Cinema':              { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:24, t12:3, ach:8,  desc:'G1 · Cinema' },
    'Teatro':              { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:24, t12:3, ach:8,  desc:'G1 · Teatro' },
    'Consulta':            { g:1, gn:'Ocupação Permanente', rp:10, ra:1.0, t11:24, t12:3, ach:6,  desc:'G1 · Consulta' },
    'Internamento':        { g:1, gn:'Ocupação Permanente', rp:5,  ra:0.5, t11:16, t12:3, ach:6,  desc:'G1 · Internamento' },
    'Sala de espera':      { g:1, gn:'Ocupação Permanente', rp:10, ra:1.0, t11:24, t12:3, ach:6,  desc:'G1 · Espera' },
    'Biblioteca':          { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:24, t12:3, ach:6,  desc:'G1 · Biblioteca' },
    'Museu':               { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:24, t12:3, ach:6,  desc:'G1 · Museu' },
    'Sala de convívio':    { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:24, t12:3, ach:6,  desc:'G1 · Convívio' },
    'Sala de operações':   { g:1, gn:'Ocupação Permanente', rp:10, ra:1.0, t11:24, t12:5, ach:8,  desc:'G1 · Bloco operatório' },
    'Sala de recuperação': { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:24, t12:3, ach:6,  desc:'G1 · Recuperação' },
    'Circulação':          { g:2, gn:'Zona de Transferência', rp:0, ra:0, t11:24, t12:0, ach:0, desc:'G2 · Circulação' },
    'Escadas':             { g:2, gn:'Zona de Transferência', rp:0, ra:0, t11:24, t12:0, ach:0, desc:'G2 · Escadas' },
    'Arrumo':              { g:2, gn:'Zona de Transferência', rp:0, ra:0, t11:0,  t12:0, ach:0, desc:'G2 · Arrumo (isento)' },
    'Arquivo':             { g:3, gn:'Baixa Emissão', rp:0, ra:0.7, t11:24, t12:3, ach:2, desc:'G3 · Arquivo' },
    'Sala técnica':        { g:3, gn:'Baixa Emissão', rp:0, ra:0.7, t11:0,  t12:3, ach:2, desc:'G3 · Sala técnica' },
    'Sanitários':          { g:4, gn:'Extração Dedicada', rp:0, ra:0, t11:0, t12:0, ach:0,  desc:'G4 · Sanitários' },
    'Balneários':          { g:4, gn:'Extração Dedicada', rp:0, ra:0, t11:0, t12:0, ach:8,  desc:'G4 · Balneários' },
    'Vestiário':           { g:4, gn:'Extração Dedicada', rp:0, ra:0, t11:0, t12:0, ach:8,  desc:'G4 · Vestiário' },
    'Cozinha':             { g:4, gn:'Extração Dedicada', rp:0, ra:0, t11:0, t12:0, ach:12, desc:'G4 · Cozinha' },
    'Garagem':             { g:4, gn:'Extração Dedicada', rp:0, ra:0, t11:0, t12:0, ach:6,  desc:'G4 · Garagem' }
  },

  categoriasPorGrupo: {
    1: ['Sono','Descanso','Retalho seco','Loja','Escritório','Gabinete','Receção','Auditório','Sala de reuniões','Serviços','Restauração','Laboratório','Sala de aula','Jardim de infância','Ginásio','Recinto desportivo','Cinema','Teatro','Consulta','Internamento','Sala de espera','Biblioteca','Museu','Sala de convívio','Sala de operações','Sala de recuperação'],
    2: ['Circulação','Escadas','Arrumo'],
    3: ['Arquivo','Sala técnica'],
    4: ['Sanitários','Balneários','Vestiário','Cozinha','Garagem']
  },

  rphDefault: {
    nota: 'ACH é um critério de diluição basal (para Q_normas). RPH é um critério de conforto térmico (para Q_ConTerm).',
    G1: [
      { hMax: 3,   rph: 0,   classe: 'E0', classeNome: 'E0 · uniforme', base: 'EN 16798-1 · sem estratificação' },
      { hMax: 4.5, rph: 0.5, classe: 'E1', classeNome: 'E1 · leve',     base: 'EN 16798-1 · estratificação leve' },
      { hMax: 7,   rph: 1.0, classe: 'E2', classeNome: 'E2 · moderada', base: 'ASHRAE 55 · estratificação moderada' },
      { hMax: 999, rph: 2.0, classe: 'E3', classeNome: 'E3 · severa',   base: 'ASHRAE 55 · estratificação severa' }
    ],
    G2: [
      { hMax: 3,   rph: 0,   classe: 'E0', classeNome: 'E0 · uniforme', base: 'Sem estratificação' },
      { hMax: 4.5, rph: 1.0, classe: 'E1', classeNome: 'E1 · leve',     base: 'ASHRAE 55 · estratificação leve' },
      { hMax: 7,   rph: 2.0, classe: 'E2', classeNome: 'E2 · moderada', base: 'ASHRAE 55 · estratificação moderada' },
      { hMax: 999, rph: 3.0, classe: 'E3', classeNome: 'E3 · severa',   base: 'ASHRAE 55 · estratificação severa' }
    ],
    G3: [
      { hMax: 3,   rph: 0.5, classe: 'D1', classeNome: 'D1 · basal',     base: 'Boas práticas · diluição basal' },
      { hMax: 6,   rph: 1.0, classe: 'D2', classeNome: 'D2 · reforçada', base: 'Boas práticas · diluição reforçada' },
      { hMax: 999, rph: 1.5, classe: 'D3', classeNome: 'D3 · intensiva', base: 'Boas práticas · diluição intensiva' }
    ],
    G4: [
      { hMax: 3,   rph: 0,   classe: 'X0', classeNome: 'X0 · sem necessidade', base: 'Extração T13 suficiente' },
      { hMax: 6,   rph: 1.0, classe: 'X1', classeNome: 'X1 · diluição',        base: 'Boas práticas · diluição de odores' },
      { hMax: 999, rph: 2.0, classe: 'X2', classeNome: 'X2 · intensiva',       base: 'Boas práticas · diluição intensiva' }
    ]
  },

  qaiProjetoMotivosTipicos: [
    'Odores de material de limpeza', 'Produtos químicos', 'Equipamento eletrónico (calor residual)', 'Papel e poeira (arquivo)', 'Barreira sanitária', 'Requisito do dono de obra', 'Boas práticas de projeto', 'Outro'
  ],

  qaiProjetoRedeDefault: { 1: 'insuflacao', 2: 'insuflacao', 3: 'insuflacao', 4: 'extracao' },

  tabelas: {
    T11: {
      'Sono': 16, 'Descanso': 20, 'Retalho seco': 24, 'Loja': 24, 'Escritório': 24, 'Gabinete': 24, 'Receção': 24, 'Auditório': 24, 'Sala de reuniões': 24, 'Serviços': 24, 'Restauração': 28, 'Laboratório': 49, 'Sala de aula': 28, 'Jardim de infância': 20, 'Ginásio': 40, 'Recinto desportivo': 40, 'Cinema': 20, 'Teatro': 20, 'Consulta': 24, 'Internamento': 16, 'Sala de espera': 24, 'Biblioteca': 24, 'Museu': 24, 'Sala de convívio': 24, 'Sala de operações': 24, 'Sala de recuperação': 24
    },
    T12: {
      'Sono': 3, 'Descanso': 3, 'Retalho seco': 3, 'Loja': 3, 'Escritório': 3, 'Gabinete': 3, 'Receção': 3, 'Auditório': 3, 'Sala de reuniões': 3, 'Serviços': 3, 'Restauração': 3, 'Laboratório': 5, 'Sala de aula': 3, 'Jardim de infância': 3, 'Ginásio': 3, 'Recinto desportivo': 3, 'Cinema': 3, 'Teatro': 3, 'Consulta': 3, 'Internamento': 3, 'Sala de espera': 3, 'Arquivo': 3, 'Sala técnica': 3, 'Biblioteca': 3, 'Museu': 3, 'Sala de convívio': 3, 'Sala de operações': 5, 'Sala de recuperação': 3
    },
    T13: {
      sanitarios: {
        privado_continuo:      { base: 45,  porAparelho: 0,   porArea: 10, min: 45 },
        privado_nao_continuo:  { base: 90,  porAparelho: 0,   porArea: 10, min: 90 },
        publico_normal:        { base: 0,   porAparelho: 90,  porArea: 10, min: 45 },
        publico_intensivo:     { base: 0,   porAparelho: 125, porArea: 10, min: 45 }
      }
    },
    // Reg. (UE) 1253/2014 (Ecodesign), Anexo III, requisitos desde 01-01-2018.
    // BVU com recuperador (não run-around): limite = BVU_BASE_PEQ + E − 300·qnom/2 (qnom < 2 m³/s)
    //                                        limite = BVU_BASE + E              (qnom ≥ 2 m³/s)
    // E = (η_t − BVU_ETA_REF)·3000 se η_t > BVU_ETA_REF (bónus de eficiência); F = 0 (filtros completos).
    // UVU com filtro: limite fixo. UVU sem filtro: o regulamento não fixa SFPint.
    SFPint: { UVU_FILTER: 230, BVU_BASE: 800, BVU_BASE_PEQ: 1100, BVU_ETA_REF: 0.73, BVU_ETA_MIN: 0.73 },
    SFP_TIPOS: {
      BVU_HRS:        'UVB com recuperador (bidirecional)',
      UVU_FILTER:     'UVU com filtro (unidirecional)',
      UVU_SEM_FILTER: 'UVU sem filtro (unidirecional)'
    },
    pressaoLimites: {
      'Escadas':    { min: 50, max: 80,  nota: 'Escada pressurizada (incêndio)' },
      'Circulação': { min: -5, max: 5,   nota: 'Zona de transferência' },
      'Sanitários': { min: -15, max: 0,  nota: 'Extração dedicada' },
      'Balneários': { min: -15, max: 0,  nota: 'Extração dedicada' },
      'Vestiário':  { min: -15, max: 0,  nota: 'Extração dedicada' },
      'Cozinha':    { min: -20, max: -5, nota: 'Extração intensiva' },
      'Garagem':    { min: -25, max: -5, nota: 'Extração de COV' },
      default:      { min: -10, max: 10, nota: 'Ocupação permanente' }
    },
    BACS_LIMIAR: 290000,
    ETA_REC_MIN: 0.73
  },

  versaoNormas: {
    'Portaria 138-I': '2021', 'DL 101-D': '2020', 'NP 1037-1': '2019', 'NP 1037-2': '2019', 'EN 16798-1': '2019', 'EN 16798-3': '2017', 'EN 12599': '2012', 'EN 1506': '2007', 'EN 1505': '1998', 'EN 12237': '2003', 'EN 1507': '2006', 'EN 1886': '2007', 'ISO 16890': '2016', 'VDI 2081': '2018', 'UE 1253': '2014', 'ISO 2533': '1975', 'DL 220': '2008', 'Portaria 1532': '2008', 'ASHRAE 55': '2020', 'Topologia facetada': 'V9'
  }
};

console.log('%c[Base de Conhecimento V10.0.0 · normativo.js] ' + Object.keys(VC._normativo.tiposEspaco).length + ' tipos · ' + VC._normativo.bibliografia.length + ' refs · ' + VC._normativo.principiosBalanco.length + ' princípios · ' + Object.keys(VC._normativo.rphDefault).length + ' grupos RPH · ' + VC._normativo.qaiProjetoMotivosTipicos.length + ' motivos QAI_projeto · ' + Object.keys(VC._normativo.categoriasPorGrupo).length + ' grupos catalogados · Correções P11, P14, P15 aplicadas', 'color:#7fa88b;font-weight:bold;background:#eef5f0;padding:3px 6px;border-radius:3px');

})();