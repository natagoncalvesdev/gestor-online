import { cepOnlyDigits } from "@/lib/cep";

export type EnderecoViaCep = {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  complemento: string;
};

export async function buscarEnderecoPorCep(cep: string): Promise<{ dados: EnderecoViaCep | null; erro: string | null }> {
  const digitos = cepOnlyDigits(cep);
  if (digitos.length !== 8) return { dados: null, erro: null };

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
    if (!resposta.ok) return { dados: null, erro: "Não foi possível consultar o CEP." };
    const corpo = (await resposta.json()) as {
      erro?: boolean;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
      complemento?: string;
    };
    if (corpo.erro) return { dados: null, erro: "CEP não encontrado." };
    return {
      dados: {
        logradouro: corpo.logradouro?.trim() ?? "",
        bairro: corpo.bairro?.trim() ?? "",
        cidade: corpo.localidade?.trim() ?? "",
        uf: corpo.uf?.trim() ?? "",
        complemento: corpo.complemento?.trim() ?? "",
      },
      erro: null,
    };
  } catch {
    return { dados: null, erro: "Falha ao consultar o CEP." };
  }
}