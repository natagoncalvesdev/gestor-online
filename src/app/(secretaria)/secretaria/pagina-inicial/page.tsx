import { ActionForm } from "@/components/action-form";
import { EnquadramentoImagem } from "@/components/secretaria/enquadramento-imagem";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { CapaProduto } from "@/components/loja/capa-produto";
import { EditarBanner } from "@/components/secretaria/editar-banner";
import { excluirBanner, moverBanner, salvarBanner } from "@/actions/pagina-inicial";
import type { FormState } from "@/lib/form-state";
import { urlImagemSite } from "@/lib/site-imagem";
import { requireAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export default async function PaginaInicialAdmin() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: banners } = await supabase.from("home_banner").select("*").order("ordem");

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
