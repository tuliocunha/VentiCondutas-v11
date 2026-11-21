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
   · comprimentos: medidos à escala calibrada pelas áreas das salas
     (P0: 78,5 px/m · P1: 80,7 px/m a 700 dpi), margem ±5 %;
     posições s = metros desde o ventilador ao longo do ramal;
   · H = 2,6 m; N = 1 pessoa por 10 m² (arredondado para cima);
   · sanitários públicos, aparelhos contados na planta;
   · bloco nordeste (Sala P1-N6, P1-N7 de pé-direito duplo,
     CB/apoio/circulação do P1 e o Mezanino) fica fora do cálculo;
   · GE azul da CB P0-N2 = 75 m³/h (proposta, não cotado);
   · GE de 100 m³/h junto ao refeitório = Sala Técnica P0-N2;
   · VAN P1 N / VEG P1 N: etiquetas trocadas no desenho do Mezanino
     (a caixa com filtro e admissão é o VAN);
   · prumadas P1 → cobertura: 3,0 m (assumido);
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
  admissaoVCM: { nome: 'Admissão GEA 300×200 + Ø100 4,2 m', tipo: 'Outro', deltaP: 45, deltaP_final: 45, zeta: 0, obs: 'medido na planta' }
};
const VAN = () => ({ tipoUV: 'UVU_FILTER', eta: 0.55, componentes: [C.grelhaExt, C.f7, C.ventilador] });
const VEG = () => ({ tipoUV: 'UVU_FILTER', eta: 0.50, componentes: [C.g4, C.ventilador, C.grelhaExt] });

/* ── redes: ventilador + ramais; terminais [espaço, s (m), Q (m³/h)] ── */
const GI = 'Grelha Insuflação', GE = 'Grelha Extração', VE = 'Válvula';
const REDES = [
  { id: 'UTA-01', nome: 'VAN P0 N', rede: 'insuflacao', zona: 'P0 Norte', piso: 'P0', ala: 'Norte', uv: VAN(), tipoT: GI, ramais: [
    { nome: 'R1.1', L: 25.7, zeta: 0.6, t: [['Arrumo P0-N1', 12.0, 100], ['Sala P0-N4', 16.8, 125], ['Sala P0-N3', 21.9, 125], ['Sala P0-N2', 25.7, 100]] },
    { nome: 'R1.1.1', pai: 'R1.1', sPai: 9.7, L: 3.0, zeta: 0.6, t: [['Sala Técnica P0-N2', 3.0, 100]] },
    { nome: 'R1.1.1.1', pai: 'R1.1.1', sPai: 1.0, L: 4.7, zeta: 0.6, t: [['Casa de Banho P0-N1', 3.3, 100], ['Casa de Banho P0-N2', 4.7, 100]] }
  ] },
  { id: 'UTA-02', nome: 'VEG P0 N', rede: 'extracao', zona: 'P0 Norte', piso: 'P0', ala: 'Norte', uv: VEG(), tipoT: GE, ramais: [
    { nome: 'R2.1', L: 20.8, zeta: 0.6, t: [['Arrumo P0-N1', 8.3, 80], ['Sala P0-N4', 10.8, 100], ['Sala P0-N3', 15.8, 100], ['Sala P0-N2', 20.8, 80]] },
    { nome: 'R2.1.1', pai: 'R2.1', sPai: 7.8, L: 8.0, zeta: 0.9, t: [['Sala Técnica P0-N2', 8.0, 100]] }
  ] },
  { id: 'UTA-03', nome: 'VAN P0 S', rede: 'insuflacao', zona: 'P0 Sul', piso: 'P0', ala: 'Sul', uv: VAN(), tipoT: GI, ramais: [
    { nome: 'R3.1', L: 27.2, zeta: 0.9, t: [['Laboratório P0-S5', 7.5, 150], ['Sala P0-S4', 15.5, 150], ['Sala P0-S3', 20.3, 150], ['Sala P0-S1', 21.3, 125], ['Sala P0-S2', 27.2, 125]] }
  ] },
  { id: 'UTA-04', nome: 'VEG P0 S', rede: 'extracao', zona: 'P0 Sul', piso: 'P0', ala: 'Sul', uv: VEG(), tipoT: GE, ramais: [
    { nome: 'R4.1', L: 31.3, zeta: 0.9, t: [['Laboratório P0-S5', 4.0, 125], ['Sala P0-S4', 12.9, 125], ['Sala P0-S3', 18.0, 125], ['Sala P0-S1', 30.4, 100], ['Sala P0-S2', 31.3, 100]] }
  ] },
  { id: 'UTA-05', nome: 'VAN P1 N', rede: 'insuflacao', zona: 'P1 Norte', piso: 'P1', ala: 'Norte', uv: VAN(), tipoT: GI, ramais: [
    // 7,0 m na cobertura + 3,0 m de prumada até ao Piso 1
    { nome: 'R5.1', L: 39.4, zeta: 1.2, t: [['Circulação P1-N2', 10.6, 100], ['Sala P1-N4', 14.0, 100], ['Sala P1-N3', 18.9, 100], ['Circulação P1-N1', 23.9, 100], ['Sala P1-N2', 29.1, 100], ['Sala P1-N1', 38.5, 100], ['Sala P1-S1', 39.4, 100]] }
  ] },
  { id: 'UTA-06', nome: 'VEG P1 N', rede: 'extracao', zona: 'P1 Norte', piso: 'P1', ala: 'Norte', uv: VEG(), tipoT: GE, ramais: [
    // 9,2 m na cobertura + 3,0 m de prumada até ao Piso 1
    { nome: 'R6.1', L: 44.4, zeta: 1.2, t: [['Circulação P1-N2', 15.2, 85], ['Sala P1-N4', 20.3, 85], ['Sala P1-N3', 25.3, 85], ['Circulação P1-N1', 30.2, 85], ['Sala P1-N2', 37.7, 85], ['Sala P1-N1', 38.4, 85], ['Sala P1-S1', 44.4, 85]] }
  ] },
  { id: 'UTA-07', nome: 'VAN P1 S', rede: 'insuflacao', zona: 'P1 Sul', piso: 'P1', ala: 'Sul', uv: VAN(), tipoT: GI, ramais: [
    { nome: 'R7.1', L: 25.7, zeta: 0.6, t: [['Sala P1-S2 (open space)', 16.6, 100], ['Sala P1-S2 (open space)', 18.1, 100], ['Sala P1-S2 (open space)', 25.7, 100]] },
    { nome: 'R7.1.1', pai: 'R7.1', sPai: 7.9, L: 5.7, zeta: 0.9, t: [['Apoio/Serviço «P0-S3» (P1)', 2.5, 100], ['Laboratório P1-S3', 3.0, 100], ['Apoio/Serviço P1-S4', 3.8, 100], ['Sala P1-S2 (open space)', 5.7, 100]] }
  ] },
  { id: 'UTA-08', nome: 'VEG P1 S', rede: 'extracao', zona: 'P1 Sul', piso: 'P1', ala: 'Sul', uv: VEG(), tipoT: GE, ramais: [
    { nome: 'R8.1', L: 25.4, zeta: 0.6, t: [['Apoio/Serviço «P0-S3» (P1)', 5.7, 100], ['Laboratório P1-S3', 12.8, 100], ['Sala P1-S2 (open space)', 15.4, 150], ['Sala P1-S2 (open space)', 25.4, 150]] }
  ] },
  { id: 'UTA-09', nome: 'VEISP0', rede: 'extracao_suja', zona: 'P0 Norte IS', piso: 'P0', ala: 'Norte', tipoT: VE,
    uv: { tipoUV: 'UVU_SEM_FILTER', eta: 0.40, componentes: [C.ventilador, C.descargaSuja] }, ramais: [
    { nome: 'R9.1', L: 4.1, zeta: 0.6, t: [['Casa de Banho P0-N2', 1.4, 75, GE]] },   // GE azul (caudal proposto)
    { nome: 'R9.1.1', pai: 'R9.1', sPai: 2.0, L: 1.7, zeta: 0.6, t: [['Casa de Banho P0-N2', 1.7, 75]] },
    { nome: 'R9.1.2', pai: 'R9.1', sPai: 4.1, L: 4.2, zeta: 0.6, t: [['Casa de Banho esp. P0-N3', 4.2, 75]] },
    { nome: 'R9.1.3', pai: 'R9.1', sPai: 4.1, L: 1.85, zeta: 0.6, t: [['Casa de Banho P0-N1', 1.6, 75], ['Casa de Banho P0-N1', 1.85, 75]] }
  ] },
  { id: 'UTA-10', nome: 'VCM Refeitório (ar novo)', rede: 'insuflacao', zona: 'P0 Refeitório', piso: 'P0', ala: 'Sul', tipoT: GI,
    uv: { tipoUV: 'UVU_SEM_FILTER', eta: 0.40, componentes: [C.admissaoVCM, C.ventilador] }, ramais: [
    // insuflação da VCM: Ø150 2,9 m + Ø100 1,4 m (a recirculação de 70 m³/h não é modelada)
    { nome: 'R10.1', L: 4.3, zeta: 0.6, t: [['Refeitório P0-S1', 2.9, 90], ['Refeitório P0-S1', 4.3, 90]] }
  ] }
];

/* transferências por grelha de porta (Gp): Q = extração − insuflação do sanitário */
const TRANSF = [
  ['Circulação P0-N2', 'Casa de Banho esp. P0-N3', 75],
  ['Circulação P0-N2', 'Casa de Banho P0-N1', 50],
  ['Circulação P0-N2', 'Casa de Banho P0-N2', 50]
];

function montarProjeto(ESPACOS, REDES, TRANSF, META, PARAMS_EXTRA) {
  const espacos = ESPACOS.map(([nome, piso, ala, tipo, A, extra], i) => {
    const e = { id: 3001 + i, nome, tipo, zona: piso + ' - ' + ala, localizacao: { piso, ala, compartimento: null }, geometriaMetodo: 'AH',
      A, H: 2.6, V: Math.round(A * 2.6 * 1000) / 1000, N: OCUPADOS.includes(tipo) ? Math.ceil(A / 10) : 0,
      origem: 'Desenho TGC 19nov26', definicoes: [], transferencias: [] };
    return Object.assign(e, extra || {});
  });
  const porNome = Object.fromEntries(espacos.map(e => [e.nome, e]));
  const ramais = [], terminais = [], utas = [];
  let idR = 1, idT = 1, idD = 1;
  const contagem = {};
  REDES.forEach(n => {
    utas.push(Object.assign({ id: n.id, nome: n.nome, rede: n.rede, zona: n.zona, curva: [], curvaFabricante: null, etaRec: 0, fs: 1.15, transmissao: 1,
      classeIE: 'IE3', recuperadorAtivo: false, ativo: true }, n.uv, { componentes: n.uv.componentes.map((c, k) => Object.assign({ id: 'COMP-' + n.id + '-' + (k + 1) }, c)) }));
    n.ramais.forEach(r => {
      const nivel = r.nome.split('.').length - 1;
      const ramal = { id: idR++, nome: r.nome, parente: r.pai || '', tipo: nivel === 1 ? 'Principal' : 'Sub-ramal',
        nivel: ['primario', 'secundario', 'terciario', 'quaternario'][nivel - 1], nivelNumero: nivel, rede: n.rede, utaRef: n.id,
        L: r.L, zeta: r.zeta, localizacao: { piso: n.piso, ala: n.ala, cota: null },
        geometriaInput: { material: 'Aço galvanizado', forma: 'circular' }, lock: { D: false },
        deltaP_registo: 0, deltaP_filtro: 0, deltaP_bateria: 0, deltaP_recup: 0 };
      if (r.pai) ramal.sPai = r.sPai;
      ramais.push(ramal);
      r.t.forEach(([nomeEsp, s, Q, tipoT]) => {
        const e = porNome[nomeEsp];
        if (!e) throw new Error('Espaço desconhecido: ' + nomeEsp);
        const tipo = tipoT || n.tipoT;
        let def = e.definicoes.find(d => d.rede === n.rede && d.tipo === tipo);
        if (!def) { def = { id: 'DEF-' + (idD++), tipo, rede: n.rede, quantidade: 0, Q_total: 0, origem: 'Desenho' }; e.definicoes.push(def); }
        def.quantidade++; def.Q_total += Q;
        const pref = { [GI]: 'GI', [GE]: n.rede === 'extracao_suja' ? 'GEs' : 'GE', [VE]: 'VE' }[tipo];
        const chave = pref + '-' + e.nome; contagem[chave] = (contagem[chave] || 0) + 1;
        const curto = e.nome.replace(/\s*\(.*\)|«|»/g, '').replace(/^(Sala|Casa de Banho|Circulação|Laboratório|Apoio\/Serviço|Arrumo|Refeitório)\s*/,
          m => ({ 'Sala ': 'S', 'Casa de Banho ': 'CB', 'Circulação ': 'Circ', 'Laboratório ': 'Lab', 'Apoio/Serviço ': 'Ap', 'Arrumo ': 'Arr', 'Refeitório ': 'Ref' })[m] || m).replace(/[^A-Za-z0-9-]/g, '');
        terminais.push({ id: idT++, nome: pref + '-' + curto + '-' + contagem[chave], tipo, rede: n.rede,
          espacos: [{ nome: e.nome, Q_parcela: Q }], ramalRef: r.nome, sRamal: s, fabricante: '', familia: '', tamanho: '', v_saida: 2, Q,
          definicaoRef: { espacoId: e.id, definicaoId: def.id } });
        if (n.rede === 'insuflacao' && !e.ramalRefInsuflacao) e.ramalRefInsuflacao = r.nome;
        if (n.rede !== 'insuflacao' && !e.ramalRefExtracao) e.ramalRefExtracao = r.nome;
      });
    });
  });
  const transferencias = TRANSF.map(([de, para, Q], i) => ({ id: 'TRF-PT-' + (i + 1), deId: porNome[de].id, paraId: porNome[para].id, deNome: de, paraNome: para,
    Q, tipo: 'grelha_porta', dP_Pa: 2 }));
  return {
    _versao: 'V9',
    metadados: Object.assign({ cliente: 'Degrade', local: 'Torres Vedras, Portugal', autor: 'Tulio Cunha' }, META),
    configuracao: { tipologia: 'comercio', restricaoH: 250, serieDiametros: 'S1',
      params: Object.assign({ altitude: 30, temperatura: 20, humidade: 50, rugosidade: 0.15, categoria: 'II', poluicaoEdificio: 'pouco', potenciaTermica: 42, tExtInverno: 3 }, PARAMS_EXTRA || {}) },
    dados: { espacos, ramais, terminais, transferencias, utas, nos: [], trechos: [], elementosRede: [], _mapaRenomeacao: {} }
  };
}

/* ── CORREÇÕES (versão «corrigido»): o que muda face ao desenho e porquê ──
   Cada correção altera só caudais, terminais e um troço novo onde preciso; o traçado do desenho mantém-se. */
const CORRECOES = [
  'Garagem P0-N1: extração dedicada VEX Garagem de 600 m³/h (RT-SCIE art. 183.º: 300 e 600 m³/h por veículo, 1 lugar), 2 GE × 300 junto ao pavimento; ar de compensação natural pela porta exterior',
  'Sala P0-N1 (bastidores): ar novo 60 m³/h (VAN P0 N, tronco prolongado 4,1 m) e extração 60 m³/h (VEG P0 N, tronco prolongado 7,2 m); mínimo 59 m³/h',
  'Refeitório P0-S1: ar novo da VCM 2 × 100 = 200 m³/h (mínimo 192) e extração nova de 2 × 100 m³/h por derivação do VEG P0 S',
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
  const E = JSON.parse(JSON.stringify(ESPACOS)), R = JSON.parse(JSON.stringify(REDES));
  const rede = id => R.find(n => n.id === id), ramal = (id, nome) => rede(id).ramais.find(r => r.nome === nome);
  const setQ = (id, nome, esp, Q) => ramal(id, nome).t.filter(t => t[0] === esp).forEach(t => { t[2] = Q; });
  // bastidores
  const r11 = ramal('UTA-01', 'R1.1'); r11.L = 29.8; r11.t.push(['Sala P0-N1 (bastidores)', 29.8, 60]);
  const r21 = ramal('UTA-02', 'R2.1'); r21.L = 28.0; r21.t.push(['Sala P0-N1 (bastidores)', 28.0, 60]);
  // circulação P0-N2 e CB P0-N2
  ramal('UTA-01', 'R1.1.1').t.push(['Circulação P0-N2', 1.8, 200]);
  setQ('UTA-01', 'R1.1.1.1', 'Casa de Banho P0-N2', 60);
  // salas técnicas: o caudal do desenho já cobre a renovação; sem caudal de conforto (F-RPH) por cima
  E.filter(e => e[3] === 'Sala técnica').forEach(e => { e[5] = Object.assign({}, e[5], { rphAplicado: 0, rphOrigem: 'utilizador' }); });
  // extração = ar novo
  [['Arrumo P0-N1', 100], ['Sala P0-N4', 125], ['Sala P0-N3', 125], ['Sala P0-N2', 100]].forEach(([e, q]) => setQ('UTA-02', 'R2.1', e, q));
  [['Laboratório P0-S5', 150], ['Sala P0-S4', 150], ['Sala P0-S3', 150], ['Sala P0-S1', 125], ['Sala P0-S2', 125]].forEach(([e, q]) => setQ('UTA-04', 'R4.1', e, q));
  ramal('UTA-06', 'R6.1').t.forEach(t => { t[2] = 100; });
  setQ('UTA-08', 'R8.1', 'Sala P1-S2 (open space)', 200);
  // refeitório
  rede('UTA-04').ramais.push({ nome: 'R4.1.1', pai: 'R4.1', sPai: 5.9, L: 8.9, zeta: 0.9, t: [['Refeitório P0-S1', 7.5, 100], ['Refeitório P0-S1', 8.9, 100]] });
  ramal('UTA-10', 'R10.1').t.forEach(t => { t[2] = 100; });
  // apoio P1-S4
  rede('UTA-08').ramais.push({ nome: 'R8.1.1', pai: 'R8.1', sPai: 5.7, L: 3.0, zeta: 0.6, t: [['Apoio/Serviço P1-S4', 3.0, 100]] });
  // sanitários: VE 90, sem GE azul
  const s9 = rede('UTA-09'); ramal('UTA-09', 'R9.1').t = [];
  s9.ramais.forEach(r => r.t.forEach(t => { t[2] = 90; }));
  // garagem: extração dedicada (ar contaminado, rede própria)
  R.push({ id: 'UTA-11', nome: 'VEX Garagem P0-N1', rede: 'extracao_suja', zona: 'P0 Garagem', piso: 'P0', ala: 'Norte', tipoT: GE,
    uv: { tipoUV: 'UVU_SEM_FILTER', eta: 0.45, componentes: [C.ventilador, C.grelhaExt] }, ramais: [
      { nome: 'R11.1', L: 3.0, zeta: 0.6, t: [['Garagem P0-N1', 1.5, 300], ['Garagem P0-N1', 3.0, 300]] }] });
  const T = [['Circulação P0-N2', 'Casa de Banho esp. P0-N3', 90], ['Circulação P0-N2', 'Casa de Banho P0-N1', 80], ['Circulação P0-N2', 'Casa de Banho P0-N2', 30]];
  return { E, R, T };
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
    s.dados.plantas = [];
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
