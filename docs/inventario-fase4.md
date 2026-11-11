# Inventário antes da limpeza (fase 4)

Objetivo: antes de apagar ou mover código, confirmar que a limpeza não tira à app
nada que faça parte das normas, da engenharia ou da interface, mesmo que hoje não
funcione por causa de erros antigos.

Como foi feito:
1. **Comparação função a função** dos ficheiros a apagar com o código que o
   `index.html` carrega.
2. **Sonda na app real**: cada opção do utilizador foi mudada pelo caminho da
   interface. Depois viu-se se o cálculo, os relatórios e a auditoria mudavam.
3. **Fotografia da app** (`tools/fotografia.js`). Regista o resultado completo de
   cálculo, os 15 relatórios, o texto dos 16 passos, as 726 funções, os botões e os
   145 testes. A limpeza só é aceite se a fotografia depois for igual à de antes.
   As exceções são as correções de propósito, listadas abaixo.

## 1. Ficheiros a apagar: nada se perde

| Ficheiro | O que tem | Existe no código ativo? |
|---|---|---|
| `*.bak` (6) | cópias de 1-nov-2026 | Sim, tudo. Os ficheiros ativos são mais completos (ajudas "?", glossário de documentos) |
| `08-arranque.js` (raiz, não carregado) | Setup antigo, `sincronizarSetup` (Rp/Ra por categoria, com a Cat. IV errada), cabeçalho "V11" | O Setup ativo tem os mesmos campos. A categoria foi corrigida na fase 1 |
| `src/ui/08-arranque 31out26.js` | cópia de 31-out | Sim (igual ao `.bak`) |
| `src/ui/11-layout-v2.js` | vazio | — |
| `_patch_manifest.json` | registo de um patch de 31-out | — |
| `renderG1_deltaP` (só no `.bak`) | gráfico que desenhava só a palavra "Teste" | — |

**Recuperado:** o campo **Descrição do projeto**. Existia no Setup antigo
(`_old_renderSetup_2`) e desapareceu do atual, embora o dado continue a ser
guardado e exportado. Volta ao Setup.

## 2. Remendos e duplicados: não se podem simplesmente apagar

| Onde | O que faz | Decisão |
|---|---|---|
| `16-bridge-v10-fixes.js` | É a **única** implementação das ajudas (tooltips) e do ecrã de Balanço de Ar. Também carrega o CSS e força a visibilidade das barras | Mover para os módulos próprios, sem perder nada |
| idem, `renderTransferenciasV6` | Cópia mais antiga; o `11-transferencias.js` substitui-a | Apagar a cópia |
| idem, remoção de `vc-ctx-nav`, `vc-guia-apoio`, `vc-ui-base-css` | Apaga elementos que nenhum módulo cria | Apagar |
| `11-construtor-visual-loader.js` | Põe a "vista árvore" como vista por omissão da Associação | Mover para `11-construtor-visual.js` |
| `VC.ui.renderSidebar`, `VC.passos.render`, `VC.modos.setJanela/setLente`, `VC.estado.sincronizar` | São **decoradores**: acrescentam a sincronização com o URL, o filtro do menu por janela e as facetas da topologia depois de cada cálculo | Manter o comportamento. Só sai a cópia de `renderSidebar` que nunca corre |
| `window._old_renderSetup`, `_old_renderSetup_2` | Ecrãs de Setup antigos | Apagar depois de recuperar a Descrição |

## 3. Erros encontrados pelo inventário (corrigidos nesta fase)

| # | Erro | Efeito | Correção |
|---|---|---|---|
| E1 | Série de diâmetros, método de cálculo, estado dos filtros e material/rugosidade/altura de cada ramal não entram no `_hashEstado` | Mudar estas opções no ecrã **não recalcula** até outra coisa mudar | Acrescentá-las ao hash |
| E2 | O ponto de funcionamento é calculado **por rede**: usa a 1.ª UTA da rede | A UTA-Sul-Insuflação mostra o ponto da UTA-Norte (1441 m³/h, 514 Pa) | Calcular por UTA |
| E3 | Sem aviso quando o caudal de projeto passa o fim da curva do ventilador | UTA-Norte-Extração: projeto 1212 m³/h, ventilador M315 só até 800 m³/h | ATENÇÃO "Ventilador fora da curva" |

## 4. Previsto mas não implementado: fica registado, não se apaga

São funcionalidades que a app anuncia (no menu, no glossário ou nas
"Configurações") e que hoje não têm efeito. **A limpeza não lhes toca.** Cada uma
precisa de uma decisão sua: implementar, ou retirar o anúncio.

### Normas
| Item | Situação |
|---|---|
| **Tipologia do edifício** (Comércio / Residencial / Saúde / Indústria) | **v11.2:** Residencial, Saúde e Indústria aparecem a cinzento, "em implementação", e não se podem escolher. Um projeto antigo marcado com uma delas mostra um aviso no Setup e na auditoria. Falta implementar as regras próprias de cada uma |
| **Estanquidade** (EN 12237 / EN 1507) | Só um texto no caderno de encargos. Não há classe por conduta nem cálculo de fugas |
| **Registos corta-fogo** | Só o nome no menu de Configurações |
| **Classe IE do motor** (IE3/IE4, Reg. (UE) 2019/1781) | Guardada na UTA, mas não entra no rendimento do motor nem na potência |
| **Recuperador ligado/desligado** | O valor existe, mas não muda o Δp interno nem o tipo Ecodesign |

### Engenharia
| Item | Situação |
|---|---|
| **Estado dos filtros** (limpo / médio / sujo) | **v11.2: implementado.** Seletor no editor de UTAs (por omissão: sujos, Δp final) |
| **ζ dinâmico de Tês** | A biblioteca de ζ é fixa, escolhida à mão. Não varia com a razão de caudais |
| **Altura disponível e rugosidade do Setup** | **v11.2: implementado.** Os valores do Setup valem para todos os ramais; um valor de ramal só conta se for marcado como próprio |
| **Dilatação térmica, custo energético** | Só dados por omissão. O custo aparece no caderno, mas não há onde editar as horas nem o preço |
| **Ruído de UTA** | Há ruído dos terminais (VDI 2081), mas não da UTA |

### Interface
| Item | Situação |
|---|---|
| **Configurações → 41 interruptores** | Nenhum liga ou desliga código, exceto "Conforto térmico" e "QAI projeto" |
| **11 gráficos do painel de auditoria** | Aparecem como "Em desenvolvimento" (fase 2). As funções de desenho já existem em `VC.graficos` |
| **Árvore volumétrica** (`VC6.redeCondutas`) | O módulo nunca existiu. O relatório "Árvore" mostra a árvore em texto |
| **Modo comparação, Modo Normal/Engenharia** | Só o nome |
| **12 atalhos de teclado** | Implementados (ler `VC.conhecimento.atalhos`). Sem falha |

## 5. Garantia

`tools/fotografia.js --comparar` corre depois de cada passo da limpeza. Os passos
4.1–4.7 têm de dar **zero diferenças**. As correções E1–E3 vêm depois, cada uma
com as diferenças esperadas e explicadas no PR.
