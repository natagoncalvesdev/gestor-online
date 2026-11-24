"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SubmitButton({
  children,
  pendingLabel = "Salvando...",
  variant = "default",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "default" | "accent" | "outline" | "ghost" | "destructive";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant={variant}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
