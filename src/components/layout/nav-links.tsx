"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavItem =
  | { href: string; label: string; children?: undefined }
  | {
      label: string;
      children: { href: string; label: string }[];
    };

function subItemAtivo(pathname: string, href: string) {
  if (href === "/secretaria/produtos") {
    if (pathname.startsWith("/secretaria/produtos/categorias")) return false;
    return (
      pathname === href ||
      pathname === "/secretaria/produtos/novo" ||
      (pathname.startsWith("/secretaria/produtos/") && !pathname.startsWith("/secretaria/produtos/categorias"))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function grupoComFilhosAtivo(pathname: string, children: { href: string }[]) {
  return children.some((filho) => subItemAtivo(pathname, filho.href));
}

function itemSimplesAtivo(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({
  items,
  tone = "dark",
}: {
  items: NavItem[];
  tone?: "dark" | "light";
}) {
  const pathname = usePathname();
  const [abertos, setAbertos] = useState<Record<string, boolean>>(() => {
    const inicial: Record<string, boolean> = {};
    for (const item of items) {
      if (item.children) inicial[item.label] = grupoComFilhosAtivo(pathname, item.children);
    }
    return inicial;
  });

  useEffect(() => {
    for (const item of items) {
      if (!item.children) continue;
      if (grupoComFilhosAtivo(pathname, item.children)) {
        setAbertos((prev) => ({ ...prev, [item.label]: true }));
      }
    }
  }, [pathname, items]);

  const linkBase = cn(
    "block rounded-md px-3 py-2 text-sm whitespace-nowrap",
    tone === "dark" ? "text-white/80 hover:bg-white/10" : "text-foreground/80 hover:bg-secondary",
  );
  const linkAtivo = cn(
    linkBase,
    tone === "dark" ? "bg-white/15 text-white" : "bg-secondary text-foreground",
  );
  const subLinkBase = cn(linkBase, "py-1.5 text-[13px]");
  const subLinkAtivo = cn(
    subLinkBase,
    tone === "dark" ? "bg-white/15 text-white" : "bg-secondary text-foreground",
  );

  return (
    <nav className={cn("flex gap-1 overflow-x-auto", tone === "dark" ? "flex-row lg:flex-col" : "flex-row")}>
      {items.map((item) => {
        if (!item.children) {
          const ativo = itemSimplesAtivo(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} className={ativo ? linkAtivo : linkBase}>
              {item.label}
            </Link>
          );
        }

        const aberto = abertos[item.label] ?? false;
        const grupoAtivo = grupoComFilhosAtivo(pathname, item.children);

        return (
          <div key={item.label} className="lg:w-full">
            <button
              type="button"
              onClick={() => setAbertos((prev) => ({ ...prev, [item.label]: !aberto }))}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm whitespace-nowrap",
                tone === "dark"
                  ? grupoAtivo
                    ? "bg-white/10 text-white"
                    : "text-white/80 hover:bg-white/10"
                  : grupoAtivo
                    ? "bg-secondary text-foreground"
                    : "text-foreground/80 hover:bg-secondary",
              )}
              aria-expanded={aberto}
            >
              <span>{item.label}</span>
              <ChevronDown className={cn("size-4 shrink-0 opacity-70 transition-transform", aberto && "rotate-180")} />
            </button>
            {aberto ? (
              <div className={cn("mt-0.5 flex flex-col gap-0.5", tone === "dark" ? "border-l border-white/10 lg:ml-3 lg:pl-2" : "border-l lg:ml-3 lg:pl-2")}>
                {item.children.map((filho) => {
                  const ativo = subItemAtivo(pathname, filho.href);
                  return (
                    <Link key={filho.href} href={filho.href} className={ativo ? subLinkAtivo : subLinkBase}>
                      {filho.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}