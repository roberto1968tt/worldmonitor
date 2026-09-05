import type { Bloqueio, ExameElegivel, LabElegivel, Respostas, UF } from '../types.ts';
import { avaliarExames, avaliarLabs, coberturaPorUf } from '../core/rules.ts';
import { montarRoteiro } from '../core/steps.ts';
import { PERFIS_JURIDICOS } from '../core/juridico.ts';
import { NOME_UF, UFS, partesEmUfsDiferentes } from '../core/regions.ts';
import { brl, faixaBrl, formatarTelefone, h, limpar, telHref, whatsHref } from './dom.ts';

function avisos(bs: Bloqueio[]): Node[] {
  return bs.map((b) =>
    h('div', { class: `aviso ${b.severidade}` },
      b.mensagem,
      b.saida ? h('span', { class: 'saida' }, `→ ${b.saida}`) : null,
    ),
  );
}

function cartaoExame(e: ExameElegivel, aoEscolher: (id: string) => void): HTMLElement {
  return h('div', { class: `cartao ${e.elegivel ? 'ok' : 'bloqueado'}` },
    h('div', { class: 'linha-lab' },
      h('div', {},
        h('h3', {}, e.exame.nome),
        h('div', {},
          h('span', { class: 'etiqueta' }, e.elegivel ? 'Disponível para você' : 'Não disponível'),
          e.exame.semanaMinima != null
            ? h('span', { class: 'etiqueta neutra' }, `a partir de ${e.exame.semanaMinima} semanas`)
            : null,
          e.exame.invasivo ? h('span', { class: 'etiqueta neutra' }, 'invasivo') : null,
          e.exame.aceitaValorJuridico
            ? h('span', { class: 'etiqueta neutra' }, 'aceita valor jurídico')
            : h('span', { class: 'etiqueta neutra' }, 'sem valor jurídico'),
        ),
      ),
      e.elegivel
        ? h('button', { class: 'botao', type: 'button', onClick: () => aoEscolher(e.exame.id) },
            'Escolher')
        : null,
    ),
    h('p', { class: 'sub', style: 'margin:10px 0 6px' }, e.exame.resumo),
    h('p', { class: 'sub', style: 'margin:0 0 8px' },
      `Referência de preço: ${faixaBrl(e.exame.faixaPrecoCentavos)} · ` +
      `Prazo: ${e.exame.prazoDiasUteis[0]} a ${e.exame.prazoDiasUteis[1]} dias úteis`),
    ...avisos(e.bloqueios),
  );
}

function cartaoLab(l: LabElegivel): HTMLElement {
  const zap = whatsHref(l.lab.whatsapp,
    'Olá! Vim pelo ExameCerto e queria um orçamento fechado, com coleta e kit inclusos.');
  return h('div', { class: `cartao ${l.elegivel ? 'ok' : 'bloqueado'}` },
    h('div', { class: 'linha-lab' },
      h('div', {},
        h('h3', {}, l.lab.nome),
        h('div', { class: 'sub' }, `${l.lab.sede}/${l.lab.ufSede} · ` +
          (l.lab.ufsAtendidas === '*' ? 'cobertura nacional' : `atende ${l.lab.ufsAtendidas.join(', ')}`)),
      ),
      h('div', {},
        l.lab.precoPublicadoCentavos != null
          ? h('span', { class: 'etiqueta' }, brl(l.lab.precoPublicadoCentavos))
          : h('span', { class: 'etiqueta neutra' }, 'preço sob consulta'),
      ),
    ),
    h('div', { style: 'margin:8px 0' },
      l.lab.coletaDomiciliar ? h('span', { class: 'etiqueta neutra' }, 'coleta domiciliar') : null,
      l.lab.coletaMultiCidade ? h('span', { class: 'etiqueta neutra' }, 'coleta em UFs diferentes') : null,
      l.lab.cadeiaCustodia ? h('span', { class: 'etiqueta neutra' }, 'cadeia de custódia') : null,
      l.lab.prazoDiasUteis
        ? h('span', { class: 'etiqueta neutra' },
            `${l.lab.prazoDiasUteis[0]}–${l.lab.prazoDiasUteis[1]} dias úteis`)
        : null,
    ),
    h('p', { class: 'sub', style: 'margin:0 0 8px' }, l.lab.observacoes),
    h('div', { class: 'contatos' },
      l.lab.telefone ? h('a', { href: telHref(l.lab.telefone) ?? '#' },
        `☎ ${formatarTelefone(l.lab.telefone)}`) : null,
      zap ? h('a', { href: zap, target: '_blank', rel: 'noopener noreferrer' },
        `WhatsApp ${formatarTelefone(l.lab.whatsapp)}`) : null,
      l.lab.email ? h('a', { href: `mailto:${l.lab.email}` }, l.lab.email) : null,
      l.lab.site ? h('a', { href: l.lab.site, target: '_blank', rel: 'noopener noreferrer' }, 'Site') : null,
    ),
    ...avisos(l.bloqueios),
    h('p', { class: 'sub', style: 'margin:10px 0 0;font-size:12px' },
      `Dados conferidos na fonte oficial em ${l.lab.verificadoEm}. Preço e disponibilidade mudam: ` +
      'confirme no contato.'),
  );
}

function mapaCobertura(examId: string, ufsDoUsuario: UF[]): HTMLElement {
  const mapa = coberturaPorUf(examId);
  const max = Math.max(1, ...Object.values(mapa));
  return h('div', { class: 'mapa-uf' },
    ...UFS.map((uf) => {
      const n = mapa[uf] ?? 0;
      const classes = ['uf'];
      if (n === 0) classes.push('zero');
      if (ufsDoUsuario.includes(uf) || n >= max) classes.push('forte');
      return h('div', { class: classes.join(' '), title: `${NOME_UF[uf]}: ${n} laboratório(s)` },
        h('b', {}, uf), String(n));
    }),
  );
}

export function renderResultado(
  raiz: HTMLElement,
  respostas: Respostas,
  examIdEscolhido: string | null,
  aoEscolherExame: (id: string) => void,
  aoIrParaLeilao: (examId: string) => void,
): void {
  limpar(raiz);

  // Exame descartado so por nao ser o que a pessoa procura vira ruido: some da lista.
  const exames = avaliarExames(respostas).filter(
    (e) => !e.bloqueios.some((b) => b.codigo === 'objetivo'),
  );
  const elegiveis = exames.filter((e) => e.elegivel);
  const examId = examIdEscolhido ?? elegiveis[0]?.exame.id ?? null;

  raiz.append(
    h('h1', {}, 'O seu caminho'),
    h('p', { class: 'sub' },
      `Finalidade: ${respostas.finalidade ? PERFIS_JURIDICOS[respostas.finalidade].nome : '—'} · ` +
      `Coleta em: ${respostas.ufPartes.join(', ') || '—'}` +
      (respostas.semanasGestacao != null ? ` · ${respostas.semanasGestacao} semanas` : '')),
  );

  if (partesEmUfsDiferentes(respostas.ufPartes)) {
    raiz.append(h('div', { class: 'aviso atencao' },
      'As partes estão em UFs diferentes. Poucos laboratórios colhem em cidades diferentes no ' +
      'mesmo protocolo — os que não fazem já foram marcados abaixo.'));
  }

  raiz.append(h('h2', {}, 'Exames'));
  if (elegiveis.length === 0) {
    raiz.append(h('div', { class: 'aviso impeditivo' },
      'Nenhum exame está liberado com essas respostas. Veja os motivos em cada cartão abaixo.'));
  }
  for (const e of exames) raiz.append(cartaoExame(e, aoEscolherExame));

  if (!examId) return;

  const exameSel = exames.find((e) => e.exame.id === examId);
  if (!exameSel) return;

  raiz.append(h('h2', {}, `Passo a passo — ${exameSel.exame.nome}`));
  raiz.append(h('ol', { class: 'passos' },
    ...montarRoteiro(exameSel.exame, respostas).map((p) =>
      h('li', {},
        h('h3', {}, p.titulo),
        h('div', { class: 'sub', style: 'margin:0' }, p.descricao),
        p.requisitos.length
          ? h('div', { class: 'req' }, `Leve: ${p.requisitos.join(' · ')}`)
          : null,
      ),
    ),
  ));

  raiz.append(h('h2', {}, 'Presença regional'));
  raiz.append(h('p', { class: 'sub' },
    'Quantos laboratórios do catálogo conseguem coletar em cada estado para este exame. ' +
    'Um número baixo significa depender de kit enviado pelo correio — o que muda prazo e, ' +
    'em modalidade jurídica, pode inviabilizar o laudo.'));
  raiz.append(mapaCobertura(examId, respostas.ufPartes));

  raiz.append(h('h2', {}, 'Laboratórios para o seu caso'));
  const todos = avaliarLabs(examId, respostas);
  // Quem nem oferece o exame nao merece um cartao; vira uma linha de rodape.
  const labs = todos.filter((l) => !l.bloqueios.some((b) => b.codigo === 'nao_oferece'));
  const ocultos = todos.length - labs.length;
  const aptos = labs.filter((l) => l.elegivel);
  raiz.append(h('p', { class: 'sub' },
    (aptos.length === 0
      ? 'Nenhum laboratório do catálogo atende a todos os seus requisitos. Abra o leilão mesmo assim: ' +
        'quem tiver condição de atender vai dar lance.'
      : `${aptos.length} de ${labs.length} atendem a todos os seus requisitos.`) +
    (ocultos > 0 ? ` Outros ${ocultos} do catálogo não oferecem este exame e ficaram de fora.` : '')));
  for (const l of labs) raiz.append(cartaoLab(l));

  raiz.append(h('h2', {}, 'Não pague o primeiro preço'));
  raiz.append(h('div', { class: 'cartao' },
    h('p', { class: 'sub', style: 'margin-top:0' },
      'Preço de tabela em exame genético é ficção: quase nenhum laboratório publica valor. ' +
      'No leilão reverso você publica os requisitos sem se identificar e eles disputam para baixo.'),
    h('button', { class: 'botao', type: 'button', onClick: () => aoIrParaLeilao(examId) },
      'Abrir leilão de orçamentos'),
  ));
}
