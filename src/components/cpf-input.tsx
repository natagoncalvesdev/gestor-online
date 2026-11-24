"use client";

import { useState } from "react";
import { Input } from "@/components/ui/field";
import { formatCpfDisplay, cpfOnlyDigits } from "@/lib/cpf";

export function CpfInput({
  name = "cpf",
  defaultValue = "",
  required = true,
}: {
  name?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const [value, setValue] = useState(formatCpfDisplay(defaultValue));
  return (
    <Input
      name={name}
      required={required}
      inputMode="numeric"
      autoComplete="off"
      maxLength={14}
      placeholder="000.000.000-00"
      value={value}
      onChange={(event) => setValue(formatCpfDisplay(cpfOnlyDigits(event.target.value)))}
    />
  );
}
