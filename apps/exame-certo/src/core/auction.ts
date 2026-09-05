import type { Lance, LanceRanqueado, Laboratorio, Rfq } from '../types.ts';

/** Decremento minimo entre lances do mesmo laboratorio: 1% ou R$ 20, o que for maior. */
export const DECREMENTO_MINIMO_CENTAVOS = 2000;
export const DECREMENTO_MINIMO_PERCENTUAL = 0.01;

export const DURACAO_PADRAO_HORAS = 72;

export interface ResultadoValidacao {
  ok: boolean;
  erros: string[];
}

export function precoTotal(lance: Lance): number {
  return lance.precoCentavos + lance.taxaDomiciliarCentavos;
}

export function decrementoExigido(precoAnteriorCentavos: number): number {
  return Math.max(
    DECREMENTO_MINIMO_CENTAVOS,
    Math.ceil(precoAnteriorCentavos * DECREMENTO_MINIMO_PERCENTUAL),
  );
}

/**
 * Regra do leilao reverso: o laboratorio so pode melhorar a propria proposta.
 * Sem isso o leilao vira balcao e o solicitante perde a referencia de preco.
 */
export function validarLance(
  rfq: Rfq,
  lab: Laboratorio | null,
  novo: Pick<Lance, 'precoCentavos' | 'taxaDomiciliarCentavos' | 'prazoDiasUteis' | 'emiteCadeiaCustodia'>,
  lancesExistentes: Lance[],
  agora: Date = new Date(),
): ResultadoValidacao {
  const erros: string[] = [];

  if (rfq.status !== 'aberto') {
    erros.push('Este pedido não está mais aberto para lances.');
  }
  if (new Date(rfq.encerraEm).getTime() <= agora.getTime()) {
    erros.push('O prazo para lances já encerrou.');
  }
  if (!lab) {
    erros.push('Laboratório não reconhecido.');
  } else {
    if (!lab.ativo) erros.push('Laboratório inativo.');
    if (!lab.examesOferecidos.includes(rfq.examId)) {
      erros.push('Este laboratório não oferece o exame solicitado.');
    }
    const ufsForaDeCobertura = rfq.ufPartes.filter(
      (uf) => lab.ufsAtendidas !== '*' && !lab.ufsAtendidas.includes(uf),
    );
    if (ufsForaDeCobertura.length > 0) {
      erros.push(`Sem cobertura de coleta em ${ufsForaDeCobertura.join(', ')}.`);
    }
    if (new Set(rfq.ufPartes).size > 1 && !lab.coletaMultiCidade) {
      erros.push('O pedido exige coleta das partes em UFs diferentes no mesmo protocolo.');
    }
    if (rfq.precisaColetaDomiciliar && !lab.coletaDomiciliar) {
      erros.push('O pedido exige coleta domiciliar.');
    }
    if (rfq.precisaCadeiaCustodia && !lab.cadeiaCustodia) {
      erros.push('O pedido exige laudo com cadeia de custódia documentada.');
    }
  }

  if (rfq.precisaCadeiaCustodia && !novo.emiteCadeiaCustodia) {
    erros.push('O lance precisa garantir laudo com cadeia de custódia.');
  }
  if (!Number.isInteger(novo.precoCentavos) || novo.precoCentavos <= 0) {
    erros.push('Preço inválido.');
  }
  if (!Number.isInteger(novo.taxaDomiciliarCentavos) || novo.taxaDomiciliarCentavos < 0) {
    erros.push('Taxa de coleta domiciliar inválida.');
  }
  if (!Number.isInteger(novo.prazoDiasUteis) || novo.prazoDiasUteis <= 0) {
    erros.push('Prazo inválido.');
  }
  if (rfq.prazoDesejadoDiasUteis != null && novo.prazoDiasUteis > rfq.prazoDesejadoDiasUteis * 2) {
    erros.push(
      `Prazo muito acima do desejado (${rfq.prazoDesejadoDiasUteis} dias úteis). Reveja a proposta.`,
    );
  }

  if (lab) {
    const meus = lancesExistentes
      .filter((l) => l.labId === lab.id && !l.retirado)
      .sort((a, b) => precoTotal(a) - precoTotal(b));
    const melhorMeu = meus[0];
    if (melhorMeu) {
      const totalNovo = novo.precoCentavos + novo.taxaDomiciliarCentavos;
      const totalAnterior = precoTotal(melhorMeu);
      const minimo = totalAnterior - decrementoExigido(totalAnterior);
      if (totalNovo > minimo) {
        erros.push(
          `Leilão reverso: o novo lance precisa ser no máximo ${formatarBRL(minimo)} ` +
            `(seu lance atual é ${formatarBRL(totalAnterior)}).`,
        );
      }
    }
  }

  return { ok: erros.length === 0, erros };
}

/**
 * Score 0-100. Preco pesa mais, mas prazo e garantias contam - senao o leilao
 * premia quem corta servico para baixar preco.
 */
export const PESOS = { preco: 0.6, prazo: 0.25, garantias: 0.15 } as const;

export function ranquear(
  lances: Lance[],
  labs: Record<string, Laboratorio | undefined>,
  rfq: Rfq,
): LanceRanqueado[] {
  const validos = lances.filter((l) => !l.retirado);
  if (validos.length === 0) return [];

  const totais = validos.map(precoTotal);
  const minPreco = Math.min(...totais);
  const maxPreco = Math.max(...totais);
  const prazos = validos.map((l) => l.prazoDiasUteis);
  const minPrazo = Math.min(...prazos);
  const maxPrazo = Math.max(...prazos);

  const norm = (v: number, min: number, max: number) => (max === min ? 1 : (max - v) / (max - min));

  const ranqueados = validos.map((lance) => {
    const total = precoTotal(lance);
    const notaPreco = norm(total, minPreco, maxPreco);
    const notaPrazo = norm(lance.prazoDiasUteis, minPrazo, maxPrazo);

    let garantias = 0;
    if (lance.recoletaSemCusto) garantias += 0.5;
    if (lance.emiteCadeiaCustodia) garantias += 0.25;
    if (lance.taxaDomiciliarCentavos === 0 && rfq.precisaColetaDomiciliar) garantias += 0.25;
    else if (lance.inclui.length >= 3) garantias += 0.25;
    const notaGarantias = Math.min(1, garantias);

    const score = Math.round(
      (notaPreco * PESOS.preco + notaPrazo * PESOS.prazo + notaGarantias * PESOS.garantias) * 100,
    );

    const justificativa: string[] = [];
    if (total === minPreco) justificativa.push('Menor preço total');
    if (lance.prazoDiasUteis === minPrazo) justificativa.push('Menor prazo');
    if (lance.recoletaSemCusto) justificativa.push('Recoleta sem custo');
    if (lance.emiteCadeiaCustodia) justificativa.push('Laudo com cadeia de custódia');
    if (rfq.precisaColetaDomiciliar && lance.taxaDomiciliarCentavos === 0) {
      justificativa.push('Coleta domiciliar sem taxa');
    }
    if (justificativa.length === 0) justificativa.push('Proposta dentro dos requisitos');

    return {
      lance,
      lab: labs[lance.labId] ?? null,
      score,
      precoTotalCentavos: total,
      posicao: 0,
      justificativa,
    };
  });

  ranqueados.sort((a, b) => b.score - a.score || a.precoTotalCentavos - b.precoTotalCentavos);
  ranqueados.forEach((r, i) => {
    r.posicao = i + 1;
  });
  return ranqueados;
}

/** O que os laboratorios podem ver de um RFQ. Nunca o token do dono. */
export function rfqPublico(rfq: Rfq, lances: Lance[]): Omit<Rfq, 'tokenDono'> & {
  totalLances: number;
  melhorPrecoCentavos: number | null;
} {
  const { tokenDono: _tokenDono, ...resto } = rfq;
  const validos = lances.filter((l) => !l.retirado);
  const melhor = validos.length ? Math.min(...validos.map(precoTotal)) : null;
  return {
    ...resto,
    totalLances: validos.length,
    melhorPrecoCentavos: rfq.revelarMelhorPreco ? melhor : null,
  };
}

export function formatarBRL(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function economiaEstimada(ranqueados: LanceRanqueado[]): number | null {
  if (ranqueados.length < 2) return null;
  const totais = ranqueados.map((r) => r.precoTotalCentavos);
  return Math.max(...totais) - Math.min(...totais);
}
