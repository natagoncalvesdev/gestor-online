"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { FormState } from "@/lib/form-state";

export type { FormState };

export function ActionForm({
  action,
  children,
  className,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const aviso = useRef(0);

  useEffect(() => {
    if (!state?.error && !state?.ok) return;
    aviso.current += 1;
    const marca = aviso.current;
    if (state.error) toast.error(state.error, { id: `form-erro-${marca}` });
    if (state.ok) toast.success(state.ok, { id: `form-ok-${marca}` });
  }, [state]);

  return (
    <form action={formAction} className={className}>
      {children}
    </form>
  );
}