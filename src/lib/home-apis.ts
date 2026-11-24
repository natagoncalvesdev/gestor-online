export type AvaliacaoGoogle = {
  id: string;
  autor: string;
  texto: string;
  estrelas: number;
};

export type BlocoGoogle = {
  nota: number;
  resumo: string;
  link: string;
  avaliacoes: AvaliacaoGoogle[];
};

export type PostInstagram = {
  id: string;
  src: string;
  link: string;
};

type Credenciais = {
  google_api_key: string;
  google_place_id: string;
  instagram_token: string;
};

export async function buscarGoogle(credenciais: Pick<Credenciais, "google_api_key" | "google_place_id">): Promise<{ dados: BlocoGoogle | null; erro: string | null }> {
  const chave = credenciais.google_api_key.trim();
  const lugar = credenciais.google_place_id.trim();
  if (!chave || !lugar) return { dados: null, erro: null };

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", lugar);
  url.searchParams.set("fields", "rating,user_ratings_total,reviews,url");
  url.searchParams.set("language", "pt-BR");
  url.searchParams.set("key", chave);

  try {
    const resposta = await fetch(url, { next: { revalidate: 3600 } });
    const corpo = (await resposta.json()) as {
      status?: string;
      error_message?: string;
      result?: {
        rating?: number;
        user_ratings_total?: number;
        url?: string;
        reviews?: { author_name?: string; rating?: number; text?: string; time?: number }[];
      };
    };
    if (corpo.status !== "OK") {
      return { dados: null, erro: corpo.error_message || corpo.status || "Não foi possível consultar o Google." };
    }
    const total = corpo.result?.user_ratings_total ?? 0;
    return {
      erro: null,
      dados: {
        nota: Number(corpo.result?.rating ?? 0),
        resumo: total > 0 ? `${total.toLocaleString("pt-BR")} avaliações no Google` : "",
        link: corpo.result?.url ?? "",
        avaliacoes: (corpo.result?.reviews ?? []).map((item, indice) => ({
          id: String(item.time ?? indice),
          autor: item.author_name || "Google",
          texto: item.text || "",
          estrelas: Math.min(5, Math.max(1, Math.round(item.rating ?? 5))),
        })),
      },
    };
  } catch {
    return { dados: null, erro: "Falha ao consultar a API do Google." };
  }
}

export async function buscarInstagram(token: string): Promise<{ posts: PostInstagram[]; erro: string | null }> {
  const acesso = token.trim();
  if (!acesso) return { posts: [], erro: null };

  const url = new URL("https://graph.instagram.com/me/media");
  url.searchParams.set("fields", "id,media_type,media_url,thumbnail_url,permalink");
  url.searchParams.set("limit", "8");
  url.searchParams.set("access_token", acesso);

  try {
    const resposta = await fetch(url, { next: { revalidate: 3600 } });
    const corpo = (await resposta.json()) as {
      error?: { message?: string };
      data?: { id: string; media_type?: string; media_url?: string; thumbnail_url?: string; permalink?: string }[];
    };
    if (!resposta.ok || corpo.error) {
      return { posts: [], erro: corpo.error?.message || "Não foi possível consultar o Instagram." };
    }
    const posts = (corpo.data ?? [])
      .map((item) => {
        const src = item.media_type === "VIDEO" ? item.thumbnail_url || item.media_url : item.media_url;
        if (!src) return null;
        return { id: item.id, src, link: item.permalink || "" };
      })
      .filter((item): item is PostInstagram => Boolean(item));
    return { posts, erro: null };
  } catch {
    return { posts: [], erro: "Falha ao consultar a API do Instagram." };
  }
}
