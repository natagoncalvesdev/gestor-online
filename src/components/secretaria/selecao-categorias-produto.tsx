import { ordenarCategoriasHierarquia, recuoHierarquiaCategoria, type ProdutoCategoriaLinha } from "@/lib/produto-categoria";
import { cn } from "@/lib/utils";

export function SelecaoCategoriasProduto({
  categorias,
  selecionadas,
  form,
}: {
  categorias: ProdutoCategoriaLinha[];
  selecionadas: string[];
  form?: string;
}) {
  const linhas = ordenarCategoriasHierarquia(categorias);
  const marcadas = new Set(selecionadas);

  if (linhas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma categoria cadastrada.{" "}
        <a href="/secretaria/produtos/categorias" className="font-medium text-primary underline-offset-4 hover:underline">
          Criar categorias
        </a>
      </p>
    );
  }

  return (
    <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
      {linhas.map((item, indice) => {
        const ehRaiz = item.profundidade === 0;
        const separarGrupo = ehRaiz && indice > 0;
        return (
          <label
            key={item.id}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded py-0.5 pr-1 text-sm hover:bg-secondary/60",
              separarGrupo && "mt-2 border-t border-slate-100 pt-2",
              ehRaiz ? "font-semibold" : "font-normal text-muted-foreground",
            )}
            style={recuoHierarquiaCategoria(item.profundidade, 1)}
          >
            <input
              type="checkbox"
              name="categorias"
              value={item.id}
              form={form}
              defaultChecked={marcadas.has(item.id)}
              className="size-4 shrink-0 accent-primary"
            />
            <span>{item.nome}</span>
          </label>
        );
      })}
    </div>
  );
}