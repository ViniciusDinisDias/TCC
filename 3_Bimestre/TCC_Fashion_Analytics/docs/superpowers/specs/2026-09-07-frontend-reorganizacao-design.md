# Reorganização do frontend — Fama Fashion

Data: 2026-09-07

## Contexto

O visual proposto no mockup (sidebar + cards, aprovado pelo usuário) vira a
base definitiva da aplicação. Este documento não redesenha nada — define como
o conteúdo de cada aba deve ser reorganizado dentro desse visual, e o mínimo
de mudanças de backend necessárias para sustentar isso. Layout, componentes
(cards, tabelas, badges, sidebar) e paleta permanecem os do mockup, só com o
fundo principal mais claro/neutro.

## Fora de escopo

- Reestruturação do código Python (routers, services, models).
- Novas seções de menu além de Resumo/Produtos/Pedidos/Estoque/Painel de IA.
- Qualquer "4ª categoria" de IA (ex. "Oportunidades") que o backend não gera hoje.

## 1. Fundo e tokens visuais

- `--surface` passa de um off-white rosado para um branco-gelo neutro
  (`#F7F8F7` claro / mantém dark mode do mockup inalterado).
- Cards, bordas, sombras, sidebar (tom vinho escuro) e paleta de accent/status
  continuam exatamente como no mockup aprovado.

## 2. Rotas de página (main.py)

| Rota | Página | Observação |
|---|---|---|
| `GET /` | Resumo (dashboard) | Nova página inicial |
| `GET /produtos-page` | Produtos | Antes vivia em `/` |
| `GET /pedidos-page` | Pedidos | Sem mudança de rota |
| `GET /estoque-page` | Estoque | Sem mudança de rota |
| `GET /painel-ia` | Painel de IA | Sem mudança de rota |

Sidebar do `base.html` passa a ter 5 itens ligando para essas rotas (hoje só
tem 4, sem "Resumo").

## 3. Aba Produtos — sem mudança de escopo

Continua sendo só o catálogo: formulário de cadastro/edição + tabela de
produtos cadastrados (SKU, nome, categoria, tamanho, cor, preço, estoque
atual, ações). Reskin visual apenas (tabela/form com os componentes do
mockup). Nenhum dado de pedido/estoque financeiro/IA entra aqui.

## 4. Aba Pedidos — tabela objetiva

Tabela final, nesta ordem: **Cliente, Canal, Data, Status, Valor**, mais uma
coluna de **Ações** (alterar status / excluir) — mantida porque é controle
operacional, não "informação" extra. A coluna `#` (id) sai da exibição.
Formulário de criação de pedido continua existindo (é a única forma de criar
pedido no sistema), reestilizado com os componentes do mockup.

## 5. Aba Estoque — quantidade + valor financeiro

Topo: card único de destaque **"Valor total do estoque"**.

Abaixo, tabela: **Produto, Quantidade, Valor unitário, Valor em estoque**
(quantidade × valor unitário, por item). Os cards/colunas de "estoque baixo"
e "produtos parados" saem desta página — essa informação de alerta passa a
viver só no Dashboard (seção 6).

Backend: `GET /estoque/resumo` precisa incluir `preco` e `valor_estoque` por
produto no array retornado (hoje só manda sku/nome/quantidade/estoque_minimo).
Mudança aditiva, não quebra nada que já consome esse endpoint.

## 6. Painel de IA — estado vazio até o clique

Nada muda no fluxo (`/ia/ultima` no load, `/ia/analisar` no clique) — isso já
funciona assim. Muda a apresentação:

**Antes do clique / sem análise prévia:** card centralizado — ícone, título
"Análise inteligente", texto "Clique no botão abaixo para analisar seus dados
e receber insights da IA.", botão **"Analisar com IA"**. Nenhum KPI, gráfico,
anomalia ou recomendação visível nesse estado.

**Durante:** botão em estado "Analisando..." (já existe).

**Depois:** os 3 grupos que a IA já gera hoje, como seções/cards separados:
KPIs (interpretação + números), Anomalias (alertas), Recomendações (ações).
Sem inventar uma 4ª categoria.

## 7. Dashboard / Resumo (nova página)

Reaproveita o layout do mockup:

- KPIs: faturamento do mês, pedidos do mês, ticket médio, valor total em
  estoque — cada um com variação % vs. mês anterior.
- Gráfico de barras: faturamento dos últimos 6 meses.
- Painel de alertas de estoque: produtos com estoque baixo + produtos
  parados (mesma lógica de `servicos_estoque`), com selo crítico/atenção.
- Tabela "Últimos pedidos": 5 mais recentes (cliente, canal, data, status,
  valor).

Backend novo: `GET /dashboard/resumo`, endpoint único que agrega os dados
acima (reaproveitando `servicos_estoque` e queries de `Pedido`). Único
endpoint novo do projeto — necessário porque essa página não existia antes.

## Checklist de implementação

1. Ajustar `estilos.css`: token de fundo mais claro/neutro.
2. `base.html`: sidebar com 5 itens (Resumo, Produtos, Pedidos, Estoque,
   Painel de IA) e destaque do item ativo.
3. `main.py`: mover rota de produtos para `/produtos-page`, `/` vira Resumo.
4. Novo router `dashboard.py` com `GET /dashboard/resumo`.
5. Nova `resumo.html` + `resumo.js` (dashboard).
6. `estoque.py`: incluir `preco`/`valor_estoque` no `/estoque/resumo`.
7. `estoque.html`/`estoque.js`: tabela nova (Produto/Quantidade/Valor
   unitário/Valor em estoque), remover cards de baixo estoque/parado.
8. `pedidos.html`/`pedidos.js`: reordenar colunas, remover `#`.
9. `produtos.html`/`produtos.js`: reskin sem mudar campos.
10. `painel_ia.html`/`painel_ia.js`: estado vazio + resultado em seções,
    sem alterar chamadas de API.
11. Ajustar/whitelistar testes existentes que dependem de rota `/` ou de
    campos de `/estoque/resumo` (ver `tests/test_pagina_produtos.py`,
    `tests/test_rotas_estoque.py`, `tests/test_main.py`).
