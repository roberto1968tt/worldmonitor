import { CAMINHOS_GRATUITOS, REGRAS_CUSTEIO } from '../core/fundraising.ts';
import { h, limpar } from './dom.ts';

export function renderApoio(raiz: HTMLElement): void {
  limpar(raiz);

  raiz.append(
    h('h1', {}, 'Quem não tem como pagar'),
    h('p', { class: 'sub' },
      'Um exame de R$ 4.000 decide quem tem direito a saber e quem não tem. Essa é a parte do ' +
      'projeto que existe para corrigir isso — e ela começa pelo que já é gratuito.'),
  );

  raiz.append(h('h2', {}, 'Antes de qualquer vaquinha: o que você talvez já tenha direito'));
  raiz.append(h('p', { class: 'sub' },
    'Muita campanha de arrecadação existe para pagar algo que o Estado ou o plano já deveriam cobrir. ' +
    'Percorra esta lista primeiro.'));

  for (const c of CAMINHOS_GRATUITOS) {
    raiz.append(h('div', { class: 'cartao ok' },
      h('h3', {}, c.titulo),
      h('div', {}, h('span', { class: 'etiqueta neutra' }, c.quando)),
      h('p', { class: 'sub', style: 'margin:8px 0 4px' }, c.descricao),
      h('div', { class: 'sub', style: 'margin:0;font-size:13px' }, `Onde procurar: ${c.contato}`),
    ));
  }

  raiz.append(h('h2', {}, 'Rede de custeio — fase 2'));
  raiz.append(h('div', { class: 'fase2' },
    h('div', {}, h('span', { class: 'etiqueta' }, 'ainda não está no ar')),
    h('p', { class: 'sub', style: 'margin:12px 0' },
      'A rede de custeio só entra depois que o leilão estiver rodando com laboratórios reais. ' +
      'O motivo é simples: sem preço fechado por lance vencedor, uma campanha vira chute — e ' +
      'campanha com meta inflada destrói a confiança da rede inteira no primeiro mês. ' +
      'As regras abaixo já estão implementadas no código do modelo, não são promessa de marketing.'),
    h('table', {},
      h('tbody', {},
        regra('Meta = lance vencedor',
          'A campanha nasce colada a um pedido já adjudicado. Sem margem, sem taxa embutida.',
          REGRAS_CUSTEIO.metaIgualAoLanceVencedor),
        regra('Dinheiro nunca passa pela pessoa',
          'Vai da conta de custódia direto ao laboratório, contra nota fiscal do exame.',
          REGRAS_CUSTEIO.repasseDiretoAoLaboratorio),
        regra('Não atingiu a meta, devolve',
          'Devolução integral ao doador no fim do prazo.',
          REGRAS_CUSTEIO.devolucaoIntegralSeNaoFinanciar),
        regra('Plataforma não retém taxa',
          `Taxa de ${REGRAS_CUSTEIO.taxaPlataformaPercentual}% sobre a doação nesta fase.`,
          true),
        regra('Campanha anônima por padrão',
          'Sem nome, sem foto, sem dado de saúde identificável na vitrine pública.',
          REGRAS_CUSTEIO.campanhaAnonimaPorPadrao),
        regra('Verificação socioeconômica',
          'CadÚnico, Defensoria, serviço social hospitalar ou ONG parceira. Declaração simples ' +
          'sozinha não basta.',
          true),
        regra('Vaga solidária do laboratório',
          'O laboratório pode doar parte do valor, o que abate a meta antes de qualquer doação ' +
          'de terceiros.',
          true),
      ),
    ),
  ));

  raiz.append(h('h2', {}, 'O que falta para ligar essa parte'));
  raiz.append(h('div', { class: 'cartao' },
    h('ol', { style: 'margin:0;padding-left:20px' },
      h('li', {}, 'Laboratórios credenciados de verdade, com documentação de acreditação conferida.'),
      h('li', {}, 'Conta de custódia e integração de pagamento com repasse direto ao laboratório.'),
      h('li', {}, 'Convênio com ao menos um parceiro de verificação socioeconômica.'),
      h('li', {}, 'Parecer jurídico sobre captação de recursos de terceiros e sobre tratamento de ' +
        'dado sensível na LGPD.'),
    ),
  ));
}

function regra(titulo: string, texto: string, ativo: boolean): HTMLElement {
  return h('tr', {},
    h('th', { style: 'width:220px;vertical-align:top' },
      titulo,
      h('div', {}, h('span', { class: 'etiqueta neutra' }, ativo ? 'no modelo' : 'em aberto')),
    ),
    h('td', {}, texto),
  );
}
