"use client";

import { toast } from "sonner";

export function CopiarLinkProduto({ slug }: { slug: string }) {
  async function copiar() {
    const link = `${window.location.origin}/loja/${slug}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link do produto copiado.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  return (
    <button type="button" onClick={() => void copiar()} className="inline-flex h-8 items-center rounded-md border bg-white px-3 text-xs font-medium hover:bg-secondary">
      Copiar link
    </button>
  );
}
