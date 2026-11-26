"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function InterruptorForm({
  name,
  rotulo,
  defaultChecked = false,
}: {
  name: string;
  rotulo: string;
  defaultChecked?: boolean;
}) {
  const [ligado, setLigado] = useState(defaultChecked);

  return (
    <label className="flex shrink-0 cursor-pointer items-center gap-3 text-sm">
      <input type="checkbox" name={name} className="sr-only" checked={ligado} onChange={(evento) => setLigado(evento.target.checked)} />
      <span
        role="switch"
        aria-checked={ligado}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          ligado ? "bg-blue-600" : "bg-zinc-300"
        )}
      >
        <span
          className={cn(
            "pointer-events-none block size-5 rounded-full bg-white shadow-sm transition-transform",
            ligado ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </span>
      {rotulo}
    </label>
  );
}
