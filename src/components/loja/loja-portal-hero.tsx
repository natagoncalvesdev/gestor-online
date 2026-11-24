import { CardsPortal } from "@/components/loja/cards-portal";
import { LojaPesquisaHero, type ItemPesquisaLoja } from "@/components/loja/loja-pesquisa-hero";

export function LojaPortalHero({ pesquisaItens }: { pesquisaItens: ItemPesquisaLoja[] }) {
  return (
    <section className="relative overflow-hidden bg-linear-to-r from-[#0a4d73] via-[#1a6a96] to-[#e8882d] px-4 py-10 text-white sm:px-8 sm:py-14">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle, rgba(255, 255, 255, 0.14) 1.25px, transparent 1.25px),
            linear-gradient(115deg, #0a4d73 0%, #1a6a96 45%, #e8882d 100%)
          `,
          backgroundSize: "28px 28px, 100% 100%",
        }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl">
        <LojaPesquisaHero itens={pesquisaItens} />

        <h1 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">Como podemos te servir hoje?</h1>
        <p className="mx-auto mt-4 max-w-3xl text-center text-sm text-white/90 sm:text-base">
          Todo o conteúdo dos cursos do CETADEB, agora disponível em ambiente online para você acessar quando puder e
          onde estiver
        </p>

        <div className="mt-10">
          <CardsPortal />
        </div>
      </div>
    </section>
  );
}