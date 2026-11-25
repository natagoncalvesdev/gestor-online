import { isSupabaseConfigured } from "@/lib/site";
import { filtrarPorSecao, listarCategoriasAtivas, listarProdutosLojaAtivos } from "@/lib/loja-catalogo";
import { AvisoConfig } from "@/components/page-title";
import { GradeProdutosLoja } from "@/components/loja/grade-produtos-loja";
import { LojaSecaoCabecalho } from "@/components/loja/loja-secao-cabecalho";

export default async function LojaEspecializacoesPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <AvisoConfig />
      </div>
    );
  }

  const [produtos, categorias] = await Promise.all([listarProdutosLojaAtivos(), listarCategoriasAtivas()]);
  const lista = filtrarPorSecao(produtos, categorias, "especializacoes");

  return (
    <>
      <LojaSecaoCabecalho
        titulo="Especializações"
        descricao="Cursos focados em temas específicos, abrangendo a vida cristã e a prática ministerial."
        imagem="/loja/especializacoes.jpg"
      />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <GradeProdutosLoja
          produtos={lista}
          vazio="Nenhuma especialização publicada ainda. Vincule os produtos à categoria Especializações."
        />
      </div>
    </>
  );
}