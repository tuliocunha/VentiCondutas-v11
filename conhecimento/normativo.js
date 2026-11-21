/* ============================================================
   VENTICONDUTAS · BASE DE CONHECIMENTO · NORMATIVO
   Ficheiro 5.1 — Conteúdo estático

   ALTERAÇÕES V10.0.0:
   - P11: min 45 para todos os regimes de sanitários
   - P14: nota sobre ACH vs RPH no rphDefault
   - P15: ASHRAE tipo 'norma-ashrae'

   ALTERAÇÕES V11.2 (Fase 1 da auditoria · dados normativos):
   - Tabela 11 conforme o texto publicado da Portaria 138-I (Ginásio 98, Laboratório 35, Sala de aula 24,
     Auditório/Biblioteca/Sala de espera/Sala de reuniões 20, Restauração 24) + tipos Café/bar (35) e
     Sala de dança/aeróbica (49). Retirada a tabela duplicada «tabelas.T11», que contradizia esta.
   - Tabela 13: reposta a linha «pública, funcionamento intensivo» (125 × aparelhos). O balneário é uma
     instalação pública (urinóis + sanitas + duches), já não uma linha própria só com duches.
   - Copa, resíduos e cópias/impressão: 10 renovações/hora passa a boa prática (não consta da Tabela 13).
   - Escadas pressurizadas: 20–80 Pa (RT-SCIE, art. 161.º), em vez de ≥ 50 Pa.
   - Bibliografia e hierarquia com edições atuais e normas em falta.
   ============================================================ */
(function () {
'use strict';
window.VC = window.VC || {};
VC._normativo = {

  bibliografia: [
    { codigo: 'Portaria n.º 138-I/2021', titulo: 'Requisitos mínimos da envolvente e dos sistemas técnicos (Anexo II: ventilação 1.2, controlo 1.5, climatização 2.3)', tipo: 'legislacao' },
    { codigo: 'Decreto-Lei n.º 101-D/2020 (na redação atual)', titulo: 'Desempenho energético dos edifícios e SCE · SACE (≥ 290 kW) e inspeções (> 70 kW)', tipo: 'legislacao' },
    { codigo: 'Despacho n.º 6476-H/2021 (Manual SCE, na redação atual)', titulo: 'Metodologia: eficácia de remoção (Tabela 68), SFP (Tabela 65), caudais (Tabelas 69–74)', tipo: 'legislacao' },
    { codigo: 'Portaria n.º 138-G/2021', titulo: 'Qualidade do ar interior em edifícios de comércio e serviços', tipo: 'legislacao' },
    { codigo: 'NP 1037-1/-2', titulo: 'Ventilação residencial (só habitação; tipologia em implementação)', tipo: 'norma-pt' },
    { codigo: 'EN 16798-1:2019', titulo: 'Parâmetros do ambiente interior (referência; categorias I–IV)', tipo: 'norma-eu' },
    { codigo: 'EN 16798-3:2025', titulo: 'Sistemas de ventilação em edifícios não residenciais · categorias SFP (substitui a EN 16798-3:2017)', tipo: 'norma-eu' },
    { codigo: 'EN 12599:2012', titulo: 'Ensaios e medições na entrega (TAB)', tipo: 'norma-eu' },
    { codigo: 'EN 1505:1998', titulo: 'Dimensões de condutas retangulares', tipo: 'norma-eu' },
    { codigo: 'EN 1506:2007', titulo: 'Dimensões de condutas circulares', tipo: 'norma-eu' },
    { codigo: 'EN 12237:2003', titulo: 'Estanquidade circular', tipo: 'norma-eu' },
    { codigo: 'EN 1507:2006', titulo: 'Estanquidade retangular', tipo: 'norma-eu' },
    { codigo: 'EN 1886:2007', titulo: 'Desempenho mecânico UTA', tipo: 'norma-eu' },
    { codigo: 'ISO 16890:2016', titulo: 'Air filters', tipo: 'norma-iso' },
    { codigo: 'VDI 2081:2018', titulo: 'Ruído em instalações AVAC', tipo: 'norma-de' },
    { codigo: 'Regulamento (UE) 1253/2014', titulo: 'Ecodesign · unidades de ventilação (SFPint, eficiência do recuperador)', tipo: 'legislacao-eu' },
    { codigo: 'Regulamento (UE) 327/2011', titulo: 'Ecodesign · ventiladores (eficiência mínima)', tipo: 'legislacao-eu' },
    { codigo: 'ISO 2533:1975', titulo: 'Standard Atmosphere', tipo: 'norma-iso' },
    { codigo: 'DL 220/2008 + Portaria 1532/2008 (RT-SCIE, na redação da Portaria 135/2020)', titulo: 'SCIE · escadas pressurizadas (art. 161.º) e parques de estacionamento (arts. 180.º–183.º)', tipo: 'legislacao' },
    { codigo: 'EN 12101-13:2022', titulo: 'Sistemas de diferencial de pressão · projeto e ensaio (substitui a EN 12101-6:2005)', tipo: 'norma-eu' },
    { codigo: 'ASHRAE 55:2020', titulo: 'Thermal Environmental Conditions', tipo: 'norma-ashrae' }
  ],

  hierarquia: {
    nivel1: [
      { codigo: 'Portaria 138-I/2021', funcao: 'SCE · caudais T11 / T12 / T13', obrigatorio: true },
      { codigo: 'DL 101-D/2020', funcao: 'Desempenho energético · SACE (≥ 290 kW de potência térmica) · inspeções (> 70 kW)', obrigatorio: true },
      { codigo: 'Manual SCE (Despacho 6476-H/2021)', funcao: 'Eficácia de remoção, SFP e caudais (metodologia da Portaria 138-I)', obrigatorio: true },
      { codigo: 'RT-SCIE (Portaria 1532/2008)', funcao: 'Escadas pressurizadas 20–80 Pa · parques de estacionamento 300/600 m³/h por veículo', obrigatorio: true },
      { codigo: 'Reg. (UE) 1253/2014 e 327/2011', funcao: 'Ecodesign de unidades de ventilação e de ventiladores', obrigatorio: true },
      { codigo: 'NP 1037-1/-2', funcao: 'Ventilação residencial (só habitação; tipologia em implementação)', obrigatorio: false }
    ],
    nivel2: [
      { codigo: 'EN 16798-1:2019', funcao: 'QAI — referência informativa' },
      { codigo: 'EN 16798-3:2025', funcao: 'Categorias SFP do sistema (os limites de SFPint vêm do Reg. (UE) 1253/2014)' },
      { codigo: 'EN 12101-13:2022', funcao: 'Projeto de sistemas de diferencial de pressão (referência; o limite legal é o do RT-SCIE)' },
      { codigo: 'EN 12599:2012', funcao: 'TAB e comissionamento' },
      { codigo: 'EN 1506:2007', funcao: 'Dimensões de condutas circulares' },
      { codigo: 'EN 1505:1998', funcao: 'Dimensões de condutas retangulares' },
      { codigo: 'EN 12237:2003', funcao: 'Estanquidade circular' },
      { codigo: 'EN 1507:2006', funcao: 'Estanquidade retangular' },
      { codigo: 'EN 1886:2007', funcao: 'Desempenho mecânico UTA' }
    ],
    nivel3: [
      { codigo: 'ISO 16890:2016', funcao: 'Filtragem de ar' },
      { codigo: 'VDI 2081:2018', funcao: 'Acústica AVAC' }
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
    { id: 'P2', texto: 'G2 (Circulação, Escadas): isentos de renovação mas podem transferir. Exceção: arrecadação (Arrumo) tem extração e não cede ar transferido', norma: 'Portaria 138-I/2021 (Anexo II, 1.2.2 f)' },
    { id: 'P3', texto: 'G3 (Arquivo): mínimo por diluição basal (T12) ou ACH ≥ 2', norma: 'Portaria 138-I/2021' },
    { id: 'P4', texto: 'G4 (Sanitários, Cozinha, Garagem): extração dedicada, entram por transferência. Caudal pela Tabela 13 só nas instalações sanitárias (privadas, públicas normais ou intensivas; os balneários contam como públicas, com urinóis + sanitas + duches); copa, resíduos, cópias/impressão, cozinha, garagem e vestiário por renovações/hora de boa prática (não constam da Tabela 13)', norma: 'Portaria 138-I (Tabela 13; Anexo II, 1.2.2 h)' },
    { id: 'P5', texto: 'Escadas pressurizadas: 20 Pa ≤ ΔP ≤ 80 Pa face aos espaços adjacentes, com as portas fechadas', norma: 'RT-SCIE, Portaria 1532/2008, art. 161.º' },
    { id: 'P6', texto: 'RPH de conforto aplicável a todos os grupos (G1-G4): Q_ConTerm = RPH × V', norma: 'F-RPH · EN 16798-1 · ASHRAE 55' },
    { id: 'P7', texto: 'QAI_projeto: caudal adicional definido pelo engenheiro, auditável com motivo', norma: 'V8.0.1 · Boas práticas' },
    { id: 'P8', texto: 'Topologia facetada: cada ramal tem meta derivado (pisoFisico, zona, rede, caminho)', norma: 'V9 · Boas práticas de organização' }
  ],

  // Arquivo saiu desta lista: é G3 e o princípio P3 manda aplicar T12 ou ACH ≥ 2 (estava isento e dava 0 m³/h)
  isencoesArNovo: [ 'Circulação', 'Escadas', 'Sanitários', 'Balneários', 'Garagem', 'Cozinha', 'Arrumo', 'Vestiário' ],

  tiposTransferencia: [
    { codigo: 'grelha_transferencia', nome: 'Grelha de transferência', dp_tipico: 2, aplicacao: 'Porta ou parede', cor: '#c9a876' },
    { codigo: 'fresta_porta', nome: 'Fresta sob porta', dp_tipico: 2, aplicacao: 'Portas interiores', cor: '#c9a876' },
    { codigo: 'grelha_parede', nome: 'Grelha de parede', dp_tipico: 5, aplicacao: 'Passagem dedicada', cor: '#c9a876' },
    { codigo: 'abertura_natural', nome: 'Abertura natural', dp_tipico: 1, aplicacao: 'Espaços abertos', cor: '#8eb8b8' }
  ],

  // T11 = Portaria 138-I/2021, Anexo II, Tabela 11 (m³/(h·ocupante)): sono 16 · descanso 20 (repouso, espera, conferência,
  // auditórios, bibliotecas) · sedentária 24 (escritórios, salas de aula, cinemas, lojas, museus, refeitórios, convívio) ·
  // creche/jardim de infância 28 · moderada 35 (laboratórios, oficinas, desenho, cafés, bares, jogos) · ligeiramente alta 49
  // (dança, aeróbica, ballet) · alta 98 (musculação, ginásios, pavilhões desportivos). Confirmado no Manual SCE, Tabela 69.
  // T12 = Tabela 12 (m³/(h·m²)): 3 sem atividades poluentes · 5 com atividades poluentes · 2 com > 75 % de materiais de baixa emissão.
  tiposEspaco: {
    'Sono':                { g:1, gn:'Ocupação Permanente', rp:5,  ra:0.5, t11:16, t12:3, ach:2,  desc:'G1 · Dormitórios' },
    'Descanso':            { g:1, gn:'Ocupação Permanente', rp:5,  ra:0.5, t11:20, t12:3, ach:2,  desc:'G1 · Repouso' },
    'Retalho seco':        { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:24, t12:3, ach:6,  desc:'G1 · Comércio seco' },
    'Loja':                { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:24, t12:3, ach:6,  desc:'G1 · Lojas' },
    'Escritório':          { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:24, t12:3, ach:6,  desc:'G1 · Escritórios' },
    'Gabinete':            { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:24, t12:3, ach:4,  desc:'G1 · Gabinete' },
    'Receção':             { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:24, t12:3, ach:6,  desc:'G1 · Receção' },
    'Auditório':           { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:20, t12:3, ach:8,  desc:'G1 · Auditórios (T11: descanso)' },
    'Sala de reuniões':    { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:20, t12:3, ach:4,  desc:'G1 · Reuniões / conferência (T11: descanso)' },
    'Serviços':            { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:24, t12:3, ach:6,  desc:'G1 · Serviços' },
    'Restauração':         { g:1, gn:'Ocupação Permanente', rp:10, ra:1.0, t11:24, t12:3, ach:8,  desc:'G1 · Restauração / refeitório (T11: sedentária)' },
    'Café / bar':          { g:1, gn:'Ocupação Permanente', rp:10, ra:1.0, t11:35, t12:3, ach:8,  desc:'G1 · Cafés, bares, salas de jogos (T11: moderada)' },
    'Laboratório':         { g:1, gn:'Ocupação Permanente', rp:10, ra:1.0, t11:35, t12:5, ach:8,  desc:'G1 · Laboratório, oficina, sala de desenho (T11: moderada)' },
    'Sala de aula':        { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:24, t12:3, ach:6,  desc:'G1 · Salas de aula (T11: sedentária)' },
    'Jardim de infância':  { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:28, t12:3, ach:6,  desc:'G1 · Jardins de infância e creches (T11: 28)' },
    'Ginásio':             { g:1, gn:'Ocupação Permanente', rp:10, ra:1.0, t11:98, t12:3, ach:8,  desc:'G1 · Ginásio, sala de musculação (T11: alta)' },
    'Sala de dança / aeróbica': { g:1, gn:'Ocupação Permanente', rp:10, ra:1.0, t11:49, t12:3, ach:8,  desc:'G1 · Pistas de dança, aeróbica, ballet (T11: ligeiramente alta)' },
    'Recinto desportivo':  { g:1, gn:'Ocupação Permanente', rp:10, ra:1.0, t11:98, t12:3, ach:8,  desc:'G1 · Pavilhões desportivos (T11: alta)' },
    'Cinema':              { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:24, t12:3, ach:8,  desc:'G1 · Cinema' },
    'Teatro':              { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:24, t12:3, ach:8,  desc:'G1 · Teatro' },
    'Consulta':            { g:1, gn:'Ocupação Permanente', rp:10, ra:1.0, t11:24, t12:3, ach:6,  desc:'G1 · Consulta' },
    'Internamento':        { g:1, gn:'Ocupação Permanente', rp:5,  ra:0.5, t11:16, t12:3, ach:6,  desc:'G1 · Internamento' },
    'Sala de espera':      { g:1, gn:'Ocupação Permanente', rp:10, ra:1.0, t11:20, t12:3, ach:6,  desc:'G1 · Espera (T11: descanso)' },
    'Biblioteca':          { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:20, t12:3, ach:6,  desc:'G1 · Biblioteca (T11: descanso)' },
    'Museu':               { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:24, t12:3, ach:6,  desc:'G1 · Museu' },
    'Sala de convívio':    { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:24, t12:3, ach:6,  desc:'G1 · Convívio' },
    'Sala de operações':   { g:1, gn:'Ocupação Permanente', rp:10, ra:1.0, t11:24, t12:5, ach:8,  desc:'G1 · Bloco operatório' },
    'Sala de recuperação': { g:1, gn:'Ocupação Permanente', rp:7,  ra:0.7, t11:24, t12:3, ach:6,  desc:'G1 · Recuperação' },
    'Circulação':          { g:2, gn:'Zona de Transferência', rp:0, ra:0, t11:24, t12:0, ach:0, desc:'G2 · Circulação' },
    'Escadas':             { g:2, gn:'Zona de Transferência', rp:0, ra:0, t11:24, t12:0, ach:0, desc:'G2 · Escadas' },
    'Arrumo':              { g:2, gn:'Zona de Transferência', rp:0, ra:0, t11:0,  t12:0, ach:0, desc:'G2 · Arrumo (isento) · extração; o ar entra por insuflação ou transferência, mas não sai por transferência', semArCedido: true },   // arrecadação: Portaria 138-I, Anexo II, 1.2.2 f)
    'Arquivo':             { g:3, gn:'Baixa Emissão', rp:0, ra:0.7, t11:24, t12:3, ach:2, desc:'G3 · Arquivo' },
    'Sala técnica':        { g:3, gn:'Baixa Emissão', rp:0, ra:0.7, t11:0,  t12:3, ach:2, desc:'G3 · Sala técnica' },
    'Sanitários':          { g:4, gn:'Extração Dedicada', rp:0, ra:0, t11:0, t12:0, ach:0,  desc:'G4 · Sanitários' },
    'Balneários':          { g:4, gn:'Extração Dedicada', rp:0, ra:0, t11:0, t12:0, ach:8,  desc:'G4 · Balneários (Tabela 13: instalação pública)' },
    'Vestiário':           { g:4, gn:'Extração Dedicada', rp:0, ra:0, t11:0, t12:0, ach:8,  desc:'G4 · Vestiário' },
    'Cozinha':             { g:4, gn:'Extração Dedicada', rp:0, ra:0, t11:0, t12:0, ach:12, desc:'G4 · Cozinha' },
    'Garagem':             { g:4, gn:'Extração Dedicada', rp:0, ra:0, t11:0, t12:0, ach:6,  desc:'G4 · Garagem' },
    // Copa, resíduos e cópias/impressão não constam da Tabela 13 publicada (só tem instalações sanitárias): 10 renovações/hora
    // é boa prática de projeto e o projetista confirma-a (como na cozinha). Fonte a citar se vier de uma alteração à Portaria.
    'Copa':                { g:4, gn:'Extração Dedicada', rp:0, ra:0, t11:0, t12:0, ach:10, desc:'G4 · Copa (boa prática: 10 renovações/hora)' },
    'Armazenamento de resíduos': { g:4, gn:'Extração Dedicada', rp:0, ra:0, t11:0, t12:0, ach:10, desc:'G4 · Resíduos (boa prática: 10 renovações/hora)' },
    'Sala de cópias/impressão': { g:4, gn:'Extração Dedicada', rp:0, ra:0, t11:0, t12:0, ach:10, desc:'G4 · Cópias/impressão (boa prática: 10 renovações/hora)' }
  },

  categoriasPorGrupo: {
    1: ['Sono','Descanso','Retalho seco','Loja','Escritório','Gabinete','Receção','Auditório','Sala de reuniões','Serviços','Restauração','Café / bar','Laboratório','Sala de aula','Jardim de infância','Ginásio','Sala de dança / aeróbica','Recinto desportivo','Cinema','Teatro','Consulta','Internamento','Sala de espera','Biblioteca','Museu','Sala de convívio','Sala de operações','Sala de recuperação'],
    2: ['Circulação','Escadas','Arrumo'],
    3: ['Arquivo','Sala técnica'],
    4: ['Sanitários','Balneários','Vestiário','Cozinha','Garagem','Copa','Armazenamento de resíduos','Sala de cópias/impressão']
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
    T12: {
      'Sono': 3, 'Descanso': 3, 'Retalho seco': 3, 'Loja': 3, 'Escritório': 3, 'Gabinete': 3, 'Receção': 3, 'Auditório': 3, 'Sala de reuniões': 3, 'Serviços': 3, 'Restauração': 3, 'Laboratório': 5, 'Sala de aula': 3, 'Jardim de infância': 3, 'Ginásio': 3, 'Recinto desportivo': 3, 'Cinema': 3, 'Teatro': 3, 'Consulta': 3, 'Internamento': 3, 'Sala de espera': 3, 'Arquivo': 3, 'Sala técnica': 3, 'Biblioteca': 3, 'Museu': 3, 'Sala de convívio': 3, 'Sala de operações': 5, 'Sala de recuperação': 3
    },
    // Portaria 138-I/2021, Anexo II, Tabela 13 (texto publicado; igual à Tabela 74 do Manual SCE). Tem só estas 4 linhas:
    //   privada (um utilizador de cada vez), com funcionamento contínuo: Máx(45; 10 × A_pav)
    //   privada, sem funcionamento contínuo: Máx(90; 10 × A_pav)
    //   pública (vários utilizadores, incluindo balneários), funcionamento normal: Máx(90 × (urinóis + sanitas + duches); 10 × A_pav)
    //   pública, funcionamento intensivo (ex.: teatros, cinemas, escolas, instalações desportivas): Máx(125 × (urinóis + sanitas + duches); 10 × A_pav)
    // A eficácia de remoção não se aplica a estes caudais. Um balneário é uma instalação pública: normal ou intensiva.
    T13: {
      sanitarios: {
        privado_continuo:      { base: 45,  porAparelho: 0,   porArea: 10, min: 45, nome: 'Privada · com funcionamento contínuo' },
        privado_nao_continuo:  { base: 90,  porAparelho: 0,   porArea: 10, min: 90, nome: 'Privada · sem funcionamento contínuo' },
        publico_normal:        { base: 0,   porAparelho: 90,  porArea: 10, min: 0, nome: 'Pública · funcionamento normal', publico: true },
        publico_intensivo:     { base: 0,   porAparelho: 125, porArea: 10, min: 0, nome: 'Pública · funcionamento intensivo (teatros, cinemas, escolas, desporto)', publico: true }
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
      'Escadas':    { min: 20, max: 80,  nota: 'Escada pressurizada (incêndio) · RT-SCIE art. 161.º' },
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