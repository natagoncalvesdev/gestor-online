import { SiteHeader } from "@/components/layout/site-header";
import { CarrinhoProvider } from "@/components/loja/carrinho-provider";

export const dynamic = "force-dynamic";

export default function PublicoLayout({ children }: { children: React.ReactNode }) {
  return (
    <CarrinhoProvider>
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </CarrinhoProvider>
  );
}