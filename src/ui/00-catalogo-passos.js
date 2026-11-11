/* ============================================================
   VENTICONDUTAS · 00-catalogo-passos
   Define VC.passosCatalogo e VC.ui.renderSidebar
   ============================================================ */
(function () {
'use strict';
const VC = window.VC;
if (!VC) return;
VC._boot = VC._boot || { partes: [] };
VC._boot.partes.push('00-catalogo-passos');

VC.passosCatalogo = [
  { id: 'setup',         grupo: 'contexto',        grupoNome: '1 · Contexto',          titulo: 'Setup do Projeto',         sub: 'Tipologia · QAI · premissas ISA', icone: 'fa-gear' },
  { id: 'configuracoes', grupo: 'contexto',        grupoNome: '1 · Contexto',          titulo: 'Configurações',            sub: 'Flags · parâmetros',              icone: 'fa-sliders' },
  { id: 'levantamento',  grupo: 'inventario',      grupoNome: '2 · Inventário',        subgrupo: 'levantamento', subgrupoNome: 'Levantamento',  titulo: 'Levantamento de Espaços',  sub: 'Inventário físico',              icone: 'fa-list-check' },
  { id: 'classificacao', grupo: 'inventario',      grupoNome: '2 · Inventário',        subgrupo: 'caudais',      subgrupoNome: 'Caudais',       titulo: 'Caudal por Espaço',        sub: 'Q_normas · F-RPH · QAI',          icone: 'fa-tag' },
  { id: 'requisitos',    grupo: 'inventario',      grupoNome: '2 · Inventário',        subgrupo: 'caudais',      subgrupoNome: 'Caudais',       titulo: 'Definição de Terminais',   sub: 'Kanban por espaço',              icone: 'fa-list-check' },
  { id: 'terminais',     grupo: 'dimensionamento', grupoNome: '3 · Dimensionamento',   subgrupo: 'terminais',    subgrupoNome: 'Terminais',     titulo: 'Dimensionamento de Terminais', sub: 'Curvas de fabricantes',     icone: 'fa-wind' },
  { id: 'associacao',    grupo: 'dimensionamento', grupoNome: '3 · Dimensionamento',   subgrupo: 'ramais',       subgrupoNome: 'Ramais',        titulo: 'Topologia dos Ramais',     sub: 'N1 → N4',                        icone: 'fa-sitemap' },
  { id: 'rede',          grupo: 'dimensionamento', grupoNome: '3 · Dimensionamento',   subgrupo: 'ramais',       subgrupoNome: 'Ramais',        titulo: 'Dimensionamento de Condutas', sub: 'L · ζ · Ø · Δp',              icone: 'fa-ruler-combined' },
  { id: 'utas',          grupo: 'dimensionamento', grupoNome: '3 · Dimensionamento',   subgrupo: 'ventiladores', subgrupoNome: 'Ventiladores',  titulo: 'Dimensionamento de UTAs',  sub: 'SFPint · P motor',               icone: 'fa-fan' },
  { id: 'balanco',       grupo: 'verificacao',     grupoNome: '4 · Verificação',       titulo: 'Balanço de Ar',            sub: 'Σ Q_in = Σ Q_out',                icone: 'fa-scale-balanced' },
  { id: 'transferencias',grupo: 'verificacao',     grupoNome: '4 · Verificação',       titulo: 'Transferências',           sub: 'Frestas · grelhas',               icone: 'fa-arrow-right-arrow-left' },
  { id: 'otimizacao',    grupo: 'verificacao',     grupoNome: '4 · Verificação',       titulo: 'Optimização',              sub: 'R = 1 Pa/m',                      icone: 'fa-wand-magic-sparkles' },
  { id: 'normativa',     grupo: 'verificacao',     grupoNome: '4 · Verificação',       titulo: 'Verificação Normativa',    sub: 'P138 · EN 16798',                 icone: 'fa-scale-balanced' },
  { id: 'diagnostico',   grupo: 'verificacao',     grupoNome: '4 · Verificação',       titulo: 'Diagnóstico',              sub: '109 testes',                      icone: 'fa-vial' },
  { id: 'relatorios',    grupo: 'entrega',         grupoNome: '5 · Entrega',           titulo: 'Relatórios',               sub: '15 relatórios',                   icone: 'fa-file-lines' },
  { id: 'caderno',       grupo: 'entrega',         grupoNome: '5 · Entrega',           titulo: 'Caderno de Encargos',      sub: '14 secções',                      icone: 'fa-clipboard' }
];

VC.ui = VC.ui || {};
VC.ui.renderSidebar = function () {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  const grupos = {};
  VC.passosCatalogo.forEach(p => {
    if (!grupos[p.grupo]) grupos[p.grupo] = { nome: p.grupoNome, subgrupos: {}, passos: [] };
    if (p.subgrupo) {
      if (!grupos[p.grupo].subgrupos[p.subgrupo]) grupos[p.grupo].subgrupos[p.subgrupo] = { nome: p.subgrupoNome, passos: [] };
      grupos[p.grupo].subgrupos[p.subgrupo].passos.push(p);
    } else {
      grupos[p.grupo].passos.push(p);
    }
  });
  let h = '';
  Object.keys(grupos).forEach(gk => {
    const g = grupos[gk];
    h += '<div class="grupo-sidebar" data-fase="' + gk + '"><div class="grupo-titulo">' + VC.utils.esc(g.nome) + '</div>';
    g.passos.forEach(p => { h += renderBtn(p); });
    Object.keys(g.subgrupos).forEach(sk => {
      const sg = g.subgrupos[sk];
      h += '<div class="subgrupo-sidebar" data-sub="' + sk + '"><div class="subgrupo-titulo"><span class="subgrupo-num">' + sg.passos.length + '</span> ' + VC.utils.esc(sg.nome) + '</div>';
      sg.passos.forEach(p => { h += renderBtn(p); });
      h += '</div>';
    });
    h += '</div>';
  });
  sidebar.innerHTML = h;
  function renderBtn(p) {
    let estObj = { estado: 'vazio', n: 0, resumo: '' };
    if (VC.ui.estadoPasso && typeof VC.ui.estadoPasso === 'function') {
      const res = VC.ui.estadoPasso(p.id);
      if (typeof res === 'object' && res !== null) estObj = res;
      else estObj.estado = res;
    }
    const ativo = VC._passoAtivo === p.id ? ' ativo' : '';
    
    let badge = '';
    if (estObj.resumo) {
      const cor = estObj.estado === 'atencao' ? '#d97706' : '#3b82f6'; /* Amarelo escuro ou Azul */
      const bg = estObj.estado === 'atencao' ? '#fef3c7' : '#dbeafe'; /* Fundo amarelo claro ou azul claro */
      badge = `<span style="font-size:9px; margin-left:4px; padding:1px 4px; border-radius:4px; font-weight:800; color:${cor}; background:${bg}; border:1px solid ${cor}40;">${estObj.resumo}</span>`;
    }

    return '<button class="passo-btn' + ativo + '" data-passo="' + p.id + '" data-fase="' + p.grupo + '" onclick="VC.ui.setPasso(\'' + p.id + '\')">'
      + '<div class="passo-icone"><i class="fa-solid ' + p.icone + '"></i></div>'
      + '<div class="passo-corpo" style="overflow:hidden;"><div class="passo-nome" style="display:flex; align-items:center; justify-content:space-between; width:100%;"><span>' + VC.utils.esc(p.titulo) + '</span>' + badge + '</div>'
      + '<div class="passo-sub">' + VC.utils.esc(p.sub || '') + '</div></div>'
      + '<div class="passo-estado ' + estObj.estado + '"></div>'
      + '</button>';
  }
};

console.log('%c[VentiCondutas] 00-catalogo-passos carregado · ' + VC.passosCatalogo.length + ' passos · sidebar com contadores',
  'color:#6d8fb0;font-weight:bold;background:#eaf1f7;padding:3px 6px;border-radius:3px');
})();