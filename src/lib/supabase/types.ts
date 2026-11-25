export type InternoPapel = "admin" | "secretaria";
export type MateriaAcesso = "bloqueada" | "liberada" | "concluida";

export type UsuarioInterno = {
  id: string;
  nome: string;
  email: string;
  papel: InternoPapel;
  status: "ativo" | "inativo";
  data_criacao: string;
};

export type EnderecoFinalidade = "cobranca" | "entrega";

export type DadosEndereco = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
};

export type EnderecoAluno = DadosEndereco & {
  aluno_id: string;
  finalidade: EnderecoFinalidade;
};

export type Aluno = {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  data_nascimento: string;
  telefone: string;
  numero_aluno: string;
  atendente: string;
  indicador: string;
  status: "ativo" | "inativo";
  data_cadastro: string;
  endereco_entrega: DadosEndereco;
  endereco_cobranca: DadosEndereco;
};

export type Session =
  | { type: "interno"; user: UsuarioInterno }
  | { type: "aluno"; user: Aluno };
