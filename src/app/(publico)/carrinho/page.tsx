import { CarrinhoView } from "@/components/loja/carrinho-view";
import { PageTitle } from "@/components/page-title";

export default function CarrinhoPage() {
  return (
    <div>
      <PageTitle title="Carrinho" description="O pagamento abre no Mercado Pago, com PIX ou cartão." />
      <CarrinhoView />
    </div>
  );
}
