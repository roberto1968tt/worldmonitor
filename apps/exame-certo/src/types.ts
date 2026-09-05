/**
 * Modelo de dominio do ExameCerto.
 *
 * Principio de privacidade que atravessa todo o app: dado genetico e dado
 * pessoal sensivel (LGPD, art. 5, II). Nada que identifique uma pessoa entra
 * na plataforma. O pedido de orcamento (RFQ) carrega requisitos tecnicos e
 * regiao, nunca nome, CPF, endereco exato ou resultado de exame.
 */

export type UF =
  | 'AC' | 'AL' | 'AM' | 'AP' | 'BA' | 'CE' | 'DF' | 'ES' | 'GO' | 'MA'
  | 'MG' | 'MS' | 'MT' | 'PA' | 'PB' | 'PE' | 'PI' | 'PR' | 'RJ' | 'RN'
  | 'RO' | 'RR' | 'RS' | 'SC' | 'SE' | 'SP' | 'TO';

export type Regiao = 'Norte' | 'Nordeste' | 'Centro-Oeste' | 'Sudeste' | 'Sul';

/** Para que serve o laudo. Muda tudo: coleta, custo, prazo e laboratorio. */
export type FinalidadeJuridica =
  /** Curiosidade / decisao pessoal. Nao vale em processo. */
  | 'informativo'
  /** Reconhecimento voluntario de paternidade em cartorio. */
  | 'extrajudicial'
  /** Vai instruir processo judicial (investigacao de paternidade, alimentos). */
  | 'judicial';

export type TipoAmostra =
  | 'sangue_materno'
  | 'swab_bucal'
  | 'sangue_venoso'
  | 'cartao_fta'
  | 'vilo_corial'
  | 'liquido_amniotico'
  | 'amostra_alternativa';

export type Momento = 'gestacao' | 'apos_nascimento' | 'nao_se_aplica';

export type CategoriaExame =
  | 'vinculo_biologico'
  | 'rastreio_fetal'
  | 'diagnostico_genetico'
  | 'ancestralidade';

export interface Exame {
  id: string;
  nome: string;
  categoria: CategoriaExame;
  resumo: string;
  momento: Momento;
  /** Idade gestacional minima em semanas completas. null = nao se aplica. */
  semanaMinima: number | null;
  /** Idade gestacional maxima em semanas completas. null = sem limite. */
  semanaMaxima: number | null;
  amostras: TipoAmostra[];
  /** Se o exame pode, em tese, gerar laudo com valor juridico. */
  aceitaValorJuridico: boolean;
  invasivo: boolean;
  prazoDiasUteis: [number, number];
  /** Faixa de preco de referencia em centavos, so para calibrar expectativa. */
  faixaPrecoCentavos: [number, number] | null;
  /** Avisos que o app precisa mostrar antes de o usuario seguir. */
  alertas: string[];
  exigeIndicacaoMedica: boolean;
}

export interface Laboratorio {
  id: string;
  nome: string;
  /** Cidade-sede. So para exibicao. */
  sede: string;
  ufSede: UF;
  /** UFs onde consegue COLETAR. '*' significa cobertura nacional via kit/parceiro. */
  ufsAtendidas: UF[] | '*';
  examesOferecidos: string[];
  /** Overrides de semana minima por exame (alguns laboratorios liberam antes). */
  semanaMinimaPorExame?: Record<string, number>;
  coletaDomiciliar: boolean;
  /** Consegue colher as partes em cidades diferentes no mesmo protocolo. */
  coletaMultiCidade: boolean;
  /** Emite laudo com cadeia de custodia documentada (requisito de valor juridico). */
  cadeiaCustodia: boolean;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  site: string | null;
  prazoDiasUteis: [number, number] | null;
  /** Preco publicado pelo proprio laboratorio, em centavos. Raro. */
  precoPublicadoCentavos: number | null;
  /** Data em que os dados foram conferidos na fonte oficial (ISO). */
  verificadoEm: string;
  fonte: string | null;
  observacoes: string;
  /** false = ainda nao passou pela verificacao documental do ExameCerto. */
  credenciado: boolean;
  ativo: boolean;
}

/** Respostas do passo a passo. Nenhum campo identifica a pessoa. */
export interface Respostas {
  objetivo: 'paternidade' | 'saude_fetal' | 'diagnostico' | 'ancestralidade' | null;
  momento: Momento | null;
  /** Idade gestacional em semanas completas, quando momento = gestacao. */
  semanasGestacao: number | null;
  gestacaoUnica: boolean | null;
  finalidade: FinalidadeJuridica | null;
  /** UF de cada parte. Podem ser diferentes - e o caso dificil. */
  ufPartes: UF[];
  precisaColetaDomiciliar: boolean | null;
  supostoPaiDisponivel: boolean | null;
  orcamentoMaximoCentavos: number | null;
}

export interface Bloqueio {
  codigo: string;
  severidade: 'impeditivo' | 'atencao';
  mensagem: string;
  /** O que o usuario faz para destravar. */
  saida: string | null;
}

export interface ExameElegivel {
  exame: Exame;
  elegivel: boolean;
  bloqueios: Bloqueio[];
  /** Data mais cedo em que o exame pode ser coletado, quando aplicavel. */
  liberadoEmSemanas: number | null;
}

export interface LabElegivel {
  lab: Laboratorio;
  elegivel: boolean;
  bloqueios: Bloqueio[];
  cobreTodasAsPartes: boolean;
}

export interface PassoRoteiro {
  ordem: number;
  titulo: string;
  descricao: string;
  responsavel: 'voce' | 'outra_parte' | 'laboratorio' | 'medico' | 'cartorio' | 'justica';
  obrigatorio: boolean;
  /** Documentos ou itens que este passo exige. */
  requisitos: string[];
}

/* ---------------------------------------------------------------- leilao */

export type StatusRfq = 'aberto' | 'encerrado' | 'adjudicado' | 'cancelado';

/** Pedido de orcamento anonimo. E o que os laboratorios enxergam. */
export interface Rfq {
  id: string;
  examId: string;
  finalidade: FinalidadeJuridica;
  ufPartes: UF[];
  semanasGestacao: number | null;
  precisaColetaDomiciliar: boolean;
  precisaCadeiaCustodia: boolean;
  prazoDesejadoDiasUteis: number | null;
  observacoes: string;
  criadoEm: string;
  encerraEm: string;
  status: StatusRfq;
  /** Se os laboratorios veem o menor preco atual. Padrao do leilao reverso. */
  revelarMelhorPreco: boolean;
  lanceVencedorId: string | null;
  /** Segredo do solicitante para encerrar/adjudicar. Nunca sai em GET publico. */
  tokenDono: string;
}

export interface Lance {
  id: string;
  rfqId: string;
  labId: string;
  precoCentavos: number;
  /** Taxa de coleta domiciliar, ja separada do preco do exame. */
  taxaDomiciliarCentavos: number;
  prazoDiasUteis: number;
  inclui: string[];
  /** O laboratorio recoleta sem custo se a fracao fetal vier baixa. */
  recoletaSemCusto: boolean;
  emiteCadeiaCustodia: boolean;
  validoAte: string;
  criadoEm: string;
  retirado: boolean;
}

export interface LanceRanqueado {
  lance: Lance;
  lab: Laboratorio | null;
  /** 0 a 100. Maior = melhor proposta considerando preco, prazo e inclusoes. */
  score: number;
  precoTotalCentavos: number;
  posicao: number;
  /** Por que este lance ficou nessa posicao. */
  justificativa: string[];
}
