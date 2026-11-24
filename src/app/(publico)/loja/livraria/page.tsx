import { isSupabaseConfigured } from "@/lib/site";
import { filtrarPorSecao, listarProdutosLojaAtivos } from "@/lib/loja-catalogo";
import { AvisoConfig } from "@/components/page-title";
import { GradeProdutosLoja } from "@/components/loja/grade-produtos-loja";
import { LojaSecaoCabecalho } from "@/components/loja/loja-secao-cabecalho";

export default async function LojaLivrariaPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <AvisoConfig />
      </div>
    );
  }

  const produtos = filtrarPorSecao(await listarProdutosLojaAtivos(), "livraria");

  return (
    <>
      <LojaSecaoCabecalho
        titulo="Livraria Online"
        descricao="Adquira livros de nossa coleção para fundamentar e expandir seu estudo da Palavra de Deus."
        imagem="/loja/biblioteca.jpg"
      />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <GradeProdutosLoja
          produtos={produtos}
          vazio="Nenhum livro publicado ainda. Produtos com peso ou dimensões de envio aparecem aqui."
        />
      </div>
    </>
  );
}