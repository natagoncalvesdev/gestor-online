"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { iniciarCheckout } from "@/actions/estudo";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";
import { gravarCarrinho, lerCarrinho, type ItemCarrinho } from "@/components/loja/comprar-box";

export function CarrinhoView() {
  const [itens, setItens] = useState<ItemCarrinho[]>([]);

  useEffect(() => {
    setItens(lerCarrinho());
  }, []);

  function remover(indice: number) {
    const proximo = itens.filter((_, i) => i !== indice);
    setItens(proximo);
    gravarCarrinho(proximo);
  }

  const total = itens.reduce((soma, item) => soma + item.preco, 0);
  const payload = JSON.stringify(
    itens.map((item) => ({ produtoId: item.produtoId, variacaoId: item.variacaoId }))
  );

  if (itens.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        O carrinho está vazio. <Link href="/loja">Ver a loja</Link>.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y rounded-xl border bg-card">
        {itens.map((item, indice) => (
          <li key={`${item.produtoId}-${item.variacaoId ?? "base"}`} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{item.nome}</p>
            </div>
            <div className="text-right">
              <p>{formatBRL(item.preco)}</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => remover(indice)}>
                Remover
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-lg font-semibold">Total {formatBRL(total)}</p>
      <ActionForm action={iniciarCheckout} className="space-y-3">
        <input type="hidden" name="itens" value={payload} />
        <SubmitButton variant="accent" pendingLabel="Abrindo o pagamento...">
          Pagar com Mercado Pago
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
