import Link from "next/link";
import { notFound } from "next/navigation";
import {
  adicionarMateriaProduto,
  salvarImagemProduto,
  salvarInfoProduto,
  salvarProduto,
} from "@/actions/catalogo";
import { ActionForm } from "@/components/action-form";
import { CopiarLinkProduto } from "@/components/secretaria/copiar-link-produto";
import { ExcluirProduto } from "@/components/secretaria/excluir-produto";
import { LinhaInfoProduto } from "@/components/secretaria/linha-info-produto";
import { MateriasCursoOrdem } from "@/components/secretaria/materias-curso-ordem";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelecaoCategoriasProduto } from "@/components/secretaria/selecao-categorias-produto";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type { ProdutoCategoriaLinha } from "@/lib/produto-categoria";
import { EditorApresentacao } from "@/components/secretaria/editor-apresentacao";
import { EnquadramentoImagem } from "@/components/secretaria/enquadramento-imagem";
import { GaleriaImagensProduto } from "@/components/secretaria/galeria-imagens-produto";
import { lista, um } from "@/lib/relacao";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/session";

export default async function ProdutoDetalhePage({
  params,
}: {
  params: Promise<{ produtoId: string }>;
}) {
  await requireAdmin();
  const { produtoId } = await params;
  const supabase = await createClient();
  const [{ data: produto }, { data: materias }, { data: categorias }] = await Promise.all([
    supabase
      .from("produto")
      .select(
        "id, nome, slug, descricao, apresentacao, imagem_path, imagem_zoom, imagem_x, imagem_y, preco, preco_promocional, promocao_ate, peso_gramas, comprimento_cm, largura_cm, altura_cm, materias_simultaneas, ativo, gratuita, para_todos, agrupador, galeria:produto_imagem(id, path, ordem, imagem_zoom, imagem_x, imagem_y), infos:produto_info(id, nome, valor, ordem), vinculos:produto_materia(ordem, materia:materia_id(id, nome, slug)), categorias:produto_categoria_produto(categoria_id)",
      )
      .eq("id", produtoId)
      .maybeSingle(),
    supabase.from("materia").select("id, nome, slug").eq("ativo", true).order("ordem"),
    supabase
      .from("produto_categoria")
      .select("id, nome, slug, descricao, pai_id, ordem, ativo, sistema")
      .eq("ativo", true)
      .order("ordem"),
  ]);
  if (!produto) notFound();

  const infos = ((produto.infos ?? []) as { id: string; nome: string; valor: string; ordem: number }[])
    .slice()
    .sort((a, b) => a.ordem - b.ordem);
  const imagens = ((produto.galeria ?? []) as { id: string; path: string; ordem: number; imagem_zoom: number; imagem_x: number; imagem_y: number }[])
    .slice()
    .sort((a, b) => a.ordem - b.ordem);
  const vinculos = lista(
    produto.vinculos as {
      ordem: number;
      materia: { id: string; nome: string; slug: string } | { id: string; nome: string; slug: string }[] | null;
    }[]
  )
    .map((linha) => ({ ordem: linha.ordem, materia: um(linha.materia) }))
    .filter((linha) => linha.materia)
    .sort((a, b) => a.ordem - b.ordem);
  const jaVinculadas = new Set(vinculos.map((linha) => linha.materia!.id));
  const disponiveis = (materias ?? []).filter((materia) => !jaVinculadas.has(materia.id));
  const categoriasSelecionadas =
    (produto.categorias as { categoria_id: string }[] | null)?.map((linha) => linha.categoria_id) ?? [];

  return (
    <div className="flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{produto.nome}</h1>
        </div>
        <div className="flex items-center gap-2">
          <CopiarLinkProduto slug={produto.slug} />
          <ExcluirProduto id={produto.id} nome={produto.nome} />
          <Link href="/secretaria/produtos" className="inline-flex h-8 items-center rounded-md border bg-white px-3 text-xs font-medium hover:bg-secondary">
            Voltar à lista
          </Link>
        </div>
      </div>

      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <ActionForm id="salvar-produto" action={salvarProduto} className="h-full">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Informações do produto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={produto.id} />
              <div className="sm:col-span-2">
                <Field label="Nome">
                  <Input name="nome" defaultValue={produto.nome} required />
                </Field>
              </div>
            <details className="sm:col-span-2 rounded-md border bg-white">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Descrição curta</summary>
              <div className="border-t px-3 py-3">
                <EditorApresentacao
                  name="descricao"
                  valorInicial={produto.descricao ?? ""}
                  compacto
                  dica="Aparece ao lado do preço na loja. Negrito, tamanho e listas."
                />
              </div>
            </details>
            <details className="sm:col-span-2 rounded-md border bg-white">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Texto da loja e do curso</summary>
              <div className="border-t px-3 py-3">
                <EditorApresentacao
                  valorInicial={produto.apresentacao ?? ""}
                  dica="Selecione o trecho, use negrito, o tamanho ou a lista. Um h2 no texto vira a faixa laranja na loja."
                />
              </div>
            </details>
            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-3">
              <Field label="Preço (R$)">
                <Input name="preco" type="number" min={0} step="0.01" defaultValue={produto.preco} required />
              </Field>
              <Field label="Preço promocional (R$)">
                <Input name="preco_promocional" type="number" min={0} step="0.01" defaultValue={produto.preco_promocional ?? ""} />
              </Field>
              <Field label="Promoção válida até">
                <Input name="promocao_ate" type="date" defaultValue={produto.promocao_ate ?? ""} />
              </Field>
            </div>
            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-4">
              <Field label="Peso (gramas)">
                <Input name="peso_gramas" type="number" min={0} step={1} defaultValue={produto.peso_gramas ?? 0} required />
              </Field>
              <Field label="Comprimento (cm)">
                <Input name="comprimento_cm" type="number" min={0} step={1} defaultValue={produto.comprimento_cm ?? 0} />
              </Field>
              <Field label="Largura (cm)">
                <Input name="largura_cm" type="number" min={0} step={1} defaultValue={produto.largura_cm ?? 0} />
              </Field>
              <Field label="Altura (cm)">
                <Input name="altura_cm" type="number" min={0} step={1} defaultValue={produto.altura_cm ?? 0} />
              </Field>
            </div>
            <Field label="SKU">
              <Input name="slug" defaultValue={produto.slug} />
            </Field>
            <Field label="Matérias abertas ao mesmo tempo">
              <Select name="materias_simultaneas" defaultValue={String(produto.materias_simultaneas ?? 1)}>
                <option value="1">1 matéria por vez</option>
                <option value="2">2 matérias por vez</option>
                <option value="3">3 matérias por vez</option>
              </Select>
            </Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="ativo" defaultChecked={produto.ativo} className="size-4 accent-primary" />
              Produto ativo
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="gratuita" defaultChecked={produto.gratuita} className="size-4 accent-primary" />
              Produto gratuito
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="para_todos" defaultChecked={produto.para_todos} className="size-4 accent-primary" />
              Disponibilizar para todos os alunos
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="agrupador" defaultChecked={produto.agrupador} className="size-4 accent-primary" />
              Produto agrupador (sequência de matérias)
            </label>
            <div className="sm:col-span-2">
              <SubmitButton size="sm">Salvar produto</SubmitButton>
            </div>
            </div>
          </CardContent>
        </Card>
        </ActionForm>
        <div className="flex h-full min-h-0 flex-col gap-6">
          <Card className="shrink-0">
            <CardHeader>
              <CardTitle>Categorias do produto</CardTitle>
            </CardHeader>
            <CardContent>
              <SelecaoCategoriasProduto
                categorias={(categorias ?? []) as ProdutoCategoriaLinha[]}
                selecionadas={categoriasSelecionadas}
                form="salvar-produto"
              />
            </CardContent>
          </Card>
          <Card className="min-h-0 flex-1">
            <CardHeader className="shrink-0">
              <CardTitle>Imagens do produto</CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
              <GaleriaImagensProduto produtoId={produto.id} imagens={imagens} />
              <ActionForm action={salvarImagemProduto} className="space-y-3">
                <input type="hidden" name="produto_id" value={produto.id} />
                <EnquadramentoImagem url={null} zoomInicial={1} xInicial={0} yInicial={0} />
                <SubmitButton size="sm">Adicionar imagem</SubmitButton>
              </ActionForm>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações adicionais</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="space-y-1.5">
            {infos.map((info) => (
              <LinhaInfoProduto
                key={`${info.id}-${info.nome}-${info.valor}`}
                id={info.id}
                produtoId={produto.id}
                nome={info.nome}
                valor={info.valor}
                ordem={info.ordem}
              />
            ))}
          </ul>
          <ActionForm action={salvarInfoProduto} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
            <input type="hidden" name="produto_id" value={produto.id} />
            <input type="hidden" name="ordem" value={infos.length + 1} />
            <Field label="Nome">
              <Input name="nome" required placeholder="Matérias" />
            </Field>
            <Field label="Valor">
              <Input name="valor" placeholder="17" />
            </Field>
            <SubmitButton size="sm">Adicionar</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Matérias</CardTitle>
          {produto.agrupador ? (
            <p className="text-sm text-muted-foreground">
              Ordem das matérias que o aluno estuda ao matricular esta sequência (produto agrupador).
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Ordem</th>
                  <th className="px-4 py-2 font-medium">Matéria</th>
                  <th className="px-4 py-2 font-medium">Slug</th>
                  <th className="px-4 py-2 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                <MateriasCursoOrdem
                  produtoId={produto.id}
                  itens={vinculos.map((linha) => ({
                    id: linha.materia!.id,
                    nome: linha.materia!.nome,
                    slug: linha.materia!.slug,
                  }))}
                />
              </tbody>
            </table>
          </div>
          <ActionForm action={adicionarMateriaProduto} className="flex flex-col gap-3 border-t px-4 pt-4 sm:flex-row sm:items-end">
            <input type="hidden" name="produto_id" value={produto.id} />
            <input type="hidden" name="ordem" value={vinculos.length + 1} />
            <div className="min-w-0 flex-1">
              <Field label="Adicionar matéria">
                <Select name="materia_id" defaultValue="">
                  <option value="">{disponiveis.length === 0 ? "Todas as matérias já estão no produto" : "Selecione a matéria"}</option>
                  {disponiveis.map((materia) => (
                    <option key={materia.id} value={materia.id}>
                      {materia.nome} · {materia.slug}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <SubmitButton size="sm">Adicionar</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
