import { FormularioNovoProduto } from "@/components/secretaria/formulario-novo-produto";
import { requireAdmin } from "@/lib/session";

export default async function NovoProdutoPage() {
  await requireAdmin();
  return <FormularioNovoProduto />;
}
