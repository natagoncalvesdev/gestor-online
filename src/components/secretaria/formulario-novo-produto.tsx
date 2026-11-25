import Link from "next/link";
import { salvarProduto } from "@/actions/catalogo";
import { ActionForm } from "@/components/action-form";
import { EditorApresentacao } from "@/components/secretaria/editor-apresentacao";
import { SubmitButton } from "@/components/submit-button";
import { SelecaoCategoriasProduto } from "@/components/secretaria/selecao-categorias-produto";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Novo produto</h1>
          <p className="text-sm text-muted-foreground">Preço, peso, medidas e as matérias que este produto libera.</p>
        </div>
        <Link href="/secretaria/produtos" className="inline-flex h-8 items-center rounded-md border bg-white px-3 text-xs font-medium hover:bg-secondary">
          Voltar à lista
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações do produto</CardTitle>
          <CardDescription>Sem matérias, a compra só registra o pedido. Imagens, informações, matérias e opções entram na página seguinte.</CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm action={salvarProduto} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Nome">
                <Input name="nome" required />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <SelecaoCategoriasProduto categorias={categorias} selecionadas={categoriasPadrao} />
            </div>
            <div className="sm:col-span-2">
              <p className="mb-1 text-sm font-medium">Descrição curta</p>
              <EditorApresentacao name="descricao" compacto dica="Aparece ao lado do preço na loja. Negrito, tamanho e listas." />
            </div>
            <div className="sm:col-span-2">
              <p className="mb-1 text-sm font-medium">Texto da loja e do curso</p>
              <EditorApresentacao dica="Selecione o trecho, use negrito, o tamanho ou a lista. Um h2 no texto vira a faixa laranja na loja." />
            </div>
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
            <Field label="Endereço na loja">
              <Input name="slug" />
            </Field>
            <Field label="Matérias abertas ao mesmo tempo">
              <Select name="materias_simultaneas" defaultValue="1">
                <option value="1">1 matéria por vez</option>
                <option value="2">2 matérias por vez</option>
                <option value="3">3 matérias por vez</option>
              </Select>
            </Field>
            <p className="text-sm text-muted-foreground sm:col-span-2">Deixe a data da promoção em branco para ela ficar valendo sem prazo.</p>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="ativo" defaultChecked className="size-4 accent-primary" />
              Produto ativo
            </label>
            <div className="sm:col-span-2">
              <SubmitButton size="sm">Criar produto</SubmitButton>
            </div>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
