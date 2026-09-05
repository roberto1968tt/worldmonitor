import './styles.css';
import type { Respostas } from './types.ts';
import { carregar, limparEstado, salvar } from './ui/estado.ts';
import { renderWizard } from './ui/wizard.ts';
import { renderResultado } from './ui/resultado.ts';
import { renderLeilao } from './ui/leilao.ts';
import { renderApoio } from './ui/apoio.ts';
import { h, limpar } from './ui/dom.ts';

type Rota = '#/' | '#/resultado' | '#/leilao' | '#/apoio';

const ROTAS: { hash: Rota; rotulo: string }[] = [
  { hash: '#/', rotulo: 'Passo a passo' },
  { hash: '#/resultado', rotulo: 'Meu caminho' },
  { hash: '#/leilao', rotulo: 'Leilão' },
  { hash: '#/apoio', rotulo: 'Quem não pode pagar' },
];

let respostas: Respostas = carregar();
let examIdEscolhido: string | null = null;

function montarCasca(): { nav: HTMLElement; main: HTMLElement } {
  const app = document.getElementById('app')!;
  limpar(app);

  const nav = h('nav', {});
  const main = h('main', {});

  app.append(
    h('header', { class: 'topo' },
      h('div', { class: 'topo-interno' },
        h('div', { class: 'marca' }, 'Exame', h('span', {}, 'Certo')),
        nav,
      ),
    ),
    main,
  );
  return { nav, main };
}

const { nav, main } = montarCasca();

function pintarNav(atual: string): void {
  limpar(nav);
  for (const r of ROTAS) {
    nav.append(h('a', {
      href: r.hash,
      class: atual === r.hash ? 'ativo' : '',
    }, r.rotulo));
  }
}

function rodape(): HTMLElement {
  return h('div', { class: 'rodape' },
    h('p', {},
      'O ExameCerto organiza informação pública e coloca laboratórios para disputar preço. ' +
      'Não é serviço médico, não emite laudo e não substitui médico, advogado ou Defensoria. ' +
      'Preços, prazos e regras de cada laboratório mudam — confirme sempre na fonte antes de pagar.'),
    h('p', {},
      'Privacidade: nenhum dado que identifique você entra na plataforma. O passo a passo fica ' +
      'só no seu navegador, na sessão atual, e some quando você fecha a aba. O pedido de ' +
      'orçamento é anônimo. ',
      h('a', {
        href: '#/', onClick: (e: Event) => {
          e.preventDefault();
          limparEstado();
          respostas = carregar();
          examIdEscolhido = null;
          location.hash = '#/';
          rotear();
        },
      }, 'Apagar tudo agora'),
    ),
  );
}

function rotear(): void {
  const hash = (location.hash || '#/') as Rota;
  pintarNav(hash);
  limpar(main);
  const conteudo = h('div', {});
  main.append(conteudo);

  switch (hash) {
    case '#/resultado':
      renderResultado(
        conteudo, respostas, examIdEscolhido,
        (id) => { examIdEscolhido = id; rotear(); },
        (id) => { examIdEscolhido = id; location.hash = '#/leilao'; },
      );
      break;
    case '#/leilao':
      renderLeilao(conteudo, respostas, examIdEscolhido);
      break;
    case '#/apoio':
      renderApoio(conteudo);
      break;
    default:
      renderWizard(conteudo, respostas, (r) => {
        respostas = r;
        salvar(r);
        examIdEscolhido = null;
        location.hash = '#/resultado';
      });
  }

  main.append(rodape());
  window.scrollTo({ top: 0 });
}

window.addEventListener('hashchange', rotear);
rotear();
