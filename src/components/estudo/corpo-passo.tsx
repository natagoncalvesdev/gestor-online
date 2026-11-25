import { Apresentacao } from "@/components/loja/apresentacao";
import { EpubReader } from "@/components/estudo/epub-reader";
import { bunnyEmbedUrl } from "@/lib/bunny";

type Arquivo = { id: string; nome: string; mime: string; visualizar: boolean; baixar: boolean };

export function CorpoPasso({
  titulo,
  youtubeId,
  bunnyId,
  conteudo,
  arquivos,
  epub,
}: {
  titulo: string;
  youtubeId: string | null;
  bunnyId: string | null;
  conteudo: string;
  arquivos: Arquivo[];
  epub: { url: string; cfi: string | null; campo: "aula_id" | "topico_id"; id: string } | null;
}) {
  const paraVer = arquivos.filter((arquivo) => arquivo.visualizar);
  const paraBaixar = arquivos.filter((arquivo) => arquivo.baixar);

  return (
    <>
      {youtubeId ? (
        <iframe
          title={titulo}
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
          className="aspect-video w-full rounded-md border bg-black"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : bunnyId ? (
        <iframe
          title={titulo}
          src={bunnyEmbedUrl(bunnyId)}
          className="aspect-video w-full rounded-md border bg-black"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : null}

      {conteudo.trim() ? <Apresentacao html={conteudo} /> : null}

      {paraBaixar.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {paraBaixar.map((arquivo) => (
            <a
              key={arquivo.id}
              href={`/api/aula/arquivo/${arquivo.id}?download=1`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-white px-4 text-sm font-medium hover:bg-secondary"
            >
              {arquivo.nome}
            </a>
          ))}
        </div>
      ) : null}

      {paraVer.map((arquivo) =>
        arquivo.mime.startsWith("image/") ? (
          <img key={arquivo.id} src={`/api/aula/arquivo/${arquivo.id}`} alt={arquivo.nome} className="mx-auto aspect-[210/297] w-full max-w-[210mm] rounded-xl border bg-white object-contain" />
        ) : (
          <iframe key={arquivo.id} title={arquivo.nome} src={`/api/aula/arquivo/${arquivo.id}`} className="mx-auto aspect-[210/297] w-full max-w-[210mm] rounded-xl border bg-white" />
        )
      )}

      {epub ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Livro digital</h2>
          <EpubReader aulaId={epub.id} cfiInicial={epub.cfi} url={epub.url} campo={epub.campo} />
        </section>
      ) : null}
    </>
  );
}
