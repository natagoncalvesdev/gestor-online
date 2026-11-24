import Link from "next/link";
import { logout } from "@/actions/auth";
import { NavLinks } from "@/components/layout/nav-links";
import { SubmitButton } from "@/components/submit-button";

export function AppShell({
  area,
  items,
  children,
}: {
  area: string;
  items: { href: string; label: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="bg-[#1a202c] text-white lg:min-h-screen">
        <div className="flex items-center justify-between px-4 py-4 lg:block">
          <Link href="/" className="text-lg font-semibold tracking-wide">
            CETADEB
          </Link>
          <p className="text-xs text-white/60 lg:mt-1">{area}</p>
        </div>
        <div className="px-3 pb-3">
          <NavLinks items={items} />
        </div>
        <form action={logout} className="px-3 pb-4">
          <SubmitButton variant="ghost" pendingLabel="Saindo...">
            <span className="text-white">Sair</span>
          </SubmitButton>
        </form>
      </aside>
      <main className="mx-auto w-full max-w-5xl p-4 lg:p-8">{children}</main>
    </div>
  );
}
