(function(){
'use strict';
const VC = window.VC;
if(!VC) return;

if (!VC.tooltips) VC.tooltips = {};
if (!VC.tooltips.dicionario) VC.tooltips.dicionario = (VC.conhecimento && VC.conhecimento.tooltips) ? VC.conhecimento.tooltips : {};

if(!document.getElementById('vc-css-extra')) {
  const link = document.createElement('link');
  link.id = 'vc-css-extra';
  link.rel = 'stylesheet';
  link.href = 'css/venticondutas.css';
  document.head.appendChild(link);
}

if(!document.getElementById('vc-force-ui')) {
 const style = document.createElement('style');
 style.id = 'vc-force-ui';
 style.textContent = `
 .topo-acoes { display: flex !important; }
 #painelInferior { display: block !important; }
 .janelas-bar { display: flex !important; }
 .lens-bar { display: flex !important; }
 .oculto { display: none !important; }
 .tt-popup.on { background: #f8fafc !important; color: #1e293b !important; border: 1px solid #cbd5e1 !important; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1) !important; }
 .tt-popup.on .tt-titulo { color: #1e293b !important; font-weight: 900 !important; border-bottom: 1px solid #cbd5e1 !important; padding-bottom: 4px !important; margin-bottom: 4px !important; }
 .tt-popup.on .tt-desc { color: #475569 !important; }
 `;
 document.head.appendChild(style);
}

if (!VC.tooltips._realImpl) {
  VC.tooltips._realImpl = true;
  VC.tooltips.instalar = function() {
    document.addEventListener('mouseover', (ev) => {
      const el = ev.target.closest('[data-tt],[data-tt-simbolo]');
      if (!el) return;
      const chave = el.getAttribute('data-tt') || el.getAttribute('data-tt-simbolo');
      const info = (VC.conhecimento && VC.conhecimento.tooltips) ? VC.conhecimento.tooltips[chave] : null;
      if (!info) return;
      const p = document.getElementById('ttPopup');
      if (!p) return;
      p.className = 'tt-popup on';
      let html = '<div class="tt-titulo">' + VC.utils.esc(info.titulo || chave) + '</div>';
      if (info.desc) html += '<div class="tt-desc">' + info.desc + '</div>';
      if (info.contexto) html += '<div class="tt-desc" style="font-size:10.5px;opacity:0.8;margin-top:4px;border-top:1px dashed #475569;padding-top:4px;">' + info.contexto + '</div>';
      if (info.formula) html += '<div class="tt-desc" style="font-family:monospace;background:rgba(255,255,255,0.1);padding:4px;border-radius:4px;margin-top:4px;">' + VC.utils.esc(info.formula) + '</div>';
      if (info.norma) html += '<div class="tt-desc" style="color:#86efac;font-weight:800;font-size:9.5px;margin-top:4px;">📘 ' + VC.utils.esc(info.norma) + '</div>';
      p.innerHTML = html;
      p.style.left = Math.min(ev.clientX + 12, window.innerWidth - 320) + 'px';
      p.style.top = Math.min(ev.clientY + 12, window.innerHeight - 200) + 'px';
    });
    document.addEventListener('mouseout', (ev) => {
      if (!ev.target.closest('[data-tt],[data-tt-simbolo]')) return;
      const p = document.getElementById('ttPopup');
      if (p) p.classList.remove('on');
    });
  };

  VC.tooltips.esconder = function() {
    const p = document.getElementById('ttPopup');
    if (p) p.classList.remove('on');
  };

  VC.tooltips.reinstalar = function() {
  };
}

window.renderBalancoV6 = function () {  
 const bal = VC6.balanco.todos();  
 const ttBal = (k) => ' <span class="btn-help" data-tt="' + k + '" onclick="event.stopPropagation(); VC.tooltips.mostrar(\'' + k + '\', this)" style="cursor:pointer; background:var(--verde-soft); color:var(--verde-esc); border:1px solid var(--verde-borda); border-radius:50%; padding:0 4px; font-size:9px; font-weight:900">?</span>';
let h = '<div class="cartao-titulo"><i class="fa-solid fa-scale-balanced"></i> Balanço de Ar</div>';   
h += '<p style="font-size:11.5px;color:var(--texto-med);margin-bottom:10px">Clica numa linha para ver o detalhe das parcelas (Conforto, QAI, Transferências).</p>';   
h += '<div class="tabela-wrap"><table class="tabela densa"><thead><tr>';   
h += '<th style="width:30px; text-align:center">#</th><th style="width:75px; text-align:center">Detalhes</th><th>Espaço' + ttBal('tipo_espaco') + '</th><th style="width:50px; text-align:center">G' + ttBal('grupo_portaria') + '</th><th style="width:110px; text-align:right">Q_in (m³/h)' + ttBal('Q_normas') + '</th><th style="width:110px; text-align:right">Q_out (m³/h)' + ttBal('Q_extracao') + '</th><th style="width:110px; text-align:right">Resíduo (ΔQ)' + ttBal('Q_total') + '</th><th style="width:80px; text-align:center">Estado</th>';  
 h += '</tr></thead><tbody>';  
 bal.forEach((b, idx) => {
    const qai = Number(b.QAI_aplicado)||0;
    const qaiIn = b.QAI_rede==='insuflacao' ? qai : 0;
    const qaiOut = (b.QAI_rede==='extracao'||b.QAI_rede==='extracao_suja') ? qai : 0;
    const qInTotal = (b.Q_in_direto||0) + (b.Q_conforto_in||0) + qaiIn + (b.Q_transf_in||0);
    const qOutTotal = (b.Q_out_direto||0) + (b.Q_conforto_out||0) + qaiOut + (b.Q_transf_out||0);
    const corResiduo = Math.abs(b.residuo) <= 5 ? 'var(--verde-esc)' : (Math.abs(b.residuo) <= 10 ? 'var(--ambar-esc)' : 'var(--coral-esc)');
    
h += `<tr class="linha-balanco" onclick="this.closest('tbody').querySelectorAll('tr').forEach(r=>r.classList.remove('linha-destaque'));this.classList.add('linha-destaque'); document.getElementById('det-balc-${idx}').classList.toggle('oculto')" style="cursor:pointer">`;  
 h += `<td class="center mono" style="font-weight:800;color:var(--texto-suave)">${idx + 1}</td>`;  
 h += `<td style="text-align:center;"><span style="font-size:9px; font-weight:800; color:var(--primario-esc); background:var(--primario-soft); padding:3px 6px; border-radius:4px; display:inline-flex; align-items:center; gap:4px; border:1px solid var(--primario-borda);" title="Ver parcelas de caudal"><i class="fa-solid fa-chevron-down"></i> VER</span></td>`;  
 h += `<td><b>${VC.utils.esc(b.nome)}</b></td>`;  
 h += `<td style="text-align:center">G${b.g}</td>`;  
 h += `<td style="text-align:right; font-family:ui-monospace,monospace">${VC.utils.fmt(qInTotal, 1)}</td>`;  
 h += `<td style="text-align:right; font-family:ui-monospace,monospace">${VC.utils.fmt(qOutTotal, 1)}</td>`;  
 h += `<td style="text-align:right; font-family:ui-monospace,monospace; font-weight:900; color:${corResiduo}">${b.residuo >= 0 ? '+' : ''}${VC.utils.fmt(b.residuo, 1)}</td>`;  
 h += `<td style="text-align:center">${b.estado === 'OK' ? '<span class="badge ok">OK</span>' : b.estado==='DESEQUILIBRIO_LEVE' ? '<span class="badge atencao">LEVE</span>' : '<span class="badge erro">GRAVE</span>'}</td>`;  
 h += `</tr>`;
    
    h += `<tr id="det-balc-${idx}" class="oculto" style="background:var(--superf2); font-size:10.5px">`;
    h += `<td></td><td></td>`;
    h += `<td colspan="6" style="padding:10px 14px; border-bottom:1px solid var(--borda-media)">`;
    h += `<div style="display:grid; grid-template-columns:1fr 1fr; gap:20px">`;
    h += `<div><b style="color:var(--primario-esc); text-transform:uppercase; font-size:9.5px; display:block; margin-bottom:4px">Entradas (Q_in)</b>`;
    h += `<div style="display:flex; justify-content:space-between"><span>Insuflação Direta:</span> <span style="font-family:ui-monospace">${VC.utils.fmt(b.Q_in_direto,1)} m³/h</span></div>`;
    if (b.Q_conforto_in) h += `<div style="display:flex; justify-content:space-between"><span>F-RPH (Conforto):</span> <span style="font-family:ui-monospace">${VC.utils.fmt(b.Q_conforto_in,1)} m³/h</span></div>`;
    if (qaiIn) h += `<div style="display:flex; justify-content:space-between"><span>QAI Projeto:</span> <span style="font-family:ui-monospace; color:#b88a4a">${VC.utils.fmt(qaiIn,1)} m³/h</span></div>`;
    if (b.Q_transf_in) h += `<div style="display:flex; justify-content:space-between"><span>Transferências (Entrada):</span> <span style="font-family:ui-monospace; color:var(--ambar-esc)">${VC.utils.fmt(b.Q_transf_in,1)} m³/h</span></div>`;
    h += `</div>`;
    h += `<div><b style="color:var(--verde-esc); text-transform:uppercase; font-size:9.5px; display:block; margin-bottom:4px">Saídas (Q_out)</b>`;
    h += `<div style="display:flex; justify-content:space-between"><span>Extração Direta:</span> <span style="font-family:ui-monospace">${VC.utils.fmt(b.Q_out_direto,1)} m³/h</span></div>`;
    if (b.Q_conforto_out) h += `<div style="display:flex; justify-content:space-between"><span>F-RPH (Conforto):</span> <span style="font-family:ui-monospace">${VC.utils.fmt(b.Q_conforto_out,1)} m³/h</span></div>`;
    if (qaiOut) h += `<div style="display:flex; justify-content:space-between"><span>QAI Projeto:</span> <span style="font-family:ui-monospace; color:#b88a4a">${VC.utils.fmt(qaiOut,1)} m³/h</span></div>`;
    if (b.Q_transf_out) h += `<div style="display:flex; justify-content:space-between"><span>Transferências (Saída):</span> <span style="font-family:ui-monospace; color:var(--ambar-esc)">${VC.utils.fmt(b.Q_transf_out,1)} m³/h</span></div>`;
    h += `</div>`;
    h += `</div>`;
    h += `</td></tr>`;
  });
  h += '</tbody></table></div>';
  return h;
};

window.renderTransferenciasV6 = function () {
  const trf = VC6.transferencias.todas();
  let h = '<div class="cartao-titulo"><i class="fa-solid fa-arrow-right-arrow-left"></i> Transferências</div>';
  if (!trf.length) return h + '<div class="vazio"><div class="vazio-titulo">Sem transferências</div><div>Adiciona uma transferência para ligar espaços G4 a G2/G1.</div></div>';
  h += '<div class="tabela-wrap"><table class="tabela densa"><thead><tr><th style="width:30px">#</th><th>De</th><th>Para</th><th>Q (m³/h)</th><th>Tipo</th><th>Área (cm²)</th><th></th></tr></thead><tbody>';
  trf.forEach((t, idx) => {
    h += '<tr onclick="this.closest(\'tbody\').querySelectorAll(\'tr\').forEach(r=>r.classList.remove(\'linha-destaque\'));this.classList.add(\'linha-destaque\')">';
    h += '<td class="center mono" style="font-weight:800;color:var(--texto-suave)">' + (idx + 1) + '</td>';
    h += '<td>' + VC.utils.esc(t.deNome) + '</td><td>' + VC.utils.esc(t.paraNome) + '</td><td><b>' + VC.utils.fmt(t.Q,0) + '</b></td><td>' + VC.utils.esc(t.tipo) + '</td><td>' + VC.utils.fmt(t.area_cm2,0) + '</td><td><button class="btn btn-mini coral" onclick="if(confirm(\'Remover?\')){VC6.transferencias.remover(\'' + t.id + '\');VC.estado.forcarSync();VC.passos.render(\'transferencias\');}">x</button></td></tr>';
  });
  h += '</tbody></table></div>';
  return h;
};

setTimeout(function() {
  const cssAntigo = document.getElementById('vc-ui-base-css');
  if (cssAntigo) cssAntigo.remove();
  const navErrada = document.getElementById('vc-ctx-nav');
  if (navErrada) navErrada.remove();
  const guiaErrada = document.getElementById('vc-guia-apoio');
  if (guiaErrada) guiaErrada.remove();
  if(VC.tooltips.instalar) VC.tooltips.instalar();
}, 500);

})();
