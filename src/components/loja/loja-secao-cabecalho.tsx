import Image from "next/image";

export function LojaSecaoCabecalho({
  titulo,
  descricao,
  imagem,
}: {
  titulo: string;
  descricao: string;
  imagem: string;
}) {
  return (
    <section className="relative overflow-hidden">
      <div className="relative h-48 sm:h-56">
        <Image src={imagem} alt="" fill className="object-cover" sizes="100vw" priority />
        <div className="absolute inset-0 bg-primary/70" />
        <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-end px-4 pb-8 sm:px-8">
          <h1 className="text-3xl font-bold text-white">{titulo}</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/90">{descricao}</p>
        </div>
      </div>
    </section>
  );
}