"use client";

import { useState } from "react";

export function PainelAlternavel({
  titulo,
  rotulo,
  children,
}: {
  titulo: string;
  rotulo: string;
  children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-[#d7dee6] px-4 py-2">
        <h2 className="text-sm font-semibold text-[#1c2834]">{titulo}</h2>
        <button
          type="button"
          onClick={() => setAberto((valor) => !valor)}
          className="h-8 border border-[#cfd6de] bg-white px-2.5 text-[13px] font-medium text-[#1c2834] hover:bg-[#f4f6f8]"
        >
          {aberto ? "Fechar" : rotulo}
        </button>
      </div>
      {aberto ? <div className="border-b border-[#d7dee6] bg-[#f7f9fb] px-4 py-3">{children}</div> : null}
    </div>
  );
}
