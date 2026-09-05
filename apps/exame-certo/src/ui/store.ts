import type { Lance, Rfq, UF } from '../types.ts';
import { DURACAO_PADRAO_HORAS } from '../core/auction.ts';
import { perfilJuridico } from '../core/juridico.ts';

/**
 * O leilao precisa de estado compartilhado. Onde ele mora depende de onde o
 * app esta rodando:
 *
 *  - StoreHttp   deploy proprio, com as rotas de api/ na frente do Redis.
 *                As regras do leilao sao validadas no servidor.
 *  - StoreDb     publicado como Artifact, sobre a capacidade `db`.
 *                Estado real e compartilhado entre quem abre a pagina, mas as
 *                regras rodam no cliente: serve para ver o mecanismo, nao para
 *                valer dinheiro.
 *  - StoreLocal  nenhuma das duas: memoria da aba, so para navegar.
 */
export interface NovoPedido {
  examId: string;
  finalidade: Rfq['finalidade'];
  ufPartes: UF[];
  semanasGestacao: number | null;
  precisaColetaDomiciliar: boolean;
  prazoDesejadoDiasUteis: number | null;
  observacoes: string;
}

export interface LeilaoStore {
  /** Como o estado esta guardado, para a pagina dizer a verdade ao usuario. */
  readonly modo: 'servidor' | 'compartilhado' | 'local';
  /** Se as regras do leilao sao validadas fora do navegador. */
  readonly validadoNoServidor: boolean;
  criar(pedido: NovoPedido): Promise<{ rfq: Rfq; tokenDono: string }>;
  ler(id: string): Promise<{ rfq: Rfq; lances: Lance[] } | null>;
  adicionarLance(lance: Lance): Promise<void>;
  adjudicar(id: string, tokenDono: string, lanceId: string): Promise<void>;
}

function novoId(prefixo: string): string {
  const aleatorio = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 20)
    : Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
  return `${prefixo}_${aleatorio}`;
}

export function montarRfq(pedido: NovoPedido): { rfq: Rfq; tokenDono: string } {
  const perfil = perfilJuridico(pedido.finalidade);
  const agora = new Date();
  const tokenDono = novoId('tok');
  return {
    tokenDono,
    rfq: {
      id: novoId('rfq'),
      examId: pedido.examId,
      finalidade: pedido.finalidade,
      ufPartes: pedido.ufPartes,
      semanasGestacao: pedido.semanasGestacao,
      // A combinacao impossivel e barrada aqui tambem, nao so na API.
      precisaColetaDomiciliar: perfil.exigeCadeiaCustodia ? false : pedido.precisaColetaDomiciliar,
      precisaCadeiaCustodia: perfil.exigeCadeiaCustodia,
      prazoDesejadoDiasUteis: pedido.prazoDesejadoDiasUteis,
      observacoes: pedido.observacoes,
      criadoEm: agora.toISOString(),
      encerraEm: new Date(agora.getTime() + DURACAO_PADRAO_HORAS * 3600_000).toISOString(),
      status: 'aberto',
      revelarMelhorPreco: true,
      lanceVencedorId: null,
      tokenDono,
    },
  };
}

/* ------------------------------------------------------------- servidor */

async function pedirApi<T>(caminho: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`/api/${caminho}`, {
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

export class StoreHttp implements LeilaoStore {
  readonly modo = 'servidor' as const;
  readonly validadoNoServidor = true;

  async criar(pedido: NovoPedido) {
    const r = await pedirApi<{ rfq: Rfq; tokenDono: string }>('rfq', {
      method: 'POST',
      body: JSON.stringify(pedido),
    });
    return { rfq: { ...r.rfq, tokenDono: r.tokenDono }, tokenDono: r.tokenDono };
  }

  async ler(id: string) {
    const r = await pedirApi<{ rfq: Rfq; ranking: { lance: Lance }[] }>(
      `rfq?id=${encodeURIComponent(id)}`,
    );
    return { rfq: r.rfq, lances: r.ranking.map((x) => x.lance) };
  }

  async adicionarLance(): Promise<void> {
    throw new Error('Lances vêm dos laboratórios autenticados, pela rota /api/bid.');
  }

  async adjudicar(id: string, tokenDono: string, lanceId: string) {
    await pedirApi('award', {
      method: 'POST',
      body: JSON.stringify({ rfqId: id, tokenDono, lanceId }),
    });
  }
}

/* -------------------------------------------------------------- artifact */

interface DocRef {
  get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
  set(dados: Record<string, unknown>): Promise<void>;
  update(dados: Record<string, unknown>): Promise<void>;
}
interface ColecaoRef {
  doc(id?: string): DocRef;
  get(): Promise<{ docs: { id: string; data(): Record<string, unknown> | undefined }[] }>;
}
interface Db {
  doc(caminho: string): DocRef;
  collection(caminho: string): ColecaoRef;
}

export class StoreDb implements LeilaoStore {
  readonly modo = 'compartilhado' as const;
  readonly validadoNoServidor = false;

  constructor(private readonly db: Db) {}

  async criar(pedido: NovoPedido) {
    const { rfq, tokenDono } = montarRfq(pedido);
    // O token do dono nunca vai para o documento compartilhado: fica só na aba.
    const { tokenDono: _oculto, ...publico } = rfq;
    await this.db.doc(`pedidos/${rfq.id}`).set({ ...publico, hashDono: hashSimples(tokenDono) });
    return { rfq, tokenDono };
  }

  async ler(id: string) {
    const doc = await this.db.doc(`pedidos/${id}`).get();
    if (!doc.exists) return null;
    const dados = doc.data() as unknown as Rfq & { hashDono: string };
    const lances = await this.db.collection(`pedidos/${id}/lances`).get();
    return {
      rfq: { ...dados, tokenDono: '' },
      lances: lances.docs.map((d) => d.data() as unknown as Lance),
    };
  }

  async adicionarLance(lance: Lance) {
    await this.db.doc(`pedidos/${lance.rfqId}/lances/${lance.id}`).set({ ...lance });
  }

  async adjudicar(id: string, tokenDono: string, lanceId: string) {
    const doc = await this.db.doc(`pedidos/${id}`).get();
    const dados = doc.data() as { hashDono?: string } | undefined;
    if (!dados || dados.hashDono !== hashSimples(tokenDono)) {
      throw new Error('Só quem abriu o pedido pode escolher o vencedor.');
    }
    await this.db.doc(`pedidos/${id}`).update({ status: 'adjudicado', lanceVencedorId: lanceId });
  }
}

/**
 * Não é segurança: o documento é legível por quem abre a página, então o hash
 * só evita que o token apareça em texto claro. Autorização de verdade fica no
 * StoreHttp, onde o servidor guarda o segredo.
 */
function hashSimples(valor: string): string {
  let h = 5381;
  for (let i = 0; i < valor.length; i++) h = ((h << 5) + h + valor.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/* ----------------------------------------------------------------- local */

export class StoreLocal implements LeilaoStore {
  readonly modo = 'local' as const;
  readonly validadoNoServidor = false;
  private pedidos = new Map<string, { rfq: Rfq; lances: Lance[] }>();

  async criar(pedido: NovoPedido) {
    const { rfq, tokenDono } = montarRfq(pedido);
    this.pedidos.set(rfq.id, { rfq, lances: [] });
    return { rfq, tokenDono };
  }

  async ler(id: string) {
    const p = this.pedidos.get(id);
    return p ? { rfq: { ...p.rfq }, lances: [...p.lances] } : null;
  }

  async adicionarLance(lance: Lance) {
    this.pedidos.get(lance.rfqId)?.lances.push(lance);
  }

  async adjudicar(id: string, tokenDono: string, lanceId: string) {
    const p = this.pedidos.get(id);
    if (!p) throw new Error('Pedido não encontrado.');
    if (p.rfq.tokenDono !== tokenDono) throw new Error('Só quem abriu o pedido pode escolher.');
    p.rfq.status = 'adjudicado';
    p.rfq.lanceVencedorId = lanceId;
  }
}

/* -------------------------------------------------------------- seleção */

interface JanelaClaude {
  claude?: { use?(nome: string): Promise<unknown> };
}

/**
 * Escolhe onde o leilão vive. A capacidade `db` chega por promessa e pode
 * demorar, então a página começa a funcionar com o store local e troca quando
 * (e se) a resposta vier.
 */
export async function escolherStore(temApiPropria: boolean): Promise<LeilaoStore> {
  if (temApiPropria) return new StoreHttp();

  const janela = globalThis as unknown as JanelaClaude;
  if (typeof janela.claude?.use === 'function') {
    try {
      const db = (await janela.claude.use('db')) as Db | null;
      if (db) return new StoreDb(db);
    } catch {
      /* segue para o store local */
    }
  }
  return new StoreLocal();
}
