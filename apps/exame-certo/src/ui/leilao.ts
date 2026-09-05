import type { Respostas } from '../types.ts';
import { getExame } from '../core/exams.ts';
import { PERFIS_JURIDICOS } from '../core/juridico.ts';
import { brl, h, limpar } from './dom.ts';
import { carregarPedido, salvarPedido } from './estado.ts';

const API = import.meta.env?.VITE_API_BASE ?? '';

interface RfqPublico {
  id: string;
  examId: string;
  status: string;
  encerraEm: string;
  ufPartes: string[];
  totalLances: number;
  melhorPrecoCentavos: number | null;
  precisaColetaDomiciliar: boolean;
  precisaCadeiaCustodia: boolean;
}

interface ItemRanking {
  lance: {
    id: string; precoCentavos: number; taxaDomiciliarCentavos: number;
    prazoDiasUteis: number; recoletaSemCusto: boolean; inclui: string[];
  };
  score: number;
  precoTotalCentavos: number;
  posicao: number;
  justificativa: string[];
  labNome: string | null;
}

async function api<T>(caminho: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${API}/api/${caminho}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const corpo = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
  if (!resp.ok) {
    const detalhes = Array.isArray(corpo.detalhes) ? (corpo.detalhes as string[]) : [];
    throw new Error([corpo.erro ?? 'Falha na requisição', ...detalhes].join(' — '));
  }
  return corpo as T;
}

export function renderLeilao(raiz: HTMLElement, respostas: Respostas, examIdSugerido: string | null): void {
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

  const pedidoSalvo = carregarPedido();
  const painel = h('div', {});

  const criar = async () => {
    limpar(painel);
    painel.append(h('p', { class: 'sub' }, 'Publicando pedido...'));
    try {
      const perfil = respostas.finalidade ? PERFIS_JURIDICOS[respostas.finalidade] : null;
      const resposta = await api<{ rfq: RfqPublico; tokenDono: string }>('rfq', {
        method: 'POST',
        body: JSON.stringify({
          examId,
          finalidade: respostas.finalidade ?? 'informativo',
          ufPartes: respostas.ufPartes,
          semanasGestacao: respostas.semanasGestacao,
          precisaColetaDomiciliar:
            perfil?.exigeCadeiaCustodia ? false : respostas.precisaColetaDomiciliar === true,
          prazoDesejadoDiasUteis: exame?.prazoDiasUteis[1] ?? null,
          observacoes: (document.getElementById('obs') as HTMLTextAreaElement | null)?.value ?? '',
        }),
      });
      salvarPedido({
        id: resposta.rfq.id,
        tokenDono: resposta.tokenDono,
        criadoEm: new Date().toISOString(),
      });
      await mostrarPedido(resposta.rfq.id);
    } catch (e) {
      limpar(painel);
      painel.append(h('div', { class: 'aviso impeditivo' }, (e as Error).message));
      painel.append(formulario());
    }
  };

  const mostrarPedido = async (id: string) => {
    limpar(painel);
    painel.append(h('p', { class: 'sub' }, 'Carregando pedido...'));
    try {
      const dados = await api<{ rfq: RfqPublico; ranking: ItemRanking[] }>(`rfq?id=${encodeURIComponent(id)}`);
      limpar(painel);
      painel.append(renderPedido(dados.rfq, dados.ranking, mostrarPedido));
    } catch (e) {
      limpar(painel);
      painel.append(h('div', { class: 'aviso impeditivo' }, (e as Error).message));
    }
  };

  const formulario = () =>
    h('div', { class: 'cartao' },
      h('h3', {}, exame?.nome ?? examId),
      h('p', { class: 'sub' },
        `Estados de coleta: ${respostas.ufPartes.join(', ') || 'nenhum informado'} · ` +
        `Finalidade: ${respostas.finalidade ? PERFIS_JURIDICOS[respostas.finalidade].nome : 'informativo'}`),
      h('label', { for: 'obs', style: 'display:block;font-weight:600;margin:12px 0 4px' },
        'Alguma condição especial? (opcional)'),
      h('div', { class: 'ajuda' },
        'Sem nomes, sem endereço, sem telefone. Só o que o laboratório precisa saber para ' +
        'orçar — por exemplo: "gestante com fobia de agulha, uma punção só".'),
      h('textarea', { id: 'obs', maxlength: '500' }),
      h('div', { style: 'margin-top:12px' },
        h('button', { class: 'botao', type: 'button', onClick: criar }, 'Publicar pedido'),
      ),
      respostas.ufPartes.length === 0
        ? h('div', { class: 'aviso atencao' },
            'Você ainda não informou os estados de coleta. Volte ao passo a passo antes de publicar.')
        : null,
    );

  if (pedidoSalvo) {
    painel.append(h('div', { class: 'aviso bom' },
      `Você já tem um pedido aberto: ${pedidoSalvo.id}`));
    void mostrarPedido(pedidoSalvo.id);
  } else {
    painel.append(formulario());
  }

  raiz.append(painel);

  raiz.append(h('h2', {}, 'Como funciona a disputa'));
  raiz.append(h('div', { class: 'cartao' },
    h('table', {},
      h('tbody', {},
        linha('Quem vê o quê', 'O laboratório vê exame, estados e prazo. Nunca o seu nome. ' +
          'Você vê os lances como "Laboratório 1, 2, 3" e só descobre o nome depois de escolher.'),
        linha('Lance só desce', 'Cada laboratório pode melhorar a própria proposta, com desconto ' +
          'mínimo de 1% ou R$ 20. Não dá para subir o preço depois.'),
        linha('Taxa entra na conta', 'Preço e taxa de coleta domiciliar são somados. Cortar preço ' +
          'e recolocar na taxa não conta como lance melhor.'),
        linha('Ranking', 'Preço pesa 60%, prazo 25%, garantias 15%. Sem isso o leilão premiaria ' +
          'quem corta serviço para baixar preço.'),
        linha('Você não é obrigado', 'O leilão termina quando você escolhe — ou simplesmente não escolhe.'),
      ),
    ),
  ));
}

function linha(rotulo: string, texto: string): HTMLElement {
  return h('tr', {},
    h('th', { style: 'width:160px;vertical-align:top' }, rotulo),
    h('td', {}, texto),
  );
}

function renderPedido(
  rfq: RfqPublico,
  ranking: ItemRanking[],
  recarregar: (id: string) => void,
): HTMLElement {
  const pedido = carregarPedido();
  const encerra = new Date(rfq.encerraEm);

  const adjudicar = async (lanceId: string) => {
    if (!pedido) return;
    try {
      const r = await api<{ laboratorio: { nome: string } | null }>('award', {
        method: 'POST',
        body: JSON.stringify({ rfqId: rfq.id, tokenDono: pedido.tokenDono, lanceId }),
      });
      alert(`Pedido adjudicado. Laboratório: ${r.laboratorio?.nome ?? 'não identificado'}.`);
      recarregar(rfq.id);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return h('div', {},
    h('div', { class: 'cartao' },
      h('h3', {}, `Pedido ${rfq.id}`),
      h('div', {},
        h('span', { class: 'etiqueta' }, rfq.status),
        h('span', { class: 'etiqueta neutra' }, `${rfq.totalLances} lance(s)`),
        h('span', { class: 'etiqueta neutra' }, `encerra ${encerra.toLocaleString('pt-BR')}`),
        rfq.melhorPrecoCentavos != null
          ? h('span', { class: 'etiqueta' }, `melhor: ${brl(rfq.melhorPrecoCentavos)}`)
          : null,
      ),
      h('div', { style: 'margin-top:12px' },
        h('button', { class: 'botao secundario', type: 'button', onClick: () => recarregar(rfq.id) },
          'Atualizar'),
      ),
    ),
    ranking.length === 0
      ? h('div', { class: 'aviso atencao' },
          'Nenhum lance ainda. Os laboratórios credenciados recebem os pedidos abertos e ' +
          'respondem dentro da janela.')
      : h('table', {},
          h('thead', {},
            h('tr', {},
              h('th', {}, '#'), h('th', {}, 'Proposta'), h('th', { class: 'num' }, 'Total'),
              h('th', { class: 'num' }, 'Prazo'), h('th', { class: 'num' }, 'Score'), h('th', {}, ''),
            ),
          ),
          h('tbody', {},
            ...ranking.map((r) =>
              h('tr', {},
                h('td', {}, String(r.posicao)),
                h('td', {},
                  h('b', {}, r.labNome ?? `Laboratório ${r.posicao}`),
                  h('div', { class: 'sub', style: 'margin:0;font-size:12.5px' },
                    r.justificativa.join(' · ')),
                ),
                h('td', { class: 'num' }, brl(r.precoTotalCentavos)),
                h('td', { class: 'num' }, `${r.lance.prazoDiasUteis} d.ú.`),
                h('td', { class: 'num' }, String(r.score)),
                h('td', {},
                  rfq.status === 'aberto' && pedido
                    ? h('button', {
                        class: 'botao', type: 'button',
                        onClick: () => void adjudicar(r.lance.id),
                      }, 'Escolher')
                    : null,
                ),
              ),
            ),
          ),
        ),
  );
}
