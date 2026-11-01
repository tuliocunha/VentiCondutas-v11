/* ============================================================
   VENTCONDUTAS V9.2.0 · 13-fase6
   Fase 6 · Responsividade (Mobile/Tablet) + CSS de Impressão

   ADITIVO. Não altera 08-arranque.js (R17).
   ============================================================ */
(function () {
'use strict';
const VC = window.VC;
VC._boot = VC._boot || { partes: [] };
VC._boot.partes.push('13-fase6');

const css = `
/* ─── FASE 6: IMPRESSÃO ─── */
@media print {
  .janelas-bar, .lens-bar, .mobile-sidebar-btn, .sidebar-overlay { display: none !important; }
  .corpo { display: block !important; }
  .sidebar { display: none !important; }
  .area-trabalho { overflow: visible !important; }
  #conteudoPasso { display: block !important; }
}

/* ─── FASE 6: RESPONSIVIDADE MOBILE ─── */
@media (max-width: 900px) {
  .mobile-sidebar-btn {
    display: flex !important;
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    background: var(--primario);
    color: white;
    border-radius: 50%;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
    z-index: 9999;
    font-size: 20px;
    cursor: pointer;
    border: none;
  }
  .sidebar {
    display: flex !important;
    position: fixed !important;
    top: 0; left: 0; bottom: 0;
    width: 280px;
    z-index: 10000;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    box-shadow: 2px 0 10px rgba(0,0,0,0.1);
  }
  .sidebar.mobile-open {
    transform: translateX(0);
  }
  .sidebar-overlay {
    display: none;
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.4);
    z-index: 9999;
  }
  .sidebar-overlay.active {
    display: block;
  }
  .janelas-bar, .lens-bar {
    padding: 0 10px;
  }
  .janela-btn, .lente-btn {
    padding: 8px 10px;
    font-size: 11px;
  }
  .painel-grid-2x3 {
    grid-template-columns: 1fr !important;
    grid-template-areas: "b1" "b2" "b3" "b4" "b5" !important;
  }
  .kanban-requisitos {
    grid-template-columns: 1fr !important;
  }
  .tabela-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}
`;

function injetar() {
  if (!document.getElementById('vc-fase6-css')) {
    const style = document.createElement('style');
    style.id = 'vc-fase6-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  if (!document.querySelector('.mobile-sidebar-btn')) {
    const btn = document.createElement('button');
    btn.className = 'mobile-sidebar-btn';
    btn.innerHTML = '<i class="fa-solid fa-bars"></i>';
    btn.style.display = 'none';
    btn.onclick = () => {
      document.getElementById('sidebar').classList.add('mobile-open');
      document.getElementById('sidebar-overlay').classList.add('active');
    };
    document.body.appendChild(btn);

    const overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    overlay.className = 'sidebar-overlay';
    overlay.onclick = () => {
      document.getElementById('sidebar').classList.remove('mobile-open');
      overlay.classList.remove('active');
    };
    document.body.appendChild(overlay);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(injetar, 100));
} else {
  setTimeout(injetar, 100);
}

console.log(
  '%c[VentCondutas V11.0.0 · Fase 6] 13-fase6 carregado · responsividade e CSS de impressão ativos',
  'color:#6d8fb0;font-weight:bold;background:#eaf1f7;padding:3px 6px;border-radius:3px'
);

})();
