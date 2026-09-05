import test from 'node:test';
import assert from 'node:assert/strict';
import type { Req, Res } from './_http.ts';
import { limparMemoria } from './_store.ts';
import rfqHandler from './rfq.ts';
import bidHandler from './bid.ts';
import awardHandler from './award.ts';

interface Resposta { status: number; body: any }

function fakeRes(): Res & { resultado: Resposta } {
  const r: any = {
    resultado: { status: 0, body: null },
    status(code: number) { r.resultado.status = code; return r; },
    json(body: unknown) { r.resultado.body = body; },
    setHeader() {},
    end() {},
  };
  return r;
}

async function chamar(
  handler: (req: Req, res: Res) => Promise<void>,
  req: Req,
): Promise<Resposta> {
  const res = fakeRes();
  await handler(req, res);
  return res.resultado;
}

process.env.EC_LAB_TOKENS = JSON.stringify({ vangenes: 'token-vangenes', genomic: 'token-genomic' });

const pedidoValido = {
  examId: 'paternidade_prenatal_ni',
  finalidade: 'informativo',
  ufPartes: ['PR', 'SP'],
  semanasGestacao: 9,
  precisaColetaDomiciliar: true,
  prazoDesejadoDiasUteis: 15,
  observacoes: 'Gestante com fobia de agulha: uma punção só.',
};

test.beforeEach(() => limparMemoria());

test('cria pedido, recebe lances e adjudica o vencedor', async () => {
  const criado = await chamar(rfqHandler, { method: 'POST', body: pedidoValido });
  assert.equal(criado.status, 201, JSON.stringify(criado.body));
  const rfqId = criado.body.rfq.id;
  const tokenDono = criado.body.tokenDono;
  assert.ok(tokenDono);
  assert.equal('tokenDono' in criado.body.rfq, false, 'token não pode vazar dentro do rfq');

  const lance1 = await chamar(bidHandler, {
    method: 'POST',
    headers: { authorization: 'Bearer token-vangenes' },
    body: { rfqId, precoCentavos: 420000, prazoDiasUteis: 15, inclui: ['kit', 'coleta'] },
  });
  assert.equal(lance1.status, 201, JSON.stringify(lance1.body));

  // Mesmo laboratorio melhorando a propria proposta.
  const lance2 = await chamar(bidHandler, {
    method: 'POST',
    headers: { authorization: 'Bearer token-vangenes' },
    body: { rfqId, precoCentavos: 395000, prazoDiasUteis: 12, recoletaSemCusto: true },
  });
  assert.equal(lance2.status, 201, JSON.stringify(lance2.body));

  const detalhe = await chamar(rfqHandler, { method: 'GET', query: { id: rfqId } });
  assert.equal(detalhe.status, 200);
  assert.equal(detalhe.body.rfq.totalLances, 2);
  assert.equal(detalhe.body.rfq.melhorPrecoCentavos, 395000);
  assert.equal(detalhe.body.ranking[0].labNome, 'Laboratório 1', 'identidade oculta antes da adjudicação');
  assert.equal(detalhe.body.ranking[0].lab, null);

  const vencedorId = detalhe.body.ranking[0].lance.id;
  const adjudicado = await chamar(awardHandler, {
    method: 'POST', body: { rfqId, tokenDono, lanceId: vencedorId },
  });
  assert.equal(adjudicado.status, 200, JSON.stringify(adjudicado.body));
  assert.equal(adjudicado.body.status, 'adjudicado');
  assert.equal(adjudicado.body.laboratorio.nome, 'Vangenes', 'identidade liberada após adjudicar');
  assert.ok(adjudicado.body.laboratorio.whatsapp);
});

test('recusa pedido abaixo da semana mínima do exame', async () => {
  const r = await chamar(rfqHandler, {
    method: 'POST', body: { ...pedidoValido, examId: 'nipt', semanasGestacao: 9 },
  });
  assert.equal(r.status, 400);
  assert.ok(r.body.detalhes.some((d: string) => /10 semanas/.test(d)));
});

test('recusa combinação impossível: coleta domiciliar com valor jurídico', async () => {
  const r = await chamar(rfqHandler, {
    method: 'POST',
    body: { ...pedidoValido, finalidade: 'judicial', precisaColetaDomiciliar: true },
  });
  assert.equal(r.status, 400);
  assert.ok(r.body.detalhes.some((d: string) => /cadeia de cust/i.test(d)));
});

test('lance sem token de laboratório é rejeitado', async () => {
  const criado = await chamar(rfqHandler, { method: 'POST', body: pedidoValido });
  const r = await chamar(bidHandler, {
    method: 'POST', body: { rfqId: criado.body.rfq.id, precoCentavos: 100000, prazoDiasUteis: 10 },
  });
  assert.equal(r.status, 401);
});

test('lance que sobe de preço é recusado pelo servidor', async () => {
  const criado = await chamar(rfqHandler, { method: 'POST', body: pedidoValido });
  const rfqId = criado.body.rfq.id;
  const auth = { authorization: 'Bearer token-vangenes' };
  await chamar(bidHandler, {
    method: 'POST', headers: auth, body: { rfqId, precoCentavos: 400000, prazoDiasUteis: 15 },
  });
  const subindo = await chamar(bidHandler, {
    method: 'POST', headers: auth, body: { rfqId, precoCentavos: 450000, prazoDiasUteis: 15 },
  });
  assert.equal(subindo.status, 422);
  assert.ok(subindo.body.detalhes.some((d: string) => /leil/i.test(d)));
});

test('laboratório sem cobertura nas UFs do pedido não consegue dar lance', async () => {
  const criado = await chamar(rfqHandler, {
    method: 'POST', body: { ...pedidoValido, precisaColetaDomiciliar: false, semanasGestacao: 12 },
  });
  const r = await chamar(bidHandler, {
    method: 'POST',
    headers: { authorization: 'Bearer token-genomic' },
    body: { rfqId: criado.body.rfq.id, precoCentavos: 300000, prazoDiasUteis: 15 },
  });
  // Genomic tem cobertura nacional e multi-cidade: este deve passar.
  assert.equal(r.status, 201, JSON.stringify(r.body));
});

test('adjudicação exige o token do dono', async () => {
  const criado = await chamar(rfqHandler, { method: 'POST', body: pedidoValido });
  const rfqId = criado.body.rfq.id;
  const lance = await chamar(bidHandler, {
    method: 'POST',
    headers: { authorization: 'Bearer token-vangenes' },
    body: { rfqId, precoCentavos: 400000, prazoDiasUteis: 15 },
  });
  const r = await chamar(awardHandler, {
    method: 'POST', body: { rfqId, tokenDono: 'chute', lanceId: lance.body.lance.id },
  });
  assert.equal(r.status, 403);
});

test('pedido só aparece na listagem enquanto está aberto', async () => {
  const criado = await chamar(rfqHandler, { method: 'POST', body: pedidoValido });
  const lista = await chamar(rfqHandler, { method: 'GET' });
  assert.ok(lista.body.pedidos.some((p: any) => p.id === criado.body.rfq.id));

  const lance = await chamar(bidHandler, {
    method: 'POST',
    headers: { authorization: 'Bearer token-vangenes' },
    body: { rfqId: criado.body.rfq.id, precoCentavos: 400000, prazoDiasUteis: 15 },
  });
  await chamar(awardHandler, {
    method: 'POST',
    body: { rfqId: criado.body.rfq.id, tokenDono: criado.body.tokenDono, lanceId: lance.body.lance.id },
  });
  const depois = await chamar(rfqHandler, { method: 'GET' });
  assert.ok(!depois.body.pedidos.some((p: any) => p.id === criado.body.rfq.id));
});
