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

## Verificação antes do PR 2

Leitura do código do cálculo, das associações e das normas, com sondas no navegador.

| # | Encontrado | Tipo | Estado |
|---|---|---|---|
| V1 | Mudar o nome de um espaço na Tabela deixava os terminais órfãos (balanço «0 terminais», ERRO) e as transferências com o nome antigo. | **cálculo** | corrigido (PR 2) |
| V2 | Era possível criar uma transferência de uma casa de banho (G4) para um espaço limpo. | **norma** (EN 16798-3) | corrigido (PR 2): recusada na Tabela e na planta; aviso nos dados antigos |
| V3 | A Verificação Normativa usava 5/6 m/s por rede; o dimensionamento usa 6/5/4/3 m/s por nível. Podiam dizer coisas diferentes. | coerência | corrigido: ambos usam `VMAX_NIVEL` |
| V4 | Na Tabela, o ΔP da transferência era guardado mas a área era calculada com 2 Pa. Listas de tipos diferentes na Tabela (4) e na planta (3). | cálculo / coerência | corrigido: área com o ΔP escrito; tipos do catálogo normativo; ΔP típico por tipo |
| V5 | Associar terminal ↔ ramal estava escrito em 7 sítios; 3 não verificavam a rede. | estrutura | corrigido: serviço único `VC.associacoes` |
| V6 | Um ramal podia pertencer a uma UTA (ou pai) de outra rede, sem aviso. | coerência | corrigido: aviso «Ramal noutra rede» |
| V7 | N vazio valia N = 1 em silêncio. | clareza / cálculo | **decidido**: N vazio = «por definir». O ar novo G1 é só T12 × A, com o aviso cinzento «Ocupação por definir» (por fazer, não é erro). N = 0 é uma escolha e não dá aviso. Os exemplos não mudam (todos têm N). |
| V8 | Dois históricos (desfazer da planta e histórico geral). | estrutura | fica para o PR 3 (gestor único) |
| V9 | A ligação espaço ↔ ramal é guardada duas vezes (`terminal.ramalRef` conta para o cálculo; `espaco.ramalRef*` é a rede do espaço). | estrutura | só muda pelo serviço único; tirar o campo duplicado exige migração (PR à parte) |

## PR 2 · Fluxo sem becos

| Falha | O que mudou |
|---|---|
| **A4** | O cartão do novo ramal cria a UTA (rede + nome) sem sair da planta; sem UTAs, a secção abre sozinha e diz porquê. |
| **Terminal (D)** | Numa sala sem terminais por colocar, cria o terminal no ponto clicado: rede (espaço sujo → só extração suja), caudal proposto pelo balanço ou pela norma, n.º. Cria a definição (fonte dos terminais) e associa ao ramal por baixo. |
| **Transferências** | Tipos do catálogo normativo com ΔP típico; botão «Inverter direção»; sentido sujo → limpo é recusado com explicação. |
| **B1** | «Calibrar a escala pela área» no cartão do novo desenho (aberto quando não há escala) e no da sala. |
| **C4** | N no cartão do novo desenho e no da sala; parcelas T11 × N e T12 × A com a maior realçada (Portaria 138-I: aplica-se o maior). |
| **C3** | «Terminais: X existem · Y criados agora» em vez de «0 criados». |
| **Nomes** | Espaço e ramal renomeiam-se na Tabela e no desenho, em cascata (V1). |
| Vocabulário | «Associar terminal ↔ ramal» em vez de «ligar». |
| Fica para depois | C2 (janelas nativas de confirmar/escrever fora da planta). |

## PR 3 · Regras da Portaria com a classificação G1–G4

Sem listas nem redes novas: a app já classifica os espaços em G1–G4 e o G4 é «Extração Dedicada» (princípio P4). O projetista pode forçar o grupo de um espaço com outra fonte de contaminação.

| Regra | Fonte | O que mudou |
|---|---|---|
| Espaço sujo = G4 | classificação da app, princípio P4 | Uma só definição (`VC.calculo.grupoDe`). Retirada a lista de nomes da Topologia, que contradizia o G1–G4 (punha o laboratório, G1, como sujo). |
| Nenhum ar transferido a partir de um G4 | Portaria 138-I, Anexo II, 1.2.2 f) | Recusa também WC → WC (antes só sujo → limpo). |
| G4 em depressão | 1.2.2 h) (instalações sanitárias); P4 e limites de pressão da app (cozinha, garagem) | Novo erro «G4 sem depressão» quando extração ≤ insuflação. |

Aplicado aos exemplos (que não são referência): o **degrade-2** tem 3 espaços G4 sem depressão — Garagem P0-N1 (412/412 m³/h), Apoio/Serviço P0-N1 e Apoio/Serviço P1-S (copa), do tipo Cozinha (227/227 e 423/423). O **poliune-v02** continua com 9 instalações sanitárias com falta de ar de compensação (balanço).

**Arrumo (arrecadação), decidido pelo autor:** fica G2. Tem extração, e o ar entra por insuflação direta ou por transferência (fresta de porta ou outro tipo previsto), mas **não cede ar transferido** (alínea f). Não é G4, por isso não exige depressão. Implementado com a marca `semArCedido` no tipo, no ficheiro de normas.

## PR 3 · Coerência com as normas (pontos 1–5)

| # | Incoerência | Fonte | Correção |
|---|---|---|---|
| 1 | **Arquivo** (G3) estava na lista de isentos e dava 0 m³/h, contra o próprio princípio P3 (T12 ou ACH ≥ 2) | normativo.js (P3) | Retirado dos isentos: 100 m² → 600 m³/h |
| 2 | **Garagem:** o caudal não seguia o RT-SCIE (por veículo) | Portaria 1532/2008 | Verificação, sem mudar o caudal calculado: número de lugares no cartão; sem lugares → «por fazer»; < 300 m³/h × lugares → erro; < 600 m³/h × lugares → atenção |
| 3 | **Rede de exaustão sanitária partilhada** com outros espaços | Portaria 138-I, Anexo II, 1.2.2 h) | Erro «Exaustão sanitária partilhada» |
| 4 | **Recuperação de calor com ar sanitário** sem aviso | SCE (perguntas frequentes) | Atenção: o projetista tem de garantir a não contaminação do ar novo |
| 5 | **Velocidade:** ERRO no cálculo e ATENÇÃO na Verificação Normativa | — | Os dois dizem NÃO CONFORME |

Validação: teste UI.T33 com casos calculados à mão; mutação «Arquivo volta a ser isento».

### Tabela 13 completa (texto fornecido pelo autor) — checagem final

| Linha | Portaria 138-I | App antes | App agora |
|---|---|---|---|
| Instalação sanitária privada, funcionamento contínuo | Máx(45; 10 × A) | igual | igual |
| Instalação sanitária privada, sem funcionamento contínuo | Máx(90; 10 × A) | igual | igual |
| Instalação sanitária pública | Máx[90 × (urinóis + sanitas + duches); 10 × A] | com um mínimo de 45 a mais; regime «intensivo» 125/aparelho inventado | igual à norma; «intensivo» retirado (projetos antigos passam à pública) |
| Balneário | Máx(90 × duches; 10 × A) | tratado como sanitária privada contínua | linha própria (só duches); sem duches → «por fazer» |
| Copa | 10 renovações/hora | não existia (copas como «Cozinha», 12/h) | novo tipo G4 |
| Armazenamento de resíduos | 10 renovações/hora | não existia | novo tipo G4 |
| Salas de cópias/impressão | 10 renovações/hora | não existia | novo tipo G4 |

- O regime e os aparelhos não se podiam indicar: agora escolhem-se no cartão da sala (sanitária: regime + urinóis/sanitas/duches; balneário: duches). Sem dados → «por fazer».
- Cozinha (12/h), garagem (6/h) e vestiário (8/h) **não constam da Tabela 13**: ficam como boa prática, com essa etiqueta (a garagem tem ainda a verificação do RT-SCIE).
- Nos exemplos, as copas estão com o tipo «Cozinha»: o projetista deve mudá-las para «Copa» (10/h, Tabela 13).
- Validação: testes N2.T5 e UI.T34 com as fórmulas da tabela; mutação «mínimo de 45 a mais».

## PR 5 · Valores de boa prática (decisão do autor)
Cozinha (12/h), vestiário (8/h) e garagem (6/h) não constam da Tabela 13. Os valores ficam como **boa prática**, e a app **alerta** («Caudal de boa prática por confirmar») até o projetista os confirmar no cartão da sala (botão «Confirmo este caudal», que se pode anular e desfazer). A garagem mantém também a verificação do RT-SCIE. Teste UI.T35.

## PR 6 · Gestos coerentes (plano da planta)
| Falha | Correção |
|---|---|
| D6 / B6 | Esc, Enter e Delete tratados num só sítio para todas as ferramentas (antes três tratamentos do Esc). |
| D2 | Esc limpa a seleção; Delete numa seta remove a transferência. |
| — | A desenhar (polígono, ramal), Delete/Backspace apaga o último vértice/ponto. Enter confirma: polígono, ramal, escala, transferência (também no campo do caudal), terminal. |
| D5 | Trocar de ferramenta com um pendente é recusado com aviso (confirmar com Enter ou cancelar com Esc). |
| B3 | Mudar de passo limpa a seleção e os pendentes da planta. |
| C6 | Depois de criar um ramal, a ferramenta Ramal mantém-se. |

Validação: teste UI.T36 e mutação (D5); cenário só com teclado e rato reais. **Fica para depois:** um só histórico (o desfazer da planta e o histórico geral ainda são dois, V8/D3) e a substituição das escutas de rato espalhadas por um gestor único (refactor interno, sem mudança de comportamento).

