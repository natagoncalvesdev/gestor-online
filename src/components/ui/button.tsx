import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

const variants = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  accent: "bg-accent text-accent-foreground hover:bg-accent/90",
  outline: "border bg-white hover:bg-secondary",
  ghost: "hover:bg-secondary",
  secondary: "bg-zinc-600 text-white hover:bg-zinc-700",
  destructive: "bg-red-700 text-white hover:bg-red-800",
};

const sizes = {
  default: "h-10 px-4",
  sm: "h-8 px-3 text-xs",
  lg: "h-11 px-5",
};

export function Button({
  className,
  variant = "default",
  size = "default",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
