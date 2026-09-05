/**
 * FASE 2 - Rede de custeio.
 *
 * Ainda nao esta ligada: nao ha meio de pagamento, conta de custodia nem
 * verificacao socioeconomica em producao. O modelo e as regras estao aqui
 * porque as decisoes de arquitetura precisam existir antes de qualquer
 * linha de codigo que mexa com dinheiro de terceiros.
 *
 * Principio inegociavel: dinheiro doado NUNCA passa pela mao do beneficiario.
 * Vai da conta de custodia direto para o laboratorio adjudicado, contra a
 * nota fiscal do exame. Isso corta de uma vez fraude, desvio e a suspeita
 * disso - que mataria a rede mais rapido que a fraude em si.
 */

export type StatusCampanha =
  | 'rascunho'
  | 'em_verificacao'
  | 'aberta'
  | 'financiada'
  | 'paga_ao_laboratorio'
  | 'expirada'
  | 'recusada';

export type OrigemVerificacao =
  | 'cadunico'
  | 'defensoria_publica'
  | 'servico_social_hospitalar'
  | 'ong_parceira'
  | 'declaracao_simples';

export interface Campanha {
  id: string;
  /** Campanha nasce colada a um RFQ ja adjudicado: preco fechado, sem inflar meta. */
  rfqId: string;
  laboratorioId: string;
  metaCentavos: number;
  arrecadadoCentavos: number;
  status: StatusCampanha;
  /** Historia em texto livre, sem nome, sem foto, sem dado de saude identificavel. */
  relato: string;
  origemVerificacao: OrigemVerificacao | null;
  verificadoEm: string | null;
  criadaEm: string;
  expiraEm: string;
  /** Vagas doadas pelo proprio laboratorio, que abatem a meta antes das doacoes. */
  descontoLaboratorioCentavos: number;
}

export interface Doacao {
  id: string;
  campanhaId: string;
  valorCentavos: number;
  anonima: boolean;
  criadaEm: string;
}

export const REGRAS_CUSTEIO = {
  /** Meta nunca maior que o lance vencedor. Sem margem, sem taxa embutida. */
  metaIgualAoLanceVencedor: true,
  /** Repasse direto ao laboratorio, contra nota fiscal. */
  repasseDiretoAoLaboratorio: true,
  /** Se nao atingir a meta no prazo, devolve integralmente ao doador. */
  devolucaoIntegralSeNaoFinanciar: true,
  /** Plataforma nao retem taxa sobre doacao nesta fase. */
  taxaPlataformaPercentual: 0,
  prazoPadraoDias: 45,
  /** Sem nome, foto ou dado de saude identificavel na vitrine publica. */
  campanhaAnonimaPorPadrao: true,
} as const;

export function faltaParaMeta(c: Campanha): number {
  return Math.max(0, c.metaCentavos - c.descontoLaboratorioCentavos - c.arrecadadoCentavos);
}

export function percentualFinanciado(c: Campanha): number {
  const alvo = Math.max(1, c.metaCentavos - c.descontoLaboratorioCentavos);
  return Math.min(100, Math.round(((c.arrecadadoCentavos / alvo) * 100)));
}

export function podeAbrirCampanha(c: Pick<Campanha, 'status' | 'origemVerificacao' | 'metaCentavos'>): {
  ok: boolean;
  motivos: string[];
} {
  const motivos: string[] = [];
  if (c.metaCentavos <= 0) motivos.push('Meta precisa vir de um lance vencedor.');
  if (!c.origemVerificacao) motivos.push('Falta a verificação socioeconômica.');
  if (c.origemVerificacao === 'declaracao_simples') {
    motivos.push('Declaração simples não basta sozinha: exige contrachecagem de um parceiro.');
  }
  if (c.status !== 'em_verificacao' && c.status !== 'rascunho') {
    motivos.push('Campanha já saiu da fase de verificação.');
  }
  return { ok: motivos.length === 0, motivos };
}

/**
 * Antes de abrir campanha, o app tem obrigacao de mostrar o que e gratuito.
 * Muita gente monta vaquinha para pagar algo a que ja tem direito.
 */
export const CAMINHOS_GRATUITOS = [
  {
    titulo: 'Defensoria Pública',
    quando: 'Investigação de paternidade, alimentos, reconhecimento',
    descricao:
      'Assistência jurídica gratuita. Em ação de investigação de paternidade, o exame de DNA ' +
      'costuma ser custeado pelo Estado quando é deferida a gratuidade da justiça.',
    contato: 'Defensoria Pública do seu estado',
  },
  {
    titulo: 'SUS — pré-natal',
    quando: 'Ultrassom de datação e exames de rotina da gestação',
    descricao:
      'O ultrassom obstétrico e o pré-natal completo são gratuitos na rede pública. Só isso já ' +
      'tira um item da conta.',
    contato: 'UBS do seu bairro',
  },
  {
    titulo: 'Plano de saúde',
    quando: 'NIPT e painéis genéticos com indicação clínica',
    descricao:
      'Exames com indicação médica podem ter cobertura obrigatória. Negativa por escrito pode ' +
      'ser contestada na ANS.',
    contato: 'Central do seu plano e ANS (0800 701 9656)',
  },
  {
    titulo: 'Serviço social do hospital',
    quando: 'Gestação de risco, situação de vulnerabilidade',
    descricao:
      'A assistente social do hospital ou da maternidade conhece programas municipais e estaduais ' +
      'que não aparecem em busca na internet.',
    contato: 'Serviço social da maternidade de referência',
  },
] as const;
