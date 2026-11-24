import Image from "next/image";
import Link from "next/link";
import { LojaPesquisaHero, type ItemPesquisaLoja } from "@/components/loja/loja-pesquisa-hero";

const cards = [
  {
    titulo: "Curso de Teologia",
    descricao: "O Curso de Teologia mais completo, disponível em diversas modalidades",
    href: "/loja/teologia",
    imagem: "/loja/teologia.jpg",
    botao: "Ver curso de teologia",
    botaoClasse: "bg-accent text-accent-foreground hover:bg-accent/90",
    overlay:
      "bg-[linear-gradient(180deg,rgba(8,45,68,0.72)_0%,rgba(8,45,68,0.22)_38%,rgba(8,45,68,0.18)_62%,rgba(8,45,68,0.55)_100%)]",
  },
  {
    titulo: "Especializações",
    descricao: "Cursos focados em temas específicos, abrangendo a vida cristã e a prática ministerial",
    href: "/loja/especializacoes",
    imagem: "/loja/especializacoes.jpg",
    botao: "Ver especializações",
    botaoClasse: "bg-primary text-primary-foreground hover:bg-primary/90",
    overlay:
      "bg-[linear-gradient(180deg,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.12)_40%,rgba(0,0,0,0.1)_60%,rgba(0,0,0,0.45)_100%)]",
  },
  {
    titulo: "Livraria Online",
    descricao: "Adquira livros de nossa coleção para fundamentar e expandir seu estudo da Palavra de Deus",
    href: "/loja/livraria",
    imagem: "/loja/biblioteca.jpg",
    botao: "Acessar livraria",
    botaoClasse: "bg-accent text-accent-foreground hover:bg-accent/90",
    overlay:
      "bg-[linear-gradient(180deg,rgba(8,45,68,0.72)_0%,rgba(8,45,68,0.22)_38%,rgba(8,45,68,0.18)_62%,rgba(8,45,68,0.55)_100%)]",
  },
] as const;

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

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {cards.map((card) => (
            <article
              key={card.href}
              className="group @container relative aspect-square overflow-hidden rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.28)]"
            >
              <Image
                src={card.imagem}
                alt=""
                fill
                className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              <div className={`absolute inset-0 ${card.overlay}`} />
              <h2 className="absolute inset-x-[8%] top-[7%] text-center text-[clamp(1.5rem,9.4cqw,2.1rem)] leading-[1.1] font-bold tracking-tight">
                {card.titulo}
              </h2>
              <p className="absolute top-1/2 left-1/2 w-[84%] -translate-x-1/2 -translate-y-1/2 text-center text-[clamp(1.15rem,5.8cqw,1.5rem)] leading-[1.35] font-normal text-white">
                {card.descricao}
              </p>
              <Link
                href={card.href}
                className={`absolute bottom-[7%] left-1/2 inline-flex -translate-x-1/2 items-center justify-center rounded-md px-[1.35em] py-[0.72em] text-center text-[clamp(1.05rem,5.2cqw,1.35rem)] leading-none whitespace-nowrap uppercase [font-family:var(--font-anton)] transition ${card.botaoClasse}`}
              >
                {card.botao}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}