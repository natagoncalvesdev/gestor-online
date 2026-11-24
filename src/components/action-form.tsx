"use client";

import { useActionState } from "react";
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
  return (
    <form action={formAction} className={className}>
      {state?.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.ok}</p>
      ) : null}
      {children}
    </form>
  );
}
