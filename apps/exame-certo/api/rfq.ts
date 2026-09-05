/**
 * POST /api/rfq          cria um pedido de orcamento anonimo
 * GET  /api/rfq?id=...   detalhe do pedido (visao publica + ranking dos lances)
 * GET  /api/rfq          pedidos abertos, para os laboratorios
 *
 * Nenhum campo de identificacao pessoal e aceito. Se vier, e ignorado.
 */
import type { Rfq, UF } from '../src/types.ts';
import { DURACAO_PADRAO_HORAS, ranquear, rfqPublico } from '../src/core/auction.ts';
import { getExame } from '../src/core/exams.ts';
import { LABS_POR_ID } from '../src/core/labs.ts';
import { perfilJuridico } from '../src/core/juridico.ts';
import { ehPersistente, lerLances, lerRfq, listarRfqs, salvarRfq } from './_store.ts';
import {
  booleano, corpo, cors, erro, inteiro, novoId, novoToken, texto, ufsValidas,
  type Req, type Res,
} from './_http.ts';

const FINALIDADES = ['informativo', 'extrajudicial', 'judicial'] as const;

export default async function handler(req: Req, res: Res): Promise<void> {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    const id = typeof req.query?.id === 'string' ? req.query.id : null;
    if (id) return detalhe(id, res);
    return listar(res);
  }

  if (req.method === 'POST') return criar(req, res);

  erro(res, 405, 'Método não permitido.');
}

async function detalhe(id: string, res: Res): Promise<void> {
  const rfq = await lerRfq(id);
  if (!rfq) return erro(res, 404, 'Pedido não encontrado.');
  const lances = await lerLances(id);
  res.status(200).json({
    rfq: rfqPublico(rfq, lances),
    ranking: ranquear(lances, LABS_POR_ID, rfq).map((r) => ({
      ...r,
      // O solicitante ve o laboratorio so depois de adjudicar.
      lab: rfq.status === 'adjudicado' ? r.lab : null,
      labNome: rfq.status === 'adjudicado' ? r.lab?.nome ?? null : `Laboratório ${r.posicao}`,
    })),
  });
}

async function listar(res: Res): Promise<void> {
  const rfqs = await listarRfqs();
  const abertos = rfqs.filter((r) => r.status === 'aberto' && new Date(r.encerraEm) > new Date());
  const comLances = await Promise.all(
    abertos.map(async (r) => rfqPublico(r, await lerLances(r.id))),
  );
  res.status(200).json({ pedidos: comLances, persistente: ehPersistente() });
}

async function criar(req: Req, res: Res): Promise<void> {
  if (!ehPersistente() && process.env.NODE_ENV === 'production') {
    return erro(res, 503, 'Leilão indisponível: armazenamento não configurado.');
  }

  const b = corpo(req);
  const problemas: string[] = [];

  const examId = texto(b.examId, 60);
  const exame = getExame(examId);
  if (!exame) problemas.push('Exame inválido.');

  const finalidade = texto(b.finalidade, 20) as (typeof FINALIDADES)[number];
  if (!FINALIDADES.includes(finalidade)) problemas.push('Finalidade inválida.');

  const ufPartes: UF[] = ufsValidas(b.ufPartes);
  if (ufPartes.length === 0) problemas.push('Informe ao menos uma UF de coleta.');
  if (ufPartes.length > 5) problemas.push('Máximo de 5 UFs por pedido.');

  const semanas = b.semanasGestacao == null ? null : inteiro(b.semanasGestacao);
  if (semanas != null && (semanas < 1 || semanas > 42)) {
    problemas.push('Idade gestacional fora do intervalo.');
  }
  if (exame?.momento === 'gestacao' && semanas == null) {
    problemas.push('Este exame exige a idade gestacional.');
  }
  if (exame?.semanaMinima != null && semanas != null && semanas < exame.semanaMinima) {
    problemas.push(
      `O exame libera com ${exame.semanaMinima} semanas. Não faz sentido leiloar antes disso.`,
    );
  }

  const prazoDesejado = b.prazoDesejadoDiasUteis == null ? null : inteiro(b.prazoDesejadoDiasUteis);
  if (prazoDesejado != null && (prazoDesejado < 1 || prazoDesejado > 180)) {
    problemas.push('Prazo desejado fora do intervalo.');
  }

  if (problemas.length > 0) return erro(res, 400, 'Pedido inválido.', problemas);

  const perfil = perfilJuridico(finalidade);
  const precisaColetaDomiciliar = booleano(b.precisaColetaDomiciliar);
  if (precisaColetaDomiciliar && perfil.exigeCadeiaCustodia) {
    return erro(res, 400, 'Pedido inválido.', [
      'Coleta domiciliar é incompatível com laudo de valor jurídico: a cadeia de custódia ' +
        'exige coleta presencial em unidade credenciada. Escolha um dos dois.',
    ]);
  }

  const horas = Math.min(168, Math.max(6, inteiro(b.duracaoHoras) ?? DURACAO_PADRAO_HORAS));
  const agora = new Date();

  const rfq: Rfq = {
    id: novoId('rfq'),
    examId,
    finalidade,
    ufPartes,
    semanasGestacao: semanas,
    precisaColetaDomiciliar,
    precisaCadeiaCustodia: perfil.exigeCadeiaCustodia,
    prazoDesejadoDiasUteis: prazoDesejado,
    observacoes: texto(b.observacoes, 500),
    criadoEm: agora.toISOString(),
    encerraEm: new Date(agora.getTime() + horas * 3600_000).toISOString(),
    status: 'aberto',
    revelarMelhorPreco: b.revelarMelhorPreco === false ? false : true,
    lanceVencedorId: null,
    tokenDono: novoToken(),
  };

  await salvarRfq(rfq);

  // O token do dono sai UMA vez, na criacao. Nunca mais.
  res.status(201).json({
    rfq: rfqPublico(rfq, []),
    tokenDono: rfq.tokenDono,
    aviso:
      'Guarde este token: é ele que permite encerrar o pedido e escolher o vencedor. ' +
      'Não é possível recuperá-lo depois.',
    persistente: ehPersistente(),
  });
}
