import { logout } from "@/actions/auth";
import { Logo } from "@/components/brand/logo";
import { NavLinks } from "@/components/layout/nav-links";
import { SubmitButton } from "@/components/submit-button";

export function AppShell({
  area,
  items,
  children,
  alinhar = "centro",
}: {
  area: string;
  items: { href: string; label: string }[];
  children: React.ReactNode;
  alinhar?: "centro" | "esquerda";
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="bg-[#1a202c] text-white lg:min-h-screen">
        <div className="flex items-center justify-between px-4 py-4 lg:block">
          <Logo size={48} />
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
      {alinhar === "esquerda" ? (
        <div className="min-h-screen min-w-0">
          <main className="w-full max-w-[1200px] p-4 lg:p-6">{children}</main>
        </div>
      ) : (
        <main className="mx-auto w-full max-w-[1200px] p-4 lg:p-6">{children}</main>
      )}
    </div>
  );
}
