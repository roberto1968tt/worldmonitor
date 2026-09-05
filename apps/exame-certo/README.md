# ExameCerto

Guia passo a passo, cobertura regional, distinção entre laudo com e sem valor
jurídico, e leilão reverso de orçamentos para exames genéticos no Brasil.

O problema que ele ataca: exame genético no Brasil quase não tem preço
publicado, a regra clínica (semana mínima, gestação única, cadeia de custódia)
está espalhada em rodapé de site, e a pessoa costuma descobrir o requisito que
invalida o exame depois de já ter pago. Aqui as regras viram código testado, e
o preço vira disputa.

## O que já funciona

| Módulo | Estado | Onde |
|---|---|---|
| Passo a passo com motor de elegibilidade | funcionando | `src/core/rules.ts`, `src/ui/wizard.ts` |
| Catálogo clínico dos exames e janelas gestacionais | funcionando | `src/core/exams.ts` |
| Cobertura regional por UF | funcionando | `src/core/labs.ts`, `coberturaPorUf()` |
| Com e sem valor jurídico | funcionando | `src/core/juridico.ts` |
| Roteiro personalizado + checklist de documentos | funcionando | `src/core/steps.ts` |
| Leilão reverso de orçamentos | funcionando | `src/core/auction.ts`, `api/` |
| Rede de custeio | **fase 2** — modelo e regras escritos, sem pagamento | `src/core/fundraising.ts` |

## Rodar

```bash
npm install
npm run dev:api        # API do leilão em :5274 (memória, sem Redis)
npm run dev            # app em :5273, com proxy de /api
npm test               # 31 testes: regras clínicas, leilão e rotas
npm run typecheck
npm run build
npm run build:artifact # empacota tudo em um HTML único, para publicar como Artifact
```

Para o app falar com as rotas de `api/` em vez de usar o banco do Artifact,
construa com `VITE_API_PROPRIA=1`.

## Onde o leilão guarda o estado

`src/ui/store.ts` tem três implementações da mesma interface, escolhidas em
tempo de execução — e a página diz ao usuário em qual está:

| Store | Quando | Regras validadas onde |
|---|---|---|
| `StoreHttp` | deploy próprio, com `api/` na frente do Redis | **servidor** |
| `StoreDb` | publicado como Artifact, sobre a capacidade `db` | cliente |
| `StoreLocal` | nenhuma das duas | cliente, só na aba |

No `StoreDb` o estado é real e compartilhado entre quem abre a página, mas a
validação roda no navegador: serve para ver o mecanismo, não para valer
dinheiro. Nesse modo a página oferece simular lances a partir do catálogo real,
passando pelo mesmo `validarLance` da API — lance que a regra recusa não entra,
igual em produção.

O `npm test` usa o type stripping nativo do Node (>= 22.6), sem passo de build.

## Decisões que valem explicar

**Privacidade não é um aviso, é a arquitetura.** Dado genético é dado pessoal
sensível. Nada que identifique uma pessoa entra na plataforma: o passo a passo
vive em `sessionStorage` e some quando a aba fecha; o pedido de orçamento
carrega exame, UFs e prazo, nunca nome, CPF, endereço ou resultado. O
laboratório não sabe quem abriu o pedido, e o solicitante só descobre o nome do
laboratório depois de escolher.

**A regra clínica é código, não texto.** Semana mínima do NIPT (10s0d),
gestação única, janela do vilo corial, conflito entre coleta domiciliar e
cadeia de custódia — tudo isso são funções puras em `src/core/`, cobertas por
teste. Quando um laboratório é mais restritivo que a regra geral (a Genomic
exige 11 semanas onde o mercado libera com 7 a 9), o `semanaMinimaPorExame`
prevalece; o app nunca fica mais permissivo que o fabricante do kit.

**O conflito domiciliar × jurídico é bloqueado na origem.** Coleta em casa
descaracteriza a cadeia de custódia. A API recusa a combinação em vez de deixar
a pessoa pagar por um laudo que o cartório não aceita.

**Leilão reverso de verdade.** Cada laboratório só melhora a própria proposta,
com decremento mínimo de 1% ou R$ 20. Preço e taxa de coleta domiciliar são
somados, então cortar de um lado e recolocar no outro não conta como lance
melhor. O ranking pesa preço 60%, prazo 25% e garantias 15% — sem esses 40% o
leilão premiaria quem corta serviço para baixar o número.

**A rede de custeio começa pelo que é gratuito.** Antes de qualquer vaquinha, a
tela lista Defensoria Pública, SUS, cobertura de plano e serviço social. Muita
campanha existe para pagar algo a que a pessoa já tem direito. Quando a fase 2
entrar, meta = lance vencedor, e o dinheiro vai da conta de custódia direto ao
laboratório, contra nota fiscal: nunca passa pela mão do beneficiário.

## Catálogo de laboratórios

`src/core/labs.ts` é semente. Cada registro tem `verificadoEm` e `fonte`, e foi
conferido no site oficial do laboratório naquela data. `credenciado: false`
significa que o laboratório ainda não entregou documentação de acreditação ao
ExameCerto — ele aparece na busca, com aviso, mas não pode dar lance em pedido
que exige cadeia de custódia.

Preço publicado é raro (hoje só a Clinimol publica). Por isso o leilão existe.

## API

| Rota | Método | O que faz |
|---|---|---|
| `/api/rfq` | POST | Cria pedido anônimo. Devolve o `tokenDono` **uma única vez**. |
| `/api/rfq?id=` | GET | Pedido + ranking dos lances, com laboratórios anônimos. |
| `/api/rfq` | GET | Pedidos abertos, para os laboratórios. |
| `/api/bid` | POST | Lance do laboratório. Exige `Authorization: Bearer <token>`. |
| `/api/award` | POST | Encerra e adjudica. Exige `tokenDono`. Revela o laboratório. |

Variáveis de ambiente:

```
UPSTASH_REDIS_REST_URL=      # sem isso o leilão roda só em memória
UPSTASH_REDIS_REST_TOKEN=
EC_LAB_TOKENS={"vangenes":"..."}   # MVP: mapa labId -> token
EC_ALLOWED_ORIGIN=https://...      # padrão: *
```

Sem Redis e com `NODE_ENV=production`, as rotas de escrita respondem 503 em vez
de fingir que persistiram.

## Limites conhecidos

- Autenticação de laboratório por token em variável de ambiente. Antes de abrir
  para laboratórios reais precisa virar credencial por conta, com rotação e
  trilha de auditoria.
- Sem rate limiting nas rotas. Um pedido por IP por minuto resolve o básico.
- O catálogo tem 9 laboratórios e cobre mal Norte e Nordeste. É o vazio que o
  mapa de cobertura mostra de propósito, em vez de esconder.
- Nenhum parecer jurídico ainda sobre captação de recursos de terceiros e sobre
  tratamento de dado sensível na LGPD. É pré-requisito da fase 2.

## Isenção

O ExameCerto organiza informação pública e coloca laboratórios para disputar
preço. Não é serviço médico, não emite laudo e não substitui médico, advogado
ou Defensoria Pública.
