# Decisões — Painel AG

Registro ADR-leve. Cada decisão não-trivial vira material de defesa de portfólio.

---

## 2026-06-14 — [apresentacao] Módulo de observações por página

**Problema:** o BPO precisa anotar observações por seção do relatório (citando valores) que apareçam na apresentação enviada ao cliente.
**Decisão:** observação de texto livre por slideId, persistida por cliente (`apresentacao-comentarios-v1` via `useEstadoSincronizado`/`useComentarios`), passada no payload e renderizada num callout "Observação do analista" no rodapé de cada slide. Texto escapado em HTML (`\n`→`<br>`) — render seguro via innerHTML.
**Por quê texto livre (e não referência clicável a valor):** MVP de baixo risco que já cobre "observar por página + citar valores"; referência ancorada a um valor específico fica para v2.
**Consequências:** a apresentação precisa ser re-exportada após escrever as observações (o HTML é congelado na geração). Modularização recente (estilos/runtime) facilitou plugar o callout em 1 ponto (render loop).
**Como explicar (30s):** "Camada de comentários por seção persistida por cliente, espelhada no slide correspondente da apresentação; texto escapado para evitar XSS no HTML exportado."

## 2026-06-14 — [dados] Piso de maio/2026 para ACME 27 e 36

**Problema:** as duas empresas atuais (tenants ACME 27 `00000000-…` e ACME 36 `00000000-…`, confirmadas em `painel_clientes`) deviam considerar dados só a partir de maio/2026.
**Decisão:** `PISO_DADOS_POR_CLIENTE` em `core/tenant.ts` (mapa tenant→ISO) + `aplicarPisoDados` em `core/periodo.ts`, aplicado no `MovimentosProvider` (runtime guard) em ambos os caminhos (sync e fallback).
**Por quê runtime (e não ingestão):** garante que pré-maio nunca aparece — nem o usuário limpando o filtro vê — sem risco de deploy de edge function. Higiene de banco (não ingerir da Omie) fica como follow-up.
**Suposição sinalizada:** ano = 2026 (inequívoco no contexto; dados são 2026, base dos relatórios Abril/2026). Se for outro mês/ano, é trocar a constante.
**Como explicar (30s):** "Piso de dados por tenant no provider de runtime: filtro determinístico e à prova de bypass, centralizado numa constante, sem mexer na ingestão."

## 2026-06-14 — [apresentacao] Espelhar relatórios do app na apresentação HTML

**Problema:** a apresentação exportada tinha menos conteúdo que a aba Relatórios.
**Decisão:** adicionei 4 slides (Receita, Custos, Capital de Giro, Neutros) + KPIs completos (6→10), REUSANDO as mesmas funções puras dos relatórios (`custosDetalhe`, `fontesReceita`, `receitaPorCliente`, `aging`, `prazosMedios`, `crescimento`, `valorLinha`) em `montarPayload`.
**Por quê reuso (e não recálculo):** número financeiro não se reinventa — reusar a mesma função garante paridade exata com o app.
**Risco tratado:** o JS dos slides vive numa template string não-tipada (tsc não enxerga). Mitigado com `node --check` no JS extraído + auditoria de nomes payload↔JS, além do build.
**Consequências / dívida:** Filiais e Comparativo ficaram de fora — precisam de input novo no payload (centros+contrapartes; movimentos não-filtrados). Sinalizado.
**Como explicar (30s):** "Estendi o gerador reusando as funções de cálculo dos relatórios, então os números da apresentação são os mesmos do app por construção. Validei o JS não-tipado com node --check além do build."

## 2026-06-13 — [design] Design System v3 "Sóbrio" (alinhado ao PULSAR-RH)

**Problema:** identidade "gamer" (glow-pulse, orbs com blur(90px), radar 3D, boot splash dramático, neon, 4 fontes, sons sempre ligados). Cliente quer equilíbrio corporativo mantendo a marca roxa.

**Decisão:** cristalizar na origem o mesmo spec aplicado ao PULSAR-RH: roxo `#401C7F` só acento, base sóbria, hairline; **Inter única** (mata Author/Chillax/Clash no `tailwind.config` + `index.html`); efeitos neutralizados via tokens fx zerados (`--fx-neon-alpha/edge/sheen/grid`) + bloco neutralizador sem `@layer` no fim do `src/index.css`; boot splash removido do `App.tsx`; sons OFF por padrão (opt-in `pulsar-som='1'`, ganhos −50%) em `src/lib/som.ts`.

**Por quê edição de origem (e não skin como no RH):** ag-painel centraliza tokens num `src/index.css` + Tailwind e tem build (`tsc -b && vite build`) que valida na hora — editar a fonte é mais limpo e seguro. No RH, com `:root` inline redeclarado em 5 HTML de produção, a skin reversível teve menos risco.

**Consequências:** keyframes "gamer" antigos permanecem definidos mas inertes (override por cascata) — dívida menor, removível depois. Build validado (207 módulos, 0 erro de tipo). `BootSplash.tsx` virou órfão (mantido para rollback).

**Como explicar em entrevista (30s):** "Unifiquei a identidade visual das duas apps num design system sóbrio. No app React cristalizei nos tokens e validei com o build; no legado em HTML usei uma camada de cascata reversível. Mesma spec, mecanismo adequado a cada arquitetura."

---

## 2026-06-07 — [demonstrações] DRE/DFC como estruturas editáveis (2ª camada de conciliação)

**Problema:** A DRE/DFC dependiam de etiquetas fixas (papelDRE/atividadeDFC) no plano de
contas — mesma demonstração para todo cliente. Precisávamos personalizar por cliente sem
perder o padrão.

**Opções consideradas:**
- A) Manter DRE/DFC derivadas direto das etiquetas do nó. Contras: zero personalização.
- B) Estruturas DRE/DFC próprias e editáveis, com mapa grupo→linha; o padrão (etiquetas dos
  MDs) apenas SEMEIA o mapa. Contras: 2ª camada de conciliação, mais estado.

**Decisão:** Opção B. `core/demonstracao.ts` (linhas padrão dos MDs + `mapaPadrao` semeado
pelas etiquetas + `calcular` em cascata), `lib/useDemonstracoes.ts` (persistência própria
`painel-ag-demonstracoes-v1`), `DemonstracaoEditor` (alocação grupo→linha drag/select),
aba "Editar DRE/DFC". Pipeline: categoria→grupo (Modelo AG) → grupo→linha (este módulo).

**Por quê:** O cliente remapeia grupos nas linhas da demonstração sem tocar no plano de contas
nem perder o padrão (restaurável). Subtotais (Receita Líquida, EBITDA…) são soma em cascata —
não precisam ser editados. Mantém personalização dentro de um molde controlável.

**Consequências:** O **resultado** (aba Painel) ainda lê das etiquetas; o próximo passo é fazê-lo
ler dessas estruturas editáveis (o editor já mostra o resultado inline por linha). Adicionar/
remover/renomear linhas pode vir depois; hoje personaliza-se o mapa (remapear) + restaurar.

**Como explicar em entrevista (30s):** "A DRE virou uma segunda conciliação: o grupo do plano de
contas é alocado numa linha da demonstração. O padrão dos MDs semeia o mapa pelas etiquetas, mas
cada cliente remapeia — personalização dentro de um molde, com restaurar padrão a um clique."

---

## 2026-06-07 — [painel] DRE/DFC como projeção do Modelo AG; sinal pela natureza crua

**Problema:** Gerar o painel pronto (DRE/DFC) a partir do Modelo AG conciliado, sem fabricar
valores e respeitando o "100% cru".

**Opções consideradas:**
- A) Pedir ao usuário marcar o sinal (entrada/saída) de cada conta. Contras: trabalho manual,
  fonte de erro, redundante com dado que já existe.
- B) Derivar o sinal da **natureza crua** do lançamento (R = entrada +, P = saída –) e somar por
  papel DRE / atividade DFC das etiquetas do nó conciliado. Contras: assume a convenção P/R do Omie.

**Decisão:** Opção B. `lib/resultado.ts` projeta DRE (waterfall) e DFC (caixa) do
`modelo.contas`. Sinal = natureza do movimento; linhas calculadas (Receita Líquida, MC, EBITDA,
EBIT, Resultado Líquido) são somas em cascata dos papéis. Neutros (Regra Mãe) e não-conciliados
ficam fora. DFC usa só `liquidado='S'` (regime caixa). Nova aba "Painel (DRE/DFC)".

**Por quê:** O resultado é uma PROJEÇÃO do editado, não um dado novo. O sinal não é inventado —
vem da natureza que o Omie já fornece. Isso mantém o "100% cru" (valores intactos) e ainda
entrega a demonstração. Banner de cobertura mostra quanto ainda falta conciliar (transparência).

**Consequências:** DRE só fica correta conforme a conciliação avança (banner sinaliza o %).
Resultado Financeiro depende da natureza dos lançamentos internos (receita fin. R, despesa fin. P).
Materialidade/depreciação/competência fina (provisões) ficam para fases seguintes.

**Como explicar em entrevista (30s):** "A DRE não é uma tabela nova: é uma projeção da
conciliação. Cada conta tem papel na DRE e o sinal vem da natureza crua do lançamento — não
invento entrada/saída. Linhas como EBITDA são somas em cascata; o que não foi conciliado fica
de fora e o painel mostra o quanto falta."

---

## 2026-06-07 — [edição] Camada de overrides separada (GET imutável → PUT → projeção)

**Problema:** Renomear categorias e contrapartes sem corromper o dado do Omie, mantendo
origem × ajustado visível (spec §9) e fazendo os resultados saírem do dado editado.

**Opções consideradas:**
- A) Mutar o dado (editar o seed/JSON do Omie no lugar). Prós: simples. Contras: perde a
  fonte de verdade, impossibilita mostrar o original e reverter, e mistura GET com edição.
- B) Camada de overrides à parte (localStorage) + resolvedor central via Context. O seed do
  Omie é read-only; o app consome a projeção (cru + override). Contras: mais peças.

**Decisão:** Opção B. `core/override.ts` (tipos), `lib/resolvedor.ts` (projeção pura),
`lib/overrides.tsx` (Context + persistência, chave própria `painel-ag-overrides-v1`),
`NomeEditavel.tsx` (renomear inline + badge "editado" + reverter). Resolvedor consumido em
Valores, Fornecedores, Modelo e drill-down — todos exibem o nome ajustado.

**Por quê:** É o pipeline pedido: GET (Omie, imutável) → PUT (override local) → o sistema só
enxerga o "GET pós PUT". O cru nunca é tocado, então sempre dá para mostrar o que mudou,
reverter, e auditar origem × ajustado. Resultados (conciliação, futura DRE/DFC) saem do editado.

**Consequências:** Renomear é camada de identidade (não move valor entre grupos — isso é a
conciliação, já separada). Overrides em localStorage por ora (migra p/ backend na Fase 0).
Escopo assumido de "título": nomes de categoria + contraparte. Título financeiro individual
(por documento) ainda não é editável — adicionar nova entidade se necessário.

**Como explicar em entrevista (30s):** "O dado do ERP é imutável. Edições vivem numa camada
à parte e um resolvedor central projeta original→ajustado. O app lê só a projeção, então
sempre mostro o que mudou e reverto, e os relatórios saem do editado, não do cru corrompido."

---

## 2026-06-06 — [modelo] DRE/DFC como metadado do nó, não tabela paralela

**Problema:** Os docs oficiais (`Especificacao_Sistema_PainelAG_DEV` §4.3/§5.1,
`Complemento_DEV_DRE_DFC_Depreciacao_AG` §1/§2/§7) definem que cada conta tem papel na
DRE e atividade na DFC, com Regra Mãe (neutralização) e intercompany. Precisávamos
representar isso sem criar uma segunda fonte de verdade que divergisse da conciliação.

**Opções consideradas:**
- A) Tabelas DRE/DFC separadas, mapeadas à estrutura por fora. Prós: separação clara.
  Contras: duas estruturas para manter sincronizadas; a realocação por cliente teria de
  atualizar as duas → fonte de divergência (viola DRY/SRP).
- B) Etiquetar cada nó de contas com `meta` (papelDRE, atividadeDFC, neutra, intercompany).
  Prós: fonte única; DRE/DFC viram projeção da conciliação; recálculo em cascata
  (Complemento §5.1) é natural. Contras: acopla metadado contábil ao nó genérico.

**Decisão:** Opção B. `No.meta?: MetaContabil` (só preenchido na dimensão contas).
Estrutura realinhada ao waterfall AG: 12 grupos / 62 subgrupos, 6 grupos neutros,
2 subgrupos intercompany. Etiquetas exibidas em cada grupo na aba de conciliação.

**Por quê:** A DRE/DFC devem CAIR da estrutura que a equipe concilia. Quando uma conta é
realocada, o relatório recalcula sozinho — não há segunda tabela para dessincronizar.
O metadado opcional não afeta a dimensão de fornecedores (meta ausente = sem etiqueta).

**Consequências:** Módulo 5 (DRE/DFC) agora deriva direto de `papelDRE`/`atividadeDFC`.
Linhas calculadas (Receita Líquida, MC, EBITDA, EBIT, Resultado Líquido) NÃO são nós —
são subtotais que o módulo 5 computa a partir dos papéis. Chave localStorage v3→v4
(estrutura mudou; conciliações de teste anteriores são descartadas). Docs com nomes de
cliente NÃO foram commitados (repo público) — só o modelo abstrato entrou no código.

**Como explicar em entrevista (30s):** "Em vez de modelar a DRE como uma tabela separada,
etiquetei cada grupo de contas com seu papel na DRE e na DFC. Assim o relatório é uma
projeção da conciliação: quando a equipe realoca uma conta, a DRE recalcula em cascata,
sem uma segunda fonte de verdade pra divergir. É DRY e SRP aplicados ao domínio contábil."

---

## 2026-06-06 — [base] Checkpoint módulos 1–4 + roadmap

**Problema:** App reconstruído do zero precisa de um marco claro de "até onde foi" e
de uma ordem de fases acordada, antes de seguir para relatórios (DRE/DFC) ou backend.

**Opções consideradas:**
- A) Seguir direto para o módulo 5 (DRE/DFC). Prós: entrega visual rápida.
  Contras: constrói relatório sobre dado que mora só no localStorage do navegador.
- B) Fazer backend + multi-empresa primeiro (Fase A). Prós: resolve o gargalo real
  (compartilhamento/persistência). Contras: mais lento até a próxima entrega visível.

**Decisão:** Marcar checkpoint dos módulos 1–4 e documentar o roadmap em
`docs/roadmap.md`. A escolha A vs B fica explícita e pendente de confirmação do
Ricaliff — não foi tomada ainda.

**Por quê:** O risco de avançar para DRE sem persistência compartilhada é entregar um
protótipo bonito que não vira produto de BPO (equipe não enxerga o trabalho um do
outro). Tornar a bifurcação explícita evita escolher por inércia.

**Consequências:** Próximo passo é decidir Fase A (backend) ou Fase C (DRE). Enquanto
isso, persistência segue em localStorage — dívida assumida e rastreada no roadmap.

**Como explicar em entrevista (30s):** "Antes de construir o relatório financeiro
final, parei pra mapear que o dado estava só no navegador. Construir DRE sobre base
volátil é dívida disfarçada de progresso — então registrei a decisão de priorizar
persistência compartilhada como bifurcação consciente, em vez de seguir pelo caminho
visualmente mais atraente."

## 2026-06-08 — [infra] Persistir só a camada editada no Supabase

**Problema:** Conciliação do Modelo AG, overrides de nomes e config DRE/DFC viviam
só no `localStorage` de um navegador — sem compartilhamento entre o time BPO nem
durabilidade. O cru da Omie é snapshot bundlado e imutável.

**Opções consideradas:**
- A) Migrar tudo (cru + editado) para Supabase e o frontend ler async. Contra:
  refatora todos os painéis (hoje import síncrono), risco de regressão alto, e o
  cru não muda em runtime — custo sem retorno.
- B) Persistir só o editado no Supabase; cru continua bundlado. A favor: entrega o
  valor real (estado compartilhado) com baixo risco e respeita a separação
  cru/editado já existente.

**Decisão:** B. Tabela única `painel_estado(chave, dados jsonb, atualizado_em)`,
um documento por camada. Hook genérico `useEstadoSincronizado` substitui o trio
`useState`+`useEffect`-localStorage dos três hooks (DRY): hidrata do remoto no mount
e só persiste após hidratar (ref-guard), pra nunca sobrescrever o remoto com estado
local obsoleto. `localStorage` vira cache de boot/offline.

**Por quê:** O ganho do Supabase aqui é colaboração durável, que é exatamente o
"editado". Tornar o imutável async seria pagar custo de arquitetura por dado que
nunca muda em runtime (YAGNI). RLS aberta para `anon` (ler+escrever) porque o app é
público sem login — decisão consciente do Ricalfiff; service_role só server-side.

**Consequências:** edição feita numa máquina aparece em todas. Dívida assumida:
sem login, qualquer um com a URL pode editar o estado compartilhado — mitigar depois
com Google OAuth (`hd=example.com`) antes de divulgar a URL. DDL aplicado
via conexão direta IPv6 (`scripts/supabase-schema.ts`), não via CLI.

**Como explicar em entrevista (30s):** "Separei dado imutável de estado mutável
colaborativo. Hospedei no Supabase só o que muda e precisa ser compartilhado, com um
hook de sincronização que hidrata antes de persistir pra não sobrescrever o servidor
com cache velho. Não paguei o custo de tornar tudo async só pra hospedar dado que
nunca muda — YAGNI aplicado conscientemente."

## 2026-06-08 — [ui] Tema dark/light via CSS variables (canais RGB)

**Problema:** Tokens de cor eram hex fixos no tailwind.config — impossível ter modo
claro sem duplicar todas as classes. O código já usa modificadores de opacidade
(bg-primary/40, bg-warn/10), que precisam continuar funcionando.

**Opções consideradas:**
- A) Duplicar classes (dark:bg-x) em cada componente. Contra: muda dezenas de
  arquivos, polui o JSX, fácil esquecer um.
- B) Tokens como CSS variables em **canais RGB** (`--c-primary: 112 72 232`) e
  Tailwind referenciando `rgb(var(--c-x) / <alpha-value>)`. Troca de tema = trocar
  uma classe no <html>; nenhum componente muda.

**Decisão:** B. `:root` = dark (dark-first), `.light` sobrescreve. Hook `useTema`
persiste e respeita `prefers-color-scheme` no 1º load.

**Por quê:** Canais RGB (em vez de hex) preservam o `<alpha-value>` do Tailwind, então
`bg-primary/40` continua válido. Uma fonte de verdade pra cor; tema vira troca de
classe. Zero mudança nos componentes existentes.

**Consequências:** novo token entra só no index.css. `body * { transition }` dá
transição suave de tema (custo visual mínimo). Restaurar/migrar cor é trivial.

**Como explicar em entrevista (30s):** "Theming por CSS variables em canais RGB, não
hex — assim o modificador de opacidade do Tailwind continua funcionando e o tema é só
uma classe no html. Evitei duplicar dark: em cada componente: uma fonte de verdade."

## 2026-06-08 — [arq] Multi-tenant row-level (Clientes) por prefixo de chave

**Problema:** Os módulos rodam só pro Acme; precisam servir vários clientes da AG,
cada um com sua modelagem (conciliação, DRE/DFC), sem misturar.

**Opções consideradas:**
- A) Banco/projeto Supabase por cliente. Contra: custo operacional alto (migrations,
  chaves, deploy) pra equipe enxuta; provisionar cliente vira processo.
- B) Multi-tenant row-level num schema só: tabela `painel_clientes` + estado editável
  isolado por chave `cliente:<id>:<base>` em `painel_estado`, RLS protegendo.

**Decisão:** B. Cliente ativo no topo; hooks compõem a chave pelo cliente ativo via
`useChaveCliente`. Acme = tenant âncora (id fixo, não deletável), com migração das
chaves antigas pro seu prefixo. Dado cru da Omie segue Acme (sync por cliente é fase
seguinte).

**Por quê:** Isolamento por linha é o padrão mais barato e simples (KISS/YAGNI). Criar
cliente = um insert; trocar = um select. `useEstadoSincronizado` virou key-scoped e
seguro na troca (reseta + re-hidrata, nunca vaza estado de um cliente pra chave de outro).

**Consequências:** cadastro/edição/exclusão de clientes hoje é público (login ainda
off) — apertar quando o gate Google entrar (RLS por `authenticated`/tenant). Dados crus
por cliente exigem sync Omie por tenant (pendente).

**Como explicar em entrevista (30s):** "Multi-tenancy row-level: um schema, isolamento
por chave e RLS. O estado de cada cliente vive sob um prefixo; o hook de sync é
key-scoped e reseta na troca pra não vazar entre tenants. Evitei banco-por-cliente —
custo que não se paga numa equipe enxuta."

## 2026-06-08 — [relatorios] Construir só relatório com dado real; gatear o resto

**Problema:** Os relatórios-alvo (imagens do cliente) incluem vários que precisam de
dado que a base Omie + modelagem não tem: orçamento (Previsto×Realizado, DRE Gerencial),
segmentação por unidade de negócio e drivers (volume/preço/mix/câmbio), estoque (PME),
matriz qualitativa de riscos.

**Opções consideradas:**
- A) Preencher tudo com números plausíveis/placeholder. Contra: viola a regra "100% cru,
  sem inventar" — relatório financeiro falso é pior que ausente.
- B) Construir cada relatório que sai de dado real (Custos, Receita parcial, Capital de
  Giro parcial, DRE, DFC, Dashboard) e catalogar os demais marcando exatamente o dado que
  falta.

**Decisão:** B. Camada de cálculo pura (`lib/relatorios.ts`) + um componente por relatório.
Receita e Capital de Giro entram **parciais** (o que é real agora) com bloco explícito do
que falta. Previsto×Realizado e DRE Gerencial ficam fora até haver orçamento.

**Consequências:** entregamos valor real já; o catálogo (“Visão Geral”) vira o roadmap
honesto. Dívida: quando vier orçamento/segmentação/estoque, plugar nos pontos marcados.

**Como explicar em entrevista (30s):** "Preferi cobertura honesta a dashboard bonito.
Cada relatório só existe se a base sustenta; o que falta de dado está rotulado no produto,
não escondido com número inventado."

## 2026-06-08 — [config/sync] Sync manual da Omie via Edge Function (valor-only)

**Problema:** O sistema antigo fazia sync automático diário — carga desnecessária. Queremos
atualização manual, por cliente, sem alterar classificação/edições, só valores; registro novo
vai pra "A conciliar".

**Opções consideradas:**
- A) Sync no frontend chamando a Omie direto. Inviável: expõe OMIE_APP_SECRET + Omie não dá CORS.
- B) Edge Function (Deno) server-side que o app dispara. Secret fica na função; app só invoca.

**Decisão:** B. Função `sync-omie` puxa ListarMovimentos, mescla **só campos de valor** por
idTitulo (categoria/contraparte intactos → classificação preservada; título novo entra inteiro
e cai em "A conciliar" porque sua categoria não está mapeada) e grava o doc cru em
`painel_estado` (`cliente:<id>:movimentos-raw`). Merge é função pura testada
(`core/sincronizacao.ts`), espelhada na função por isolamento do Deno.

**Consequências:** o cru passa a viver no Supabase (antes era JSON bundlado). **Falta** (pivot
de arquitetura, fora do autônomo): (1) deploy da função + secrets; (2) rewire do `useResultado`
pra ler movimentos do Supabase com fallback ao seed; (3) 1ª execução real pra validar a função.

**Como explicar em entrevista (30s):** "Sync de ERP é server-side por definição — secret e CORS.
Fiz uma Edge Function que mescla só valores, preservando a classificação que vive numa camada
separada; o dado novo entra desclassificado. Manual em vez de cron diário: menos carga, sob demanda."

## 2026-06-09 — [relatórios] Módulo de periodização, filtragem e projeção

**Problema:** Relatórios mostravam só o total acumulado. Precisávamos de recorte mensal/por data
livre e de séries contínuas para evolução e previsão.

**Opções consideradas:**
- Filtro global na topbar (afeta o app todo) vs. filtro só no módulo de Relatórios.
- Regime competência, caixa, ou ambos (toggle).
- Refatorar cada relatório p/ receber dados por props vs. um contexto que o `useResultado` lê.

**Decisão:** Filtro **só em Relatórios**, via um `PeriodoProvider` que envolve o subtree; o
`useResultado` lê `usePeriodoOpcional()` e filtra os movimentos na origem. Regime **com toggle**
(competência=emissão / caixa=só liquidado, ancorado no vencimento como proxy). Projeção com
**seletor** (tendência linear por mínimos quadrados / média móvel) e horizonte 3/6/12m. Núcleo puro
em `core/periodo.ts` + `core/serie.ts` (17 testes).

**Por quê:** filtrar na origem (`movimentos`) faz espelho → DRE/DFC → gráficos periodizarem de uma
vez, sem tocar relatório por relatório. Contexto com default "tudo/competência" deixa o resto do app
idêntico. Decisão isolada no módulo = menor blast radius.

**Consequências:** caixa usa **vencimento** como proxy da data de baixa (a Omie não traz a baixa
aqui) — documentado e sinalizado na UI. Só 40% dos lançamentos do seed têm data: período e projeção
cobrem esse subconjunto e a UI avisa (% com data). Projeção é sempre estimativa (tracejado), nunca
dado real. Dívida: trazer data de liquidação real no sync da Omie destrava caixa fiel + tendência.

**Como explicar em entrevista (30s):** "Periodizei filtrando os movimentos na origem do pipeline,
então tudo a jusante recalcula sozinho. O filtro vive num contexto que envolve só o módulo, com
default neutro pra não afetar o resto. Competência e caixa por toggle, e a previsão é regressão
linear ou média móvel — sempre rotulada como estimativa, sem inventar número."

---

## 2026-06-09 — [design-system] Aplicação do DS Lúmen Finance + auditoria de aderência

**Problema:** ao adotar o design system Lúmen Finance como fonte de verdade visual, era preciso (a) confirmar a integração de tokens e (b) varrer o app por violações das regras inegociáveis (botões sem sombra, pt-BR, mapa semântico de cor, regra de ouro).

**Diagnóstico:** a fundação **já estava integrada** (tokens `--c-*` em canais RGB dark+light, Inter, `rounded-card`, animações com easing `cubic-bezier(.22,1,.36,1)`) — o app nasceu sobre o Claude Design §15, que é o mesmo sistema. Uma auditoria multi-arquivo encontrou **27 violações** (3 ALTA, 11 MÉDIA, 13 BAIXA).

**Decisões e correções aplicadas:**
- **Botões sem sombra (3 ALTA):** removida `shadow-*` de Login, Sincronizar e item de nav ativo da Sidebar. Login e Sincronizar passaram ao gradiente `primary→secondary` com `hover:opacity-90` (padrão do DS); `hover:scale` trocado por fade no easing único.
- **pt-BR em percentual:** `pct()` estava triplicado (DRE, Custos, indicadores) com `Math.round/10` → renderizava `58.3%` (ponto). 3º uso aciona DRY → extraído `pct(n, base)` único em `lib/money.ts` (vírgula, 1 casa, `—` quando base 0). `relatorios.ts` passou a formatar `pctReceita` como string no view-model `LinhaValor` (testes atualizados ao novo contrato).
- **Mapa semântico de cor:** Receita Bruta/Líquida `primary→accent` (entrada = verde); Resultado/Margem Líquida positivo `accent→primary` (lucro = roxo/marca) — separa hierarquia entrada→resultado.
- **Hex hardcoded → tokens:** charts `LinhaTempo` e `RelatorioEvolucao` passaram de `#7048E8/#08C16A/#FF5C5C` para `rgb(var(--c-primary|accent|danger))`, consistente com o `stroke="rgb(var(--c-bd))"` já usado nos SVGs.
- **Fundação completada:** + `--c-info` (6ª cor de gráfico), `anim-stagger`, bloco `prefers-reduced-motion` (acessibilidade, exigida pelo MOTION_GUIDE).
- **Login:** virou card (`anim-pop` de overlay) com inputs em `surface2`.

**Não corrigido (decisão consciente, fica como dívida/escolha):**
- Ícones de nav fora do set funcional (Sidebar `☰ ≣ ◷ ◑ ◈ ▦ ▤ ⚙`, etc.) — trocar todos é mudança estética grande; o DS tolera e sugere Lucide como adição explícita.
- `drop-shadow` em SVG de Logo/Donut — não são botões; o DS só proíbe sombra em botões.
- Paleta do Donut com 4 cores além das 6 canônicas — tolerado para densidade de fatias.
- `corResultado()` usa accent/danger por sinal — defensável (DS mapeia accent=success, danger=error).

**Pendente real (não fabriquei):** a DRE é cascata **plana**; torná-la "expansível" (linha de grupo abrindo a composição) exige os dados de composição por linha, ausentes no DTO atual. Sem inventar estrutura — destrava quando a linha carregar seus componentes.

**Validação:** `tsc --noEmit` limpo, 29 testes passando, `vite build` OK.

**Como explicar em entrevista (30s):** "Antes de aplicar o design system, rodei uma auditoria de aderência que achou 27 desvios. Os críticos eram botões com sombra e formatação de porcentagem fora do pt-BR. Corrigi extraindo um helper único pra porcentagem (a lógica estava triplicada com o mesmo bug) e alinhei a cor ao significado financeiro — receita em verde, lucro em roxo. O que dependia de dado que não temos, como a DRE expansível, deixei explicitamente de fora em vez de inventar."

## 2026-06-10 — [modelo] Matriz de Classificação AG vira motor de sugestão (nunca auto-conciliação)

**Problema:** chegou a Matriz de Classificação do coordenador do BPO (79 contas de origem, 11 premissas de erro R1–R11, árvore Omie corrigida). Como parametrizar o "Modelo AG" com ela?
**Opções consideradas:** A) auto-conciliar quando a regra casa (rápido, mas replica erro de origem com selo nosso); B) só atualizar o plano padrão (perde o conhecimento das 79 linhas); C) plano padrão atualizado + motor de sugestão por stem com chip clicável e alerta de premissa.
**Decisão:** C. `core/matriz-classificacao.ts` (dados puros: PREMISSAS R1–R11, REGRA_MAE, ~70 regras stem→nó) + chip "✨ sugestão" na lista A Conciliar; premissa vira ⚠ com tooltip. Plano padrão ganhou IPI, bonificações, ressarcimento/perda por erro (KPI não-qualidade), recuperações, 13º, 3 provisões só-DRE (11,11%/8,33%/encargos), cartão de crédito (R4), consórcios e grupo 12 Contas Transitórias (adiantamentos + impostos a recuperar — DFC sem DRE). Removidos os duplicados que violavam a própria matriz: adm_tarifas (→fin_tarifas) e com_frete_venda (→cv_frete, R11), com `MIGRACAO_NOS` aplicada no load para de-paras salvos não sumirem.
**Por quê:** a matriz existe porque a classificação de origem é não-confiável (R1–R11 são padrões de ERRO) — auto-aplicar replicaria o erro. Sugestão mantém o coordenador como decisor, alinhado à premissa do produto (edição separada do cru).
**Consequências:** conciliação ganha velocidade sem perder controle; premissas aparecem como educação contábil in-loco; dívida: regras são por nome (stems) — quando houver 2º cliente com nomes muito diferentes, avaliar de-para por código de categoria Omie.
**Como explicar em entrevista (30s):** "Codifiquei a matriz do coordenador como dados puros — 70 regras de prefixo de palavra e 11 premissas de erro. O motor sugere e alerta, mas nunca aplica sozinho, porque a matriz existe justamente para corrigir classificação de origem errada; automatizar a aplicação automatizaria o erro."

## 2026-06-10 — [conciliação] Menu de contexto com vistas internas (não popover aninhado)

**Problema:** navegação na Matriz de Classificações era só arrastar/select; botão direito fazia uma única coisa (renomear).
**Opções consideradas:** A) submenus hover aninhados (desktop-like, frágil em web: viewport/z-index/hover-intent); B) menu que troca de VISTA internamente (ações → mover → renomear) no mesmo overlay.
**Decisão:** B. `MenuContexto.tsx` com `AlvoMenu` discriminado (item pendente/conciliado/nó) + `MenuFormularios.tsx`. Ações por alvo: aplicar sugestão ✨, conciliar/mover com filtro, ver movimentos (MovimentosModal + faixa de KPIs), renomear item E grupo (`renomearNo` novo no useModelo — só rótulo, id/meta intactos), recolher/expandir, desconciliar em massa. Botão "Aplicar N sugestões sem alerta" aplica só sugestões sem premissa R1–R11.
**Por quê:** mesma UX com 1/3 da complexidade; popover aninhado é o componente mais bugado da web. Lote exclui ⚠ porque premissa = padrão de erro conhecido — exige olho humano.
**Consequências:** MenuEdicao.tsx absorvido/deletado; collapse é estado de sessão (sem storage — YAGNI).
**Como explicar em entrevista (30s):** "Modelei o menu como máquina de estados de vistas dentro de um overlay único em vez de popovers aninhados — mesmo resultado, sem os bugs clássicos de posicionamento. E a ação em massa só aplica sugestões limpas: as marcadas como padrão de erro continuam manuais por design."

## 2026-06-10 — [sync] Histórico de sincronizações com diff server-side

**Problema:** aba Sincronizar só mostrava a última execução; Ricalfiff pediu histórico com detalhamento das mudanças entre versões.
**Opções consideradas:** A) diff no cliente (ler raw antes/depois — 2 fetches, race, lógica duplicada); B) diff na edge function, que já tem `atuais` e `recebidos` em memória no instante da troca.
**Decisão:** B. `diffDetalhado` na sync-omie + doc `cliente:<id>:sync-historico` (40 entradas × listas de 60 com flag `truncado` — corte nunca silencioso). Identidade de movimento refinada: título `t:<id>|<parcela>`; evento de extrato `e:<doc>|<cc>|<data>|<valor>|<op>` (evento bancário é imutável — se o banco reprocessa, vira removido+novo, leitura correta). Cliente só lê (`useSync.historico` + `HistoricoSync.tsx` expansível); `sync-meta` virou legado read-only.
**Consequências:** redeploy da função (VERSION 2) levou junto o full-replace + captura de dataPagamento que estava pendente desde o 403. Race no read-modify-write do histórico é aceitável (sync manual, raro).
**Como explicar em entrevista (30s):** "O diff mora onde as duas versões coexistem naturalmente — dentro da função de sync, no momento da troca. O cliente nunca calcula nada: só renderiza o documento de histórico, com truncamento sinalizado em vez de corte silencioso."

## 2026-06-10 — [filiais] Centros de custo como 3ª dimensão + de-para contraparte→filial

**Problema:** precisamos de receitas/despesas separadas por filial, mas o discovery mostrou que NENHUM lançamento Omie carrega departamento (ListarMovimentos não expõe; ContasPagar tem 0 rateios; ContasReceber tem 0 registros — receita entra pelo extrato). O cadastro de 16 departamentos existe e contém as filiais (Embasa Cotegipe/Wagner/etc).
**Opções consideradas:** A) esperar o coordenador ratear na Omie (relatório vazio por meses); B) de-para por movimento (granular demais, insustentável); C) de-para por CONTRAPARTE como 3ª dimensão do Modelo (43 receitas vêm de só 7 contrapartes), com precedência automática para o departamento real quando existir.
**Decisão:** C, escolhida pelo Ricalfiff. Dimensão `centros` reusa TODO o motor de conciliação (board, drag, menu de contexto); estrutura semeada do cadastro Omie achatado em 2 níveis (`montarEstruturaCentros`, id estável `dep:<codigo>`); `filialDoMovimento` resolve com precedência departamento real > de-para > "Sem filial"; `resultadoPorFilial` separa entradas/saídas. Relatório "Resultado por Filial" com barra de cobertura — nada distribuído por estimativa.
**Consequências:** edge function v3 e extrator local capturam `departamento` (vazio hoje, futuro-proof). Dívida assumida: despesas compartilhadas ficam em "Sem filial" até existir rateio — caminho definitivo é o coordenador ratear na Omie (a Matriz de Classificação já pede).
**Como explicar em entrevista (30s):** "O dado de filial não existia nos lançamentos, só no cadastro. Em vez de esperar ou inventar rateio, criei uma camada de classificação por contraparte — 7 clientes cobrem 100% da receita — com precedência automática pro dado real quando o ERP passar a fornecê-lo. O relatório mostra a fatia 'sem filial' explícita: cobertura honesta em vez de número bonito."

## 2026-06-10 — [filiais v2] Atribuição automática + seleção por movimento (de-para por contraparte descartado)

**Problema:** Ricalfiff vetou a aba de conciliação contraparte→filial ("não sei se convém") — fornecedor atende várias filiais; filial é atributo do LANÇAMENTO. Pediu: automático onde o dado existe + função de selecionar grupo no detalhamento de movimentações.
**Decisão:** rateio Omie segue entrando sozinho no sync (precedência absoluta, badge "· Omie" não editável). Sem rateio, a coluna "Filial / C. Custo" no detalhamento (TabelaMov, via FilialSelecaoProvider no MovimentosModal) grava override POR MOVIMENTO no mapa da dimensão centros, com chave estável (`cc:<idMovCC>` / `t:<idTitulo>|<parcela>`). Aba de centros removida da Matriz de Classificações; estrutura de filiais continua semeada do cadastro Omie.
**Consequências:** chaves antigas por contraparte no mapa ficam inertes (não casam com chave de movimento). Atribuição em massa por contraparte pode voltar como AÇÃO ("aplicar a todos desta contraparte") se a digitação 1-a-1 pesar — anotado como possível evolução.
**Como explicar em entrevista (30s):** "Recebi feedback de que a granularidade estava errada: filial pertence ao lançamento, não ao parceiro. Mantive o dado do ERP como fonte automática e movi o fallback manual pro detalhamento, com override por movimento e chave de identidade estável."

## 2026-06-10 — [títulos] Módulo Contas a Pagar/Receber pelos endpoints dedicados

**Problema:** precisávamos de agenda de pagamentos. O mf (movimentos) tem os títulos, mas sem o ciclo de vida pronto.
**Opções consideradas:** A) derivar status do mf (vencimento vs hoje + liquidado — reimplementa regra que o ERP já tem); B) puxar dos endpoints dedicados ListarContasPagar/Receber, que entregam `status_titulo` oficial (ATRASADO/A VENCER/PAGO/CANCELADO), previsão, parcela e retenções.
**Decisão:** B. `core/titulo.ts` (tipo canônico + `agendaVencimentos` puro por faixas vencidos/hoje/7d/30d/depois) + `sync:titulos` → seed + `TitulosPanel` (aba "Contas a Pagar/Receber" na seção Fonte·Omie). Status exibido CRU da Omie, sem reinterpretar. Pagos/cancelados fora dos totais.
**Consequências:** Receber existe e fica vazio com aviso honesto (cliente não emite título de receber; receita entra pelo extrato) — acende sozinho quando emitirem. Achado operacional: 96 de 164 títulos ATRASADOS (R$ na agenda) — pauta pro coordenador do BPO.
**Como explicar em entrevista (30s):** "Em vez de reimplementar a regra de atraso comparando datas, usei o status oficial do ERP — menos código e zero divergência com a fonte. O módulo de receber nasceu vazio por um fato do dado, e a UI diz isso explicitamente em vez de parecer quebrada."

## 2026-06-11 — [design-system] Camada de motion + fx "minimalista gamer" (bundle v2)

**Problema:** Chegou o bundle canônico v2 do Lúmen Finance DS (tokens.json + motion/animations.css + tokens/effects.css). A base (tokens/cores/motion-core) já estava aderente; faltava a biblioteca de motion estendida e a camada fx (neon/grid/sheen/border-glow).
**Opções consideradas:** (A) reescrever index.css para o formato tokenizado do bundle (--ease-brand/--dur-*) — mais limpo, porém alto risco de regressão num app client-facing que já funciona; (B) adicionar só o delta (keyframes/classes novas) no estilo inline já existente do arquivo (cubic-bezier inline, fill `backwards`) — baixo risco, mantém o arquivo coerente.
**Decisão:** (B). Adicionadas no index.css: anim-tab-in, anim-expand, anim-draw, anim-flash/shake/sparkle, anim-spin/pulse/glow-pulse/skeleton, anim-hover-fade + camada fx (fx-sheen, fx-press, fx-neon-{primary,accent,danger,secondary,warn}, fx-border-glow, fx-grid-bg, fx-nav-active). Fiado em: canvas (fx-grid-bg) + troca de aba (anim-tab-in) no App; KPI value (fx-neon por cor) no KpiCard; Login (fx-border-glow + botão fx-sheen/fx-press); Sincronizar (botão fx-sheen/fx-press + 🔄 anim-spin); modal de drill-down (anim-fade-in + anim-pop).
**Por quê:** Fidelidade ao v2 sem reescrever CSS que já passa em produção. Mantida a regra de produção `animation-fill: backwards` (nunca `both`) — reter transform cria containing block e quebra position:fixed.
**Consequências:** index.css cresceu ~230 linhas de utilitárias. **Armadilha resolvida:** classes em `@layer utilities` são tree-shaken pelo Tailwind se não aparecerem como literal no conteúdo — por isso o KpiCard usa um mapa `neon: 'fx-neon-accent'` (string literal), não `fx-neon-${cor}` interpolado. Confirmado no bundle final. fx-nav-active NÃO aplicado: o item de nav ativo usa fill primary sólido (já DS-correto) e a barra neon primary ficaria invisível sobre ele — são estilos alternativos, não somáveis.
**Como explicar em entrevista (30s):** "Tailwind faz purge de classes custom em @layer utilities que não apareçam literais no código escaneado. Uma classe montada por template string (fx-neon-${cor}) some do bundle. Resolvi com um mapa de strings literais por cor, e validei procurando a classe no CSS final do build."

## 2026-06-11 — [relatorios/ux] Tooltips ricos, comparativo de períodos, ocultar menu, sem emoji

**Problema:** Gráficos só informavam via `<title>` nativo (atraso ~1s, visual fora do DS, info pobre); não havia comparação mês atual × período; sidebar fixa sem collapse; emojis pictográficos na UI.
**Opções consideradas:** (A) adotar Recharts — tooltip/interação prontos, mas ~100kb, restyle completo e descarta os SVGs custom fiéis ao DS; (B) hook próprio `useTooltipGrafico` (portal + flip nas bordas, ~60 linhas) reusado pelos 6 gráficos, com hover por proximidade no eixo X nas linhas (LinhaTempo/MiniSerie).
**Decisão:** (B). Conteúdo útil por gráfico: Δ% vs mês anterior, vs média, participação %, acumulado (waterfall), saldo. Comparativo novo (`useMesAtual` + `RelatorioComparativo`): mês corrente pelo MESMO pipeline puro (filtrarPorPeriodo→filtrarPorFilial→espelho→calcular), comparado contra a MÉDIA MENSAL do período selecionado (durações diferentes não se comparam por total), DRE+DFC linha a linha com par de barras. Sidebar: collapse por largura animada (w-64→w-0, conteúdo interno fixo w-64) + hambúrguer na Topbar. Emojis pictográficos → SVGs inline (lupa, spinner) ou texto; glifos geométricos (☰ ◷ ✎ ✓ ✕) mantidos.
**Revisão (gráficos/indicadores vazios × arquitetura):** receita por cliente ERA possível (contraparte em 396/408 movimentos) → implementada (`receitaPorCliente` + card no RelatorioReceita + 2 testes). Mix por departamento: arquitetura pronta (campo + departamentos.json) mas só 2/408 títulos classificados na Omie — segue oculto (regra de ouro), texto do Pendente explica o caminho. PME/CCC: estoque não existe na Omie — impossível. Previsto×Realizado/DRE Gerencial: exigem orçamento (fonte nova — decisão de produto). YoY/PMR/PMP/Filiais: dependem de dado do período, corretos como estão.
**Consequências:** +2 arquivos lib (tooltipGrafico, useComparativo), +1 relatório (comparativo no Segmento e no Catálogo), 98 testes. Observação anotada: `hojeIso` via `toISOString()` é UTC (entre 21h–00h BRT cai no dia seguinte) — preexistente no PeriodoProvider, mantido por consistência; corrigir nos dois juntos depois.
**Como explicar em entrevista (30s):** "Tooltip nativo de SVG não serve pra dashboard: latência de ~1s e zero controle visual. Fiz um hook com portal que segue o cursor e vira nas bordas, e nos gráficos de linha calculo o ponto mais próximo pelo eixo X — alvo de hover de 2px vira a largura toda do gráfico. No comparativo, normalizo pela média mensal porque comparar 1 mês contra o total de 6 é mentira estatística."

## 2026-06-11 — [ux/graficos] Gráficos expansíveis (GraficoExpansivel)

**Problema:** Gráficos presos ao tamanho do card — sem como examinar um período longo ou um donut denso.
**Decisão:** Wrapper `GraficoExpansivel` (card DS + botão de expandir → modal max-w-6xl com Esc/clique-fora), fiado em 8 cards (Dashboard ×3, Evolução, DRE escada, DFC waterfall, Custos donut, Receita ×2). SVGs com viewBox crescem via `[&_svg]:!h-[55vh]`; gráficos de tamanho próprio (Donut) passam variante `grande` + `ampliarSvg={false}` — o `!important` do Tailwind venceria o style inline e distorceria.
**Consequências:** Tooltips funcionam no modal (cada instância tem o próprio hook). Gráficos em div (barras/waterfall) ganham largura, não altura — limitação aceita.
**Em entrevista (30s):** "Render duplo do mesmo children no card e no modal; para gráficos de tamanho fixo, render-prop não — variante `grande` explícita, porque o override CSS com !important atropelaria o estilo inline do componente."

## 2026-06-11 — [autonomous/revisao] KPI análise profunda + revisão geral + modularização

**Feito (modo autônomo):** (1) KpiCard expansível → modal AnaliseIndicador (SerieIndicador 640px com tooltip por proximidade, 6 estatísticas — melhor/pior mês, MoM, Δ no período — e tabela mensal com Δ%); (2) popup do tooltip repaginado (bg-surface translúcido + blur + borda superior na cor do gráfico — antes era surface3 lavanda chapado no tema claro); (3) fix hojeIso UTC nos DOIS pontos (PeriodoProvider + useComparativo) via core/periodo.hojeLocalIso(); (4) DRY: 4 implementações de variação % (tendenciaDe, tendenciaAbs, CelulaDelta, fracVariacao) → todas delegam a money.fracVariacao; (5) menu colapsável persistido em localStorage('lf-menu'); (6) exportar CSV pt-BR (.csv com ';' e vírgula, BOM) na DRE e DFC + 2 testes; (7) TabelaDemonstracao 218→80+140 (TabelaDemonstracaoLinhas).
**Decisão de NÃO fazer:** modularizar DemonstracaoEditor (230) e plano-padrao/filial — editor é fluxo crítico de edição sem teste de componente (precedente: regressão da modularização PULSAR 2026-06-02); plano-padrao é tabela de dados (linha-count não é complexidade); filial.ts é core coeso testado.
**Validação:** tsc limpo · 100 testes (9 arquivos) · build OK · 6 commits atômicos · push rebuild/base · deploy prod smoke 200.

## 2026-06-11 — [brand] Lúmen → Pulsar Finance, identidade de "pulso" herdada do PULSAR-RH

**Problema:** Unificar a família de produtos AG sob a identidade "Pulsar" — o PULSAR-RH já tem linguagem de pulso (anéis, respiração, sons sintetizados) que o financeiro não tinha.
**Fonte de verdade:** lido o código real do PULSAR-RH (index.html): ring-expand-login (anéis .3→5.5), brand-breathe (glow roxo 3.6s), card-edge-flow, login-success (halo radial), thump 90→40Hz + arpejo C4–G4–C5 via Web Audio, e o padrão de produção "AudioContext no gesto antes do await" (memória pulsar_rh_design_audio).
**Decisão:** portar como classes `pulso-*` derivadas dos tokens RGB (zero cor nova) + `lib/som.ts` (síntese pura, sem arquivos de áudio). Overlay `BoasVindas` 1×/sessão (sessionStorage pulsar-boot-visto) cobre "ao logar OU entrar na página" — mais robusto que segurar o unmount do Login (onAuthStateChange troca a tela imediatamente). Marca de raios mantida (lê-se como estrela pulsar). localStorage keys lumen-* NÃO renomeadas (renomear = resetar tema/cliente dos usuários).
**Sons:** login OK e sync OK (arpejo), entrada (thump). prefers-reduced-motion desliga animações; áudio depende de gesto (autoplay policy) — reload direto pode ser silencioso, comportamento igual ao PULSAR-RH.
**Em entrevista (30s):** "Autoplay policy bloqueia AudioContext criado fora de gesto; criando no clique do submit, antes do await da rede, o contexto nasce rodando e o som de sucesso toca depois do async. Esse padrão veio de bug real do PULSAR-RH."

## 2026-06-11 — [ux+brand] Faixa de contexto de período + wordmark família PulsaRH

**Problema 1 (contexto de período):** modelagem/conciliação/painel operam sobre TODOS os lançamentos e relatórios sobre o período filtrado — nada na tela diferenciava, gerando "por que o valor difere?".
**Decisão:** `ResumoPeriodo` (faixa fina reutilizável): chip ÂMBAR "Sem recorte" nas abas de modelagem (Matriz, Editar DRE/DFC, Painel) vs chip ROXO "Período" nos relatórios — sempre com Total do escopo (▲entradas ▼saídas =saldo, qtd) e Total do mês corrente LADO A LADO. Infra: lib/totais.ts (totaisDe puro + useTotaisMesAtual) + rotuloIntervalo movido p/ core/periodo (dedup com Comparativo). Totais crus por natureza R/P — sem conciliação, sem inventar sinal.
**Problema 2 (logo):** PDF oficial PulsaRH revelou a gramática da marca: wordmark itálico pesado, 2ª palavra roxa, EKG saindo da última letra, ✦ substituindo o "o" de "puls✦" na tagline.
**Decisão:** portada a gramática: `Wordmark` (Pulsar + Finance roxo + EkgTrail), `Tagline` ("Sinta o puls✦ da sua operação financeira"), hexágono mantido como ícone compacto. Inter italic 700/800 adicionado ao Google Fonts (evita oblíquo sintetizado). 102 testes, deploy prod.

## 2026-06-11 — [ux] Comparativo tela cheia + tickers de mercado no menu

**Comparativo lado a lado completo:** botão destacado "⇆ Comparativo" na faixa de contexto (presente em modelagem, painel e relatórios) abre TELA CHEIA com dois relatórios completos — cada lado com preset de período próprio (todo histórico/mês atual/anterior/3m/6m/12m/ano), totais crus e a TabelaDemonstracao inteira com drill-down; toggles globais DRE/DFC e competência/caixa. Pipeline: `useDemonstracoesDe(intervalo, regime)` parametrizado (mesmo cálculo puro do resultado, sem filial).
**Conciliar por período — decisão de NÃO fazer:** o de-para categoria→grupo é período-independente por semântica (classificar "Energia" vale pra sempre); conciliar "só junho" criaria mapeamentos divergentes por janela e quebraria a fonte única. A necessidade real (analisar por período) é atendida pelo comparativo + faixa de contexto. Se surgir demanda de FOCO operacional ("o que chegou este mês sem conciliar"), o caminho é filtro de período na FILA da Matriz — sem tocar a semântica do mapa.
**Tickers de mercado no menu:** duas linhas de pulso em loop no pé da sidebar (verde accent + azul info) com área-gradiente e glow, apologia a gráfico de bolsa/fluxo de caixa. Sem números — decorativo puro não fabrica dado. Loop sem emenda: caminho desenhado 2× e transladado -200 unidades.

## 2026-06-11 — [familia] Padrão Pulsar: música, visual gen-2 no RH e sistema tipográfico

**Música ambiente no Finance:** portado o loop generativo exato do PULSAR-RH (arpejo sine Dó menor, gain 0.032, batida 2.4s) para lib/som.ts + toggle na Topbar; chave localStorage 'pulsar-ambient' COMPARTILHADA entre os dois produtos. Só inicia em gesto (autoplay policy).
**RH sobe pra gen-2:** design-system/pulsar-padrao.css (tokens canais RGB, easing único backwards, fx-press/neon/grid, pulso-respira/vivo/piso) + piso radar 3D e tilt no login. Branch feat/padrao-visual-pulsar → **PR #17** (produção com clientes — sem merge sem revisão).
**Tipografia da família (Fontshare):** o usuário apontou specimens por nome de cidade — "Bucharest"=Chillax, "Montevideo"=Author, "Montreal"=Clash Display. Aplicado nos DOIS: Chillax títulos (h1–h3), Author corpo (+ itálico do wordmark), Clash Display apoio (.font-apoio — valores de KPI). Finance: tailwind fontFamily sans/titulo/apoio; RH: override de --font-sans + --font-titulo/--font-apoio no pulsar-padrao.css (o login lia var(--font-sans)). Inter sai; JetBrains Mono fica no RH (código).
**Risco anotado:** Author/Chillax podem não ter tabular figures — se números desalinharem em tabelas, fallback é fonte numérica dedicada na coluna de valores.

## 2026-06-12 — [dados] movimentos hidratados em runtime (sync entra nas estatísticas)

**Problema:** o sync gravava o doc `cliente:<id>:movimentos-raw` no `painel_estado`, mas TODO o pipeline de estatísticas (resultado, DRE/DFC, comparativo, gráficos, painéis) lia `movimentosSeed` — JSON estático bundlado no build. Dado novo só entrava com redeploy.
**Opções consideradas:** A) regenerar `movimentos.json` + redeploy a cada sync (CI pesado, latência de minutos); B) buscar Omie direto no front (expõe credenciais, duplica merge); C) provider React hidratando do `painel_estado` com seed como fallback de boot.
**Decisão:** C — `MovimentosProvider` / `useMovimentos()` em `src/lib/movimentos.tsx`.
**Por quê:** mesmo padrão de estado já usado no app (localStorage+Supabase); dado vivo é responsabilidade de runtime, não de build. Seed vira bootstrap offline e só para a Acme — tenant novo começa vazio até sincronizar (não herda dados de outro cliente).
**Consequências:** 11 consumidores migrados de import estático para o hook (dep arrays atualizados); `Sincronizar` recarrega o provider na transição rodando→ok — estatísticas atualizam sem F5. O seed da Acme pode divergir do doc remoto até a primeira hidratação (flash de dado antigo aceitável, ~1 fetch). Regra Mãe preservada: título novo cai em "a conciliar".
**Como explicar em entrevista (30s):** "As estatísticas liam um JSON congelado no bundle; o sync gravava no banco e ninguém lia. Criei um contexto que hidrata os movimentos do banco em runtime com o JSON como fallback de boot, recarregando quando o sync conclui. A decisão chave foi fallback por tenant: o seed é a foto de UM cliente, então outro tenant nunca herda esse dado."

## 2026-06-12 — [core/relatórios] data canônica em competência + neutros fora dos relatórios

**Problema 1:** série mensal dos indicadores zerada com headline correto. Causa: 240/456 movimentos do sync são eventos de extrato (idTitulo=0) sem `dataEmissao`; em competência `dataDoMovimento` só olhava emissão → R$ 1,6M entravam no total mas em nenhum mês. O seed antigo não tinha eventos de extrato — o bug só apareceu com o dado vivo.
**Decisão 1:** fallback `dataEmissao || data` (a `data` canônica que o sync já resolve: emissão > venc > registro > pagamento). Regime caixa intocado.
**Problema 2:** neutros (Regra Mãe) já ficavam fora de DRE/DFC/gráficos, mas vazavam nos agregados crus dos relatórios (faixa de totais, receita por cliente, capital de giro, totais do comparativo).
**Decisão 2:** `separarNeutros(movs, conc)` em core + exclusão nesses quatro pontos + relatório próprio "Movimentos Neutros" (trilha de auditoria com total de entradas/saídas neutras e tabela). Modelagem continua com totais crus de propósito (reconciliação contra a Omie).
**Como explicar em entrevista (30s):** "Linearidade me deu o diagnóstico: se a soma dos meses não bate com o total do período, algum movimento não cai em bucket nenhum — era data de emissão vazia em evento de extrato. E neutro não é lixo: não pode poluir resultado, mas precisa ser auditável — então saiu dos relatórios operacionais e ganhou relatório próprio."

## 2026-06-12 — [sync] cadastros (categorias/clientes/departamentos) em runtime

**Problema:** auditoria contra a API Omie mostrou cadastros defasados: categorias 151/161, clientes 331/346 — eram seeds estáticos do build, nunca sincronizados (mesmo gap dos movimentos). Categoria nova aparecia como código cru; contraparte nova ficava sem nome e fora da herança de filial.
**Decisão:** sync-omie agora busca os 3 cadastros (paginado, mapeamento validado campo a campo contra os seeds, raízes 0/1/2 sintetizadas como no gerador original) e grava `cliente:<id>:cadastros-raw`; novo `CadastrosProvider`/`useCadastros` hidrata em runtime com seeds como fallback (só Acme). `criarResolvedor` virou puro (cadastros por parâmetro); padrão de centros do `useModelo` vem do runtime.
**Consequências:** 12 consumidores migrados; Sincronizar recarrega movimentos E cadastros. Modelo de centros salvo nunca é tocado; tenant novo ganha estrutura da Omie após o 1º sync. Validado ponta a ponta em prod: sync devolveu {categorias:164, clientes:346, departamentos:16} e o doc confere.
**Como explicar em entrevista (30s):** "Mesma causa raiz dos movimentos: dado vivo lido de um JSON congelado no build. Estendi o sync server-side para os cadastros e repliquei o padrão provider+fallback. O cuidado foi validar o mapeamento campo a campo contra o seed antes de confiar nele — as divergências que sobraram eram staleness real da Omie, que é exatamente o que o sync corrige."

## 2026-06-12 — [projeção/contas] módulos Contas a Pagar/Receber + Projeção com conciliação

**Problema:** contas a pagar/receber eram um painel único read-only sobre seed congelado (164 títulos do build); não participavam da conciliação; não havia projeção de caixa por títulos separada de DRE/DFC.
**Decisão:** (a) sync busca os endpoints dedicados (`ListarContasPagar/Receber`, status de ciclo pronto) → `titulos-raw`, hook `useTitulos` hidrata em runtime; (b) dois módulos próprios (Pagar/Receber) com conciliação INLINE — select no título não conciliado chama `mapear('contas', categoria, grupo)`, a mesma operação da Matriz (classificar um título classifica a categoria inteira, propagando para DRE/gráficos/projeção); (c) módulo Projeção: relatório único previsto (abertos por vencimento) × realizado (movimentos pagos por mês) + quebra do em-aberto por grupo com bucket "a conciliar" explícito.
**Opções rejeitadas:** matriz de conciliação própria por título (de-para individual = manutenção infinita, divergência entre relatórios); realizado pelo status PAGO dos títulos (o Listar não traz valor/data de baixa — o mf traz).
**Consequências:** aba antiga "Contas a Pagar/Receber" substituída pelos dois módulos; nova seção Projeção na sidebar. O relatório "Previsto × Realizado" de Relatórios (orçamento Omie) continua existindo — são coisas distintas: lá é meta orçamentária auditável contra o ERP; aqui é caixa projetado por compromissos contratados.
**Como explicar em entrevista (30s):** "Liguei títulos e movimentos pela chave que já compartilham — a categoria do ERP — em vez de criar um segundo sistema de classificação. Conciliar em qualquer lugar propaga para todo lugar. E separei semanticamente projeção de caixa (compromissos) de orçamento (meta): nomes iguais, dados diferentes, relatórios diferentes."

## 2026-06-12 — [multi-tenant] credenciais Omie por cliente (gate do 2º tenant)

**Problema:** auditoria pré-criação do 2º cliente: todo o estado já era segmentado por `cliente:<id>:*` e os seeds caem só na Acme, MAS a edge `sync-omie` usava credencial Omie global (env) — sincronizar um cliente novo importaria os dados da Acme para dentro dele (corrupção cruzada).
**Decisão:** tabela `painel_credenciais` (service-role-only: RLS ligada SEM policies + revoke de anon/authenticated) com app_key/secret/base_url por cliente; a edge resolve por clienteId; env vira fallback exclusivo da Acme; cliente sem credencial recebe erro claro e NADA é gravado. Erro viaja como payload 200 (supabase-js engole corpo de non-2xx).
**Validação em prod:** cliente fake → recusa com mensagem e zero side-effects; Acme → sync normal (8s, 566 movs).
**Pendência operacional:** ao criar o cliente novo de verdade, inserir as credenciais Omie dele: `insert into painel_credenciais(client_id, omie_app_key, omie_app_secret) values ('<id>', '<key>', '<secret>');` (via SQL/service role — o front não lê nem escreve essa tabela de propósito).
**Como explicar em entrevista (30s):** "Multi-tenancy não é só prefixar chaves — é auditar cada caminho de ESCRITA. O estado estava isolado, mas o pipeline de ingestão tinha credencial global: o segundo tenant teria recebido os dados do primeiro no primeiro clique. O gate é fail-closed: sem credencial própria, o sync recusa em vez de adivinhar."

## 2026-06-12 — [tenants] ACME 27 criada; conciliação automática aplicada (decisão do Ricalfiff)

Primeiro: ACME_ID renomeada "ACME 36"; novo tenant ACME 27 (`00000000-0000-4000-8000-000000000027`) com credencial Omie própria em `painel_credenciais`. Sync trouxe 587 movs / 165 cats / 357 contrapartes / 244 títulos (conta Omie distinta confirmada).
**Tensão de princípio (registrada):** a matriz de classificação "só sugere" por design; a pedido do Ricalfiff, as sugestões com destino único foram AUTO-APLICADAS no modelo da 27 (108/145 categorias, 98% dos movs, 83,4% do valor). O restante ficou em "a conciliar" + alerta R3 ("Outras receitas" genérica). Revisão humana recomendada na Matriz antes de fechar relatório com o cliente.
DRE calculada ponta a ponta no motor real: RL R$ 767,7 mil; MC negativa (-R$ 159 mil) — pode ser custo intercompany de filial OU efeito de classificação de origem errada (exatamente o risco que a matriz documenta).

## 2026-06-12 — [apresentação] relatórios exportados como HTML único navegável

**Problema:** o BPO precisa entregar relatórios ao cliente final como apresentação controlada — navegável, com filtros e gráficos — sem depender de acesso ao painel.
**Decisão:** módulo "Apresentação" em Relatórios gera um ARQUIVO HTML ÚNICO: dados do tenant ativo congelados como JSON embutido, CSS/JS inline, gráficos SVG próprios (sem Chart.js), intro animada da identidade de pulso, deck com navegação (teclado/touch/pontos), filtro de meses e toggle gráfico↔tabela funcionando offline; @media print quebra um slide por página (vira PDF pelo navegador).
**Opções rejeitadas:** PDF direto (perde interatividade/filtros); link para o painel (exige acesso/credencial e os números mudariam depois do envio — apresentação é foto auditável); ZIP com assets (atrito no envio por e-mail).
**Arquitetura:** `lib/apresentacao.ts` (payload puro, tenant-agnóstico — recebe movimentos/conc/títulos de quem chama) + `lib/apresentacaoHtml.ts` (template) + `RelatorioApresentacao.tsx` (montagem: seleção de seções, preview, download). Validado com dado real da ACME 27: 25KB, 7 slides, zero deps externas.
**Como explicar em entrevista (30s):** "Exportar relatório interativo sem servidor: congelei o payload como JSON dentro de um HTML autossuficiente com renderizadores SVG próprios. O arquivo é a apresentação E o dado — auditável, offline, versionável por e-mail. A decisão chave foi não depender de nada externo: nem CDN, nem API, nem o próprio painel."

## 2026-06-14 — [apresentação] Visão por centro de custo em cada relatório

**Problema:** Cada slide (DRE, DFC, evolução, receita, custos, despesas, projeção, indicadores) precisava de uma "visão por centro de custo" — mini-gráfico por centro, com zoom (gráfico + tabela mês a mês) no mesmo padrão dos indicadores.
**Verificação antes de construir (§16.1/16.4):** medi a cobertura real do campo Departamento (Omie) — ACME 27: 16/262 (6%, 3 centros); ACME 36: 0/95 (0%). O dado de rateio essencialmente não existe ainda.
**Opções consideradas:** (A) construir só quando o BPO ratear na Omie; (B) construir agora um módulo pronto-para-dado com estado-vazio honesto que acende sozinho quando o rateio chegar.
**Decisão:** (B). Toggle "Centro de custo" reusa o mecanismo de toggle existente (data-t/data-view) e o lightbox de zoom (KPIDATA/abrirKpi) — código novo mínimo (1 helper `viewCentros`). Métrica por centro = movimento líquido mensal (consistente entre relatórios). Estado-vazio mostra "% atribuído" e instrui ratear na origem.
**Por quê:** não construir sobre dado inexistente seria entregar tela vazia; mas o rateio é do cliente/BPO (não posso preencher dado — §16.5). Deixar pronto + sinalizar a dependência > esperar sem entregar.
**Consequências:** hoje a visão mostra estado-vazio (36) e 3 centros parciais (27). Acende automático quando o Departamento for preenchido na Omie. Dívida: a métrica é o líquido do centro, não a métrica específica de cada relatório — refinável quando houver dado denso.
**Como explicar em entrevista (30s):** "Antes de construir, medi a cobertura do dado: 0–6%. Em vez de entregar uma tela vazia ou travar, fiz um módulo pronto-para-dado — reusa o toggle e o zoom que já existiam, mostra um estado-vazio honesto com a % atribuída e acende sozinho quando o cliente ratear na origem. A regra é só corrijo código, não invento dado financeiro."

## 2026-06-14 — [demonstrações] Neutro (Regra Mãe) sempre "a conciliar", nunca em linha de DRE/DFC

**Problema:** Movimento neutro (transferência, aporte, estorno) não pode entrar no resultado, mas o editor de DRE/DFC permitia arrastá-lo para uma linha e um mapa salvo podia tê-lo lá — contaminando DRE/DFC/apresentação.
**Opções consideradas:** (A) filtrar o grupo neutro em cada um dos 4 consumidores de `dem.demo` (ResultadoPanel, useResultado, useComparativo, painel); (B) impor a regra na fonte (`useDemonstracoes`) filtrando o mapa na leitura.
**Decisão:** (B). `useDemonstracoes` deriva `idsNeutros` do modelo do cliente e devolve `demo` com `semNeutros(mapa)`; `alocar` recusa grupo neutro. No editor, o neutro aparece em "Grupos a alocar" com selo "Regra Mãe · sempre a conciliar" e não é arrastável.
**Por quê:** 1 chokepoint corrige editor + resultado + apresentação (DRY); filtro na leitura é não-destrutivo — não apaga o mapa salvo do cliente (§16.5). Núcleo puro (`idsNeutros`/`semNeutros`) testado.
**Consequências:** neutro nunca mais entra em DRE/DFC, em nenhuma tela. Se um cliente tinha um neutro alocado num mapa salvo, ele passa a ser ignorado (volta para a conciliar) — comportamento desejado. Dívida: o mapa salvo ainda guarda a entrada órfã (inócua); limpa ao realocar/restaurar.
**Como explicar em entrevista (30s):** "A regra de negócio (neutro fora do resultado) eu impus no hook que serve o dado, não em cada uma das 4 telas que consomem. Filtro na leitura: editor, resultado e apresentação ficam consistentes de graça e o dado salvo do cliente não é destruído. O núcleo é função pura testada."

## 2026-06-14 — [demonstrações] Unificação Painel + Editar DRE/DFC numa aba só (Fase 1)

**Problema:** Duas abas separadas — "Painel DRE/DFC" (drill-down + KPIs, mas sem editar) e "Editar DRE/DFC" (alocar grupos, mas sem detalhe e sem filtro de período). Editar rodava sobre TODOS os lançamentos, fora de sincronia com período.
**Opções consideradas:** (A) fundir as duas tabelas numa única linha que edita E expande ao mesmo tempo (reescrita pesada de TabelaDemonstracaoLinhas, que é compartilhada com relatórios → alto risco); (B) uma aba só com filtro de período + segmento DRE/DFC/Espelho e um modo "Editar estrutura" | "Detalhar valores", reusando os componentes existentes.
**Decisão:** (B). A aba virou um `PeriodoProvider` + `useResultado` (que já entrega DRE/DFC/grupos filtrados por período) + `FiltroPeriodo`. Modo Editar = `DemonstracaoEditor`; modo Detalhar = `TabelaDemonstracao` com drill-down. "Grupos a alocar" sempre lista todos os grupos (mesmo zerados no período). Todo grupo já alocado ganhou "mover…" (realocar para qualquer linha). Aba "Painel DRE/DFC" e `ResultadoPanel.tsx` removidos.
**Por quê:** reuso > reescrita — `useResultado` já tinha o pipeline de período pronto; não toquei a tabela compartilhada com relatórios (sem risco de regressão lá). Período default "Tudo" mantém a estrutura inteira visível para editar.
**Consequências:** uma aba só, sincronizada por período, com edição + drill + realocação completa. Pendente (Fase 2): arrastar-para-reordenar grupos com número = posição. A view "Espelho da Estrutura" virou um modo da aba (não foi perdida).
**Como explicar em entrevista (30s):** "Em vez de fundir dois componentes numa reescrita arriscada, montei a aba sobre o hook que já tinha o pipeline de período (useResultado) e ofereci os dois modos — editar e detalhar — reusando o que existia. Zero toque na tabela compartilhada com os relatórios, então nenhuma regressão colateral."

## 2026-06-14 — [navegação] Menu em camadas (acordeão) com nomenclatura científica

**Problema:** Sidebar plana com 6 seções soltas e rótulos genéricos (Clientes, Fonte Omie, Modelagem...). Pedido: agrupar em "janelas" como no Pulsar, com linguagem técnica/científica.
**Opções consideradas:** nomenclatura (A) Pipeline ETL / (B) Camadas científico / (C) Híbrido sóbrio; interação acordeão (1 grupo) vs múltiplos abertos.
**Decisão:** (B) Camadas + acordeão. 4 camadas — Captura (cadastro + Fonte Omie), Camada Semântica (matriz, demonstrações, projeção), Camada Analítica (relatórios, apresentação), Configuração. Clicar numa camada abre seus itens e fecha as outras; a camada da aba ativa abre sozinha. Relatórios virou 2 itens (Relatórios + Apresentação) via prop `inicial` no RelatoriosPanel. Itens renomeados: Valores→Lançamentos, Fornecedores→Contrapartes, Contas a Pagar/Receber→Títulos a Pagar/Receber, Editar DRE/DFC→Demonstrações.
**Por quê:** ids das abas preservados (roteamento e ROTULO_ABA intactos) — só rótulos e agrupamento mudaram, risco baixo. Apresentação como item próprio reusa RelatoriosPanel com view inicial, sem duplicar tela.
**Consequências:** navegação por camada do pipeline (origem→semântica→análise), alinhada ao vocabulário do produto. Título da Topbar segue os novos rótulos automaticamente.
**Como explicar em entrevista (30s):** "Reorganizei a navegação pelo fluxo do dado — captura, camada semântica, camada analítica — em acordeão. Mantive os ids de rota intactos, então mudei só rótulo e agrupamento: zero risco de quebrar roteamento, e a Apresentação virou item próprio reusando o painel de relatórios com uma view inicial."

## 2026-06-14 — [demonstrações] Drill de classes no editor + terminologia "classe"

**Problema:** Após unificar Painel+Editar, perdeu-se o "ver detalhes" (botão direito) na DRE/DFC — não dava mais para ver por dentro dos grupos. Pedido: visão expansível de classes (subgrupos) na área de realocar; e nomear o nível intermediário de "classe".
**Decisão:** Cada grupo no editor (linha de "a alocar" e chip alocado) ganhou caret expansível que abre as **classes** (subgrupos do espelho) com valores do período. Subgrupo passou a se chamar "classe" na UI (editor + conciliação). Valores das classes vêm do espelho filtrado por período (consistente com o grupo).
**Por quê:** restaura a função perdida sem reintroduzir menu de contexto; reusa `GrupoEspelho.subgrupos` que já existia. Drill read-only no editor (estrutura) + o modo "Detalhar valores" continua com a tabela drill completa.
**Consequências:** dá pra inspecionar grupo→classe direto na edição. Pendentes (decisão do Ricalfiff): (1) regra DRE⊆DFC com auto-sync (hoje DFC-exclusivos já aparecem para alocar na DRE, mas alocar na DRE não replica na DFC automaticamente); (2) arrastar-para-reordenar com número=posição (Fase 2).
**Como explicar em entrevista (30s):** "A unificação tirou o menu de contexto que mostrava detalhe; em vez de trazer o menu de volta, embuti um drill expansível na própria edição reusando o espelho da estrutura que já calculava grupo→subgrupo. Mesmo dado, sem clique-direito."

## 2026-06-14 — [demonstrações] Drill 4 camadas + terminologia (movimentação→classe→subgrupo→grupo)

**Modelo confirmado (Ricalfiff):** hierarquia em 4 camadas — movimentação → classe (agrupadora Omie) → subgrupo (conciliação) → grupo (conciliação). Matriz personaliza até movimentação (define o padrão); Demonstrações customiza esse padrão até a CLASSE (teto: movimentação não é customizável em Demonstrações).
**Entregue (fundação):** `core/classes.ts` (`arvorePorGrupo`, puro+testado) resolve a classe pela agrupadora ancestral da categoria e monta grupo→subgrupo→classe com totais do período. No editor, cada grupo (em "a alocar" e nas linhas) abre via caret mostrando subgrupos→classes com valores. Terminologia: Plano de Contas "Agrupadora"→"Classe"; subgrupo mantém nome (nível distinto).
**Por quê:** o drill é a base visual da futura customização por classe; read-only agora, sem tocar no motor de cálculo.
**Pendente (próximo, motor):** customização da demonstração ATÉ classe — `calcular` precisa de override hierárquico (linha por grupo, sobrescrita por subgrupo, sobrescrita por classe) sem permitir movimentação. E reordenar com número=posição (Fase 2, opção a).
**Como explicar em entrevista (30s):** "Modelei a estrutura em 4 camadas numa função pura e testada, e a customização tem teto por camada: a Matriz vai até a movimentação, a Demonstração para na classe. Entreguei primeiro o drill read-only como fundação antes de mexer no motor de cálculo."

## 2026-06-14 — [demonstrações] Customização até classe (override hierárquico no motor)

**Problema:** A demonstração só alocava por grupo→linha. Pedido: customizar até a CLASSE (teto: movimentação fica na Matriz), com precedência classe > subgrupo > grupo.
**Decisão:** motor de "chaves efetivas" em `core/classes.ts` (`totaisEfetivos`): resolve cada movimento na chave mais específica configurada — `cls:<código>` > `sub:<id>` > `<grupoId>` — e devolve `(mapaEfetivo, totalPorChave)` que `calcular` consome SEM mudar de assinatura. `Demonstracao` ganhou `mapaSub`/`mapaClasse` (aditivos, opcionais). `useResultado`/`useComparativo` passaram a usar o motor. Editor: drill com seletor de linha por subgrupo e por classe; "Detalhar valores" inclui pseudo-grupos para as chaves de override.
**Por quê:** chaves efetivas mantêm `calcular` intacto → sem override o comportamento é byte-a-byte idêntico (os 100 testes antigos seguem verdes); aditivo no estado salvo (retrocompatível). Núcleo puro testado (precedência classe>sub>grupo).
**Consequências:** dá para mandar uma classe ou subgrupo para outra linha da DRE/DFC sem mexer na classificação base (Matriz). Pendente: reordenar com número=posição (Fase 2, opção a).
**Como explicar em entrevista (30s):** "Em vez de reescrever o motor de cálculo, introduzi 'chaves efetivas' — cada movimento resolve para a granularidade mais específica configurada (classe, senão subgrupo, senão grupo) e o cálculo consome isso sem mudar de interface. Aditivo e retrocompatível: sem customização, idêntico ao anterior, provado pelos testes."

## 2026-06-14 — [demonstrações] Reordenar grupos com número = posição (Fase 2)

**Problema:** Números dos grupos fora de ordem/com lacunas; pedido: arrastar para reordenar e o número virar a posição (opção a — renumera de verdade no sistema todo), sem mudar classificação nem grupo.
**Decisão:** a ordem passa a ser a posição no array `conc.estrutura` (raiz). `reordenarRaiz` (core puro, testado) move o grupo e **renumera todos os nomes** para `${pos}. ${nome}`. Como a numeração fica embutida no nome, toda exibição e a ordenação existente (`ordemGrupo` por nome) refletem a nova ordem sem mudar nenhuma tela. UI: botão "Ordenar grupos" no editor → lista arrastável (`OrdenarGrupos`).
**Opções rejeitadas:** (b) reordenar só visualmente sem mexer no número — descartada pelo Ricalfiff. Campo `ordem` separado em meta — exigiria mudar todos os sites de exibição/ordenação.
**Por quê:** renumerar o nome é a mudança mínima que propaga para gráficos, relatórios, apresentação e matriz de uma vez (ids/mapas intactos → conciliação e DRE/DFC não se movem). É ação do usuário (não dado silencioso), então renomear é legítimo (§16.5).
**Consequências:** arrastar reordena e renumera tudo; também corrige as lacunas de numeração (vira sequencial). Conclui a área de DRE/DFC.
**Como explicar em entrevista (30s):** "O número vem da posição: ao reordenar eu reescrevo o prefixo numérico do nome, então a ordenação por nome que já existia propaga a nova ordem para todas as telas sem tocar em nenhuma — e os ids ficam intactos, então a classificação não se move."

## 2026-06-14 — [DFC] Valores a vencer fora do resultado da DFC

**Problema:** DRE e DFC calculam sobre o mesmo conjunto de movimentos; em regime de competência isso inclui títulos a vencer (liquidado='N'), que entram indevidamente na DFC (que é caixa).
**Decisão:** `caixaRealizado(movs)` = remove `liquidado === 'N'` (a vencer), mantém pagos ('S') e indefinidos/extrato (''). Aplicado só à DFC (atual + período anterior) em `useResultado` e `useComparativo`. DRE intacta. No editor, o tab DFC usa a base de caixa para totais/drill (consistente com a linha).
**Opções rejeitadas:** forçar DFC sempre no regime caixa (reancorar por dataPagamento) — faz mais que o pedido e muda o comportamento do toggle de regime; contar valorPagoCentavos em pagamentos parciais — refinamento futuro (hoje usa valorCentavos do que está liquidado).
**Por quê:** correção fiel e mínima ao pedido; na fonte do cálculo → propaga para painel, comparativo, mês atual e apresentação de uma vez.
**Consequências:** DFC reflete só caixa realizado. Dívida: pagamento parcial conta o valor cheio do título liquidado (não só a parcela paga).
**Como explicar em entrevista (30s):** "Título a vencer não é caixa; filtrei o em-aberto na fonte do cálculo da DFC, então sai de todas as telas sem afetar a DRE, que por competência mantém o regime dela."

## 2026-06-14 — [previsto×realizado] Rework: Fluxo de Caixa semanal por todos os grupos

**Problema:** Previsto × Realizado era mensal e só pelos grupos com título. Pedido (prints): matriz de fluxo de caixa com resultados semanais, todos os grupos, Previsto/Realizado por período, com saldo/acumulado.
**Decisão:** núcleo `core/projecao-semanal.ts` (puro+testado): `montarSemanas(mes)` (segunda→domingo, drill por dia) e `fluxoDiario(titulos,movs,conc)` → nó→dia→Fluxo (previsto pelo vencimento, realizado pelo pagamento). UI `FluxoSemanal`: linhas = estrutura inteira (grupo→subgrupo) + Saldo inicial + Resultado + Resultado acumulado + Saldo/Limite; colunas = semanas (clique abre os dias) + total. Saldo inicial = entrada MANUAL (`useSaldoInicial`, por cliente).
**Bloqueio de dado sinalizado:** Omie não sincroniza saldo bancário — Saldo Inicial/Limite dependem dele; resolvido com campo manual (granularidade: total, não por conta).
**Opções:** granularidade diária pura (descartada — 30+ colunas) vs semanal+drill (escolhida). Saldo manual vs omitir (escolhido manual).
**Consequências:** fluxo de caixa semanal completo. Dívidas: saldo inicial é total (não por banco); neutros/transferências entram no resultado de caixa (todos os grupos, como pedido) — pode-se excluir depois se distorcer; pagamento parcial usa valorPagoCentavos (correto p/ caixa).
**Como explicar em entrevista (30s):** "Separei o motor (semanas + fluxo diário por nó, puro e testado) da matriz. Previsto vem do vencimento dos títulos, realizado do pagamento; a coluna semanal abre em dias. O saldo bancário não existe na fonte, então virou entrada manual — sinalizei a dependência em vez de inventar o número."

## 2026-06-14 — [fix] DFC usa valor PAGO (a vencer some de vez) + realocar dentro de linha draggable

**Problema 1 (DFC):** mesmo após excluir liquidado='N', a DFC ainda mostrava a vencer — porque o cálculo somava `valorCentavos` (valor cheio do título), e títulos pagos PARCIALMENTE ou indefinidos carregam a parte aberta. Dados ACME 27: DFC somava R$4.082.583 (cheio) vs R$3.616.205 correto (pago).
**Problema 2 (realocar):** os selects "mover…"/"alocar em…" ficam dentro de linhas `draggable`; o gesto do mouse iniciava arraste e o dropdown não abria.
**Decisão:** (1) `movimentosCaixa` usa `valorPagoCentavos` (filtra pago>0, valorCentavos=pago) — substitui `caixaRealizado`. (2) `iniciarDrag` cancela o drag quando o alvo é `select/button/input`.
**Por quê:** valorPago é a definição de caixa que a Projeção já usava; guard de drag é o fix mínimo.
**Consequências:** DFC reflete caixa real; realocar por dropdown volta a funcionar.
**Como explicar em entrevista (30s):** "DFC é caixa pelo valor pago, não pelo valor do título; e o dropdown não abria porque estava numa linha arrastável — cancelei o drag quando começa num controle."

## 2026-06-14 — [fix] Grupos do editor ordenados pelo número (reorder reflete na estrutura)

**Problema:** dentro de cada linha da demonstração os grupos apareciam fora de ordem (3,4,5,1,6,2) porque eram exibidos na ordem do `mapa` (inserção), não pela numeração. O "Ordenar grupos" renumerava, mas o editor não reordenava a exibição → a numeração mutável "não aplicava".
**Decisão:** chips dentro das linhas e a lista "Grupos a alocar" passam a ser ordenados por `ordemGrupo(nome)` (o número do grupo). Como reordenar renumera os nomes pela posição, a ordem mutável agora reflete imediatamente no editor.
**Consequências:** estrutura sempre numerada em ordem; "Ordenar grupos" (renumera) reflete em todas as linhas. Mutação de ordem = pelo painel "Ordenar grupos".
**Como explicar em entrevista (30s):** "Os grupos apareciam na ordem de inserção do mapa; passei a ordená-los pelo número. Como reordenar reescreve o número pela posição, a ordem mutável fica visível na hora."

## 2026-06-14 — [apresentação] Matrizes mensais e indicadores usam o mesmo motor (overrides + caixa)

**Problema:** as tabelas-topo da apresentação já usavam `r.dre/r.dfc` (com overrides classe/subgrupo + DFC=caixa pago), mas as MATRIZES MENSAIS (`demoMensal`) e as SÉRIES DOS INDICADORES (`pontosDoMes`) recalculavam por mês com `calcular(demo)` cru — ignorando overrides e usando competência (operacionais) na DFC. Apresentação divergia do app.
**Decisão:** `demoMensal` e `pontosDoMes` passam a usar `totaisEfetivos` (overrides classe>subgrupo>grupo) e a DFC mensal/indicador roda sobre `movimentosCaixa` (valor pago). Ambos recebem `categorias`. Vale também no IndicadoresPanel do app (mesmo bug na série).
**Por quê:** um motor só → apresentação = tela, sempre. Reorder/numeração já refletia via nomes.
**Consequências:** apresentação espelha 100% as customizações; o IndicadoresPanel do app também corrige a série mensal (antes sem override/caixa).
**Como explicar em entrevista (30s):** "A apresentação tinha um cálculo paralelo nas matrizes mensais que não conhecia as customizações. Unifiquei tudo no mesmo motor (chaves efetivas + caixa pago), passando as categorias — agora o export bate com a tela byte a byte."

## 2026-06-14 — [editor] regime do grupo filtra a lista "a alocar" (DRE/DFC)

**Problema:** grupos "Só DFC" (10. CAPEX, 11. Financiamento) apareciam no painel "Grupos a alocar" da **DRE** e nunca chegavam ao editor de **DFC**. O regime só era respeitado nos totais.
**Opções consideradas:** (A) filtrar dentro do `DemonstracaoEditor` recebendo `tipo` por prop; (B) filtrar na montagem dos dados em `DemonstracoesPanel` com `entraNaDemonstracao(meta, tipo)`.
**Decisão:** B — filtrar `gruposAlocaveis` e `gruposDrill` na origem.
**Por quê:** o editor é um componente burro/reutilizável (DRE e DFC usam o mesmo); regime é regra de domínio e já vive na camada que monta os dados. Um único ponto de verdade para o invariante.
**Consequências:** grupo de regime único só aparece no editor da sua demonstração; consistente com `totaisEfetivos`, que já filtrava. Nenhum impacto em ordenação (numeração continua sobre a estrutura inteira).
**Como explicar em entrevista (30s):** "O editor não decide o que entra em cada demonstração — quem decide é o regime do grupo, aplicado na montagem dos dados. Por isso DRE e DFC compartilham o mesmo componente sem duplicar a regra."

## 2026-06-14 — [matriz] regime DRE/DFC/ambos por subgrupo (não só grupo)

**Problema:** o regime (em quais demonstrações entra) só existia por grupo. O usuário queria controlar isso por subgrupo, e tentava conseguir "movendo" o subgrupo entre linhas — o que revertia/errava no recálculo.
**Opções consideradas:** (A) resolver via override de linha (mover o subgrupo) — imperativo, frágil, some no recálculo; (B) regime declarativo por subgrupo, gateado no mesmo `entraNaDemonstracao` que já vale pra grupo.
**Decisão:** B — `addNo` aceita regime para subgrupo; `totaisEfetivos` exclui o movimento se o regime do grupo OU do subgrupo não bate; UI reusa o seletor na criação + ação de botão direito; etiqueta "Só DRE/Só DFC" no subgrupo.
**Por quê:** regime é declarativo e estável; mover é imperativo e não sobrevive ao recálculo de chaves efetivas. Mesma regra dos grupos = consistência e zero surpresa.
**Consequências:** subgrupo "Só DFC" some da DRE (e vice-versa) em totais, chips e drill. Coberto por teste. Override por linha continua existindo para casos pontuais.
**Como explicar em entrevista (30s):** "Em vez de mover o nó entre linhas (imperativo, some no recálculo), modelei regime como atributo declarativo do nó, aplicado num único ponto de gating. Grupo e subgrupo compartilham a mesma regra."

## 2026-06-14 — [apresentacao] HTML offline = app real embutido (snapshot via mock do Supabase)

**Problema:** a apresentação HTML era um runtime vanilla escrito à mão que só aproximava o app — nunca ficava idêntica e divergia a cada mudança.
**Opções consideradas:** (A) embutir o bundle real do app + snapshot dos dados, trocando o Supabase por um mock; (B) 2ª entrada Vite + vite-plugin-singlefile (build duplo, nova dep); (C) seguir polindo o runtime vanilla.
**Decisão:** A. No export, busca-se o `index.html` + assets já publicados, embute-se tudo inline + um snapshot (painel_estado/clientes do cliente) + flag `window.__AG_SNAPSHOT__`. O app, ao ver a flag, troca `supabase` por um mock que serve o snapshot (sem rede), desliga auth e trava tema claro. Fontes (Inter) embutidas em base64.
**Por quê:** zero divergência (é o bundle real), sem nova pipeline de build; todo I/O passa por `supabase.ts`, então trocar a fonte ali troca o app inteiro. Mutações viram no-op → read-only natural.
**Consequências:** removido o runtime antigo (apresentacao.ts, apresentacaoHtml.ts, apresentacao/runtime.ts, estilos.ts, useComentarios.ts, script sugerir-comentarios) — comentários por slide saíram (o app não os tem). Arquivo de alguns MB. Export só funciona sobre o build de produção (não no `vite dev`).
**Como explicar em entrevista (30s):** "Em vez de reimplementar o app em HTML, embuti o próprio bundle e troquei a única porta de I/O (Supabase) por um mock que lê um snapshot. O app não sabe que está offline — roda idêntico, read-only, sem rede."

## 2026-06-14 — [apresentacao] slideshow editável (argumento rico + observação por slide)

**Problema:** a apresentação "app inteiro embutido" não era o formato desejado — o cliente quer um relatório em SLIDES (capa+intro, 1 seção por slide), parecido com um PDF de referência, com argumentos editáveis (texto rico) no topo e observações no rodapé de cada página.
**Opções consideradas:** (A) slideshow reaproveitando o embed de hoje (mock Supabase + componentes reais p/ os dados); (B) runtime de slides vanilla do zero (reimplementa gráficos/tabelas, diverge do app).
**Decisão:** A. No modo apresentação (`MODO_APRESENTACAO`), o app renderiza `<Slideshow>` (capa + 1 slide por seção) em vez do Shell. Cada slide: header/footer roxo, título com underline, caixa de argumento (HTML rico sanitizado), o componente REAL da seção (`ConteudoSecao`), e caixa de observação. Editado na aba Apresentação (`useApresentacao` → `cliente:<id>:apresentacao-v1` → entra no snapshot). Rich text sem dependência (`contentEditable` + `execCommand` + `sanitizarHtml`).
**Por quê:** reusa todo o embed/snapshot/mock (dados idênticos ao app, offline) e adiciona só a casca de slides + edição — modelado no PDF, com nossas cores (roxo #401C7F, tema claro).
**Consequências:** o HTML offline abre direto no slideshow (não no app inteiro). CSS escopado esconde o cabeçalho próprio dos relatórios dentro do slide. Editor: seleção/ordem de slides, argumento (20 linhas, rico) + observação (5 linhas) por slide, campos de capa. Preview só gerando o HTML (sem preview in-app no v1).
**Como explicar em entrevista (30s):** "O modo apresentação troca o shell por um slideshow que reusa os componentes reais para os dados; o que muda por slide (argumento rico + observação) é estado por cliente que viaja no mesmo snapshot — zero reimplementação de gráficos."

## 2026-07-14 — [nibo] Tradução de rótulos Nibo na exibição (regex de GUID + chave de contraparte com fallback)

**Problema:** dados Nibo chegam com código de categoria GUID (sem significado humano) e lançamentos sem stakeholder vêm com GUID nulo (`00000000-…`) e o nome cru gravado no próprio movimento — a UI mostrava GUIDs e um bucket único ilegível.
**Opções:** (A) normalizar no adapter de ingestão (contrato do PLANO_NIBO — "front não sabe a origem"); (B) traduzir na exibição por heurística de forma (regex de GUID), com regras centralizadas em `core/`; (C) marcar o provedor no doc e ramificar por flag.
**Decisão:** B por ora — o adapter Nibo é Fase 2 e ainda não existe; regras num lugar só (`codigoExibivel`/`rotuloCategoria` em `core/categoria`, `codigoContraparte`/`nomeContraparte` em `core/cliente`, `chaveContraparte` em `core/movimento`), cobertas por teste. O GUID segue sendo a CHAVE estável (override/conciliação); só a exibição muda.
**Por quê:** desbloqueia a legibilidade sem esperar a Fase 2 nem arriscar mexer na ingestão; a heurística de shape é o custo — cada consumidor precisa rotear pelas funções de `core/` (a revisão achou `filial.ts` fora da migração, corrigido).
**Consequências:** quando o adapter Fase 2 entrar, avaliar mover a normalização para a ingestão/`MovimentosProvider` (1 ponto em vez de N call-sites) — registrado em PENDENCIAS.md junto com os casos latentes (GUID sem cadastro, CPF/CNPJ como nome, natureza por prefixo).
**Em entrevista (30s):** "Nibo usa GUID como chave e nome cru no lançamento; mantive o GUID como chave estável de dados e centralizei a tradução de exibição em funções puras de core/ com teste. O trade-off é a disciplina de todo consumidor rotear por elas — a revisão pegou um ponto esquecido e o fix foi de três linhas porque a regra morava num lugar só."

## 2026-07-16 — [seguranca] Gate de auth fail-closed (opt-out explícito, não opt-in)

**Problema:** `AUTH_ATIVO = VITE_AUTH_ENABLED === 'true'` desligava o login quando a env var estava ausente. Um deploy que perdesse a var no painel Netlify derrubaria a autenticação em silêncio, e o build não reclamaria — reproduzido na revisão (build sem a var elimina o `<Login>` por tree-shaking).
**Opções:** (A) inverter o sentinela: `!== 'false'` — default ligado, só `'false'` explícito desliga; (B) `throw` no boot se a var faltar num build de produção; (C) deixar como está e confiar no RLS (defense-in-depth já segura).
**Decisão:** A. Um controle de segurança tem que falhar fechado: a ausência de config não pode abrir a porta. `'false'` explícito (dev/local, Apresentação offline) é o único caminho que desliga.
**Por quê:** (B) arrisca white-screen em produção por um typo de config — troca um modo de falha silencioso por um barulhento-demais. (C) já vale (o RLS é fail-closed e auth-off só mostra app vazio, não vaza), mas quem confiar em `AUTH_ATIVO` no futuro herdaria a falha. (A) corrige a raiz sem custo de disponibilidade.
**Consequências:** dev local sem Supabase Auth agora precisa de `VITE_AUTH_ENABLED=false` no `.env` (documentado no `.env.example`). Produção não muda (a var já é `true`); se um dia sumir, o login continua ligado. Mesmo commit trouxe dois fixes de resiliência do `sync-omie`: `omiePagina` passou a herdar o retry de rate-limit do `omieCall` (era o único endpoint sem backoff, e o loop mais longo), e os três loops paginados agora gritam no log quando batem o teto `MAX_PAGINAS` em vez de truncar dado financeiro em silêncio.
**Em entrevista (30s):** "O gate de login dependia de uma env var estar presente e igual a 'true' — se ela sumisse no deploy, a auth caía calada. Inverti pra fail-closed: só um 'false' explícito desliga; perder a configuração mantém a porta trancada. É o princípio de que um controle de segurança falha fechado, não aberto."
