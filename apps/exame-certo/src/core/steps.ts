import type { Exame, PassoRoteiro, Respostas } from '../types.ts';
import { perfilJuridico } from './juridico.ts';
import { partesEmUfsDiferentes } from './regions.ts';
import { semanasFaltantes } from './rules.ts';

/**
 * Gera o passo a passo personalizado. E o que o usuario leva impresso para o dia.
 * A ordem importa: cada passo so aparece se as respostas justificarem.
 */
export function montarRoteiro(exame: Exame, r: Respostas): PassoRoteiro[] {
  const passos: Omit<PassoRoteiro, 'ordem'>[] = [];
  const perfil = r.finalidade ? perfilJuridico(r.finalidade) : null;
  const multiUf = partesEmUfsDiferentes(r.ufPartes);
  const faltam = semanasFaltantes(exame, r.semanasGestacao);

  if (perfil && perfil.exigeCadeiaCustodia) {
    passos.push({
      titulo: 'Antes de tudo: fale com um advogado ou com a Defensoria Pública',
      descricao:
        'Você marcou que o laudo vai ter uso jurídico. Exame contratado por fora pode ser ' +
        'recusado pelo juízo, e a perícia dentro do processo costuma sair mais barata — ' +
        'às vezes gratuita, com a gratuidade da justiça. Cinco minutos aqui evitam pagar duas vezes.',
      responsavel: 'justica',
      obrigatorio: true,
      requisitos: ['Número do processo, se já existir'],
    });
  }

  if (exame.exigeIndicacaoMedica) {
    passos.push({
      titulo: 'Consulta médica e solicitação do exame',
      descricao:
        'Este exame exige indicação médica. No caso de painel genético, exige também ' +
        'aconselhamento genético antes e depois — sem isso o resultado gera mais dano que informação.',
      responsavel: 'medico',
      obrigatorio: true,
      requisitos: ['Pedido médico assinado com CRM'],
    });
  }

  if (faltam != null && faltam > 0) {
    passos.push({
      titulo: `Aguardar ${faltam} semana(s)`,
      descricao:
        `O exame libera com ${exame.semanaMinima} semanas completas. Use esse tempo para ` +
        'fechar orçamento e organizar a documentação — assim, no dia, é só colher.',
      responsavel: 'voce',
      obrigatorio: true,
      requisitos: [],
    });
  }

  if (exame.momento === 'gestacao') {
    passos.push({
      titulo: 'Ultrassom de datação',
      descricao:
        'O laboratório não libera a coleta sem laudo recente confirmando idade gestacional, ' +
        'gestação única e batimento cardíaco presente. Pelo SUS é gratuito; particular costuma ' +
        'ser o item mais barato de todo o processo.',
      responsavel: 'outra_parte',
      obrigatorio: true,
      requisitos: ['Laudo de ultrassom obstétrico com data recente'],
    });
  }

  passos.push({
    titulo: 'Abrir o pedido de orçamento (leilão reverso)',
    descricao:
      'Publique o pedido com os seus requisitos. Os laboratórios dão lances para baixo, ' +
      'sem saber quem você é. Você compara preço, prazo e o que está incluso, e escolhe.',
    responsavel: 'voce',
    obrigatorio: false,
    requisitos: ['Nenhum dado pessoal — o pedido é anônimo'],
  });

  if (multiUf) {
    passos.push({
      titulo: 'Confirmar coleta em UFs diferentes no mesmo protocolo',
      descricao:
        `As partes estão em ${r.ufPartes.join(', ')}. Esse é o requisito que mais elimina ` +
        'laboratório. Peça confirmação por escrito de que as duas coletas entram no mesmo ' +
        'protocolo, com o mesmo número, antes de pagar.',
      responsavel: 'laboratorio',
      obrigatorio: true,
      requisitos: ['Confirmação por escrito (WhatsApp ou e-mail) do número único de protocolo'],
    });
  }

  passos.push({
    titulo: 'Fechar com o laboratório e pagar',
    descricao:
      'Peça o valor TOTAL fechado: exame, kit, coleta, frete e taxa domiciliar. Guarde o ' +
      'comprovante e a confirmação escrita de data, janela de horário e o que está incluso.',
    responsavel: 'voce',
    obrigatorio: true,
    requisitos: ['Comprovante de pagamento', 'Confirmação escrita do escopo e da data'],
  });

  const docs = ['Documento oficial com foto de cada participante'];
  if (perfil?.exigeCadeiaCustodia) {
    docs.push('Cópia dos documentos para anexar ao laudo');
    docs.push('Termo de consentimento assinado por todos');
    docs.push('Documento de quem representa o menor, quando houver');
  }
  if (exame.momento === 'gestacao') docs.push('Laudo do ultrassom de datação');

  passos.push({
    titulo: 'Separar a documentação',
    descricao: perfil?.exigeCadeiaCustodia
      ? 'Modalidade com valor jurídico: a conferência dos documentos no ato da coleta é parte ' +
        'da cadeia de custódia. Documento faltando é coleta cancelada.'
      : 'Mesmo no exame informativo o laboratório confere documento com foto no ato da coleta.',
    responsavel: 'voce',
    obrigatorio: true,
    requisitos: docs,
  });

  if (perfil?.exigeCadeiaCustodia) {
    passos.push({
      titulo: 'Coleta presencial em unidade credenciada',
      descricao:
        'Coleta feita por profissional do laboratório, com identificação por documento com ' +
        'foto, fotografia de cada participante, lacre das amostras na frente de todos e ' +
        'assinatura do termo. Coleta em casa, em geral, derruba o valor jurídico do laudo.',
      responsavel: 'laboratorio',
      obrigatorio: true,
      requisitos: ['Todos os participantes presentes, com documento original'],
    });
  } else {
    passos.push({
      titulo: r.precisaColetaDomiciliar ? 'Coleta domiciliar' : 'Coleta na unidade',
      descricao: r.precisaColetaDomiciliar
        ? 'A enfermeira vai até o endereço combinado com o kit lacrado. Reconfirme na véspera. ' +
          'Se alguma parte tem medo de agulha, avise no agendamento: muda o profissional que ' +
          'mandam e o tempo reservado para o atendimento.'
        : 'Leve documento original com foto. Se houver mais de um kit (por exemplo paternidade ' +
          'e NIPT), peça para colher tudo na mesma punção.',
      responsavel: 'laboratorio',
      obrigatorio: true,
      requisitos: ['Documento com foto', 'Kit lacrado conferido na sua frente'],
    });
  }

  passos.push({
    titulo: 'Confirmar que a amostra foi aceita',
    descricao:
      'Um a dois dias depois, peça confirmação por escrito de que as amostras chegaram e ' +
      'foram aceitas. Em exame de sangue materno, é aqui que aparece o problema de fração ' +
      'fetal baixa — e é aqui que a garantia de recoleta sem custo vale ouro.',
    responsavel: 'voce',
    obrigatorio: true,
    requisitos: ['Número do protocolo'],
  });

  passos.push({
    titulo: 'Resultado',
    descricao:
      `Prazo de referência: ${exame.prazoDiasUteis[0]} a ${exame.prazoDiasUteis[1]} dias úteis. ` +
      'Confirme se a contagem começa na coleta ou na chegada da amostra ao laboratório — ' +
      'isso muda a data real em até três dias. Exija laudo com senha e pergunte quem mais tem acesso.',
    responsavel: 'laboratorio',
    obrigatorio: true,
    requisitos: ['Senha de acesso ao laudo'],
  });

  if (r.finalidade === 'extrajudicial') {
    passos.push({
      titulo: 'Levar o laudo ao cartório',
      descricao:
        'Com o laudo e o acordo das partes, o reconhecimento é averbado no registro civil. ' +
        'Cartórios têm exigências próprias: ligue antes e confirme o que aceitam.',
      responsavel: 'cartorio',
      obrigatorio: true,
      requisitos: ['Laudo original com cadeia de custódia', 'Documentos das partes', 'Certidão de nascimento'],
    });
  }

  return passos.map((p, i) => ({ ...p, ordem: i + 1 }));
}
