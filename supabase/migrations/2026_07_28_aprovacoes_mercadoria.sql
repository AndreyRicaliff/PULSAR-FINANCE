-- Inspiração da planilha real de pagamentos (coluna "MERCADORIA RECEBIDA?"):
-- checkpoint de não pagar fornecedor sem a mercadoria ter chegado.
--
-- Três estados de propósito: NULL = não se aplica (aluguel, imposto, serviço),
-- false = compra aguardando entrega, true = recebida. Booleano com default falso
-- marcaria "aguardando" em conta que nem tem mercadoria.
--
-- O campo fica FORA do congelamento pós-decisão: a mercadoria chega DEPOIS do
-- cliente aprovar — travar junto com valor/vencimento quebraria o uso real.

alter table public.painel_aprovacoes
  add column if not exists mercadoria_recebida boolean;

-- A mudança do checkpoint também vira evento — trilha continua contando a história toda.
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

  if new.mercadoria_recebida is distinct from old.mercadoria_recebida then
    perform public._gravar_evento_aprovacao(
      new.id, 'comentario',
      case
        when new.mercadoria_recebida is true  then 'mercadoria recebida'
        when new.mercadoria_recebida is false then 'aguardando mercadoria'
        else 'controle de mercadoria removido'
      end);
  end if;

  return new;
end;
$$;
