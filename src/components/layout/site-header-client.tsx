"use client";

import Link from "next/link";
import { Bell, ShoppingCart } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { CarrinhoAtalho } from "@/components/layout/carrinho-atalho";
import { useCarrinho } from "@/components/loja/carrinho-provider";

export function SiteHeaderClient({
  sessionType,
}: {
  sessionType: "aluno" | "interno" | null;
}) {
  if (sessionType === "aluno") return <MenuAluno />;

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Logo />
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          <Link href="/loja">Loja</Link>
          {sessionType === "interno" ? <Link href="/secretaria/dashboard">Secretaria</Link> : null}
          {!sessionType ? (
            <>
              <Link href="/login">Entrar</Link>
              <Link href="/cadastro" className="rounded-md bg-accent px-3 py-2 text-accent-foreground">
                Criar conta
              </Link>
            </>
          ) : null}
          <CarrinhoAtalho />
        </nav>
      </div>
    </header>
  );
}

function MenuAluno() {
  const { totalUnidades } = useCarrinho();
  const item = "text-[15px] text-slate-500 hover:text-slate-800";

  return (
    <header className="border-b border-slate-200/80 bg-[#f7f4ef]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Logo />
        <nav className="flex flex-wrap items-center gap-5">
          <Link href="/" className={item}>Início</Link>
          <Link href="/loja" className={item}>Loja</Link>
          <Link href="/indicacoes" className={item}>Indicações</Link>
          <Link href="/meus-cursos" className={item}>Meus cursos</Link>
          <Link href="/perfil" className={item}>Minha conta</Link>
          <Link href="/carrinho" className="relative text-slate-600 hover:text-slate-900" aria-label="Carrinho">
            <ShoppingCart className="size-5" />
            {totalUnidades > 0 ? (
              <span className="absolute -top-2 -right-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-700 px-1 text-[10px] font-medium text-white">
                {totalUnidades > 99 ? "99+" : totalUnidades}
              </span>
            ) : null}
          </Link>
          <span className="inline-flex size-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500" aria-hidden>
            <Bell className="size-4" />
          </span>
        </nav>
      </div>
    </header>
  );
}
