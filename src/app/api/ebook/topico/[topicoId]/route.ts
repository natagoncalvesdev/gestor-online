import { NextResponse } from "next/server";
import { licaoLiberada } from "@/lib/ebd";
import { produtoAbertoDaMateria } from "@/lib/produto-aberto";
import { getSession } from "@/lib/session";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  context: { params: Promise<{ topicoId: string }> }
) {
  const { topicoId } = await context.params;
  const session = await getSession();
  if (!session) return new NextResponse("Não autorizado", { status: 401 });

  const admin = createServiceRoleClient();
  if (!admin) return new NextResponse("Arquivos indisponíveis", { status: 500 });

  const { data: topico } = await admin
    .from("topico")
    .select("epub_path, libera_em, aula:aula_id(materia_id, libera_em)")
    .eq("id", topicoId)
    .maybeSingle();
  const aula = Array.isArray(topico?.aula) ? topico.aula[0] : topico?.aula;
  if (!topico?.epub_path || !aula) return new NextResponse("Livro não encontrado", { status: 404 });
  if ((aula.libera_em && !licaoLiberada(aula.libera_em)) || (topico.libera_em && !licaoLiberada(topico.libera_em))) {
    return new NextResponse("Tópico ainda não disponível", { status: 403 });
  }

  if (session.type === "aluno") {
    const aberta = Boolean(await produtoAbertoDaMateria(admin, aula.materia_id));
    if (!aberta) {
      const { data: matriculas } = await admin.from("matricula").select("id").eq("aluno_id", session.user.id).neq("status", "cancelada");
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

  const { data, error } = await admin.storage.from("ebooks").download(topico.epub_path);
  if (error || !data) return new NextResponse("Livro não encontrado", { status: 404 });
  return new NextResponse(await data.arrayBuffer(), {
    headers: {
      "Content-Type": "application/epub+zip",
      "Cache-Control": "private, no-store",
    },
  });
}
