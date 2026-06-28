# PULSAR FINANCE

Dashboard financeiro **multi-tenant** para BPO contábil — consolida lançamentos de
múltiplos clientes a partir de ERPs (Omie / Nibo) em demonstrações financeiras,
fluxo de caixa e visões por centro de custo.

> ⚠️ **Portfólio — somente leitura.** Este repositório é uma vitrine profissional,
> publicada para avaliação do meu trabalho de engenharia. **Não é executável**:
> credenciais, dados de cliente e artefatos de deploy foram removidos, e todos os
> nomes/identificadores são fictícios. Veja [`LICENSE`](./LICENSE).

## Stack
- **Front:** React + TypeScript + Vite, Tailwind
- **Back:** Supabase (Postgres + RLS + Edge Functions)
- **Integração:** Omie e Nibo (ERPs) via Edge Functions de sync
- **Testes:** Vitest (núcleo de cálculo financeiro)

## Destaques de engenharia
- **Isolamento multi-tenant** por cliente com Row Level Security — cada cliente do
  BPO só enxerga o próprio estado (`painel_clientes` / `painel_estado`).
- **Modelo de 4 camadas** de classificação financeira (movimentação → classe →
  subgrupo → grupo) com matriz customizável por cliente.
- **Sync incremental de ERP** (`supabase/functions/sync-omie`) — credencial por
  tenant guardada server-side, paginação com backoff de rate-limit, varredura
  em background.
- **Demonstrações & fluxo de caixa** derivados do núcleo canônico em `src/core/`
  (testável, sem dependência de UI).
- **Modo apresentação offline** — exporta um HTML autossuficiente com snapshot
  injetado em runtime (read-only, sem rede).

## Mapa do código
| Caminho | O quê |
|---|---|
| `src/core/` | núcleo de domínio: tenant, demonstração, fluxo de caixa (testado) |
| `src/components/` | painéis: demonstrações, cadastros, relatórios, apresentação |
| `supabase/functions/` | Edge Functions de sync e credenciais por tenant |
| `supabase/migrations/` | schema + políticas RLS |
| `scripts/` | ferramentas de ETL/análise (sync Omie/Nibo, matriz de classificação) |

## Decisões de arquitetura
Registradas em [`DECISIONS.md`](./DECISIONS.md) — trade-offs de cada escolha técnica.

---
*Construído por Andrey Ricaliff. Código proprietário exibido apenas como portfólio.*
