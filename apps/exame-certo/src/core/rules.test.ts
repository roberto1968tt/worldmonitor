import test from 'node:test';
import assert from 'node:assert/strict';
import type { Respostas } from '../types.ts';
import { avaliarExame, avaliarExames, avaliarLab, coberturaPorUf } from './rules.ts';
import { getExame } from './exams.ts';
import { getLab } from './labs.ts';

const base: Respostas = {
  objetivo: 'paternidade',
  momento: 'gestacao',
  semanasGestacao: 9,
  gestacaoUnica: true,
  finalidade: 'informativo',
  ufPartes: ['PR', 'SP'],
  precisaColetaDomiciliar: true,
  supostoPaiDisponivel: true,
  orcamentoMaximoCentavos: null,
};

const exame = (id: string) => {
  const e = getExame(id);
  assert.ok(e, `exame ${id} deveria existir`);
  return e!;
};

test('paternidade pre-natal nao invasiva libera com 9 semanas', () => {
  assert.equal(avaliarExame(exame('paternidade_prenatal_ni'), base).elegivel, true);
});

test('bloqueia exame antes da semana minima e diz quantas faltam', () => {
  const r = avaliarExame(exame('nipt'), { ...base, objetivo: 'saude_fetal', semanasGestacao: 9 });
  assert.equal(r.elegivel, false);
  const b = r.bloqueios.find((x) => x.codigo === 'cedo_demais');
  assert.ok(b);
  assert.match(b!.mensagem, /Faltam 1 semana/);
});

test('NIPT libera exatamente em 10 semanas', () => {
  const r = avaliarExame(exame('nipt'), { ...base, objetivo: 'saude_fetal', semanasGestacao: 10 });
  assert.equal(r.elegivel, true);
});

test('entre 7 e 9 semanas avisa do risco de fracao fetal baixa sem impedir', () => {
  const r = avaliarExame(exame('paternidade_prenatal_ni'), { ...base, semanasGestacao: 8 });
  assert.equal(r.elegivel, true);
  assert.ok(r.bloqueios.some((b) => b.codigo === 'fracao_fetal_baixa' && b.severidade === 'atencao'));
});

test('gestacao multipla impede exame em sangue materno', () => {
  const r = avaliarExame(exame('paternidade_prenatal_ni'), { ...base, gestacaoUnica: false });
  assert.equal(r.elegivel, false);
  assert.ok(r.bloqueios.some((b) => b.codigo === 'gestacao_multipla'));
});

test('NIPT nunca aceita finalidade juridica', () => {
  const r = avaliarExame(exame('nipt'), {
    ...base, objetivo: 'saude_fetal', semanasGestacao: 12, finalidade: 'judicial',
  });
  assert.ok(r.bloqueios.some((b) => b.codigo === 'sem_valor_juridico'));
});

test('sem suposto pai, so sobra o exame de vinculo familiar', () => {
  const r: Respostas = {
    ...base, momento: 'apos_nascimento', semanasGestacao: null, supostoPaiDisponivel: false,
  };
  const elegiveis = avaliarExames(r).filter((e) => e.elegivel).map((e) => e.exame.id);
  assert.ok(elegiveis.includes('vinculo_familiar'));
  assert.ok(!elegiveis.includes('paternidade_pos_natal'));
});

test('finalidade judicial derruba laboratorio sem cadeia de custodia', () => {
  const r = avaliarLab(getLab('vangenes')!, 'paternidade_prenatal_ni', { ...base, finalidade: 'judicial' });
  assert.equal(r.elegivel, false);
  assert.ok(r.bloqueios.some((b) => b.codigo === 'sem_cadeia_custodia'));
});

test('coleta domiciliar com finalidade juridica gera alerta de conflito', () => {
  const r = avaliarLab(getLab('genomic')!, 'paternidade_prenatal_ni', {
    ...base, finalidade: 'judicial', semanasGestacao: 12,
  });
  assert.ok(r.bloqueios.some((b) => b.codigo === 'domiciliar_x_juridico'));
});

test('partes em UFs diferentes derrubam laboratorio sem coleta multi-cidade', () => {
  const r = avaliarLab(getLab('clinimol')!, 'paternidade_prenatal_ni', base);
  assert.equal(r.elegivel, false);
  assert.ok(r.bloqueios.some((b) => b.codigo === 'multi_cidade' || b.codigo === 'cobertura'));
});

test('override de semana do laboratorio prevalece sobre a regra clinica', () => {
  const r = avaliarLab(getLab('genomic')!, 'paternidade_prenatal_ni', {
    ...base, precisaColetaDomiciliar: false, semanasGestacao: 9,
  });
  assert.ok(r.bloqueios.some((b) => b.codigo === 'semana_lab'));
});

test('cobertura conta laboratorios nacionais em toda UF', () => {
  const mapa = coberturaPorUf('paternidade_prenatal_ni');
  assert.ok(mapa.AC >= 2, 'nacionais devem cobrir o Acre');
  assert.ok(mapa.SP > mapa.AC, 'SP tem laboratorio local alem dos nacionais');
});
