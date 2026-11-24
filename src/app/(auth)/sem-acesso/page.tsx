import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function SemAcessoPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="mb-6">
        <Logo size={72} />
      </div>
      <h1 className="text-2xl font-semibold">Conta sem perfil</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Este login existe, mas não está ligado a um aluno nem à equipe. Fale com a secretaria.
      </p>
      <Link href="/login" className="mt-4 text-sm text-primary">
        Voltar
      </Link>
    </main>
  );
}
