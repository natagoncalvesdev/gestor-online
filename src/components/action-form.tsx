"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { FormState } from "@/lib/form-state";

export type { FormState };

export function ActionForm({
  action,
  children,
  className,
  id,
  onSuccess,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
  id?: string;
  onSuccess?: () => void;
}) {
  const [state, formAction] = useActionState(action, null);
  const aviso = useRef(0);
  const aoSucesso = useRef(onSuccess);
  aoSucesso.current = onSuccess;

  useEffect(() => {
    if (!state?.error && !state?.ok) return;
    aviso.current += 1;
    const marca = aviso.current;
    if (state.error) toast.error(state.error, { id: `form-erro-${marca}` });
    if (state.ok) {
      toast.success(state.ok, { id: `form-ok-${marca}` });
      aoSucesso.current?.();
    }
  }, [state]);

  return (
    <form id={id} action={formAction} className={className}>
      {children}
    </form>
  );
}