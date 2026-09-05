import test from 'node:test';
import assert from 'node:assert/strict';
import type { Lance, Rfq } from '../types.ts';
import { decrementoExigido, precoTotal, ranquear, rfqPublico, validarLance } from './auction.ts';
import { getLab } from './labs.ts';

const agora = new Date('2026-09-05T12:00:00Z');

const rfq: Rfq = {
  id: 'rfq_1',
  examId: 'paternidade_prenatal_ni',
  finalidade: 'informativo',
  ufPartes: ['PR', 'SP'],
  semanasGestacao: 9,
  precisaColetaDomiciliar: true,
  precisaCadeiaCustodia: false,
  prazoDesejadoDiasUteis: 15,
  observacoes: '',
  criadoEm: agora.toISOString(),
  encerraEm: new Date('2026-09-08T12:00:00Z').toISOString(),
  status: 'aberto',
  revelarMelhorPreco: true,
  lanceVencedorId: null,
  tokenDono: 'segredo',
};

const lance = (over: Partial<Lance>): Lance => ({
  id: 'l1',
  rfqId: 'rfq_1',
  labId: 'vangenes',
  precoCentavos: 400000,
  taxaDomiciliarCentavos: 0,
  prazoDiasUteis: 15,
  inclui: ['kit', 'coleta'],
  recoletaSemCusto: false,
  emiteCadeiaCustodia: false,
  validoAte: new Date('2026-10-05T12:00:00Z').toISOString(),
  criadoEm: agora.toISOString(),
  retirado: false,
  ...over,
});

test('decremento minimo e o maior entre 1% e R$ 20', () => {
  assert.equal(decrementoExigido(100000), 2000);
  assert.equal(decrementoExigido(500000), 5000);
});

test('aceita o primeiro lance de um laboratorio elegivel', () => {
  const r = validarLance(rfq, getLab('vangenes'), lance({}), [], agora);
  assert.equal(r.ok, true, r.erros.join(' | '));
});

test('recusa lance de laboratorio sem cobertura nas UFs do pedido', () => {
  const r = validarLance(rfq, getLab('clinimol'), lance({ labId: 'clinimol' }), [], agora);
  assert.equal(r.ok, false);
  assert.ok(r.erros.some((e) => /cobertura|UFs diferentes|domiciliar/.test(e)));
});

test('leilao reverso: o proprio laboratorio so pode baixar o lance', () => {
  const anterior = lance({ id: 'l0', precoCentavos: 400000 });
  const subindo = validarLance(rfq, getLab('vangenes'), lance({ precoCentavos: 410000 }), [anterior], agora);
  assert.equal(subindo.ok, false);
  const igual = validarLance(rfq, getLab('vangenes'), lance({ precoCentavos: 400000 }), [anterior], agora);
  assert.equal(igual.ok, false);
  const baixando = validarLance(rfq, getLab('vangenes'), lance({ precoCentavos: 395000 }), [anterior], agora);
  assert.equal(baixando.ok, true, baixando.erros.join(' | '));
});

test('taxa domiciliar entra na comparacao de lances', () => {
  const anterior = lance({ id: 'l0', precoCentavos: 400000, taxaDomiciliarCentavos: 0 });
  // Baixa o preco mas embute o corte na taxa: total nao caiu o suficiente.
  const r = validarLance(
    rfq, getLab('vangenes'),
    lance({ precoCentavos: 396000, taxaDomiciliarCentavos: 4000 }),
    [anterior], agora,
  );
  assert.equal(r.ok, false);
});

test('recusa lance depois do encerramento', () => {
  const r = validarLance(rfq, getLab('vangenes'), lance({}), [], new Date('2026-09-09T12:00:00Z'));
  assert.equal(r.ok, false);
});

test('RFQ com cadeia de custodia exige garantia no lance', () => {
  const juridico = { ...rfq, precisaCadeiaCustodia: true, precisaColetaDomiciliar: false };
  const r = validarLance(juridico, getLab('genomic'), lance({ labId: 'genomic', emiteCadeiaCustodia: false }), [], agora);
  assert.equal(r.ok, false);
  assert.ok(r.erros.some((e) => /cadeia de cust/i.test(e)));
});

test('ranking premia preco, mas garantias desempatam', () => {
  const barato = lance({ id: 'a', labId: 'vangenes', precoCentavos: 380000, prazoDiasUteis: 20 });
  const garantido = lance({
    id: 'b', labId: 'genomic', precoCentavos: 385000, prazoDiasUteis: 12, recoletaSemCusto: true,
  });
  const caro = lance({ id: 'c', labId: 'pasteur_joacaba', precoCentavos: 520000, prazoDiasUteis: 20 });
  const r = ranquear([barato, garantido, caro], {
    vangenes: getLab('vangenes')!, genomic: getLab('genomic')!, pasteur_joacaba: getLab('pasteur_joacaba')!,
  }, rfq);
  assert.equal(r[0]!.lance.id, 'b', 'prazo menor + recoleta sem custo deve vencer diferenca pequena de preco');
  assert.equal(r[2]!.lance.id, 'c');
  assert.equal(r[0]!.posicao, 1);
});

test('preco total soma taxa domiciliar', () => {
  assert.equal(precoTotal(lance({ precoCentavos: 100000, taxaDomiciliarCentavos: 20000 })), 120000);
});

test('a visao publica do RFQ nunca expoe o token do dono', () => {
  const pub = rfqPublico(rfq, [lance({}), lance({ id: 'l2', precoCentavos: 390000 })]);
  assert.equal('tokenDono' in pub, false);
  assert.equal(pub.totalLances, 2);
  assert.equal(pub.melhorPrecoCentavos, 390000);
});

test('lances retirados nao contam no ranking nem no melhor preco', () => {
  const pub = rfqPublico(rfq, [lance({ id: 'l2', precoCentavos: 100000, retirado: true }), lance({})]);
  assert.equal(pub.totalLances, 1);
  assert.equal(pub.melhorPrecoCentavos, 400000);
});
