"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export type ItemPesquisaLoja = {
  nome: string;
  slug: string;
  descricao: string;
  imagemUrl: string | null;
};

export function LojaPesquisaHero({ itens }: { itens: ItemPesquisaLoja[] }) {
  const router = useRouter();
  const [termo, setTermo] = useState("");
  const [foco, setFoco] = useState(false);

  const resultados = useMemo(() => {
    const q = normalizarBusca(termo);
    if (q.length < 3) return [];
    return itens
      .filter((item) => normalizarBusca(item.nome).includes(q) || normalizarBusca(item.descricao).includes(q))
      .slice(0, 6);
  }, [itens, termo]);

  function irPara(slug: string) {
    setTermo("");
    setFoco(false);
    router.push(`/loja/${slug}`);
  }

  function aoEnviar(e: React.FormEvent) {
    e.preventDefault();
    if (resultados.length > 0) irPara(resultados[0].slug);
  }

  const mostrarLista = foco && normalizarBusca(termo).length >= 3;

  return (
    <div className="relative mx-auto mb-10 w-full max-w-xl">
      <form onSubmit={aoEnviar} className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          onFocus={() => setFoco(true)}
          onBlur={() => window.setTimeout(() => setFoco(false), 150)}
          placeholder="Pesquisar produtos..."
          className="w-full rounded-full border-0 bg-white py-3.5 pr-5 pl-12 text-base text-foreground shadow-md placeholder:text-muted-foreground focus:ring-2 focus:ring-white/80 focus:outline-none"
          autoComplete="off"
        />
      </form>
      {mostrarLista ? (
        <ul className="absolute z-20 mt-2 max-h-[22rem] w-full overflow-auto rounded-2xl border border-white/40 bg-white p-2 text-left shadow-xl">
          {resultados.length === 0 ? (
            <li className="px-3 py-3 text-sm text-muted-foreground">Nenhum produto com esse texto.</li>
          ) : (
            resultados.map((item) => (
              <li key={item.slug}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-secondary"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => irPara(item.slug)}
                >
                  {item.imagemUrl ? (
                    <img src={item.imagemUrl} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="size-14 shrink-0 rounded-lg bg-secondary" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">{item.nome}</span>
                    <span className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
                      {item.descricao || "Sem descrição"}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

function normalizarBusca(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}