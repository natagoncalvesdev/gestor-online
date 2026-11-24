import { SiteHeaderClient } from "@/components/layout/site-header-client";
import { getSession } from "@/lib/session";

export async function SiteHeader() {
  const session = await getSession();
  const sessionType = session?.type === "aluno" || session?.type === "interno" ? session.type : null;
  return <SiteHeaderClient sessionType={sessionType} />;
}