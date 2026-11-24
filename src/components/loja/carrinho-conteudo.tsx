"use client";

import Link from "next/link";
import { iniciarCheckout } from "@/actions/estudo";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";
import {
  chaveItem,
  itensParaCheckout,
  subtotalCarrinho,
  type ItemCarrinho,
} from "@/lib/carrinho";
import { cn } from "@/lib/utils";

function ControleQuantidade({
  valor,
  onMenos,
  onMais,
}: {
  valor: number;
  onMenos: () => void;
  onMais: () => void;
}) {
  return (
    <div className="inline-flex items-stretch overflow-hidden rounded border border-border text-sm">
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center bg-white hover:bg-secondary disabled:opacity-40"
        onClick={onMenos}
        disabled={valor <= 1}
        aria-label="Diminuir quantidade"
      >
        −
      </button>
      <span className="flex h-9 min-w-9 items-center justify-center border-x border-border bg-white px-2 tabular-nums">
        {valor}
      </span>
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center bg-white hover:bg-secondary"
        onClick={onMais}
        aria-label="Aumentar quantidade"
      >
        +
      </button>
    </div>
  );
}

function LinhaProduto({
  item,
  onRemover,
  onQuantidade,
  compacto,
}: {
  item: ItemCarrinho;
  onRemover: () => void;
  onQuantidade: (q: number) => void;
  compacto?: boolean;
}) {
  const linhaTotal = item.preco * item.quantidade;

  return (
    <article
      className={cn(
        "grid gap-4 border-b border-border py-6",
        compacto ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-[1fr_auto]"
      )}
    >
      <div className="flex gap-4">
        <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded border border-border bg-white">
          {item.imagemUrl ? (
            <img src={item.imagemUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sem foto</div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="font-semibold text-primary">{item.nome}</h3>
          <p className="text-sm text-muted-foreground">{formatBRL(item.preco)}</p>
          {item.descricaoResumo ? (
            <p className="line-clamp-2 text-xs text-muted-foreground">{item.descricaoResumo}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <ControleQuantidade
              valor={item.quantidade}
              onMenos={() => onQuantidade(Math.max(1, item.quantidade - 1))}
              onMais={() => onQuantidade(item.quantidade + 1)}
            />
            <button
              type="button"
              className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              onClick={onRemover}
            >
              Remover item
            </button>
          </div>
        </div>
      </div>
      <p className={cn("text-right font-medium", compacto && "text-lg")}>{formatBRL(linhaTotal)}</p>
    </article>
  );
}

function ResumoPedido({
  itens,
  botaoCheckout,
  className,
}: {
  itens: ItemCarrinho[];
  botaoCheckout?: React.ReactNode;
  className?: string;
}) {
  const subtotal = subtotalCarrinho(itens);
  const payload = JSON.stringify(itensParaCheckout(itens));

  return (
    <aside className={cn("space-y-4", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total no carrinho</p>
      <hr className="border-border" />
      <LinhaValor rotulo="Subtotal" valor={formatBRL(subtotal)} />
      <hr className="border-border" />
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-lg font-semibold">Total</span>
        <span className="text-xl font-bold text-primary">{formatBRL(subtotal)}</span>
      </div>
      {botaoCheckout ?? (
        <ActionForm action={iniciarCheckout} className="pt-2">
          <input type="hidden" name="itens" value={payload} />
          <SubmitButton
            className="h-12 w-full uppercase tracking-wide"
            variant="default"
            pendingLabel="Abrindo o pagamento..."
          >
            Finalizar compra
          </SubmitButton>
        </ActionForm>
      )}
    </aside>
  );
}

function LinhaValor({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{rotulo}</span>
      <span>{valor}</span>
    </div>
  );
}

export function CarrinhoVazio({ fechar }: { fechar?: () => void }) {
  return (
    <div className="space-y-4 py-8 text-center text-sm text-muted-foreground">
      <p>O carrinho está vazio.</p>
      {fechar ? (
        <Button type="button" variant="outline" onClick={fechar}>
          Continuar comprando
        </Button>
      ) : (
        <Link href="/loja" className="inline-block text-primary underline-offset-2 hover:underline">
          Ver a loja
        </Link>
      )}
    </div>
  );
}

export function CarrinhoConteudo({
  itens,
  onAtualizar,
  modo = "pagina",
  aoFechar,
}: {
  itens: ItemCarrinho[];
  onAtualizar: (proximo: ItemCarrinho[]) => void;
  modo?: "pagina" | "painel";
  aoFechar?: () => void;
}) {
  if (itens.length === 0) {
    return <CarrinhoVazio fechar={aoFechar} />;
  }

  function remover(chave: string) {
    onAtualizar(itens.filter((item) => chaveItem(item) !== chave));
  }

  function alterarQuantidade(chave: string, quantidade: number) {
    onAtualizar(
      itens.map((item) => (chaveItem(item) === chave ? { ...item, quantidade: Math.max(1, quantidade) } : item))
    );
  }

  const lista = (
    <div>
      {itens.map((item) => (
        <LinhaProduto
          key={chaveItem(item)}
          item={item}
          compacto={modo === "painel"}
          onRemover={() => remover(chaveItem(item))}
          onQuantidade={(q) => alterarQuantidade(chaveItem(item), q)}
        />
      ))}
    </div>
  );

  const resumo = <ResumoPedido itens={itens} />;

  if (modo === "painel") {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{lista}</div>
        <div className="space-y-3 border-t border-border bg-white px-5 py-5">
          {resumo}
          <Link
            href="/carrinho"
            className="block text-center text-sm text-primary underline-offset-2 hover:underline"
          >
            Ver carrinho completo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_minmax(280px,360px)] lg:items-start">
      <section>
        <header className="hidden border-b border-border pb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[1fr_auto]">
          <span>Produto</span>
          <span className="text-right">Total</span>
        </header>
        {lista}
      </section>
      <div className="rounded-xl border border-border bg-white p-6 lg:sticky lg:top-6">{resumo}</div>
    </div>
  );
}
