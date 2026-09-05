import type { Exame } from '../types.ts';

/**
 * Catalogo clinico. As janelas gestacionais aqui sao o piso do mercado:
 * um laboratorio pode ser mais restritivo (ver semanaMinimaPorExame em labs.ts),
 * nunca mais permissivo, porque a regra vem do fabricante do kit.
 */
export const EXAMES: Exame[] = [
  {
    id: 'paternidade_prenatal_ni',
    nome: 'Paternidade pré-natal não invasiva',
    categoria: 'vinculo_biologico',
    resumo:
      'Compara o DNA fetal que circula no sangue da mãe com o DNA do suposto pai. ' +
      'Nenhum risco para a gestação: é uma coleta de sangue comum na mãe e, em geral, ' +
      'swab bucal no pai.',
    momento: 'gestacao',
    semanaMinima: 7,
    semanaMaxima: null,
    amostras: ['sangue_materno', 'swab_bucal'],
    aceitaValorJuridico: true,
    invasivo: false,
    prazoDiasUteis: [10, 20],
    faixaPrecoCentavos: [350000, 599900],
    alertas: [
      'Quanto mais cedo, menor a fração de DNA fetal no sangue materno e maior a chance de recoleta. Antes de 9 semanas o risco é real.',
      'Só vale para gestação única. Gemelar não é aceito pela maioria dos laboratórios.',
      'Exige laudo de ultrassom confirmando idade gestacional, feto único e batimento cardíaco.',
    ],
    exigeIndicacaoMedica: false,
  },
  {
    id: 'paternidade_prenatal_invasiva',
    nome: 'Paternidade pré-natal invasiva (vilo corial ou amniocentese)',
    categoria: 'vinculo_biologico',
    resumo:
      'Coleta material do próprio feto por punção. Precisão máxima, mas com risco ' +
      'de perda gestacional. Hoje só se justifica quando já existe um procedimento ' +
      'invasivo indicado por outro motivo médico.',
    momento: 'gestacao',
    semanaMinima: 11,
    semanaMaxima: 28,
    amostras: ['vilo_corial', 'liquido_amniotico', 'swab_bucal'],
    aceitaValorJuridico: true,
    invasivo: true,
    prazoDiasUteis: [7, 15],
    faixaPrecoCentavos: [250000, 600000],
    alertas: [
      'Procedimento com risco de abortamento. Só com indicação e acompanhamento médico.',
      'Se o objetivo é apenas saber a paternidade, a versão não invasiva resolve sem risco.',
    ],
    exigeIndicacaoMedica: true,
  },
  {
    id: 'paternidade_pos_natal',
    nome: 'Paternidade após o nascimento',
    categoria: 'vinculo_biologico',
    resumo:
      'Swab bucal do filho e do suposto pai (a mãe entra quando possível, o que aumenta ' +
      'a robustez do laudo). É o exame mais barato, mais rápido e o único que costuma ' +
      'ser aceito sem ressalvas em processo judicial.',
    momento: 'apos_nascimento',
    semanaMinima: null,
    semanaMaxima: null,
    amostras: ['swab_bucal', 'sangue_venoso', 'cartao_fta'],
    aceitaValorJuridico: true,
    invasivo: false,
    prazoDiasUteis: [5, 20],
    faixaPrecoCentavos: [39900, 180000],
    alertas: [
      'Se houver qualquer chance de virar processo, faça direto na modalidade com cadeia de custódia. Refazer depois custa o dobro.',
    ],
    exigeIndicacaoMedica: false,
  },
  {
    id: 'vinculo_familiar',
    nome: 'Vínculo familiar (avoengo, irmandade, tio-sobrinho)',
    categoria: 'vinculo_biologico',
    resumo:
      'Usado quando o suposto pai morreu, sumiu ou se recusa a colher. Compara o DNA ' +
      'do filho com o de avós, irmãos ou tios. Conclusivo, porém com probabilidade ' +
      'menor do que o teste direto.',
    momento: 'apos_nascimento',
    semanaMinima: null,
    semanaMaxima: null,
    amostras: ['swab_bucal', 'sangue_venoso'],
    aceitaValorJuridico: true,
    invasivo: false,
    prazoDiasUteis: [10, 30],
    faixaPrecoCentavos: [90000, 350000],
    alertas: [
      'Quanto mais parentes participam, mais forte fica o resultado. Inclua a avó materna se ela puder colher.',
    ],
    exigeIndicacaoMedica: false,
  },
  {
    id: 'nipt',
    nome: 'NIPT — rastreio pré-natal não invasivo',
    categoria: 'rastreio_fetal',
    resumo:
      'Rastreia trissomias (21, 18, 13) e outras alterações a partir do DNA fetal no ' +
      'sangue da mãe. Não é diagnóstico: resultado alterado sempre pede confirmação.',
    momento: 'gestacao',
    semanaMinima: 10,
    semanaMaxima: null,
    amostras: ['sangue_materno'],
    aceitaValorJuridico: false,
    invasivo: false,
    prazoDiasUteis: [7, 14],
    faixaPrecoCentavos: [70000, 310000],
    alertas: [
      'Regra do fabricante: 10 semanas e 0 dias. Nenhum laboratório sério libera antes.',
      'É rastreio, não diagnóstico. Resultado alterado exige exame invasivo para confirmar.',
      'Muitos planos de saúde cobrem quando há indicação. Pergunte antes de pagar particular.',
    ],
    exigeIndicacaoMedica: false,
  },
  {
    id: 'sexagem_fetal',
    nome: 'Sexagem fetal',
    categoria: 'rastreio_fetal',
    resumo: 'Identifica o sexo do bebê pelo DNA fetal no sangue materno.',
    momento: 'gestacao',
    semanaMinima: 8,
    semanaMaxima: null,
    amostras: ['sangue_materno'],
    aceitaValorJuridico: false,
    invasivo: false,
    prazoDiasUteis: [1, 7],
    faixaPrecoCentavos: [15000, 45000],
    alertas: [
      'Costuma vir de graça dentro do pacote de paternidade pré-natal ou de NIPT. Não pague duas vezes.',
    ],
    exigeIndicacaoMedica: false,
  },
  {
    id: 'painel_genetico',
    nome: 'Painel genético / exoma',
    categoria: 'diagnostico_genetico',
    resumo:
      'Investiga doenças genéticas em quem já tem sintomas ou histórico familiar. ' +
      'Precisa de médico geneticista antes e depois do exame.',
    momento: 'nao_se_aplica',
    semanaMinima: null,
    semanaMaxima: null,
    amostras: ['sangue_venoso', 'swab_bucal'],
    aceitaValorJuridico: false,
    invasivo: false,
    prazoDiasUteis: [20, 60],
    faixaPrecoCentavos: [90000, 1500000],
    alertas: [
      'Sem aconselhamento genético antes e depois, o resultado gera mais dano do que informação.',
      'Verifique cobertura pelo plano: painéis com indicação clínica costumam ter cobertura obrigatória.',
    ],
    exigeIndicacaoMedica: true,
  },
  {
    id: 'ancestralidade',
    nome: 'Ancestralidade',
    categoria: 'ancestralidade',
    resumo: 'Estimativa de origem geográfica dos seus ancestrais. Uso recreativo.',
    momento: 'nao_se_aplica',
    semanaMinima: null,
    semanaMaxima: null,
    amostras: ['swab_bucal'],
    aceitaValorJuridico: false,
    invasivo: false,
    prazoDiasUteis: [15, 60],
    faixaPrecoCentavos: [20000, 90000],
    alertas: [
      'Não serve para comprovar parentesco, nacionalidade ou cidadania.',
      'Leia a política de dados: alguns serviços mantêm seu DNA em banco e compartilham com terceiros.',
    ],
    exigeIndicacaoMedica: false,
  },
];

export const EXAMES_POR_ID: Record<string, Exame> = Object.fromEntries(
  EXAMES.map((e) => [e.id, e]),
);

export function getExame(id: string): Exame | null {
  return EXAMES_POR_ID[id] ?? null;
}
