# VentiCondutas

Dimensionamento de redes de ventilação (condutas, terminais e UTAs), de baixo para
cima: espaços → terminais → ramais → UTAs. Caudais pela Portaria 138-I/2021 e
verificação Ecodesign (Reg. (UE) 1253/2014). Funciona no navegador, sem servidor
nem instalação: basta abrir o `index.html`.

## Estrutura

| Pasta | O quê |
|---|---|
| `conhecimento/` | Base de conhecimento (dados, não código): tabelas normativas, catálogo de terminais, curvas de ventiladores, glossário, textos de ajuda |
| `src/core/` | Núcleo de cálculo. `01-fundamentos` (física ISA/ar húmido, normas, estado, `VC.constantes`), `02-biblioteca` (catálogo, balanço de ar, transferências), `03-dimensionamento` (caudais, condutas, Δp, UTAs, auditoria) |
| `src/modulos/` | Relatórios, exportações (PDF/Excel/CSV/JSON), caderno de encargos, testes internos, exemplos, topologia, histórico, URL |
| `src/ui/` | Interface: menu de passos, diagramas, editores (tabelas, ajudas, balanço), arranque, componentes |
| `src/etapas/` | Ecrãs das etapas: requisitos, associação, construtor visual, UTAs, transferências, árvore, lentes |
| `css/` | `venticondutas.css` (estilos da app) e `construtor-visual.css` |
| `exemplos/` | Projeto de exemplo em JSON |
| `tools/` | Verificação automática e fotografia contra regressões |
| `docs/` | Inventário de funcionalidades (o que está implementado e o que está só previsto) |

Os scripts são carregados pelo `index.html` por ordem. Cada um junta-se aos
espaços de nomes globais `VC` e `VC6`.

## Convenções

- **Redes:** `insuflacao`, `extracao`, `extracao_suja`. A rede decide o lado do
  balanço; o nome do terminal não conta.
- **Níveis dos ramais:** N1 Principal · N2 Secundário · N3 Terciário · N4 Terminal.
  Os nomes (`R1`, `R1.1`, `R1.1.1`…) são só nomes; a hierarquia vem de `parente`.
- **Caudal de um ramal** = soma dos seus terminais e sub-ramais. **Caudal de uma
  UTA** = soma dos ramais raiz que serve.
- **Perdas de pressão:** Δp troço (o próprio ramal) · Δp acumulado (da UTA até ao
  fim do ramal) · Δp crítico (o maior acumulado a jusante).
- **Velocidade máxima** por nível: `VC.constantes.VMAX_NIVEL` (6 / 5 / 4 / 3 m/s).
- **Secção** circular ou retangular: escolha do utilizador. A app só avisa quando
  o Ø não cabe na altura disponível.
- **Valores de projeto** (limites, tolerâncias, limiares legais): em
  `VC.constantes`, com a fonte em comentário.
- **Versão:** só em `VC.versao` (`01-fundamentos.js`).

## Verificar antes de entregar

```bash
npm install
```

```bash
npx playwright install chromium
```

```bash
npm run verificar
```

Arranca a app sem janela e corre os testes internos, a auditoria do exemplo, os 15
relatórios, as exportações, a procura de funções em falta e um percurso por todos
os ecrãs.

```bash
npm run regressao
```

Compara tudo o que a app produz (cálculo, relatórios, ecrãs, funções, botões,
testes) com `tests/fotografia-referencia.json`. Se uma alteração muda o resultado
**de propósito**, grava-se a nova referência e faz-se commit dela:

```bash
npm run referencia
```

```bash
npm run mutacoes
```

Volta a pôr na app, um a um, os 17 erros corrigidos na v11.1 e confirma que o teste
que vigia cada um passa a falhar. Um teste que não reage ao seu erro não protege nada.

```bash
npm run testes
```

Corre os três: verificar, regressão e mutações. É o que o GitHub corre em cada pull
request (`.github/workflows/verificar.yml`).

Para comparar só durante uma alteração local, sem mexer na referência:

```bash
npm run fotografia
```

```bash
npm run comparar
```

```bash
npm run lint
```
