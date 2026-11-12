# Documentação Técnica — Fashion Analytics (Fama Fashion)

> TCC de ensino médio. Sistema de gestão de estoque e pedidos com painel de
> análise gerado por IA para uma loja de roupas fictícia (loja física +
> canal Shopee).

---

## 1. Visão geral do sistema

O Fashion Analytics é um sistema web de gestão de estoque e pedidos para a
"Fama Fashion", uma loja fictícia de roupas femininas que vende em dois
canais (loja física e Shopee). O sistema permite cadastrar produtos,
registrar pedidos (com baixa e devolução automática de estoque), acompanhar
indicadores de estoque (valor total, itens em falta, produtos parados) e
visualizar um resumo executivo com gráficos de vendas.

O diferencial do projeto é o **Painel de IA**: ao clicar em "Analisar
agora", três agentes de IA (rodando sobre a API da Anthropic/Claude) são
chamados em sequência para interpretar os números do negócio, apontar
anomalias operacionais e sugerir ações práticas — sem que a IA precise (ou
tenha permissão) de recalcular métricas, já que todos os números vêm
prontos do backend em Python.

## 2. Arquitetura geral

O sistema é uma aplicação **monolítica server-side rendered**: o FastAPI
serve tanto o HTML (via Jinja2) quanto uma API JSON consumida por
JavaScript puro no navegador (sem framework de frontend, sem build step).

Fluxo padrão de uma tela (ex.: Produtos):

```
Navegador                FastAPI                        Banco (SQLite)
─────────                ───────                        ───────────────
GET /produtos-page  ──▶  main.py renderiza produtos.html
                         (Jinja2 + base.html)
   │
   │ produtos.js faz fetch()
   ▼
GET /produtos        ──▶  routers/produtos.py
                         (Depends: auth.exigir_login)
                         db.query(Produto)          ──▶  SELECT * FROM produtos
                         ◀──────────────────────────────  linhas
                    ◀──  JSON (schemas.ProdutoOut)
   ▼
JS renderiza os cards na página (DOM)
```

Fluxo até a IA (acionado pelo botão "Analisar agora" no Painel de IA):

```
painel_ia.js
   │ POST /ia/analisar
   ▼
routers/ia.py (auth.exigir_login)
   │
   ▼
orquestrador.executar_analise(db)
   │
   ├─ 1) resumo.montar_resumo_dados(db) ──▶ consultas SQL, cálculos em Python
   │                                        (faturamento, ticket médio, giro
   │                                         de estoque, produtos parados...)
   │
   ├─ 2) agente_kpis.executar(resumo)          ──▶ Claude (tool use forçado)
   ├─ 3) agente_anomalias.executar(resumo, kpis) ──▶ Claude (JSON em texto)
   ├─ 4) agente_recomendacoes.executar(...)      ──▶ Claude (JSON em texto)
   │
   ▼
resultado consolidado {kpis, anomalias, recomendacoes}
   │
   ├─▶ salvo em AnaliseIA (tabela analises_ia, como JSON serializado)
   └─▶ devolvido como JSON para o navegador, que desenha gráficos (Chart.js)
       e cards de alerta/recomendação
```

Camadas do backend, de fora para dentro:

- **`routers/`** — endpoints HTTP (FastAPI `APIRouter`): validam entrada
  (Pydantic), checam permissão (`app/auth.py`) e chamam a camada de dados.
- **`servicos_estoque.py`** — pequenas funções de regra de negócio sobre
  estoque (valor total, estoque baixo, produtos parados), reaproveitadas por
  `estoque.py`, `dashboard.py` e `ia/resumo.py`. Não existe uma camada
  "service" separada para produtos/pedidos — a lógica desses dois fica
  diretamente dentro dos próprios routers.
- **`models.py`** — tabelas SQLAlchemy (ORM).
- **`database.py`** — engine, sessão e `Base` declarativa.
- **`app/ia/`** — orquestrador e agentes de IA, isolados do resto da
  aplicação (só é importado por `routers/ia.py`).

## 3. Stack tecnológica

Versões abaixo são as efetivamente instaladas no ambiente virtual do
projeto (`venv`); o `requirements.txt` fixa apenas limites mínimos
(`>=`), então versões mais novas podem ser instaladas em outra máquina.

| Tecnologia | Versão instalada | Papel no projeto |
|---|---|---|
| Python | 3.13 | Linguagem da aplicação |
| FastAPI | 0.141.1 | Framework web: define rotas, valida request/response, gera `/docs` (Swagger) automaticamente |
| Uvicorn | 0.52.4 | Servidor ASGI que roda a aplicação FastAPI |
| SQLAlchemy | 2.0.52 | ORM: mapeia classes Python para tabelas (`app/models.py`) e monta as queries |
| SQLite | (embutido no Python) | Banco de dados do projeto — um único arquivo `fama_fashion.db` |
| Pydantic | 2.13.5 | Schemas de entrada/saída da API (`app/schemas.py`) — validação automática dos dados recebidos |
| Jinja2 | 3.1.6 | Motor de templates HTML server-side (`app/templates/`) |
| python-dotenv | 1.2.3 | Carrega variáveis do arquivo `.env` (chave da IA, segredo de sessão etc.) |
| itsdangerous | 2.2.0 | Assina o cookie de sessão usado pelo `SessionMiddleware` do Starlette |
| python-multipart | 0.0.32 | Necessário para o FastAPI ler formulários (`Form(...)`) — usado na tela de login |
| anthropic (SDK oficial) | 1.4.0 | Cliente HTTP para a API da Anthropic — usado pelos 3 agentes de IA |
| httpx | 0.28.1 | Dependência transitiva (usada internamente pelo FastAPI `TestClient` e pelo SDK da Anthropic) |
| pytest | 9.1.1 | Framework de testes automatizados (25 arquivos de teste em `tests/`) |
| Chart.js | 4.4.4 (via CDN, `jsdelivr`) | Biblioteca JS para os gráficos de barras do Resumo e do Painel de IA |
| JavaScript puro (Vanilla JS) | — | Todo o frontend dinâmico — não há React/Vue/build step |
| Google Fonts (Fraunces, IBM Plex Sans, Sora) | — | Tipografia, carregada via `<link>` no `base.html` |

Não há um "requirements-dev" separado: `pytest` está listado junto no
mesmo `requirements.txt`.

## 4. Estrutura de pastas

```
tcc_vini/
├── app/
│   ├── main.py              # ponto de entrada FastAPI: middleware de sessão,
│   │                         # montagem de /static, rotas de login/logout e
│   │                         # rotas que renderizam cada página HTML
│   ├── database.py          # engine SQLAlchemy, SessionLocal, Base, get_db()
│   ├── models.py            # tabelas: Produto, Pedido, ItemPedido, Usuario, AnaliseIA
│   ├── schemas.py           # schemas Pydantic (entrada/saída da API)
│   ├── auth.py              # hash de senha (PBKDF2), login, sessão, papéis (admin/assistente)
│   ├── servicos_estoque.py  # regras de negócio de estoque (valor total, baixo, parado)
│   │
│   ├── routers/
│   │   ├── produtos.py      # CRUD de produtos
│   │   ├── pedidos.py       # CRUD de pedidos (baixa/devolução de estoque)
│   │   ├── estoque.py       # endpoints de leitura: resumo, baixo, parados
│   │   ├── dashboard.py     # KPIs e gráficos da tela "Resumo"
│   │   └── ia.py            # dispara a análise de IA e consulta histórico
│   │
│   ├── ia/
│   │   ├── cliente_claude.py       # cliente Anthropic + helpers de extração de resposta
│   │   ├── resumo.py               # calcula em Python os números que a IA vai interpretar
│   │   ├── agente_kpis.py          # 1º agente: interpreta os KPIs (usa tool use)
│   │   ├── agente_anomalias.py     # 2º agente: detecta anomalias (JSON em texto)
│   │   ├── agente_recomendacoes.py # 3º agente: sugere ações (JSON em texto)
│   │   └── orquestrador.py         # chama os 3 agentes em sequência e persiste o resultado
│   │
│   ├── templates/            # HTML renderizado no servidor (Jinja2)
│   │   ├── base.html         # layout comum (sidebar, fontes, scripts globais)
│   │   ├── login.html
│   │   ├── resumo.html       # tela inicial ("/")
│   │   ├── produtos.html
│   │   ├── pedidos.html
│   │   ├── estoque.html
│   │   └── painel_ia.html
│   │
│   └── static/
│       ├── css/estilos.css   # todo o CSS do projeto (design tokens + componentes)
│       └── js/
│           ├── common.js     # fetch wrapper, toasts, modais de confirmação/aviso
│           ├── resumo.js
│           ├── produtos.js
│           ├── pedidos.js
│           ├── estoque.js
│           └── painel_ia.js
│
├── tests/                    # testes automatizados (pytest), um arquivo por módulo/rota
├── docs/
│   └── superpowers/          # specs e planos de implementação escritos durante o desenvolvimento
├── seed.py                   # popula o banco com usuários, produtos e pedidos de exemplo
├── requirements.txt
├── pytest.ini
├── .env.example               # modelo de variáveis de ambiente
└── fama_fashion.db            # arquivo do banco SQLite (gerado em tempo de execução)
```

## 5. Modelagem de dados

Todas as tabelas estão em `app/models.py`, mapeadas com SQLAlchemy ORM
(`declarative_base`). O banco é um único arquivo SQLite
(`sqlite:///./fama_fashion.db`).

### `produtos` (classe `Produto`)

| Campo | Tipo | Observações |
|---|---|---|
| `id` | Integer | PK |
| `sku` | String | único, indexado |
| `nome` | String | obrigatório |
| `categoria` | String | obrigatório (ex.: "Blusa", "Vestido") |
| `tamanho` | String | obrigatório |
| `cor` | String | obrigatório |
| `preco` | Float | obrigatório |
| `quantidade_estoque` | Integer | padrão `0` |
| `estoque_minimo` | Integer | padrão `5` — usado para marcar "estoque baixo" |
| `criado_em` / `atualizado_em` | DateTime | preenchidos automaticamente (`default`/`onupdate`) |

Relacionamento: um `Produto` tem muitos `ItemPedido` (`itens_pedido`).

### `pedidos` (classe `Pedido`)

| Campo | Tipo | Observações |
|---|---|---|
| `id` | Integer | PK |
| `canal` | String | `"loja_fisica"` ou `"shopee"` (não é um `Enum` de banco — validado apenas na camada de frontend, ver seção 8) |
| `cliente_nome` | String | obrigatório |
| `cliente_contato` | String | opcional |
| `data_pedido` | DateTime | data efetiva do pedido |
| `status` | String | padrão `"pendente"`; valores usados variam por canal (ver seção 6) |
| `valor_total` | Float | calculado no backend a partir dos itens, nunca recebido do cliente |
| `criado_em` | DateTime | timestamp de criação do registro |

Relacionamento: um `Pedido` tem muitos `ItemPedido` (`itens`), com
`cascade="all, delete-orphan"` — apagar um pedido apaga seus itens
automaticamente.

### `itens_pedido` (classe `ItemPedido`)

| Campo | Tipo | Observações |
|---|---|---|
| `id` | Integer | PK |
| `pedido_id` | Integer | FK → `pedidos.id` |
| `produto_id` | Integer | FK → `produtos.id` |
| `quantidade` | Integer | obrigatório |
| `preco_unitario` | Float | preço do produto **no momento do pedido** (não muda se o preço do produto mudar depois) |
| `subtotal` | Float | `quantidade * preco_unitario`, calculado no backend |

Relacionamentos: pertence a um `Pedido` (`pedido`) e a um `Produto`
(`produto`).

### `usuarios` (classe `Usuario`)

| Campo | Tipo | Observações |
|---|---|---|
| `id` | Integer | PK |
| `login` | String | único |
| `senha_hash` | String | `salt_hex$hash_hex` (PBKDF2-SHA256), ver seção 9 |
| `papel` | String | `"admin"` ou `"assistente"` |

Sem relacionamento com outras tabelas — é usada só para autenticação, não
há "usuário responsável" registrado em pedidos/produtos.

### `analises_ia` (classe `AnaliseIA`)

| Campo | Tipo | Observações |
|---|---|---|
| `id` | Integer | PK |
| `data_hora` | DateTime | quando a análise foi gerada |
| `kpis_json` | Text | JSON serializado (string) com os dados calculados + interpretação do agente 1 |
| `anomalias_json` | Text | JSON serializado com a saída do agente 2 |
| `recomendacoes_json` | Text | JSON serializado com a saída do agente 3 |

Os três campos `*_json` guardam texto (JSON serializado via
`json.dumps`), não colunas estruturadas — uma simplificação razoável para
o volume de dados do projeto, mas que impede fazer queries SQL sobre o
conteúdo das análises (ver seção 11).

### Diagrama de relacionamentos

```
Usuario (independente, só autenticação)

Produto 1 ───< ItemPedido >─── 1 Pedido
   (produto_id)         (pedido_id, cascade delete-orphan)

AnaliseIA (independente, apenas histórico serializado)
```

## 6. Endpoints da API

Todas as rotas de API (exceto `/health`, `/login` e `/logout`) exigem
sessão autenticada via `Depends(auth.exigir_login)`; as de escrita exigem
`Depends(auth.exigir_admin)` — ver seção 9 para o detalhe de papéis.

### `app/routers/produtos.py` — prefixo `/produtos`

| Método | Rota | Entrada | Resposta | Regras de negócio |
|---|---|---|---|---|
| GET | `/produtos` | query opcional `nome`, `categoria` | lista de `ProdutoOut` | filtro por nome (`ILIKE`) e/ou categoria exata |
| GET | `/produtos/{id}` | — | `ProdutoOut` | 404 se não existir |
| POST | `/produtos` | `ProdutoCreate` (JSON) | `ProdutoOut`, 201 | **somente admin**; 400 se `sku` já existir (`IntegrityError`) |
| PUT | `/produtos/{id}` | `ProdutoUpdate` (campos opcionais) | `ProdutoOut` | **somente admin**; atualiza só os campos enviados (`exclude_unset=True`) |
| DELETE | `/produtos/{id}` | — | 204 | **somente admin**; bloqueado (400) se o produto já tiver sido usado em algum `ItemPedido` — evita quebrar o histórico de pedidos |

Exemplo de regra relevante (bloqueio de exclusão com histórico):

```python
tem_pedidos = db.query(models.ItemPedido).filter(models.ItemPedido.produto_id == produto_id).first()
if tem_pedidos:
    raise HTTPException(status_code=400, detail="Não é possível excluir este produto pois ele já foi usado em pedidos.")
```

### `app/routers/pedidos.py` — prefixo `/pedidos`

| Método | Rota | Entrada | Resposta | Regras de negócio |
|---|---|---|---|---|
| GET | `/pedidos` | query opcional `canal`, `status` | lista de `PedidoOut`, mais recentes primeiro | `joinedload` nos itens para evitar N+1 |
| GET | `/pedidos/{id}` | — | `PedidoOut` | 404 se não existir |
| POST | `/pedidos` | `PedidoCreate` (canal, cliente, lista de itens `{produto_id, quantidade}`) | `PedidoOut`, 201 | **somente admin**. Para cada item: verifica se o produto existe e se há estoque suficiente (senão 404/400 e `rollback`); grava `preco_unitario`/`subtotal` com o preço atual do produto; **decrementa `quantidade_estoque`**; soma `valor_total` |
| PUT | `/pedidos/{id}` | `PedidoUpdate` (cliente, contato, status) | `PedidoOut` | **somente admin**. Se o novo `status` for `"cancelado"` e o anterior não era, **devolve ao estoque** a quantidade de cada item antes de aplicar as mudanças |
| DELETE | `/pedidos/{id}` | — | 204 | **somente admin**. Se o pedido não estava cancelado, devolve o estoque antes de apagar (os itens somem junto via `cascade`) |

Trecho que ilustra a baixa de estoque na criação do pedido:

```python
if produto.quantidade_estoque < item.quantidade:
    db.rollback()
    raise HTTPException(400, detail=f"Estoque insuficiente para o produto '{produto.nome}'")
subtotal = produto.preco * item.quantidade
...
produto.quantidade_estoque -= item.quantidade
```

E a devolução (reaproveitada tanto na edição para "cancelado" quanto na
exclusão):

```python
def _devolver_estoque(pedido: models.Pedido, db: Session) -> None:
    for item in pedido.itens:
        produto = db.get(models.Produto, item.produto_id)
        if produto:
            produto.quantidade_estoque += item.quantidade
```

### `app/routers/estoque.py` — prefixo `/estoque` (somente leitura)

| Método | Rota | Entrada | Resposta |
|---|---|---|---|
| GET | `/estoque/resumo` | — | valor total em estoque + lista de produtos com valor individual |
| GET | `/estoque/baixo` | — | produtos onde `quantidade_estoque <= estoque_minimo` |
| GET | `/estoque/parados` | query opcional `dias` (padrão 30) | produtos sem nenhuma venda (em pedido não cancelado) nos últimos N dias |

### `app/routers/dashboard.py` — prefixo `/dashboard`

| Método | Rota | Resposta |
|---|---|---|
| GET | `/dashboard/resumo` | KPIs do mês atual vs. anterior (faturamento, nº de pedidos, ticket médio, variação percentual), série de faturamento dos últimos 6 meses, até 5 alertas de estoque (baixo, depois parado) e os 5 pedidos mais recentes |

Pedidos com `status == "cancelado"` são excluídos de todos os cálculos de
faturamento/KPI, tanto aqui quanto em `ia/resumo.py`.

### `app/routers/ia.py` — prefixo `/ia`

| Método | Rota | Resposta | Regras de negócio |
|---|---|---|---|
| POST | `/ia/analisar` | resultado consolidado (`kpis`, `anomalias`, `recomendacoes`) | Requer apenas login (não exige admin — assistente também pode disparar). Executa a cadeia dos 3 agentes; qualquer exceção (ex.: chave da API ausente/inválida) vira 503 com mensagem amigável |
| GET | `/ia/ultima` | última análise salva (ou `null`) | Lê o registro mais recente de `AnaliseIA` e desserializa os campos `*_json` |
| GET | `/ia/historico` | lista de `{id, data_hora}` | apenas metadados, sem o conteúdo completo |

## 7. Arquitetura de IA

A IA é organizada como um **pipeline sequencial de 3 agentes especialistas**
mais um **orquestrador**, todos em `app/ia/`. Nenhum agente tem acesso
direto ao banco de dados — toda a base factual vem de um resumo calculado
em Python (`resumo.py`), o que evita que a IA "invente" ou recalcule
números incorretamente.

### `resumo.py` — não é um agente, é a base factual

`montar_resumo_dados(db)` roda consultas SQL e cálculos determinísticos:
faturamento por canal, ticket médio, top 5 produtos mais vendidos, giro de
estoque por produto, produtos parados, produtos com estoque baixo e
quantidade de pedidos nos últimos 30 dias. Esse dicionário é o único
"input de dados" que os agentes recebem — eles só interpretam,
nunca recalculam.

### Agente 1 — `agente_kpis.py` (interpretação de KPIs)

- **Entrada:** o `resumo` (JSON).
- **Saída:** `{"interpretacao": "..."}` — texto curto (até 2 parágrafos)
  comparando os canais e apontando tendências.
- **Mecanismo:** **tool use forçado** (`tool_choice={"type": "tool", "name": "registrar_interpretacao"}`),
  não JSON solto em texto.

```python
FERRAMENTA_INTERPRETACAO = {
    "name": "registrar_interpretacao",
    "input_schema": {
        "type": "object",
        "properties": {"interpretacao": {"type": "string", "description": "..."}},
        "required": ["interpretacao"],
    },
}
```

**Por que tool use aqui:** o comentário no próprio código explica a
motivação — pedir JSON solto em texto livre está sujeito a três falhas
comuns: (1) o modelo envolver a resposta em blocos de markdown
(` ```json ... ``` `), (2) quebras de linha literais dentro de uma string
tornarem o JSON tecnicamente inválido, e (3) um parsing manual por
`texto.find("{")` / `texto.rfind("}")` falhar nesses casos. Com tool use,
a API da Anthropic já garante que o campo `input` do bloco `tool_use` é um
objeto estruturado válido — não haveria texto solto para interpretar.
Como bônus, o `max_tokens` pode ser bem menor (600), pois não sobra
"conversa" nem formatação ao redor do dado que interessa.

### Agente 2 — `agente_anomalias.py` (detecção de anomalias)

- **Entrada:** `resumo` + a interpretação do Agente 1.
- **Saída esperada:** `{"alertas": [{"titulo", "descricao", "severidade": "alta|media|baixa", "produto_relacionado"}]}`.
- **Mecanismo:** **JSON solto em texto livre**, extraído com
  `texto.find("{")` / `texto.rfind("}")` e `json.loads`. Se o parsing
  falhar, devolve `{"alertas": [], "erro": texto}` em vez de quebrar a
  requisição.

### Agente 3 — `agente_recomendacoes.py` (recomendações de ação)

- **Entrada:** `resumo` + interpretação do Agente 1 + anomalias do Agente 2.
- **Saída esperada:** `{"acoes": [{"titulo", "descricao", "prioridade": "alta|media|baixa"}]}`.
- **Mecanismo:** o mesmo padrão de JSON solto em texto do Agente 2, com o
  mesmo fallback (`{"acoes": [], "erro": texto}`).

**Por que os agentes 2 e 3 não usam tool use (assimetria intencional):**
o código não formaliza essa decisão em comentário, mas a diferença de
mecanismo é consistente com a diferença de formato de saída: o Agente 1
devolve um único campo de texto livre (schema trivial, ideal para tool
use), enquanto os Agentes 2 e 3 devolvem **listas de tamanho variável** de
objetos (zero a N alertas/ações). Isso é perfeitamente modelável como tool
use também (bastaria um `input_schema` com um array), então essa parte é
uma simplificação do projeto — ver seção 11 — e não uma limitação técnica
da abordagem.

### `orquestrador.py` — consolidação

```python
def executar_analise(db: Session) -> dict:
    resumo = montar_resumo_dados(db)
    interpretacao_kpis = agente_kpis.executar(resumo)
    anomalias = agente_anomalias.executar(resumo, interpretacao_kpis)
    recomendacoes = agente_recomendacoes.executar(resumo, interpretacao_kpis, anomalias)
    ...
```

Os agentes rodam **em sequência, não em paralelo**, porque cada um recebe
a saída do anterior como contexto adicional (anomalias levam em conta a
interpretação dos KPIs; recomendações levam em conta KPIs + anomalias).
O orquestrador monta o dicionário final (`{kpis, anomalias, recomendacoes,
gerado_em}`), serializa cada bloco com `json.dumps` e salva uma linha em
`AnaliseIA`, além de devolver o resultado para a rota `/ia/analisar`
responder ao navegador.

### `cliente_claude.py` — infraestrutura compartilhada

Centraliza:
- `obter_cliente()` — instancia (uma única vez, cache em variável de
  módulo) o `anthropic.Anthropic` com a chave de `ANTHROPIC_API_KEY`.
- `obter_modelo()` — lê `ANTHROPIC_MODEL` do ambiente (padrão
  `"claude-sonnet-5"`).
- `extrair_texto(resposta)` — pega o primeiro bloco de texto da resposta;
  existe porque, com *extended thinking* habilitado, o primeiro bloco pode
  ser um `ThinkingBlock` sem atributo `.text`, então não dá para assumir
  `content[0]` diretamente.
- `extrair_tool_input(resposta, nome_tool)` — usado pelo Agente 1 para
  puxar o campo `input` do bloco `tool_use`.

## 8. Frontend

Não há framework de frontend (React/Vue/Angular) nem build step (Vite/
Webpack): é **Jinja2 (HTML server-side) + JavaScript puro por página**,
com um script global compartilhado.

### Organização

- `templates/base.html` define o layout comum: sidebar de navegação
  (destaca a página ativa via `pagina_ativa`), fontes do Google Fonts,
  CSS global, Chart.js via CDN e `common.js`. Cada página
  (`produtos.html`, `pedidos.html` etc.) estende `base.html` e declara seu
  próprio bloco `scripts`, carregando o JS específico daquela tela
  (`produtos.js`, `pedidos.js`, ...).
- `base.html` também injeta o papel do usuário logado como variável global
  de JavaScript: `window.PAPEL_USUARIO = "{{ usuario.papel }}"` — usada
  pelas telas para esconder botões de editar/excluir quando o usuário é
  `"assistente"` (ver seção 9).
- `static_version()` (registrada em `main.py` como global do Jinja2) anexa
  o timestamp de modificação do arquivo como query string
  (`?v=1234567`) nos links de CSS/JS, forçando o navegador a buscar a
  versão nova sempre que o arquivo muda — sem precisar de um sistema de
  build com hash de conteúdo.

### Componentes reutilizáveis (`common.js`)

- **`chamarApi(url, opcoes)`** — wrapper de `fetch` usado por todas as
  páginas: define `Content-Type: application/json`, redireciona para
  `/login` automaticamente em 401, trata 204 (sem corpo) e lança um
  `Error` com a mensagem vinda de `detail` da API em caso de erro (inclui
  o caso de `detail` ser uma lista de erros de validação do Pydantic).
- **`confirmarAcao(mensagem)`** — modal de confirmação assíncrono
  (`Promise<boolean>`) que substitui `window.confirm`, usado antes de
  excluir produtos/pedidos.
- **`exibirMensagem(mensagem, titulo)`** — modal de aviso assíncrono que
  substitui `window.alert`.
- **`exibirToast(mensagem, tipo)`** — notificação temporária no canto
  superior direito (tipos `sucesso`/`erro`/`aviso`), usada para feedback
  rápido após criar/editar/excluir algo ou rodar a análise de IA.
- **`escaparHtml(texto)`** — escapa texto antes de injetar em `innerHTML`,
  usado em todo lugar que renderiza dados vindos da API (proteção básica
  contra XSS refletido via nomes de produto/cliente).

### Comunicação com a API

Cada `*.js` de página segue o mesmo padrão: busca dados via
`chamarApi(...)` ao carregar a página, guarda em uma variável de cache
local (ex.: `produtosCache`), renderiza HTML manualmente via template
strings (`innerHTML`) e reage a eventos de clique/submit chamando a API de
novo (POST/PUT/DELETE) e re-renderizando. Não há nenhuma biblioteca de
componentes ou de data-binding — tudo é manipulação direta do DOM.

O `painel_ia.js` é o mais específico: ao carregar a página, busca
`/ia/ultima` para mostrar a análise mais recente (se houver); o botão
"Analisar agora"/"Reanalisar" dispara `POST /ia/analisar` e, com o
resultado, desenha dois gráficos de barra (Chart.js) — faturamento por
canal e top produtos vendidos — além de listas de cards de anomalia e
recomendação, agrupados por severidade/prioridade com contagem em chips
(ex.: "3 críticas · 1 atenção").

## 9. Autenticação/autorização

O sistema **tem** autenticação e autorização baseada em sessão e papéis
(implementadas em `app/auth.py`):

- **Login:** formulário HTML (`POST /login`) valida usuário/senha contra a
  tabela `usuarios`. A senha é conferida com PBKDF2-HMAC-SHA256
  (200.000 iterações, salt aleatório de 16 bytes por usuário,
  formato armazenado `salt_hex$hash_hex`) usando `hmac.compare_digest`
  para evitar timing attack na comparação.
- **Sessão:** ao autenticar, `{"id", "login", "papel"}` do usuário é
  gravado em `request.session["usuario"]`. A sessão é implementada pelo
  `SessionMiddleware` do Starlette, que grava esses dados num **cookie
  assinado** (`itsdangerous`) — não há tabela de sessões no banco. O
  segredo de assinatura vem de `SESSION_SECRET_KEY` (variável de
  ambiente; há um valor padrão de desenvolvimento no código-fonte, que
  **precisa** ser trocado antes de qualquer uso fora da máquina local).
- **Logout:** `GET /logout` simplesmente limpa a sessão
  (`request.session.clear()`).
- **Papéis:** dois papéis fixos, `"admin"` e `"assistente"`. Não há
  cadastro de papéis customizados nem tela de gestão de usuários — os
  dois usuários são criados por `seed.py` lendo senha de
  `SEED_SENHA_ADMIN`/`SEED_SENHA_ASSISTENTE`.
- **Proteção de rotas:**
  - `auth.exigir_login` (dependency do FastAPI) — barra qualquer rota de
    API sem sessão válida, devolvendo 401.
  - `auth.exigir_admin` — além de exigir login, barra usuários com papel
    diferente de `"admin"`, devolvendo 403. Usado em todas as rotas de
    escrita (POST/PUT/DELETE) de produtos e pedidos.
  - As rotas que renderizam páginas HTML (`/`, `/produtos-page`, etc., em
    `main.py`) verificam a sessão manualmente e redirecionam (303) para
    `/login` se não houver usuário logado.
  - `/ia/analisar` exige apenas login — o assistente também pode disparar
    a análise, ela é tratada como leitura/consulta, não como escrita de
    dados operacionais.
- **No frontend**, a restrição por papel é reforçada apenas visualmente:
  `window.PAPEL_USUARIO` (injetado no `base.html`) é usado por
  `produtos.js`/`pedidos.js` para esconder os botões de editar/excluir
  quando o papel não é `"admin"`. Isso é só uma conveniência de UI — a
  garantia real de segurança está nas dependencies do FastAPI
  (`exigir_admin`), já que qualquer chamada direta à API por um usuário
  "assistente" autenticado, mesmo sem os botões visíveis, seria barrada
  pelo backend com 403.

## 10. Como rodar o projeto localmente

### Pré-requisitos

- Python 3.10+ (o ambiente de desenvolvimento usa 3.13).
- Uma chave de API da Anthropic (https://console.anthropic.com/) — apenas
  para usar o Painel de IA; as demais telas funcionam sem ela.

### Variáveis de ambiente (`.env`, com base em `.env.example`)

| Variável | Obrigatória? | Papel |
|---|---|---|
| `ANTHROPIC_API_KEY` | só para o Painel de IA | chave usada por `cliente_claude.obter_cliente()` |
| `ANTHROPIC_MODEL` | não (padrão `claude-sonnet-5`) | modelo usado nas chamadas à Anthropic |
| `SESSION_SECRET_KEY` | recomendada | assina o cookie de sessão; há um valor padrão inseguro no código para desenvolvimento |
| `SEED_SENHA_ADMIN` | não (padrão `admin123`) | senha do usuário `admin` criado por `seed.py` |
| `SEED_SENHA_ASSISTENTE` | não (padrão `assistente123`) | senha do usuário `assistente` criado por `seed.py` |
| `DATABASE_URL` | não (padrão `sqlite:///./fama_fashion.db`) | lida em `database.py`, não documentada no `.env.example` mas suportada |

### Passo a passo

```bash
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac

pip install -r requirements.txt

copy .env.example .env         # Windows
# cp .env.example .env         # Linux/Mac
# edite o .env e cole sua ANTHROPIC_API_KEY
```

### Popular o banco com dados de exemplo (seed)

```bash
python seed.py
```

Cria (se ainda não existirem) os usuários `admin`/`admin123` e
`assistente`/`assistente123`, 16 produtos fixos e ~40 pedidos simulados
dos últimos ~55 dias — incluindo casos propositais de "produto parado"
(sem vendas) e "queda brusca de vendas" (vendas só entre 42–55 dias atrás),
usados para a IA ter algo relevante a apontar. O script é idempotente para
produtos (se já existir algum produto, não insere de novo).

### Rodar o servidor

```bash
uvicorn app.main:app --reload
```

Acessar http://127.0.0.1:8000/ — redireciona para `/login` se não houver
sessão ativa.

### Rodar os testes automatizados

```bash
pytest -v
```

Os testes usam um banco SQLite em memória (isolado por teste, ver
`tests/conftest.py`) e nunca chamam a API real da Anthropic — as
respostas dos agentes de IA são simuladas via `monkeypatch` nos testes que
envolvem `app/ia/`.

## 11. Limitações conhecidas e possíveis melhorias futuras

Este é um projeto de TCC de ensino médio, feito para demonstrar conceitos
(CRUD, autenticação por papéis, orquestração de agentes de IA), não um
sistema pronto para produção. Simplificações deliberadas:

- **Banco SQLite em arquivo único**, sem migrations (Alembic ou
  equivalente) — o schema é recriado via `Base.metadata.create_all` a
  cada start; qualquer mudança de modelo em produção exigiria migração
  manual dos dados existentes.
- **`canal` e `status` de pedido são `String` livres no banco**, sem
  `Enum` nem `CHECK constraint` — a lista de status válidos por canal
  (`STATUS_POR_CANAL` em `pedidos.js`) só é aplicada no frontend; a API
  aceitaria qualquer string.
- **Resultados dos agentes de IA salvos como texto JSON** (`kpis_json`,
  `anomalias_json`, `recomendacoes_json` em `AnaliseIA`), não em colunas
  estruturadas — simples de implementar, mas impossibilita consultas SQL
  sobre o conteúdo histórico das análises (ex.: "quantas vezes o produto X
  apareceu como anomalia").
- **Agentes 2 e 3 fazem parsing de JSON solto em texto** (`find`/`rfind` +
  `json.loads`), diferente do Agente 1, que usa tool use. Isso é uma
  inconsistência intencionalmente simplificada do projeto (ver seção 7) —
  migrar os 3 agentes para tool use eliminaria o `try/except
  json.JSONDecodeError` e o fallback `{"alertas": [], "erro": texto}`.
- **Sem cadastro de usuários pela interface**: os dois únicos usuários são
  criados por `seed.py`; não há tela de administração de contas, convite
  ou recuperação de senha.
- **Sem rate limiting nem cache nas chamadas à IA**: cada clique em
  "Analisar agora" dispara 3 chamadas reais à API da Anthropic — em uso
  real isso teria custo e latência a se considerar (poderia, por exemplo,
  cachear por um intervalo mínimo entre análises).
- **Sem paginação** nas listagens (`/produtos`, `/pedidos`) — adequado
  para o volume de dados de demonstração, mas não escalaria para um
  catálogo grande.
- **Nenhuma auditoria/log de quem fez o quê**: as tabelas não guardam
  qual usuário criou/editou um produto ou pedido, apenas os dados em si.
- **`SESSION_SECRET_KEY` tem um valor padrão embutido no código-fonte**
  (`chave-dev-fama-fashion-trocar-em-producao`) — aceitável para
  desenvolvimento local, mas exigiria troca obrigatória (e validação de
  que foi trocada) antes de qualquer deploy real.
- **Sem testes de carga ou de segurança** (ex.: contra CSRF em formulários,
  brute-force de login) — o foco dos testes automatizados é
  funcional/comportamental.

Possíveis melhorias futuras, na mesma linha: mover `canal`/`status` para
`Enum` no banco, adicionar Alembic, paginação nas listagens, colunas
estruturadas (ou tabela normalizada) para o histórico de IA, tela de
gestão de usuários, e uniformizar os 3 agentes de IA para usar tool use.
