import { SiteHeader } from "@/components/layout/site-header";
import { CarrinhoProvider } from "@/components/loja/carrinho-provider";
import { requireAluno } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  await requireAluno();
  return (
    <CarrinhoProvider>
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </CarrinhoProvider>
  );
}
