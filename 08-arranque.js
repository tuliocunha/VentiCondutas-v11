/* ============================================================
   VENTCONDUTAS V11.0.0 · 08-arranque
   Setup do Projeto - Versão com Engenharia Ativa + Topologia Fix + Cabecalho
   ============================================================ */
(function () {
'use strict';
const VC = window.VC;
window.VC6 = window.VC6 || {};
const VC6 = window.VC6;
if(!VC._boot.partes.includes('08-arranque')) VC._boot.partes.push('08-arranque');

VC.ui = VC.ui || {};

if (typeof VC.ui.renderSidebar !== 'function') {
  VC.ui.renderSidebar = function () {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    sidebar.innerHTML = '<div class="grupo-sidebar" data-fase="contexto"><div class="grupo-titulo">1 · Contexto</div><button class="passo-btn ativo" data-passo="setup" onclick="VC.ui.setPasso(\'setup\')"><div class="passo-icone"><i class="fa-solid fa-gear"></i></div><div class="passo-corpo"><div class="passo-nome">Setup do Projeto</div><div class="passo-sub">Tipologia · QAI · premissas ISA</div></div><div class="passo-estado ok"></div></button></div>';
  };
}

VC.grafoEstado = {
  condutas: { rot: { x: -0.30, y: 0.40 }, zoom: 0.55, offset: { x: 0, y: 0 }, arrastando: false, modoDrag: 'rotate', lastX: 0, lastY: 0, selecionado: null, filtro: 'tudo', canais: { volume: true, cor: true, borda: true, satur: true, arcos: true }, animacao: false },
  conceitual: { rot: { x: -0.30, y: 0.40 }, zoom: 0.55, offset: { x: 0, y: 0 }, arrastando: false, modoDrag: 'rotate', lastX: 0, lastY: 0, selecionado: null, filtro: 'tudo', canais: { volume: true, cor: true, borda: true, satur: true, arcos: true }, animacao: false }
};

const CAM = { dist: 3500, fov: 2000 };
VC.projetar = function (estado, x, y, z) {
  const x1 = x * Math.cos(estado.rot.y) - z * Math.sin(estado.rot.y);
  const z1 = x * Math.sin(estado.rot.y) + z * Math.cos(estado.rot.y);
  const y2 = y * Math.cos(estado.rot.x) - z1 * Math.sin(estado.rot.x);
  const z2 = y * Math.sin(estado.rot.x) + z1 * Math.cos(estado.rot.x);
  const fator = (CAM.fov / (CAM.dist + z2)) * estado.zoom;
  return { x: x1 * fator + estado.offset.x, y: y2 * fator + estado.offset.y, scale: fator, z: z2 };
};

VC.modeloGrafo = {
  construirCondutas() { console.log('Modelo grafo condutas'); },
  construirConceitual() { console.log('Modelo grafo conceitual'); }
};

VC.modos = VC.modos || {};
VC.modos.set = function (nome) {
  VC._modoAtivo = nome; 
  document.querySelectorAll('.modo-btn').forEach(b => b.classList.toggle('ativo', b.dataset.modo === nome)); 
  document.querySelectorAll('.modo-painel').forEach(p => p.classList.remove('ativo'));
  
  const mapa = { 'condutas': 'modo-condutas', 'construtor': 'modo-construtor', 'arvore': 'modo-arvore', 'grafico-condutas': 'modo-grafico-condutas', 'grafico-conceitual': 'modo-grafico-conceitual', 'diagrama-rede': 'modo-diagrama-rede', 'relatorios': 'modo-relatorios', 'setup': 'modo-setup' };
  const id = mapa[nome]; 
  
  if (id) { 
      const el = document.getElementById(id); 
      if (el) el.classList.add('ativo'); 
  }
  
  setTimeout(() => { 
      try { 
          if (nome === 'arvore') { if(VC.arvore) VC.arvore.render(); }
          else if (nome === 'construtor') { if (VC.topologia && VC.topologia.construtor) VC.topologia.construtor.render(); } 
          else if (nome === 'grafico-condutas') { if(VC.interacaoGrafo) VC.interacaoGrafo.ligar('condutas', 'grafoSVG-condutas'); if(VC.grafoCondutas) VC.grafoCondutas.render(); } 
          else if (nome === 'grafico-conceitual') { if(VC.interacaoGrafo) VC.interacaoGrafo.ligar('conceitual', 'grafoSVG-conceitual'); if(VC.grafoConceitual) VC.grafoConceitual.render(); } 
          else if (nome === 'diagrama-rede') { if (VC6.diagrama) VC6.diagrama.render(); } 
          else if (nome === 'relatorios') { if (VC.modoRelatorios && VC.modoRelatorios.render) VC.modoRelatorios.render(); } 
          else if (nome === 'setup') { 
              if (window.renderSetup) { 
                  const p = document.getElementById(id); 
                  if (p) { 
                      p.innerHTML = window.renderSetup(); 
                      if(VC.ui.atualizarCabecalhoV11) VC.ui.atualizarCabecalhoV11(p); 
                  } 
              } 
          }
          if (VC.tooltips) VC.tooltips.esconder(); 
      } catch (e) { 
          if (VC.debug) VC.debug.erro(e); else console.error(e);
      } 
  }, 60);
};

VC.ui.atualizarCabecalhoV11 = function(container) {
    if (!container) return;
    const oldHeader = container.querySelector('.v11-top-header');
    if(oldHeader) oldHeader.remove();

    const header = document.createElement('div');
    header.className = 'v11-top-header';
    header.innerHTML = '<div class="v11-header-content" style="display:flex; justify-content:space-between; align-items:flex-end; padding-bottom:12px; margin-bottom:24px; border-bottom:2px solid var(--borda);"><div><div style="font-size:11px; font-weight:800; color:var(--texto-med); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">1 · CONTEXTO</div><h2 style="font-size:20px; font-weight:800; color:var(--texto); margin:0;">Setup do Projeto</h2><div style="font-size:12px; color:var(--texto-suave); margin-top:2px;">Tipologia · QAI · premissas ISA</div></div></div>';
    container.insertBefore(header, container.firstChild);
};

VC.calculo = VC.calculo || {};
VC.calculo.sincronizarSetup = function() {
    const p = VC.dados.params;
    if(VC.perf && VC.perf.cacheFisica) VC.perf.cacheFisica.invalidar();
    const catMap = { 'I': {Rp: 10, Ra: 1.0}, 'II': {Rp: 7, Ra: 0.7}, 'III': {Rp: 4, Ra: 0.4}, 'IV': {Rp: 5.5, Ra: 0.55} };
    const pQAI = catMap[p.categoria] || {Rp: 7, Ra: 0.7}; 
    if(VC.dados.espacos) {
        VC.dados.espacos.forEach(e => {
            if (!['Sanitários', 'Cozinha', 'Garagem'].includes(e.tipo)) {
                e.Rp = pQAI.Rp;
                e.Ra = pQAI.Ra;
            }
        });
    }
};

window.renderSetup = function () {
  const p = VC.dados.params;
  
  p.altitude = p.altitude ?? 150;
  p.temperatura = p.temperatura ?? 22;
  p.humidade = p.humidade ?? 50;
  p.rugosidade = p.rugosidade ?? 0.15;
  p.categoria = p.categoria || 'II';
  
  VC.dados.eficaciaRemocao = VC.dados.eficaciaRemocao || 1.0;
  VC.dados.serieDiametros = VC.dados.serieDiametros || 'S1';
  VC.dados.metodoCalculo = VC.dados.metodoCalculo || { metodo: 'loss' };
  VC.dados.restricaoH = VC.dados.restricaoH || 250;
  VC.dados.tipologiaAtual = VC.dados.tipologiaAtual || 'comercio';

  let h = '<div style="display: grid; grid-template-columns: 1fr; gap: 24px; align-items: start;">';

  h += '<div style="background: var(--superf); border: 1px solid var(--borda); border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">';
  h += '<div style="display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 700; color: var(--texto); border-bottom: 1px solid var(--borda); padding-bottom: 12px; margin-bottom: 20px;"><i class="fa-solid fa-folder-open" style="color: var(--primario); font-size: 16px;"></i> Entrada de Dados e Resultados</div>';
  h += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">';
  h += '<div><label style="display:block; font-size:11px; font-weight:700; color:#64748b; margin-bottom:6px; text-transform:uppercase;">Nome do projeto</label><input value="' + VC.utils.esc(VC.dados.metadados.nome) + '" onchange="VC.dados.metadados.nome=this.value; VC.ui.renderSidebar();" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px;"></div>';
  h += '<div><label style="display:block; font-size:11px; font-weight:700; color:#64748b; margin-bottom:6px; text-transform:uppercase;">Cliente</label><input value="' + VC.utils.esc(VC.dados.metadados.cliente || '') + '" onchange="VC.dados.metadados.cliente=this.value" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px;"></div>';
  h += '<div><label style="display:block; font-size:11px; font-weight:700; color:#64748b; margin-bottom:6px; text-transform:uppercase;">Local</label><input value="' + VC.utils.esc(VC.dados.metadados.local || '') + '" onchange="VC.dados.metadados.local=this.value" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px;"></div>';
  h += '<div><label style="display:block; font-size:11px; font-weight:700; color:#64748b; margin-bottom:6px; text-transform:uppercase;">Autor</label><input value="' + VC.utils.esc(VC.dados.metadados.autor || '') + '" onchange="VC.dados.metadados.autor=this.value" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px;"></div>';
  h += '<div style="grid-column: 1 / -1;"><label style="display:block; font-size:11px; font-weight:700; color:#64748b; margin-bottom:6px; text-transform:uppercase;">Descrição</label><textarea rows="2" onchange="VC.dados.metadados.descricao=this.value" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; resize:vertical;">' + VC.utils.esc(VC.dados.metadados.descricao || '') + '</textarea></div>';
  h += '</div></div>';

  h += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">';

  h += '<div style="background: var(--superf); border: 1px solid var(--borda); border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">';
  h += '<div style="display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 700; color: var(--texto); border-bottom: 1px solid var(--borda); padding-bottom: 12px; margin-bottom: 20px;"><i class="fa-solid fa-cloud-sun" style="color: var(--primario); font-size: 16px;"></i> 1. Premissas Físicas</div>';
  h += '<p style="font-size:11px; color:#64748b; margin-bottom:12px; line-height:1.4;">Definem a densidade e viscosidade do ar. Afetam Colebrook-White e ventilador.</p>';
  h += '<div style="display: flex; flex-direction: column; gap: 12px;">';
  
  h += '<div><label style="display:flex; justify-content:space-between; font-size:11px; font-weight:700; color:#64748b; margin-bottom:4px; text-transform:uppercase;">Altitude (m) <span id="valAlt" style="color:#0f172a;">' + p.altitude + '</span></label>';
  h += '<input type="range" min="0" max="2000" step="10" value="' + p.altitude + '" style="width:100%;" oninput="document.getElementById(\'valAlt\').innerText=this.value;" onchange="VC.dados.params.altitude=VC.utils.num(this.value); VC.calculo.sincronizarSetup(); if(VC.estado) VC.estado.sincronizar();"></div>';
  
  h += '<div><label style="display:flex; justify-content:space-between; font-size:11px; font-weight:700; color:#64748b; margin-bottom:4px; text-transform:uppercase;">Temperatura (°C) <span id="valTemp" style="color:#0f172a;">' + p.temperatura + '</span></label>';
  h += '<input type="range" min="-10" max="50" step="1" value="' + p.temperatura + '" style="width:100%;" oninput="document.getElementById(\'valTemp\').innerText=this.value;" onchange="VC.dados.params.temperatura=VC.utils.num(this.value); VC.calculo.sincronizarSetup(); if(VC.estado) VC.estado.sincronizar();"></div>';
  
  h += '<div><label style="display:flex; justify-content:space-between; font-size:11px; font-weight:700; color:#64748b; margin-bottom:4px; text-transform:uppercase;">Humidade (%) <span id="valHum" style="color:#0f172a;">' + p.humidade + '</span></label>';
  h += '<input type="range" min="0" max="100" step="1" value="' + p.humidade + '" style="width:100%;" oninput="document.getElementById(\'valHum\').innerText=this.value;" onchange="VC.dados.params.humidade=VC.utils.num(this.value); VC.calculo.sincronizarSetup(); if(VC.estado) VC.estado.sincronizar();"></div>';
  
  h += '<div><label style="display:block; font-size:11px; font-weight:700; color:#64748b; margin-bottom:4px; text-transform:uppercase;">Rugosidade da Conduta ε (mm)</label>';
  h += '<input type="number" step="0.01" value="' + p.rugosidade + '" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; text-align:right;" onchange="VC.dados.params.rugosidade=VC.utils.num(this.value); VC.calculo.sincronizarSetup(); if(VC.estado) VC.estado.sincronizar();"></div>';
  
  h += '</div></div>';

  h += '<div style="background: var(--superf); border: 1px solid var(--borda); border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">';
  h += '<div style="display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 700; color: var(--texto); border-bottom: 1px solid var(--borda); padding-bottom: 12px; margin-bottom: 20px;"><i class="fa-solid fa-users-viewfinder" style="color: var(--primario); font-size: 16px;"></i> 2. Qualidade do Ar (QAI)</div>';
  h += '<p style="font-size:11px; color:#64748b; margin-bottom:12px; line-height:1.4;">EN 16798-1 e Portaria 138-I. Determinam caudais mínimos exigidos.</p>';
  h += '<div style="display: flex; flex-direction: column; gap: 16px;">';
  
  const optsCat = [{v:'I', l:'Cat I (Rp: 10.0 · Ra: 1.0)'}, {v:'II', l:'Cat II (Rp: 7.0 · Ra: 0.7)'}, {v:'III', l:'Cat III (Rp: 4.0 · Ra: 0.4)'}, {v:'IV', l:'Cat IV (Rp: 5.5 · Ra: 0.55)'}];
  h += '<div><label style="display:block; font-size:11px; font-weight:700; color:#64748b; margin-bottom:6px; text-transform:uppercase;">Categoria EN 16798-1</label>';
  h += '<select style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px;" onchange="VC.dados.params.categoria=this.value; VC.calculo.sincronizarSetup(); if(VC.estado) VC.estado.sincronizar();">';
  optsCat.forEach(o => { h += '<option value="' + o.v + '" ' + (p.categoria === o.v ? 'selected' : '') + '>' + o.l + '</option>'; });
  h += '</select></div>';
  
  h += '<div><label style="display:block; font-size:11px; font-weight:700; color:#64748b; margin-bottom:6px; text-transform:uppercase;">Eficácia de Remoção (εv)</label>';
  h += '<input type="number" step="0.1" min="0.1" value="' + VC.dados.eficaciaRemocao + '" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; text-align:right;" onchange="VC.dados.eficaciaRemocao=VC.utils.num(this.value); VC.calculo.sincronizarSetup(); if(VC.estado) VC.estado.sincronizar();">';
  h += '<small style="color:#94a3b8; font-size:10px;">Divide caudal P138-I. 1.0 = mistura perfeita.</small></div>';
  
  const optsTipo = [{v:'comercio', l:'Comércio e Serviços'}, {v:'residencial', l:'Residencial'}, {v:'saude', l:'Saúde / Hospitalar'}, {v:'industria', l:'Indústria'}];
  h += '<div><label style="display:block; font-size:11px; font-weight:700; color:#64748b; margin-bottom:6px; text-transform:uppercase;">Tipologia Base (Portaria 138-I)</label>';
  h += '<select style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px;" onchange="VC.dados.tipologiaAtual=this.value; VC.calculo.sincronizarSetup(); if(VC.estado) VC.estado.sincronizar();">';
  optsTipo.forEach(o => { h += '<option value="' + o.v + '" ' + (VC.dados.tipologiaAtual === o.v ? 'selected' : '') + '>' + o.l + '</option>'; });
  h += '</select></div>';
  
  h += '</div></div>';

  h += '<div style="background: var(--superf); border: 1px solid var(--borda); border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">';
  h += '<div style="display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 700; color: var(--texto); border-bottom: 1px solid var(--borda); padding-bottom: 12px; margin-bottom: 20px;"><i class="fa-solid fa-ruler-combined" style="color: var(--primario); font-size: 16px;"></i> 3. Dimensionamento Aeráulico</div>';
  h += '<p style="font-size:11px; color:#64748b; margin-bottom:12px; line-height:1.4;">Define como o motor seleciona os diâmetros e as secções retangulares (EN 1505 / EN 1506).</p>';
  h += '<div style="display: flex; flex-direction: column; gap: 16px;">';
  
  const optsSerie = [{v:'S1', l:'Série 1 (24 diâmetros)'}, {v:'S2', l:'Série 2 (14 diâmetros - Retrofit)'}];
  h += '<div><label style="display:block; font-size:11px; font-weight:700; color:#64748b; margin-bottom:6px; text-transform:uppercase;">Série EN 1506 (Circulares)</label>';
  h += '<select style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px;" onchange="VC.dados.serieDiametros=this.value; VC.calculo.sincronizarSetup(); if(VC.estado) VC.estado.sincronizar();">';
  optsSerie.forEach(o => { h += '<option value="' + o.v + '" ' + (VC.dados.serieDiametros === o.v ? 'selected' : '') + '>' + o.l + '</option>'; });
  h += '</select></div>';
  
  const optsMetodo = [{v:'loss', l:'Perda de Carga Constante (~1 Pa/m)'}, {v:'velocity', l:'Velocidade Máxima (<= 6 m/s)'}];
  h += '<div><label style="display:block; font-size:11px; font-weight:700; color:#64748b; margin-bottom:6px; text-transform:uppercase;">Método de Dimensionamento</label>';
  h += '<select style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px;" onchange="VC.dados.metodoCalculo = { metodo: this.value }; VC.calculo.sincronizarSetup(); if(VC.estado) VC.estado.sincronizar();">';
  optsMetodo.forEach(o => { h += '<option value="' + o.v + '" ' + (VC.dados.metodoCalculo.metodo === o.v ? 'selected' : '') + '>' + o.l + '</option>'; });
  h += '</select></div>';
  
  h += '<div><label style="display:block; font-size:11px; font-weight:700; color:#64748b; margin-bottom:6px; text-transform:uppercase;">Restrição de Altura no Teto (mm)</label>';
  h += '<input type="number" step="10" min="50" value="' + VC.dados.restricaoH + '" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; text-align:right;" onchange="VC.dados.restricaoH=VC.utils.num(this.value); VC.calculo.sincronizarSetup(); if(VC.estado) VC.estado.sincronizar();">';
  h += '<small style="color:#94a3b8; font-size:10px;">Limita a conduta retangular H_max (EN 1505).</small></div>';
  
  h += '</div></div>';

  h += '</div></div>';
  
  setTimeout(() => { if (typeof VC.ui.renderPainelInferior === 'function') VC.ui.renderPainelInferior('setup'); }, 100);
  
  return h;
};

VC.ui.renderPainelInferior = function(passoId) {
    const painel = document.getElementById('painel-inferior');
    if (!painel) return;

    if (passoId !== 'setup') {
         painel.innerHTML = '<div style="padding:16px; color:#64748b; font-size:12px; text-align:center;">Informação técnica para esta etapa será exibida aqui.</div>';
         return;
    }

    let h = '<div style="font-size: 13px; font-weight: 800; color: var(--primario); text-transform: uppercase; margin-bottom: 12px; border-bottom: 2px dashed var(--borda); padding-bottom: 6px;"><i class="fa-solid fa-circle-info"></i> Informação de Engenharia · Conceito · Legenda · Fórmulas · Normas</div>';
    
    h += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">';
    
    h += '<div style="background:#fff; border:1px solid var(--borda); border-radius:8px; padding:12px;">';
    h += '<div style="font-size:11px; font-weight:800; color:var(--primario); text-transform:uppercase; margin-bottom:8px; display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-lightbulb"></i> Conceito</div>';
    h += '<h4 style="font-size:13px; color:var(--texto); margin:0 0 6px 0;">⚙️ Dados Físicos e Classificação</h4>';
    h += '<p style="font-size:11px; color:var(--texto-med); line-height:1.5; margin:0;">Define as variáveis térmicas e higrométricas que afetam a densidade e viscosidade do ar. Estabelece a categoria de Qualidade do Ar (EN 16798-1) e as restrições mecânicas (EN 1506) aplicáveis ao dimensionamento da rede.</p>';
    h += '</div>';

    h += '<div style="background:#fff; border:1px solid var(--borda); border-radius:8px; padding:12px;">';
    h += '<div style="font-size:11px; font-weight:800; color:var(--primario); text-transform:uppercase; margin-bottom:8px; display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-bullseye"></i> Impacto no Cálculo</div>';
    h += '<p style="font-size:11px; color:var(--texto-med); line-height:1.5; margin:0;">As alterações à Temperatura e Altitude propagam-se para <b>Colebrook-White</b> afetando o atrito das condutas. A Categoria de QAI propaga automaticamente novos valores de <b>Rp</b> e <b>Ra</b> a todos os espaços do projeto não exclusivos de extração.</p>';
    h += '</div>';

    h += '<div style="background:#fff; border:1px solid var(--borda); border-radius:8px; padding:12px;">';
    h += '<div style="font-size:11px; font-weight:800; color:var(--primario); text-transform:uppercase; margin-bottom:8px; display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-scale-balanced"></i> Normas Aplicáveis</div>';
    h += '<div style="display:flex; flex-direction:column; gap:6px;">';
    h += '<div style="font-size:11px; background:#faf5ff; border:1px solid #e5ddfb; border-left:3px solid #8b5cf6; padding:6px; border-radius:4px;"><strong style="color:#5b21b6;">EN 16798-1</strong> Caudais de Ar Novo e QAI</div>';
    h += '<div style="font-size:11px; background:#f0fdf4; border:1px solid #bbf7d0; border-left:3px solid #16a34a; padding:6px; border-radius:4px;"><strong style="color:#166534;">ISO 2533</strong> Atmosfera Padrão (ISA)</div>';
    h += '<div style="font-size:11px; background:#eff6ff; border:1px solid #bfdbfe; border-left:3px solid #2563eb; padding:6px; border-radius:4px;"><strong style="color:#1e40af;">EN 1506 / EN 1505</strong> Séries de diâmetros comercias</div>';
    h += '</div></div>';

    h += '<div style="background:#fff; border:1px solid var(--borda); border-radius:8px; padding:12px; grid-column: 1 / -1;">';
    h += '<div style="font-size:11px; font-weight:800; color:var(--primario); text-transform:uppercase; margin-bottom:8px; display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-square-root-variable"></i> Fórmulas Base</div>';
    h += '<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap:12px;">';
    
    h += '<div style="background:#f8fafc; border:1px solid #e2e8f0; border-left:3px solid var(--primario); padding:8px; border-radius:4px;">';
    h += '<div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Ar Húmido (Magnus)</div>';
    h += '<div style="font-family:monospace; font-size:12px; color:#0f172a; font-weight:bold; margin-bottom:6px;">ρ = (p − pv) / (R_d · T) + pv / (R_v · T)</div>';
    h += '<div style="font-size:10px; color:#475569; padding-top:4px; border-top:1px dotted #cbd5e1;">Calcula a densidade a partir da pressão atmosférica e vapor de água. Base para perdas dinâmicas.</div></div>';
    
    h += '<div style="background:#f8fafc; border:1px solid #e2e8f0; border-left:3px solid var(--primario); padding:8px; border-radius:4px;">';
    h += '<div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:4px;">EN 16798-1 (QAI)</div>';
    h += '<div style="font-family:monospace; font-size:12px; color:#0f172a; font-weight:bold; margin-bottom:6px;">Q_novo = Rp·N + Ra·A</div>';
    h += '<div style="font-size:10px; color:#475569; padding-top:4px; border-top:1px dotted #cbd5e1;">Os valores de Rp e Ra derivam da Categoria QAI escolhida no setup e propagam para a matriz de espaços.</div></div>';

    h += '</div></div>';
    h += '</div>';
    
    painel.innerHTML = h;
};

})();