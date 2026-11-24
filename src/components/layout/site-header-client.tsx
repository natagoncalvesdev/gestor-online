"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { CarrinhoAtalho } from "@/components/layout/carrinho-atalho";

export function SiteHeaderClient({
  sessionType,
}: {
  sessionType: "aluno" | "interno" | null;
}) {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Logo />
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          <Link href="/loja">Loja</Link>
          {sessionType === "aluno" ? <Link href="/meus-cursos">Meus cursos</Link> : null}
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