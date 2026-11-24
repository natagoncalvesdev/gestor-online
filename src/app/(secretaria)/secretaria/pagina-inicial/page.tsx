import { ActionForm } from "@/components/action-form";
import { EnquadramentoImagem } from "@/components/secretaria/enquadramento-imagem";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { CapaProduto } from "@/components/loja/capa-produto";
import { EditarBanner } from "@/components/secretaria/editar-banner";
import { excluirBanner, moverBanner, salvarBanner, salvarGoogle, salvarTokenInstagram } from "@/actions/pagina-inicial";
import { buscarGoogle, buscarInstagram } from "@/lib/home-apis";
import type { FormState } from "@/lib/form-state";
import { urlImagemSite } from "@/lib/site-imagem";
import { requireAdmin } from "@/lib/session";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function PaginaInicialAdmin() {
  await requireAdmin();
  const supabase = await createClient();
  const admin = createServiceRoleClient();
  const [{ data: banners }, integracaoRes] = await Promise.all([
    supabase.from("home_banner").select("*").order("ordem"),
    admin ? admin.from("home_integracao").select("google_api_key, google_place_id, instagram_token").eq("id", 1).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const integracao = integracaoRes.data;
  const [google, instagram] = await Promise.all([
    buscarGoogle({
      google_api_key: integracao?.google_api_key ?? "",
      google_place_id: integracao?.google_place_id ?? "",
    }),
    buscarInstagram(integracao?.instagram_token ?? ""),
  ]);

  return (
    <div className="flex w-full flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Página inicial</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          O recorte que você ajustar aqui é o mesmo que aparece passando na home.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Banners</h2>
        <Card>
          <CardContent className="space-y-4 p-4">
            <ActionForm action={salvarBanner} className="space-y-4">
              <EnquadramentoImagem
                url={null}
                zoomInicial={1}
                xInicial={0}
                yInicial={0}
                proporcao="aspect-[2/1]"
                dica="Proporção 2160×1080. Arraste e use o zoom antes de adicionar."
              />
              <Field label="Link ao clicar (opcional)">
                <Input name="link" placeholder="https:// ou /loja" />
              </Field>
              <SubmitButton>Adicionar banner</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
        <ListaMidia
          itens={(banners ?? []).map((item) => ({
            id: item.id,
            src: urlImagemSite(item.imagem_path),
            zoom: Number(item.imagem_zoom),
            x: Number(item.imagem_x),
            y: Number(item.imagem_y),
            link: item.link ?? "",
            legenda: item.link || "Sem link",
            proporcao: "aspect-[2/1] w-full sm:max-w-md",
          }))}
          excluir={excluirBanner}
          mover={moverBanner}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Avaliações do Google</h2>
        <p className="text-sm text-muted-foreground">
          Use a chave da Places API e o Place ID. A nota, o total e os comentários vêm do Google.
        </p>
        <Card>
          <CardContent className="p-4">
            <ActionForm action={salvarGoogle} className="grid gap-4 sm:grid-cols-2">
              <Field label="Chave da API do Google">
                <Input name="google_api_key" type="password" autoComplete="off" placeholder={integracao?.google_api_key ? "Chave já salva — preencha só para trocar" : "AIza..."} />
              </Field>
              <Field label="Place ID">
                <Input name="google_place_id" defaultValue={integracao?.google_place_id ?? ""} placeholder="ChIJ..." />
              </Field>
              <div className="sm:col-span-2">
                <SubmitButton>Salvar Google</SubmitButton>
              </div>
            </ActionForm>
          </CardContent>
        </Card>
        {google.erro ? <p className="text-sm text-destructive">{google.erro}</p> : null}
        {google.dados ? (
          <p className="text-sm text-muted-foreground">
            Nota {google.dados.nota.toFixed(1).replace(".", ",")} · {google.dados.resumo} · {google.dados.avaliacoes.length} comentários recebidos
          </p>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Instagram</h2>
        <p className="text-sm text-muted-foreground">
          Cole o token de acesso de longa duração da conta profissional. As publicações recentes aparecem na página inicial.
        </p>
        <Card>
          <CardContent className="p-4">
            <ActionForm action={salvarTokenInstagram} className="space-y-4">
              <Field label="Token do Instagram">
                <Input name="instagram_token" type="password" autoComplete="off" placeholder={integracao?.instagram_token ? "Token já salvo — preencha só para trocar" : ""} />
              </Field>
              <SubmitButton>Salvar Instagram</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
        {instagram.erro ? <p className="text-sm text-destructive">{instagram.erro}</p> : null}
        {instagram.posts.length > 0 ? (
          <p className="text-sm text-muted-foreground">{instagram.posts.length} publicações recebidas da API.</p>
        ) : null}
      </section>
    </div>
  );
}

function ListaMidia({
  itens,
  excluir,
  mover,
}: {
  itens: { id: string; src: string | null; zoom: number; x: number; y: number; link: string; legenda: string; proporcao: string }[];
  excluir: (prev: FormState, formData: FormData) => Promise<FormState>;
  mover: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  if (itens.length === 0) return <p className="text-sm text-muted-foreground">Nenhum item ainda.</p>;
  return (
    <ul className="space-y-3">
      {itens.map((item) => (
        <li key={item.id} className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center">
          {item.src ? <CapaProduto src={item.src} zoom={item.zoom} x={item.x} y={item.y} proporcao={item.proporcao} /> : null}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{item.legenda}</p>
            <div className="mt-3 flex flex-wrap items-start gap-2">
              <Ordem id={item.id} mover={mover} />
              <EditarBanner id={item.id} link={item.link} url={item.src} zoom={item.zoom} x={item.x} y={item.y} />
              <ActionForm action={excluir}>
                <input type="hidden" name="id" value={item.id} />
                <SubmitButton variant="destructive" size="sm" pendingLabel="Removendo...">
                  Remover
                </SubmitButton>
              </ActionForm>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Ordem({
  id,
  mover,
}: {
  id: string;
  mover: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  return (
    <>
      <ActionForm action={mover}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="direcao" value="subir" />
        <SubmitButton variant="outline" size="sm" pendingLabel="...">
          Subir
        </SubmitButton>
      </ActionForm>
      <ActionForm action={mover}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="direcao" value="descer" />
        <SubmitButton variant="outline" size="sm" pendingLabel="...">
          Descer
        </SubmitButton>
      </ActionForm>
    </>
  );
}
