"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CarrinhoConteudo } from "@/components/loja/carrinho-conteudo";
import { useCarrinho } from "@/components/loja/carrinho-provider";

export function CarrinhoView() {
  const { itens, atualizar, recarregar } = useCarrinho();

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return (
    <div className="space-y-8">
      <Link
        href="/loja"
        className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium uppercase tracking-wide text-primary-foreground hover:bg-primary/90"
      >
        ← Continuar comprando
      </Link>
      <CarrinhoConteudo itens={itens} onAtualizar={atualizar} modo="pagina" />
    </div>
  );
}