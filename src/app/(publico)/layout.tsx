import { SiteHeader } from "@/components/layout/site-header";

export const dynamic = "force-dynamic";

export default function PublicoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
