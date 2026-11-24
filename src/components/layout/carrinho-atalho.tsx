"use client";

import Link from "next/link";
import { useCarrinho } from "@/components/loja/carrinho-provider";

export function CarrinhoAtalho() {
  const { totalUnidades } = useCarrinho();

  return (
    <Link href="/carrinho" className="relative text-sm hover:text-primary">
      Carrinho
      {totalUnidades > 0 ? (
        <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
          {totalUnidades > 99 ? "99+" : totalUnidades}
        </span>
      ) : null}
    </Link>
  );
}