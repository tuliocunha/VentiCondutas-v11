/* ============================================================
   VENTCONDUTAS V9.3.0 · 14-componentes-ui
   Camada de componentes UI · 6 componentes + auditoria

   PATCH 1.2 · Correção das variáveis CSS do componente feedback
   - Antes usava --ok-soft/--ok/--ok-esc (não existiam)
   - Agora usa --verde-soft/--verde/--verde-esc (existem)
   - Mesmo para atencao (--ambar-*) e erro (--coral-*)

   COMPONENTES:
   - grandeza(valor, unidade, opcoes)   → O2.1
   - simbolo(chave, valorAtual, opcoes) → O3.1, O3.2, O3.3
   - calculo(estrutura)                  → O2.2, O2.3
   - cadeia(nos, opcoes)                 → O4.1, O4.2, O4.3, O4.4
   - feedback(texto, tipo, acao)         → O1.3, O5.1, O5.3
   - painel(titulo, familia, conteudo)   → O6.1, O6.2

   DEPENDE DE: 01-fundamentos.js (VC.utils) + conhecimento/tooltips.js
   ============================================================ */
(function () {
'use strict';
const VC = window.VC;
if (!VC) { console.error('[14-componentes-ui] window.VC ausente'); return; }
VC._boot = VC._boot || { partes: [] };
VC._boot.partes.push('14-componentes-ui');

/* ============================================================
   FLAG dev (aditiva, não altera 01-fundamentos)
   ============================================================ */
VC.flags = VC.flags || {};
if (VC.flags.dev === undefined) VC.flags.dev = false;

/* ============================================================
   AUDITORIA
   ============================================================ */
VC.auditoria = VC.auditoria || {
  _registos: [],

  registar(tipo, contexto, detalhe) {
    if (!VC.flags || !VC.flags.dev) return;
    this._registos.push({
      tipo: tipo,
      contexto: contexto || '',
      detalhe: detalhe || '',
      t: new Date().toISOString()
    });
    if (this._registos.length > 500) this._registos.shift();
  },

  relatorio() {
    const porTipo = {};
    this._registos.forEach(r => {
      if (!porTipo[r.tipo]) porTipo[r.tipo] = [];
      porTipo[r.tipo].push(r);
    });
    return {
      total: this._registos.length,
      porTipo: porTipo,
      registos: this._registos.slice()
    };
  },

  limpar() {
    this._registos = [];
  }
};

/* ============================================================
   HELPERS INTERNOS
   ============================================================ */
const _esc = function (v) {
  return VC.utils && VC.utils.esc ? VC.utils.esc(v) : String(v == null ? '' : v);
};
const _fmt = function (v, d) {
  return VC.utils && VC.utils.fmt ? VC.utils.fmt(v, d) : String(v);
};

const _UNIDADES_VALIDAS = {
  'm³/h': true, 'm³/s': true, 'm³': true, 'm²': true,
  'm': true, 'mm': true, 'Pa': true, 'kPa': true,
  'm/s': true, 'kg/m³': true, 'm²/s': true,
  'W': true, 'kW': true, 'W/(m³/s)': true,
  'h⁻¹': true, '%': true, 'dB': true,
  'm³/(h·pessoa)': true, 'm³/(h·m²)': true,
  'pessoa': true, 'pessoas': true, 'un.': true,
  '°C': true, 'K': true, 'RH%': true,
  '': true, '—': true
};

const _FAMILIAS_COR = {
  raciocinio: {
    fundo: 'var(--primario-soft)',
    borda: 'var(--primario)',
    texto: 'var(--primario-esc)',
    destaque: 'var(--primario)'
  },
  juizo: {
    fundo: 'var(--superf2)',
    borda: 'var(--borda-media)',
    texto: 'var(--texto)',
    destaque: 'var(--primario)'
  }
};

/* Mapa de tipo de feedback → variáveis CSS corretas */
const _CORES_FEEDBACK = {
  ok:      { soft: '--verde-soft',  cor: '--verde',  esc: '--verde-esc' },
  atencao: { soft: '--ambar-soft',  cor: '--ambar',  esc: '--ambar-esc' },
  erro:    { soft: '--coral-soft',  cor: '--coral',  esc: '--coral-esc' },
  info:    { soft: '--primario-soft', cor: '--primario', esc: '--primario-esc' }
};

/* ============================================================
   1 · GRANDEZA (O2.1)
   ============================================================ */
VC.ui = VC.ui || {};
VC.ui.comp = VC.ui.comp || {};

VC.ui.comp.grandeza = function (valor, unidade, opcoes) {
  opcoes = opcoes || {};
  const decimais = (opcoes.decimais === undefined) ? 0 : opcoes.decimais;
  const destaque = opcoes.destaque === true;
  const grande = opcoes.grande === true;
  const cor = opcoes.cor || null;

  if (!unidade || !_UNIDADES_VALIDAS[unidade]) {
    VC.auditoria.registar('O2.1', 'grandeza', {
      valor: valor,
      unidade: unidade,
      motivo: !unidade ? 'unidade em falta' : 'unidade desconhecida'
    });
    if (VC.flags.dev) {
      console.warn('[grandeza] Unidade inválida:', unidade, '· valor:', valor);
    }
  }

  const unidadeFinal = unidade || '—';
  const valorTxt = (typeof valor === 'number' && isFinite(valor))
    ? _fmt(valor, decimais)
    : String(valor == null ? '—' : valor);

  const styleValor = [
    'font-family:ui-monospace,monospace',
    'font-weight:' + (grande ? '900' : '800'),
    'font-size:' + (grande ? '16px' : '12px'),
    'color:' + (cor || (destaque ? 'var(--primario-esc)' : 'var(--texto)')),
    'line-height:1.2'
  ].join(';');

  const styleUnidade = [
    'font-size:' + (grande ? '11px' : '10px'),
    'color:var(--texto-suave)',
    'font-weight:600',
    'margin-left:3px',
    'font-family:\'Segoe UI\',Arial,sans-serif'
  ].join(';');

  const bg = destaque ? 'background:var(--primario-soft);padding:2px 7px;border-radius:4px;display:inline-block' : 'display:inline-block';

  return '<span class="vc-grandeza" style="' + bg + '">' +
    '<span class="vc-grandeza-valor" style="' + styleValor + '">' + _esc(valorTxt) + '</span>' +
    '<span class="vc-grandeza-unidade" style="' + styleUnidade + '">' + _esc(unidadeFinal) + '</span>' +
    '</span>';
};

/* ============================================================
   2 · SÍMBOLO (O3.1, O3.2, O3.3)
   ============================================================ */
VC.ui.comp.simbolo = function (chave, valorAtual, opcoes) {
  opcoes = opcoes || {};
  const familia = opcoes.familia || 'raciocinio';
  const cores = _FAMILIAS_COR[familia] || _FAMILIAS_COR.raciocinio;
  const dicionario = (VC.conhecimento && VC.conhecimento.tooltips) || {};
  const info = dicionario[chave];

  if (!info) {
    VC.auditoria.registar('O3.1', 'simbolo', { chave: chave, motivo: 'não encontrado no dicionário' });
    if (VC.flags.dev) console.warn('[simbolo] Símbolo não encontrado:', chave);
  }

  const titulo = (info && info.titulo) || chave;
  const unidade = (info && info.unidade) || '';
  const desc = (info && info.desc) || '';
  const norma = (info && info.norma) || '';
  const valorTxt = (valorAtual !== undefined && valorAtual !== null)
    ? ' · valor atual: ' + _fmt(valorAtual, 2) + (unidade ? ' ' + unidade : '')
    : '';

  const popoverHtml = '<span class="vc-simbolo-popover" style="' +
    'position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);' +
    'background:var(--tt-bg);color:var(--tt-cor);' +
    'border:1px solid ' + cores.destaque + ';' +
    'border-radius:6px;padding:8px 12px;font-size:11px;line-height:1.5;' +
    'white-space:nowrap;box-shadow:0 6px 20px rgba(0,0,0,.2);' +
    'z-index:100;pointer-events:none;opacity:0;transition:opacity .15s;' +
    'font-family:\'Segoe UI\',Arial,sans-serif;font-weight:400;text-align:left' +
    '">' +
    '<b style="color:' + cores.destaque + ';font-weight:900">' + _esc(titulo) + '</b>' +
    (unidade ? ' <span style="color:#86efac;font-family:ui-monospace,monospace;font-size:10px;font-weight:800">[' + _esc(unidade) + ']</span>' : '') +
    (desc ? '<br><span style="color:#e2e8f0">' + _esc(desc) + '</span>' : '') +
    (valorTxt ? '<br><span style="color:' + cores.destaque + ';font-weight:800">' + _esc(valorTxt) + '</span>' : '') +
    (norma ? '<br><span style="color:#86efac;font-size:10px;font-weight:800">' + _esc(norma) + '</span>' : '') +
    '</span>';

  const styleSimbolo = [
    'border-bottom:1.5px dotted ' + cores.destaque,
    'cursor:help',
    'position:relative',
    'font-weight:800',
    'color:' + cores.destaque,
    'display:inline-block'
  ].join(';');

  return '<span class="vc-simbolo" data-simbolo="' + _esc(chave) + '" style="' + styleSimbolo + '">' +
    _esc(chave) +
    popoverHtml +
    '</span>';
};

/* ============================================================
   3 · CÁLCULO (O2.2, O2.3)
   ============================================================ */
VC.ui.comp.calculo = function (estrutura) {
  if (!estrutura || !estrutura.resultado) {
    VC.auditoria.registar('O2.2', 'calculo', { motivo: 'estrutura inválida' });
    return '<div class="vc-calculo" style="color:var(--texto-suave);font-style:italic;font-size:11px">Cálculo indisponível.</div>';
  }

  const fatores = estrutura.fatores || [];
  const ramos = estrutura.ramos || [];
  const resultado = estrutura.resultado;
  const operacao = estrutura.operacao || 'multiplicacao';
  const nota = estrutura.nota || '';

  let h = '<div class="vc-calculo" style="background:var(--superf);border:1px solid var(--borda);border-radius:8px;padding:14px 16px;margin:8px 0">';

  if (ramos.length > 0 && operacao === 'max') {
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">';
    ramos.forEach(ramo => {
      const dominante = ramo.dominante === true;
      const bg = dominante ? 'var(--verde-soft)' : 'var(--superf2)';
      const borda = dominante ? 'var(--verde)' : 'var(--borda)';
      const corTxt = dominante ? 'var(--verde-esc)' : 'var(--texto-med)';
      h += '<div style="background:' + bg + ';border:1px solid ' + borda + ';border-radius:6px;padding:8px 10px;' + (dominante ? 'box-shadow:0 0 0 3px rgba(127,168,139,.15);' : '') + '">';
      h += '<div style="font-size:9.5px;font-weight:900;text-transform:uppercase;letter-spacing:.4px;color:' + corTxt + ';margin-bottom:4px;display:flex;justify-content:space-between">';
      h += '<span>' + _esc(ramo.label || '') + '</span>';
      if (dominante) h += '<span style="color:var(--verde-esc)"><i class=\'fa-solid fa-crown\' style="font-size:10px"></i> dominante</span>';
      h += '</div>';
      h += '<div style="font-family:ui-monospace,monospace;font-size:12px;color:' + corTxt + ';margin-bottom:3px">' + _esc(ramo.calculoTxt || '') + '</div>';
      h += '<div style="font-family:ui-monospace,monospace;font-size:16px;font-weight:900;color:' + (dominante ? 'var(--verde-esc)' : 'var(--texto)') + '">' + _fmt(ramo.valor, 0) + ' <span style="font-size:11px;font-weight:600;color:var(--texto-suave)">' + _esc(ramo.unidade || '') + '</span></div>';
      h += '</div>';
    });
    h += '</div>';
  } else if (fatores.length > 0) {
    h += '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:10px;padding:10px 12px;background:var(--superf2);border-radius:6px;border:1px solid var(--borda);font-family:ui-monospace,monospace;font-size:12.5px">';
    fatores.forEach((f, i) => {
      if (i > 0) {
        const op = operacao === 'divisao' ? '÷' : (operacao === 'soma' ? '+' : '×');
        h += '<span style="color:var(--primario-esc);font-weight:900">' + op + '</span>';
      }
      h += '<span style="display:inline-flex;align-items:baseline;gap:3px">';
      h += '<b style="color:var(--texto)">' + _fmt(f.valor, 2) + '</b>';
      h += '<span style="color:var(--texto-suave);font-size:10.5px;font-weight:600">' + _esc(f.unidade || '') + '</span>';
      h += '</span>';
    });
    h += '<span style="color:var(--primario-esc);font-weight:900;margin:0 4px">=</span>';
    h += '<span style="display:inline-flex;align-items:baseline;gap:3px">';
    h += '<b style="color:var(--primario-esc);font-size:14px">' + _fmt(resultado.valor, 0) + '</b>';
    h += '<span style="color:var(--primario-esc);font-size:10.5px;font-weight:800">' + _esc(resultado.unidade || '') + '</span>';
    h += '</span>';
    h += '</div>';
  }

  h += '<div style="background:var(--primario-esc);color:#fff;border-radius:6px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center">';
  h += '<span style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;opacity:.85">' + _esc(estrutura.tituloResultado || 'Resultado') + '</span>';
  h += '<span><span style="font-family:ui-monospace,monospace;font-size:20px;font-weight:900">' + _fmt(resultado.valor, 0) + '</span><span style="font-size:11px;opacity:.75;margin-left:4px">' + _esc(resultado.unidade || '') + '</span></span>';
  h += '</div>';

  if (nota) {
    h += '<div style="margin-top:10px;padding:8px 10px;background:var(--superf2);border-left:3px solid var(--primario);border-radius:4px;font-size:11px;color:var(--texto-med);line-height:1.5">' + _esc(nota) + '</div>';
  }

  h += '</div>';
  return h;
};

/* ============================================================
   4 · CADEIA (O4.1, O4.2, O4.3, O4.4)
   ============================================================ */
VC.ui.comp.cadeia = function (nos, opcoes) {
  opcoes = opcoes || {};
  const familia = opcoes.familia || 'raciocinio';
  const cores = _FAMILIAS_COR[familia] || _FAMILIAS_COR.raciocinio;

  if (!nos || !nos.length) {
    VC.auditoria.registar('O4.4', 'cadeia', { motivo: 'vazia' });
    return '<div class="vc-cadeia-vazia" style="padding:16px;text-align:center;background:var(--superf2);border:1px dashed var(--borda-media);border-radius:8px;color:var(--texto-suave);font-size:11.5px;line-height:1.6">' +
      '<i class="fa-solid fa-diagram-project" style="font-size:20px;opacity:.4;display:block;margin-bottom:8px"></i>' +
      '<div style="font-weight:800;color:var(--texto-med);margin-bottom:4px">Ainda sem dados na cadeia</div>' +
      '<div>' + _esc(opcoes.proximoPasso || 'Preenche os inputs para ver a cadeia de impacto.') + '</div>' +
      '</div>';
  }

  let h = '<div class="vc-cadeia" style="background:var(--superf);border:1px solid var(--borda);border-radius:8px;padding:14px 16px">';
  h += '<div style="font-size:10.5px;font-weight:900;text-transform:uppercase;letter-spacing:.4px;color:var(--texto-suave);margin-bottom:12px;display:flex;align-items:center;gap:6px">';
  h += '<i class="fa-solid fa-diagram-project" style="color:' + cores.destaque + '"></i> ' + _esc(opcoes.titulo || 'Cadeia de impacto');
  h += '</div>';

  nos.forEach((no, i) => {
    const mudou = no.delta === true;
    const bg = mudou ? 'var(--violeta-soft)' : 'transparent';
    const borda = mudou ? 'var(--violeta)' : 'transparent';
    const seta = i === 0 ? '→' : (no.operacao || '↓');

    h += '<div class="vc-cadeia-item" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:6px;margin-bottom:4px;background:' + bg + ';border-left:3px solid ' + borda + ';transition:background .3s">';
    h += '<span style="color:var(--texto-suave);font-size:10px;width:14px;text-align:center;font-weight:900">' + seta + '</span>';
    h += '<span style="font-weight:800;font-size:11.5px;color:var(--texto);flex:1">';
    if (no.simbolo) {
      h += VC.ui.comp.simbolo(no.simbolo, no.valor, { familia: familia });
    } else {
      h += _esc(no.nome || '');
    }
    h += '</span>';
    h += '<span style="font-family:ui-monospace,monospace;font-weight:900;font-size:12px;color:' + (mudou ? 'var(--violeta-esc)' : 'var(--primario-esc)') + '">';
    h += _fmt(no.valor, (no.decimais !== undefined ? no.decimais : 0));
    h += ' <span style="font-size:10px;font-weight:600;color:var(--texto-suave)">' + _esc(no.unidade || '') + '</span>';
    h += '</span>';
    if (no.estado) {
      const corEstado = no.estado === 'OK' ? 'verde' : (no.estado === 'ATENÇÃO' ? 'ambar' : 'coral');
      h += '<span style="font-size:9.5px;font-weight:900;padding:1px 7px;border-radius:10px;background:var(--' + corEstado + '-soft);color:var(--' + corEstado + '-esc);border:1px solid var(--' + corEstado + ')">' + _esc(no.estado) + '</span>';
    }
    if (no.acao) {
      h += '<button onclick="' + _esc(no.acao.onclick || '') + '" style="background:transparent;border:1px solid var(--borda-media);border-radius:4px;padding:2px 8px;font-size:10px;font-weight:800;color:var(--primario-esc);cursor:pointer;font-family:inherit">' + _esc(no.acao.label || 'Ver') + '</button>';
    }
    h += '</div>';
  });

  h += '</div>';
  return h;
};

/* ============================================================
   5 · FEEDBACK (O1.3, O5.1, O5.3) — CORRIGIDO NO PATCH 1.2
   ============================================================ */
VC.ui.comp.feedback = function (texto, tipo, acao) {
  tipo = tipo || 'info';
  if (!_CORES_FEEDBACK[tipo]) tipo = 'info';
  const cores = _CORES_FEEDBACK[tipo];

  const icones = {
    ok: 'fa-circle-check',
    atencao: 'fa-circle-exclamation',
    erro: 'fa-circle-xmark',
    info: 'fa-circle-info'
  };

  let h = '<div class="vc-feedback vc-feedback-' + tipo + '" style="display:flex;align-items:flex-start;gap:9px;padding:10px 14px;border-radius:6px;font-size:11.5px;line-height:1.5;background:var(' + cores.soft + ');border-left:3px solid var(' + cores.cor + ');color:var(' + cores.esc + ');margin:8px 0">';
  h += '<i class="fa-solid ' + icones[tipo] + '" style="font-size:13px;margin-top:1px;flex-shrink:0;color:var(' + cores.cor + ')"></i>';
  h += '<div style="flex:1"><span>' + _esc(texto) + '</span>';
  if (acao && acao.label) {
    h += ' <button onclick="' + _esc(acao.onclick || '') + '" style="background:transparent;border:1px solid currentColor;border-radius:4px;padding:1px 8px;font-size:10.5px;font-weight:800;color:inherit;cursor:pointer;font-family:inherit;margin-left:6px">' + _esc(acao.label) + '</button>';
  }
  h += '</div></div>';
  return h;
};

/* ============================================================
   6 · PAINEL (O6.1, O6.2)
   ============================================================ */
VC.ui.comp.painel = function (titulo, familia, conteudo, opcoes) {
  opcoes = opcoes || {};
  familia = familia || 'raciocinio';
  const cores = _FAMILIAS_COR[familia] || _FAMILIAS_COR.raciocinio;
  const icone = opcoes.icone || 'fa-circle-info';

  let h = '<div class="vc-painel vc-painel-' + familia + '" style="background:var(--superf);border:1px solid var(--borda);border-radius:10px;overflow:hidden;margin:10px 0">';
  h += '<div style="padding:10px 16px;background:' + cores.fundo + ';border-bottom:1px solid ' + cores.destaque + ';font-size:10.5px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;color:' + cores.texto + ';display:flex;align-items:center;gap:7px">';
  h += '<i class="fa-solid ' + _esc(icone) + '" style="color:' + cores.destaque + '"></i> ' + _esc(titulo);
  h += '</div>';
  h += '<div style="padding:14px 16px;font-size:12px;line-height:1.6;color:var(--texto)">' + conteudo + '</div>';
  h += '</div>';
  return h;
};

/* ============================================================
   API PÚBLICA
   ============================================================ */
VC.componentesUI = {
  versao: 'v9.3.0-patch1.2',
  componentes: ['grandeza', 'simbolo', 'calculo', 'cadeia', 'feedback', 'painel'],
  orientacoesCobertas: [
    'O1.3', 'O2.1', 'O2.2', 'O2.3',
    'O3.1', 'O3.2', 'O3.3',
    'O4.1', 'O4.2', 'O4.3', 'O4.4',
    'O5.1', 'O5.3',
    'O6.1', 'O6.2'
  ],
  auditoria: VC.auditoria
};

console.log(
  '%c[VentCondutas V11.0.0 · Patch 1.2] 14-componentes-ui carregado · 6 componentes · 15 orientações cobertas',
  'color:#6d8fb0;font-weight:bold;background:#eaf1f7;padding:3px 6px;border-radius:3px'
);

})();
