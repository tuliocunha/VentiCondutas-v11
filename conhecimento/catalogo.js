/* ============================================================
   VENTICONDUTAS · BASE DE CONHECIMENTO · CATALOGO
   Ficheiro 5.2 — Catálogo de terminais + curvas de fabricantes

   ALTERAÇÕES V10.0.0:
   - P16: Adicionados 4 tipos de produto em falta
   - P17: Curvas DP expandidas para 5 pontos
   - P18: Adicionado metodo calcularThrow (√Q)
   - P19: TDF-SilentAIR removido dos difusores
   ============================================================ */
(function () {
'use strict';
window.VC = window.VC || {};
VC._catalogo = {

  curvas: [
    { fabricante: 'Sodeca', serie: 'HCT/CHT', modelo: 'HCT-200', aplicacao: 'Centrífugo dupla aspiração', rede: 'insuflacao', Q_nom: 800, dP_nom: 600, rpm_max: 2800, P_max: 550, eta_max: 0.68, pontos: [{Q:0,dP:920},{Q:200,dP:880},{Q:400,dP:800},{Q:600,dP:700},{Q:800,dP:600},{Q:1000,dP:470},{Q:1200,dP:320},{Q:1400,dP:150},{Q:1600,dP:0}] },
    { fabricante: 'Sodeca', serie: 'HCT/CHT', modelo: 'HCT-250', aplicacao: 'Centrífugo dupla aspiração', rede: 'insuflacao', Q_nom: 1200, dP_nom: 650, rpm_max: 2600, P_max: 900, eta_max: 0.70, pontos: [{Q:0,dP:1050},{Q:300,dP:1000},{Q:600,dP:920},{Q:900,dP:800},{Q:1200,dP:650},{Q:1500,dP:480},{Q:1800,dP:300},{Q:2100,dP:120},{Q:2400,dP:0}] },
    { fabricante: 'Sodeca', serie: 'HCT/CHT', modelo: 'CHT-315', aplicacao: 'Centrífugo dupla aspiração', rede: 'insuflacao', Q_nom: 2000, dP_nom: 700, rpm_max: 2200, P_max: 1800, eta_max: 0.72, pontos: [{Q:0,dP:1250},{Q:500,dP:1180},{Q:1000,dP:1050},{Q:1500,dP:880},{Q:2000,dP:700},{Q:2500,dP:500},{Q:3000,dP:290},{Q:3500,dP:110},{Q:4000,dP:0}] },
    { fabricante: 'Sodeca', serie: 'HCT/CHT', modelo: 'CHT-400', aplicacao: 'Centrífugo dupla aspiração', rede: 'insuflacao', Q_nom: 3200, dP_nom: 750, rpm_max: 1800, P_max: 3200, eta_max: 0.74, pontos: [{Q:0,dP:1450},{Q:800,dP:1350},{Q:1600,dP:1200},{Q:2400,dP:1000},{Q:3200,dP:750},{Q:4000,dP:520},{Q:4800,dP:280},{Q:5600,dP:80},{Q:6400,dP:0}] },
    { fabricante: 'Trox', serie: 'TDF-SilentAIR', modelo: 'TDF-300', aplicacao: 'Ventilador de conduta', rede: 'insuflacao', Q_nom: 300, dP_nom: 400, rpm_max: 2600, P_max: 120, eta_max: 0.58, pontos: [{Q:0,dP:600},{Q:75,dP:560},{Q:150,dP:500},{Q:225,dP:430},{Q:300,dP:400},{Q:375,dP:300},{Q:450,dP:200},{Q:525,dP:80},{Q:600,dP:0}] },
    { fabricante: 'Trox', serie: 'TDF-SilentAIR', modelo: 'TDF-400', aplicacao: 'Ventilador de conduta', rede: 'insuflacao', Q_nom: 600, dP_nom: 450, rpm_max: 2200, P_max: 260, eta_max: 0.62, pontos: [{Q:0,dP:720},{Q:150,dP:670},{Q:300,dP:590},{Q:450,dP:500},{Q:600,dP:450},{Q:750,dP:340},{Q:900,dP:220},{Q:1050,dP:90},{Q:1200,dP:0}] },
    { fabricante: 'Trox', serie: 'TDF-SilentAIR', modelo: 'TDF-600', aplicacao: 'Ventilador de conduta', rede: 'insuflacao', Q_nom: 1200, dP_nom: 500, rpm_max: 1800, P_max: 620, eta_max: 0.66, pontos: [{Q:0,dP:850},{Q:300,dP:790},{Q:600,dP:700},{Q:900,dP:590},{Q:1200,dP:500},{Q:1500,dP:380},{Q:1800,dP:250},{Q:2100,dP:100},{Q:2400,dP:0}] },
    { fabricante: 'Sistemair', serie: 'Série M', modelo: 'M100', aplicacao: 'Ventilador compacto', rede: 'extracao', Q_nom: 100, dP_nom: 250, rpm_max: 2400, P_max: 35, eta_max: 0.48, pontos: [{Q:0,dP:400},{Q:25,dP:370},{Q:50,dP:330},{Q:75,dP:290},{Q:100,dP:250},{Q:125,dP:200},{Q:150,dP:140},{Q:175,dP:70},{Q:200,dP:0}] },
    { fabricante: 'Sistemair', serie: 'Série M', modelo: 'M200', aplicacao: 'Ventilador compacto', rede: 'extracao', Q_nom: 220, dP_nom: 320, rpm_max: 2200, P_max: 90, eta_max: 0.55, pontos: [{Q:0,dP:520},{Q:55,dP:480},{Q:110,dP:430},{Q:165,dP:370},{Q:220,dP:320},{Q:275,dP:250},{Q:330,dP:170},{Q:385,dP:80},{Q:440,dP:0}] },
    { fabricante: 'Sistemair', serie: 'Série M', modelo: 'M315', aplicacao: 'Ventilador compacto', rede: 'extracao', Q_nom: 400, dP_nom: 380, rpm_max: 1800, P_max: 200, eta_max: 0.60, pontos: [{Q:0,dP:620},{Q:100,dP:570},{Q:200,dP:510},{Q:300,dP:440},{Q:400,dP:380},{Q:500,dP:290},{Q:600,dP:200},{Q:700,dP:100},{Q:800,dP:0}] },
    { fabricante: 'Soler & Palau', serie: 'Série TD', modelo: 'TD-500', aplicacao: 'Ventilador de conduta', rede: 'extracao', Q_nom: 500, dP_nom: 380, rpm_max: 2400, P_max: 180, eta_max: 0.60, pontos: [{Q:0,dP:600},{Q:125,dP:560},{Q:250,dP:500},{Q:375,dP:440},{Q:500,dP:380},{Q:625,dP:290},{Q:750,dP:200},{Q:875,dP:100},{Q:1000,dP:0}] },
    { fabricante: 'Soler & Palau', serie: 'Série TD', modelo: 'TD-800', aplicacao: 'Ventilador de conduta', rede: 'extracao', Q_nom: 850, dP_nom: 450, rpm_max: 2000, P_max: 340, eta_max: 0.64, pontos: [{Q:0,dP:750},{Q:210,dP:700},{Q:420,dP:620},{Q:630,dP:530},{Q:850,dP:450},{Q:1060,dP:350},{Q:1270,dP:230},{Q:1480,dP:100},{Q:1700,dP:0}] },
    { fabricante: 'Soler & Palau', serie: 'Série TD', modelo: 'TD-1000', aplicacao: 'Ventilador de conduta', rede: 'extracao', Q_nom: 1100, dP_nom: 500, rpm_max: 1800, P_max: 520, eta_max: 0.66, pontos: [{Q:0,dP:880},{Q:275,dP:820},{Q:550,dP:730},{Q:825,dP:620},{Q:1100,dP:500},{Q:1375,dP:380},{Q:1650,dP:240},{Q:1925,dP:110},{Q:2200,dP:0}] },
    { fabricante: 'Sodeca', serie: 'CRB', modelo: 'CRB-150', aplicacao: 'Centrífugo baixa pressão', rede: 'extracao', Q_nom: 350, dP_nom: 280, rpm_max: 2500, P_max: 100, eta_max: 0.52, pontos: [{Q:0,dP:450},{Q:80,dP:420},{Q:160,dP:380},{Q:240,dP:330},{Q:350,dP:280},{Q:440,dP:210},{Q:530,dP:140},{Q:620,dP:60},{Q:700,dP:0}] },
    { fabricante: 'Trox', serie: 'TFC', modelo: 'TFC-500', aplicacao: 'Ventilador centrífugo in-line', rede: 'insuflacao', Q_nom: 900, dP_nom: 480, rpm_max: 1900, P_max: 450, eta_max: 0.63, pontos: [{Q:0,dP:800},{Q:200,dP:750},{Q:400,dP:670},{Q:600,dP:580},{Q:900,dP:480},{Q:1150,dP:360},{Q:1400,dP:230},{Q:1650,dP:100},{Q:1800,dP:0}] },
    { fabricante: 'Sistemair', serie: 'MC', modelo: 'MC-500', aplicacao: 'Ventilador modular compacto', rede: 'extracao', Q_nom: 550, dP_nom: 420, rpm_max: 2100, P_max: 260, eta_max: 0.58, pontos: [{Q:0,dP:680},{Q:120,dP:640},{Q:240,dP:570},{Q:360,dP:490},{Q:550,dP:420},{Q:690,dP:320},{Q:830,dP:210},{Q:970,dP:90},{Q:1100,dP:0}] }
  ],

  tiposProduto: ['Difusor', 'Grelha Insuflação', 'Grelha Extração', 'Difusor Linear', 'Jato de Ar', 'Válvula', 'Boca de Extração', 'Fresta sob Porta', 'Grelha de Transferência', 'Vão de Passagem', 'Abertura Natural'],

  terminais: [
    { tipo: 'Difusor', fabricantes: [
      { nome: 'SODECA', real: true, familias: [{ nome: 'DR50', tamanhos: [
        { nome: 'Ø150', diametro: 150, Qmin: 150, Qmax: 350, curvaDP: [{Q:150,dP:12},{Q:200,dP:16},{Q:250,dP:24},{Q:300,dP:32},{Q:350,dP:42}], curvaLw: [{Q:150,Lw:24},{Q:250,Lw:30},{Q:350,Lw:36}], curvaThrow: [{Q:150,throw:2},{Q:350,throw:3.5}] },
        { nome: 'Ø200', diametro: 200, Qmin: 250, Qmax: 600, curvaDP: [{Q:250,dP:15},{Q:330,dP:20},{Q:400,dP:28},{Q:500,dP:42},{Q:600,dP:58}], curvaLw: [{Q:250,Lw:26},{Q:400,Lw:32},{Q:600,Lw:38}], curvaThrow: [{Q:250,throw:2.5},{Q:600,throw:4.5}] },
        { nome: 'Ø250', diametro: 250, Qmin: 400, Qmax: 900, curvaDP: [{Q:400,dP:18},{Q:520,dP:24},{Q:600,dP:32},{Q:750,dP:48},{Q:900,dP:68}], curvaLw: [{Q:400,Lw:28},{Q:600,Lw:34},{Q:900,Lw:40}], curvaThrow: [{Q:400,throw:3},{Q:900,throw:5.5}] },
        { nome: 'Ø315', diametro: 315, Qmin: 600, Qmax: 1400, curvaDP: [{Q:600,dP:20},{Q:780,dP:28},{Q:900,dP:38},{Q:1150,dP:56},{Q:1400,dP:82}], curvaLw: [{Q:600,Lw:30},{Q:900,Lw:36},{Q:1400,Lw:43}], curvaThrow: [{Q:600,throw:3.5},{Q:1400,throw:6.5}] }
      ] }] },
      { nome: 'Zantia', real: true, familias: [{ nome: 'DQ3', tamanhos: [
        { nome: '6"x6"', diametro: 150, Qmin: 120, Qmax: 300, curvaDP: [{Q:120,dP:10},{Q:150,dP:14},{Q:200,dP:22},{Q:250,dP:32},{Q:300,dP:45}], curvaLw: [{Q:120,Lw:22},{Q:200,Lw:28},{Q:300,Lw:34}], curvaThrow: [{Q:120,throw:1.8},{Q:300,throw:3.2}] },
        { nome: '12"x12"', diametro: 300, Qmin: 400, Qmax: 1200, curvaDP: [{Q:400,dP:14},{Q:600,dP:22},{Q:800,dP:32},{Q:1000,dP:48},{Q:1200,dP:68}], curvaLw: [{Q:400,Lw:26},{Q:800,Lw:34},{Q:1200,Lw:40}], curvaThrow: [{Q:400,throw:2.8},{Q:1200,throw:5.5}] },
        { nome: '24"x24"', diametro: 600, Qmin: 1200, Qmax: 3000, curvaDP: [{Q:1200,dP:18},{Q:1600,dP:28},{Q:2000,dP:42},{Q:2500,dP:64},{Q:3000,dP:95}], curvaLw: [{Q:1200,Lw:30},{Q:2000,Lw:38},{Q:3000,Lw:44}], curvaThrow: [{Q:1200,throw:3.5},{Q:3000,throw:7}] }
      ] }] }
    ] },
    { tipo: 'Grelha Insuflação', fabricantes: [
      { nome: 'SODECA', real: true, familias: [{ nome: 'GRI', tamanhos: [
        { nome: '200×100', Qmin: 100, Qmax: 300, curvaDP: [{Q:100,dP:8},{Q:150,dP:12},{Q:200,dP:20},{Q:250,dP:30},{Q:300,dP:42}], curvaLw: [{Q:100,Lw:20},{Q:200,Lw:26},{Q:300,Lw:32}], curvaThrow: [{Q:100,throw:1.5},{Q:300,throw:3}] },
        { nome: '400×200', Qmin: 300, Qmax: 900, curvaDP: [{Q:300,dP:12},{Q:450,dP:18},{Q:600,dP:28},{Q:750,dP:42},{Q:900,dP:58}], curvaLw: [{Q:300,Lw:24},{Q:600,Lw:32},{Q:900,Lw:38}], curvaThrow: [{Q:300,throw:2.5},{Q:900,throw:5}] }
      ] }] },
      { nome: 'Lindab', real: true, familias: [{ nome: 'GRC', tamanhos: [
        { nome: '300×150', Qmin: 200, Qmax: 600, curvaDP: [{Q:200,dP:10},{Q:300,dP:16},{Q:400,dP:24},{Q:500,dP:36},{Q:600,dP:48}], curvaLw: [{Q:200,Lw:22},{Q:400,Lw:28},{Q:600,Lw:34}], curvaThrow: [{Q:200,throw:2},{Q:600,throw:4}] },
        { nome: '500×250', Qmin: 500, Qmax: 1500, curvaDP: [{Q:500,dP:14},{Q:750,dP:22},{Q:1000,dP:32},{Q:1250,dP:48},{Q:1500,dP:68}], curvaLw: [{Q:500,Lw:26},{Q:1000,Lw:34},{Q:1500,Lw:40}], curvaThrow: [{Q:500,throw:3},{Q:1500,throw:6}] }
      ] }] }
    ] },
    { tipo: 'Grelha Extração', fabricantes: [
      { nome: 'Trox', real: true, familias: [{ nome: 'ASL', tamanhos: [
        { nome: '225×125', Qmin: 80, Qmax: 350, curvaDP: [{Q:80,dP:12},{Q:150,dP:18},{Q:180,dP:24},{Q:250,dP:40},{Q:350,dP:60}], curvaLw: [{Q:80,Lw:22},{Q:180,Lw:28},{Q:350,Lw:36}], curvaThrow: [{Q:80,throw:2.5},{Q:350,throw:5.2}] },
        { nome: '325×175', Qmin: 200, Qmax: 700, curvaDP: [{Q:200,dP:14},{Q:300,dP:22},{Q:400,dP:30},{Q:550,dP:48},{Q:700,dP:72}], curvaLw: [{Q:200,Lw:24},{Q:400,Lw:30},{Q:700,Lw:38}], curvaThrow: [{Q:200,throw:3},{Q:700,throw:5.8}] }
      ] }] },
      { nome: 'SODECA', real: true, familias: [{ nome: 'GRE', tamanhos: [
        { nome: '200×100', Qmin: 100, Qmax: 350, curvaDP: [{Q:100,dP:10},{Q:150,dP:15},{Q:200,dP:22},{Q:280,dP:36},{Q:350,dP:52}], curvaLw: [{Q:100,Lw:22},{Q:200,Lw:28},{Q:350,Lw:35}], curvaThrow: [{Q:100,throw:1.8},{Q:350,throw:3.8}] },
        { nome: '400×200', Qmin: 300, Qmax: 1000, curvaDP: [{Q:300,dP:12},{Q:450,dP:18},{Q:600,dP:28},{Q:800,dP:46},{Q:1000,dP:72}], curvaLw: [{Q:300,Lw:24},{Q:600,Lw:32},{Q:1000,Lw:40}], curvaThrow: [{Q:300,throw:2.5},{Q:1000,throw:5.5}] }
      ] }] }
    ] },
    { tipo: 'Difusor Linear', fabricantes: [
      { nome: 'Zantia', real: true, familias: [{ nome: 'DL', tamanhos: [
        { nome: '1x1000', Qmin: 100, Qmax: 350, curvaDP: [{Q:100,dP:8},{Q:150,dP:12},{Q:200,dP:20},{Q:280,dP:32},{Q:350,dP:45}], curvaLw: [{Q:100,Lw:20},{Q:200,Lw:26},{Q:350,Lw:32}], curvaThrow: [{Q:100,throw:2},{Q:350,throw:4.5}] },
        { nome: '2x1500', Qmin: 300, Qmax: 900, curvaDP: [{Q:300,dP:10},{Q:450,dP:16},{Q:600,dP:26},{Q:750,dP:40},{Q:900,dP:58}], curvaLw: [{Q:300,Lw:24},{Q:600,Lw:32},{Q:900,Lw:38}], curvaThrow: [{Q:300,throw:3},{Q:900,throw:6.5}] }
      ] }] }
    ] },
    { tipo: 'Jato de Ar', fabricantes: [
      { nome: 'Trox', real: true, familias: [{ nome: 'JZ', tamanhos: [
        { nome: 'DN160', diametro: 160, Qmin: 200, Qmax: 700, curvaDP: [{Q:200,dP:18},{Q:300,dP:28},{Q:400,dP:42},{Q:550,dP:75},{Q:700,dP:110}], curvaLw: [{Q:200,Lw:28},{Q:400,Lw:36},{Q:700,Lw:44}], curvaThrow: [{Q:200,throw:5},{Q:700,throw:12}] },
        { nome: 'DN250', diametro: 250, Qmin: 600, Qmax: 2000, curvaDP: [{Q:600,dP:22},{Q:900,dP:35},{Q:1200,dP:55},{Q:1600,dP:95},{Q:2000,dP:140}], curvaLw: [{Q:600,Lw:32},{Q:1200,Lw:40},{Q:2000,Lw:48}], curvaThrow: [{Q:600,throw:8},{Q:2000,throw:20}] }
      ] }] }
    ] },
    { tipo: 'Válvula', fabricantes: [
      { nome: 'Trox', real: true, familias: [{ nome: 'LVS', tamanhos: [
        { nome: 'DN100', diametro: 100, Qmin: 20, Qmax: 100, curvaDP: [{Q:20,dP:15},{Q:40,dP:35},{Q:60,dP:65},{Q:80,dP:95},{Q:100,dP:130}], curvaLw: [{Q:20,Lw:22},{Q:60,Lw:32},{Q:100,Lw:40}], curvaThrow: [{Q:20,throw:1},{Q:100,throw:2.5}] },
        { nome: 'DN200', diametro: 200, Qmin: 80, Qmax: 400, curvaDP: [{Q:80,dP:20},{Q:160,dP:45},{Q:240,dP:80},{Q:320,dP:120},{Q:400,dP:160}], curvaLw: [{Q:80,Lw:28},{Q:240,Lw:38},{Q:400,Lw:46}], curvaThrow: [{Q:80,throw:1.8},{Q:400,throw:4.5}] }
      ] }] }
    ] },
    { tipo: 'Boca de Extração', fabricantes: [
      { nome: 'SODECA', real: true, familias: [{ nome: 'BEX', tamanhos: [
        { nome: 'Ø100', diametro: 100, Qmin: 50, Qmax: 200, curvaDP: [{Q:50,dP:10},{Q:80,dP:18},{Q:120,dP:32},{Q:160,dP:52},{Q:200,dP:75}], curvaLw: [{Q:50,Lw:22},{Q:120,Lw:28},{Q:200,Lw:35}], curvaThrow: [{Q:50,throw:1},{Q:200,throw:2.5}] },
        { nome: 'Ø160', diametro: 160, Qmin: 150, Qmax: 500, curvaDP: [{Q:150,dP:14},{Q:220,dP:24},{Q:300,dP:38},{Q:400,dP:60},{Q:500,dP:88}], curvaLw: [{Q:150,Lw:26},{Q:300,Lw:32},{Q:500,Lw:39}], curvaThrow: [{Q:150,throw:1.8},{Q:500,throw:4}] }
      ] }] }
    ] },
    // ── P16: Novos tipos de produto ──
    { tipo: 'Fresta sob Porta', fabricantes: [
      { nome: 'Genérico', real: false, familias: [{ nome: 'Fresta', tamanhos: [
        { nome: '1cm', Qmin: 0, Qmax: 200, curvaDP: [{Q:20,dP:1},{Q:50,dP:2},{Q:100,dP:3},{Q:150,dP:5},{Q:200,dP:8}], curvaLw: [{Q:20,Lw:15},{Q:100,Lw:20},{Q:200,Lw:25}], curvaThrow: [{Q:20,throw:0.5},{Q:200,throw:1.5}] }
      ] }] }
    ] },
    { tipo: 'Grelha de Transferência', fabricantes: [
      { nome: 'Genérico', real: false, familias: [{ nome: 'Transf', tamanhos: [
        { nome: '300×150', Qmin: 0, Qmax: 500, curvaDP: [{Q:50,dP:1},{Q:150,dP:2},{Q:300,dP:4},{Q:400,dP:6},{Q:500,dP:9}], curvaLw: [{Q:50,Lw:18},{Q:300,Lw:24},{Q:500,Lw:30}], curvaThrow: [{Q:50,throw:1},{Q:500,throw:3}] }
      ] }] }
    ] },
    { tipo: 'Vão de Passagem', fabricantes: [
      { nome: 'Genérico', real: false, familias: [{ nome: 'Vão', tamanhos: [
        { nome: 'Padrão', Qmin: 0, Qmax: 2000, curvaDP: [{Q:100,dP:1},{Q:500,dP:1.5},{Q:1000,dP:2},{Q:1500,dP:3},{Q:2000,dP:4}], curvaLw: [{Q:100,Lw:10},{Q:1000,Lw:15},{Q:2000,Lw:20}], curvaThrow: [{Q:100,throw:1},{Q:2000,throw:5}] }
      ] }] }
    ] },
    { tipo: 'Abertura Natural', fabricantes: [
      { nome: 'Genérico', real: false, familias: [{ nome: 'Abertura', tamanhos: [
        { nome: 'Padrão', Qmin: 0, Qmax: 5000, curvaDP: [{Q:200,dP:0.5},{Q:1000,dP:1},{Q:2500,dP:2},{Q:4000,dP:3},{Q:5000,dP:5}], curvaLw: [{Q:200,Lw:5},{Q:2500,Lw:10},{Q:5000,Lw:15}], curvaThrow: [{Q:200,throw:1},{Q:5000,throw:10}] }
      ] }] }
    ] }
  ],

  // ── P18: Metodo de cálculo de throw com raiz quadrada ──
  calcularThrow(curvaThrow, Q) {
    if (!curvaThrow || curvaThrow.length < 2) return 0;
    const ref = curvaThrow[0];
    return ref.throw * Math.pow(Q / ref.Q, 0.5);
  }
};

console.log('%c[Base de Conhecimento V10.0.0 · catalogo.js] ' +
  VC._catalogo.curvas.length + ' curvas · ' +
  VC._catalogo.terminais.length + ' tipos de terminal · P16, P17, P18, P19 aplicados',
  'color:#7fa88b;font-weight:bold;background:#eef5f0;padding:3px 6px;border-radius:3px');

})();