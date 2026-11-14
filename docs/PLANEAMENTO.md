# Funções planeadas

Ideias decididas mas ainda não implementadas. A mesma lista aparece na app, em
**Sistema › Funções planeadas** (`src/modulos/24-planeamento.js`). Quando uma for
feita, retirar daqui e de lá no mesmo PR.

## 1. Ligações flexíveis entre o ramal e o terminal · prioridade alta
*Registado a 14-11-2026, depois do PR #17.*

**Problema.** Quando o terminal fica afastado da ponta do ramal desenhado, a
ligação entre os dois (quase sempre conduta flexível) não entra:
- no **L** do ramal, nem portanto no **Δp** — Δp = (f·L/D + Σζ)·ρv²/2;
- no **mapa de quantidades** (metros de flexível a comprar).

**Ordem de grandeza.** Ø160 a 2,5 m/s: rígida ≈ 0,6 Pa/m; flexível ≈ 3× (f 2–4× a
da chapa) e uma curva ≈ 4 Pa em 1,5 m. Pouco ao lado dos 20–40 Pa do terminal,
mas conta no caminho crítico (escolha do ventilador) e no material de obra.
Prática corrente: flexível ≤ ≈ 1,5 m por ligação.

**Passos.**
1. Mostrar o comprimento da ligação ao colocar/arrastar o terminal
   (`VC.planta.comprimentoLigacao(t)` já existe e aparece na barra de estado).
2. Aviso quando > 0,5 m: "a ligação não entra no L nem no Δp".
3. Botão "Prolongar o ramal até ao terminal": estende `ramal.planta.pts` até ao
   terminal e atualiza o L (mesma lógica de `usarLMedido`).
4. Ligação flexível como troço próprio: `terminal.ligacao = { L, tipo:'flexivel',
   D }`, rugosidade de flexível, ζ da curva, Δp somado ao do terminal no caminho
   crítico, e metros de flexível por diâmetro no mapa de quantidades (BOM).

**Até lá.** Desenhar o último ramal (N3/N4) com a ferramenta Ramal até tocar no
terminal: o comprimento entra no L.

## 2. Outros itens (do inventário da fase 4)
Ver `docs/inventario-fase4.md`, secção 4: tipologias Residencial/Saúde/Indústria,
estanquidade (EN 12237/EN 1507), registos corta-fogo, classe IE do motor,
recuperador ligado/desligado, ζ dinâmico de tês, ruído da UTA, custo energético
editável.

## Método da planta (contrato, cenários, gestor de gestos)

Ver [PLANTA-CONTRATO.md](PLANTA-CONTRATO.md): vocabulário, modelo de dados, gestos por ferramenta, regras de coerência, cenários C1–C5, desvios conhecidos e o plano em 5 fases.
