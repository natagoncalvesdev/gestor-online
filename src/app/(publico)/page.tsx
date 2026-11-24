import { CardsPortal } from "@/components/loja/cards-portal";
import { AvaliacoesInicio } from "@/components/inicio/avaliacoes-inicio";
import { CarrosselBanners } from "@/components/inicio/carrossel-banners";
import { InstagramInicio } from "@/components/inicio/instagram-inicio";
import { AvisoConfig } from "@/components/page-title";
import { buscarGoogle, buscarInstagram } from "@/lib/home-apis";
import { urlImagemSite } from "@/lib/site-imagem";
import { isSupabaseConfigured } from "@/lib/site";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <AvisoConfig />
      </div>
    );
  }

  const supabase = await createClient();
  const { data: banners } = await supabase
    .from("home_banner")
    .select("id, imagem_path, imagem_zoom, imagem_x, imagem_y, link")
    .eq("ativo", true)
    .order("ordem");
  const admin = createServiceRoleClient();
  const { data: integracao } = admin
    ? await admin.from("home_integracao").select("google_api_key, google_place_id, instagram_token").eq("id", 1).maybeSingle()
    : { data: null };
  const [google, instagram] = await Promise.all([
    buscarGoogle({
      google_api_key: integracao?.google_api_key ?? "",
      google_place_id: integracao?.google_place_id ?? "",
    }),
    buscarInstagram(integracao?.instagram_token ?? ""),
  ]);

  const faixa = (banners ?? [])
    .map((item) => {
      const src = urlImagemSite(item.imagem_path);
      if (!src) return null;
      return {
        id: item.id,
        src,
        zoom: Number(item.imagem_zoom),
        x: Number(item.imagem_x),
        y: Number(item.imagem_y),
        link: item.link,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 -mt-8 -mb-8 overflow-x-hidden">
      <CarrosselBanners banners={faixa} />
      <div className="h-3 bg-accent" aria-hidden />
      {google.dados ? (
        <AvaliacoesInicio
          titulo="O que falam sobre o CETADEB"
          nota={google.dados.nota}
          resumo={google.dados.resumo}
          link={google.dados.link}
          avaliacoes={google.dados.avaliacoes}
        />
      ) : null}
      <section className="relative overflow-hidden bg-linear-to-r from-[#0a4d73] via-[#1a6a96] to-[#e8882d] px-4 py-12 text-white sm:px-8 sm:py-16">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle, rgba(255, 255, 255, 0.14) 1.25px, transparent 1.25px),
              linear-gradient(115deg, #0a4d73 0%, #1a6a96 45%, #e8882d 100%)
            `,
            backgroundSize: "28px 28px, 100% 100%",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl">
          <h2 className="mb-8 text-center text-2xl font-bold uppercase tracking-wide sm:text-3xl">
            Estude em nossa plataforma
          </h2>
          <CardsPortal />
        </div>
      </section>
      <InstagramInicio posts={instagram.posts} />
    </div>
  );
}
