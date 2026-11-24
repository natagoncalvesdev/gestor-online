"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CarrinhoConteudo } from "@/components/loja/carrinho-conteudo";
import { Button } from "@/components/ui/button";
import {
  EVENTO_CARRINHO,
  gravarCarrinho,
  lerCarrinho,
  totalUnidades,
  type ItemCarrinho,
} from "@/lib/carrinho";

type CarrinhoContexto = {
  itens: ItemCarrinho[];
  totalUnidades: number;
  painelAberto: boolean;
  abrirPainel: () => void;
  fecharPainel: () => void;
  atualizar: (proximo: ItemCarrinho[]) => void;
  recarregar: () => void;
};

const Contexto = createContext<CarrinhoContexto | null>(null);

export function useCarrinho() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useCarrinho deve ser usado dentro de CarrinhoProvider.");
  return ctx;
}

export function CarrinhoProvider({ children }: { children: React.ReactNode }) {
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [painelAberto, setPainelAberto] = useState(false);
  const [montado, setMontado] = useState(false);

  const recarregar = useCallback(() => {
    setItens(lerCarrinho());
  }, []);

  useEffect(() => {
    recarregar();
    setMontado(true);
    const ouvir = () => recarregar();
    window.addEventListener(EVENTO_CARRINHO, ouvir);
    window.addEventListener("storage", ouvir);
    return () => {
      window.removeEventListener(EVENTO_CARRINHO, ouvir);
      window.removeEventListener("storage", ouvir);
    };
  }, [recarregar]);

  useEffect(() => {
    if (!painelAberto) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = antes;
    };
  }, [painelAberto]);

  useEffect(() => {
    if (!painelAberto) return;
    const onTecla = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPainelAberto(false);
    };
    window.addEventListener("keydown", onTecla);
    return () => window.removeEventListener("keydown", onTecla);
  }, [painelAberto]);

  const atualizar = useCallback((proximo: ItemCarrinho[]) => {
    setItens(proximo);
    gravarCarrinho(proximo);
  }, []);

  const valor = useMemo<CarrinhoContexto>(
    () => ({
      itens: montado ? itens : [],
      totalUnidades: totalUnidades(montado ? itens : []),
      painelAberto,
      abrirPainel: () => setPainelAberto(true),
      fecharPainel: () => setPainelAberto(false),
      atualizar,
      recarregar,
    }),
    [itens, montado, painelAberto, atualizar, recarregar]
  );

  return (
    <Contexto.Provider value={valor}>
      {children}
      {painelAberto ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Fechar resumo do carrinho"
            onClick={() => setPainelAberto(false)}
          />
          <div
            className="relative flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="carrinho-painel-titulo"
          >
            <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <p id="carrinho-painel-titulo" className="text-lg font-semibold text-primary">
                  Carrinho
                </p>
                <p className="text-sm text-muted-foreground">
                  {valor.totalUnidades === 0
                    ? "Nenhum item"
                    : `${valor.totalUnidades} ${valor.totalUnidades === 1 ? "item" : "itens"}`}
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPainelAberto(false)}>
                Fechar
              </Button>
            </header>
            <CarrinhoConteudo
              itens={valor.itens}
              modo="painel"
              aoFechar={() => setPainelAberto(false)}
              onAtualizar={atualizar}
            />
          </div>
        </div>
      ) : null}
    </Contexto.Provider>
  );
}