import Link from "next/link";
import type { ProdutoLoja } from "@/lib/loja-catalogo";
import { CapaProduto } from "@/components/loja/capa-produto";
import { urlImagemProduto } from "@/lib/produto-imagem";

export function LojaDestaqueLivraria({ produtos }: { produtos: ProdutoLoja[] }) {
  if (produtos.length === 0) return null;

  return (
    <section
      className="relative bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url(/loja/biblioteca.jpg)" }}
    >
      <FaixaLaranja />
      <div className="h-8" aria-hidden />
      <div className="bg-white px-4 py-4">
        <h2 className="text-center text-2xl font-bold uppercase tracking-wide text-accent sm:text-3xl">
          Conheça nossa livraria online
        </h2>
      </div>
      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-8">
        <div className="rounded-2xl bg-black/45 px-5 py-8 backdrop-blur-sm sm:px-8">
          <div className="flex gap-4 overflow-x-auto px-1 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {produtos.map((produto) => {
              const capa = urlImagemProduto(produto.imagem_path);
              return (
                <Link
                  key={produto.id}
                  href={`/loja/${produto.slug}`}
                  className="w-[180px] shrink-0 origin-center overflow-hidden rounded-lg bg-black/35 shadow-md backdrop-blur-md transition duration-300 hover:z-10 hover:scale-105 hover:bg-black/50 sm:w-[200px]"
                >
                  {capa ? <CapaProduto src={capa} className="aspect-square bg-transparent" /> : <div className="aspect-square bg-black/20" />}
                  <div className="p-3 text-white">
                    <p className="line-clamp-2 text-sm font-semibold">{produto.nome}</p>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/loja/livraria"
              className="inline-flex rounded bg-accent px-6 py-2.5 text-sm font-semibold uppercase tracking-wide text-accent-foreground hover:bg-accent/90"
            >
              Acessar livraria
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function FaixaLaranja() {
  return <div className="h-3 w-full bg-accent" aria-hidden />;
}