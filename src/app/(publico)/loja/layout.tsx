import { CarrinhoBordaLoja } from "@/components/loja/carrinho-borda-loja";

export default function LojaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CarrinhoBordaLoja />
    </>
  );
}