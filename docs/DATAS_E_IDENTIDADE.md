# Datas, identidade e origens — o contrato do dado

> Para a equipe do BPO (primeira metade) e para quem desenvolve (segunda).
> Nasceu do report de 07/08/2026: "registros mudando de mês, sem data ou sem código".
> Medição em produção no mesmo dia, 24 tenants. Glossário vivo em `src/core/origens.ts`.

## O que são as ORIGENS (a sigla na ponta de cada lançamento)

Todo lançamento carrega a sigla de onde nasceu no ERP. Ela define o comportamento do
registro — principalmente **qual data ele realmente tem**. Passe o mouse na coluna de
título do detalhamento para ver esta descrição no app.

| Sigla | O que é | Tem competência própria? |
|---|---|---|
| COMP | Título do módulo de compras (Omie) | ✅ emissão |
| MANP / MANR | Título digitado à mão na Omie (pagar/receber) | ✅ emissão |
| CTEP | Título de conhecimento de transporte | ✅ emissão |
| RPTP | Título recorrente/programado (aluguel, assinatura) | ✅ emissão |
| APIP | Título criado por outro sistema via API | ✅ emissão |
| BAXP / BAXR / BARP | **Quitação** de um título (baixa; BARP = parcial) | — é evento de pagamento |
| **EXTP / EXTR** | Débito/crédito importado do **extrato bancário**, sem título | ❌ só data de pagamento |
| **TRAP / TRAR** | Perna de **transferência entre contas próprias** | ❌ e **não é receita/despesa** (Regra Mãe) |
| NIBO | Agendamento (schedule) do Nibo | ✅ accrualDate |
| manual | Lançamento criado dentro do Pulsar Finance | ✅ |

**O tamanho de cada coisa em produção (07/08/2026):** EXTR 43.627 · EXTP 22.501 ·
NIBO 55.687 · MANP 3.750 · TRAP+TRAR 2.568 · RPTP 717 · MANR 622 · baixas ~490 ·
COMP 127. **Extrato é a maioria do dado Omie, não exceção.**

## A regra das datas (por regime)

**Caixa:** data do pagamento; se não houver, a da conciliação bancária. Sem nenhuma das
duas, o lançamento fica fora do recorte de caixa (ele ainda não virou dinheiro).

**Competência:** data de emissão. Quando o lançamento **não tem** emissão (todo EXTP/EXTR/
TRAP/TRAR), o app usa a melhor data existente, nesta ordem: vencimento → registro →
**pagamento** → conciliação.

### A consequência que gerava os "registros mudando de mês"

Num cliente onde quase tudo entra pelo extrato, a competência é ancorada pela **data de
pagamento** — a DRE dele se comporta como caixa. Medido em produção:

| Cliente (Omie) | Lançamentos | Ancorados pelo caixa em competência |
|---|---|---|
| IMPERIAL PIZZAS | 8.095 | **99,9%** |
| POLPAS NATURELLE | 6.911 | 99,6% |
| ARAÚJO SALGADOS | 12.683 | 96% |
| MAGDIEL LANCHES | 23.146 | 94% |

Não é defeito do app — lançamento de extrato não tem outra data — mas **precisa estar
visível**: desde 07/08 o aviso do período mostra *"N (x%) ancorados pela data de pagamento
— extrato sem emissão"*. Se esse número for alto, leia a DRE daquele cliente como caixa,
ou trabalhe com títulos no ERP para ganhar competência de verdade.

### Protocolo do "sem data" / "sem código"

- **Sem data utilizável no regime:** o lançamento NÃO é jogado num mês por chute — fica
  fora do recorte e é **contado no aviso** ("N sem data utilizável"). Zero casos em
  produção hoje; se aparecer, é sinal de sync com problema, não de conciliação.
- **Sem código:** não existe. Todo lançamento tem identidade estável — título: `t:<id>|<parcela>`;
  evento de extrato: `cc:<id do lançamento bancário>`; criado no painel: `manual:<id>`.
  O que existia até 07/08 era o app **ignorando** o id do extrato (bug corrigido: renomear
  um evento de extrato renomeava todos).

## Nibo — o mesmo contrato na língua do Nibo

| Conceito | Omie | Nibo |
|---|---|---|
| Identidade | nCodTitulo / nCodMovCC | scheduleId (sempre presente — 55.687/55.687 no censo) |
| Competência | dDtEmissao | accrualDate |
| Vencimento | dDtVenc | dueDate |
| **Baixa** | dDtPagamento real | **≈ dueDate** (aproximação: a listagem não expõe o pagamento real) |
| Categoria | código hierárquico `2.01.03` | GUID opaco (não exibir) |
| Contraparte | código no cadastro | nome no lançamento + GUID do stakeholder |

Caveats Nibo ativos: baixa aproximada pelo vencimento afeta o **recorte mensal** da DFC
(não os totais); `paidValue` negativo é tratado na ingestão; centros de custo nunca
exercitados com dado real (nenhum cliente Nibo tem).

## Para quem desenvolve

- **Âncora de data:** `ancoraDoMovimento(m, regime)` em `core/periodo.ts` — devolve
  `{ iso, fonte, emprestada }`. `iso` é byte-idêntico ao `dataDoMovimento` histórico
  (provado por força bruta em `ancoragem.test.ts`); `fonte` nomeia a proveniência;
  `emprestada` marca competência ancorada por pagamento/conciliação.
- **Identidade:** `chaveMovimento(m)` em `core/movimento.ts` (`cc:` → `t:` → `x:`fingerprint).
  É a MESMA função do mapa de filiais (`chaveMovFilial` é alias) — o formato está
  persistido; mudar a ordem órfã atribuições salvas.
- **Nunca** derive natureza/hierarquia/nível do FORMATO do código de categoria (pontos,
  prefixo): GUID Nibo não tem nada disso. Use `paiCodigo` e o campo `natureza`.
- Sync incremental usa `mesclarMovimentos` (core/sincronizacao.ts) — keyed por
  `chaveMovimento`; por idTitulo cru colapsaria os 68.696 eventos de extrato.
- Origem nova aparecendo em prod → catalogar em `core/origens.ts` (o fallback não quebra,
  mas descreve genérico).
