/**
 * POST /api/award  encerra o leilao e adjudica um lance.
 *
 * So o dono do pedido consegue, com o token entregue na criacao. Depois da
 * adjudicacao o solicitante passa a ver o nome e o contato do laboratorio
 * vencedor - e so dele.
 */
import { ranquear } from '../src/core/auction.ts';
import { getLab } from '../src/core/labs.ts';
import { ehPersistente, lerLances, lerRfq, salvarRfq } from './_store.ts';
import { corpo, cors, erro, texto, type Req, type Res } from './_http.ts';

export default async function handler(req: Req, res: Res): Promise<void> {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') return erro(res, 405, 'Método não permitido.');

  if (!ehPersistente() && process.env.NODE_ENV === 'production') {
    return erro(res, 503, 'Leilão indisponível: armazenamento não configurado.');
  }

  const b = corpo(req);
  const rfqId = texto(b.rfqId, 60);
  const tokenDono = texto(b.tokenDono, 80);
  const lanceId = texto(b.lanceId, 60);

  const rfq = await lerRfq(rfqId);
  if (!rfq) return erro(res, 404, 'Pedido não encontrado.');
  if (!tokenDono || tokenDono !== rfq.tokenDono) {
    return erro(res, 403, 'Token do pedido inválido.');
  }
  if (rfq.status === 'adjudicado') {
    return erro(res, 409, 'Este pedido já foi adjudicado.');
  }
  if (rfq.status === 'cancelado') {
    return erro(res, 409, 'Este pedido foi cancelado.');
  }

  if (texto(b.acao, 20) === 'cancelar') {
    rfq.status = 'cancelado';
    await salvarRfq(rfq);
    res.status(200).json({ status: rfq.status });
    return;
  }

  const lances = await lerLances(rfqId);
  const escolhido = lances.find((l) => l.id === lanceId && !l.retirado);
  if (!escolhido) return erro(res, 404, 'Lance não encontrado.');
  if (new Date(escolhido.validoAte).getTime() < Date.now()) {
    return erro(res, 409, 'Este lance expirou. Escolha outro ou reabra o pedido.');
  }

  rfq.status = 'adjudicado';
  rfq.lanceVencedorId = escolhido.id;
  await salvarRfq(rfq);

  const lab = getLab(escolhido.labId);
  const ranking = ranquear(lances, { [escolhido.labId]: lab ?? undefined }, rfq);
  const posicao = ranking.find((r) => r.lance.id === escolhido.id)?.posicao ?? null;

  res.status(200).json({
    status: rfq.status,
    lanceVencedor: escolhido,
    posicaoNoRanking: posicao,
    laboratorio: lab
      ? {
          id: lab.id, nome: lab.nome, telefone: lab.telefone, whatsapp: lab.whatsapp,
          email: lab.email, site: lab.site, sede: lab.sede, ufSede: lab.ufSede,
          cadeiaCustodia: lab.cadeiaCustodia, credenciado: lab.credenciado,
        }
      : null,
    proximoPasso:
      'Entre em contato com o laboratório citando o número do pedido. Confirme por escrito ' +
      'escopo, data da coleta e valor total antes de pagar.',
    persistente: ehPersistente(),
  });
}
