"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useCarrinho } from "@/components/loja/carrinho-provider";

/** Distância em pixels da borda direita da janela que abre o carrinho. */
const MARGEM_BORDA_PX = 16;

export function CarrinhoBordaLoja() {
  const pathname = usePathname();
  const { abrirPainel, painelAberto } = useCarrinho();
  const naLoja = pathname.startsWith("/loja");

  useEffect(() => {
    if (!naLoja) return;

    const aoMover = (event: MouseEvent) => {
      if (painelAberto) return;
      const distanciaDireita = window.innerWidth - event.clientX;
      if (distanciaDireita <= MARGEM_BORDA_PX) abrirPainel();
    };

    window.addEventListener("mousemove", aoMover, { passive: true });
    return () => window.removeEventListener("mousemove", aoMover);
  }, [naLoja, painelAberto, abrirPainel]);

  return null;
}