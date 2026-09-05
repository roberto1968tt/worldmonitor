/** Helpers de render. Tudo passa por textContent: nada de innerHTML com dado externo. */

type Filho = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | boolean | ((e: Event) => void)> = {},
  ...filhos: Filho[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    } else if (k === 'class') {
      el.className = String(v);
    } else if (k === 'value' && (el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) {
      el.value = String(v);
    } else if (v === true) {
      el.setAttribute(k, '');
    } else {
      el.setAttribute(k, String(v));
    }
  }
  for (const f of filhos) {
    if (f === null || f === undefined || f === false) continue;
    el.append(typeof f === 'string' ? document.createTextNode(f) : f);
  }
  return el;
}

export function limpar(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function brl(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

export function faixaBrl(faixa: [number, number] | null): string {
  if (!faixa) return '—';
  return faixa[0] === faixa[1] ? brl(faixa[0]) : `${brl(faixa[0])} a ${brl(faixa[1])}`;
}

export function telHref(numero: string | null): string | null {
  return numero ? `tel:${numero.replace(/[^0-9+]/g, '')}` : null;
}

export function whatsHref(numero: string | null, texto?: string): string | null {
  if (!numero) return null;
  const limpo = numero.replace(/[^0-9]/g, '');
  const q = texto ? `?text=${encodeURIComponent(texto)}` : '';
  return `https://wa.me/${limpo}${q}`;
}

export function formatarTelefone(numero: string | null): string {
  if (!numero) return '—';
  const d = numero.replace(/[^0-9]/g, '').replace(/^55/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return numero;
}
