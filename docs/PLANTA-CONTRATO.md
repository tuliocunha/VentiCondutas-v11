# Contrato da Planta

O que a planta faz, com que gestos e que regras os dados têm de cumprir.
É a referência de cada alteração à planta: um PR que mude o comportamento
muda primeiro este documento.

Estado: **proposta v1 (Fase 0)**, para revisão do autor do projeto.
Marcas usadas:
- **[hoje]**: é assim que a app funciona agora;
- **[proposta]**: muda o comportamento e precisa de aprovação;
- **[desvio]**: a app não cumpre a regra; fica para a Fase 4.

---

## 1. Porque existe este documento

A planta cresceu por camadas. Cada funcionalidade (salas, rede, ramais,
vista, extras, terminal) acrescentou o seu próprio tratamento do rato:
hoje são **mais de 30 escutas de eventos espalhadas por 6 ficheiros**, várias a
interromper as outras (`stopImmediatePropagation`). O que um clique faz
depende da ordem em que os ficheiros carregam. Daí vieram falhas como:
- o nome da sala que não se movia;
- o duplo clique que recomeçava o traçado;
- a seta da transferência a meio entre os centros das salas;
- o cartão da transferência que ficava aberto ao selecionar outra coisa
  (corrigida neste PR).

Os testes usavam atalhos internos em vez de gestos. Este contrato,
os cenários (secção 9) e o verificador de coerência (secção 7) servem
para encontrar estas falhas antes de chegarem ao utilizador.

## 2. Vocabulário

Os mesmos nomes na app, nos testes e neste documento.

| Termo | Significado |
|---|---|
| **Piso** | Uma imagem de planta (PNG/JPG/PDF) com escala. `VC.dados.plantas[]` |
| **Escala** | metros por píxel da imagem, calibrada com a ferramenta Escala |
| **Espaço** | Sala do levantamento (tabela). Existe com ou sem desenho |
| **Desenho da sala** | O polígono de um espaço num piso. `espaco.planta.pts` |
| **Nome da sala** | O rótulo do desenho; pode ser deslocado. `espaco.planta.rotulo` |
| **Terminal** | Difusor/grelha/boca. Nasce no passo Terminais, a partir das *definições* do espaço; na planta só se escolhe onde fica. `terminal.planta = {pisoId,x,y}` |
| **Ramal** | Troço da rede (N1…N4). Na planta é um traçado. `ramal.planta.pts` |
| **Ligação** | Distância entre o terminal e a ponta do ramal a que está ligado |
| **Transferência** | Ar que passa de um espaço (origem) para outro (destino) por uma grelha, fresta ou abertura |
| **Porta** | Ponto do desenho onde fica a seta de uma transferência. `transferencia.planta = {pisoId,x,y,ang}` |
| **Compensação** | Caudal somado à insuflação da origem por causa de uma transferência. `transferencia.compensacao` |
| **Balanço** | Por espaço: entra (insuflação + transferências que chegam) − sai (extração + transferências que saem) |
| **Ferramenta** | Modo do rato: Selecionar, Mão, Escala, Retângulo, Polígono, Transferência, Ramal, Terminal |
| **Pendente** | Algo desenhado à espera de confirmação no painel (sala, ramal, transferência) |
| **Seleção** | O objeto ativo: uma sala, **ou** um ramal, **ou** uma transferência |

## 3. Modelo de dados

**Regra de ouro: as tabelas são a fonte da verdade, e a planta só guarda
posições.** Caudais, áreas, grupos, comprimentos e Δp vêm das tabelas e do
cálculo. A planta só escreve um dado de cálculo quando o utilizador o pede
explicitamente, por exemplo:
- «usar a área medida»;
- «usar o L medido»;
- «compensar na origem».

| Objeto | Vive em | A planta guarda | A planta pode mudar (com pedido explícito) |
|---|---|---|---|
| Piso | `dados.plantas[]` | imagem, w, h, escala, nome | — |
| Espaço | `dados.espacos[]` | `planta.pts`, `planta.rotulo` | `A` (área medida) |
| Terminal | `dados.terminais[]` | `planta.{x,y}` | `ramalRef` (ligar ao ramal) |
| Ramal | `dados.ramais[]` | `planta.pts` | `L` (comprimento medido), `nome` (renomear, em cascata) |
| Transferência | `dados.transferencias[]` | `planta.{x,y,ang}` | criar/remover; `compensacao` muda a insuflação da origem |

Coordenadas: sempre em **píxeis da imagem**, nunca em píxeis do ecrã.
Medidas em metros = píxeis × escala.

## 4. Princípios de interação

| # | Princípio | Estado |
|---|---|---|
| P1 | **Um gesto, um significado.** Clicar num objeto com Selecionar seleciona-o; arrastar move-o; duplo clique edita ou termina; Esc cancela; Delete apaga. Igual para todos os objetos. | parcial — ver desvios |
| P2 | **Uma seleção de cada vez.** Selecionar uma sala tira a seleção do ramal e da transferência, e vice-versa. | [hoje] (corrigido neste PR) |
| P3 | **Tudo se desfaz.** Cada ação que muda dados entra no desfazer da planta (Ctrl+Z / Ctrl+Y), com um nome legível. | parcial |
| P4 | **Toda a ação tem inversa à vista**: criar/remover, ligar/desligar, compensar/descompensar. | parcial |
| P5 | **O estado está à vista**: ferramenta ativa, o que está pendente, o que falta desenhar, o que está desequilibrado. | [hoje] |
| P6 | **O erro aparece no objeto**, não só no Balanço ou na Entrega (cor, ícone, aviso no cartão). | parcial |
| P7 | **A app propõe, o utilizador confirma.** Nunca pede um dado que já conhece (ex.: caudal sugerido pelo balanço). | [hoje] |
| P8 | **Tabela ⇄ planta**: mudar na tabela atualiza o desenho; mudar no desenho atualiza a tabela. Os dois mostram o mesmo número. | [hoje] |
| P9 | **Três canais de mensagem, cada um com o seu papel**: barra de estado (o que o rato está a apontar, medidas); cartão no painel (o objeto selecionado ou pendente, com ações); aviso flutuante (resultado de uma ação, desaparece). | parcial |
| P10 | **Gestos de navegação são universais**: roda = zoom no cursor; espaço+arrastar, botão do meio ou Mão = deslocar; F = ajustar; 0 = 100 %. Funcionam com qualquer ferramenta. | [hoje] |

## 5. Ferramentas × gestos

Atalhos: V Selecionar · H Mão · S Escala · R Retângulo · P Polígono ·
T Transferência · L Ramal · D Terminal.

| Ferramenta | Clique | Arrastar | Duplo clique | Enter | Esc | Delete |
|---|---|---|---|---|---|---|
| **Selecionar (V)** | seleciona sala / ramal / seta; no vazio limpa a seleção | canto da sala selecionada; terminal; nome da sala; seta | no nome: repõe no centro | — | limpa a seleção [proposta] | apaga o desenho ou o traçado selecionado; **seta: remove a transferência [proposta]** |
| **Mão (H)** | — | desloca a vista | — | — | — | — |
| **Escala (S)** | 1.º e 2.º ponto da medida | — | — | aplica os metros [hoje no campo] | cancela | — |
| **Retângulo (R)** | — | desenha a sala → pendente | — | — | cancela pendente | — |
| **Polígono (P)** | acrescenta vértice; no 1.º vértice fecha | — | fecha | fecha | cancela | apaga último vértice [proposta] |
| **Transferência (T)** | — | da origem ao destino, pela porta → pendente | — | cria [proposta] | cancela pendente | — |
| **Ramal (L)** | acrescenta ponto (encaixa em ramais/terminais) | — | termina | termina | cancela | apaga último ponto [proposta] |
| **Terminal (D)** | coloca o próximo terminal da sala | — | — | — | — | — |

Com qualquer ferramenta: o nome da sala arrasta-se com Selecionar e
Retângulo [hoje]. Generalizar a «arrasta-se com qualquer ferramenta que não
esteja a meio de um desenho» [proposta].

## 6. Estados de cada ferramenta (base da Fase 2)

Cada ferramenta é uma pequena máquina de estados. Um único gestor recebe
os eventos do rato e do teclado e entrega-os à ferramenta ativa. As
ferramentas deixam de escutar eventos por conta própria.

```
Selecionar:  parado ──clique objeto──▶ selecionado ──arrastar──▶ a mover ──largar──▶ selecionado (+desfazer)
             selecionado ──clique vazio / Esc──▶ parado
Retângulo:   parado ──premir──▶ a desenhar ──largar (≥6 px)──▶ pendente ──Ligar/Criar──▶ parado
                                              └─largar (<6 px)──▶ parado        pendente ──Esc/Cancelar──▶ parado
Polígono:    parado ──clique──▶ a desenhar ──clique──▶ a desenhar
                                 a desenhar ──1.º vértice / duplo clique / Enter──▶ pendente ──…──▶ parado
Ramal:       parado ──clique──▶ a traçar ──duplo clique / Enter / clique no último ponto──▶ pendente ──Aplicar──▶ parado
Transferência: parado ──premir na sala A──▶ a arrastar ──largar na sala B──▶ pendente ──Criar──▶ selecionado (seta)
                                                     └─largar fora / em A──▶ parado (aviso)
Terminal:    parado ──clique na sala──▶ parado (terminal colocado, +desfazer)
Escala:      0 pontos ──clique──▶ 1 ponto ──clique──▶ 2 pontos ──metros + Aplicar──▶ 0 pontos
```

Regras do gestor:
- trocar de ferramenta cancela o que estiver a meio, com aviso se se perder um pendente [proposta];
- a navegação (P10) é tratada antes de qualquer ferramenta.

## 7. Regras de coerência (invariantes)

Verificadas por `VC.planta.coerencia()` (Fase 3) depois de cada passo dos
cenários e mostradas na app como avisos no objeto.

| # | Regra | Gravidade |
|---|---|---|
| I1 | Todo o desenho de sala aponta para um espaço que existe e para um piso que existe. | erro |
| I2 | O polígono de uma sala tem ≥ 3 vértices e não se cruza. | erro |
| I3 | A área desenhada (com escala) não difere mais de 15 % da área da tabela, ou o utilizador aceitou a diferença. | aviso |
| I4 | Um terminal colocado está dentro de uma sala que ele serve. | aviso |
| I5 | Um terminal ligado a um ramal: o ramal existe e é da mesma rede. | erro |
| I6 | Ligação terminal → ponta do ramal ≤ 0,5 m, senão o L não a inclui. | aviso |
| I7 | Um ramal desenhado: o pai existe, e o traçado do filho começa no traçado do pai. | aviso |
| I8 | Uma transferência: origem ≠ destino, as duas existem e não há ciclo A→…→A. | erro |
| I9 | A seta de uma transferência está a ≤ 0,5 m da parede da origem e da do destino. | aviso |
| I10 | Uma transferência compensada: a definição de insuflação indicada existe e inclui o caudal compensado. | erro |
| I11 | Os terminais de uma definição somam o `Q_total` da definição. | erro |
| I12 | Balanço de cada espaço desenhado dentro da tolerância (ou isento: G2 sem conforto). | aviso |
| I13 | Desfazer tudo o que se fez numa sessão devolve exatamente o estado inicial; refazer devolve o final. | erro (só nos testes) |
| I14 | Há no máximo uma seleção (sala, ramal ou transferência). | erro (só nos testes) |
| I15 | Nenhuma ação deixa erros JavaScript na consola. | erro (só nos testes) |

## 8. Mensagens

| Canal | Para quê | Exemplo |
|---|---|---|
| Barra de estado (em baixo) | O que está sob o rato e medidas em curso | «Sala P0-N3 · próximo: Difusor 2 (1 por colocar)» |
| Cartão (painel direito) | O objeto selecionado ou pendente: dados e ações | «Nova transferência … Criar / Cancelar» |
| Aviso flutuante | Resultado de uma ação; desaparece | «Transferência criada: 60 m³/h» |
| No desenho | Estado dos objetos | cor pelo balanço, contorno tracejado se falta desenhar |

Regra: um aviso flutuante nunca é a única informação sobre um problema
que persiste. Se persiste, aparece também no cartão ou no desenho.

## 9. Cenários

Tarefas reais, de ponta a ponta, só com rato e teclado. Na Fase 1 servem
de auditoria; na Fase 5 tornam-se testes automáticos no CI.

**C1 · Do PDF à sala desenhada**
- Dado um projeto com espaços na tabela e sem plantas
- Quando acrescento um piso a partir de um PDF, calibro a escala com uma cota conhecida, desenho 3 salas (2 retângulos e 1 em L com o Polígono) e ligo cada uma ao espaço da tabela
- Então cada sala mostra o nome e a área medida; a diferença para a área da tabela é visível; desfazer 3 vezes remove as 3 salas.

**C2 · Terminais nas salas**
- Dado C1 e os terminais criados no passo Terminais
- Quando coloco os terminais com a ferramenta Terminal e arrasto um para outra sala
- Então cada terminal fica onde cliquei; o que mudou de sala mostra o aviso «serve X, não Y»; a tabela de terminais não muda de caudal.

**C3 · Rede de insuflação**
- Dado C2
- Quando traço o ramal principal, dois sub-ramais a partir dele e termino junto aos terminais
- Então os sub-ramais ficam ligados ao pai, os terminais ligam-se ao ramal, o L medido pode ser usado e o Δp atualiza na tabela de condutas.

**C4 · Corredor → casa de banho**
- Dado C1–C3 com uma casa de banho G4 só com extração
- Quando arrasto do corredor para a casa de banho, pela porta, e crio a transferência com «Compensar na origem»
- Então a seta fica na porta; as duas salas ficam equilibradas; a insuflação do corredor sobe o mesmo caudal; remover a transferência repõe tudo.

**C5 · Corrigir e voltar atrás**
- Dado C1–C4
- Quando movo cantos, nomes, terminais e a seta, renomeio um ramal e apago uma sala
- Então cada ação aparece no desfazer com o seu nome; desfazer tudo devolve o projeto exatamente como estava (I13); a Entrega mostra a planta coerente com as tabelas.

## 10. Desvios conhecidos

Encontrados ao escrever o contrato, a partir da leitura do código. A
auditoria (Fase 1) confirma-os com gestos reais e acrescenta os que faltarem.

| # | Desvio | Regra |
|---|---|---|
| D1 | Com uma seta selecionada, clicar numa sala ou num ramal mantinha o cartão da transferência. **Corrigido neste PR.** | P2 |
| D2 | Delete não remove a transferência selecionada; Esc não limpa a seleção. | P1 |
| D3 | Mover um canto ou um terminal guarda no desfazer da planta e também no histórico geral; os outros gestos só no da planta. | P3 |
| D4 | O nome da sala arrasta-se com Selecionar e Retângulo, mas não com Polígono, Terminal ou Transferência. | P1 |
| D5 | Trocar de ferramenta descarta um pendente (sala, ramal ou transferência) sem aviso. | P3/P5 |
| D6 | Esc tem três tratamentos diferentes, em ficheiros diferentes (salas, ramais, gestor de teclas). | P1 |
| D7 | Terminal colocado numa sala que não serve: só um aviso flutuante, que desaparece. | P6, regra da secção 8 |
| D8 | Área desenhada muito diferente da tabela: não há indicação no desenho. | I3, P6 |

## 11. Plano

| Fase | Entrega | Muda a app? |
|---|---|---|
| **0 · Contrato** | Este documento (+ correção D1) | só D1 |
| **1 · Auditoria** | Relatório: C1–C5 executados com gestos reais e revisão de ergonomia de cada ferramenta, com imagens, gravidade e correção proposta | não |
| **2 · Gestor de gestos** | Uma máquina de estados (secção 6) no lugar das 30+ escutas; comportamento igual, provado pelos cenários | sim (interno) |
| **3 · Verificador** | `VC.planta.coerencia()` com I1–I15; avisos no desenho e no cartão | sim |
| **4 · Correções** | Desvios e falhas aprovados da auditoria, em 2–3 PRs por tema: entrada de dados, representação, ergonomia | sim |
| **5 · Proteção** | C1–C5 automáticos no CI; testes «macaco» (ações ao acaso + I13) para desfazer e geometria | não |

### Definição de pronto (todos os PRs da planta, a partir daqui)
1. Respeita este contrato, ou altera-o no mesmo PR com a mudança explicada.
2. Tem um cenário executado com gestos reais (rato/teclado), não só atalhos internos.
3. O verificador de coerência passa (a partir da Fase 3).
4. `verificar`, `mutacoes`, `lint` e fotografia de referência passam.
5. O utilizador recebe imagens da tarefa feita antes de pedir a integração.
