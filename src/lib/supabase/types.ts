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

export type Aluno = {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  data_nascimento: string;
  telefone: string;
  numero_aluno: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  atendente: string;
  indicador: string;
  status: "ativo" | "inativo";
  data_cadastro: string;
};

export type Session =
  | { type: "interno"; user: UsuarioInterno }
  | { type: "aluno"; user: Aluno };
