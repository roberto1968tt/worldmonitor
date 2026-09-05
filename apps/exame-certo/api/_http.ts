/** Utilitarios HTTP compartilhados pelas rotas do leilao. */
import type { UF } from '../src/types.ts';
import { UFS } from '../src/core/regions.ts';

export interface Req {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

export interface Res {
  status(code: number): Res;
  json(body: unknown): void;
  setHeader(nome: string, valor: string): void;
  end(): void;
}

export function cors(res: Res): void {
  res.setHeader('Access-Control-Allow-Origin', process.env.EC_ALLOWED_ORIGIN ?? '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

export function erro(res: Res, status: number, mensagem: string, detalhes?: string[]): void {
  res.status(status).json({ erro: mensagem, detalhes: detalhes ?? [] });
}

export function corpo(req: Req): Record<string, unknown> {
  const b = req.body;
  if (!b) return {};
  if (typeof b === 'string') {
    try {
      return JSON.parse(b) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return b as Record<string, unknown>;
}

export function texto(v: unknown, max = 500): string {
  if (typeof v !== 'string') return '';
  // Tira caracteres de controle e corta. Na UI nada disso vira HTML sem escape.
  return v.replace(/\p{Cc}/gu, ' ').trim().slice(0, max);
}

export function inteiro(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && Number.isInteger(n) ? n : null;
}

export function booleano(v: unknown): boolean {
  return v === true || v === 'true' || v === 1 || v === '1';
}

export function ufsValidas(v: unknown): UF[] {
  if (!Array.isArray(v)) return [];
  const set = new Set<UF>();
  for (const item of v) {
    const s = String(item).toUpperCase().trim();
    if ((UFS as string[]).includes(s)) set.add(s as UF);
  }
  return [...set];
}

/**
 * Token do laboratorio. MVP: mapa labId -> token em variavel de ambiente.
 * Antes de abrir para laboratorios reais isso vira credencial por conta,
 * com rotacao e trilha de auditoria.
 */
export function labAutenticado(req: Req): string | null {
  const header = req.headers?.authorization;
  const raw = Array.isArray(header) ? header[0] : header;
  if (!raw) return null;
  const token = raw.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  let mapa: Record<string, string>;
  try {
    mapa = JSON.parse(process.env.EC_LAB_TOKENS ?? '{}') as Record<string, string>;
  } catch {
    return null;
  }
  for (const [labId, esperado] of Object.entries(mapa)) {
    if (esperado && comparacaoConstante(esperado, token)) return labId;
  }
  return null;
}

function comparacaoConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function novoId(prefixo: string): string {
  return `${prefixo}_${globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
}

export function novoToken(): string {
  return globalThis.crypto.randomUUID().replace(/-/g, '');
}
