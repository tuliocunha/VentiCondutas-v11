/* ============================================================
   VentiCondutas · Funções planeadas (Sistema › Funções planeadas)
   ------------------------------------------------------------
   Lista, dentro da app, do que está decidido fazer mas ainda não foi
   implementado, para que nenhuma ideia se perca. O mesmo conteúdo, com
   mais detalhe técnico, está em docs/PLANEAMENTO.md.
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('24-planeamento');
const esc = s => VC.utils.esc(s);

VC.planeamento = {
  itens: [
    {
      id: 'ligacoes-flexiveis', area: 'Planta e rede', prioridade: 'Alta', registado: '2026-11-14',
      titulo: 'Ligações flexíveis entre o ramal e o terminal',
      porque: 'Quando o terminal fica afastado da ponta do ramal, a ligação (quase sempre conduta flexível) não entra no L nem no Δp, nem no mapa de quantidades. No caminho crítico pode valer 4–8 Pa; na obra são metros de flexível a comprar.',
      passos: [
        'Mostrar o comprimento da ligação ao colocar ou arrastar o terminal (ex.: "ligação 1,40 m").',
        'Avisar quando passar de 0,5 m: a ligação não entra no L nem no Δp.',
        'Botão "Prolongar o ramal até ao terminal": estende o traço e atualiza o L e o Δp.',
        'Ligação flexível como troço próprio: rugosidade de flexível (f ≈ 2–4× a da chapa), curva incluída, limite recomendado ≈ 1,5 m, e metros de flexível no mapa de quantidades.'
      ],
      hoje: 'Desenhe o último ramal (N3/N4) com a ferramenta Ramal até tocar no terminal: assim o comprimento entra no L.'
    },
    { id: 'tipologias', area: 'Normas', prioridade: 'Média', registado: '2026-11-11', titulo: 'Tipologias Residencial, Saúde e Indústria', porque: 'Aparecem a cinzento ("em implementação"). Faltam as regras próprias de caudal de cada uma.', passos: [], hoje: 'Usar a tipologia Comércio e Serviços.' },
    { id: 'estanquidade', area: 'Normas', prioridade: 'Média', registado: '2026-11-11', titulo: 'Estanquidade das condutas (EN 12237 / EN 1507)', porque: 'Só existe como texto no caderno de encargos: falta a classe por conduta e o cálculo de fugas.', passos: [], hoje: '' },
    { id: 'corta-fogo', area: 'Normas', prioridade: 'Média', registado: '2026-11-11', titulo: 'Registos corta-fogo', porque: 'Só o nome no menu de Configurações; falta colocá-los na rede e contar o Δp.', passos: [], hoje: '' },
    { id: 'ie-motor', area: 'Engenharia', prioridade: 'Baixa', registado: '2026-11-11', titulo: 'Classe IE do motor no rendimento (Reg. (UE) 2019/1781)', porque: 'A classe é guardada na UTA mas não entra no rendimento nem na potência.', passos: [], hoje: '' },
    { id: 'recuperador', area: 'Engenharia', prioridade: 'Baixa', registado: '2026-11-11', titulo: 'Recuperador ligado/desligado', porque: 'O valor existe mas não muda o Δp interno nem o tipo Ecodesign.', passos: [], hoje: '' },
    { id: 'zeta-tes', area: 'Engenharia', prioridade: 'Baixa', registado: '2026-11-11', titulo: 'ζ dinâmico de tês (pela razão de caudais)', porque: 'A biblioteca de ζ é fixa; o ζ de um tê devia variar com a divisão de caudal.', passos: [], hoje: 'Ajustar o ζ à mão ou usar o ζ sugerido da planta.' },
    { id: 'ruido-uta', area: 'Engenharia', prioridade: 'Baixa', registado: '2026-11-11', titulo: 'Ruído da UTA', porque: 'Há ruído dos terminais (VDI 2081), mas não da UTA.', passos: [], hoje: '' },
    { id: 'custo-energia', area: 'Engenharia', prioridade: 'Baixa', registado: '2026-11-11', titulo: 'Custo energético editável', porque: 'Aparece no caderno com valores por omissão; falta onde editar horas e preço.', passos: [], hoje: '' }
  ],
  abrir() {
    const modal = document.getElementById('modalGenerico'), cont = document.getElementById('modalGenericoConteudo');
    if (!modal || !cont) return;
    let h = '<div class="modal-cabecalho"><h3>Funções planeadas</h3><button class="fechar" onclick="VC.ui.fecharModal(\'modalGenerico\')" aria-label="Fechar">×</button></div><div class="modal-corpo planeamento">';
    h += '<p class="plan-intro">Ideias decididas mas ainda não implementadas. Ficam aqui para não se perderem; o detalhe técnico está em <code>docs/PLANEAMENTO.md</code> no repositório.</p>';
    this.itens.forEach(it => {
      h += '<section class="plan-item"><div class="plan-cab"><b>' + esc(it.titulo) + '</b><span class="plan-tags"><span>' + esc(it.area) + '</span><span class="plan-p plan-' + esc(it.prioridade.toLowerCase()) + '">' + esc(it.prioridade) + '</span></span></div>'
        + '<p>' + esc(it.porque) + '</p>'
        + (it.passos.length ? '<ol>' + it.passos.map(p => '<li>' + esc(p) + '</li>').join('') + '</ol>' : '')
        + (it.hoje ? '<p class="plan-hoje"><b>Até lá:</b> ' + esc(it.hoje) + '</p>' : '') + '</section>';
    });
    h += '</div>';
    cont.className = 'modal largo';
    cont.innerHTML = h;
    modal.classList.add('on');
  }
};
})();
