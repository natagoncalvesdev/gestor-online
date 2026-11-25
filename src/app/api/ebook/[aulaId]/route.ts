import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { produtoAbertoDaMateria } from "@/lib/produto-aberto";
import { getSession } from "@/lib/session";

export async function GET(
  _request: Request,
  context: { params: Promise<{ aulaId: string }> }
) {
  const { aulaId } = await context.params;
  const session = await getSession();
  if (!session) return new NextResponse("Não autorizado", { status: 401 });

  const admin = createServiceRoleClient();
  if (!admin) return new NextResponse("Arquivos indisponíveis", { status: 500 });

  const { data: aula } = await admin
    .from("aula")
    .select("materia_id, epub_path")
    .eq("id", aulaId)
    .maybeSingle();
  if (!aula?.epub_path) return new NextResponse("Livro não encontrado", { status: 404 });

  if (session.type === "aluno") {
    const aberta = Boolean(await produtoAbertoDaMateria(admin, aula.materia_id));
    if (!aberta) {
      const { data: matriculas } = await admin
        .from("matricula")
        .select("id")
        .eq("aluno_id", session.user.id)
        .neq("status", "cancelada");
      const ids = (matriculas ?? []).map((item) => item.id);
      const { data: acesso } = ids.length
        ? await admin
            .from("matricula_materia")
            .select("id")
            .eq("materia_id", aula.materia_id)
            .in("matricula_id", ids)
            .in("status", ["liberada", "concluida"])
            .limit(1)
        : { data: [] };
      if (!acesso?.length) return new NextResponse("Sem acesso", { status: 403 });
    }
  }

  const { data, error } = await admin.storage.from("ebooks").download(aula.epub_path);
  if (error || !data) return new NextResponse("Livro não encontrado", { status: 404 });
  const bytes = await data.arrayBuffer();
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/epub+zip",
      "Cache-Control": "private, no-store",
    },
  });
}
