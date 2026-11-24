import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireInterno } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { formatDateTime } from "@/lib/format";

const ROTULO_PEDIDO = {
  pendente: "Aguardando pagamento",
  pago: "Pago",
  cancelado: "Cancelado",
  recusado: "Recusado",
} as const;

type PedidoResumo = { data_criacao: string; status: keyof typeof ROTULO_PEDIDO };
type MatriculaResumo = { id: string; status: string };

export default async function AlunosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; atendente?: string; ordem?: string; de?: string; ate?: string; sem_pedidos?: string }>;
}) {
  await requireInterno();
  const params = await searchParams;
  const termo = (params.q ?? "").replace(/[%_,]/g, "").trim();
  const atendente = (params.atendente ?? "").trim();
  const ordem = params.ordem === "antigo" || params.ordem === "nome" ? params.ordem : "recente";
  const de = /^\d{4}-\d{2}-\d{2}$/.test(params.de ?? "") ? params.de! : "";
  const ate = /^\d{4}-\d{2}-\d{2}$/.test(params.ate ?? "") ? params.ate! : "";
  const semPedidos = params.sem_pedidos === "1";

  const supabase = await createClient();
  const { data: atendentesBrutos } = await supabase.from("aluno").select("atendente").neq("atendente", "").limit(1000);
  const atendentes = [...new Set((atendentesBrutos ?? []).map((item) => String(item.atendente).trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );

  let consulta = supabase
    .from("aluno")
    .select("id, nome, email, telefone, numero_aluno, atendente, status, data_cadastro, matriculas:matricula(id, status), pedidos:pedido(data_criacao, status)")
    .limit(200);

  if (ordem === "nome") consulta = consulta.order("nome");
  else consulta = consulta.order("data_cadastro", { ascending: ordem === "antigo" });

  if (termo) {
    consulta = consulta.or(
      `nome.ilike.%${termo}%,email.ilike.%${termo}%,cpf.ilike.%${termo}%,telefone.ilike.%${termo}%,numero_aluno.ilike.%${termo}%`
    );
  }
  if (atendente) consulta = consulta.eq("atendente", atendente);
  if (de) consulta = consulta.gte("data_cadastro", `${de}T00:00:00`);
  if (ate) consulta = consulta.lte("data_cadastro", `${ate}T23:59:59`);

  const { data } = await consulta;
  const alunos = (data ?? []).filter((aluno) => {
    if (!semPedidos) return true;
    return ((aluno.pedidos as PedidoResumo[] | null) ?? []).length === 0;
  });

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Alunos</h1>
        <p className="text-sm text-muted-foreground">Busque por nome, e-mail, CPF, telefone ou número do aluno.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pesquisa</CardTitle>
          <CardDescription>Filtre a lista e abra o cadastro do aluno.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <Input
                name="q"
                defaultValue={termo}
                placeholder="Buscar por nome, e-mail, CPF, telefone ou nº aluno"
                className="lg:flex-1"
              />
              <Select name="atendente" defaultValue={atendente} className="lg:w-52">
                <option value="">Todos os atendentes</option>
                {atendentes.map((nome) => (
                  <option key={nome} value={nome}>
                    {nome}
                  </option>
                ))}
              </Select>
              <Select name="ordem" defaultValue={ordem} className="lg:w-64">
                <option value="recente">Cadastro (mais novo primeiro)</option>
                <option value="antigo">Cadastro (mais antigo primeiro)</option>
                <option value="nome">Nome (A–Z)</option>
              </Select>
              <Button type="submit">Buscar</Button>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <Field label="De">
                <Input name="de" type="date" defaultValue={de} />
              </Field>
              <span className="pb-2 text-sm text-muted-foreground">até</span>
              <Field label="Até">
                <Input name="ate" type="date" defaultValue={ate} />
              </Field>
              <label className="mb-2 flex items-center gap-2 text-sm">
                <input type="checkbox" name="sem_pedidos" value="1" defaultChecked={semPedidos} className="size-4 accent-primary" />
                Somente alunos sem pedidos
              </label>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="px-0">
          {alunos.length === 0 ? (
            <p className="px-4 text-sm text-muted-foreground">Nenhum aluno encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Nº</th>
                    <th className="px-4 py-2 font-medium">Nome</th>
                    <th className="px-4 py-2 font-medium">Cadastro</th>
                    <th className="px-4 py-2 font-medium">Telefone</th>
                    <th className="px-4 py-2 font-medium">Atendente</th>
                    <th className="px-4 py-2 font-medium">Cursos</th>
                    <th className="px-4 py-2 font-medium">Último pedido</th>
                    <th className="px-4 py-2 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {alunos.map((aluno) => {
                    const matriculas = ((aluno.matriculas as MatriculaResumo[] | null) ?? []).filter((item) => item.status !== "cancelada");
                    const pedidos = [...((aluno.pedidos as PedidoResumo[] | null) ?? [])].sort(
                      (a, b) => new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime()
                    );
                    const ultimo = pedidos[0];
                    return (
                      <tr key={aluno.id} className="border-b last:border-0">
                        <td className="px-4 py-3 whitespace-nowrap tabular-nums text-muted-foreground">{aluno.numero_aluno}</td>
                        <td className="px-4 py-3 font-medium">
                          {aluno.nome}
                          {aluno.status === "inativo" ? <span className="mt-0.5 block text-xs font-normal text-muted-foreground">Inativo</span> : null}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap tabular-nums text-muted-foreground">{formatDateTime(aluno.data_cadastro)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{aluno.telefone || "—"}</td>
                        <td className="px-4 py-3">
                          {aluno.atendente ? (
                            <span className="inline-flex h-5 items-center rounded-full bg-secondary px-2 text-xs font-medium">{aluno.atendente}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 tabular-nums">{matriculas.length}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {ultimo ? (
                            <>
                              {ROTULO_PEDIDO[ultimo.status] ?? ultimo.status}
                              <span className="mt-0.5 block text-xs tabular-nums">{formatDateTime(ultimo.data_criacao)}</span>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/secretaria/alunos/${aluno.id}`}
                            className="inline-flex h-8 items-center rounded-md border bg-white px-3 text-xs font-medium hover:bg-secondary"
                          >
                            Ver
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
