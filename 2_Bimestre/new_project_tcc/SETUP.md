# 🚀 Guia de Instalação e Execução

## Sistema de Análise de Estoque com IA

---

## Pré-requisitos

- [Node.js 20+](https://nodejs.org/)
- [PostgreSQL 16+](https://www.postgresql.org/) OU [Docker](https://www.docker.com/)
- npm ou pnpm

---

## Opção 1 — Execução com Docker (recomendado)

### 1. Clone e configure

```bash
cd TCC/Projeto_TCC

# Copiar e configurar variáveis
cp .env.example .env
# Edite .env e adicione sua ANTHROPIC_API_KEY
```

### 2. Subir tudo com Docker

```bash
docker-compose up -d
```

### 3. Acessar

| Serviço    | URL                              |
|------------|----------------------------------|
| Frontend   | http://localhost:5173            |
| Backend    | http://localhost:3001            |
| Swagger    | http://localhost:3001/api/docs   |
| PostgreSQL | localhost:5432                   |

---

## Opção 2 — Execução Manual (sem Docker)

### Pré-requisito: PostgreSQL rodando na porta 5432

### 1. Configurar Backend

```bash
cd Sistema_de_Analise_de_Estoque/backend

# Instalar dependências
npm install

# Configurar .env
cp .env.example .env
# Edite e preencha DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY

# Gerar client Prisma
npx prisma generate

# Criar banco e rodar migrations
npx prisma migrate dev --name init

# Popular banco com dados iniciais
npx ts-node prisma/seed.ts

# Iniciar servidor
npm run start:dev
```

Backend disponível em: **http://localhost:3001**
Swagger em: **http://localhost:3001/api/docs**

### 2. Configurar Frontend

```bash
cd Sistema_de_Analise_de_Estoque

# Instalar dependências (já instalado se rodou npm install)
npm install

# Configurar .env
cp .env.example .env
# VITE_API_URL=http://localhost:3001/api

# Iniciar servidor de desenvolvimento
npm run dev
```

Frontend disponível em: **http://localhost:5173**

---

## Credenciais de Acesso (seed)

| Papel       | E-mail                          | Senha        |
|-------------|----------------------------------|--------------|
| Administrador | admin@confeccao.com.br        | Admin@123    |
| Gerente     | gerente@confeccao.com.br        | Gerente@123  |

---

## Configuração da IA (Claude/Anthropic)

1. Obter chave em: https://console.anthropic.com/
2. Adicionar no `backend/.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxx
   ```

> Sem a chave, o sistema funciona normalmente com análises simuladas. A chave ativa análises reais via Claude.

---

## Estrutura do Projeto

```
Projeto_TCC/
├── docker-compose.yml
├── SETUP.md
└── Sistema_de_Analise_de_Estoque/
    ├── .env.example                 # Config frontend
    ├── package.json                 # Deps frontend
    ├── tsconfig.json                # Config TypeScript
    ├── vite.config.ts               # Config Vite
    ├── src/
    │   ├── types/index.ts           # Tipos globais TypeScript
    │   ├── services/                # Camada de API (axios)
    │   │   ├── api.ts               # Instância axios + interceptors
    │   │   ├── authService.ts
    │   │   ├── produtosService.ts
    │   │   ├── estoqueService.ts
    │   │   ├── dashboardService.ts
    │   │   ├── analiseService.ts
    │   │   └── categoriasService.ts
    │   ├── store/                   # Estado global (Zustand)
    │   │   ├── authStore.ts
    │   │   ├── produtosStore.ts
    │   │   ├── estoqueStore.ts
    │   │   └── dashboardStore.ts
    │   ├── pages/
    │   │   └── LoginPage.tsx
    │   └── app/
    │       ├── App.tsx              # Router + Auth guards
    │       └── components/
    │           ├── Sidebar.tsx      # Nav + logout
    │           ├── Dashboard.tsx    # KPIs + gráficos
    │           ├── Produtos.tsx     # CRUD produtos
    │           ├── Estoque.tsx      # Movimentações
    │           └── AnaliseIA.tsx    # Análise IA
    └── backend/
        ├── .env.example
        ├── package.json
        ├── Dockerfile
        ├── prisma/
        │   ├── schema.prisma        # Schema completo
        │   └── seed.ts              # Dados iniciais
        └── src/
            ├── main.ts              # Entry + Swagger
            ├── app.module.ts        # Módulo raiz
            ├── prisma/              # ORM global
            ├── auth/                # JWT + Refresh Token
            ├── usuarios/            # CRUD usuários
            ├── produtos/            # CRUD produtos
            ├── categorias/          # CRUD categorias
            ├── estoque/             # Controle estoque
            ├── movimentacoes/       # Movimentações
            ├── locais/              # Locais de estoque
            ├── analise-ia/          # Integração Claude AI
            │   └── providers/
            │       └── anthropic.provider.ts
            └── dashboard/           # Métricas e KPIs
```

---

## APIs Disponíveis (Swagger)

| Grupo          | Endpoints                                              |
|----------------|-------------------------------------------------------|
| auth           | POST /login, /register, /refresh, /logout, GET /me    |
| produtos       | GET, POST, PUT, DELETE /produtos                      |
| categorias     | CRUD /categorias                                      |
| estoque        | GET /estoque, /visao-geral, PATCH /ajustar            |
| movimentacoes  | GET, POST /movimentacoes, GET /resumo                 |
| locais         | CRUD /locais                                          |
| analise-ia     | POST /gerar, GET /ultima, /historico                  |
| dashboard      | GET /dashboard (todos os dados em 1 chamada)          |

---

## Tecnologias

**Frontend:** React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui · Zustand · Axios · Recharts · React Router · React Hook Form · Sonner

**Backend:** NestJS · TypeScript · Prisma ORM · PostgreSQL · JWT · Passport · Swagger · Helmet · Throttler · @anthropic-ai/sdk

**IA:** Claude (Anthropic) — análise de estoque, geração de insights, previsão de demanda

**Infra:** Docker · docker-compose · Node.js 20
