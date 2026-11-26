"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { baixarProvaPdf, type ProvaPdfDados } from "@/lib/prova-pdf";

export function BotaoBaixarProva({ dados }: { dados: ProvaPdfDados }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        void baixarProvaPdf(dados).catch(() => toast.error("Não foi possível gerar o PDF da prova."));
      }}
    >
      <Download className="size-4" />
      Baixar PDF
    </Button>
  );
}
