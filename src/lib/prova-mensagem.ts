export function mensagemResultado(
  nota: number,
  acertos: number,
  total: number,
  aprovado: boolean,
  encerra: boolean | undefined
) {
  const texto = `Nota ${nota} (${acertos} de ${total}).`;
  if (encerra === false) {
    return aprovado ? `${texto} Questionário concluído.` : `${texto} Você pode tentar de novo.`;
  }
  return aprovado
    ? `Aprovado com ${texto} A próxima matéria foi liberada se ainda havia vaga.`
    : `${texto} Prova concluída.`;
}
