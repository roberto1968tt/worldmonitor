import type { Laboratorio, UF } from '../types.ts';

/**
 * Catalogo semente. Cada registro foi conferido no site oficial do laboratorio
 * na data em verificadoEm. Nada aqui e preco negociado: preco real sai do
 * leilao reverso.
 *
 * credenciado = false significa que o laboratorio ainda nao entregou ao
 * ExameCerto a documentacao de acreditacao. Ele aparece na busca, mas nao
 * pode dar lance em RFQ que exige cadeia de custodia.
 */
export const LABORATORIOS: Laboratorio[] = [
  {
    id: 'vangenes',
    nome: 'Vangenes',
    sede: 'São Paulo',
    ufSede: 'SP',
    ufsAtendidas: '*',
    examesOferecidos: ['paternidade_prenatal_ni', 'paternidade_pos_natal', 'sexagem_fetal'],
    semanaMinimaPorExame: { paternidade_prenatal_ni: 7 },
    coletaDomiciliar: true,
    coletaMultiCidade: true,
    cadeiaCustodia: false,
    telefone: '+551134761893',
    whatsapp: '+5511986977954',
    email: 'faleconosco@vangenes.com',
    site: 'https://vpaternitytest.com/',
    prazoDiasUteis: [10, 15],
    precoPublicadoCentavos: null,
    verificadoEm: '2026-09-05',
    fonte: 'https://vpaternitytest.com/',
    observacoes:
      'Declara atendimento em todo o Brasil, coleta domiciliar ou em clínica, kit e coleta ' +
      'inclusos no pacote e sexagem fetal junto. Pai por swab bucal.',
    credenciado: false,
    ativo: true,
  },
  {
    id: 'clinimol',
    nome: 'Clinimol',
    sede: 'São Paulo',
    ufSede: 'SP',
    ufsAtendidas: ['SP'],
    examesOferecidos: ['paternidade_prenatal_ni', 'paternidade_pos_natal'],
    semanaMinimaPorExame: { paternidade_prenatal_ni: 8 },
    coletaDomiciliar: false,
    coletaMultiCidade: false,
    cadeiaCustodia: false,
    telefone: '+551132840210',
    whatsapp: '+5511978956470',
    email: null,
    site: 'https://clinimol.com/teste-de-paternidade-nao-invasivo/',
    prazoDiasUteis: [20, 20],
    precoPublicadoCentavos: 549900,
    verificadoEm: '2026-09-05',
    fonte: 'https://clinimol.com/teste-de-paternidade-nao-invasivo/',
    observacoes:
      'Único do catálogo que publica preço: R$ 5.499,00 via PIX ou transferência. ' +
      'Não exige pedido médico. Coleta na unidade, em São Paulo.',
    credenciado: false,
    ativo: true,
  },
  {
    id: 'genomic',
    nome: 'Genomic Engenharia Molecular',
    sede: 'Uberlândia',
    ufSede: 'MG',
    ufsAtendidas: '*',
    examesOferecidos: ['paternidade_prenatal_ni', 'paternidade_pos_natal', 'vinculo_familiar'],
    semanaMinimaPorExame: { paternidade_prenatal_ni: 11 },
    coletaDomiciliar: false,
    coletaMultiCidade: true,
    cadeiaCustodia: true,
    telefone: '+551132881188',
    whatsapp: '+5511984482767',
    email: 'comercial@genomic.com.br',
    site: 'https://genomic.com.br/portal/dna-na-gravidez-nao-invasivo/',
    prazoDiasUteis: [15, 15],
    precoPublicadoCentavos: null,
    verificadoEm: '2026-09-05',
    fonte: 'https://genomic.com.br/portal/dna-na-gravidez-nao-invasivo/',
    observacoes:
      'Trabalha com rede de laboratórios parceiros pelo país. Para a versão pré-natal ' +
      'exige 11 semanas, mais tarde que a média do mercado. Punção de 20 ml na mãe.',
    credenciado: false,
    ativo: true,
  },
  {
    id: 'pasteur_joacaba',
    nome: 'Laboratório Pasteur',
    sede: 'Joaçaba',
    ufSede: 'SC',
    ufsAtendidas: ['SC'],
    examesOferecidos: ['paternidade_prenatal_ni', 'paternidade_pos_natal'],
    semanaMinimaPorExame: { paternidade_prenatal_ni: 9 },
    coletaDomiciliar: false,
    coletaMultiCidade: false,
    cadeiaCustodia: false,
    telefone: '+554935220166',
    whatsapp: '+554935220166',
    email: 'lab@pasteur.bio.br',
    site: 'https://www.pasteur.bio.br/',
    prazoDiasUteis: [15, 20],
    precoPublicadoCentavos: null,
    verificadoEm: '2026-09-05',
    fonte: 'https://www.pasteur.bio.br/detalhe-novidade/teste-de-paternidade-pr-natal-n-o-invasivo',
    observacoes: 'Libera a partir da 9ª semana. Mesmo número serve como WhatsApp.',
    credenciado: false,
    ativo: true,
  },
  {
    id: 'db_molecular',
    nome: 'DB Molecular — Diagnósticos do Brasil',
    sede: 'São Paulo',
    ufSede: 'SP',
    ufsAtendidas: '*',
    examesOferecidos: ['paternidade_prenatal_invasiva', 'paternidade_pos_natal', 'vinculo_familiar'],
    coletaDomiciliar: false,
    coletaMultiCidade: true,
    cadeiaCustodia: true,
    telefone: '+551138689800',
    whatsapp: null,
    email: 'atendimento.molecular@dbdiagnosticos.com.br',
    site: 'https://www.dbmolecular.com.br/',
    prazoDiasUteis: [7, 7],
    precoPublicadoCentavos: null,
    verificadoEm: '2026-09-05',
    fonte: 'https://gde.diagnosticosdobrasil.com.br/GDE_Home/DetalheDoExame.aspx?ExameId=PATPN',
    observacoes:
      'Atenção: o exame pré-natal do catálogo deles é INVASIVO (vilo corial de 11 a 13 semanas, ' +
      'líquido amniótico de 14 a 28). Exige formulário de vínculo genético e termo assinado ' +
      'por todos, com CRM na cadeia de custódia. 0800 643 0376.',
    credenciado: false,
    ativo: true,
  },
  {
    id: 'dasa_genomica',
    nome: 'Dasa Genômica / GeneOne',
    sede: 'São Paulo',
    ufSede: 'SP',
    ufsAtendidas: '*',
    examesOferecidos: ['nipt', 'painel_genetico', 'sexagem_fetal'],
    semanaMinimaPorExame: { nipt: 10 },
    coletaDomiciliar: true,
    coletaMultiCidade: true,
    cadeiaCustodia: false,
    telefone: '+551130037323',
    whatsapp: '+551130037323',
    email: 'nac.genomica@dasa.com.br',
    site: 'https://www.dasagenomica.com/exames/nipt-basico/',
    prazoDiasUteis: [7, 14],
    precoPublicadoCentavos: null,
    verificadoEm: '2026-09-05',
    fonte: 'https://www.dasagenomica.com/exames/nipt-basico/',
    observacoes:
      'NIPT Básico a partir de 10 semanas e 0 dias, resultado em até 14 dias úteis. ' +
      'Atendimento de segunda a sexta das 6h às 21h. Rede nacional (inclui Álvaro no Paraná). ' +
      'Não há confirmação pública de que façam paternidade pré-natal não invasiva.',
    credenciado: false,
    ativo: true,
  },
  {
    id: 'fleury',
    nome: 'Fleury / Fleury em Casa',
    sede: 'São Paulo',
    ufSede: 'SP',
    ufsAtendidas: ['SP', 'RJ', 'RS', 'PE', 'BA', 'DF', 'PR', 'SC', 'MG'],
    examesOferecidos: ['nipt', 'painel_genetico'],
    semanaMinimaPorExame: { nipt: 10 },
    coletaDomiciliar: true,
    coletaMultiCidade: true,
    cadeiaCustodia: false,
    telefone: '+551131790822',
    whatsapp: '+551131790822',
    email: null,
    site: 'https://www.fleury.com.br/servicos/fleury-em-casa',
    prazoDiasUteis: [7, 14],
    precoPublicadoCentavos: null,
    verificadoEm: '2026-09-05',
    fonte: 'https://www.fleury.com.br/servicos/fleury-em-casa',
    observacoes:
      'Coleta domiciliar todos os dias das 6h às 22h, inclusive feriados. O site informa ' +
      'que não há taxa de deslocamento.',
    credenciado: false,
    ativo: true,
  },
  {
    id: 'carlos_chagas_maringa',
    nome: 'Laboratório Carlos Chagas',
    sede: 'Maringá',
    ufSede: 'PR',
    ufsAtendidas: ['PR'],
    examesOferecidos: ['nipt', 'paternidade_pos_natal'],
    coletaDomiciliar: true,
    coletaMultiCidade: false,
    cadeiaCustodia: false,
    telefone: '+554432278787',
    whatsapp: '+5544998239870',
    email: null,
    site: 'https://labchagas.com.br/coleta-domiciliar/',
    prazoDiasUteis: [5, 15],
    precoPublicadoCentavos: null,
    verificadoEm: '2026-09-05',
    fonte: 'https://labchagas.com.br/coleta-domiciliar/',
    observacoes:
      'Coleta domiciliar apenas na cidade de Maringá, agendamento com 24h de antecedência, ' +
      'somente no período da manhã, vagas limitadas. Prioridade declarada para gestantes.',
    credenciado: false,
    ativo: true,
  },
  {
    id: 'gene_bh',
    nome: 'Laboratório Gene',
    sede: 'Belo Horizonte',
    ufSede: 'MG',
    ufsAtendidas: ['MG'],
    examesOferecidos: ['paternidade_pos_natal', 'vinculo_familiar', 'painel_genetico'],
    coletaDomiciliar: false,
    coletaMultiCidade: false,
    cadeiaCustodia: true,
    telefone: '+553121058000',
    whatsapp: '+5531997961540',
    email: null,
    site: 'https://laboratoriogene.com.br/',
    prazoDiasUteis: [10, 20],
    precoPublicadoCentavos: null,
    verificadoEm: '2026-09-05',
    fonte: 'https://laboratoriogene.com.br/exames/paternidade-por-dna-8c-pre-natal-nao-invasiva-durante-a-gravidez/',
    observacoes:
      'O próprio site informa que NÃO coleta mais amostras para paternidade pré-natal ' +
      'não invasiva. Por isso esse exame não consta na lista de ofertas.',
    credenciado: false,
    ativo: true,
  },
];

export const LABS_POR_ID: Record<string, Laboratorio> = Object.fromEntries(
  LABORATORIOS.map((l) => [l.id, l]),
);

export function getLab(id: string): Laboratorio | null {
  return LABS_POR_ID[id] ?? null;
}

export function atendeUf(lab: Laboratorio, uf: UF): boolean {
  return lab.ufsAtendidas === '*' || lab.ufsAtendidas.includes(uf);
}

/** Semana minima efetiva: o maior valor entre a regra clinica e a do laboratorio. */
export function semanaMinimaDoLab(
  lab: Laboratorio,
  examId: string,
  semanaMinimaClinica: number | null,
): number | null {
  const override = lab.semanaMinimaPorExame?.[examId];
  if (override == null) return semanaMinimaClinica;
  if (semanaMinimaClinica == null) return override;
  return Math.max(override, semanaMinimaClinica);
}
