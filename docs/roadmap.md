# Roadmap — Painel AG

> Checkpoint 2026-06-06. Produto: BPO financeiro AG. Base reconstruída do zero
> (Lovable usado só como referência visual). Sem login, dados 100% crus da API.

## Pipeline (definição do produto)

| # | Módulo | Estado |
|---|--------|--------|
| 1 | Extração crua da API (Omie) | ✅ `scripts/omie/` |
| 2 | Diferenciação de valores/estrutura | ✅ árvore + agregação |
| 3 | Estrutura + valores unidos | ✅ abas Plano / Valores / Fornecedores |
| 4 | Nossa organização (conciliação manual) | ✅ Modelo AG (drag-and-drop, 2 dimensões) |
| 5 | DRE / DFC | ⬜ não iniciado |

## Lacunas estruturais conhecidas (ordem de impacto)

1. **Persistência = localStorage.** Conciliação fica só no navegador local: não
   compartilha com a equipe, troca de máquina perde tudo, sem histórico. Gargalo real.
2. **Mono-empresa.** ADR-001 prevê 4 camadas (universal → segmento → empresa →
   lançamento); o app hoje só carrega a Acme. "Padrão + adaptabilidade por eixo"
   ainda não existe no código.
3. **Conciliação 100% manual.** Sem motor de regras, todo fechamento refaz o de-para
   do zero. Quebra já no 2º mês.
4. Sem testes no núcleo. Dados de 1 empresa só.

## Fases oficiais (fonte: `Roadmap_Implementacao_PainelAG.md`)

Princípio oficial: **fatia vertical primeiro** — 1 cliente ponta a ponta
(importar → conciliar → DRE/DFC → tela) antes de empilhar camadas.

| Fase | Objetivo | Onde estamos |
|------|----------|--------------|
| 0 — Fundação | Schema multi-tenant (Cliente→Empresa→Centro→Conta→Lançamento, 2 datas), cadastro com parâmetros, de-para base | ⬜ falta backend/multi-tenant |
| 1 — MVP vertical | 1 ERP + motor de conciliação + DRE/DFC caixa navegáveis | 🟡 conciliação manual + estrutura prontas; falta motor de regras e DRE/DFC |
| 2 — Competência & edição | 2 datas, provisões, depreciação, a pagar/receber, recálculo em cascata, neutralização | ⬜ |
| 3 — Análise & indicadores | KPIs configuráveis, AV/AH, comparativos, gráficos, centro de custo | ⬜ |
| 4 — Multiempresa & consolidação | Consolidação de grupo + eliminação intercompany | ⬜ modelo já tem etiqueta intercompany |
| 5 — Inteligência (IA) | Claude (classificação + 3 camadas de aprendizado), insights, projeção | ⬜ |
| 6 — Entrega ao cliente | Orçado×Realizado, relatório executivo PDF, módulos especiais | ⬜ |
| 7 — Escala | 2º conector, versão cliente, benchmarking | ⬜ |

## O que já temos vs. as fases

O app atual é um **protótipo da fatia de conciliação** (parte de Fase 1) rodando sobre
seed local (sem backend). Concluído:
- Extração crua Omie + abas Plano/Valores/Fornecedores (módulos 1–3 do nosso pipeline).
- Conciliação manual drag-and-drop, 2 dimensões (módulo 4).
- **Modelo contábil etiquetado** (DRE/DFC/neutra/intercompany) — fundação do módulo 5.

## Bifurcação atual

- **Backend + multi-tenant (Fase 0)**: resolve persistência/compartilhamento antes de
  construir relatório sobre dado que mora só no navegador. Alinha com o schema oficial.
- **DRE/DFC sobre o seed (parte da Fase 1)**: entrega visual rápida derivando das
  etiquetas que acabamos de criar; valida a estrutura com o BPO antes do backend.

Decisão de ordem registrada em `DECISIONS.md`.
