"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLinks({
  items,
  tone = "dark",
}: {
  items: { href: string; label: string }[];
  tone?: "dark" | "light";
}) {
  const pathname = usePathname();
  return (
    <nav className={cn("flex gap-1 overflow-x-auto", tone === "dark" ? "flex-row lg:flex-col" : "flex-row")}>
      {items.map((item) => {
        const ativo = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm whitespace-nowrap",
              tone === "dark"
                ? ativo
                  ? "bg-white/15 text-white"
                  : "text-white/80 hover:bg-white/10"
                : ativo
                  ? "bg-secondary text-foreground"
                  : "text-foreground/80 hover:bg-secondary"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
