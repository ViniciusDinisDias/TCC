# 📊 Fashion Analytics — Análise Inteligente de Estoque com IA

TCC de ensino médio: sistema web de **análise inteligente de estoque e pedidos com IA**, desenvolvido para a "Fama Fashion", uma loja fictícia de roupas femininas que vende em dois canais (loja física e Shopee).

> O núcleo do projeto é o motor de análise por IA. O cadastro de produtos e o registro de pedidos existem como base operacional necessária para alimentar essa análise com dados reais — não são o produto final, são o alicerce dele.

---

## ⚠️ Problema

A Fama Fashion expandiu suas vendas para o Shopee, mas nunca teve nenhum controle estruturado de estoque ou pedidos. Toda a gestão era manual, sem registro, sem histórico e sem separação entre os pedidos da loja física e os do canal online. Como consequência:

- Nenhuma visibilidade sobre produtos com estoque baixo ou parado
- Nenhuma forma de saber qual canal era mais lucrativo
- Nenhum mecanismo de análise que apoiasse decisões de reposição, precificação ou prevenção de ruptura

---

## 🎯 Objetivo

**Geral:** desenvolver um sistema web de gestão de estoque e pedidos, com um módulo de análise inteligente baseado em IA, capaz de transformar dados operacionais brutos da Fama Fashion em indicadores, alertas e recomendações que apoiem a tomada de decisão logística e comercial.

**Específicos:**
1. Cadastro, edição e exclusão de produtos (categoria, tamanho, cor, preço, estoque mínimo)
2. Registro e acompanhamento de pedidos, diferenciando loja física e Shopee
3. Visão consolidada de estoque, com valor total imobilizado e produtos em risco de ruptura
4. Arquitetura de orquestração de agentes de IA especializados (KPIs, anomalias, recomendações)
5. Painel visual com os resultados da IA, priorizados por severidade
6. Interface web responsiva com identidade visual própria

---

## 🧠 Uso de Inteligência Artificial

A IA é organizada como um **pipeline sequencial de 3 agentes especialistas** mais um **orquestrador** (`app/ia/`), usando a API da Anthropic (Claude). Nenhum agente acessa o banco diretamente — todos recebem um **resumo já calculado em Python** (`resumo.py`): faturamento por canal, ticket médio, giro de estoque, produtos parados. A IA **interpreta, nunca recalcula ou inventa números**.

| Agente | Entrada | Saída | Mecanismo |
|---|---|---|---|
| KPIs | resumo | interpretação textual das tendências | tool use forçado (JSON estruturado garantido pela API) |
| Anomalias | resumo + interpretação | lista de alertas por severidade (alta/média/baixa) | JSON em texto livre |
| Recomendações | resumo + interpretação + anomalias | lista de ações por prioridade | JSON em texto livre |

O orquestrador chama os três em sequência (cada um usa o contexto do anterior), consolida o resultado e salva o histórico no banco.

---

## 🏗️ Arquitetura do Sistema

Aplicação **monolítica server-side**: FastAPI serve tanto o HTML (Jinja2) quanto a API JSON consumida por JavaScript puro no navegador — sem framework de frontend nem build step.

```
Navegador (HTML/CSS/JS) ⇄ FastAPI (routers + regras de negócio) ⇄ SQLite (SQLAlchemy)
                                     │
                                     ▼ (sob demanda)
                            API Anthropic (Claude) — 3 agentes de IA
```

---

## 🗄️ Modelagem de Dados

- **Produto** — sku, nome, categoria, tamanho, cor, preço, estoque atual e mínimo
- **Pedido** — canal (loja física/Shopee), cliente, status, valor total
- **ItemPedido** — associa Produto e Pedido, com quantidade e preço no momento da compra
- **Usuario** — login, senha (hash PBKDF2), papel (admin/assistente)
- **AnaliseIA** — histórico das análises geradas (KPIs, anomalias, recomendações)

DER e MER completos estão em `docs/`.

---

## 📏 Regras de Negócio

- Criar um pedido debita o estoque automaticamente; cancelar ou excluir devolve a quantidade
- Um produto não pode ser excluído se já foi usado em algum pedido (preserva o histórico)
- `admin` tem acesso total (CRUD); `assistente` só consulta e pode rodar a análise de IA
- Pedidos cancelados são excluídos de todos os cálculos de faturamento/KPI

---

## ⚙️ Funcionalidades

- Cadastro, edição e exclusão de produtos
- Registro e acompanhamento de pedidos por canal, com baixa/devolução automática de estoque
- Visão consolidada de estoque com busca, severidade e filtro de estoque baixo
- Dashboard com KPIs do mês, gráfico de vendas e alertas
- Painel de análise de IA com KPIs, gráficos, anomalias e recomendações
- Autenticação por sessão com dois papéis de usuário
- Notificações (toasts) de sucesso/erro em todas as ações

---

## 🧩 Stack Tecnológica

| Tecnologia | Papel |
|---|---|
| FastAPI | Framework web e API |
| SQLAlchemy + SQLite | ORM e banco de dados |
| Jinja2 | Templates HTML server-side |
| JavaScript puro | Frontend dinâmico (sem framework) |
| Chart.js | Gráficos do dashboard e do painel de IA |
| SDK Anthropic (Claude) | Agentes de IA |
| Pytest | Testes automatizados |

---

## 🎨 Identidade Visual

Sistema: **Fashion Analytics** (o nome "Fama Fashion" é a loja atendida por ele, não o sistema em si). Monograma geométrico "FA" — serve às duas marcas ao mesmo tempo. Gradiente `#9C2B4E → #5C1631`, tipografia Fraunces (títulos) e IBM Plex Sans (corpo).

---

## 🚀 Como rodar localmente

```bash
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

pip install -r requirements.txt
copy .env.example .env       # cole sua ANTHROPIC_API_KEY

python seed.py                # popula usuários, produtos e pedidos de exemplo
uvicorn app.main:app --reload
```

Acesse `http://127.0.0.1:8000/`. Usuários de exemplo: `admin`/`admin123` e `assistente`/`assistente123`.

---

## 📈 Estágio Atual

Sistema praticamente concluído: todas as telas funcionais (Resumo, Produtos, Pedidos, Estoque, Painel de IA), CRUD completo e o pipeline de IA funcionando de ponta a ponta. Restam apenas ajustes finais de refinamento visual.

**Limitações conhecidas** (simplificações conscientes de escopo de TCC): sem paginação nas listagens, sem cache nas chamadas de IA, `canal`/`status` como `String` livre em vez de `Enum`, resultados da IA salvos como JSON serializado em vez de colunas estruturadas.

---

## 🧠 Justificativa Técnica

O uso de agentes de IA especializados, alimentados exclusivamente por dados já calculados em Python, permite gerar interpretações e recomendações confiáveis — sem o risco de a IA "inventar" números — enquanto mantém a arquitetura simples o suficiente para um projeto de TCC de ensino médio.

---

## 🏁 Conclusão

O Fashion Analytics transforma os dados brutos de estoque e vendas da Fama Fashion em indicadores, alertas e recomendações acionáveis, demonstrando na prática como uma arquitetura de orquestrador com agentes de IA especializados pode apoiar decisões reais de um pequeno varejista de moda.
