/**
 * Persistencia do leilao. Upstash Redis em producao; memoria em dev/teste.
 *
 * O fallback em memoria nao e "modo degradado aceitavel em producao": sem
 * Redis os lances somem a cada cold start. Por isso ehPersistente() existe e
 * as rotas de escrita recusam quando nao ha store real e o ambiente e producao.
 */
import type { Lance, Rfq } from '../src/types.ts';

/** Interface minima que usamos do cliente Redis. Evita depender do tipo do pacote. */
interface ClienteRedis {
  get<T>(chave: string): Promise<T | null>;
  set(chave: string, valor: unknown, opcoes: { ex: number }): Promise<unknown>;
}

const TTL_SEGUNDOS = 60 * 60 * 24 * 30; // 30 dias

let redis: ClienteRedis | null = null;
let redisPromessa: Promise<ClienteRedis | null> | null = null;

/**
 * Ha store real configurada? Checagem sincrona, so pelas variaveis de ambiente,
 * para as rotas decidirem antes de qualquer I/O.
 */
export function ehPersistente(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/**
 * O pacote do Redis so e carregado quando ha credencial. Assim o app roda em
 * dev e em teste sem a dependencia instalada, e o cold start em producao nao
 * paga o import quando o leilao nao e usado.
 */
async function getRedis(): Promise<ClienteRedis | null> {
  if (redis) return redis;
  if (!ehPersistente()) return null;
  if (!redisPromessa) {
    redisPromessa = (async () => {
      try {
        const { Redis } = await import('@upstash/redis');
        return new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL!,
          token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        }) as unknown as ClienteRedis;
      } catch (e) {
        console.warn('[exame-certo] Redis indisponível:', (e as Error).message);
        return null;
      }
    })();
  }
  redis = await redisPromessa;
  return redis;
}

const memoria = new Map<string, unknown>();

async function get<T>(chave: string): Promise<T | null> {
  const r = await getRedis();
  if (!r) return (memoria.get(chave) as T) ?? null;
  try {
    return (await r.get<T>(chave)) ?? null;
  } catch (e) {
    console.warn('[exame-certo] leitura falhou:', (e as Error).message);
    return null;
  }
}

async function set(chave: string, valor: unknown): Promise<void> {
  const r = await getRedis();
  if (!r) {
    memoria.set(chave, valor);
    return;
  }
  await r.set(chave, valor, { ex: TTL_SEGUNDOS });
}

const chaveRfq = (id: string) => `ec:rfq:${id}`;
const chaveLances = (rfqId: string) => `ec:lances:${rfqId}`;
const CHAVE_INDICE = 'ec:rfqs';

export async function salvarRfq(rfq: Rfq): Promise<void> {
  await set(chaveRfq(rfq.id), rfq);
  const indice = (await get<string[]>(CHAVE_INDICE)) ?? [];
  if (!indice.includes(rfq.id)) {
    indice.unshift(rfq.id);
    await set(CHAVE_INDICE, indice.slice(0, 500));
  }
}

export async function lerRfq(id: string): Promise<Rfq | null> {
  return get<Rfq>(chaveRfq(id));
}

export async function listarRfqs(limite = 50): Promise<Rfq[]> {
  const indice = (await get<string[]>(CHAVE_INDICE)) ?? [];
  const rfqs = await Promise.all(indice.slice(0, limite).map((id) => lerRfq(id)));
  return rfqs.filter((r): r is Rfq => r !== null);
}

export async function lerLances(rfqId: string): Promise<Lance[]> {
  return (await get<Lance[]>(chaveLances(rfqId))) ?? [];
}

export async function adicionarLance(lance: Lance): Promise<void> {
  const atuais = await lerLances(lance.rfqId);
  atuais.push(lance);
  await set(chaveLances(lance.rfqId), atuais);
}

/** Usado somente pelos testes. */
export function limparMemoria(): void {
  memoria.clear();
}
