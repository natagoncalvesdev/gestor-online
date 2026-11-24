import Link from "next/link";
import { notFound } from "next/navigation";
import {
  adicionarMateriaProduto,
  excluirImagemProduto,
  excluirInfoProduto,
  excluirVariacao,
  salvarImagemProduto,
  salvarInfoProduto,
  salvarProduto,
  salvarVariacao,
} from "@/actions/catalogo";
import { ActionForm } from "@/components/action-form";
import { ExcluirProduto } from "@/components/secretaria/excluir-produto";
import { MateriasCursoOrdem } from "@/components/secretaria/materias-curso-ordem";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { formatBRL } from "@/lib/format";
import { EditorApresentacao } from "@/components/secretaria/editor-apresentacao";
import { EnquadramentoImagem } from "@/components/secretaria/enquadramento-imagem";
import { urlImagemProduto } from "@/lib/produto-imagem";
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
  const [{ data: produto }, { data: materias }] = await Promise.all([
    supabase
      .from("produto")
      .select("id, nome, slug, descricao, apresentacao, imagem_path, imagem_zoom, imagem_x, imagem_y, preco, preco_promocional, promocao_ate, peso_gramas, comprimento_cm, largura_cm, altura_cm, materias_simultaneas, ativo, galeria:produto_imagem(id, path, ordem, imagem_zoom, imagem_x, imagem_y), infos:produto_info(id, nome, valor, ordem), variacoes:produto_variacao(id, nome, preco, ordem, ativo), vinculos:produto_materia(ordem, materia:materia_id(id, nome, codigo))")
      .eq("id", produtoId)
      .maybeSingle(),
    supabase.from("materia").select("id, nome, codigo").eq("ativo", true).order("ordem"),
  ]);
  if (!produto) notFound();

  const variacoes = ((produto.variacoes ?? []) as { id: string; nome: string; preco: number; ordem: number; ativo: boolean }[])
    .slice()
    .sort((a, b) => a.ordem - b.ordem);
  const infos = ((produto.infos ?? []) as { id: string; nome: string; valor: string; ordem: number }[])
    .slice()
    .sort((a, b) => a.ordem - b.ordem);
  const imagens = ((produto.galeria ?? []) as { id: string; path: string; ordem: number; imagem_zoom: number; imagem_x: number; imagem_y: number }[])
    .slice()
    .sort((a, b) => a.ordem - b.ordem);
  const vinculos = lista(
    produto.vinculos as {
      ordem: number;
      materia: { id: string; nome: string; codigo: string } | { id: string; nome: string; codigo: string }[] | null;
    }[]
  )
    .map((linha) => ({ ordem: linha.ordem, materia: um(linha.materia) }))
    .filter((linha) => linha.materia)
    .sort((a, b) => a.ordem - b.ordem);
  const jaVinculadas = new Set(vinculos.map((linha) => linha.materia!.id));
  const disponiveis = (materias ?? []).filter((materia) => !jaVinculadas.has(materia.id));

  return (
    <div className="flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{produto.nome}</h1>
          <p className="text-sm text-muted-foreground">Preço, peso, medidas e as matérias que este produto libera.</p>
        </div>
        <div className="flex items-center gap-2">
          <ExcluirProduto id={produto.id} nome={produto.nome} />
          <Link href="/secretaria/produtos" className="inline-flex h-8 items-center rounded-md border bg-white px-3 text-xs font-medium hover:bg-secondary">
            Voltar à lista
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações do produto</CardTitle>
          <CardDescription>Sem matérias, a compra só registra o pedido.</CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm action={salvarProduto} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={produto.id} />
            <div className="sm:col-span-2">
              <Field label="Nome">
                <Input name="nome" defaultValue={produto.nome} required />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <p className="mb-1 text-sm font-medium">Descrição curta</p>
              <EditorApresentacao
                name="descricao"
                valorInicial={produto.descricao ?? ""}
                compacto
                dica="Aparece ao lado do preço na loja. Negrito, tamanho e listas."
              />
            </div>
            <div className="sm:col-span-2">
              <p className="mb-1 text-sm font-medium">Texto da loja e do curso</p>
              <EditorApresentacao
                valorInicial={produto.apresentacao ?? ""}
                dica="Selecione o trecho, use negrito, o tamanho ou a lista. Um h2 no texto vira a faixa laranja na loja."
              />
            </div>
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
            <Field label="Endereço na loja">
              <Input name="slug" defaultValue={produto.slug} />
            </Field>
            <Field label="Matérias abertas ao mesmo tempo">
              <Select name="materias_simultaneas" defaultValue={String(produto.materias_simultaneas ?? 1)}>
                <option value="1">1 matéria por vez</option>
                <option value="2">2 matérias por vez</option>
                <option value="3">3 matérias por vez</option>
              </Select>
            </Field>
            <p className="text-sm text-muted-foreground sm:col-span-2">Deixe a data da promoção em branco para ela ficar valendo sem prazo.</p>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="ativo" defaultChecked={produto.ativo} className="size-4 accent-primary" />
              Produto ativo
            </label>
            <div className="sm:col-span-2">
              <SubmitButton size="sm">Salvar produto</SubmitButton>
            </div>
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Imagens do produto</CardTitle>
          <CardDescription>Várias fotos na loja, com miniaturas e zoom. A primeira é a capa em Meus cursos.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            {imagens.map((imagem) => (
              <div key={imagem.id} className="relative">
                <img src={urlImagemProduto(imagem.path)!} alt="" className="size-20 rounded-md border object-cover" />
                <ActionForm action={excluirImagemProduto} className="mt-1">
                  <input type="hidden" name="id" value={imagem.id} />
                  <input type="hidden" name="produto_id" value={produto.id} />
                  <SubmitButton variant="ghost" size="sm" className="h-7 px-2 text-xs">
                    Remover
                  </SubmitButton>
                </ActionForm>
              </div>
            ))}
          </div>
          <ActionForm action={salvarImagemProduto} className="space-y-3">
            <input type="hidden" name="produto_id" value={produto.id} />
            <EnquadramentoImagem url={null} zoomInicial={1} xInicial={0} yInicial={0} />
            <SubmitButton size="sm">Adicionar imagem</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informações adicionais</CardTitle>
          <CardDescription>Nome e valor exibidos na aba da loja, por exemplo matérias, videoaulas ou carga horária.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="space-y-2">
            {infos.map((info) => (
              <li key={info.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                <span>
                  <strong>{info.nome}</strong>
                  <span className="text-muted-foreground"> — {info.valor}</span>
                </span>
                <ActionForm action={excluirInfoProduto}>
                  <input type="hidden" name="id" value={info.id} />
                  <input type="hidden" name="produto_id" value={produto.id} />
                  <SubmitButton variant="ghost" size="sm">
                    Excluir
                  </SubmitButton>
                </ActionForm>
              </li>
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
          <CardDescription>Uma matéria vende só ela. Várias matérias formam um grupo, na ordem da fila.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Ordem</th>
                  <th className="px-4 py-2 font-medium">Matéria</th>
                  <th className="px-4 py-2 font-medium">Código</th>
                  <th className="px-4 py-2 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                <MateriasCursoOrdem
                  produtoId={produto.id}
                  itens={vinculos.map((linha) => ({
                    id: linha.materia!.id,
                    nome: linha.materia!.nome,
                    codigo: linha.materia!.codigo,
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
                      {materia.nome} · {materia.codigo}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <SubmitButton size="sm">Adicionar</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Opções de preço</CardTitle>
          <CardDescription>Se houver opções, o aluno escolhe uma. Todas liberam as mesmas matérias.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="space-y-2">
            {variacoes.map((variacao) => (
              <li key={variacao.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <span>
                  {variacao.nome} — {formatBRL(variacao.preco)}
                </span>
                <ActionForm action={excluirVariacao}>
                  <input type="hidden" name="id" value={variacao.id} />
                  <input type="hidden" name="produto_id" value={produto.id} />
                  <SubmitButton variant="ghost" size="sm">Excluir</SubmitButton>
                </ActionForm>
              </li>
            ))}
          </ul>
          <ActionForm action={salvarVariacao} className="grid gap-3 sm:grid-cols-3">
            <input type="hidden" name="produto_id" value={produto.id} />
            <Field label="Nome da opção">
              <Input name="nome" required placeholder="À vista, 10x" />
            </Field>
            <Field label="Preço (R$)">
              <Input name="preco" type="number" min={0} step="0.01" required />
            </Field>
            <Field label="Ordem">
              <Input name="ordem" type="number" min={1} defaultValue={variacoes.length + 1} />
            </Field>
            <div className="sm:col-span-3">
              <SubmitButton size="sm">Adicionar opção</SubmitButton>
            </div>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
