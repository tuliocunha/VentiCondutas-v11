#!/usr/bin/env node
/* ============================================================
   VentiCondutas · gera o exemplo «Degrade 21 nov26»
   ------------------------------------------------------------
   Fonte: desenho TGC «Degrade HVAC Parâmetros do Tempo · Estudo
   Ventilação 19nov26» (Piso 0, Piso 1, Mezanino · sem escala),
   levantamento de 21/11/2026 conferido com o relatório técnico
   do cliente.

   Regras do levantamento (decididas com o projetista):
   · caudais, terminais e diâmetros: os do desenho;
   · geometria: salas, terminais e traçados dos ramais levantados no
     desenho (coordenadas em píxeis da página a 700 dpi); escala
     calibrada pelas áreas das salas (P0 79,5 px/m · P1 76,8 px/m) e,
     no Mezanino, pela cota de 3,15 m (168,6 px/m); margem ±5 %;
     L de cada ramal = comprimento do traçado; posição de cada
     derivação = projeção no traçado (metros desde o ventilador);
   · H = 2,6 m; N = 1 pessoa por 10 m² (arredondado para cima);
   · sanitários públicos, aparelhos contados na planta;
   · bloco nordeste (Sala P1-N6, P1-N7 de pé-direito duplo,
     CB/apoio/circulação do P1 e o Mezanino) fica fora do cálculo;
   · GE azul da CB P0-N2 = 75 m³/h (proposta, não cotado);
   · GE de 100 m³/h junto ao refeitório = Sala Técnica P0-N2;
   · VAN P1 N / VEG P1 N: etiquetas trocadas no desenho do Mezanino
     (a caixa com filtro e admissão é o VAN);
   · prumadas P1 → cobertura: 3,0 m (assumido; ramal sem traçado);
   · plantas guardadas no exemplo (Piso 0, Piso 1, Mezanino), a partir
     dos recortes em tools/exemplos/degrade-21nov26/;
   · VCM do refeitório: ar exterior (verde, GEA) → insuflação (magenta);
     extração de ar sujo da copa, 2 grelhas de 70 m³/h (ciano, «Retorno
     VCM» na legenda) → VCM
     → saída para a fachada; modelada como duas unidades (insuflação e
     extração de ar sujo), sem recirculação;
   · altura livre no teto falso: 350 mm;
   · ventiladores com parâmetros de referência (sem catálogo).

   Uso:  node tools/gerar-exemplo-degrade-21nov26.js
   Grava exemplos/degrade-21nov26.json (como desenhado) e
   exemplos/degrade-21nov26-corrigido.json (com as CORRECOES abaixo)
   ============================================================ */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const RAIZ = path.resolve(__dirname, '..');

/* ── espaços: [nome, piso, ala, tipo, A (m²), extra] ── */
const ESPACOS = [
  ['Sala P0-N1 (bastidores)', 'P0', 'Norte', 'Sala técnica', 9.00],
  ['Garagem P0-N1', 'P0', 'Norte', 'Garagem', 26.40, { lugares: 1 }],
  ['Sala P0-N2', 'P0', 'Norte', 'Escritório', 12.61],
  ['Sala P0-N3', 'P0', 'Norte', 'Escritório', 15.66],
  ['Sala P0-N4', 'P0', 'Norte', 'Escritório', 15.66],
  ['Arrumo P0-N1', 'P0', 'Norte', 'Arrumo', 5.14],
  ['Circulação P0-N2', 'P0', 'Norte', 'Circulação', 7.88],
  ['Sala Técnica P0-N2', 'P0', 'Norte', 'Sala técnica', 7.26],
  ['Casa de Banho esp. P0-N3', 'P0', 'Norte', 'Sanitários', 2.12, { regimeSanitario: 'publico_normal', numSanitas: 1 }],
  ['Casa de Banho P0-N1', 'P0', 'Norte', 'Sanitários', 11.65, { regimeSanitario: 'publico_normal', numSanitas: 2 }],
  ['Casa de Banho P0-N2', 'P0', 'Norte', 'Sanitários', 8.60, { regimeSanitario: 'publico_normal', numSanitas: 1 }],
  ['Refeitório P0-S1', 'P0', 'Sul', 'Restauração', 31.10, { N: 8 }],
  ['Átrio Central P0', 'P0', 'Centro', 'Circulação', 70.26],
  ['Hall P0-S1', 'P0', 'Sul', 'Circulação', 30.60],
  ['Escada P0-S1', 'P0', 'Sul', 'Escadas', 11.37],
  ['Escada P0-S2', 'P0', 'Sul', 'Escadas', 6.52],
  ['Circulação P0-S1', 'P0', 'Sul', 'Circulação', 18.20],
  ['Sala P0-S1', 'P0', 'Sul', 'Escritório', 16.94],
  ['Sala P0-S2', 'P0', 'Sul', 'Escritório', 16.99],
  ['Sala P0-S3', 'P0', 'Sul', 'Escritório', 34.21],
  ['Sala P0-S4', 'P0', 'Sul', 'Escritório', 34.37],
  ['Laboratório P0-S5', 'P0', 'Sul', 'Laboratório', 26.10],
  ['Sala P1-N1', 'P1', 'Norte', 'Escritório', 13.75],
  ['Sala P1-N2', 'P1', 'Norte', 'Escritório', 15.19],
  ['Circulação P1-N1', 'P1', 'Norte', 'Circulação', 16.32],
  ['Sala P1-N3', 'P1', 'Norte', 'Escritório', 15.66],
  ['Sala P1-N4', 'P1', 'Norte', 'Escritório', 15.63],
  ['Circulação P1-N2', 'P1', 'Norte', 'Circulação', 16.94],
  ['Sala P1-S1', 'P1', 'Sul', 'Escritório', 15.44],
  ['Circulação P1-S1', 'P1', 'Sul', 'Circulação', 19.48],
  ['Escada P1-S1', 'P1', 'Sul', 'Escadas', 14.99],
  ['Átrio Central P1', 'P1', 'Centro', 'Circulação', 80.55],
  ['Sala P1-S2 (open space)', 'P1', 'Sul', 'Escritório', 109.06],
  ['Escada P1-S2', 'P1', 'Sul', 'Escadas', 5.65],
  ['Laboratório P1-S3', 'P1', 'Sul', 'Laboratório', 9.53],
  ['Apoio/Serviço P1-S4', 'P1', 'Sul', 'Arrumo', 13.87],
  ['Apoio/Serviço «P0-S3» (P1)', 'P1', 'Sul', 'Arrumo', 12.08]
];
const OCUPADOS = ['Escritório', 'Laboratório'];

/* ── componentes de referência dos ventiladores ── */
const C = {
  ventilador: { nome: 'Ventilador (motor EC)', tipo: 'Ventilador', deltaP: 0, deltaP_final: 0, zeta: 0, obs: 'IE3 · referência' },
  f7: { nome: 'Filtro ePM1 50 % (F7)', tipo: 'Filtro F7', deltaP: 55, deltaP_final: 160, zeta: 2.5, obs: 'ISO 16890 · limpo' },
  g4: { nome: 'Pré-filtro G4', tipo: 'Filtro G4', deltaP: 35, deltaP_final: 90, zeta: 2.0, obs: 'ISO 16890 · limpo' },
  grelhaExt: { nome: 'Grelha exterior + rede de proteção', tipo: 'Outro', deltaP: 20, deltaP_final: 20, zeta: 0, obs: 'referência' },
  descargaSuja: { nome: 'Descarga Ø200 2,9 m + GSAxt 500×300', tipo: 'Outro', deltaP: 25, deltaP_final: 25, zeta: 0, obs: 'medido na planta' },
  admissaoVCM: { nome: 'Admissão GEA 300×200 + Ø100 4,2 m', tipo: 'Outro', deltaP: 45, deltaP_final: 45, zeta: 0, obs: 'medido na planta' },
  descargaVCM: { nome: 'Descarga do ar sujo 2,5 m + grelha na fachada', tipo: 'Outro', deltaP: 25, deltaP_final: 25, zeta: 0, obs: 'medido na planta' }
};
const VAN = () => ({ tipoUV: 'UVU_FILTER', eta: 0.55, componentes: [C.grelhaExt, C.f7, C.ventilador] });
const VEG = () => ({ tipoUV: 'UVU_FILTER', eta: 0.50, componentes: [C.g4, C.ventilador, C.grelhaExt] });

/* ── plantas: recorte da página (px a 700 dpi) → imagem guardada ── */
const PISOS = {
  P0: { id: 'piso-p0', nome: 'Piso 0', img: 'planta-piso0.jpg', x0: 400, y0: 3450, k: 2400 / 3500, pxm: 79.5 },
  P1: { id: 'piso-p1', nome: 'Piso 1', img: 'planta-piso1.jpg', x0: 400, y0: 3450, k: 2400 / 3500, pxm: 76.8 },
  MZ: { id: 'piso-mez', nome: 'Mezanino e cobertura', img: 'planta-mezanino.jpg', x0: 4300, y0: 1400, k: 1, pxm: 168.6 }
};
const R = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
/* salas (coordenadas da página) */
const SALAS = {
  'Sala P0-N1 (bastidores)': ['P0', R(520, 3590, 935, 3730)],
  'Garagem P0-N1': ['P0', R(525, 3745, 995, 4135)],
  'Sala P0-N2': ['P0', R(1000, 3590, 1290, 3850)],
  'Sala P0-N3': ['P0', R(1295, 3590, 1690, 3850)],
  'Sala P0-N4': ['P0', R(1695, 3590, 2085, 3850)],
  'Arrumo P0-N1': ['P0', R(2090, 3590, 2330, 3720)],
  'Circulação P0-N2': ['P0', R(2090, 3720, 2560, 3815)],
  'Sala Técnica P0-N2': ['P0', R(2250, 3880, 2480, 4090)],
  'Casa de Banho esp. P0-N3': ['P0', R(2330, 3590, 2440, 3700)],
  'Casa de Banho P0-N1': ['P0', [[2440, 3590], [2856, 3590], [2856, 3810], [2560, 3810], [2560, 3700], [2440, 3700]]],
  'Casa de Banho P0-N2': ['P0', R(2440, 3830, 2860, 3948)],
  'Refeitório P0-S1': ['P0', [[2247, 4100], [2480, 4100], [2480, 3975], [2860, 3975], [2860, 4345], [2247, 4345]]],
  'Átrio Central P0': ['P0', R(1000, 3855, 2245, 4200)],
  'Hall P0-S1': ['P0', R(520, 4140, 895, 4595)],
  'Escada P0-S1': ['P0', R(505, 4595, 890, 4765)],
  'Escada P0-S2': ['P0', R(2085, 4505, 2235, 4760)],
  'Circulação P0-S1': ['P0', R(2090, 4350, 2850, 4500)],
  'Sala P0-S1': ['P0', R(895, 4480, 1285, 4760)],
  'Sala P0-S2': ['P0', R(895, 4205, 1285, 4475)],
  'Sala P0-S3': ['P0', R(1290, 4205, 1685, 4760)],
  'Sala P0-S4': ['P0', R(1695, 4205, 2080, 4760)],
  'Laboratório P0-S5': ['P0', R(2280, 4505, 2850, 4760)],
  'Sala P1-N1': ['P1', R(495, 3815, 875, 4045)],
  'Sala P1-N2': ['P1', R(495, 3580, 875, 3810)],
  'Circulação P1-N1': ['P1', R(880, 3580, 1280, 3810)],
  'Sala P1-N3': ['P1', R(1285, 3580, 1680, 3810)],
  'Sala P1-N4': ['P1', R(1690, 3580, 2080, 3810)],
  'Circulação P1-N2': ['P1', R(2085, 3580, 2380, 3880)],
  'Sala P1-S1': ['P1', R(505, 4075, 875, 4340)],
  'Circulação P1-S1': ['P1', R(480, 4350, 990, 4570)],
  'Escada P1-S1': ['P1', R(480, 4572, 950, 4770)],
  'Átrio Central P1': ['P1', R(990, 3840, 2261, 4190)],
  'Sala P1-S2 (open space)': ['P1', [[990, 4195], [2390, 4195], [2390, 4500], [2095, 4500], [2095, 4770], [990, 4770]]],
  'Escada P1-S2': ['P1', R(2095, 4510, 2245, 4740)],
  'Laboratório P1-S3': ['P1', R(2255, 4515, 2505, 4765)],
  'Apoio/Serviço P1-S4': ['P1', R(2403, 4344, 2880, 4505)],
  'Apoio/Serviço «P0-S3» (P1)': ['P1', R(2505, 4560, 2880, 4770)]
};

/* ── redes: ventilador + ramais traçados na planta; terminais [espaço, [x, y], Q (m³/h), tipo?] ──
   Ramal sem traçado (prumada): { L } e sai do fim do pai. */
const GI = 'Grelha Insuflação', GE = 'Grelha Extração', VE = 'Válvula';
const REDES = [
  { id: 'UTA-01', nome: 'VAN P0 N', rede: 'insuflacao', zona: 'P0 Norte', ala: 'Norte', uv: VAN(), tipoT: GI, ramais: [
    { nome: 'R1.1', piso: 'P0', pts: [[3010, 3630], [1025, 3630]], t: [['Arrumo P0-N1', [2102, 3640], 100], ['Sala P0-N4', [1729, 3630], 125], ['Sala P0-N3', [1323, 3630], 125], ['Sala P0-N2', [1026, 3630], 100]] },
    { nome: 'R1.1.1', pai: 'R1.1', piso: 'P0', pts: [[2272, 3630], [2272, 3900]], t: [['Sala Técnica P0-N2', [2272, 3900], 100]] },
    { nome: 'R1.1.1.1', pai: 'R1.1.1', piso: 'P0', pts: [[2272, 3737], [2490, 3737], [2490, 3660]], t: [['Casa de Banho P0-N1', [2505, 3665], 100]] },
    { nome: 'R1.1.1.1.1', pai: 'R1.1.1.1', piso: 'P0', pts: [[2490, 3737], [2490, 3850]], t: [['Casa de Banho P0-N2', [2495, 3850], 100]] }
  ] },
  { id: 'UTA-02', nome: 'VEG P0 N', rede: 'extracao', zona: 'P0 Norte', ala: 'Norte', uv: VEG(), tipoT: GE, ramais: [
    { nome: 'R2.1', piso: 'P0', pts: [[2880, 3610], [1265, 3610]], t: [['Arrumo P0-N1', [2255, 3613], 80], ['Sala P0-N4', [2056, 3610], 100], ['Sala P0-N3', [1659, 3610], 100], ['Sala P0-N2', [1265, 3610], 80]] },
    { nome: 'R2.1.1', pai: 'R2.1', piso: 'P0', pts: [[2286, 3610], [2286, 3718], [2456, 3718], [2456, 4075]], t: [['Sala Técnica P0-N2', [2456, 4075], 100]] }
  ] },
  { id: 'UTA-03', nome: 'VAN P0 S', rede: 'insuflacao', zona: 'P0 Sul', ala: 'Sul', uv: VAN(), tipoT: GI, ramais: [
    { nome: 'R3.1', piso: 'P0', pts: [[2890, 4713], [1280, 4713], [1280, 4225]], t: [['Laboratório P0-S5', [2345, 4716], 150], ['Sala P0-S4', [1714, 4716], 150], ['Sala P0-S3', [1338, 4716], 150], ['Sala P0-S1', [1278, 4694], 125], ['Sala P0-S2', [1278, 4225], 125]] }
  ] },
  { id: 'UTA-04', nome: 'VEG P0 S', rede: 'extracao', zona: 'P0 Sul', ala: 'Sul', uv: VEG(), tipoT: GE, ramais: [
    { nome: 'R4.1', piso: 'P0', pts: [[3050, 4735], [905, 4735], [905, 4438]], t: [['Laboratório P0-S5', [2758, 4735], 125], ['Sala P0-S4', [2069, 4735], 125], ['Sala P0-S3', [1665, 4735], 125], ['Sala P0-S1', [917, 4508], 100], ['Sala P0-S2', [917, 4438], 100]] }
  ] },
  { id: 'UTA-05', nome: 'VAN P1 N', rede: 'insuflacao', zona: 'P1 Norte', ala: 'Norte', uv: VAN(), tipoT: GI, ramais: [
    { nome: 'R5.1', piso: 'MZ', pts: [[5650, 1583], [4470, 1583]], t: [] },                 // cobertura, até à descida
    { nome: 'R5.1.1', pai: 'R5.1', L: 3.0, t: [] },                                            // prumada (não desenhada)
    { nome: 'R5.1.1.1', pai: 'R5.1.1', piso: 'P1', pts: [[2377, 3609], [528, 3609], [528, 4115]], t: [['Circulação P1-N2', [2332, 3609], 100], ['Sala P1-N4', [2056, 3609], 100], ['Sala P1-N3', [1656, 3609], 100], ['Circulação P1-N1', [1253, 3609], 100], ['Sala P1-N2', [836, 3609], 100], ['Sala P1-N1', [528, 4030], 100], ['Sala P1-S1', [528, 4115], 100]] }
  ] },
  { id: 'UTA-06', nome: 'VEG P1 N', rede: 'extracao', zona: 'P1 Norte', ala: 'Norte', uv: VEG(), tipoT: GE, ramais: [
    { nome: 'R6.1', piso: 'MZ', pts: [[6015, 1540], [4470, 1540]], t: [] },
    { nome: 'R6.1.1', pai: 'R6.1', L: 3.0, t: [] },
    { nome: 'R6.1.1.1', pai: 'R6.1.1', piso: 'P1', pts: [[2377, 3590], [512, 3590], [512, 4330]], t: [['Circulação P1-N2', [2137, 3590], 85], ['Sala P1-N4', [1720, 3590], 85], ['Sala P1-N3', [1320, 3590], 85], ['Circulação P1-N1', [926, 3590], 85], ['Sala P1-N2', [515, 3790], 85], ['Sala P1-N1', [515, 3857], 85], ['Sala P1-S1', [515, 4330], 85]] }
  ] },
  { id: 'UTA-07', nome: 'VAN P1 S', rede: 'insuflacao', zona: 'P1 Sul', ala: 'Sul', uv: VAN(), tipoT: GI, ramais: [
    { nome: 'R7.1', piso: 'P1', pts: [[3125, 4733], [1054, 4733]], t: [['Sala P1-S2 (open space)', [1794, 4712], 100], ['Sala P1-S2 (open space)', [1678, 4712], 100], ['Sala P1-S2 (open space)', [1054, 4725], 100]] },
    { nome: 'R7.1.1', pai: 'R7.1', piso: 'P1', pts: [[2490, 4733], [2490, 4524], [2380, 4524], [2380, 4312]], t: [['Apoio/Serviço «P0-S3» (P1)', [2515, 4590], 100], ['Laboratório P1-S3', [2420, 4540], 100], ['Apoio/Serviço P1-S4', [2410, 4463], 100], ['Sala P1-S2 (open space)', [2370, 4312], 100]] }
  ] },
  { id: 'UTA-08', nome: 'VEG P1 S', rede: 'extracao', zona: 'P1 Sul', ala: 'Sul', uv: VEG(), tipoT: GE, ramais: [
    { nome: 'R8.1', piso: 'P1', pts: [[3305, 4755], [1253, 4755]], t: [['Apoio/Serviço «P0-S3» (P1)', [2847, 4755], 100], ['Laboratório P1-S3', [2262, 4755], 100], ['Sala P1-S2 (open space)', [2063, 4755], 150], ['Sala P1-S2 (open space)', [1253, 4755], 150]] }
  ] },
  { id: 'UTA-09', nome: 'VEISP0', rede: 'extracao_suja', zona: 'P0 Norte IS', ala: 'Norte', tipoT: VE,
    uv: { tipoUV: 'UVU_SEM_FILTER', eta: 0.40, componentes: [C.ventilador, C.descargaSuja] }, ramais: [
    { nome: 'R9.1', piso: 'P0', pts: [[2660, 3935], [2697, 3935], [2697, 3700]], t: [['Casa de Banho P0-N2', [2722, 3905], 75, GE]] },   // GE azul (caudal proposto)
    { nome: 'R9.1.1', pai: 'R9.1', piso: 'P0', pts: [[2697, 3856], [2823, 3856]], t: [['Casa de Banho P0-N2', [2823, 3856], 75]] },
    { nome: 'R9.1.2', pai: 'R9.1', piso: 'P0', pts: [[2697, 3700], [2432, 3700], [2432, 3640]], t: [['Casa de Banho esp. P0-N3', [2432, 3640], 75]] },
    { nome: 'R9.1.3', pai: 'R9.1', piso: 'P0', pts: [[2697, 3700], [2842, 3700], [2842, 3680]], t: [['Casa de Banho P0-N1', [2742, 3690], 75], ['Casa de Banho P0-N1', [2842, 3680], 75]] }
  ] },
  { id: 'UTA-10', nome: 'VCM Refeitório (insuflação)', rede: 'insuflacao', zona: 'P0 Refeitório', ala: 'Sul', tipoT: GI,
    uv: { tipoUV: 'UVU_SEM_FILTER', eta: 0.40, componentes: [C.admissaoVCM, C.ventilador] }, ramais: [
    // insuflação da VCM: ar exterior (verde) pela GEA → insuflação (magenta)
    { nome: 'R10.1', piso: 'P0', pts: [[2575, 3950], [2490, 3950], [2490, 4137], [2366, 4137]], t: [['Refeitório P0-S1', [2495, 4065], 90], ['Refeitório P0-S1', [2366, 4137], 90]] }
  ] },
  // extração de ar sujo da copa (ciano): 2 grelhas de 70 m³/h sobre a bancada MLL/micro-ondas, pela VCM, com saída para a fachada
  { id: 'UTA-11', nome: 'VCM Refeitório (extração copa)', rede: 'extracao_suja', zona: 'P0 Refeitório', ala: 'Sul', tipoT: GE,
    uv: { tipoUV: 'UVU_SEM_FILTER', eta: 0.40, componentes: [C.ventilador, C.descargaVCM] }, ramais: [
    { nome: 'R11.1', piso: 'P0', pts: [[2590, 3950], [2590, 3984], [2505, 3984]], t: [['Refeitório P0-S1', [2505, 3988], 70]] },
    { nome: 'R11.1.1', pai: 'R11.1', piso: 'P0', pts: [[2590, 3984], [2645, 3984]], t: [['Refeitório P0-S1', [2645, 3988], 70]] }
  ] }
];

/* transferências por grelha de porta (Gp): [de, para, Q, posição da seta na página] */
const TRANSF = [
  ['Circulação P0-N2', 'Casa de Banho esp. P0-N3', 75, 'P0', [2385, 3702]],
  ['Circulação P0-N2', 'Casa de Banho P0-N1', 50, 'P0', [2510, 3702]],
  ['Circulação P0-N2', 'Casa de Banho P0-N2', 50, 'P0', [2510, 3815]]
];

/* ── geometria ── */
const compr = pts => pts.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]), 0);
function projetar(q, pts) {   // distância ao longo do traçado do ponto mais perto de q (px) e a distância a ele
  let tot = 0, melhor = null;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy, l = Math.sqrt(l2);
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2)) : 0;
    const d = Math.hypot(q[0] - (a[0] + t * dx), q[1] - (a[1] + t * dy));
    if (!melhor || d < melhor.d - 1e-9) melhor = { d, s: tot + t * l };
    tot += l;
  }
  return melhor;
}
function curvas(pts) { let n = 0; for (let i = 1; i < pts.length - 1; i++) { const a = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]), b = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]); let d = Math.abs(b - a) * 180 / Math.PI; if (d > 180) d = 360 - d; if (d >= 25) n += d / 90; } return n; }
const r2 = v => Math.round(v * 100) / 100;
const naImagem = (P, q) => [r2((q[0] - P.x0) * P.k), r2((q[1] - P.y0) * P.k)];

function montarProjeto(ESPACOS, REDES, TRANSF, META, PARAMS_EXTRA) {
  const espacos = ESPACOS.map(([nome, piso, ala, tipo, A, extra], i) => {
    const e = { id: 3001 + i, nome, tipo, zona: piso + ' - ' + ala, localizacao: { piso, ala, compartimento: null }, geometriaMetodo: 'AH',
      A, H: 2.6, V: Math.round(A * 2.6 * 1000) / 1000, N: OCUPADOS.includes(tipo) ? Math.ceil(A / 10) : 0,
      origem: 'Desenho TGC 19nov26', definicoes: [], transferencias: [] };
    const s = SALAS[nome];
    if (s) { const P = PISOS[s[0]]; e.planta = { pisoId: P.id, pts: s[1].map(q => naImagem(P, q)) }; }
    return Object.assign(e, extra || {});
  });
  const porNome = Object.fromEntries(espacos.map(e => [e.nome, e]));
  const ramais = [], terminais = [], utas = [];
  let idR = 1, idT = 1, idD = 1;
  const contagem = {};
  REDES.forEach(n => {
    utas.push(Object.assign({ id: n.id, nome: n.nome, rede: n.rede, zona: n.zona, curva: [], curvaFabricante: null, etaRec: 0, fs: 1.15, transmissao: 1,
      classeIE: 'IE3', recuperadorAtivo: false, ativo: true }, n.uv, { componentes: n.uv.componentes.map((c, k) => Object.assign({ id: 'COMP-' + n.id + '-' + (k + 1) }, c)) }));
    const geo = {};   // nome → { piso, pts, L }
    n.ramais.forEach(r => {
      const nivel = r.nome.split('.').length - 1;
      const P = r.piso ? PISOS[r.piso] : null;
      const L = r.pts ? r2(compr(r.pts) / P.pxm) : r.L;
      geo[r.nome] = { piso: r.piso, pts: r.pts, L };
      const ramal = { id: idR++, nome: r.nome, parente: r.pai || '', tipo: nivel === 1 ? 'Principal' : 'Sub-ramal',
        nivel: ['primario', 'secundario', 'terciario', 'quaternario', 'quaternario'][nivel - 1], nivelNumero: nivel, rede: n.rede, utaRef: n.id,
        L, zeta: r2(0.3 + 0.25 * (r.pts ? curvas(r.pts) : 2)), localizacao: { piso: r.piso === 'P1' ? 'P1' : (r.piso === 'MZ' ? 'Cobertura' : (r.piso || 'P1')), ala: n.ala, cota: null },
        geometriaInput: { material: 'Aço galvanizado', forma: 'circular' }, lock: { D: false },
        deltaP_registo: 0, deltaP_filtro: 0, deltaP_bateria: 0, deltaP_recup: 0 };
      if (r.pai) {
        const g = geo[r.pai];
        // sai do ponto do pai onde começa o traçado (mesmo piso) ou do fim do pai
        ramal.sPai = (g.pts && r.pts && g.piso === r.piso) ? r2(projetar(r.pts[0], g.pts).s / PISOS[g.piso].pxm) : g.L;
      }
      if (r.pts) ramal.planta = { pisoId: P.id, pts: r.pts.map(q => naImagem(P, q)) };
      ramais.push(ramal);
      r.t.forEach(([nomeEsp, q, Q, tipoT]) => {
        const e = porNome[nomeEsp];
        if (!e) throw new Error('Espaço desconhecido: ' + nomeEsp);
        const tipo = tipoT || n.tipoT;
        let def = e.definicoes.find(d => d.rede === n.rede && d.tipo === tipo);
        if (!def) { def = { id: 'DEF-' + (idD++), tipo, rede: n.rede, quantidade: 0, Q_total: 0, origem: 'Desenho' }; e.definicoes.push(def); }
        def.quantidade++; def.Q_total += Q;
        const pref = { [GI]: 'GI', [GE]: n.rede === 'extracao_suja' ? 'GEs' : 'GE', [VE]: 'VE' }[tipo];
        const chave = pref + '-' + e.nome; contagem[chave] = (contagem[chave] || 0) + 1;
        const curto = e.nome.replace(/\s*\(.*\)|«|»/g, '').replace(/^(Sala|Casa de Banho|Circulação|Laboratório|Apoio\/Serviço|Arrumo|Refeitório|Garagem)\s*/,
          m => ({ 'Sala ': 'S', 'Casa de Banho ': 'CB', 'Circulação ': 'Circ', 'Laboratório ': 'Lab', 'Apoio/Serviço ': 'Ap', 'Arrumo ': 'Arr', 'Refeitório ': 'Ref', 'Garagem ': 'Gar' })[m] || m).replace(/[^A-Za-z0-9-]/g, '');
        const pr = projetar(q, r.pts);
        terminais.push({ id: idT++, nome: pref + '-' + curto + '-' + contagem[chave], tipo, rede: n.rede,
          espacos: [{ nome: e.nome, Q_parcela: Q }], ramalRef: r.nome, sRamal: r2(pr.s / P.pxm), planta: Object.assign({ pisoId: P.id }, (([x, y]) => ({ x, y }))(naImagem(P, q))),
          fabricante: '', familia: '', tamanho: '', v_saida: 2, Q, definicaoRef: { espacoId: e.id, definicaoId: def.id } });
        if (n.rede === 'insuflacao' && !e.ramalRefInsuflacao) e.ramalRefInsuflacao = r.nome;
        if (n.rede !== 'insuflacao' && !e.ramalRefExtracao) e.ramalRefExtracao = r.nome;
      });
    });
  });
  const transferencias = TRANSF.map(([de, para, Q, piso, q], i) => {
    const P = PISOS[piso], [x, y] = naImagem(P, q);
    return { id: 'TRF-PT-' + (i + 1), deId: porNome[de].id, paraId: porNome[para].id, deNome: de, paraNome: para, Q, tipo: 'grelha_porta', dP_Pa: 2, planta: { pisoId: P.id, x, y } };
  });
  const plantas = ['P0', 'P1', 'MZ'].map(k => {
    const P = PISOS[k], f = path.join(__dirname, 'exemplos', 'degrade-21nov26', P.img);
    const { w, h } = tamanhoJPEG(fs.readFileSync(f));
    return { id: P.id, nome: P.nome, imagem: 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64'), w, h, escala: 1 / (P.pxm * P.k) };
  });
  return {
    _versao: 'V9',
    metadados: Object.assign({ cliente: 'Degrade', local: 'Torres Vedras, Portugal', autor: 'Tulio Cunha' }, META),
    configuracao: { tipologia: 'comercio', restricaoH: 350, serieDiametros: 'S1',
      params: Object.assign({ altitude: 30, temperatura: 20, humidade: 50, rugosidade: 0.15, categoria: 'II', poluicaoEdificio: 'pouco', potenciaTermica: 42, tExtInverno: 3 }, PARAMS_EXTRA || {}) },
    dados: { espacos, ramais, terminais, transferencias, utas, nos: [], trechos: [], elementosRede: [], _mapaRenomeacao: {}, plantas }
  };
}
function tamanhoJPEG(b) {   // largura e altura de um JPEG (marcador SOF)
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xFF) { i++; continue; }
    const m = b[i + 1], len = b.readUInt16BE(i + 2);
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  throw new Error('JPEG sem SOF');
}

/* ── CORREÇÕES (versão «corrigido»): o que muda face ao desenho e porquê ──
   Cada correção altera caudais e acrescenta só os terminais e troços precisos; o traçado do desenho mantém-se. */
const CORRECOES = [
  'Garagem P0-N1: sistema dedicado de insuflação e extração mecânicas (variante b). Extração VEX Garagem de 600 m³/h em dois patamares comandados por deteção de CO (RT-SCIE art. 183.º: 300 e 600 m³/h por veículo, 1 lugar), 2 GE × 300 junto ao pavimento; insuflação VIN Garagem de 540 m³/h (90 %) a partir do exterior, 2 GI × 270 em cota alta; os 60 m³/h que faltam entram por grelha permanente na porta (≈ 0,008 m² livres a 2 m/s), registados no balanço como abertura para o exterior; a garagem fica em depressão face ao edifício',
  'Sala P0-N1 (bastidores): ar novo 60 m³/h (VAN P0 N, tronco prolongado) e extração 60 m³/h (VEG P0 N, tronco prolongado); mínimo 59 m³/h',
  'Refeitório P0-S1: ar novo da VCM 2 × 100 = 200 m³/h (mínimo 192) e extração de ar sujo da copa pela VCM de 2 × 70 para 2 × 100 m³/h (balanço nulo)',
  'Sanitários (uso público, Tabela 13): VE de 75 para 90 m³/h por sanita; GE azul da CB P0-N2 suprimido (a VE de 90 cumpre)',
  'CB P0-N2: ar novo de 100 para 60 m³/h; recebe 30 m³/h por transferência e fica em depressão (Anexo II, 1.2.2 h))',
  'Circulação P0-N2: ar novo 200 m³/h (derivação da Sala Técnica), igual ao ar que transfere para os sanitários (90 + 80 + 30)',
  'Salas técnicas (bastidores e P0-N2): sem caudal de conforto acrescentado; o caudal do desenho já cobre a renovação',
  'Escritórios, laboratórios, circulações do P1 e Arrumo P0-N1: extração igual ao ar novo de cada espaço (balanço nulo)',
  'Sala P1-S2: extração 2 × 200 = 400 m³/h, igual ao ar novo',
  'Apoio/Serviço P1-S4: extração 100 m³/h por derivação nova do VEG P1 S',
  'Setup: ventilação integrável em gestão técnica (ar novo ≥ 3000 m³/h, Portaria 138-I, Anexo II, 1.5 c)'
];
function corrigir() {
  const E = JSON.parse(JSON.stringify(ESPACOS)), RD = JSON.parse(JSON.stringify(REDES));
  RD.forEach((n, i) => { n.uv = REDES[i].uv; });
  const rede = id => RD.find(n => n.id === id), ramal = (id, nome) => rede(id).ramais.find(r => r.nome === nome);
  const setQ = (id, nome, esp, Q) => ramal(id, nome).t.filter(t => t[0] === esp).forEach(t => { t[2] = Q; });
  // bastidores: troncos prolongados até à sala
  const r11 = ramal('UTA-01', 'R1.1'); r11.pts[1] = [800, 3630]; r11.t.push(['Sala P0-N1 (bastidores)', [800, 3630], 60]);
  const r21 = ramal('UTA-02', 'R2.1'); r21.pts[1] = [760, 3610]; r21.t.push(['Sala P0-N1 (bastidores)', [760, 3610], 60]);
  // circulação P0-N2 e CB P0-N2
  ramal('UTA-01', 'R1.1.1').t.push(['Circulação P0-N2', [2272, 3760], 200]);
  setQ('UTA-01', 'R1.1.1.1.1', 'Casa de Banho P0-N2', 60);
  E.filter(e => e[3] === 'Sala técnica').forEach(e => { e[5] = Object.assign({}, e[5], { rphAplicado: 0, rphOrigem: 'utilizador' }); });
  E.filter(e => e[0] === 'Garagem P0-N1').forEach(e => { e[5] = Object.assign({}, e[5], { Q_exterior: 60 }); });   // variante b: o que falta à insuflação entra pela grelha da porta
  // extração = ar novo
  [['Arrumo P0-N1', 100], ['Sala P0-N4', 125], ['Sala P0-N3', 125], ['Sala P0-N2', 100]].forEach(([e, q]) => setQ('UTA-02', 'R2.1', e, q));
  [['Laboratório P0-S5', 150], ['Sala P0-S4', 150], ['Sala P0-S3', 150], ['Sala P0-S1', 125], ['Sala P0-S2', 125]].forEach(([e, q]) => setQ('UTA-04', 'R4.1', e, q));
  ramal('UTA-06', 'R6.1.1.1').t.forEach(t => { t[2] = 100; });
  setQ('UTA-08', 'R8.1', 'Sala P1-S2 (open space)', 200);
  // refeitório
  ramal('UTA-10', 'R10.1').t.forEach(t => { t[2] = 100; });
  setQ('UTA-11', 'R11.1', 'Refeitório P0-S1', 100); setQ('UTA-11', 'R11.1.1', 'Refeitório P0-S1', 100);
  // apoio P1-S4
  rede('UTA-08').ramais.push({ nome: 'R8.1.1', pai: 'R8.1', piso: 'P1', pts: [[2700, 4755], [2700, 4450]], t: [['Apoio/Serviço P1-S4', [2700, 4450], 100]] });
  // sanitários: VE 90, sem GE azul
  ramal('UTA-09', 'R9.1').t = [];
  rede('UTA-09').ramais.forEach(r => r.t.forEach(t => { t[2] = 90; }));
  // garagem: extração dedicada (ar contaminado, rede própria)
  RD.push({ id: 'UTA-12', nome: 'VEX Garagem P0-N1', rede: 'extracao_suja', zona: 'P0 Garagem', ala: 'Norte', tipoT: GE,
    uv: { tipoUV: 'UVU_SEM_FILTER', eta: 0.45, componentes: [C.ventilador, C.grelhaExt] }, ramais: [
      { nome: 'R12.1', piso: 'P0', pts: [[530, 4100], [900, 4100]], t: [['Garagem P0-N1', [700, 4100], 300], ['Garagem P0-N1', [900, 4100], 300]] }] });
  RD.push({ id: 'UTA-13', nome: 'VIN Garagem P0-N1', rede: 'insuflacao', zona: 'P0 Garagem', ala: 'Norte', tipoT: GI,
    uv: { tipoUV: 'UVU_FILTER', eta: 0.45, componentes: [C.grelhaExt, C.g4, C.ventilador] }, ramais: [
      { nome: 'R13.1', piso: 'P0', pts: [[530, 3790], [900, 3790]], t: [['Garagem P0-N1', [700, 3790], 270], ['Garagem P0-N1', [900, 3790], 270]] }] });
  const T = [['Circulação P0-N2', 'Casa de Banho esp. P0-N3', 90, 'P0', [2385, 3702]], ['Circulação P0-N2', 'Casa de Banho P0-N1', 80, 'P0', [2510, 3702]], ['Circulação P0-N2', 'Casa de Banho P0-N2', 30, 'P0', [2510, 3815]]];
  return { E, R: RD, T };
}

function servidor() {
  return new Promise(res => {
    const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json' };
    const s = http.createServer((req, resp) => {
      const p = path.join(RAIZ, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { resp.writeHead(404); return resp.end(); }
      resp.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(resp);
    });
    s.listen(0, '127.0.0.1', () => res(s));
  });
}

const VERSOES = [
  { ficheiro: 'degrade-21nov26.json', projeto: () => montarProjeto(ESPACOS, REDES, TRANSF, { nome: 'Degrade 21 nov26', revisao: '01',
    descricao: 'Parâmetros do Tempo · estudo de ventilação TGC 19nov26 (validação de princípio) · Piso 0 e Piso 1 · 8 ventiladores VAN/VEG + VEISP0 + VCM · caudais e traçado do desenho · bloco nordeste e Mezanino fora do cálculo' }) },
  { ficheiro: 'degrade-21nov26-corrigido.json', projeto: () => { const c = corrigir(); return montarProjeto(c.E, c.R, c.T, { nome: 'Degrade 21 nov26 · corrigido', revisao: '02',
    descricao: 'Degrade 21 nov26 com as correções de conformidade (Portaria 138-I, RT-SCIE, balanço de ar): ' + CORRECOES.join(' · ') }, { integracaoGT: true }); } }
];

(async () => {
  const srv = await servidor();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const erros = [];
  page.on('pageerror', e => erros.push(e.message));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());   // sem bibliotecas externas: só o motor de cálculo
  await page.goto('http://127.0.0.1:' + srv.address().port + '/index.html');
  await page.waitForFunction(() => window.VC && VC.exemplos && VC.calculo, null, { timeout: 30000 });
  for (const V of VERSOES) {
  const projeto = V.projeto();
  const out = await page.evaluate(p => {
    VC.exemplos.aplicarProjeto(p);
    const s = VC.exemplos.serializarAtual();
    return { projeto: s, resumo: {
      espacos: VC.dados.espacos.length, nRamais: VC.dados.ramais.length, terminais: VC.dados.terminais.length, utas: VC.dados.utas.length,
      porUta: VC.dados.utas.map(u => u.nome + ': ' + Math.round((u.Q || 0) * 3600) + ' m³/h · Δp ext ' + Math.round(u.dpExt || 0) + ' Pa'),
      ramais: VC.dados.ramais.map(r => r.nome + ' Q=' + r.Q + ' ' + (r.trocos || []).map(t => t.secao + '×' + t.L.toFixed(1)).join(' → '))
    } };
  }, projeto);
  fs.writeFileSync(path.join(RAIZ, 'exemplos', V.ficheiro), JSON.stringify(out.projeto, null, 1) + '\n');
  console.log(V.ficheiro, JSON.stringify(out.resumo, null, 1));
  }
  if (erros.length) console.log('Erros JS:', erros);
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
