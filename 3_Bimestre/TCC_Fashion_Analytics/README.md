# Fama Fashion — Sistema de Análise Inteligente de Estoque com IA

Sistema de TCC para controle de produtos e pedidos (loja física + Shopee) da
Fama Fashion, com um painel de análise gerado por 3 agentes de IA (Claude)
orquestrados em sequência.

## Requisitos

- Python 3.10+
- Uma chave de API da Anthropic (https://console.anthropic.com/) para usar o
  Painel de IA (as demais telas funcionam sem a chave).

## Configuração

```bash
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac

pip install -r requirements.txt

copy .env.example .env         # Windows
# cp .env.example .env         # Linux/Mac
# edite o .env e cole sua ANTHROPIC_API_KEY
```

## Popular o banco com dados de exemplo

```bash
python seed.py
```

## Login

O `seed.py` cria dois usuários na primeira vez que roda:

- `admin` / `admin123` — acesso completo.
- `assistente` / `assistente123` — acesso de leitura a tudo, sem
  permissão para criar/editar/excluir produtos ou pedidos.

Troque essas senhas definindo `SEED_SENHA_ADMIN` e
`SEED_SENHA_ASSISTENTE` no `.env` **antes** de rodar `seed.py` pela
primeira vez. `SESSION_SECRET_KEY` (também no `.env`) assina o cookie de
sessão — troque-a antes de qualquer uso fora da sua máquina.

## Rodar o servidor

```bash
uvicorn app.main:app --reload
```

Acesse http://127.0.0.1:8000/ no navegador. Menu de navegação:

- **Produtos** (`/`) — CRUD de produtos
- **Pedidos** (`/pedidos-page`) — CRUD de pedidos, com baixa/devolução automática de estoque
- **Estoque** (`/estoque-page`) — visão consolidada (valor total, estoque baixo, produtos parados)
- **Painel de IA** (`/painel-ia`) — clique em "Analisar agora" para gerar KPIs, anomalias e recomendações

## Rodar os testes automatizados

```bash
pytest -v
```

Todos os testes usam um banco SQLite em memória e nunca chamam a API real da
Anthropic (as respostas da IA são simuladas/mockadas nos testes).

## Estrutura do projeto

Veja `docs/superpowers/specs/2026-09-07-fama-fashion-design.md` para a
arquitetura completa (modelo de dados, rotas, fluxo do orquestrador de IA).
