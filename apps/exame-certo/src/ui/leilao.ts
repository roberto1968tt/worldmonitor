import type { Lance, Respostas, Rfq } from '../types.ts';
import { precoTotal, ranquear, validarLance } from '../core/auction.ts';
import { getExame } from '../core/exams.ts';
import { LABS_POR_ID, getLab } from '../core/labs.ts';
import { PERFIS_JURIDICOS } from '../core/juridico.ts';
import { avaliarLabs } from '../core/rules.ts';
import { brl, h, limpar } from './dom.ts';
import { carregarPedido, salvarPedido } from './estado.ts';
import { escolherStore, type LeilaoStore } from './store.ts';

let store: LeilaoStore | null = null;
let carregandoStore: Promise<LeilaoStore> | null = null;

function obterStore(): Promise<LeilaoStore> {
  if (store) return Promise.resolve(store);
  if (!carregandoStore) {
    // A API própria só existe no deploy com as rotas de api/ na frente.
    const temApiPropria = Boolean(import.meta.env?.VITE_API_PROPRIA);
    carregandoStore = escolherStore(temApiPropria).then((s) => (store = s));
  }
  return carregandoStore;
}

const MODOS = {
  servidor: {
    etiqueta: 'validado no servidor',
    texto:
      'Os lances passam pelas rotas de /api: o servidor recusa lance que sobe de preço, ' +
      'laboratório sem cobertura e adjudicação sem o token do dono.',
  },
  compartilhado: {
    etiqueta: 'estado compartilhado',
    texto:
      'Os pedidos e lances ficam no banco desta página e são vistos por quem a abrir. ' +
      'As regras do leilão rodam aqui no navegador — dá para ver o mecanismo funcionando, ' +
      'mas não para valer dinheiro. Para isso, o app roda com as rotas de /api na frente.',
  },
  local: {
    etiqueta: 'só nesta aba',
    texto:
      'Sem banco disponível: os pedidos ficam na memória desta aba e somem quando você a fecha. ' +
      'Serve para percorrer o fluxo.',
  },
} as const;

export function renderLeilao(
  raiz: HTMLElement,
  respostas: Respostas,
  examIdSugerido: string | null,
): void {
  limpar(raiz);
  const examId = examIdSugerido ?? 'paternidade_prenatal_ni';
  const exame = getExame(examId);

  raiz.append(
    h('h1', {}, 'Leilão reverso de orçamentos'),
    h('p', { class: 'sub' },
      'Você publica os requisitos. Os laboratórios não sabem quem você é — só veem exame, ' +
      'estados de coleta e prazo. Cada um só pode melhorar a própria proposta, nunca piorar. ' +
      'Você escolhe, e só então descobre com quem falou.'),
  );

  const painel = h('div', {});
  raiz.append(painel);
  raiz.append(comoFunciona());

  void montarPainel(painel, respostas, examId, exame?.prazoDiasUteis[1] ?? null);
}

async function montarPainel(
  painel: HTMLElement,
  respostas: Respostas,
  examId: string,
  prazoDesejado: number | null,
): Promise<void> {
  const s = await obterStore();
  const modo = MODOS[s.modo];

  const mostrar = async (id: string) => {
    limpar(painel);
    painel.append(h('p', { class: 'sub' }, 'Carregando pedido...'));
    const dados = await s.ler(id);
    limpar(painel);
    painel.append(nota(modo));
    if (!dados) {
      painel.append(h('div', { class: 'aviso atencao' },
        'O pedido não está mais disponível. Publique um novo.'));
      painel.append(formulario());
      return;
    }
    painel.append(renderPedido(dados.rfq, dados.lances, s, mostrar));
  };

  const publicar = async () => {
    const obs = (painel.querySelector('#obs') as HTMLTextAreaElement | null)?.value ?? '';
    limpar(painel);
    painel.append(h('p', { class: 'sub' }, 'Publicando pedido...'));
    try {
      const { rfq, tokenDono } = await s.criar({
        examId,
        finalidade: respostas.finalidade ?? 'informativo',
        ufPartes: respostas.ufPartes,
        semanasGestacao: respostas.semanasGestacao,
        precisaColetaDomiciliar: respostas.precisaColetaDomiciliar === true,
        prazoDesejadoDiasUteis: prazoDesejado,
        observacoes: obs.slice(0, 500),
      });
      salvarPedido({ id: rfq.id, tokenDono, criadoEm: rfq.criadoEm });
      await mostrar(rfq.id);
    } catch (e) {
      limpar(painel);
      painel.append(nota(modo));
      painel.append(h('div', { class: 'aviso impeditivo' }, (e as Error).message));
      painel.append(formulario());
    }
  };

  const formulario = () => {
    const exame = getExame(examId);
    return h('div', { class: 'cartao destaque' },
      h('h3', {}, exame?.nome ?? examId),
      h('p', { class: 'sub' },
        `Estados de coleta: ${respostas.ufPartes.join(', ') || 'nenhum informado'} · ` +
        `Finalidade: ${respostas.finalidade ? PERFIS_JURIDICOS[respostas.finalidade].nome : 'informativo'}`),
      h('label', { for: 'obs', class: 'rotulo' }, 'Alguma condição especial? (opcional)'),
      h('div', { class: 'ajuda' },
        'Sem nomes, sem endereço, sem telefone. Só o que o laboratório precisa para orçar — ' +
        'por exemplo: "gestante com fobia de agulha, uma punção só".'),
      h('textarea', { id: 'obs', maxlength: '500' }),
      h('div', { class: 'acoes' },
        h('button', { class: 'botao', type: 'button', onClick: () => void publicar() },
          'Publicar pedido'),
      ),
      respostas.ufPartes.length === 0
        ? h('div', { class: 'aviso atencao' },
            'Você ainda não informou os estados de coleta. Volte ao passo a passo antes de publicar.')
        : null,
    );
  };

  limpar(painel);
  painel.append(nota(modo));
  const salvo = carregarPedido();
  if (salvo) {
    void mostrar(salvo.id);
  } else {
    painel.append(formulario());
  }
}

function nota(modo: (typeof MODOS)[keyof typeof MODOS]): HTMLElement {
  return h('div', { class: 'nota-modo' },
    h('span', { class: 'etiqueta' }, modo.etiqueta),
    h('span', {}, modo.texto),
  );
}

function renderPedido(
  rfq: Rfq,
  lances: Lance[],
  s: LeilaoStore,
  recarregar: (id: string) => Promise<void>,
): HTMLElement {
  const pedido = carregarPedido();
  const ranking = ranquear(lances, LABS_POR_ID, rfq);
  const adjudicado = rfq.status === 'adjudicado';
  const vencedor = adjudicado
    ? ranking.find((r) => r.lance.id === rfq.lanceVencedorId)
    : undefined;
  const melhor = lances.length ? Math.min(...lances.map(precoTotal)) : null;

  const escolher = async (lanceId: string) => {
    if (!pedido) return;
    try {
      await s.adjudicar(rfq.id, pedido.tokenDono, lanceId);
      await recarregar(rfq.id);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const container = h('div', {});

  container.append(h('div', { class: 'cartao destaque' },
    h('div', { class: 'linha-lab' },
      h('div', {},
        h('h3', {}, 'Pedido publicado'),
        h('code', {}, rfq.id),
      ),
      h('div', { class: 'pilhas' },
        h('span', { class: `etiqueta ${adjudicado ? 'ok' : ''}` },
          adjudicado ? 'adjudicado' : 'aberto para lances'),
        h('span', { class: 'etiqueta neutra' },
          lances.length === 1 ? '1 lance' : `${lances.length} lances`),
        melhor != null ? h('span', { class: 'etiqueta' }, `melhor: ${brl(melhor)}`) : null,
      ),
    ),
    h('div', { class: 'acoes' },
      h('button', { class: 'botao secundario', type: 'button',
        onClick: () => void recarregar(rfq.id) }, 'Atualizar'),
      !s.validadoNoServidor && !adjudicado
        ? h('button', { class: 'botao secundario', type: 'button',
            onClick: () => void simular(rfq, lances, s, recarregar) },
            lances.length ? 'Nova rodada de lances' : 'Simular lances dos laboratórios')
        : null,
    ),
    !s.validadoNoServidor && !adjudicado
      ? h('div', { class: 'ajuda' },
          'Nenhum laboratório está credenciado ainda. A simulação usa o catálogo real e as ' +
          'regras reais do leilão para mostrar o mecanismo — os valores são inventados.')
      : null,
  ));

  if (vencedor) {
    const lab = getLab(vencedor.lance.labId);
    container.append(h('div', { class: 'cartao vencedor' },
      h('h3', {}, `Escolhido: ${lab?.nome ?? 'laboratório'}`),
      h('p', { class: 'sub' },
        `${brl(vencedor.precoTotalCentavos)} · ${vencedor.lance.prazoDiasUteis} dias úteis · ` +
        vencedor.justificativa.join(' · ')),
      lab
        ? h('div', { class: 'contatos' },
            lab.telefone ? h('a', { href: `tel:${lab.telefone}` }, lab.telefone) : null,
            lab.site ? h('a', { href: lab.site, target: '_blank', rel: 'noopener noreferrer' }, 'Site') : null,
          )
        : null,
      h('p', { class: 'sub' },
        'Antes de pagar, confirme por escrito escopo, data da coleta e valor total, citando o ' +
        'número do pedido.'),
    ));
  }

  if (ranking.length === 0) {
    container.append(h('div', { class: 'aviso atencao' }, 'Nenhum lance ainda.'));
    return container;
  }

  // Um lance só não é leilão. Em vez de exibir uma tabela de uma linha como se
  // fosse disputa, diga o que está estreitando o mercado e o que afrouxar.
  if (concorrentes(lances) < 2 && !adjudicado) {
    container.append(h('div', { class: 'aviso atencao' },
      'Só um laboratório do catálogo atende a esses requisitos — sem concorrência não há ' +
      'disputa de preço.',
      h('span', { class: 'saida' },
        `→ ${afrouxar(rfq)} Cada requisito que você solta costuma trazer mais participantes.`),
    ));
  }

  container.append(h('div', { class: 'rolagem' },
    h('table', {},
      h('thead', {},
        h('tr', {},
          h('th', {}, '#'), h('th', {}, 'Proposta'), h('th', { class: 'num' }, 'Total'),
          h('th', { class: 'num' }, 'Prazo'), h('th', { class: 'num' }, 'Score'), h('th', {}, ''),
        ),
      ),
      h('tbody', {},
        ...ranking.map((r) => {
          const revelado = adjudicado && r.lance.id === rfq.lanceVencedorId;
          return h('tr', { class: revelado ? 'destacada' : '' },
            h('td', {}, String(r.posicao)),
            h('td', {},
              h('b', {}, revelado ? (r.lab?.nome ?? 'Laboratório') : `Laboratório ${r.posicao}`),
              h('div', { class: 'ajuda' }, r.justificativa.join(' · ')),
            ),
            h('td', { class: 'num' }, brl(r.precoTotalCentavos)),
            h('td', { class: 'num' }, `${r.lance.prazoDiasUteis} d.ú.`),
            h('td', { class: 'num' }, String(r.score)),
            h('td', {},
              !adjudicado && pedido
                ? h('button', { class: 'botao mini', type: 'button',
                    onClick: () => void escolher(r.lance.id) }, 'Escolher')
                : null,
            ),
          );
        }),
      ),
    ),
  ));

  return container;
}

/**
 * Gera lances usando o catalogo real e passando por validarLance - as mesmas
 * regras do servidor. Lance recusado pela regra simplesmente nao entra, que e
 * exatamente o que acontece na API.
 */
async function simular(
  rfq: Rfq,
  existentes: Lance[],
  s: LeilaoStore,
  recarregar: (id: string) => Promise<void>,
): Promise<void> {
  const exame = getExame(rfq.examId);
  const base = exame?.faixaPrecoCentavos?.[0] ?? 300000;
  const teto = exame?.faixaPrecoCentavos?.[1] ?? 500000;

  const aptos = avaliarLabs(rfq.examId, {
    objetivo: null,
    momento: rfq.semanasGestacao != null ? 'gestacao' : 'apos_nascimento',
    semanasGestacao: rfq.semanasGestacao,
    gestacaoUnica: true,
    finalidade: rfq.finalidade,
    ufPartes: rfq.ufPartes,
    precisaColetaDomiciliar: rfq.precisaColetaDomiciliar,
    supostoPaiDisponivel: true,
    orcamentoMaximoCentavos: null,
  }).filter((l) => l.elegivel);

  const acumulados = [...existentes];
  let entraram = 0;

  for (const { lab } of aptos) {
    const anterior = acumulados
      .filter((l) => l.labId === lab.id)
      .sort((a, b) => precoTotal(a) - precoTotal(b))[0];

    const alvo = anterior
      ? Math.round(precoTotal(anterior) * (0.93 + Math.random() * 0.03))
      : Math.round(base + Math.random() * (teto - base));

    const taxa = rfq.precisaColetaDomiciliar && !anterior && Math.random() > 0.5
      ? Math.round(10000 + Math.random() * 15000)
      : 0;

    const proposta = {
      precoCentavos: Math.max(10000, alvo - taxa),
      taxaDomiciliarCentavos: taxa,
      prazoDiasUteis: lab.prazoDiasUteis
        ? lab.prazoDiasUteis[anterior ? 0 : 1]
        : 15,
      emiteCadeiaCustodia: lab.cadeiaCustodia,
    };

    const validacao = validarLance(rfq, lab, proposta, acumulados);
    if (!validacao.ok) continue;

    const lance: Lance = {
      id: `lance_${lab.id}_${Date.now().toString(36)}_${entraram}`,
      rfqId: rfq.id,
      labId: lab.id,
      ...proposta,
      inclui: ['kit', 'coleta', exame?.id === 'paternidade_prenatal_ni' ? 'sexagem fetal' : 'laudo'],
      recoletaSemCusto: Boolean(anterior) || Math.random() > 0.5,
      validoAte: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      criadoEm: new Date().toISOString(),
      retirado: false,
    };

    await s.adicionarLance(lance);
    acumulados.push(lance);
    entraram++;
  }

  if (entraram === 0) {
    alert(
      'Nenhum laboratório do catálogo consegue atender a esses requisitos — ' +
      'é exatamente o que a regra do leilão faz quando ninguém tem cobertura.',
    );
  }
  await recarregar(rfq.id);
}

function concorrentes(lances: Lance[]): number {
  return new Set(lances.filter((l) => !l.retirado).map((l) => l.labId)).size;
}

/** Qual requisito, na ordem, está cortando mais laboratório neste pedido. */
function afrouxar(rfq: Rfq): string {
  if (rfq.precisaCadeiaCustodia) {
    return 'Cadeia de custódia é o filtro mais duro do mercado: poucos laboratórios emitem ' +
      'laudo com valor jurídico. Se o laudo for só para você decidir, a finalidade informativa ' +
      'abre o catálogo inteiro.';
  }
  if (rfq.precisaColetaDomiciliar) {
    return 'Coleta domiciliar é o requisito que mais elimina: tente também com coleta na unidade ' +
      'e compare a diferença de preço antes de decidir.';
  }
  if (new Set(rfq.ufPartes).size > 1) {
    return 'Coletar as partes em UFs diferentes no mesmo protocolo é raro. Se todas puderem ' +
      'colher no mesmo estado, o mercado cresce muito.';
  }
  return 'Ampliar o prazo aceito costuma trazer mais laboratórios.';
}

function comoFunciona(): HTMLElement {
  const linha = (rotulo: string, texto: string) =>
    h('div', { class: 'regra' },
      h('div', { class: 'regra-rotulo' }, rotulo),
      h('div', {}, texto),
    );

  return h('section', {},
    h('h2', {}, 'Como funciona a disputa'),
    h('div', { class: 'regras' },
      linha('Quem vê o quê',
        'O laboratório vê exame, estados e prazo. Nunca o seu nome. Você vê os lances como ' +
        '"Laboratório 1, 2, 3" e só descobre o nome depois de escolher.'),
      linha('Lance só desce',
        'Cada laboratório pode melhorar a própria proposta, com desconto mínimo de 1% ou R$ 20. ' +
        'Não dá para subir o preço depois.'),
      linha('Taxa entra na conta',
        'Preço e taxa de coleta domiciliar são somados. Cortar preço e recolocar na taxa não ' +
        'conta como lance melhor.'),
      linha('Ranking',
        'Preço pesa 60%, prazo 25%, garantias 15%. Sem isso o leilão premiaria quem corta ' +
        'serviço para baixar preço.'),
      linha('Você não é obrigado',
        'O leilão termina quando você escolhe — ou simplesmente não escolhe.'),
    ),
  );
}
