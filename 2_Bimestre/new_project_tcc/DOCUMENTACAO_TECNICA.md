# Documentação Técnica — Sistema de Análise de Estoque com IA

**Versão:** 1.0  
**Data:** Maio de 2026  
**Projeto:** TCC — Sistema Inteligente de Análise de Estoque  
**Domínio:** Confecção Feminina  

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura do Sistema](#2-arquitetura-do-sistema)
3. [Tecnologias Utilizadas](#3-tecnologias-utilizadas)
4. [Estrutura de Pastas](#4-estrutura-de-pastas)
5. [Banco de Dados — Modelagem](#5-banco-de-dados--modelagem)
6. [Backend — API REST](#6-backend--api-rest)
7. [Frontend — Interface Web](#7-frontend--interface-web)
8. [Integração com Inteligência Artificial](#8-integração-com-inteligência-artificial)
9. [Segurança e Autenticação](#9-segurança-e-autenticação)
10. [Guia de Execução com Docker](#10-guia-de-execução-com-docker)
11. [Guia de Execução sem Docker](#11-guia-de-execução-sem-docker)
12. [Variáveis de Ambiente](#12-variáveis-de-ambiente)
13. [Endpoints da API](#13-endpoints-da-api)
14. [Credenciais de Acesso](#14-credenciais-de-acesso)

---

## 1. Visão Geral

O **Sistema de Análise de Estoque com IA** é uma aplicação web full-stack desenvolvida como Trabalho de Conclusão de Curso (TCC). O sistema tem como objetivo substituir processos manuais e planilhas na gestão de estoque de uma confecção feminina, oferecendo:

- **Controle de estoque** em múltiplos canais de venda (Loja Física, Online, Revendedores)
- **Gestão de produtos** com CRUD completo, categorias e indicadores de margem
- **Rastreabilidade** de todas as movimentações (entradas, saídas, transferências)
- **Dashboard analítico** com KPIs e gráficos em tempo real
- **Análise inteligente** via Inteligência Artificial (Claude/Anthropic) com geração automática de insights, previsão de demanda e recomendações estratégicas

### Problema Resolvido

| Problema | Solução Implementada |
|----------|---------------------|
| Excesso de produtos (overstock) | Alertas automáticos de estoque máximo |
| Falta de produtos (ruptura) | Alertas de estoque crítico abaixo do mínimo |
| Baixa visibilidade de dados | Dashboard centralizado com gráficos em tempo real |
| Decisões baseadas em intuição | Análise IA com previsões e recomendações |
| Controle manual por planilhas | Sistema web acessível de qualquer dispositivo |

---

## 2. Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────┐
│                    USUÁRIO (Browser)                │
└───────────────────────────┬─────────────────────────┘
                            │ HTTP/HTTPS
                            ▼
┌─────────────────────────────────────────────────────┐
│              FRONTEND — React + Vite                │
│                   localhost:5173                    │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │Dashboard │  │Produtos  │  │Análise IA        │  │
│  │Estoque   │  │Login     │  │Sidebar/Nav       │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│                                                     │
│  Zustand (Estado) │ Axios (HTTP) │ React Router     │
└───────────────────────────┬─────────────────────────┘
                            │ REST API (JSON)
                            ▼
┌─────────────────────────────────────────────────────┐
│              BACKEND — NestJS + Node.js             │
│                   localhost:3001                    │
│                                                     │
│  Controller → Service → Repository (Prisma)         │
│                                                     │
│  ┌────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Auth   │ │Produtos │ │ Estoque  │ │Análise IA│  │
│  │ JWT    │ │Categ.   │ │Moviment. │ │Dashboard │  │
│  └────────┘ └─────────┘ └──────────┘ └──────────┘  │
│                                                     │
│  Prisma ORM │ JWT Passport │ Swagger │ Helmet       │
└──────┬────────────────────────────────┬─────────────┘
       │                                │ HTTP
       ▼                                ▼
┌──────────────┐               ┌─────────────────────┐
│  PostgreSQL  │               │  Claude AI (Anthropic│
│  porta 5432  │               │  API externa)       │
└──────────────┘               └─────────────────────┘
```

### Fluxo de Dados

```
Usuário → Login → JWT Token → Requisições autenticadas
       → Dashboard ← API /dashboard (KPIs agregados)
       → Produtos ← API /produtos (CRUD + estoque)
       → Estoque ← API /movimentacoes (histórico)
       → Análise IA → API /analise-ia/gerar → Claude AI → Insights
```

---

## 3. Tecnologias Utilizadas

### Frontend

| Tecnologia | Versão | Finalidade |
|-----------|--------|-----------|
| React | 18.3.1 | Framework UI |
| TypeScript | 5.7.2 | Tipagem estática |
| Vite | 6.3.5 | Bundler e dev server |
| Tailwind CSS | 4.1.12 | Estilização utilitária |
| shadcn/ui | — | Componentes UI (Radix UI) |
| Zustand | 5.0.3 | Gerenciamento de estado global |
| Axios | 1.7.9 | Cliente HTTP |
| React Router | 7.13.0 | Roteamento SPA |
| Recharts | 2.15.2 | Gráficos e visualizações |
| React Hook Form | 7.55.0 | Formulários |
| Sonner | 2.0.3 | Notificações toast |
| Lucide React | 0.487.0 | Ícones |

### Backend

| Tecnologia | Versão | Finalidade |
|-----------|--------|-----------|
| NestJS | 10.x | Framework Node.js |
| Node.js | 20 | Runtime JavaScript |
| TypeScript | 5.7.2 | Tipagem estática |
| Prisma ORM | 6.x | Mapeamento objeto-relacional |
| PostgreSQL | 16 | Banco de dados relacional |
| Passport + JWT | — | Autenticação |
| @nestjs/swagger | 7.x | Documentação OpenAPI |
| bcrypt | 5.1.1 | Hash de senhas |
| @anthropic-ai/sdk | 0.39 | Integração Claude AI |
| Helmet | 8.x | Segurança HTTP |
| class-validator | 0.14.1 | Validação de DTOs |

### Infraestrutura

| Tecnologia | Finalidade |
|-----------|-----------|
| Docker | Containerização dos serviços |
| Docker Compose | Orquestração multi-container |
| GitHub | Controle de versão |

---

## 4. Estrutura de Pastas

```
TCC/
├── Projeto_TCC/
│   ├── docker-compose.yml              # Orquestração Docker
│   ├── SETUP.md                        # Guia rápido de execução
│   ├── DOCUMENTACAO_TECNICA.md         # Este arquivo
│   └── Sistema_de_Analise_de_Estoque/  # Raiz do projeto
│       │
│       ├── .env.example                # Template de variáveis (frontend)
│       ├── .gitignore                  # Arquivos ignorados pelo git
│       ├── package.json                # Dependências frontend
│       ├── tsconfig.json               # Config TypeScript
│       ├── vite.config.ts              # Config Vite
│       ├── Dockerfile.frontend         # Docker do frontend
│       │
│       ├── src/                        # Código-fonte frontend
│       │   ├── main.tsx                # Entry point React
│       │   ├── vite-env.d.ts           # Tipos Vite
│       │   │
│       │   ├── types/
│       │   │   └── index.ts            # Tipos TypeScript globais
│       │   │
│       │   ├── services/               # Camada de acesso à API
│       │   │   ├── api.ts              # Instância axios + interceptors
│       │   │   ├── authService.ts      # Login, logout, refresh
│       │   │   ├── produtosService.ts  # CRUD produtos
│       │   │   ├── estoqueService.ts   # Estoque e movimentações
│       │   │   ├── categoriasService.ts
│       │   │   ├── dashboardService.ts
│       │   │   └── analiseService.ts   # Análise IA
│       │   │
│       │   ├── store/                  # Estado global (Zustand)
│       │   │   ├── authStore.ts        # Autenticação
│       │   │   ├── produtosStore.ts    # Produtos
│       │   │   ├── estoqueStore.ts     # Estoque e movimentações
│       │   │   └── dashboardStore.ts   # Dashboard
│       │   │
│       │   ├── pages/
│       │   │   └── LoginPage.tsx       # Tela de login
│       │   │
│       │   └── app/
│       │       ├── App.tsx             # Roteamento e guards
│       │       └── components/
│       │           ├── Dashboard.tsx   # Página dashboard
│       │           ├── Produtos.tsx    # Página produtos
│       │           ├── Estoque.tsx     # Página estoque
│       │           ├── AnaliseIA.tsx   # Página análise IA
│       │           ├── Sidebar.tsx     # Menu lateral
│       │           └── ui/             # Componentes shadcn/ui
│       │
│       └── backend/                    # Código-fonte backend
│           ├── .env.example            # Template de variáveis
│           ├── package.json            # Dependências NestJS
│           ├── tsconfig.json           # Config TypeScript
│           ├── nest-cli.json           # Config NestJS CLI
│           ├── Dockerfile              # Docker do backend
│           │
│           ├── prisma/
│           │   ├── schema.prisma       # Schema do banco de dados
│           │   ├── seed.ts             # Dados iniciais
│           │   └── migrations/         # Histórico de migrations
│           │
│           └── src/
│               ├── main.ts             # Entry point NestJS
│               ├── app.module.ts       # Módulo raiz
│               │
│               ├── auth/               # Autenticação JWT
│               │   ├── auth.controller.ts
│               │   ├── auth.service.ts
│               │   ├── auth.module.ts
│               │   ├── dto/            # Login, Register, RefreshToken
│               │   ├── guards/         # JwtAuthGuard, RolesGuard
│               │   └── strategies/     # JwtStrategy
│               │
│               ├── prisma/             # Serviço global Prisma
│               ├── common/             # Filtros, interceptors, decorators
│               ├── usuarios/           # CRUD usuários
│               ├── produtos/           # CRUD produtos
│               ├── categorias/         # CRUD categorias
│               ├── estoque/            # Controle de estoque
│               ├── movimentacoes/      # Movimentações entrada/saída
│               ├── locais/             # Locais de armazenamento
│               ├── analise-ia/         # Integração Claude AI
│               │   └── providers/
│               │       └── anthropic.provider.ts
│               └── dashboard/          # Métricas e KPIs
```

---

## 5. Banco de Dados — Modelagem

### Diagrama de Entidades

```
EMPRESA ─────────────── USUARIO ──────────── REFRESH_TOKEN
   │                       │
   │                       │ (responsavel)
   │                  MOVIMENTACAO_ESTOQUE
   │                       │
CATEGORIA_PRODUTO      PRODUTO ─────────── ESTOQUE ──── LOCAL_ESTOQUE
   └──────────────────────┘                   │
                           │                  │
                    FICHA_TECNICA     (quantidadeDisponivel,
                           │          quantidadeReservada)
                    FICHA_TECNICA_ITEM

ORDEM_PRODUCAO ──── ORDEM_PRODUCAO_MATERIAL
       └─────────── ETAPA_PRODUCAO

ANALISE_IA (insights, previsoes, recomendacoes em JSON)
```

### Entidades Principais

#### USUARIO
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador único |
| empresaId | UUID | Empresa do usuário |
| nome | String | Nome completo |
| email | String (único) | E-mail de acesso |
| senhaHash | String | Senha criptografada (bcrypt) |
| papel | Enum | ADMIN, GERENTE, OPERADOR |
| cargo | String | Cargo descritivo |
| ativo | Boolean | Ativo/inativo |

#### PRODUTO
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador único |
| sku | String (único) | Código do produto |
| nome | String | Nome do produto |
| categoriaId | UUID | Categoria (FK) |
| tipoProduto | Enum | PRODUTO_ACABADO, MATERIA_PRIMA, INSUMO |
| precoVenda | Decimal | Preço de venda em R$ |
| precoCusto | Decimal | Custo de produção em R$ |
| estoqueMinimo | Int | Gatilho para alerta |
| ativo | Boolean | Soft delete |

#### ESTOQUE
| Campo | Tipo | Descrição |
|-------|------|-----------|
| produtoId | UUID | Produto (FK) |
| localEstoqueId | UUID | Local (FK) |
| quantidadeDisponivel | Int | Saldo atual |
| quantidadeReservada | Int | Reservado para pedidos |
| quantidadeMinima | Int | Mínimo por local |

#### MOVIMENTACAO_ESTOQUE
| Campo | Tipo | Descrição |
|-------|------|-----------|
| tipo | Enum | ENTRADA, SAIDA, TRANSFERENCIA, AJUSTE |
| produtoId | UUID | Produto movimentado |
| localOrigemId | UUID | Local de saída |
| localDestinoId | UUID | Local de entrada |
| quantidade | Int | Quantidade movimentada |
| responsavelId | UUID | Usuário responsável |
| dataMovimentacao | DateTime | Data/hora da movimentação |

#### LOCAL_ESTOQUE
| Campo | Tipo | Descrição |
|-------|------|-----------|
| nome | String | Nome do local |
| tipo | Enum | LOJA_FISICA, ONLINE, REVENDEDORES, PRODUCAO |
| endereco | String | Endereço físico |

### Enums do Sistema

```
Papel:            ADMIN | GERENTE | OPERADOR
TipoMovimentacao: ENTRADA | SAIDA | TRANSFERENCIA | AJUSTE
Canal:            PRODUCAO | LOJA_FISICA | ONLINE | REVENDEDORES | FORNECEDOR
TipoProduto:      PRODUTO_ACABADO | MATERIA_PRIMA | INSUMO
StatusOrdemProd:  PENDENTE | EM_ANDAMENTO | CONCLUIDA | CANCELADA
```

---

## 6. Backend — API REST

### Arquitetura em Camadas

```
HTTP Request
    ↓
Controller (valida DTO, chama Service)
    ↓
Service (regras de negócio, transações)
    ↓
Prisma Service (queries ao banco)
    ↓
PostgreSQL
```

### Módulos Implementados

| Módulo | Responsabilidade |
|--------|-----------------|
| `auth` | Login, registro, refresh token, logout |
| `usuarios` | CRUD de usuários, troca de papel |
| `produtos` | CRUD produtos, alertas de estoque |
| `categorias` | CRUD categorias |
| `estoque` | Visão geral, ajuste manual, histórico |
| `movimentacoes` | Registro e listagem de movimentações |
| `locais` | CRUD de locais de armazenamento |
| `analise-ia` | Geração e histórico de análises IA |
| `dashboard` | KPIs e métricas agregadas |
| `prisma` | Serviço global de conexão ao banco |
| `common` | Filtros, interceptors, decorators |

### Padrões Aplicados

- **DTO + class-validator**: Validação automática de todas as entradas
- **TransformInterceptor**: Padroniza todas as respostas em `{ success, data, timestamp }`
- **HttpExceptionFilter**: Centraliza o tratamento de erros
- **LoggingInterceptor**: Registra método, rota, status e tempo de cada requisição
- **RolesGuard**: Controle de acesso por papel (ADMIN/GERENTE/OPERADOR)
- **ThrottlerGuard**: Limite de 100 requisições por minuto por IP

---

## 7. Frontend — Interface Web

### Páginas e Funcionalidades

#### Login (`/login`)
- Formulário de autenticação com feedback de erro
- Botões de atalho para credenciais de demonstração
- Redirect automático se já autenticado

#### Dashboard (`/`)
- 4 KPIs: Total em Estoque, Movimentações do Mês, Entradas, Produtos Críticos
- Gráfico de linhas: Movimentações mensais (entradas × saídas)
- Gráfico de pizza: Estoque por categoria
- Cards: Quantidade por canal de venda
- Gráfico de barras: Distribuição por canal
- Lista: Top 5 produtos com estoque crítico

#### Produtos
- Grade de cards com todos os produtos ativos
- Filtro de busca por SKU, nome ou categoria
- Indicador visual de estoque crítico (card vermelho)
- Cálculo automático de margem de lucro
- CRUD completo: criar, editar e remover (soft delete)
- Confirmação antes de remover

#### Estoque
- Cards por canal com total de itens
- Histórico de movimentações com filtros (Todas/Entradas/Saídas)
- Formulário de nova movimentação com validação de saldo

#### Análise IA
- Seleção de período (semana/mês/trimestre/ano)
- Botão "Gerar Nova Análise" com feedback de loading
- Cards de insights (tendências, alertas, oportunidades, performance)
- Gráfico de previsão de demanda para os próximos 4 meses
- Detalhes das previsões com nível de confiança e fatores
- Recomendações estratégicas com impacto e prazo

### Gerenciamento de Estado (Zustand)

```typescript
authStore     → usuário autenticado, tokens JWT
produtosStore → lista de produtos, busca, CRUD
estoqueStore  → movimentações, locais de estoque
dashboardStore → dados do dashboard, KPIs
```

### Fluxo de Autenticação

```
Login → POST /api/auth/login
      ← { accessToken, refreshToken, usuario }
      → Salva em localStorage + Zustand
      → Guards de rota liberam acesso

Token expirado → Interceptor Axios detecta 401
              → POST /api/auth/refresh automaticamente
              → Novo token salvo
              → Requisição original reenviada
```

---

## 8. Integração com Inteligência Artificial

### Provedor: Claude (Anthropic)

O módulo `analise-ia` utiliza o modelo **Claude** da Anthropic para:

1. **Análise de contexto**: Coleta dados reais do banco (produtos, estoques, movimentações)
2. **Geração de insights**: Identifica tendências, alertas críticos e oportunidades
3. **Previsão de demanda**: Estima demanda para os próximos 4 meses com nível de confiança
4. **Recomendações**: Sugere ações estratégicas com impacto e prazo definidos

### Fluxo da Análise

```
POST /api/analise-ia/gerar?periodo=ultimo-mes
         ↓
Coleta dados reais do banco (produtos, estoque, movimentações)
         ↓
Monta prompt estruturado com o contexto
         ↓
Envia para Claude API (modelo claude-opus-4-5)
         ↓
Parse do JSON retornado
         ↓
Salva no banco (tabela analise_ia)
         ↓
Retorna para o frontend
```

### Fallback sem API Key

Se a variável `ANTHROPIC_API_KEY` não estiver configurada, o sistema **continua funcionando** com uma análise simulada baseada nos dados reais do banco, garantindo que o sistema não quebre durante desenvolvimento.

### Resposta da IA (formato JSON)

```json
{
  "insights": [
    {
      "tipo": "tendencia | alerta | oportunidade | performance",
      "titulo": "string",
      "descricao": "string",
      "prioridade": "critica | alta | media | baixa"
    }
  ],
  "previsoes": [
    {
      "mes": "string",
      "totalPrevisto": 1050,
      "confianca": 85,
      "fatores": ["Sazonalidade", "Histórico"]
    }
  ],
  "recomendacoes": [
    {
      "titulo": "string",
      "descricao": "string",
      "impacto": "alto | medio | baixo",
      "prazo": "imediato | curto | medio | longo"
    }
  ]
}
```

---

## 9. Segurança e Autenticação

### JWT (JSON Web Token)

- **Access Token**: Validade de 15 minutos
- **Refresh Token**: Validade de 7 dias, armazenado no banco de dados
- **Renovação automática**: O interceptor do Axios renova o token transparentemente

### Papéis e Permissões

| Papel | Permissões |
|-------|-----------|
| ADMIN | Acesso total, incluindo gestão de usuários |
| GERENTE | Acesso a todas as funcionalidades operacionais |
| OPERADOR | Acesso a estoque e movimentações |

### Proteções Implementadas

- **Helmet**: Headers HTTP de segurança
- **CORS**: Apenas o frontend autorizado pode acessar a API
- **Rate Limiting**: Máximo 100 req/min por IP
- **bcrypt**: Senhas armazenadas com hash (salt rounds = 10)
- **Validação de DTOs**: Todos os inputs são validados antes de processar

---

## 10. Guia de Execução com Docker

### Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e rodando
- Git instalado

### Passo 1 — Clonar o repositório

```bash
git clone https://github.com/JoaoVictorOliveiraSe/teste.git
cd teste
```

### Passo 2 — Configurar variáveis de ambiente

```bash
# Copiar o template de variáveis
cp Projeto_TCC/Sistema_de_Analise_de_Estoque/backend/.env.example \
   Projeto_TCC/Sistema_de_Analise_de_Estoque/backend/.env
```

Edite o arquivo `backend/.env` e preencha:
```env
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx   # Sua chave da API Anthropic (opcional)
JWT_SECRET=troque_por_uma_chave_forte_aqui
REFRESH_TOKEN_SECRET=outra_chave_forte_aqui
```

### Passo 3 — Subir os serviços

```bash
cd Projeto_TCC
docker-compose up -d
```

> Aguarde cerca de 30–60 segundos na primeira vez (download das imagens PostgreSQL e Node.js).

### Passo 4 — Criar o banco de dados e popular dados iniciais

```bash
# Rodar as migrations
docker exec estoque_ia_backend npx prisma migrate deploy

# Popular com dados de demonstração
docker exec estoque_ia_backend npx ts-node prisma/seed.ts
```

### Passo 5 — Acessar o sistema

| Serviço | URL |
|---------|-----|
| Frontend (React) | http://localhost:5173 |
| Backend (API) | http://localhost:3001 |
| Documentação API (Swagger) | http://localhost:3001/api/docs |

### Comandos úteis com Docker

```bash
# Ver logs do backend
docker logs estoque_ia_backend -f

# Ver logs do frontend
docker logs estoque_ia_frontend -f

# Parar todos os serviços
docker-compose down

# Parar e remover dados do banco
docker-compose down -v

# Reiniciar um serviço
docker-compose restart backend
```

---

## 11. Guia de Execução sem Docker

### Pré-requisitos

Antes de começar, instale:

| Software | Versão mínima | Download |
|----------|--------------|---------|
| Node.js | 20.x | https://nodejs.org/ |
| npm | 10.x | (incluso com Node.js) |
| PostgreSQL | 14+ | https://www.postgresql.org/download/ |
| Git | qualquer | https://git-scm.com/ |

### Passo 1 — Clonar o repositório

```bash
git clone https://github.com/JoaoVictorOliveiraSe/teste.git
cd teste/Projeto_TCC/Sistema_de_Analise_de_Estoque
```

---

### Passo 2 — Configurar o PostgreSQL

Abra o **pgAdmin** ou o terminal do PostgreSQL e execute:

```sql
-- Criar o banco de dados
CREATE DATABASE estoque_ia_db;

-- (Opcional) Criar usuário dedicado
CREATE USER estoque_user WITH PASSWORD 'sua_senha_aqui';
GRANT ALL PRIVILEGES ON DATABASE estoque_ia_db TO estoque_user;
```

---

### Passo 3 — Configurar e iniciar o Backend

#### 3.1 — Entrar na pasta do backend

```bash
cd backend
```

#### 3.2 — Instalar dependências

```bash
npm install
```

#### 3.3 — Criar o arquivo de configuração

```bash
# Windows
copy .env.example .env

# Linux / macOS
cp .env.example .env
```

Abra o arquivo `.env` e edite:

```env
# Cole a string de conexão do seu PostgreSQL
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/estoque_ia_db?schema=public"

# Chaves JWT — troque por strings longas e aleatórias
JWT_SECRET="uma_string_muito_longa_e_aleatoria_aqui_minimo_32_chars"
JWT_EXPIRATION="15m"
REFRESH_TOKEN_SECRET="outra_string_muito_longa_e_aleatoria_aqui"
REFRESH_TOKEN_EXPIRATION="7d"

# Porta do servidor
PORT=3001
NODE_ENV=development

# URL do frontend (para CORS)
CORS_ORIGIN="http://localhost:5173"

# Chave da API Anthropic (opcional — sistema funciona sem ela)
ANTHROPIC_API_KEY="sk-ant-xxxxxxxx"
```

#### 3.4 — Gerar o cliente Prisma

```bash
npx prisma generate
```

#### 3.5 — Criar as tabelas no banco

```bash
npx prisma migrate dev --name init
```

> Este comando cria todas as tabelas conforme o schema definido.

#### 3.6 — Popular com dados de demonstração

```bash
npx ts-node --project tsconfig.json prisma/seed.ts
```

Saída esperada:
```
🌱 Iniciando seed do banco de dados...
✅ Seed concluído com sucesso!

📧 Credenciais de acesso:
Admin: admin@confeccao.com.br / Admin@123
Gerente: gerente@confeccao.com.br / Gerente@123
```

#### 3.7 — Iniciar o servidor backend

```bash
npm run start:dev
```

Saída esperada:
```
🚀 Servidor rodando em: http://localhost:3001
📚 Swagger disponível em: http://localhost:3001/api/docs
✅ Conectado ao banco de dados PostgreSQL
```

> Deixe este terminal aberto. O servidor fica em modo watch (reinicia automaticamente com alterações).

---

### Passo 4 — Configurar e iniciar o Frontend

Abra um **novo terminal** e navegue até a pasta do frontend:

```bash
# A partir da raiz do projeto
cd Projeto_TCC/Sistema_de_Analise_de_Estoque
```

#### 4.1 — Instalar dependências

```bash
npm install
```

#### 4.2 — Criar o arquivo de configuração

```bash
# Windows
copy .env.example .env

# Linux / macOS
cp .env.example .env
```

O arquivo `.env` do frontend só precisa de uma variável:

```env
VITE_API_URL=http://localhost:3001/api
```

> Essa URL aponta para o backend. Se o backend estiver em outra porta ou servidor, ajuste aqui.

#### 4.3 — Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Saída esperada:
```
  VITE v6.3.5  ready in 499 ms

  ➜  Local:   http://localhost:5173/
```

---

### Passo 5 — Acessar o sistema

Abra o browser em: **http://localhost:5173**

Você verá a tela de login. Use as credenciais abaixo.

---

## 12. Variáveis de Ambiente

### Backend (`backend/.env`)

| Variável | Obrigatória | Exemplo | Descrição |
|----------|------------|---------|-----------|
| `DATABASE_URL` | ✅ Sim | `postgresql://postgres:senha@localhost:5432/db` | String de conexão PostgreSQL |
| `JWT_SECRET` | ✅ Sim | `string_aleatoria_32chars` | Chave para assinar tokens JWT |
| `JWT_EXPIRATION` | ✅ Sim | `15m` | Validade do access token |
| `REFRESH_TOKEN_SECRET` | ✅ Sim | `outra_string_aleatoria` | Chave para refresh tokens |
| `REFRESH_TOKEN_EXPIRATION` | ✅ Sim | `7d` | Validade do refresh token |
| `PORT` | ✅ Sim | `3001` | Porta do servidor |
| `NODE_ENV` | ✅ Sim | `development` | Ambiente de execução |
| `CORS_ORIGIN` | ✅ Sim | `http://localhost:5173` | URL do frontend permitida |
| `ANTHROPIC_API_KEY` | ❌ Não | `sk-ant-xxx` | Chave Claude AI (funciona sem) |

### Frontend (`Sistema_de_Analise_de_Estoque/.env`)

| Variável | Obrigatória | Exemplo | Descrição |
|----------|------------|---------|-----------|
| `VITE_API_URL` | ✅ Sim | `http://localhost:3001/api` | URL base da API backend |

---

## 13. Endpoints da API

A documentação interativa completa está disponível em: **http://localhost:3001/api/docs**

### Autenticação

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/api/auth/login` | Autenticar usuário | ❌ |
| POST | `/api/auth/register` | Registrar usuário | ❌ |
| POST | `/api/auth/refresh` | Renovar access token | ❌ |
| POST | `/api/auth/logout` | Encerrar sessão | ✅ |
| GET | `/api/auth/me` | Dados do usuário logado | ✅ |

### Produtos

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/produtos` | Listar produtos (busca: `?busca=`, `?categoriaId=`) |
| GET | `/api/produtos/baixo-estoque` | Produtos abaixo do mínimo |
| GET | `/api/produtos/:id` | Buscar por ID |
| GET | `/api/produtos/:id/estoque` | Estoque total por canal |
| POST | `/api/produtos` | Criar produto |
| PUT | `/api/produtos/:id` | Atualizar produto |
| DELETE | `/api/produtos/:id` | Remover produto (soft delete) |

### Estoque e Movimentações

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/estoque` | Listar registros de estoque |
| GET | `/api/estoque/visao-geral` | Totais por local e categoria |
| GET | `/api/movimentacoes` | Listar movimentações (paginado) |
| POST | `/api/movimentacoes` | Registrar movimentação |
| GET | `/api/movimentacoes/resumo` | Resumo dos últimos N dias |
| GET | `/api/locais` | Listar locais de armazenamento |
| GET | `/api/locais/resumo` | Resumo por local |

### Dashboard

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/dashboard` | Todos os dados em uma chamada |
| GET | `/api/dashboard/kpis` | KPIs principais |
| GET | `/api/dashboard/estoque-por-canal` | Distribuição por canal |
| GET | `/api/dashboard/movimentacoes-mensais` | Histórico mensal |

### Análise IA

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/analise-ia/gerar?periodo=ultimo-mes` | Gerar nova análise |
| GET | `/api/analise-ia/ultima` | Última análise (ou gera nova) |
| GET | `/api/analise-ia/historico` | Histórico de análises |
| GET | `/api/analise-ia/:id` | Análise específica |

---

## 14. Credenciais de Acesso

### Usuários do Seed (demonstração)

| Papel | E-mail | Senha |
|-------|--------|-------|
| Administrador | admin@confeccao.com.br | Admin@123 |
| Gerente | gerente@confeccao.com.br | Gerente@123 |

### Dados do Seed

Ao executar o seed, o sistema cria automaticamente:
- **1 empresa**: Confecção Feminina Ltda
- **2 usuários**: Admin e Gerente
- **6 categorias**: Vestidos, Blusas, Saias, Calças, Acessórios, Matéria Prima
- **10 produtos**: Vestidos (3), Blusas (3), Saias (2), Calças (2)
- **4 locais de estoque**: Loja Física, Estoque Online, Revendedores, Produção
- **Estoque inicial**: Quantidades aleatórias em cada local para cada produto
- **7 movimentações** de exemplo: entradas de produção e saídas por canal

---

## Solução de Problemas Comuns

### Backend não conecta ao banco

```
Error: Can't reach database server
```
**Solução:** Verifique se o PostgreSQL está rodando e se a `DATABASE_URL` no `.env` está correta.

### Erro de CORS no browser

```
Access to fetch has been blocked by CORS policy
```
**Solução:** Confirme que `CORS_ORIGIN` no `backend/.env` aponta para a URL exata do frontend (ex: `http://localhost:5173`).

### Porta já em uso

```
Error: listen EADDRINUSE :::3001
```
**Solução:** Mude `PORT=3002` no `backend/.env` e `VITE_API_URL=http://localhost:3002/api` no frontend `.env`.

### Prisma migration falhou

```
Error: Database does not exist
```
**Solução:** Crie o banco manualmente no PostgreSQL antes de rodar `prisma migrate dev`.

### Token inválido / expirado

Se o sistema logar e redirecionar para login automaticamente, limpe o localStorage do browser (F12 → Application → Local Storage → Clear).
