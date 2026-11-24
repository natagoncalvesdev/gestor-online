import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/session";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = await getSession();
  if (!session) return new NextResponse("Não autorizado", { status: 401 });

  const admin = createServiceRoleClient();
  if (!admin) return new NextResponse("Arquivos indisponíveis", { status: 500 });

  const { data: documento } = await admin
    .from("documento_emitido")
    .select("aluno_id, arquivo_path, arquivo_nome")
    .eq("id", id)
    .maybeSingle();
  if (!documento?.arquivo_path) return new NextResponse("Arquivo não encontrado", { status: 404 });
  if (session.type === "aluno" && documento.aluno_id !== session.user.id) {
    return new NextResponse("Sem acesso", { status: 403 });
  }

  const { data, error } = await admin.storage.from("documentos").download(documento.arquivo_path);
  if (error || !data) return new NextResponse("Arquivo não encontrado", { status: 404 });
  const bytes = await data.arrayBuffer();
  const nome = encodeURIComponent(documento.arquivo_nome || "documento");
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${nome}`,
      "Cache-Control": "private, no-store",
    },
  });
}
