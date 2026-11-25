import { NextResponse } from "next/server";
import { licaoLiberada } from "@/lib/ebd";
import { produtoAbertoDaMateria } from "@/lib/produto-aberto";
import { getSession } from "@/lib/session";
import { createServiceRoleClient } from "@/lib/supabase/admin";

function nomeComExtensao(nome: string, path: string) {
  const arquivo = path.split("/").pop() ?? "";
  const original = arquivo.replace(/^[0-9a-f-]{36}-/i, "");
  const ponto = original.lastIndexOf(".");
  const extensao = ponto > 0 ? original.slice(ponto) : "";
  if (!extensao || nome.toLowerCase().endsWith(extensao.toLowerCase())) return nome;
  return `${nome}${extensao}`;
}

export async function GET(request: Request, context: { params: Promise<{ arquivoId: string }> }) {
  const session = await getSession();
  if (!session || session.type !== "aluno") return new NextResponse("Não autorizado", { status: 401 });
  const admin = createServiceRoleClient();
  if (!admin) return new NextResponse("Arquivos indisponíveis", { status: 500 });
  const { arquivoId } = await context.params;
  const { data: arquivo } = await admin
    .from("aula_arquivo")
    .select("nome, path, mime, visualizar, baixar, topico:topico_id(libera_em), aula:aula_id(libera_em, materia_id)")
    .eq("id", arquivoId)
    .maybeSingle();
  const aula = Array.isArray(arquivo?.aula) ? arquivo.aula[0] : arquivo?.aula;
  const topico = Array.isArray(arquivo?.topico) ? arquivo.topico[0] : arquivo?.topico;
  if (!arquivo || !aula) return new NextResponse("Arquivo não encontrado", { status: 404 });
  if (aula.libera_em && !licaoLiberada(aula.libera_em)) return new NextResponse("Aula ainda não disponível", { status: 403 });
  if (topico?.libera_em && !licaoLiberada(topico.libera_em)) return new NextResponse("Tópico ainda não disponível", { status: 403 });

  const aberta = Boolean(await produtoAbertoDaMateria(admin, aula.materia_id));
  if (!aberta) {
    const { data: acessos } = await admin
      .from("matricula_materia")
      .select("status, matricula:matricula_id(aluno_id, status)")
      .eq("materia_id", aula.materia_id)
      .in("status", ["liberada", "concluida"]);
    const permitido = (acessos ?? []).some((item) => {
      const matricula = Array.isArray(item.matricula) ? item.matricula[0] : item.matricula;
      return matricula?.aluno_id === session.user.id && matricula.status !== "cancelada";
    });
    if (!permitido) return new NextResponse("Arquivo não encontrado", { status: 404 });
  }

  const baixar = new URL(request.url).searchParams.get("download") === "1";
  if (baixar && !arquivo.baixar) return new NextResponse("Download não permitido", { status: 403 });
  if (!baixar && !arquivo.visualizar) return new NextResponse("Visualização não permitida", { status: 403 });

  const { data, error } = await admin.storage.from("ebooks").download(arquivo.path);
  if (error || !data) return new NextResponse("Arquivo não encontrado", { status: 404 });
  const nome = nomeComExtensao(arquivo.nome, arquivo.path).replace(/"/g, "");
  return new NextResponse(await data.arrayBuffer(), {
    headers: {
      "Content-Type": arquivo.mime || "application/octet-stream",
      "Content-Disposition": `${baixar ? "attachment" : "inline"}; filename="${nome}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
