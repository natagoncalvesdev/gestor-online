import { cn } from "@/lib/utils";

export function Apresentacao({ html, className }: { html: string; className?: string }) {
  if (!html.trim()) return null;
  return (
    <div className={cn("apresentacao text-sm", className)} dangerouslySetInnerHTML={{ __html: html }} />
  );
}