import type { Aluno, DadosEndereco, EnderecoAluno, EnderecoFinalidade } from "@/lib/supabase/types";

export const ENDERECO_VAZIO: DadosEndereco = {
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
};

export type AlunoComEnderecoEmbutido = Omit<Aluno, "endereco_entrega" | "endereco_cobranca"> & {
  endereco_aluno?: EnderecoAluno | EnderecoAluno[] | null;
};

function camposDoForm(formData: FormData, finalidade: EnderecoFinalidade): DadosEndereco {
  const prefixo = `${finalidade}_`;
  return {
    cep: String(formData.get(`${prefixo}cep`) ?? "").trim(),
    logradouro: String(formData.get(`${prefixo}logradouro`) ?? "").trim(),
    numero: String(formData.get(`${prefixo}numero`) ?? "").trim(),
    complemento: String(formData.get(`${prefixo}complemento`) ?? "").trim(),
    bairro: String(formData.get(`${prefixo}bairro`) ?? "").trim(),
    cidade: String(formData.get(`${prefixo}cidade`) ?? "").trim(),
    uf: String(formData.get(`${prefixo}uf`) ?? ""),
  };
}

export function enderecoDoForm(formData: FormData, alunoId: string, finalidade: EnderecoFinalidade): EnderecoAluno {
  return {
    aluno_id: alunoId,
    finalidade,
    ...camposDoForm(formData, finalidade),
  };
}

export function enderecosDoForm(formData: FormData, alunoId: string): EnderecoAluno[] {
  return (["entrega", "cobranca"] as const).map((finalidade) => enderecoDoForm(formData, alunoId, finalidade));
}

export function mesclarAlunoEndereco(linha: AlunoComEnderecoEmbutido): Aluno {
  const embutido = linha.endereco_aluno;
  const lista = Array.isArray(embutido) ? embutido : embutido ? [embutido] : [];
  const { endereco_aluno: _embutido, ...aluno } = linha;

  const porFinalidade = (finalidade: EnderecoFinalidade): DadosEndereco => {
    const encontrado = lista.find((item) => item.finalidade === finalidade);
    if (!encontrado) return { ...ENDERECO_VAZIO };
    const { aluno_id: _id, finalidade: _f, ...dados } = encontrado;
    return dados;
  };

  return {
    ...aluno,
    endereco_entrega: porFinalidade("entrega"),
    endereco_cobranca: porFinalidade("cobranca"),
  };
}