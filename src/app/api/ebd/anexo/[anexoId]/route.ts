import { arquivoAnexo } from "@/lib/ebd-arquivo";

export async function GET(_request: Request, context: { params: Promise<{ anexoId: string }> }) {
  const { anexoId } = await context.params;
  return arquivoAnexo(anexoId);
}
