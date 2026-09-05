import type { FinalidadeJuridica } from '../types.ts';

export interface PerfilJuridico {
  id: FinalidadeJuridica;
  nome: string;
  resumo: string;
  /** Se exige laudo com cadeia de custodia documentada. */
  exigeCadeiaCustodia: boolean;
  /** Se a coleta pode ser feita em casa / por kit enviado pelo correio. */
  permiteColetaDomiciliar: boolean;
  /** Se o kit pode ser manuseado pelo proprio interessado. */
  permiteAutoColeta: boolean;
  requisitos: string[];
  ondeUsa: string[];
  avisos: string[];
}

/**
 * O ponto que mais derruba exame no Brasil: a pessoa faz o teste em casa, com
 * kit pelo correio, e depois descobre que aquele laudo nao entra em processo.
 * Um laudo informativo nao vira juridico depois - refaz do zero.
 */
export const PERFIS_JURIDICOS: Record<FinalidadeJuridica, PerfilJuridico> = {
  informativo: {
    id: 'informativo',
    nome: 'Informativo (particular)',
    resumo:
      'Você quer saber, para decidir a sua vida. O laudo é seu e não produz efeito ' +
      'jurídico nenhum.',
    exigeCadeiaCustodia: false,
    permiteColetaDomiciliar: true,
    permiteAutoColeta: true,
    requisitos: [
      'Consentimento livre e informado de quem coleta.',
      'Na gestação, autorização da gestante — o material sai do corpo dela.',
    ],
    ondeUsa: ['Decisão pessoal', 'Conversa entre as partes', 'Planejamento familiar'],
    avisos: [
      'Não serve em processo judicial nem em cartório. Se virar disputa, o exame terá de ser refeito.',
      'É a modalidade mais barata e a única que aceita kit em casa e coleta domiciliar.',
    ],
  },
  extrajudicial: {
    id: 'extrajudicial',
    nome: 'Extrajudicial (reconhecimento em cartório)',
    resumo:
      'As partes concordam e querem registrar a paternidade sem processo. O cartório ' +
      'exige laudo com cadeia de custódia.',
    exigeCadeiaCustodia: true,
    permiteColetaDomiciliar: false,
    permiteAutoColeta: false,
    requisitos: [
      'Coleta presencial em unidade credenciada, feita por profissional do laboratório.',
      'Identificação de todos com documento oficial com foto, conferido no ato.',
      'Fotografia de cada participante no momento da coleta.',
      'Amostras lacradas na frente dos participantes, com termo assinado.',
      'Laboratório com acreditação e participação em ensaio de proficiência.',
      'Consentimento expresso de todos os envolvidos — ninguém é obrigado.',
    ],
    ondeUsa: [
      'Reconhecimento voluntário de paternidade em cartório',
      'Averbação de paternidade no registro civil',
      'Acordo de guarda ou alimentos formalizado',
    ],
    avisos: [
      'Coleta domiciliar em geral descaracteriza a cadeia de custódia. Confirme por escrito com o laboratório antes de contratar.',
      'Cartórios podem ter exigências próprias. Pergunte no cartório ANTES de pagar o exame.',
    ],
  },
  judicial: {
    id: 'judicial',
    nome: 'Judicial (vai instruir processo)',
    resumo:
      'Existe ou vai existir processo — investigação de paternidade, alimentos, ' +
      'inventário. O laudo precisa resistir a impugnação da outra parte.',
    exigeCadeiaCustodia: true,
    permiteColetaDomiciliar: false,
    permiteAutoColeta: false,
    requisitos: [
      'Coleta presencial com cadeia de custódia integral e rastreável.',
      'Identificação por documento oficial com foto, com cópia anexada ao laudo.',
      'Fotografia no ato da coleta e assinatura do termo por todos.',
      'Laboratório acreditado, com responsável técnico identificado no laudo.',
      'Preferencialmente laboratório aceito pela vara ou indicado no processo.',
      'Menor de idade representado por quem detém a guarda.',
    ],
    ondeUsa: [
      'Ação de investigação de paternidade',
      'Ação de alimentos',
      'Inventário e sucessão',
      'Anulação de registro',
    ],
    avisos: [
      'Se o processo já existe, fale com o advogado ANTES de contratar. Exame feito por fora pode ser recusado pelo juízo, e a perícia oficial costuma sair mais barata ou até gratuita.',
      'Exame pré-natal para fins judiciais é excepcional: em geral se aguarda o nascimento, quando o teste é mais barato, mais rápido e menos contestável.',
      'Quem não tem condições de pagar pode pedir gratuidade da justiça e perícia custeada pelo Estado. Procure a Defensoria Pública.',
    ],
  },
};

export function perfilJuridico(f: FinalidadeJuridica): PerfilJuridico {
  return PERFIS_JURIDICOS[f];
}
