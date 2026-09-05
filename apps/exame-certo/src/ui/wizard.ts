import type { FinalidadeJuridica, Respostas, UF } from '../types.ts';
import { NOME_UF, UFS } from '../core/regions.ts';
import { PERFIS_JURIDICOS } from '../core/juridico.ts';
import { h, limpar } from './dom.ts';
import { RESPOSTAS_VAZIAS, salvar } from './estado.ts';

interface Opcao<T> {
  valor: T;
  rotulo: string;
  ajuda?: string;
}

function pergunta(titulo: string, ajuda: string, controle: Node): HTMLElement {
  return h('div', { class: 'pergunta' },
    h('label', {}, titulo),
    ajuda ? h('div', { class: 'ajuda' }, ajuda) : null,
    controle,
  );
}

function botoes<T extends string | boolean | number>(
  opcoes: Opcao<T>[],
  atual: T | null,
  aoEscolher: (v: T) => void,
): HTMLElement {
  return h('div', { class: 'opcoes' },
    ...opcoes.map((o) =>
      h('button', {
        class: 'opcao',
        type: 'button',
        'aria-pressed': String(atual === o.valor),
        onClick: () => aoEscolher(o.valor),
      }, o.rotulo, o.ajuda ? h('small', {}, o.ajuda) : null),
    ),
  );
}

export function renderWizard(
  raiz: HTMLElement,
  respostas: Respostas,
  aoConcluir: (r: Respostas) => void,
): void {
  const r: Respostas = { ...respostas };

  const redesenhar = () => {
    salvar(r);
    renderWizard(raiz, r, aoConcluir);
  };

  const set = <K extends keyof Respostas>(campo: K, valor: Respostas[K]) => {
    r[campo] = valor;
    redesenhar();
  };

  limpar(raiz);

  raiz.append(
    h('h1', {}, 'Que exame genético você precisa, e como fazer sem errar'),
    h('p', { class: 'sub' },
      'Responda o que der. A cada resposta o app corta o que não serve para o seu caso e ' +
      'monta o passo a passo. Nada aqui pede seu nome, CPF ou endereço.'),
  );

  raiz.append(pergunta(
    'O que você quer descobrir?',
    '',
    botoes<NonNullable<Respostas['objetivo']>>([
      { valor: 'paternidade', rotulo: 'Vínculo biológico', ajuda: 'Paternidade, parentesco' },
      { valor: 'saude_fetal', rotulo: 'Saúde do bebê', ajuda: 'Rastreio na gestação' },
      { valor: 'diagnostico', rotulo: 'Doença genética', ajuda: 'Painel, exoma' },
      { valor: 'ancestralidade', rotulo: 'Ancestralidade', ajuda: 'Origem familiar' },
    ], r.objetivo, (v) => set('objetivo', v)),
  ));

  if (r.objetivo === 'paternidade' || r.objetivo === 'saude_fetal') {
    raiz.append(pergunta(
      'A gestação está em curso?',
      'Depois do nascimento o exame de vínculo é muito mais barato, rápido e difícil de contestar.',
      botoes<NonNullable<Respostas['momento']>>([
        { valor: 'gestacao', rotulo: 'Sim, grávida agora' },
        { valor: 'apos_nascimento', rotulo: 'Não, o bebê já nasceu' },
      ], r.momento, (v) => set('momento', v)),
    ));
  }

  if (r.momento === 'gestacao') {
    raiz.append(pergunta(
      'Quantas semanas completas de gestação?',
      'É o dado que mais elimina opção. Se não souber, deixe em branco: um ultrassom de datação resolve.',
      h('div', { class: 'opcoes' },
        h('input', {
          type: 'number', min: '1', max: '42', inputmode: 'numeric',
          value: r.semanasGestacao == null ? '' : String(r.semanasGestacao),
          placeholder: 'ex.: 9',
          onChange: (e: Event) => {
            const v = (e.target as HTMLInputElement).value;
            const n = v === '' ? null : Number(v);
            set('semanasGestacao', n != null && Number.isFinite(n) ? Math.round(n) : null);
          },
        }),
        h('span', { class: 'ajuda' }, 'semanas'),
      ),
    ));

    raiz.append(pergunta(
      'É gestação única?',
      'Exames em sangue materno não separam o DNA de cada feto em gestação múltipla.',
      botoes<boolean>([
        { valor: true, rotulo: 'Sim, um bebê' },
        { valor: false, rotulo: 'Gêmeos ou mais' },
      ], r.gestacaoUnica, (v) => set('gestacaoUnica', v)),
    ));
  }

  if (r.objetivo === 'paternidade') {
    raiz.append(pergunta(
      'O suposto pai vai colher a amostra?',
      'Se ele não está disponível ou se recusa, o caminho muda para exame de vínculo familiar.',
      botoes<boolean>([
        { valor: true, rotulo: 'Sim, ele participa' },
        { valor: false, rotulo: 'Não, indisponível ou recusa' },
      ], r.supostoPaiDisponivel, (v) => set('supostoPaiDisponivel', v)),
    ));
  }

  raiz.append(pergunta(
    'O laudo vai ter uso jurídico?',
    'Essa é a escolha mais cara de errar: laudo informativo não vira jurídico depois. Refaz do zero.',
    botoes<FinalidadeJuridica>(
      (Object.values(PERFIS_JURIDICOS)).map((p) => ({
        valor: p.id, rotulo: p.nome, ajuda: p.ondeUsa[0],
      })),
      r.finalidade,
      (v) => {
        r.finalidade = v;
        if (PERFIS_JURIDICOS[v].exigeCadeiaCustodia) r.precisaColetaDomiciliar = false;
        redesenhar();
      },
    ),
  ));

  if (r.finalidade) {
    const perfil = PERFIS_JURIDICOS[r.finalidade];
    raiz.append(h('div', { class: 'cartao' },
      h('h3', {}, perfil.nome),
      h('p', { class: 'sub', style: 'margin-bottom:10px' }, perfil.resumo),
      ...perfil.avisos.map((a) => h('div', { class: 'aviso atencao' }, a)),
    ));
  }

  const podeDomiciliar = !r.finalidade || !PERFIS_JURIDICOS[r.finalidade].exigeCadeiaCustodia;
  raiz.append(pergunta(
    'Precisa de coleta em casa?',
    podeDomiciliar
      ? 'Vale muito quando alguém tem medo de agulha, mobilidade reduzida ou não quer expor o endereço.'
      : 'Indisponível nesta finalidade: a cadeia de custódia exige coleta presencial em unidade credenciada.',
    podeDomiciliar
      ? botoes<boolean>([
          { valor: true, rotulo: 'Sim, coleta domiciliar' },
          { valor: false, rotulo: 'Não, posso ir à unidade' },
        ], r.precisaColetaDomiciliar, (v) => set('precisaColetaDomiciliar', v))
      : h('div', { class: 'aviso impeditivo' },
          'Coleta domiciliar descaracteriza a cadeia de custódia. Se o laudo vai a cartório ou ' +
          'processo, a coleta tem de ser presencial.'),
  ));

  raiz.append(pergunta(
    'Em quais estados as pessoas vão colher?',
    'Marque um por pessoa. Partes em UFs diferentes é o requisito que mais elimina laboratório — ' +
    'e o app já filtra por isso.',
    h('div', { class: 'opcoes' },
      h('select', {
        onChange: (e: Event) => {
          const sel = e.target as HTMLSelectElement;
          const uf = sel.value as UF;
          if (uf && !r.ufPartes.includes(uf)) {
            r.ufPartes = [...r.ufPartes, uf].slice(0, 5);
            redesenhar();
          }
        },
      },
        h('option', { value: '' }, 'Adicionar estado...'),
        ...UFS.map((uf) => h('option', { value: uf }, `${uf} — ${NOME_UF[uf]}`)),
      ),
      ...r.ufPartes.map((uf) =>
        h('button', {
          class: 'opcao', type: 'button', 'aria-pressed': 'true',
          title: 'Remover',
          onClick: () => {
            r.ufPartes = r.ufPartes.filter((x) => x !== uf);
            redesenhar();
          },
        }, `${uf} ✕`),
      ),
    ),
  ));

  const completo = r.objetivo != null && r.finalidade != null && r.ufPartes.length > 0;

  raiz.append(h('div', { class: 'opcoes', style: 'margin-top:8px' },
    h('button', {
      class: 'botao', type: 'button', disabled: !completo,
      onClick: () => { salvar(r); aoConcluir(r); },
    }, 'Ver o meu caminho'),
    h('button', {
      class: 'botao secundario', type: 'button',
      onClick: () => { Object.assign(r, RESPOSTAS_VAZIAS, { ufPartes: [] }); redesenhar(); },
    }, 'Recomeçar'),
  ));

  if (!completo) {
    raiz.append(h('p', { class: 'sub', style: 'margin-top:10px' },
      'Faltam: ' + [
        r.objetivo ? null : 'o que você quer descobrir',
        r.finalidade ? null : 'a finalidade do laudo',
        r.ufPartes.length ? null : 'ao menos um estado de coleta',
      ].filter(Boolean).join(', ') + '.'));
  }
}
