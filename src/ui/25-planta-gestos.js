/* ============================================================
   VentiCondutas · Planta: gestos coerentes (contrato, secções 4–6)
   ------------------------------------------------------------
   Um só sítio decide o que fazem Esc, Enter e Delete, para todas as
   ferramentas (antes: três tratamentos do Esc em ficheiros diferentes).
   · Esc     cancela o que está a meio ou pendente; sem nada pendente,
             limpa a seleção (P1, D2, D6).
   · Enter   confirma: fecha o polígono, termina o ramal, aplica a escala,
             cria a transferência ou o terminal pendentes.
   · Delete  a desenhar: apaga o último vértice/ponto; com uma seleção:
             seta → remove a transferência, ramal → apaga o traçado,
             sala → apaga o desenho (o espaço fica na tabela).
   · Trocar de ferramenta com um pendente não o perde em silêncio: pede
             para confirmar ou cancelar (Esc) primeiro (D5).
   · Mudar de passo limpa a seleção e os pendentes da planta (B3).
   · Depois de criar um ramal a ferramenta Ramal mantém-se (C6).
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('25-planta-gestos');
const P = VC.planta;
if (!P || !P.cancelar) return;
const val = id => { const el = document.getElementById(id); return el ? (el.type === 'checkbox' ? el.checked : el.value) : null; };

/* o que está pendente ou a meio, com um nome para as mensagens */
P.pendenteAtual = function () {
  if (this.pendenteTrf) return 'a transferência';
  if (this.pendenteRamal) return 'o traçado do ramal';
  if (this.pendenteTerm) return 'o novo terminal';
  if (this.pendente) return 'o desenho da sala';
  if ((this.tracado || []).length) return 'o ramal a traçar';
  if ((this.rascunho || []).length) return 'o polígono a desenhar';
  if ((this.escalaPts || []).length) return 'a medida da escala';
  return null;
};
P.temSelecao = function () { return this.selecionado != null || this.ramalSel != null || this.trfSel != null; };
P.limparSelecao = function () { this.selecionado = null; this.ramalSel = null; this.trfSel = null; };

/* Esc */
P.gestoEsc = function () {
  if (this.pendenteAtual()) { this.cancelar(); return 'cancelou'; }
  if (this.temSelecao()) { this.limparSelecao(); this.redesenhar(); return 'limpou'; }
  return null;
};
/* Enter */
P.gestoEnter = function () {
  if (this.ferramenta === 'pol' && (this.rascunho || []).length >= 3 && !this.pendente) { this.fecharPoligono(); return 'poligono'; }
  if (this.ferramenta === 'ramal' && (this.tracado || []).length >= 2 && !this.pendenteRamal && this.terminarTracado) { this.terminarTracado(); return 'ramal'; }
  if (this.ferramenta === 'escala' && (this.escalaPts || []).length === 2) { this.aplicarEscala(val('plantaMetros')); return 'escala'; }
  if (this.pendenteTrf) {
    const b = document.querySelector('.planta-card button.primario[onclick*="criarTransferencia"]');
    if (b && b.disabled) { VC.ui.toast('Esta transferência não é permitida: use «Inverter direção» ou Esc.'); return 'recusada'; }
    this.criarTransferencia(val('plantaTrfQ'), val('plantaTrfTipo'), val('plantaTrfDp'), val('plantaTrfComp'));
    return 'transferencia';
  }
  if (this.pendenteTerm && this.criarTerminalAqui) { this.criarTerminalAqui(val('ptRede'), val('ptQ'), val('ptN')); return 'terminal'; }
  return null;
};
/* Delete / Backspace */
P.gestoApagar = function () {
  if (this.ferramenta === 'pol' && (this.rascunho || []).length && !this.pendente) { this.rascunho.pop(); this.redesenhar(); return 'vertice'; }
  if (this.ferramenta === 'ramal' && (this.tracado || []).length && !this.pendenteRamal) { this.tracado.pop(); this.redesenhar(); return 'ponto'; }
  if (this.pendenteAtual()) return null;   // um pendente confirma-se ou cancela-se (Esc), não se apaga
  if (this.trfSel != null && this.removerTransferencia) { this.removerTransferencia(this.trfSel); return 'transferencia'; }
  if (this.ramalSel != null && this.apagarTracado) { this.apagarTracado(this.ramalSel); return 'tracado'; }
  if (this.selecionado != null) { this.apagarDesenho(this.selecionado); return 'desenho'; }
  return null;
};

/* trocar de ferramenta pelo utilizador (barra e atalhos): não perde um pendente sem aviso */
P.escolherFerramenta = function (f) {
  if (f === this.ferramenta) return true;
  const p = this.pendenteAtual();
  if (p) { VC.ui.toast('Há ' + p + ' por confirmar: confirme-o (Enter) ou cancele-o (Esc) antes de mudar de ferramenta.'); return false; }
  this.setFerramenta(f);
  return true;
};

/* C6: depois de criar/usar um traçado, a ferramenta Ramal mantém-se para desenhar o seguinte */
const aplicarBase = P.aplicarRamal;
if (aplicarBase) P.aplicarRamal = function () {
  const antes = this.ferramenta, r = aplicarBase.apply(this, arguments);
  if (antes === 'ramal' && this.ferramenta === 'sel' && !this.pendenteRamal) { this.ferramenta = 'ramal'; this.redesenhar(); }
  return r;
};

/* B3: mudar de passo limpa a seleção e os pendentes da planta (o mesmo passo redesenhado mantém-nos) */
P.limparTudo = function () { this.limparSelecao(); this.rascunho = []; this.escalaPts = []; this.pendente = null; this.pendenteTrf = null; this.tracado = []; this.pendenteRamal = null; this.pendenteTerm = null; };
if (VC.passos && VC.passos.render) {   // 16-navegacao carrega depois e envolve este render: a regra vale para todas as entradas num passo
  const render = VC.passos.render;
  VC.passos.render = function (passo) {
    if (P._passoSelecao !== undefined && passo !== P._passoSelecao) P.limparTudo();
    P._passoSelecao = passo;
    return render.apply(this, arguments);
  };
}
})();
