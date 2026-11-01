(function () {
'use strict';
window.VC = window.VC || {};
VC._contexto = VC._contexto || {};
VC._contexto.painelContexto = {
  setup: {
    conceito: '<b>Premissas Físicas do Ar:</b> Antes de dimensionar, é obrigatório definir as condições de contorno. A altitude dita a pressão atmosférica (ISO 2533). A temperatura e a humidade relativa definem a massa volúmica (<b>ρ</b>) e a viscosidade cinemática (<b>ν</b>).',
    uso: [
      { b: 'Altitude (z)', t: '→ Calcula a pressão ISA e afeta a densidade do ar.' },
      { b: 'Temperatura (T)', t: '→ Afeta o Reynolds e a perda de carga.' },
      { b: 'Humidade (RH)', t: '→ O vapor de água é mais leve que o ar seco.' },
      { b: 'Rugosidade (ε)', t: '→ Define o fator de atrito (f) na equação de Colebrook-White.' }
    ],
    formulas: [
      { t: 'Pressão Atmosférica (ISA)', e: 'p = p₀ · (1 − L·z/T₀)^(g/(R·L))', d: 'p₀ = 101325 Pa · L = 0,0065 K/m · g = 9,80665 m/s²', u: 'Pa' },
      { t: 'Massa Volúmica Ar Húmido', e: 'ρ = (p − p_v)/(R_d·T) + p_v/(R_v·T)', d: 'R_d = 287,058 J/(kg·K) (ar seco) · R_v = 461,495 (vapor)', u: 'kg/m³' }
    ],
    legenda: ['rho', 'nu', 'T', 'RH', 'eps']
  },
  levantamento: {
    conceito: '<b>Inventário Físico:</b> O modelo é <i>bottom-up</i>. Tudo começa no espaço. A geometria (Área e Altura) define o Volume. A ocupação (N) é vital para o cálculo de caudal de ar novo.',
    uso: [
      { b: 'Área (A) + Altura (H)', t: '→ Volume (V) do espaço.' },
      { b: 'Ocupação (N)', t: '→ Usado na Tabela T11 (m³/h por pessoa).' },
      { b: 'Tipo de Espaço', t: '→ Define o Grupo (G1-G4) e as regras da P138.' }
    ],
    formulas: [
      { t: 'Volume do Espaço', e: 'V = A · H', d: 'Volume útil para renovação de ar', u: 'm³' },
      { t: 'Renovações por Hora (ACH)', e: 'ACH = Q / V', d: 'Critério de diluição basal', u: 'h⁻¹' }
    ],
    legenda: ['A', 'H', 'V', 'N', 'Q', 'rphDefault', 'rphAplicado']
  },
  classificacao: {
    conceito: '<b>Portaria 138-I/2021:</b> O coração regulamentar. Calcula o caudal obrigatório (<b>Q_normas</b>) baseado nas Tabelas T11, T12 e T13. Somamos o <b>Q_ConTerm</b> (F-RPH) e o <b>QAI_projeto</b>.',
    uso: [
      { b: 'T11 · Ocupantes', t: '→ Caudal mínimo por pessoa.' },
      { b: 'T12 · Área', t: '→ Diluição por m² de área útil.' },
      { b: 'T13 · Extração', t: '→ Caudal dedicado para sanitários (G4).' },
      { b: 'RPH × V', t: '→ Caudal de conforto térmico.' }
    ],
    formulas: [
      { t: 'Q_normas (G1)', e: 'max(T11·N, T12·A) / ε_v', d: 'ε_v = Eficácia de remoção (default 1.0)', u: 'm³/h' },
      { t: 'Caudal Total', e: 'Q_total = Q_normas + Q_ConTerm + QAI', d: 'A soma que define o dimensionamento', u: 'm³/h' }
    ],
    legenda: ['Q_normas', 'Q_ConTerm', 'QAI_projeto', 'Q_total', 'T11', 'T12', 'T13', 'ACH']
  },
  requisitos: {
    conceito: '<b>Materialização:</b> Transforma o caudal (<b>Q_total</b>) em equipamentos físicos (Difusores, Grelhas). A cobertura deve ser entre 95% e 105%.',
    uso: [
      { b: 'Tipo de Terminal', t: '→ Define a curva de perda de carga e o nível sonoro.' },
      { b: 'Quantidade (N)', t: '→ Divide o Q_total (Q_un = Q_total / N).' }
    ],
    formulas: [
      { t: 'Caudal Unitário', e: 'Q_un = Q_total / N', d: 'Caudal que cada terminal vai debitar', u: 'm³/h' }
    ],
    legenda: ['Q', 'Q_total', 'Q_un']
  },
  terminais: {
    conceito: '<b>Catálogo e Dimensionamento:</b> Atribuição de fabricantes, famílias e tamanhos comerciais. O sistema cruza o caudal com as curvas de desempenho do fabricante para obter a perda de carga (Δp), nível sonoro (Lw) e alcance (throw).',
    uso: [
      { b: 'Fabricante / Modelo', t: '→ Define a curva real de desempenho.' },
      { b: 'Caudal (Q)', t: '→ Usado para interpolar a perda de carga e o ruído.' },
      { b: 'v_saida', t: '→ Velocidade de saída no terminal (limite VDI 2081).' }
    ],
    formulas: [
      { t: 'Interpolação Δp', e: 'Δp = interpolar(curvaDP, Q)', d: 'Perda de carga lida da curva do fabricante', u: 'Pa' },
      { t: 'Nível Sonoro', e: 'Lw = interpolar(curvaLw, Q)', d: 'Potência sonora do terminal', u: 'dB' }
    ],
    legenda: ['Q', 'v', 'dP', 'Q_un']
  },
  associacao: {
    conceito: '<b>Topologia dos Ramais:</b> Criação da árvore de condutas. Cada terminal é associado a um ramal (R1, R2, R3, R4). O caudal do ramal é a soma dos terminais que serve (bottom-up).',
    uso: [
      { b: 'Ramal Ref', t: '→ O ramal que alimenta o terminal.' },
      { b: 'Nível (R1-R4)', t: '→ Posição na hierarquia da rede.' },
      { b: 'Q do Ramal', t: '→ Soma dos caudais dos terminais associados.' }
    ],
    formulas: [
      { t: 'Caudal do Ramal', e: 'Q_ramal = Σ Q_terminais', d: 'Soma dos caudais de todos os terminais servidos', u: 'm³/h' }
    ],
    legenda: ['Q', 'D', 'L', 'v', 'Re', 'zeta']
  },
  balanco: {
    conceito: '<b>Conservação de Massa:</b> O ar que entra num espaço tem de ser igual ao que sai (Σ Q_in = Σ Q_out). A tolerância é ±5 m³/h. Desequilíbrios causam pressões relativas.',
    uso: [
      { b: 'Q_in / Q_out', t: '→ Caudais diretos de insuflação e extração.' },
      { b: 'Q_transf_in/out', t: '→ Ar que passa por frestas ou grelhas.' },
      { b: 'Resíduo (ΔQ)', t: '→ ΔQ > 0 (Sobrepressão) · ΔQ < 0 (Depressão).' }
    ],
    formulas: [
      { t: 'Resíduo de Balanço', e: 'ΔQ = (Q_in + Q_trf_in) − (Q_out + Q_trf_out)', d: 'Tolerância de ±5 m³/h', u: 'm³/h' }
    ],
    legenda: ['Qin', 'Qout', 'Qtrf', 'residuo', 'ctxBalancoAr']
  },
  transferencias: {
    conceito: '<b>Transferências entre Espaços:</b> Passagem de ar entre dois espaços através de frestas, grelhas ou aberturas. Fundamental para fechar o balanço de espaços G4 (sanitários, cozinhas) que só têm extração.',
    uso: [
      { b: 'Q_trf', t: '→ Caudal de ar que atravessa a abertura.' },
      { b: 'ΔP', t: '→ Diferencial de pressão entre os espaços.' },
      { b: 'Área', t: '→ Área livre necessária para a passagem do ar.' }
    ],
    formulas: [
      { t: 'Área de Transferência', e: 'A = Q / (0.36 · √ΔP)', d: 'A em cm², Q em m³/h, ΔP em Pa', u: 'cm²' }
    ],
    legenda: ['Q', 'dP', 'Qtrf', 'ctxTransferencia']
  },
  rede: {
    conceito: '<b>Hidráulica de Condutas:</b> Dimensionamento das secções para garantir que a velocidade (v) e a perda de carga unitária (R) fiquem dentro dos limites.',
    uso: [
      { b: 'Caudal (Q)', t: '→ Vem dos terminais. Define o diâmetro ideal.' },
      { b: 'Comprimento (L)', t: '→ Afeta a perda de carga linear.' },
      { b: 'Coeficiente (ζ)', t: '→ Perda de carga localizada (curvas, tês).' }
    ],
    formulas: [
      { t: 'Reynolds', e: 'Re = v · D / ν', d: 'Re > 4000 = Turbulento', u: '—' },
      { t: 'Darcy-Weisbach', e: 'Δp_lin = f · (L/D) · (ρ·v²/2)', d: 'Perda de carga por atrito', u: 'Pa' }
    ],
    legenda: ['Q', 'v', 'dP', 'D', 'L', 'Re', 'f', 'zeta', 'eps']
  },
  utas: {
    conceito: '<b>Ventiladores e UTAs:</b> A UTA tem de vencer a perda de carga do caminho mais desfavorável e a perda dos seus componentes internos. O indicador é o <b>SFPint</b>.',
    uso: [
      { b: 'Caminho Crítico', t: '→ Define a perda externa (Δp_ext).' },
      { b: 'Componentes', t: '→ Filtros sujos + Baterias = Perda interna (Δp_int).' }
    ],
    formulas: [
      { t: 'SFPint', e: 'SFPint = Δp_int / η_vent', d: 'Limite EN 16798-3: 1300 W/(m³/s)', u: 'W/(m³/s)' }
    ],
    legenda: ['Q', 'dP', 'P', 'sfp', 'eta', 'etaRec']
  },
  otimizacao: {
    conceito: '<b>Otimização da Rede:</b> Processo iterativo para ajustar o diâmetro (Ø) e o coeficiente de perda (ζ) de cada ramal, com o objetivo de equilibrar as perdas de carga e minimizar a potência do ventilador.',
    uso: [
      { b: 'R = 1 Pa/m', t: '→ Alvo de perda de carga unitária na Fase 1.' },
      { b: 'Limite de Velocidade', t: '→ Corrige ramais com v > 6 m/s.' }
    ],
    formulas: [
      { t: 'Perda Unitária Alvo (R)', e: 'R = f/D · (ρ·v²/2) = 1 Pa/m', d: 'Fase 1: ajuste do diâmetro para atingir este alvo.', u: 'Pa/m' }
    ],
    legenda: ['Q', 'v', 'dP', 'D', 'zeta']
  },
  normativa: {
    conceito: '<b>Verificação Normativa:</b> O sistema verifica automaticamente a conformidade do projeto com os limites legais e de referência, como os caudais mínimos da Portaria 138-I/2021 e o SFPint da EN 16798-3.',
    uso: [
      { b: 'Caudais Mínimos', t: '→ Verifica se Q_normas > 0 para espaços G1/G3.' },
      { b: 'SFPint', t: '→ Compara o SFPint com o limite de 1300 W/(m³/s).' }
    ],
    formulas: [],
    legenda: ['Q', 'sfp', 'v', 'ACH']
  },
  diagnostico: {
    conceito: '<b>Diagnóstico do Sistema:</b> Executa uma bateria de testes automáticos que validam a integridade dos dados, a consistência dos cálculos e a conformidade da interface.',
    uso: [
      { b: 'Testes de Física', t: '→ Validam as propriedades do ar e as equações de atrito.' },
      { b: 'Testes de Integração', t: '→ Garantem que todos os módulos comunicam corretamente.' }
    ],
    formulas: [],
    legenda: []
  },
  relatorios: {
    conceito: '<b>Entrega do Projeto:</b> Consolidação de todos os dados técnicos. Geração de documentos contratuais e mapas de quantidade.',
    uso: [
      { b: 'Relatórios', t: '→ Vistas consolidadas para revisão.' },
      { b: 'BOM', t: '→ Lista de materiais (metros de conduta).' }
    ],
    formulas: [],
    legenda: ['Q', 'Q_total', 'QAI_projeto']
  },
  caderno: {
    conceito: '<b>Caderno de Encargos:</b> Documento contratual que estabelece as condições técnicas para o fornecimento, instalação e comissionamento do sistema AVAC.',
    uso: [
      { b: 'Especificações', t: '→ Materiais, isolamentos, equipamentos.' },
      { b: 'Ensaios', t: '→ Comissionamento e comissionamento TAB.' }
    ],
    formulas: [],
    legenda: ['Q', 'rphAplicado', 'Q_ConTerm', 'QAI_projeto']
  },
  configuracoes: {
    conceito: '<b>Configurações:</b> Controla os módulos ativos e as premissas de cálculo. Flags como a Topologia Facetada ou o Cálculo de Conforto Térmico (F-RPH) podem ser ligados/desligados aqui.',
    uso: [
      { b: 'Flags', t: '→ Ativam ou desativam módulos.' },
      { b: 'Parâmetros Globais', t: '→ Definem o comportamento padrão do motor.' }
    ],
    formulas: [],
    legenda: []
  }
};
console.log('%c[V11.0.0] contexto.js carregado com 16 passos (100% reativo)', 'color:#7fa88b;font-weight:bold');
})();
