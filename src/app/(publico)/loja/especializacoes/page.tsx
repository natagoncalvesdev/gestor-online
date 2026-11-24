import { isSupabaseConfigured } from "@/lib/site";
import { filtrarPorSecao, listarProdutosLojaAtivos } from "@/lib/loja-catalogo";
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

  const produtos = filtrarPorSecao(await listarProdutosLojaAtivos(), "especializacoes");

  return (
    <>
      <LojaSecaoCabecalho
        titulo="Especializações"
        descricao="Cursos focados em temas específicos, abrangendo a vida cristã e a prática ministerial."
        imagem="/loja/especializacoes.jpg"
      />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <GradeProdutosLoja
          produtos={produtos}
          vazio='Nenhuma especialização publicada ainda. Produtos com "especial" no nome ou endereço aparecem aqui.'
        />
      </div>
    </>
  );
}