/* ============================================================
   VENTICONDUTAS · 14-autoguardar
   Gravação automática do projeto no navegador (localStorage).

   Antes, recarregar a página voltava sempre ao projeto de exemplo:
   tudo o que não tivesse sido gravado com «Guardar» (JSON) perdia-se.
   Agora o projeto é gravado sozinho depois de cada recálculo, de 5 em
   5 s se algo mudou e ao fechar a página, e é recuperado no arranque
   (bootstrapFinal, em 08-arranque).

   O formato é o mesmo do «Guardar» (VC.exportacoes.serializarProjeto).
   Sem localStorage (modo privado) ou sem espaço: a app avisa uma vez
   e continua; o «Guardar» em JSON continua a ser a cópia de segurança.
   ============================================================ */
(function () {
'use strict';
const VC = window.VC;
VC._boot = VC._boot || { partes: [] };
VC._boot.partes.push('14-autoguardar');

const CHAVE = 'VC_projeto_autoguardado_v1';

VC.autoguardar = {
  CHAVE,
  _pronto: false,        // só grava depois de o arranque ter tentado recuperar (senão o exemplo apagava o projeto)
  _ultimo: null,         // texto da última gravação
  _avisado: false,
  _timer: null,
  ultimaGravacao: null,

  _ler() {
    try { return localStorage.getItem(CHAVE); } catch (e) { return null; }
  },

  /* grava já; devolve true se ficou gravado */
  gravar() {
    if (!this._pronto || !VC.exportacoes || !VC.exportacoes.serializarProjeto) return false;
    let txt;
    // sem a hora: só grava quando o projeto muda
    try { const p = VC.exportacoes.serializarProjeto(); p.timestamp = null; txt = JSON.stringify(p); } catch (e) { if (VC.debug && VC.debug.erro) VC.debug.erro(e); return false; }
    if (txt === this._ultimo) return true;
    try {
      localStorage.setItem(CHAVE, txt);
      this._ultimo = txt;
      this.ultimaGravacao = new Date();
      return true;
    } catch (e) {
      if (!this._avisado) {
        this._avisado = true;
        if (VC.ui && VC.ui.toast) VC.ui.toast('Não foi possível guardar o projeto automaticamente no navegador (sem espaço ou modo privado). Use «Guardar» para não perder alterações.');
      }
      return false;
    }
  },

  agendar() {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.gravar(), 800);
  },

  /* chamado no arranque: aplica o projeto gravado, se houver. Devolve true se recuperou. */
  restaurar() {
    let ok = false;
    try {
      const txt = this._ler();
      if (!txt) return false;
      const p = JSON.parse(txt);
      if (!p || !p.dados || !(p.dados.espacos || []).length) return false;
      VC.ui.aplicarProjeto(p, { render: false });
      this._ultimo = txt;
      ok = true;
      setTimeout(() => { if (VC.ui && VC.ui.toast) VC.ui.toast('Projeto recuperado da última sessão (' + p.dados.espacos.length + ' espaços).'); }, 600);
    } catch (e) {
      if (VC.debug && VC.debug.aviso) VC.debug.aviso('Projeto gravado ilegível; arranca com o exemplo: ' + e.message);
      ok = false;
    } finally {
      this._pronto = true;
    }
    return ok;
  },

  /* apaga a gravação automática (o projeto aberto fica como está) */
  limpar() {
    try { localStorage.removeItem(CHAVE); } catch (e) { /* sem localStorage */ }
    this._ultimo = null;
  }
};

if (VC.eventos && VC.eventos.on) VC.eventos.on('calculo:fim', () => VC.autoguardar.agendar());
setInterval(() => VC.autoguardar.gravar(), 5000);   // apanha alterações que não passam pelo recálculo (planta, nomes…)
window.addEventListener('beforeunload', () => VC.autoguardar.gravar());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') VC.autoguardar.gravar(); });

})();
