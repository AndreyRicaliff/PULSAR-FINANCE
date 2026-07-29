-- Aprovação de contas a pagar — o cliente aprova antes do agendamento/pagamento.
-- Substitui a planilha: a fila, a decisão, a conversa e a auditoria viram o mesmo dado.
--
-- Decisões estruturais (não são detalhe de app, são garantia de banco):
-- 1. A MÁQUINA DE ESTADOS mora num trigger — transição ilegal é exceção, não bug de tela.
-- 2. Depois que sai de 'pendente', os campos da conta congelam (fornecedor/valor/venc):
--    o cliente aprovou UM valor; editar depois da decisão anularia a prova.
-- 3. A TRILHA é gerada por trigger (criação e cada transição viram evento sozinhas) e a
--    tabela de eventos não tem UPDATE nem DELETE — auditoria imutável por construção.
-- 4. O cliente decide por RPC (fase 3, quando os acessos tiverem e-mail real); até lá o
--    financeiro registra a decisão recebida por fora, e isso fica dito na trilha.

create table if not exists public.painel_aprovacoes (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references public.painel_clientes(id) on delete cascade,
  -- id do título no ERP quando importada do sync; NULL = criada manualmente.
  titulo_ref     text,
  fornecedor     text not null check (length(trim(fornecedor)) > 0),
  descricao      text not null default '',
  valor_centavos bigint not null check (valor_centavos > 0),
  vencimento     date not null,
  status         text not null default 'pendente'
                 check (status in ('pendente','aprovada','reprovada','agendada','paga','cancelada')),
  decidido_por   uuid,
  decidido_em    timestamptz,
  criado_por     uuid not null default auth.uid(),
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz
);

create index if not exists aprovacao_por_cliente
  on public.painel_aprovacoes (cliente_id, status, vencimento);

-- O mesmo título do ERP não entra na fila duas vezes.
create unique index if not exists aprovacao_titulo_unico
  on public.painel_aprovacoes (cliente_id, titulo_ref) where titulo_ref is not null;

create table if not exists public.painel_aprovacao_eventos (
  id           uuid primary key default gen_random_uuid(),
  aprovacao_id uuid not null references public.painel_aprovacoes(id) on delete cascade,
  autor        uuid not null,
  -- Rótulo resolvido na gravação: quem lê a trilha não precisa de join com acessos.
  autor_rotulo text not null,
  tipo         text not null check (tipo in ('criacao','comentario','aprovacao','reprovacao',
                                             'reabertura','agendamento','pagamento','cancelamento')),
  texto        text not null default '',
  criado_em    timestamptz not null default now()
);

create index if not exists evento_por_aprovacao
  on public.painel_aprovacao_eventos (aprovacao_id, criado_em);

-- ── Trilha automática ───────────────────────────────────────────────────────────
create or replace function public._gravar_evento_aprovacao(p_aprovacao uuid, p_tipo text, p_texto text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_autor uuid := auth.uid();
begin
  insert into painel_aprovacao_eventos (aprovacao_id, autor, autor_rotulo, tipo, texto)
  values (
    p_aprovacao,
    v_autor,
    case when public.eh_operador(v_autor) then 'Financeiro' else 'Cliente' end,
    p_tipo,
    coalesce(p_texto, '')
  );
end;
$$;

create or replace function public.aprovacao_pos_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._gravar_evento_aprovacao(
    new.id, 'criacao',
    case when new.titulo_ref is not null then 'importada do ERP' else 'criada manualmente' end);
  return new;
end;
$$;

-- ── Máquina de estados + congelamento ──────────────────────────────────────────
create or replace function public.aprovacao_valida_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.atualizado_em := now();

  -- Congela a conta depois da decisão: o cliente aprovou UM valor, não "o que estiver lá".
  if old.status <> 'pendente' and (
       new.fornecedor     is distinct from old.fornecedor
    or new.descricao      is distinct from old.descricao
    or new.valor_centavos is distinct from old.valor_centavos
    or new.vencimento     is distinct from old.vencimento
    or new.titulo_ref     is distinct from old.titulo_ref
  ) then
    raise exception 'conta decidida nao se edita — reabra (nova rodada) para alterar';
  end if;

  if new.status = old.status then
    return new;
  end if;

  if not (
       (old.status = 'pendente'  and new.status in ('aprovada','reprovada','cancelada'))
    or (old.status = 'aprovada'  and new.status in ('agendada','cancelada'))
    or (old.status = 'agendada'  and new.status in ('paga','cancelada'))
    or (old.status = 'reprovada' and new.status in ('pendente','cancelada'))
  ) then
    raise exception 'transicao ilegal: % -> %', old.status, new.status;
  end if;

  -- Decisão carimbada uma vez; reabrir zera para a nova rodada.
  if new.status in ('aprovada','reprovada') then
    new.decidido_por := auth.uid();
    new.decidido_em  := now();
  elsif new.status = 'pendente' then
    new.decidido_por := null;
    new.decidido_em  := null;
  end if;

  return new;
end;
$$;

create or replace function public.aprovacao_pos_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    perform public._gravar_evento_aprovacao(
      new.id,
      case new.status
        when 'aprovada'  then 'aprovacao'
        when 'reprovada' then 'reprovacao'
        when 'pendente'  then 'reabertura'
        when 'agendada'  then 'agendamento'
        when 'paga'      then 'pagamento'
        else 'cancelamento'
      end,
      '');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_aprovacao_pos_insert on public.painel_aprovacoes;
create trigger trg_aprovacao_pos_insert
  after insert on public.painel_aprovacoes
  for each row execute function public.aprovacao_pos_insert();

drop trigger if exists trg_aprovacao_valida_update on public.painel_aprovacoes;
create trigger trg_aprovacao_valida_update
  before update on public.painel_aprovacoes
  for each row execute function public.aprovacao_valida_update();

drop trigger if exists trg_aprovacao_pos_update on public.painel_aprovacoes;
create trigger trg_aprovacao_pos_update
  after update on public.painel_aprovacoes
  for each row execute function public.aprovacao_pos_update();

-- ── RPCs (client-ready: a fase 3 só troca QUEM chama, não o caminho) ───────────
-- SECURITY DEFINER passa por cima da RLS, então os portões são explícitos aqui dentro.
create or replace function public.decidir_aprovacao(p_id uuid, p_decisao text, p_comentario text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_cliente uuid;
begin
  if not public.sessao_verificada() then
    raise exception 'sessao nao verificada';
  end if;
  if p_decisao not in ('aprovada','reprovada') then
    raise exception 'decisao invalida';
  end if;
  select cliente_id into v_cliente from painel_aprovacoes where id = p_id and status = 'pendente';
  if v_cliente is null then
    raise exception 'conta inexistente ou ja decidida';
  end if;
  if not (public.eh_operador(auth.uid())
          or v_cliente in (select cid from public.cliente_ids_do_usuario(auth.uid()) cid)) then
    raise exception 'sem vinculo com esta conta';
  end if;

  update painel_aprovacoes set status = p_decisao where id = p_id;
  if length(trim(coalesce(p_comentario,''))) > 0 then
    perform public._gravar_evento_aprovacao(p_id, 'comentario', trim(p_comentario));
  end if;
end;
$$;

create or replace function public.comentar_aprovacao(p_id uuid, p_texto text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_cliente uuid;
begin
  if not public.sessao_verificada() then
    raise exception 'sessao nao verificada';
  end if;
  if length(trim(coalesce(p_texto,''))) = 0 then
    raise exception 'comentario vazio';
  end if;
  select cliente_id into v_cliente from painel_aprovacoes where id = p_id;
  if v_cliente is null then
    raise exception 'conta inexistente';
  end if;
  if not (public.eh_operador(auth.uid())
          or v_cliente in (select cid from public.cliente_ids_do_usuario(auth.uid()) cid)) then
    raise exception 'sem vinculo com esta conta';
  end if;
  perform public._gravar_evento_aprovacao(p_id, 'comentario', trim(p_texto));
end;
$$;

-- ── RLS ─────────────────────────────────────────────────────────────────────────
alter table public.painel_aprovacoes enable row level security;
revoke all on public.painel_aprovacoes from anon, authenticated;
-- Sem DELETE: encerrar é 'cancelada', com evento — fila de pagamento não some, encerra.
grant select, insert, update on public.painel_aprovacoes to authenticated;

drop policy if exists aprovacao_sel on public.painel_aprovacoes;
create policy aprovacao_sel on public.painel_aprovacoes for select
using (
  public.sessao_verificada()
  and (public.eh_operador(auth.uid())
       or cliente_id in (select cid from public.cliente_ids_do_usuario(auth.uid()) cid))
);

drop policy if exists aprovacao_ins on public.painel_aprovacoes;
create policy aprovacao_ins on public.painel_aprovacoes for insert
with check (public.sessao_verificada() and public.eh_operador(auth.uid()));

drop policy if exists aprovacao_upd on public.painel_aprovacoes;
create policy aprovacao_upd on public.painel_aprovacoes for update
using (public.sessao_verificada() and public.eh_operador(auth.uid()))
with check (public.sessao_verificada() and public.eh_operador(auth.uid()));

alter table public.painel_aprovacao_eventos enable row level security;
revoke all on public.painel_aprovacao_eventos from anon, authenticated;
-- SÓ select: nem o operador altera ou apaga trilha (eventos nascem pelos triggers/RPCs,
-- que são SECURITY DEFINER). Comentário do operador entra por comentar_aprovacao.
grant select on public.painel_aprovacao_eventos to authenticated;

drop policy if exists evento_sel on public.painel_aprovacao_eventos;
create policy evento_sel on public.painel_aprovacao_eventos for select
using (
  public.sessao_verificada()
  and exists (
    select 1 from public.painel_aprovacoes a
    where a.id = aprovacao_id
      and (public.eh_operador(auth.uid())
           or a.cliente_id in (select cid from public.cliente_ids_do_usuario(auth.uid()) cid))
  )
);
