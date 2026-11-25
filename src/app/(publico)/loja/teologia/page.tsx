import { isSupabaseConfigured } from "@/lib/site";
import { filtrarPorSecao, listarCategoriasAtivas, listarProdutosLojaAtivos } from "@/lib/loja-catalogo";
import { AvisoConfig } from "@/components/page-title";
import { GradeProdutosLoja } from "@/components/loja/grade-produtos-loja";
import { LojaSecaoCabecalho } from "@/components/loja/loja-secao-cabecalho";

export default async function LojaTeologiaPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <AvisoConfig />
      </div>
    );
  }

  const [produtos, categorias] = await Promise.all([listarProdutosLojaAtivos(), listarCategoriasAtivas()]);
  const lista = filtrarPorSecao(produtos, categorias, "teologia");

  return (
    <>
      <LojaSecaoCabecalho
        titulo="Curso de Teologia"
        descricao="O Curso de Teologia mais completo, disponível em diversas modalidades."
        imagem="/loja/teologia.jpg"
      />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <GradeProdutosLoja
          produtos={lista}
          vazio="Nenhum curso de teologia publicado ainda. Os produtos com matérias vinculadas aparecem aqui."
        />
      </div>
    </>
  );
}