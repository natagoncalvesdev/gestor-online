"use client";

import { useRef, useState } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import { cepOnlyDigits, formatCepDisplay } from "@/lib/cep";
import { ESTADOS } from "@/lib/estados";
import { buscarEnderecoPorCep } from "@/lib/viacep";
import type { DadosEndereco, EnderecoFinalidade } from "@/lib/supabase/types";

const ROTULO: Record<EnderecoFinalidade, string> = {
  entrega: "Entrega",
  cobranca: "Cobrança",
};

export function EnderecoCampos({
  finalidade,
  endereco,
  exibirTitulo = true,
}: {
  finalidade: EnderecoFinalidade;
  endereco: DadosEndereco;
  exibirTitulo?: boolean;
}) {
  const prefixo = finalidade;
  const ultimoCepBuscado = useRef<string | null>(null);
  const [campos, setCampos] = useState(endereco);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroCep, setErroCep] = useState<string | null>(null);

  async function aoDigitarCep(valor: string) {
    const digitos = cepOnlyDigits(valor);
    const cepFormatado = formatCepDisplay(digitos);
    setCampos((atual) => ({ ...atual, cep: cepFormatado }));
    setErroCep(null);

    if (digitos.length !== 8) {
      ultimoCepBuscado.current = null;
      return;
    }
    if (ultimoCepBuscado.current === digitos) return;
    ultimoCepBuscado.current = digitos;

    setBuscandoCep(true);
    const { dados, erro } = await buscarEnderecoPorCep(digitos);
    setBuscandoCep(false);
    if (erro) {
      setErroCep(erro);
      return;
    }
    if (!dados) return;

    setCampos((atual) => ({
      ...atual,
      logradouro: dados.logradouro || atual.logradouro,
      bairro: dados.bairro || atual.bairro,
      cidade: dados.cidade || atual.cidade,
      uf: dados.uf || atual.uf,
      complemento: dados.complemento || atual.complemento,
    }));
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {exibirTitulo ? (
        <div className="sm:col-span-2">
          <p className="text-sm font-medium">{ROTULO[finalidade]}</p>
        </div>
      ) : null}
      <Field label="CEP">
        <Input
          name={`${prefixo}_cep`}
          inputMode="numeric"
          autoComplete="postal-code"
          value={campos.cep}
          onChange={(evento) => aoDigitarCep(evento.target.value)}
          aria-busy={buscandoCep}
        />
        {buscandoCep ? <p className="text-xs text-muted-foreground">Buscando endereço…</p> : null}
        {erroCep ? <p className="text-xs text-destructive">{erroCep}</p> : null}
      </Field>
      <Field label="Logradouro">
        <Input name={`${prefixo}_logradouro`} value={campos.logradouro} onChange={(e) => setCampos((a) => ({ ...a, logradouro: e.target.value }))} />
      </Field>
      <Field label="Número">
        <Input name={`${prefixo}_numero`} value={campos.numero} onChange={(e) => setCampos((a) => ({ ...a, numero: e.target.value }))} />
      </Field>
      <Field label="Complemento">
        <Input name={`${prefixo}_complemento`} value={campos.complemento} onChange={(e) => setCampos((a) => ({ ...a, complemento: e.target.value }))} />
      </Field>
      <Field label="Bairro">
        <Input name={`${prefixo}_bairro`} value={campos.bairro} onChange={(e) => setCampos((a) => ({ ...a, bairro: e.target.value }))} />
      </Field>
      <Field label="Cidade">
        <Input name={`${prefixo}_cidade`} value={campos.cidade} onChange={(e) => setCampos((a) => ({ ...a, cidade: e.target.value }))} />
      </Field>
      <Field label="Estado">
        <Select name={`${prefixo}_uf`} value={campos.uf} onChange={(e) => setCampos((a) => ({ ...a, uf: e.target.value }))}>
          <option value="">Selecione</option>
          {ESTADOS.map((estado) => (
            <option key={estado.uf} value={estado.uf}>
              {estado.nome} ({estado.uf})
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}