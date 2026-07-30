# Plano UX — visual clean, praticidade, "completo em poucos cliques"

> Pedido de 2026-07-30 ("ultraplan"). Priorizado por impacto no dia a dia do financeiro
> ÷ esforço. Cada item é independente — dá pra pedir um por vez.

## Feito nesta leva
- ✅ Pop-ups alargados (nenhum modal estreito com scroll lateral: sm→lg/xl, lg→2xl, xl→3xl).
- ✅ Temas: Pulsar é o padrão da casa; AUTAG é o dourado; criador de tema básico na ficha.

## P1 — alto impacto, esforço baixo/médio
1. **Caixa de entrada do operador** (nova home): um painel que agrega as pendências que
   hoje exigem abrir 3+ abas — N a conciliar, N aprovações aguardando cliente, N órfãs,
   última sincronização por cliente — cada linha clicável levando direto à ação.
   É o "completo em poucos cliques" em uma tela.
2. **Navegação por tarefa**: renomear "Camada Semântica"→"Classificação",
   "Camada Analítica"→"Relatórios & Cliente", "HUD do Cliente"→"Visão do Cliente",
   "Espelho da Estrutura"→"Conferência". Jargão de arquitetura fora da sidebar.
3. **Modal.tsx único**: hoje a casca de modal existe em ~8 lugares (achado da revisão);
   um componente com larguras padronizadas, Esc, trava de scroll e foco. Base pro clean.
4. **Publicar em 1 clique**: botão "Publicar" no card da apresentação (congela números,
   trigger já pronto) + a publicada aparecendo no HUD do cliente. Fecha o ciclo
   biblioteca → cliente sem sair do app.

## P2 — impacto alto, esforço médio
5. **Tradução do jargão no HUD do cliente**: tooltips em AV%/Δ, "Competência × Caixa"
   explicado em uma linha, "neutros/não conciliados" em linguagem de dono.
6. **Chips de período no topo global**: mês atual · anterior · 3m · ano, sempre visíveis
   na Topbar (o filtro já é global; falta o atalho de 1 clique).
7. **Busca rápida (Ctrl+K)**: trocar de cliente/aba digitando — com 22+ empresas o
   seletor já pede busca.

## P3 — polimento contínuo
8. **Kanban de aprovações** (mesma gramática do de apresentações) com colunas por status.
9. **Densidade**: revisar KPIs repetidos entre abas (Resumo do período aparece em 4 telas
   com pesos diferentes); hero number único por tela (§ hierarquia).
10. **Empty-states acionáveis** em toda vista (o padrão já existe nos Indicadores).
