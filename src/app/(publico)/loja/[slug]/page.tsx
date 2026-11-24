import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ComprarBox } from "@/components/loja/comprar-box";
import { lista } from "@/lib/relacao";
import { precoVigente } from "@/lib/preco";
import { urlImagemProduto } from "@/lib/produto-imagem";
import { AbasProduto } from "@/components/loja/abas-produto";
import { GaleriaProduto } from "@/components/loja/galeria-produto";

export default async function ProdutoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("produto")
    .select("id, nome, descricao, apresentacao, imagem_path, imagem_zoom, imagem_x, imagem_y, preco, preco_promocional, promocao_ate, galeria:produto_imagem(id, path, ordem, imagem_zoom, imagem_x, imagem_y), infos:produto_info(id, nome, valor, ordem), variacoes:produto_variacao(id, nome, preco, ordem, ativo)")
    .eq("slug", slug)
    .eq("ativo", true)
    .maybeSingle();

  if (!data) notFound();

  const preco = precoVigente(Number(data.preco), data.preco_promocional, data.promocao_ate);
  const variacoes = lista(data.variacoes as { id: string; nome: string; preco: number; ordem: number; ativo: boolean }[] | null)
    .filter((item) => item.ativo)
    .sort((a, b) => a.ordem - b.ordem);
  const galeriaDb = lista(data.galeria as { id: string; path: string; ordem: number; imagem_zoom: number; imagem_x: number; imagem_y: number }[] | null)
    .slice()
    .sort((a, b) => a.ordem - b.ordem);
  const galeria = galeriaDb
    .map((item) => ({
      id: item.id,
      url: urlImagemProduto(item.path)!,
      zoom: Number(item.imagem_zoom ?? 1),
      x: Number(item.imagem_x ?? 0),
      y: Number(item.imagem_y ?? 0),
    }))
    .filter((item) => item.url);
  if (galeria.length === 0 && data.imagem_path) {
    const url = urlImagemProduto(data.imagem_path);
    if (url) {
      galeria.push({
        id: "capa",
        url,
        zoom: Number(data.imagem_zoom ?? 1),
        x: Number(data.imagem_x ?? 0),
        y: Number(data.imagem_y ?? 0),
      });
    }
  }
  const infos = lista(data.infos as { id: string; nome: string; valor: string; ordem: number }[] | null)
    .slice()
    .sort((a, b) => a.ordem - b.ordem);
  const capaUrl = galeria[0]?.url ?? null;

  return (
    <div className="space-y-10">
      <div className="grid gap-8 lg:grid-cols-[400px_1fr] lg:items-start">
        <GaleriaProduto imagens={galeria} emPromocao={preco.de != null} />
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-primary">{data.nome}</h1>
          <ComprarBox
            produtoId={data.id}
            nome={data.nome}
            preco={preco.atual}
            precoDe={preco.de}
            descricaoCurta={data.descricao ?? ""}
            imagemUrl={capaUrl}
            variacoes={variacoes.map((item) => ({ id: item.id, nome: item.nome, preco: Number(item.preco) }))}
          />
        </div>
      </div>
      <AbasProduto apresentacao={data.apresentacao ?? ""} infos={infos} />
    </div>
  );
}