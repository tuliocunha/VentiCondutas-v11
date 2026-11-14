# Auditoria da Planta (Fase 1)

Data: 2026-11-14 · Referência: [PLANTA-CONTRATO.md](PLANTA-CONTRATO.md)

## Como foi feita
- **Planta real:** PDF de AutoCAD (A4, "sem escala") de um mezanino com 4 salas:
  - Sala 16,50 m²;
  - Circulação em L 8,70 m²;
  - Casa de Banho 2,97 m²;
  - Apoio/Serviço 1,65 m².
  A circulação insufla e passa o ar pelas portas para a casa de banho e o apoio, que extraem.
- **Projeto novo**, feito do zero só com **rato e teclado**: clique, arrastar, roda, espaço+arrastar e atalhos. Sem atalhos internos.
- **Cenários C1–C5 do contrato:**
  - C1: PDF → escala → 4 salas;
  - C2: definições e terminais;
  - C3: UTAs e ramais;
  - C4: transferências pela porta com compensação;
  - C5: corrigir, Delete/Esc, desfazer tudo;
  - depois, a Entrega.
- As imagens foram entregues ao autor na conversa. Não ficam no repositório, que é público e onde a planta é de um cliente.

## O que funcionou bem
- PDF carregado e lido.
- Zoom com a roda no cursor e deslocação com espaço+arrastar.
- Escala com dois cliques e Enter.
- Áreas medidas: 16,51 m² contra 16,50 m² da planta. As diferenças nas outras salas vêm do desenho à mão.
- Polígono em L fechado no 1.º vértice.
- Criar espaço a partir do desenho.
- Ferramenta Terminal (D).
- Ramal com encaixe, e sub-ramal com o pai já escolhido.
- **Seta na porta certa**, compensação da origem correta e balanço das 4 salas equilibrado.

## Falhas encontradas

Gravidade:
- **Crítica**: dá um resultado errado ou bloqueia a tarefa.
- **Alta**: engana ou obriga a contornar.
- **Média**: atrasa ou confunde.
- **Baixa**: acabamento.

### Críticas

| # | Falha | Como se viu | Regra | Correção proposta |
|---|---|---|---|---|
| **A1** | A Entrega diz **"Pronto a entregar · sem avisos"** com a rede incompleta. | 0 m³/h extraídos com 3 terminais de extração sem ramal; 50 m³/h insuflados em vez de 157 (o terminal da circulação não tem ramal); ramais de extração com Q = 0 marcados "OK". | I5, I12 | Terminal sem ramal = **erro**; ramal com Q = 0 = aviso; o total insuflado/extraído soma todos os terminais e mostra a diferença para a rede. |
| **A2** | **Ctrl+Z na planta apaga trabalho feito noutros ecrãs.** | Desenhei salas, escrevi N = 6 na Tabela, voltei à planta e carreguei Ctrl+Z: o N voltou a 0. "Desfazer tudo" também apagou definições e terminais criados no passo Definição. O desfazer guarda listas inteiras (espaços, terminais, ramais) e repõe-nas. | P3, I13 | O desfazer repõe **só o que a ação mudou**. Em alternativa, o desfazer da planta é limpo quando os dados mudam noutro ecrã, com aviso. |
| **A3** | **A extração da casa de banho não liga a nenhum ramal.** | Os terminais de G4 são de "extração suja". As UTAs só se criam como insuflação ou extração. A planta exige a mesma rede ("1 de outra rede não ligado"), mas o passo Topologia aceita extração ↔ extração suja. São regras diferentes em ecrãs diferentes. | P1, I5 | Uma só regra de compatibilidade de redes, usada em toda a app. **Decisão sua** (ver abaixo). |
| **A4** | **Não se consegue criar o ramal principal sem UTA**, e as UTAs criam-se num passo posterior (Ventiladores). | A lista "UTA" vem vazia e sem explicação. "Criar ramal" responde "Escolha um ramal, ou crie um novo", que é falso: o problema é a falta de UTA. | P5, P7 | No cartão do ramal: "Sem UTA — criar UTA de insuflação/extração aqui". A mensagem diz o que falta. |

### Altas

| # | Falha | Como se viu | Correção proposta |
|---|---|---|---|
| **B1** | Uma planta **sem escala** não se calibra. | O PDF real não tem cotas, só áreas escritas (16,50 m², 8,70 m²…). Usei uma medida deduzida da área. | **Calibrar pela área**: desenhar uma sala, escrever a área conhecida, e a escala é calculada. |
| **B2** | A compensação cria um terminal de insuflação na circulação que **fica fora da planta e sem ramal**, sem aviso. | GRI-CIRCULAO-1 com 107 m³/h, sem posição e sem ramal; o topo diz "Sem avisos". | No cartão: "Novo terminal: coloque-o (D) e ligue-o a um ramal". Contá-lo em A1. |
| **B3** | **A seleção passa de um passo para o seguinte.** | A sala selecionada no Levantamento continua selecionada nos Terminais. O ramal selecionado na Topologia fica no cartão por cima de "Nova transferência", com 2 cartões ao mesmo tempo. | Ao mudar de passo, a seleção limpa-se; criar uma transferência limpa a seleção do ramal (P2). |
| **B4** | **Os textos sobrepõem-se e ficam ilegíveis**, sobretudo em salas pequenas. | O nome da Circulação em L fica no centro geométrico, por baixo da casa de banho e do apoio. "Casa de Banho Mezanino" é maior do que a sala. I/E ficam por cima dos nomes. Os rótulos dos ramais e as setas ficam por cima de tudo. Na **Entrega**, aparece a folha A4 inteira com o mezanino minúsculo e ilegível. | Nome no ponto mais interior da sala; letra ajustada ao tamanho (ou nome curto); terminais e setas a evitar os nomes. Na Entrega, recortar à zona desenhada. |
| **B5** | Aparece **"1 erro" logo à primeira sala desenhada** ("0 terminais"), e o clique leva para a Entrega, fora da planta. | O trabalho ainda está a meio e não é um erro. | Separar "por fazer" (cinzento) de "erro" (vermelho). O clique abre o aviso no próprio passo. |
| **B6** | **Delete, Esc, Enter e trocar de ferramenta** não fazem o que o contrato pede. | Delete numa seta não faz nada; Esc não limpa a seleção; Enter não cria a transferência; trocar de ferramenta deita fora a sala por confirmar, sem aviso. | As propostas aprovadas do contrato (D2, D5). |

### Médias

| # | Falha | Correção proposta |
|---|---|---|
| C1 | **Nomes trocados.** "Os terminais criam-se no passo Terminais (Dimensionamento)" aparece estando já em "Dimensionamento de Terminais"; as definições estão em "Definição de Terminais", no Inventário. A Topologia fala em "slots" e tem textos sem acentos ("atribuidos", "selecao", "Nao conectados"). O cartão do ramal mostra "extracao" em bruto. | Rever todos os textos contra o vocabulário do contrato. |
| C2 | Janelas nativas do navegador (confirmar/escrever) para Novo, Sugerir definições, Materializar e Nome da UTA. | Cartões ou janelas da app, como no resto. |
| C3 | "Materialização: 0 criados" logo depois de os terminais aparecerem. | Dizer quantos existem e quantos foram criados. |
| C4 | Criar um espaço pela planta não pede a ocupação (N); cada criação termina com "Falta a ocupação (N)". | Campo N no cartão "Novo desenho" quando o tipo precisa dele. |
| C5 | Área criada com 1,73 m² e logo mostrada como medida 1,74 m², o que sugere uma diferença que não existe. | Mesmo arredondamento nos dois sítios. |
| C6 | Depois de criar um ramal, a ferramenta volta a Selecionar; depois de criar uma transferência, fica Transferência. | Uma regra: a ferramenta mantém-se (para desenhar o seguinte). |
| C7 | Imagem do PDF a 2400 px: a 126–208 % fica desfocada, e a zona útil é uma pequena parte da folha. | Ao carregar um PDF, escolher a zona útil (recorte) e ler essa zona em alta resolução. |
| C8 | O painel mostra o que não é do passo: "Distribuir terminais" como botão principal e "Ramais desenhados 0 de 0" no Levantamento. | Mostrar só as ações do passo. |
| C9 | Avisos que persistem só em mensagem passageira: "Calibre a escala" depois de carregar, e "terminal serve outra sala". | Cartão persistente (regra da secção 8 do contrato). |

### Baixas

| # | Falha |
|---|---|
| D1 | O desfazer não diz o quê: "Desfeito: espaço criado na planta", sem o nome. |
| D2 | A mensagem do passo anterior continua visível depois de mudar de passo. |

## Decisões do autor
1. **A3 · Extração sanitária → rede própria.** Os terminais de extração suja ligam-se só a ramais e a um ventilador de extração suja. O passo UTAs ganha o botão «Extrator de extração suja».
2. **A2 · Desfazer → opção (a).** O desfazer repõe só o que a ação mudou.
3. **B1 · Calibrar pela área → aprovado** (PR 2).

## Estado das correções

| PR | Falha | O que mudou |
|---|---|---|
| 1 | **A2** | O desfazer da planta guarda as diferenças campo a campo (por id) em vez de listas inteiras. Desfazer/refazer só repõe os campos que ainda têm o valor que a ação deixou; o resto fica e o aviso diz quantos dados ficaram. Subações (ex.: criar espaço que liga o desenho) contam como uma só entrada. Teste UI.T26. |
| 1 | **A1** | Novos avisos da verificação: «Terminal sem ramal» (erro), «Terminal noutra rede» (erro), «Ramal sem caudal» (aviso). Levam ao passo Topologia dos Ramais. A Entrega soma o caudal de todos os terminais e mostra a diferença para a rede (UTAs). |
| 1 | **B2** | O cartão da transferência compensada indica o terminal da compensação que falta colocar (D) ou ligar a um ramal; a verificação dá «Terminal fora da planta» (aviso) e «Terminal sem ramal» (erro). |
| 1 | **A3** | Regra única `VC.redes` (01-fundamentos): Topologia (construtor), Associação (listas e automática), planta (ligar ao ramal) e verificação usam a mesma. Um terminal «extração» de um espaço sujo, ligado pela topologia automática ao extrator de extração suja, passa a «extração suja». |
| 1 | — | Encontrado no cenário: clicar em «Tabela» com a Planta aberta não mudava de vista (o invólucro de `VC.passos.render` repunha a vista anterior). Corrigido em `VC.nav.setVista`. |

## Plano de correção (proposta)

A auditoria mudou as prioridades: as falhas mais graves (A1, A2) são de **integridade dos dados**, não de gestos. Por isso entram antes do gestor único.

| Ordem | PR | Conteúdo |
|---|---|---|
| 1 | **Integridade dos dados** | A2 (desfazer), A1 + B2 (Entrega/avisos honestos), A3 (regra única de redes) |
| 2 | **Fluxo sem becos** | A4 (UTA no cartão do ramal), B1 (calibrar pela área), C4 (N no cartão), C2 (sem janelas nativas), C3 |
| 3 | **Gestor único de gestos** (Fase 2 do contrato) + B3, B6, C6 | Uma só máquina de estados; seleção limpa entre passos; Delete/Esc/Enter; aviso antes de perder um pendente |
| 4 | **Representação** | B4 (rótulos e Entrega recortada), C7 (recorte e resolução do PDF), C5 |
| 5 | **Verificador e textos** (Fase 3) | I1–I15 com avisos no objeto, B5 (por fazer vs erro), C1, C8, C9, D1, D2 |
| 6 | **Proteção** (Fase 5) | Estes cenários automáticos no CI, com uma planta sintética parecida com esta |
