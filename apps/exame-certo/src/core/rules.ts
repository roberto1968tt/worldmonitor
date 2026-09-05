import type {
  Bloqueio,
  Exame,
  ExameElegivel,
  LabElegivel,
  Laboratorio,
  Respostas,
  UF,
} from '../types.ts';
import { EXAMES, getExame } from './exams.ts';
import { LABORATORIOS, atendeUf, semanaMinimaDoLab } from './labs.ts';
import { perfilJuridico } from './juridico.ts';
import { UFS, partesEmUfsDiferentes } from './regions.ts';

const impeditivo = (codigo: string, mensagem: string, saida: string | null = null): Bloqueio => ({
  codigo,
  severidade: 'impeditivo',
  mensagem,
  saida,
});

const atencao = (codigo: string, mensagem: string, saida: string | null = null): Bloqueio => ({
  codigo,
  severidade: 'atencao',
  mensagem,
  saida,
});

const OBJETIVO_PARA_CATEGORIA = {
  paternidade: 'vinculo_biologico',
  saude_fetal: 'rastreio_fetal',
  diagnostico: 'diagnostico_genetico',
  ancestralidade: 'ancestralidade',
} as const;

/** Semanas que faltam ate o exame liberar. 0 se ja liberou, null se nao se aplica. */
export function semanasFaltantes(exame: Exame, semanas: number | null): number | null {
  if (exame.semanaMinima == null || semanas == null) return null;
  return Math.max(0, exame.semanaMinima - semanas);
}

/**
 * Avalia um exame contra as respostas do usuario.
 * Funcao pura: mesma entrada, mesma saida. E o coracao testavel do app.
 */
export function avaliarExame(exame: Exame, r: Respostas): ExameElegivel {
  const bloqueios: Bloqueio[] = [];

  if (r.objetivo && OBJETIVO_PARA_CATEGORIA[r.objetivo] !== exame.categoria) {
    bloqueios.push(impeditivo('objetivo', 'Não é o tipo de exame que você procura.'));
  }

  if (r.momento && exame.momento !== 'nao_se_aplica' && exame.momento !== r.momento) {
    bloqueios.push(
      exame.momento === 'gestacao'
        ? impeditivo('momento', 'Este exame só existe durante a gestação.')
        : impeditivo(
            'momento',
            'Este exame só pode ser feito depois do nascimento.',
            'Durante a gestação, veja a paternidade pré-natal não invasiva.',
          ),
    );
  }

  if (r.momento === 'gestacao' && exame.semanaMinima != null) {
    if (r.semanasGestacao == null) {
      bloqueios.push(
        atencao(
          'semanas_desconhecidas',
          'Precisamos da idade gestacional para saber se o exame já liberou.',
          'Faça um ultrassom de datação — é rápido e barato, e o laboratório vai exigir o laudo de qualquer forma.',
        ),
      );
    } else {
      const faltam = semanasFaltantes(exame, r.semanasGestacao);
      if (faltam && faltam > 0) {
        bloqueios.push(
          impeditivo(
            'cedo_demais',
            `Faltam ${faltam} semana(s): este exame libera com ${exame.semanaMinima} semanas completas.`,
            `Volte a partir de ${exame.semanaMinima} semanas. Nenhum laboratório sério libera antes — a regra vem do fabricante do kit.`,
          ),
        );
      } else if (
        exame.id === 'paternidade_prenatal_ni' &&
        r.semanasGestacao >= 7 &&
        r.semanasGestacao < 9
      ) {
        bloqueios.push(
          atencao(
            'fracao_fetal_baixa',
            'Nessa faixa a fração de DNA fetal ainda é baixa e a chance de recoleta é real.',
            'Exija por escrito que o laboratório recolete sem custo se a fração vier baixa.',
          ),
        );
      }
      if (exame.semanaMaxima != null && r.semanasGestacao > exame.semanaMaxima) {
        bloqueios.push(
          impeditivo(
            'tarde_demais',
            `A janela deste exame vai até ${exame.semanaMaxima} semanas.`,
          ),
        );
      }
    }
  }

  if (r.momento === 'gestacao' && r.gestacaoUnica === false && !exame.invasivo &&
      exame.categoria !== 'diagnostico_genetico') {
    bloqueios.push(
      impeditivo(
        'gestacao_multipla',
        'Gestação múltipla: exames em sangue materno não distinguem o DNA de cada feto.',
        'Converse com o obstetra. Nesse cenário, a alternativa costuma ser aguardar o nascimento.',
      ),
    );
  }

  if (r.finalidade && r.finalidade !== 'informativo' && !exame.aceitaValorJuridico) {
    bloqueios.push(
      impeditivo(
        'sem_valor_juridico',
        'Este exame não produz laudo com valor jurídico, em nenhuma modalidade.',
      ),
    );
  }

  if (r.finalidade === 'judicial' && exame.momento === 'gestacao' && exame.categoria === 'vinculo_biologico') {
    bloqueios.push(
      atencao(
        'juridico_prenatal',
        'Exame de vínculo com valor judicial durante a gestação é excepcional.',
        'Fale com um advogado ou com a Defensoria antes de pagar. Depois do nascimento o exame é mais barato, mais rápido e menos contestável.',
      ),
    );
  }

  if (exame.invasivo) {
    bloqueios.push(
      atencao(
        'invasivo',
        'Procedimento invasivo, com risco para a gestação.',
        'Só com indicação e acompanhamento médico.',
      ),
    );
  }

  if (exame.exigeIndicacaoMedica) {
    bloqueios.push(
      atencao('indicacao_medica', 'Exige solicitação e acompanhamento médico.', null),
    );
  }

  if (
    r.objetivo === 'paternidade' &&
    r.supostoPaiDisponivel === false &&
    exame.categoria === 'vinculo_biologico' &&
    exame.id !== 'vinculo_familiar'
  ) {
    bloqueios.push(
      impeditivo(
        'sem_suposto_pai',
        'Este exame precisa da amostra do suposto pai.',
        'Sem ele, o caminho é o exame de vínculo familiar com avós, irmãos ou tios.',
      ),
    );
  }

  const impeditivos = bloqueios.filter((b) => b.severidade === 'impeditivo');
  return {
    exame,
    elegivel: impeditivos.length === 0,
    bloqueios,
    liberadoEmSemanas: exame.semanaMinima,
  };
}

export function avaliarExames(r: Respostas): ExameElegivel[] {
  return EXAMES.map((e) => avaliarExame(e, r)).sort((a, b) => {
    if (a.elegivel !== b.elegivel) return a.elegivel ? -1 : 1;
    return a.exame.nome.localeCompare(b.exame.nome, 'pt-BR');
  });
}

/** Avalia um laboratorio para um exame especifico e um conjunto de respostas. */
export function avaliarLab(lab: Laboratorio, examId: string, r: Respostas): LabElegivel {
  const bloqueios: Bloqueio[] = [];
  const exame = getExame(examId);
  const ufs: UF[] = r.ufPartes.length ? r.ufPartes : [];

  if (!lab.ativo) {
    bloqueios.push(impeditivo('inativo', 'Laboratório fora do catálogo no momento.'));
  }

  if (!lab.examesOferecidos.includes(examId)) {
    bloqueios.push(impeditivo('nao_oferece', 'Não oferece este exame.'));
  }

  const naoCobertas = ufs.filter((uf) => !atendeUf(lab, uf));
  const cobreTodasAsPartes = ufs.length > 0 && naoCobertas.length === 0;
  if (naoCobertas.length > 0) {
    bloqueios.push(
      impeditivo(
        'cobertura',
        `Não coleta em ${naoCobertas.join(', ')}.`,
        'Pergunte se enviam kit ou se têm laboratório de apoio nessa UF.',
      ),
    );
  }

  if (partesEmUfsDiferentes(ufs) && !lab.coletaMultiCidade) {
    bloqueios.push(
      impeditivo(
        'multi_cidade',
        'Não colhe as partes em cidades diferentes no mesmo protocolo.',
        'É o requisito que mais elimina laboratório. Filtre por ele desde o começo.',
      ),
    );
  }

  if (r.precisaColetaDomiciliar && !lab.coletaDomiciliar) {
    bloqueios.push(
      impeditivo('sem_domiciliar', 'Não faz coleta domiciliar.', 'Só atende na unidade.'),
    );
  }

  if (r.finalidade) {
    const perfil = perfilJuridico(r.finalidade);
    if (perfil.exigeCadeiaCustodia && !lab.cadeiaCustodia) {
      bloqueios.push(
        impeditivo(
          'sem_cadeia_custodia',
          'Não emite laudo com cadeia de custódia documentada.',
          'Para uso em cartório ou processo, esse laudo não serve.',
        ),
      );
    }
    if (perfil.exigeCadeiaCustodia && r.precisaColetaDomiciliar) {
      bloqueios.push(
        atencao(
          'domiciliar_x_juridico',
          'Coleta domiciliar costuma descaracterizar a cadeia de custódia.',
          'Escolha: ou o conforto da coleta em casa, ou o valor jurídico do laudo. Confirme por escrito com o laboratório.',
        ),
      );
    }
  }

  if (exame && r.momento === 'gestacao' && r.semanasGestacao != null) {
    const minimaLab = semanaMinimaDoLab(lab, examId, exame.semanaMinima);
    if (minimaLab != null && r.semanasGestacao < minimaLab) {
      bloqueios.push(
        impeditivo(
          'semana_lab',
          `Este laboratório só libera com ${minimaLab} semanas (você está com ${r.semanasGestacao}).`,
          minimaLab > (exame.semanaMinima ?? 0)
            ? 'Outros laboratórios liberam antes. Compare no leilão.'
            : null,
        ),
      );
    }
  }

  if (
    r.orcamentoMaximoCentavos != null &&
    lab.precoPublicadoCentavos != null &&
    lab.precoPublicadoCentavos > r.orcamentoMaximoCentavos
  ) {
    bloqueios.push(
      atencao(
        'acima_orcamento',
        'O preço publicado está acima do seu limite.',
        'Coloque no leilão reverso: preço de tabela não é preço final.',
      ),
    );
  }

  if (!lab.credenciado) {
    bloqueios.push(
      atencao(
        'nao_credenciado',
        'Dados coletados do site oficial, mas o laboratório ainda não passou pela verificação documental do ExameCerto.',
        'Confirme preço, prazo e acreditação diretamente com ele.',
      ),
    );
  }

  const impeditivos = bloqueios.filter((b) => b.severidade === 'impeditivo');
  return { lab, elegivel: impeditivos.length === 0, bloqueios, cobreTodasAsPartes };
}

export function avaliarLabs(examId: string, r: Respostas): LabElegivel[] {
  return LABORATORIOS.map((l) => avaliarLab(l, examId, r)).sort((a, b) => {
    if (a.elegivel !== b.elegivel) return a.elegivel ? -1 : 1;
    return a.bloqueios.length - b.bloqueios.length;
  });
}

/** Quantos laboratorios do catalogo conseguem atender cada UF, para o mapa de cobertura. */
export function coberturaPorUf(examId: string): Record<UF, number> {
  const oferecem = LABORATORIOS.filter(
    (l) => l.ativo && l.examesOferecidos.includes(examId),
  );
  const nacionais = oferecem.filter((l) => l.ufsAtendidas === '*').length;
  const mapa = {} as Record<UF, number>;
  for (const uf of UFS) {
    const locais = oferecem.filter(
      (l) => l.ufsAtendidas !== '*' && l.ufsAtendidas.includes(uf),
    ).length;
    mapa[uf] = nacionais + locais;
  }
  return mapa;
}
