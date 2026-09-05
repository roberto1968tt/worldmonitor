import type { Regiao, UF } from '../types.ts';

export const UFS: UF[] = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN',
  'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
];

export const NOME_UF: Record<UF, string> = {
  AC: 'Acre', AL: 'Alagoas', AM: 'Amazonas', AP: 'Amapá', BA: 'Bahia',
  CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás',
  MA: 'Maranhão', MG: 'Minas Gerais', MS: 'Mato Grosso do Sul',
  MT: 'Mato Grosso', PA: 'Pará', PB: 'Paraíba', PE: 'Pernambuco',
  PI: 'Piauí', PR: 'Paraná', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RO: 'Rondônia', RR: 'Roraima', RS: 'Rio Grande do Sul', SC: 'Santa Catarina',
  SE: 'Sergipe', SP: 'São Paulo', TO: 'Tocantins',
};

export const REGIAO_DA_UF: Record<UF, Regiao> = {
  AC: 'Norte', AM: 'Norte', AP: 'Norte', PA: 'Norte', RO: 'Norte',
  RR: 'Norte', TO: 'Norte',
  AL: 'Nordeste', BA: 'Nordeste', CE: 'Nordeste', MA: 'Nordeste',
  PB: 'Nordeste', PE: 'Nordeste', PI: 'Nordeste', RN: 'Nordeste',
  SE: 'Nordeste',
  DF: 'Centro-Oeste', GO: 'Centro-Oeste', MS: 'Centro-Oeste', MT: 'Centro-Oeste',
  ES: 'Sudeste', MG: 'Sudeste', RJ: 'Sudeste', SP: 'Sudeste',
  PR: 'Sul', RS: 'Sul', SC: 'Sul',
};

/**
 * Vazio genetico: UFs sem nenhum laboratorio proprio de genetica no catalogo.
 * Nessas regioes a unica saida costuma ser kit enviado pelo correio ou
 * laboratorio de apoio, o que tem impacto direto em prazo e valor juridico.
 */
export function regioesEnvolvidas(ufs: UF[]): Regiao[] {
  const set = new Set<Regiao>();
  for (const uf of ufs) set.add(REGIAO_DA_UF[uf]);
  return [...set];
}

export function partesEmUfsDiferentes(ufs: UF[]): boolean {
  return new Set(ufs).size > 1;
}
