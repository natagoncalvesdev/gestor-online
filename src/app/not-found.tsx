import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="mb-6">
        <Logo size={72} />
      </div>
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <Link href="/" className="mt-4 text-sm text-primary">
        Voltar ao início
      </Link>
    </main>
  );
}
