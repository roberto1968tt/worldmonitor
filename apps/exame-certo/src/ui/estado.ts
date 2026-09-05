import type { Respostas } from '../types.ts';

const CHAVE = 'exame-certo:respostas';

export const RESPOSTAS_VAZIAS: Respostas = {
  objetivo: null,
  momento: null,
  semanasGestacao: null,
  gestacaoUnica: null,
  finalidade: null,
  ufPartes: [],
  precisaColetaDomiciliar: null,
  supostoPaiDisponivel: null,
  orcamentoMaximoCentavos: null,
};

/**
 * Estado fica em sessionStorage, nao em localStorage: idade gestacional e
 * intencao de teste de paternidade sao dados sensiveis. Fechou a aba, sumiu.
 */
export function carregar(): Respostas {
  try {
    const bruto = sessionStorage.getItem(CHAVE);
    if (!bruto) return { ...RESPOSTAS_VAZIAS };
    return { ...RESPOSTAS_VAZIAS, ...(JSON.parse(bruto) as Partial<Respostas>) };
  } catch {
    return { ...RESPOSTAS_VAZIAS };
  }
}

export function salvar(r: Respostas): void {
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(r));
  } catch {
    /* modo privado: seguimos sem persistir */
  }
}

export function limparEstado(): void {
  try {
    sessionStorage.removeItem(CHAVE);
  } catch {
    /* ignora */
  }
}

const CHAVE_PEDIDO = 'exame-certo:pedido';

export interface PedidoLocal {
  id: string;
  tokenDono: string;
  criadoEm: string;
}

export function salvarPedido(p: PedidoLocal): void {
  try {
    sessionStorage.setItem(CHAVE_PEDIDO, JSON.stringify(p));
  } catch {
    /* ignora */
  }
}

export function carregarPedido(): PedidoLocal | null {
  try {
    const bruto = sessionStorage.getItem(CHAVE_PEDIDO);
    return bruto ? (JSON.parse(bruto) as PedidoLocal) : null;
  } catch {
    return null;
  }
}
