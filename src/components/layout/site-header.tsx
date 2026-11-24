import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { getSession } from "@/lib/session";

export async function SiteHeader() {
  const session = await getSession();
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Logo />
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/loja">Loja</Link>
          {session?.type === "aluno" ? <Link href="/meus-cursos">Meus cursos</Link> : null}
          {session?.type === "interno" ? <Link href="/secretaria/dashboard">Secretaria</Link> : null}
          {session ? null : (
            <>
              <Link href="/login">Entrar</Link>
              <Link href="/cadastro" className="rounded-md bg-accent px-3 py-2 text-accent-foreground">
                Criar conta
              </Link>
            </>
          )}
          <Link href="/carrinho">Carrinho</Link>
        </nav>
      </div>
    </header>
  );
}
