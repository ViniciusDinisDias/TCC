# Fama Fashion — Sistema de Análise Inteligente de Estoque com IA

**Data:** 2026-09-07
**Status:** Aprovado para planejamento de implementação

## Contexto e objetivo

Trabalho de Conclusão de Curso (3º ano do ensino médio). A Fama Fashion é um
pequeno comércio de roupas femininas com loja física e Shopee, hoje controlado
manualmente (sem registro, sem histórico). O sistema deve:

1. Registrar produtos e pedidos (loja física e Shopee) de forma organizada.
2. Usar IA (API da Anthropic/Claude) para transformar esses dados em decisões
   logísticas, identificação de anomalias e recomendações, apresentadas em um
   dashboard.

Prioridade: simplicidade e clareza didática sobre robustez de produção. Sem
Docker, sem microsserviços, sem autenticação complexa, sem filas.

## Stack

- **Backend:** Python + FastAPI
- **Banco:** SQLite via SQLAlchemy (ORM)
- **Frontend:** HTML + Jinja2 + CSS + JS puro (fetch), servido pelo próprio
  FastAPI; gráficos com Chart.js via CDN
- **IA:** API da Anthropic (Claude), uma chamada por agente
- Chave da API em variável de ambiente (`.env`, via `python-dotenv`)

## Arquitetura geral

```
Navegador (Jinja2 + JS + Chart.js)
        │  fetch() / formulários
        ▼
FastAPI ──────────────► SQLite (arquivo .db local, via SQLAlchemy)
        │
        │  usuário clica "Analisar agora"
        ▼
Orquestrador (Python)
        │  chamada 1: Agente de KPIs         ──► Claude API
        │  chamada 2: Agente de Anomalias    ──► Claude API (recebe também a saída do agente de KPIs)
        │  chamada 3: Agente de Recomendações──► Claude API (recebe as saídas dos 2 anteriores)
        ▼
Resultado consolidado (JSON) → salvo em `analises_ia` → devolvido ao frontend
```

Tudo roda em um único processo (`uvicorn`). O orquestrador chama os 3 agentes
**em sequência** (não em paralelo), para que cada agente possa usar o que o
anterior encontrou — mais simples de codificar e de explicar do que chamadas
assíncronas paralelas.

### Decisão de arquitetura chave: Python calcula, IA interpreta

Os números exatos de KPI (faturamento por canal, ticket médio, produtos mais
vendidos, giro de estoque) são **calculados em Python puro** a partir do
banco, não pela IA. O papel do Agente de KPIs é **interpretar** esses números
já calculados (tendências, comparação entre canais). Isso evita o problema de
LLMs errarem contas sobre muitas linhas de dados e é mais fácil de defender no
TCC.

O mesmo vale parcialmente para o Agente de Anomalias: o Python pré-calcula
"sinais" candidatos (ex.: produto sem venda há X dias, queda de venda mês a
mês) e passa isso à IA, que decide quais desses sinais viram alertas e como
descrevê-los, além de poder notar outras coisas nos dados brutos enviados.

O Agente de Recomendações é o que mais depende de raciocínio livre da IA: ele
recebe a interpretação de KPIs e a lista de anomalias e sugere ações práticas.

Modelo padrão: `claude-sonnet-5` (melhor raciocínio de negócio), configurável
via `.env` (`ANTHROPIC_MODEL=...`). Como as chamadas são sob demanda (botão
"Analisar agora", não automáticas), o custo de API fica naturalmente
controlado.

## Modelo de dados

### `produtos`
| campo | tipo | obs |
|---|---|---|
| id | PK int | |
| sku | text único | |
| nome | text | |
| categoria | text | |
| tamanho | text | |
| cor | text | |
| preco | real | |
| quantidade_estoque | int | quantidade atual disponível |
| estoque_minimo | int | limite para alerta de "estoque baixo" (padrão: 5) |
| criado_em / atualizado_em | datetime | |

### `pedidos` (cabeçalho da movimentação)
| campo | tipo | obs |
|---|---|---|
| id | PK int | |
| canal | text | `"loja_fisica"` ou `"shopee"` |
| cliente_nome | text | |
| cliente_contato | text | opcional |
| data_pedido | datetime | |
| status | text | `pendente` / `confirmado` / `enviado` / `entregue` / `cancelado` |
| valor_total | real | soma dos itens, calculada automaticamente |
| criado_em | datetime | |

### `itens_pedido`
| campo | tipo | obs |
|---|---|---|
| id | PK int | |
| pedido_id | FK → pedidos | |
| produto_id | FK → produtos | |
| quantidade | int | |
| preco_unitario | real | "foto" do preço no momento do pedido |
| subtotal | real | quantidade × preco_unitario |

### `analises_ia` (histórico do Painel de IA)
| campo | tipo | obs |
|---|---|---|
| id | PK int | |
| data_hora | datetime | |
| kpis_json | text (JSON) | saída do Agente de KPIs |
| anomalias_json | text (JSON) | saída do Agente de Anomalias |
| recomendacoes_json | text (JSON) | saída do Agente de Recomendações |

### Regra de negócio: estoque

- Ao **criar** um pedido: desconta `quantidade_estoque` de cada produto dos
  itens.
- Ao **cancelar** um pedido (status vira `cancelado`) ou **excluir** um
  pedido que não estava cancelado: devolve o estoque correspondente.

## Estrutura de pastas

```
tcc_vini/
├── app/
│   ├── main.py                    # cria o app FastAPI, inclui routers, monta templates/static
│   ├── database.py                # engine SQLite + sessão SQLAlchemy + criação das tabelas
│   ├── models.py                  # modelos SQLAlchemy: Produto, Pedido, ItemPedido, AnaliseIA
│   ├── schemas.py                 # schemas Pydantic (validação de entrada/saída da API)
│   ├── routers/
│   │   ├── produtos.py            # CRUD de produtos
│   │   ├── pedidos.py             # CRUD de pedidos (+ itens, baixa/devolução de estoque)
│   │   ├── estoque.py             # consultas consolidadas (baixo estoque, valor total, parados)
│   │   └── ia.py                  # POST /ia/analisar, GET /ia/ultima, GET /ia/historico
│   ├── ia/
│   │   ├── orquestrador.py        # executar_analise(): chama os 3 agentes em sequência
│   │   ├── agente_kpis.py
│   │   ├── agente_anomalias.py
│   │   └── agente_recomendacoes.py
│   ├── templates/
│   │   ├── base.html              # layout comum (menu, head, Chart.js via CDN)
│   │   ├── produtos.html
│   │   ├── pedidos.html
│   │   ├── estoque.html
│   │   └── painel_ia.html
│   └── static/
│       ├── css/estilos.css
│       └── js/ (produtos.js, pedidos.js, estoque.js, painel_ia.js)
├── seed.py                        # popula o banco com dados de exemplo
├── requirements.txt
├── .env.example                   # modelo do .env (ANTHROPIC_API_KEY=..., ANTHROPIC_MODEL=...)
└── fama_fashion.db                # criado automaticamente na 1ª execução
```

## Rotas da API

**Produtos** (`routers/produtos.py`)
- `GET /produtos` — lista (filtro opcional por nome/categoria)
- `GET /produtos/{id}` — detalhe
- `POST /produtos` — cria
- `PUT /produtos/{id}` — edita
- `DELETE /produtos/{id}` — remove

**Pedidos** (`routers/pedidos.py`)
- `GET /pedidos` — lista (filtro opcional por canal/status)
- `GET /pedidos/{id}` — detalhe com itens
- `POST /pedidos` — cria pedido + itens numa transação: calcula `valor_total`,
  desconta estoque
- `PUT /pedidos/{id}` — edita dados/status; se novo status = `cancelado`,
  devolve estoque
- `DELETE /pedidos/{id}` — remove; devolve estoque se não estava cancelado

**Estoque** (`routers/estoque.py`, somente leitura)
- `GET /estoque/resumo` — quantidade por produto + valor total em estoque
- `GET /estoque/baixo` — produtos com `quantidade_estoque <= estoque_minimo`
- `GET /estoque/parados` — produtos sem venda nos últimos N dias (padrão 30,
  parametrizável na URL)

**IA** (`routers/ia.py`)
- `POST /ia/analisar` — dispara o orquestrador, salva em `analises_ia`,
  devolve o JSON consolidado
- `GET /ia/ultima` — devolve a análise mais recente salva
- `GET /ia/historico` — lista análises anteriores (data + resumo)

## Fluxo do orquestrador de IA

1. Busca produtos e pedidos no banco, monta um **resumo em JSON** (não manda
   o banco inteiro): faturamento por canal, ticket médio, top 5 produtos mais
   vendidos, giro de estoque por produto, lista de produtos parados/estoque
   baixo, pedidos dos últimos 30 dias.
2. **Chamada 1 — Agente de KPIs:** recebe o resumo calculado, devolve texto
   interpretando os números (tendências, comparação loja física × Shopee).
3. **Chamada 2 — Agente de Anomalias:** recebe o resumo + a interpretação do
   passo 2, devolve lista de alertas: `{titulo, descricao, severidade,
   produto_relacionado}`.
4. **Chamada 3 — Agente de Recomendações:** recebe tudo dos passos 2 e 3,
   devolve lista de ações: `{titulo, descricao, prioridade}`.
5. Orquestrador junta tudo em um único JSON, salva em `analises_ia`, devolve
   ao frontend.

Cada agente é uma chamada separada (`client.messages.create(model=...,
system="<prompt específico>", messages=[...])`) pedindo resposta em JSON
(com exemplo de formato no prompt). O orquestrador faz `json.loads()` no
retorno; se o parse falhar, registra um erro amigável em vez de quebrar a
tela.

### Formato de resposta consolidada (exemplo)

```json
{
  "gerado_em": "2026-09-07T14:32:00",
  "kpis": {
    "dados_calculados": { "faturamento_loja_fisica": 0, "faturamento_shopee": 0, "ticket_medio": 0, "top_produtos": [], "giro_estoque": [] },
    "interpretacao": "texto gerado pela IA"
  },
  "anomalias": {
    "alertas": [ { "titulo": "", "descricao": "", "severidade": "alta|media|baixa", "produto_relacionado": "" } ]
  },
  "recomendacoes": {
    "acoes": [ { "titulo": "", "descricao": "", "prioridade": "alta|media|baixa" } ]
  }
}
```

## Frontend (4 telas)

Cada tela = 1 template Jinja2 + 1 arquivo JS que consome as rotas via
`fetch`. `base.html` traz o menu de navegação comum e importa o Chart.js pelo
CDN.

1. **Produtos** — tabela com todos os produtos; formulário na mesma página
   (sem modal) para criar/editar; excluir por linha com confirmação.
2. **Pedidos** — tabela de pedidos (canal, cliente, data, status, valor
   total); formulário para criar pedido: canal, dados do cliente, itens
   adicionados dinamicamente em JS (produto + quantidade); editar status;
   excluir.
3. **Estoque** — cards de resumo (valor total em estoque, nº produtos com
   estoque baixo, nº produtos parados) + tabela de todos os produtos com
   estoque atual, destacando em cor quem está baixo/parado.
4. **Painel de IA** — ao carregar, busca `GET /ia/ultima` (mostra a última
   análise salva, sem gastar chamada nova). Botão **"Analisar agora"** chama
   `POST /ia/analisar`. Mostra 2 gráficos Chart.js com números exatos do
   Python (faturamento por canal, produtos mais vendidos), cards com a
   interpretação de KPIs da IA, lista de alertas de anomalia (cor por
   severidade) e lista de recomendações (por prioridade).

## Dados de exemplo (seed)

`seed.py` popula: ~15-20 produtos (categorias/tamanhos/cores variados, um
propositalmente com estoque baixo e um propositalmente parado há muito
tempo) e ~30-40 pedidos distribuídos nos últimos ~60 dias entre os dois
canais, com status variados — incluindo uma queda brusca proposital de
vendas de um produto específico, para o Agente de Anomalias ter algo claro
para detectar na demonstração.

## Fora de escopo (YAGNI)

- Autenticação/login de usuários
- Múltiplas lojas/multi-tenant
- Filas, workers assíncronos, Docker, microsserviços
- Chamadas paralelas/assíncronas aos agentes de IA
- Edição de itens de um pedido já criado (recriar o pedido é suficiente para
  o escopo do TCC)
