/**
 * Servidor de API para desenvolvimento local.
 *
 * Em producao a Vercel expoe cada arquivo de api/ como funcao. Aqui um HTTP
 * server simples faz o mesmo roteamento, para o app rodar inteiro na maquina.
 * Rode com: node --experimental-strip-types scripts/dev-api.mjs
 */
import { createServer } from 'node:http';

const PORTA = Number(process.env.EC_API_PORT ?? 5274);

const ROTAS = {
  '/api/rfq': () => import('../api/rfq.ts'),
  '/api/bid': () => import('../api/bid.ts'),
  '/api/award': () => import('../api/award.ts'),
};

function lerCorpo(req) {
  return new Promise((resolve) => {
    let dados = '';
    req.on('data', (c) => {
      dados += c;
      if (dados.length > 100_000) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(dados ? JSON.parse(dados) : {});
      } catch {
        resolve({});
      }
    });
  });
}

const servidor = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORTA}`);
  const carregar = ROTAS[url.pathname];

  if (!carregar) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ erro: 'Rota não encontrada.' }));
    return;
  }

  const { default: handler } = await carregar();
  const query = Object.fromEntries(url.searchParams.entries());
  const body = req.method === 'POST' ? await lerCorpo(req) : undefined;

  const resposta = {
    _status: 200,
    status(code) { this._status = code; return this; },
    json(corpo) {
      res.writeHead(this._status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(corpo));
    },
    setHeader(nome, valor) { res.setHeader(nome, valor); },
    end() { res.writeHead(this._status); res.end(); },
  };

  try {
    await handler({ method: req.method, query, body, headers: req.headers }, resposta);
  } catch (e) {
    console.error('[dev-api]', e);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ erro: 'Erro interno.', detalhes: [String(e)] }));
    }
  }
});

servidor.listen(PORTA, () => {
  console.log(`[dev-api] http://localhost:${PORTA}  (rotas: ${Object.keys(ROTAS).join(', ')})`);
  console.log('[dev-api] sem Redis configurado: os pedidos ficam só em memória e somem no restart.');
});
