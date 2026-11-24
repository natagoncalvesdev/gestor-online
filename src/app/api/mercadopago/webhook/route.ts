import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { processarPagamentoMercadoPago } from "@/lib/pagamento";

function assinaturaValida(request: Request, paymentId: string) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return true;
  const signature = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  if (!signature || !requestId) return false;

  const partes = Object.fromEntries(
    signature.split(",").map((parte) => {
      const [chave, valor] = parte.split("=");
      return [chave?.trim(), valor?.trim()];
    })
  );
  if (!partes.ts || !partes.v1) return false;

  const manifesto = `id:${paymentId};request-id:${requestId};ts:${partes.ts};`;
  const hash = createHmac("sha256", secret).update(manifesto).digest("hex");
  const esperado = Buffer.from(hash);
  const recebido = Buffer.from(partes.v1);
  if (esperado.length !== recebido.length) return false;
  return timingSafeEqual(esperado, recebido);
}

async function tratar(request: Request) {
  const url = new URL(request.url);
  let paymentId = url.searchParams.get("data.id") || url.searchParams.get("id");
  if (!paymentId && request.method !== "GET") {
    const body = (await request.json().catch(() => null)) as { data?: { id?: string | number } } | null;
    if (body?.data?.id) paymentId = String(body.data.id);
  }
  if (!paymentId) return NextResponse.json({ ok: true });
  if (!assinaturaValida(request, paymentId)) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  try {
    await processarPagamentoMercadoPago(paymentId);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Falha ao processar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  return tratar(request);
}

export async function GET(request: Request) {
  return tratar(request);
}
