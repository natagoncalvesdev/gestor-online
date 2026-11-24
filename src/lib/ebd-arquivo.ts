import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { licaoLiberada } from "@/lib/ebd";
import { getSession } from "@/lib/session";

type Admin = NonNullable<ReturnType<typeof createServiceRoleClient>>;

async function enviar(admin: Admin, path: string, dispor: "inline" | "attachment", nome: string) {
  const { data, error } = await admin.storage.from("ebd").download(path);
  if (error || !data) return new NextResponse("PDF não encontrado", { status: 404 });
  const bytes = await data.arrayBuffer();
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${dispor}; filename="${nome.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function materiaDa(relacao: { para_todos?: boolean } | { para_todos?: boolean }[] | null) {
  return Array.isArray(relacao) ? relacao[0] : relacao;
}

export async function arquivoLicao(licaoId: string) {
  const session = await getSession();
  if (!session || session.type !== "aluno") return new NextResponse("Não autorizado", { status: 401 });
  const admin = createServiceRoleClient();
  if (!admin) return new NextResponse("Arquivos indisponíveis", { status: 500 });
  const { data: licao } = await admin
    .from("ebd_licao")
    .select("libera_em, pdf_exibir_path, materia:materia_id(para_todos)")
    .eq("id", licaoId)
    .maybeSingle();
  const materia = materiaDa(licao?.materia ?? null);
  if (!licao?.pdf_exibir_path || !materia?.para_todos) return new NextResponse("PDF não encontrado", { status: 404 });
  if (!licaoLiberada(licao.libera_em)) return new NextResponse("Lição ainda não disponível", { status: 403 });
  return enviar(admin, licao.pdf_exibir_path, "inline", "licao.pdf");
}

export async function arquivoAnexo(anexoId: string) {
  const session = await getSession();
  if (!session || session.type !== "aluno") return new NextResponse("Não autorizado", { status: 401 });
  const admin = createServiceRoleClient();
  if (!admin) return new NextResponse("Arquivos indisponíveis", { status: 500 });
  const { data: anexo } = await admin
    .from("ebd_anexo")
    .select("nome, path, licao:licao_id(libera_em, materia:materia_id(para_todos))")
    .eq("id", anexoId)
    .maybeSingle();
  const licao = Array.isArray(anexo?.licao) ? anexo.licao[0] : anexo?.licao;
  const materia = materiaDa(licao?.materia ?? null);
  if (!anexo || !licao || !materia?.para_todos) return new NextResponse("PDF não encontrado", { status: 404 });
  if (!licaoLiberada(licao.libera_em)) return new NextResponse("Lição ainda não disponível", { status: 403 });
  return enviar(admin, anexo.path, "attachment", `${anexo.nome}.pdf`);
}
