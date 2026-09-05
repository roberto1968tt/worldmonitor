/**
 * POST /api/bid  registra um lance de laboratorio em um pedido aberto.
 *
 * Autenticacao por token de laboratorio (Authorization: Bearer ...). O
 * laboratorio nunca ve quem abriu o pedido; o solicitante so ve o nome do
 * laboratorio depois de adjudicar.
 */
import type { Lance } from '../src/types.ts';
import { rfqPublico, validarLance } from '../src/core/auction.ts';
import { getLab } from '../src/core/labs.ts';
import { adicionarLance, ehPersistente, lerLances, lerRfq } from './_store.ts';
import {
  booleano, corpo, cors, erro, inteiro, labAutenticado, novoId, texto,
  type Req, type Res,
} from './_http.ts';

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

  const labId = labAutenticado(req);
  if (!labId) return erro(res, 401, 'Laboratório não autenticado.');

  const lab = getLab(labId);
  if (!lab) return erro(res, 401, 'Laboratório não reconhecido.');

  const b = corpo(req);
  const rfqId = texto(b.rfqId, 60);
  const rfq = await lerRfq(rfqId);
  if (!rfq) return erro(res, 404, 'Pedido não encontrado.');

  const precoCentavos = inteiro(b.precoCentavos);
  const taxaDomiciliarCentavos = inteiro(b.taxaDomiciliarCentavos) ?? 0;
  const prazoDiasUteis = inteiro(b.prazoDiasUteis);
  if (precoCentavos == null || prazoDiasUteis == null) {
    return erro(res, 400, 'Lance inválido.', ['Informe preço em centavos e prazo em dias úteis.']);
  }

  const proposta = {
    precoCentavos,
    taxaDomiciliarCentavos,
    prazoDiasUteis,
    emiteCadeiaCustodia: booleano(b.emiteCadeiaCustodia),
  };

  const lances = await lerLances(rfqId);
  const validacao = validarLance(rfq, lab, proposta, lances);
  if (!validacao.ok) return erro(res, 422, 'Lance recusado.', validacao.erros);

  const inclui = Array.isArray(b.inclui)
    ? b.inclui.slice(0, 12).map((i) => texto(i, 80)).filter(Boolean)
    : [];

  const lance: Lance = {
    id: novoId('lance'),
    rfqId,
    labId,
    ...proposta,
    inclui,
    recoletaSemCusto: booleano(b.recoletaSemCusto),
    validoAte: texto(b.validoAte, 40) || new Date(Date.now() + 30 * 86_400_000).toISOString(),
    criadoEm: new Date().toISOString(),
    retirado: false,
  };

  await adicionarLance(lance);
  const atualizados = await lerLances(rfqId);

  res.status(201).json({
    lance,
    pedido: rfqPublico(rfq, atualizados),
  });
}
