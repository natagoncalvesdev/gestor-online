"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SubmitButton({
  children,
  pendingLabel = "Salvando...",
  variant = "default",
  size = "default",
  className,
  disabled = false,
  form,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "default" | "accent" | "outline" | "ghost" | "secondary" | "destructive";
  size?: "default" | "sm" | "lg";
  className?: string;
  disabled?: boolean;
  form?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" form={form} disabled={pending || disabled} variant={variant} size={size} className={className}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
