/* ============================================================
   VentiCondutas · Associações (serviço único)
   ------------------------------------------------------------
   Contrato da planta, secção 3, e auditoria (PR 2): as operações que
   ligam os objetos do projeto existem UMA vez e todos os ecrãs as usam
   (Tabela, Topologia, Associação, Construtor, planta):

   · associar / desassociar   terminal ↔ ramal (regra VC.redes)
   · associarEspaco            espaço ↔ ramal, por rede (e os seus terminais)
   · criarTerminal             nova definição no espaço → terminais materializados
   · renomearEspaco            nome em cascata (terminais, transferências)
   · renomearRamal             nome em cascata (VC.topologia.renomearRamal)
   · criarTransferencia        validada pela regra de higiene (VC6.transferencias)

   Fonte da verdade do cálculo: terminal.ramalRef. Os campos
   espaco.ramalRefInsuflacao / ramalRefExtracao são a «rede do espaço»
   (pista para os terminais que ainda vão nascer) e mudam só por aqui.
   ============================================================ */
(function () {
'use strict';
if (VC._boot && VC._boot.partes) VC._boot.partes.push('03-associacoes');

const D = () => VC.dados;
const espacoDe = (t, e) => (t.espacos || []).some(x => (e.id != null && String(x.id) === String(e.id)) || x.nome === e.nome);
const campoDoEspaco = rede => (VC.redes.ehExtracao(rede) ? 'ramalRefExtracao' : 'ramalRefInsuflacao');

VC.associacoes = {
  /* terminal(is) → ramal. Devolve { ok, n, recusados: [{t, motivo}] } */
  associar(terminais, ramalNome) {
    const lista = Array.isArray(terminais) ? terminais : [terminais];
    const r = (D().ramais || []).find(x => x.nome === ramalNome);
    if (!r) return { ok: false, n: 0, recusados: lista.map(t => ({ t, motivo: 'Ramal «' + ramalNome + '» não existe' })), erro: 'Ramal «' + ramalNome + '» não existe' };
    const redeR = VC.redes.normalizar(r.rede);
    let n = 0; const recusados = [];
    lista.forEach(t => {
      if (!t) return;
      let redeT = VC.redes.normalizar(t.rede);
      // extração de um espaço sujo marcada «extração» → passa a extração suja (rede própria, decisão A3)
      if (redeR === 'extracao_suja' && redeT === 'extracao' && VC.topologia && VC.topologia._eEspacoSujoPorTerminal && VC.topologia._eEspacoSujoPorTerminal(t)) { t.rede = 'extracao_suja'; redeT = 'extracao_suja'; }
      if (!VC.redes.compativeis(redeT, redeR)) { recusados.push({ t, motivo: 'Terminal de ' + VC.redes.rotulo(redeT) + ', ramal de ' + VC.redes.rotulo(redeR) }); return; }
      t.ramalRef = r.nome;
      (t.espacos || []).forEach(x => {
        const esp = (D().espacos || []).find(e => (x.id != null && String(e.id) === String(x.id)) || e.nome === x.nome);
        if (esp) esp[campoDoEspaco(redeR)] = r.nome;
      });
      n++;
    });
    this._invalidar();
    return { ok: recusados.length === 0, n, recusados, erro: recusados.length ? recusados[0].motivo : null };
  },

  desassociar(terminais) {
    const lista = Array.isArray(terminais) ? terminais : [terminais];
    let n = 0;
    lista.forEach(t => { if (t && t.ramalRef) { t.ramalRef = ''; n++; } });
    this._invalidar();
    return n;
  },

  /* espaço → ramal numa rede: guarda a rede do espaço e associa os terminais dessa rede */
  associarEspaco(esp, rede, ramalNome) {
    const r = (D().ramais || []).find(x => x.nome === ramalNome);
    if (!esp || !r) return { ok: false, n: 0, erro: 'Espaço ou ramal inexistente' };
    const redeEsp = rede === 'insuflacao' ? 'insuflacao' : VC.redes.extracaoDe(esp);
    if (!VC.redes.compativeis(redeEsp, r.rede)) return { ok: false, n: 0, erro: '«' + esp.nome + '» precisa de um ramal de ' + VC.redes.rotulo(redeEsp) + '; «' + r.nome + '» é de ' + VC.redes.rotulo(r.rede) };
    esp[campoDoEspaco(redeEsp)] = r.nome;
    const T = (D().terminais || []).filter(t => espacoDe(t, esp) && VC.redes.ehExtracao(t.rede) === VC.redes.ehExtracao(redeEsp));
    const res = this.associar(T, r.nome);
    return { ok: true, n: res.n, recusados: res.recusados };
  },

  /* nova definição de terminais no espaço; a materialização cria os terminais (fonte: definições) */
  criarTerminal(esp, opc) {
    opc = opc || {};
    const idx = (D().espacos || []).indexOf(esp);
    if (idx < 0) return { ok: false, erro: 'Espaço inexistente', terminais: [] };
    const rede = VC.redes.normalizar(opc.rede);
    const Q = Math.round((Number(opc.Q) || 0) * 10) / 10, n = Math.max(1, Math.round(Number(opc.quantidade) || 1));
    if (!(Q > 0)) return { ok: false, erro: 'Escreva o caudal (m³/h).', terminais: [] };
    const tipo = opc.tipo || (rede === 'insuflacao' ? 'Difusor' : (rede === 'extracao_suja' ? 'Boca de Extração' : 'Grelha Extração'));
    if (VC.requisitos && VC.requisitos._recalcNextIdDefinicao) VC.requisitos._recalcNextIdDefinicao();
    if (!D().nextId) D().nextId = {};
    const k = D().nextId.definicao || 1; D().nextId.definicao = k + 1;
    const def = { id: 'DEF-' + k + '-' + (rede === 'insuflacao' ? 'I' : (rede === 'extracao_suja' ? 'E' : 'X')), tipo, rede, quantidade: n, Q_total: Q, origem: opc.origem || 'Planta' };
    if (!esp.definicoes) esp.definicoes = [];
    esp.definicoes.push(def);
    if (VC.calculo && VC.calculo.materializar) VC.calculo.materializar(idx);
    const novos = (D().terminais || []).filter(t => t.definicaoRef && t.definicaoRef.espacoId === esp.id && t.definicaoRef.definicaoId === def.id);
    novos.forEach(t => { t.Q = Math.round(Q / n * 10) / 10; (t.espacos || []).forEach(x => { x.Q_parcela = t.Q; }); });
    this._invalidar();
    return { ok: true, definicao: def, terminais: novos };
  },

  /* nome do espaço em cascata: terminais (por nome), transferências (nomes guardados) */
  renomearEspaco(esp, novo) {
    novo = String(novo == null ? '' : novo).trim();
    if (!esp) return { ok: false, erro: 'Espaço inexistente' };
    if (!novo) return { ok: false, erro: 'O nome não pode ficar vazio.' };
    const antigo = esp.nome;
    if (novo === antigo) return { ok: true, n: 0 };
    if ((D().espacos || []).some(e => e !== esp && String(e.nome || '').trim().toLowerCase() === novo.toLowerCase())) return { ok: false, erro: 'Já existe um espaço «' + novo + '».' };
    let n = 0;
    esp.nome = novo;
    (D().terminais || []).forEach(t => (t.espacos || []).forEach(x => {
      if (x.nome === antigo && (x.id == null || String(x.id) === String(esp.id))) { x.nome = novo; n++; }
    }));
    (D().transferencias || []).forEach(t => {
      if (t.deId === esp.id) { t.deNome = novo; n++; }
      if (t.paraId === esp.id) { t.paraNome = novo; n++; }
    });
    if (VC.editorEspacos) VC.editorEspacos._cacheOrdenacao = { chave: null, lista: null };
    this._invalidar();
    return { ok: true, n };
  },

  renomearRamal(antigo, novo) { return VC.topologia.renomearRamal(antigo, novo); },

  criarTransferencia(deId, paraId, Q, tipo, dP) { return VC6.transferencias.criar(deId, paraId, Q, tipo, dP); },

  _invalidar() {
    if (VC.perf) ['cacheFisica', 'cacheMaterializacao', 'ordenacaoTopologica', 'cacheBalanco'].forEach(k => { if (VC.perf[k] && VC.perf[k].invalidar) VC.perf[k].invalidar(); });
  }
};
})();
