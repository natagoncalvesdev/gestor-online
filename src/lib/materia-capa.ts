import { urlImagemProduto } from "@/lib/produto-imagem";
import { lista, um } from "@/lib/relacao";

export type CapaMateria = {
  capa: string | null;
  zoom: number;
  x: number;
  y: number;
};

type Leitura = {
  from: (tabela: string) => {
    select: (colunas: string) => {
      in: (coluna: string, valores: string[]) => Promise<{ data: unknown }>;
    };
  };
};

export async function capasDasMaterias(leitura: Leitura, materiaIds: string[]): Promise<Map<string, CapaMateria>> {
  const mapa = new Map<string, CapaMateria>();
  if (materiaIds.length === 0) return mapa;

  const { data } = await leitura
    .from("produto_materia")
    .select(
      "materia_id, ordem, produto:produto_id(id, imagem_path, imagem_zoom, imagem_x, imagem_y, agrupador, ativo, para_todos, ordem)",
    )
    .in("materia_id", materiaIds);

  type Linha = {
    materia_id: string;
    ordem: number;
    produto: {
      id: string;
      imagem_path: string | null;
      imagem_zoom: number;
      imagem_x: number;
      imagem_y: number;
      agrupador: boolean;
      ativo: boolean;
      para_todos: boolean;
      ordem: number;
    } | null;
  };

  const candidatos = new Map<string, Linha[]>();
  for (const linha of lista(data as Linha[] | null)) {
    const produto = um(linha.produto);
    if (!produto?.ativo || produto.agrupador || !produto.imagem_path) continue;
    const listaCandidatos = candidatos.get(linha.materia_id) ?? [];
    listaCandidatos.push({ ...linha, produto });
    candidatos.set(linha.materia_id, listaCandidatos);
  }

  for (const [materiaId, opcoes] of candidatos) {
    opcoes.sort((a, b) => {
      const prodA = um(a.produto)!;
      const prodB = um(b.produto)!;
      const prioA = prodA.para_todos ? 1 : 0;
      const prioB = prodB.para_todos ? 1 : 0;
      if (prioA !== prioB) return prioA - prioB;
      const ordemProd = Number(prodA.ordem ?? 0) - Number(prodB.ordem ?? 0);
      if (ordemProd !== 0) return ordemProd;
      return a.ordem - b.ordem;
    });
    const escolhido = um(opcoes[0]?.produto);
    if (!escolhido?.imagem_path) continue;
    mapa.set(materiaId, {
      capa: urlImagemProduto(escolhido.imagem_path),
      zoom: Number(escolhido.imagem_zoom ?? 1),
      x: Number(escolhido.imagem_x ?? 0),
      y: Number(escolhido.imagem_y ?? 0),
    });
  }

  return mapa;
}