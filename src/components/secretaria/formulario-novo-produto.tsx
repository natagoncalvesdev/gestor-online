import Link from "next/link";
import { salvarProduto } from "@/actions/catalogo";
import { ActionForm } from "@/components/action-form";
import { EditorApresentacao } from "@/components/secretaria/editor-apresentacao";
import { SubmitButton } from "@/components/submit-button";
import { SelecaoCategoriasProduto } from "@/components/secretaria/selecao-categorias-produto";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import type { ProdutoCategoriaLinha } from "@/lib/produto-categoria";

export function FormularioNovoProduto({
  categorias,
  categoriasPadrao,
}: {
  categorias: ProdutoCategoriaLinha[];
  categoriasPadrao: string[];
}) {
  return (
    <div className="flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Novo produto</h1>
        </div>
        <Link href="/secretaria/produtos" className="inline-flex h-8 items-center rounded-md border bg-white px-3 text-xs font-medium hover:bg-secondary">
          Voltar à lista
        </Link>
      </div>

      <ActionForm action={salvarProduto} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card>
          <CardHeader>
            <CardTitle>Informações do produto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Nome">
                  <Input name="nome" required />
                </Field>
              </div>
            <details className="sm:col-span-2 rounded-md border bg-white">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Descrição curta</summary>
              <div className="border-t px-3 py-3">
                <EditorApresentacao name="descricao" compacto dica="Aparece ao lado do preço na loja. Negrito, tamanho e listas." />
              </div>
            </details>
            <details className="sm:col-span-2 rounded-md border bg-white">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Texto da loja e do curso</summary>
              <div className="border-t px-3 py-3">
                <EditorApresentacao dica="Selecione o trecho, use negrito, o tamanho ou a lista. Um h2 no texto vira a faixa laranja na loja." />
              </div>
            </details>
            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-3">
              <Field label="Preço (R$)">
                <Input name="preco" type="number" min={0} step="0.01" required />
              </Field>
              <Field label="Preço promocional (R$)">
                <Input name="preco_promocional" type="number" min={0} step="0.01" />
              </Field>
              <Field label="Promoção válida até">
                <Input name="promocao_ate" type="date" />
              </Field>
            </div>
            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-4">
              <Field label="Peso (gramas)">
                <Input name="peso_gramas" type="number" min={0} step={1} defaultValue={0} required />
              </Field>
              <Field label="Comprimento (cm)">
                <Input name="comprimento_cm" type="number" min={0} step={1} defaultValue={0} />
              </Field>
              <Field label="Largura (cm)">
                <Input name="largura_cm" type="number" min={0} step={1} defaultValue={0} />
              </Field>
              <Field label="Altura (cm)">
                <Input name="altura_cm" type="number" min={0} step={1} defaultValue={0} />
              </Field>
            </div>
            <Field label="SKU">
              <Input name="slug" placeholder="Gerado a partir do nome se vazio" />
            </Field>
            <Field label="Matérias abertas ao mesmo tempo">
              <Select name="materias_simultaneas" defaultValue="1">
                <option value="1">1 matéria por vez</option>
                <option value="2">2 matérias por vez</option>
                <option value="3">3 matérias por vez</option>
              </Select>
            </Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="ativo" defaultChecked className="size-4 accent-primary" />
              Produto ativo
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="gratuita" className="size-4 accent-primary" />
              Produto gratuito
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="para_todos" className="size-4 accent-primary" />
              Disponibilizar para todos os alunos
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="agrupador" className="size-4 accent-primary" />
              Produto agrupador (sequência de matérias)
            </label>
            <div className="sm:col-span-2">
              <SubmitButton size="sm">Criar produto</SubmitButton>
            </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Categorias do produto</CardTitle>
          </CardHeader>
          <CardContent>
            <SelecaoCategoriasProduto categorias={categorias} selecionadas={categoriasPadrao} />
          </CardContent>
        </Card>
      </ActionForm>
    </div>
  );
}
