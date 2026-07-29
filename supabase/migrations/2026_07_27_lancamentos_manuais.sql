-- Lançamentos manuais — receita/despesa que não passa pela conta bancária e o ERP não vê
-- (vendas SAIPOS/iFood/Cardápio Web dos clientes de alimentação).
--
-- Por que tabela própria e não o doc raw do sync: o re-sync sobrescreve
-- cliente:<id>:movimentos-raw inteiro — qualquer dado manual guardado ali morreria no
-- próximo sync. Aqui é a primeira superfície de ESCRITA do Finance; as regras são
-- trilha de autor em tudo e nada de apagar de verdade.
--
-- Valor em CENTAVOS (bigint) — o dialeto do app inteiro; numeric com casas decimais
-- convidaria arredondamento em runtime.

create table if not exists public.painel_lancamentos_manuais (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references public.painel_clientes(id) on delete cascade,
  data           date not null,
  descricao      text not null check (length(trim(descricao)) > 0),
  valor_centavos bigint not null check (valor_centavos > 0),
  -- Magnitude + natureza declarada, nunca sinal no valor (doutrina EtiquetaFluxo).
  natureza       text not null check (natureza in ('receita', 'despesa')),
  -- Código da categoria do plano do cliente — obrigatório: quem digita sabe o que é,
  -- então nada cai em "A Conciliar" (concilia-uma-vez vale para o manual também).
  categoria      text not null check (length(trim(categoria)) > 0),
  -- Plataforma de onde veio (IFOOD, SAIPOS…). Vira a contraparte do movimento canônico.
  origem         text not null default 'MANUAL',
  observacao     text not null default '',
  criado_por     uuid not null default auth.uid(),
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz,
  -- Soft-delete: some da DRE, fica na trilha. Número financeiro que desaparece sem
  -- rastro é disputa com cliente esperando pra acontecer.
  removido_em    timestamptz,
  removido_por   uuid
);

create index if not exists lanc_manual_por_cliente
  on public.painel_lancamentos_manuais (cliente_id, data desc)
  where removido_em is null;

-- Trigger carimba a trilha — o app não é confiável para dizer QUEM removeu.
create or replace function public.carimbar_lancamento_manual()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.atualizado_em := now();
  if new.removido_em is not null and old.removido_em is null then
    new.removido_por := auth.uid();
  end if;
  -- Ressuscitar exige zerar o carimbo junto (consistência da trilha).
  if new.removido_em is null then
    new.removido_por := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_carimbar_lancamento_manual on public.painel_lancamentos_manuais;
create trigger trg_carimbar_lancamento_manual
  before update on public.painel_lancamentos_manuais
  for each row execute function public.carimbar_lancamento_manual();

-- ── RLS ─────────────────────────────────────────────────────────────────────────
-- SEM policy de DELETE (e sem grant): hard-delete impossível por construção — o
-- fail-closed vira garantia estrutural do soft-delete, não disciplina de código.
alter table public.painel_lancamentos_manuais enable row level security;
revoke all on public.painel_lancamentos_manuais from anon, authenticated;
grant select, insert, update on public.painel_lancamentos_manuais to authenticated;

drop policy if exists lanc_manual_sel on public.painel_lancamentos_manuais;
create policy lanc_manual_sel on public.painel_lancamentos_manuais for select
using (
  public.sessao_verificada()
  and (
    public.eh_operador(auth.uid())
    -- Cliente vê os próprios lançamentos VIVOS (o removido é trilha interna do BPO).
    or (removido_em is null
        and cliente_id in (select cid from public.cliente_ids_do_usuario(auth.uid()) cid))
  )
);

drop policy if exists lanc_manual_ins on public.painel_lancamentos_manuais;
create policy lanc_manual_ins on public.painel_lancamentos_manuais for insert
with check (public.sessao_verificada() and public.eh_operador(auth.uid()));

drop policy if exists lanc_manual_upd on public.painel_lancamentos_manuais;
create policy lanc_manual_upd on public.painel_lancamentos_manuais for update
using (public.sessao_verificada() and public.eh_operador(auth.uid()))
with check (public.sessao_verificada() and public.eh_operador(auth.uid()));
