import { textoDeHtml } from "@/lib/html-apresentacao";
import { urlImagemProduto } from "@/lib/produto-imagem";
import { isSupabaseConfigured } from "@/lib/site";
import { filtrarPorSecao, listarCategoriasAtivas, listarProdutosLojaAtivos } from "@/lib/loja-catalogo";
import { AvisoConfig } from "@/components/page-title";
import { LojaPortalHero } from "@/components/loja/loja-portal-hero";
import { LojaDestaqueLivraria } from "@/components/loja/loja-destaque-livraria";

export default async function LojaPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <AvisoConfig />
      </div>
    );
  }

  const [produtos, categorias] = await Promise.all([listarProdutosLojaAtivos(), listarCategoriasAtivas()]);
  const livraria = filtrarPorSecao(produtos, categorias, "livraria");

  return (
    <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 overflow-x-hidden">
      <LojaPortalHero
        pesquisaItens={produtos.map((p) => ({
          nome: p.nome,
          slug: p.slug,
          descricao: textoDeHtml(p.descricao),
          imagemUrl: urlImagemProduto(p.imagem_path),
        }))}
      />
      <LojaDestaqueLivraria produtos={livraria} />
    </div>
  );
}