# Fama Fashion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Fama Fashion inventory + AI-analysis system: full CRUD for products and orders, a consolidated stock view, and an AI panel driven by a sequential 3-agent orchestrator (Anthropic Claude API).

**Architecture:** FastAPI backend with SQLAlchemy/SQLite persistence, server-rendered Jinja2 + vanilla JS frontend (4 screens), and a Python orchestrator that calls three Claude agents in sequence (KPIs → Anomalias → Recomendações), with all exact numeric KPIs pre-computed in Python (never by the LLM).

**Tech Stack:** Python 3.10+, FastAPI, SQLAlchemy 2.x, SQLite, Pydantic v2, Jinja2, vanilla JS, Chart.js (CDN), Anthropic Python SDK, pytest + FastAPI TestClient.

**Spec:** `docs/superpowers/specs/2026-09-07-fama-fashion-design.md`

## Global Constraints

- No authentication, no Docker, no microservices, no queues/async workers.
- Backend: FastAPI + SQLAlchemy (SQLite) + Pydantic v2 (`ConfigDict(from_attributes=True)`, not legacy `orm_mode`).
- Frontend: Jinja2 templates + vanilla JS (`fetch`) + Chart.js via CDN — no JS framework/bundler.
- IA: Anthropic Python SDK; default model `claude-sonnet-5`, overridable via `ANTHROPIC_MODEL` env var; API key in `ANTHROPIC_API_KEY` (`.env`, loaded via `python-dotenv`).
- The orchestrator calls the 3 agents **sequentially**, never in parallel/async.
- Exact KPI numbers (revenue, ticket médio, top produtos, giro de estoque) are **always computed in Python**; the AI only interprets/recommends.
- The AI panel is only ever triggered on demand (`POST /ia/analisar`), never automatically.
- Every AI analysis is persisted to the `analises_ia` table (history).
- An order (`pedido`) can contain multiple line items (`itens_pedido`); creating an order deducts stock per item, cancelling or deleting a non-cancelled order restores stock.
- Python 3.10+ syntax is used (`str | None`, `list[...]`).
- Automated tests use `pytest` + `fastapi.testclient.TestClient` against an in-memory SQLite database; the real Anthropic API is **never** called in automated tests — agent calls are always mocked/monkeypatched.

---

### Task 1: Project scaffolding, database wiring, health check

**Files:**
- Create: `requirements.txt`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `pytest.ini`
- Create: `app/__init__.py`
- Create: `app/database.py`
- Create: `app/static/.gitkeep`
- Create: `app/main.py`
- Create: `tests/conftest.py`
- Create: `tests/test_main.py`

**Interfaces:**
- Produces: `app.database.Base` (SQLAlchemy declarative base), `app.database.engine`, `app.database.get_db()` (FastAPI dependency generator), `app.main.app` (FastAPI instance), pytest fixtures `db_session` and `client` (usable by every later task's tests).

- [ ] **Step 1: Create project setup/config files**

`requirements.txt`:
```
fastapi>=0.100
uvicorn[standard]>=0.23
sqlalchemy>=2.0
pydantic>=2.0
python-dotenv>=1.0
anthropic>=0.34
jinja2>=3.1
httpx>=0.24
pytest>=7.4
```

`.env.example`:
```
ANTHROPIC_API_KEY=coloque_sua_chave_aqui
ANTHROPIC_MODEL=claude-sonnet-5
```

`.gitignore`:
```
__pycache__/
*.pyc
.env
*.db
.pytest_cache/
```

`pytest.ini`:
```ini
[pytest]
pythonpath = .
```

`app/__init__.py`: empty file (makes `app` importable as a package).

`app/static/.gitkeep`: empty file (ensures the `app/static` directory exists so `StaticFiles` can mount it later).

`app/database.py`:
```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./fama_fashion.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 2: Write the shared pytest fixtures and the failing test**

`tests/conftest.py`:
```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.main import app


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session):
    def sobrescrever_get_db():
        yield db_session

    app.dependency_overrides[get_db] = sobrescrever_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
```

`tests/test_main.py`:
```python
def test_health_check(client):
    resposta = client.get("/health")
    assert resposta.status_code == 200
    assert resposta.json() == {"status": "ok"}
```

- [ ] **Step 3: Run tests, verify they fail**

Run: `pytest tests/test_main.py -v`
Expected: FAIL/ERROR — `app/main.py` does not exist yet, so `from app.main import app` in `conftest.py` raises `ModuleNotFoundError`.

- [ ] **Step 4: Implement `app/main.py`**

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv()

from app.database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Fama Fashion")
app.mount("/static", StaticFiles(directory="app/static"), name="static")


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `pytest tests/test_main.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add requirements.txt .env.example .gitignore pytest.ini app/__init__.py app/database.py app/static/.gitkeep app/main.py tests/conftest.py tests/test_main.py
git commit -m "feat: scaffold FastAPI project with health check and test fixtures"
```

---

### Task 2: SQLAlchemy models

**Files:**
- Create: `app/models.py`
- Modify: `app/main.py` (replace entire file)
- Create: `tests/test_models.py`

**Interfaces:**
- Consumes: `app.database.Base` (Task 1).
- Produces: `app.models.Produto`, `app.models.Pedido`, `app.models.ItemPedido`, `app.models.AnaliseIA` — the exact fields below are relied on by every later task.

- [ ] **Step 1: Write the failing tests**

`tests/test_models.py`:
```python
from app import models


def test_criar_produto(db_session):
    produto = models.Produto(
        sku="TEST-001", nome="Produto Teste", categoria="Blusa",
        tamanho="M", cor="Azul", preco=59.90,
        quantidade_estoque=10, estoque_minimo=3,
    )
    db_session.add(produto)
    db_session.commit()
    db_session.refresh(produto)

    assert produto.id is not None
    assert produto.criado_em is not None


def test_criar_pedido_com_itens(db_session):
    produto = models.Produto(
        sku="TEST-002", nome="Produto 2", categoria="Saia",
        tamanho="P", cor="Preto", preco=39.90,
        quantidade_estoque=20, estoque_minimo=5,
    )
    db_session.add(produto)
    db_session.commit()
    db_session.refresh(produto)

    pedido = models.Pedido(
        canal="loja_fisica", cliente_nome="Cliente Teste",
        status="pendente", valor_total=79.80,
    )
    db_session.add(pedido)
    db_session.commit()
    db_session.refresh(pedido)

    item = models.ItemPedido(
        pedido_id=pedido.id, produto_id=produto.id,
        quantidade=2, preco_unitario=39.90, subtotal=79.80,
    )
    db_session.add(item)
    db_session.commit()
    db_session.refresh(pedido)

    assert len(pedido.itens) == 1
    assert pedido.itens[0].subtotal == 79.80


def test_criar_analise_ia(db_session):
    analise = models.AnaliseIA(
        kpis_json="{}", anomalias_json="{}", recomendacoes_json="{}",
    )
    db_session.add(analise)
    db_session.commit()
    db_session.refresh(analise)

    assert analise.id is not None
    assert analise.data_hora is not None
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `pytest tests/test_models.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.models'`

- [ ] **Step 3: Implement `app/models.py`**

```python
from datetime import datetime

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Produto(Base):
    __tablename__ = "produtos"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String, unique=True, index=True, nullable=False)
    nome = Column(String, nullable=False)
    categoria = Column(String, nullable=False)
    tamanho = Column(String, nullable=False)
    cor = Column(String, nullable=False)
    preco = Column(Float, nullable=False)
    quantidade_estoque = Column(Integer, nullable=False, default=0)
    estoque_minimo = Column(Integer, nullable=False, default=5)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    itens_pedido = relationship("ItemPedido", back_populates="produto")


class Pedido(Base):
    __tablename__ = "pedidos"

    id = Column(Integer, primary_key=True, index=True)
    canal = Column(String, nullable=False)
    cliente_nome = Column(String, nullable=False)
    cliente_contato = Column(String, nullable=True)
    data_pedido = Column(DateTime, default=datetime.utcnow)
    status = Column(String, nullable=False, default="pendente")
    valor_total = Column(Float, nullable=False, default=0.0)
    criado_em = Column(DateTime, default=datetime.utcnow)

    itens = relationship("ItemPedido", back_populates="pedido", cascade="all, delete-orphan")


class ItemPedido(Base):
    __tablename__ = "itens_pedido"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id"), nullable=False)
    produto_id = Column(Integer, ForeignKey("produtos.id"), nullable=False)
    quantidade = Column(Integer, nullable=False)
    preco_unitario = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)

    pedido = relationship("Pedido", back_populates="itens")
    produto = relationship("Produto", back_populates="itens_pedido")


class AnaliseIA(Base):
    __tablename__ = "analises_ia"

    id = Column(Integer, primary_key=True, index=True)
    data_hora = Column(DateTime, default=datetime.utcnow)
    kpis_json = Column(Text, nullable=False)
    anomalias_json = Column(Text, nullable=False)
    recomendacoes_json = Column(Text, nullable=False)
```

- [ ] **Step 4: Modify `app/main.py` to register the models before `create_all`**

Replace the entire file with:

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv()

from app.database import Base, engine
from app import models  # noqa: F401  garante que as tabelas sejam registradas antes do create_all

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Fama Fashion")
app.mount("/static", StaticFiles(directory="app/static"), name="static")


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `pytest -v`
Expected: PASS (all tests from Task 1 and Task 2)

- [ ] **Step 6: Commit**

```bash
git add app/models.py app/main.py tests/test_models.py
git commit -m "feat: add SQLAlchemy models for produtos, pedidos, itens_pedido, analises_ia"
```

---

### Task 3: Produtos CRUD router

**Files:**
- Create: `app/schemas.py`
- Create: `app/routers/__init__.py`
- Create: `app/routers/produtos.py`
- Modify: `app/main.py` (replace entire file)
- Create: `tests/test_rotas_produtos.py`

**Interfaces:**
- Consumes: `app.models.Produto` (Task 2), `app.database.get_db`.
- Produces: `app.schemas.ProdutoCreate`, `app.schemas.ProdutoUpdate`, `app.schemas.ProdutoOut` (relied on by Task 4's `PedidoOut`/item schemas file edits); router mounted at prefix `/produtos`.

- [ ] **Step 1: Write the failing tests**

`tests/test_rotas_produtos.py`:
```python
def test_criar_e_listar_produto(client):
    resposta = client.post("/produtos", json={
        "sku": "PROD-001", "nome": "Blusa Teste", "categoria": "Blusa",
        "tamanho": "M", "cor": "Azul", "preco": 59.90,
        "quantidade_estoque": 15, "estoque_minimo": 5,
    })
    assert resposta.status_code == 201
    assert resposta.json()["sku"] == "PROD-001"

    resposta_lista = client.get("/produtos")
    assert resposta_lista.status_code == 200
    assert len(resposta_lista.json()) == 1


def test_sku_duplicado_retorna_erro(client):
    dados = {
        "sku": "PROD-DUP", "nome": "Produto", "categoria": "Saia",
        "tamanho": "P", "cor": "Preto", "preco": 39.90,
        "quantidade_estoque": 5, "estoque_minimo": 2,
    }
    client.post("/produtos", json=dados)
    resposta = client.post("/produtos", json=dados)
    assert resposta.status_code == 400


def test_editar_produto(client):
    produto = client.post("/produtos", json={
        "sku": "PROD-002", "nome": "Saia Original", "categoria": "Saia",
        "tamanho": "M", "cor": "Preto", "preco": 79.90,
        "quantidade_estoque": 10, "estoque_minimo": 3,
    }).json()

    resposta = client.put(f"/produtos/{produto['id']}", json={"preco": 89.90})
    assert resposta.status_code == 200
    assert resposta.json()["preco"] == 89.90


def test_excluir_produto(client):
    produto = client.post("/produtos", json={
        "sku": "PROD-003", "nome": "Calça", "categoria": "Calça",
        "tamanho": "G", "cor": "Azul", "preco": 99.90,
        "quantidade_estoque": 5, "estoque_minimo": 2,
    }).json()

    resposta = client.delete(f"/produtos/{produto['id']}")
    assert resposta.status_code == 204

    resposta_get = client.get(f"/produtos/{produto['id']}")
    assert resposta_get.status_code == 404


def test_produto_inexistente_retorna_404(client):
    resposta = client.get("/produtos/9999")
    assert resposta.status_code == 404
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `pytest tests/test_rotas_produtos.py -v`
Expected: FAIL — no `/produtos` route registered (404 instead of 201, etc.), and `app.routers` does not exist yet.

- [ ] **Step 3: Implement `app/schemas.py`**

```python
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ProdutoBase(BaseModel):
    sku: str
    nome: str
    categoria: str
    tamanho: str
    cor: str
    preco: float
    quantidade_estoque: int = 0
    estoque_minimo: int = 5


class ProdutoCreate(ProdutoBase):
    pass


class ProdutoUpdate(BaseModel):
    sku: Optional[str] = None
    nome: Optional[str] = None
    categoria: Optional[str] = None
    tamanho: Optional[str] = None
    cor: Optional[str] = None
    preco: Optional[float] = None
    quantidade_estoque: Optional[int] = None
    estoque_minimo: Optional[int] = None


class ProdutoOut(ProdutoBase):
    id: int
    criado_em: datetime
    atualizado_em: datetime

    model_config = ConfigDict(from_attributes=True)
```

- [ ] **Step 4: Implement `app/routers/produtos.py`**

`app/routers/__init__.py`: empty file.

`app/routers/produtos.py`:
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/produtos", tags=["produtos"])


@router.get("", response_model=list[schemas.ProdutoOut])
def listar_produtos(nome: str | None = None, categoria: str | None = None, db: Session = Depends(get_db)):
    query = db.query(models.Produto)
    if nome:
        query = query.filter(models.Produto.nome.ilike(f"%{nome}%"))
    if categoria:
        query = query.filter(models.Produto.categoria == categoria)
    return query.all()


@router.get("/{produto_id}", response_model=schemas.ProdutoOut)
def obter_produto(produto_id: int, db: Session = Depends(get_db)):
    produto = db.get(models.Produto, produto_id)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return produto


@router.post("", response_model=schemas.ProdutoOut, status_code=201)
def criar_produto(dados: schemas.ProdutoCreate, db: Session = Depends(get_db)):
    produto = models.Produto(**dados.model_dump())
    db.add(produto)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="SKU já cadastrado")
    db.refresh(produto)
    return produto


@router.put("/{produto_id}", response_model=schemas.ProdutoOut)
def editar_produto(produto_id: int, dados: schemas.ProdutoUpdate, db: Session = Depends(get_db)):
    produto = db.get(models.Produto, produto_id)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(produto, campo, valor)
    db.commit()
    db.refresh(produto)
    return produto


@router.delete("/{produto_id}", status_code=204)
def remover_produto(produto_id: int, db: Session = Depends(get_db)):
    produto = db.get(models.Produto, produto_id)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    db.delete(produto)
    db.commit()
    return None
```

- [ ] **Step 5: Modify `app/main.py` to include the router**

Replace the entire file with:

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv()

from app.database import Base, engine
from app import models  # noqa: F401
from app.routers import produtos

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Fama Fashion")
app.mount("/static", StaticFiles(directory="app/static"), name="static")

app.include_router(produtos.router)


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 6: Run tests, verify they pass**

Run: `pytest -v`
Expected: PASS (all tests so far)

- [ ] **Step 7: Commit**

```bash
git add app/schemas.py app/routers/__init__.py app/routers/produtos.py app/main.py tests/test_rotas_produtos.py
git commit -m "feat: add produtos CRUD router"
```

---

### Task 4: Pedidos CRUD router (multi-item orders, stock deduction/return)

**Files:**
- Modify: `app/schemas.py` (replace entire file)
- Create: `app/routers/pedidos.py`
- Modify: `app/main.py` (replace entire file)
- Create: `tests/test_rotas_pedidos.py`

**Interfaces:**
- Consumes: `app.models.Pedido`, `app.models.ItemPedido`, `app.models.Produto` (Task 2); `app.schemas.ProdutoOut` (Task 3, unmodified).
- Produces: `app.schemas.PedidoCreate`, `PedidoUpdate`, `PedidoOut`, `ItemPedidoCreate`, `ItemPedidoOut`; router mounted at prefix `/pedidos`. Stock deduction/return behavior relied on by Task 12 (seed) and manual verification later.

- [ ] **Step 1: Write the failing tests**

`tests/test_rotas_pedidos.py`:
```python
def _criar_produto(client, quantidade_estoque=10, preco=50.0, sku="PED-001"):
    resposta = client.post("/produtos", json={
        "sku": sku, "nome": "Produto Pedido", "categoria": "Blusa",
        "tamanho": "M", "cor": "Azul", "preco": preco,
        "quantidade_estoque": quantidade_estoque, "estoque_minimo": 2,
    })
    return resposta.json()


def test_criar_pedido_com_varios_itens_desconta_estoque_e_calcula_total(client):
    produto_a = _criar_produto(client, quantidade_estoque=10, preco=50.0, sku="PED-A")
    produto_b = _criar_produto(client, quantidade_estoque=10, preco=20.0, sku="PED-B")

    resposta = client.post("/pedidos", json={
        "canal": "shopee", "cliente_nome": "Cliente X",
        "itens": [
            {"produto_id": produto_a["id"], "quantidade": 3},
            {"produto_id": produto_b["id"], "quantidade": 2},
        ],
    })

    assert resposta.status_code == 201
    dados = resposta.json()
    assert dados["valor_total"] == 3 * 50.0 + 2 * 20.0
    assert len(dados["itens"]) == 2

    produto_a_atualizado = client.get(f"/produtos/{produto_a['id']}").json()
    produto_b_atualizado = client.get(f"/produtos/{produto_b['id']}").json()
    assert produto_a_atualizado["quantidade_estoque"] == 7
    assert produto_b_atualizado["quantidade_estoque"] == 8


def test_criar_pedido_com_estoque_insuficiente_falha(client):
    produto = _criar_produto(client, quantidade_estoque=2)

    resposta = client.post("/pedidos", json={
        "canal": "loja_fisica", "cliente_nome": "Cliente Y",
        "itens": [{"produto_id": produto["id"], "quantidade": 5}],
    })

    assert resposta.status_code == 400
    produto_atualizado = client.get(f"/produtos/{produto['id']}").json()
    assert produto_atualizado["quantidade_estoque"] == 2


def test_criar_pedido_sem_itens_falha(client):
    resposta = client.post("/pedidos", json={
        "canal": "shopee", "cliente_nome": "Cliente Sem Itens", "itens": [],
    })
    assert resposta.status_code == 400


def test_cancelar_pedido_devolve_estoque(client):
    produto = _criar_produto(client, quantidade_estoque=10)
    pedido = client.post("/pedidos", json={
        "canal": "shopee", "cliente_nome": "Cliente Z",
        "itens": [{"produto_id": produto["id"], "quantidade": 4}],
    }).json()

    resposta = client.put(f"/pedidos/{pedido['id']}", json={"status": "cancelado"})
    assert resposta.status_code == 200

    produto_atualizado = client.get(f"/produtos/{produto['id']}").json()
    assert produto_atualizado["quantidade_estoque"] == 10


def test_excluir_pedido_nao_cancelado_devolve_estoque(client):
    produto = _criar_produto(client, quantidade_estoque=10)
    pedido = client.post("/pedidos", json={
        "canal": "loja_fisica", "cliente_nome": "Cliente W",
        "itens": [{"produto_id": produto["id"], "quantidade": 2}],
    }).json()

    resposta = client.delete(f"/pedidos/{pedido['id']}")
    assert resposta.status_code == 204

    produto_atualizado = client.get(f"/produtos/{produto['id']}").json()
    assert produto_atualizado["quantidade_estoque"] == 10


def test_listar_pedidos_filtra_por_canal(client):
    produto = _criar_produto(client, quantidade_estoque=10)
    client.post("/pedidos", json={
        "canal": "shopee", "cliente_nome": "A",
        "itens": [{"produto_id": produto["id"], "quantidade": 1}],
    })
    client.post("/pedidos", json={
        "canal": "loja_fisica", "cliente_nome": "B",
        "itens": [{"produto_id": produto["id"], "quantidade": 1}],
    })

    resposta = client.get("/pedidos", params={"canal": "shopee"})
    assert resposta.status_code == 200
    assert len(resposta.json()) == 1
    assert resposta.json()[0]["canal"] == "shopee"
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `pytest tests/test_rotas_pedidos.py -v`
Expected: FAIL — no `/pedidos` route registered yet.

- [ ] **Step 3: Modify `app/schemas.py`** (replace entire file)

```python
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class ProdutoBase(BaseModel):
    sku: str
    nome: str
    categoria: str
    tamanho: str
    cor: str
    preco: float
    quantidade_estoque: int = 0
    estoque_minimo: int = 5


class ProdutoCreate(ProdutoBase):
    pass


class ProdutoUpdate(BaseModel):
    sku: Optional[str] = None
    nome: Optional[str] = None
    categoria: Optional[str] = None
    tamanho: Optional[str] = None
    cor: Optional[str] = None
    preco: Optional[float] = None
    quantidade_estoque: Optional[int] = None
    estoque_minimo: Optional[int] = None


class ProdutoOut(ProdutoBase):
    id: int
    criado_em: datetime
    atualizado_em: datetime

    model_config = ConfigDict(from_attributes=True)


class ItemPedidoCreate(BaseModel):
    produto_id: int
    quantidade: int


class ItemPedidoOut(BaseModel):
    id: int
    produto_id: int
    quantidade: int
    preco_unitario: float
    subtotal: float

    model_config = ConfigDict(from_attributes=True)


class PedidoCreate(BaseModel):
    canal: str
    cliente_nome: str
    cliente_contato: Optional[str] = None
    status: str = "pendente"
    itens: List[ItemPedidoCreate]


class PedidoUpdate(BaseModel):
    cliente_nome: Optional[str] = None
    cliente_contato: Optional[str] = None
    status: Optional[str] = None


class PedidoOut(BaseModel):
    id: int
    canal: str
    cliente_nome: str
    cliente_contato: Optional[str]
    data_pedido: datetime
    status: str
    valor_total: float
    criado_em: datetime
    itens: List[ItemPedidoOut]

    model_config = ConfigDict(from_attributes=True)
```

- [ ] **Step 4: Implement `app/routers/pedidos.py`**

```python
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/pedidos", tags=["pedidos"])


@router.get("", response_model=list[schemas.PedidoOut])
def listar_pedidos(canal: str | None = None, status: str | None = None, db: Session = Depends(get_db)):
    query = db.query(models.Pedido).options(joinedload(models.Pedido.itens))
    if canal:
        query = query.filter(models.Pedido.canal == canal)
    if status:
        query = query.filter(models.Pedido.status == status)
    return query.order_by(models.Pedido.data_pedido.desc()).all()


@router.get("/{pedido_id}", response_model=schemas.PedidoOut)
def obter_pedido(pedido_id: int, db: Session = Depends(get_db)):
    pedido = db.get(models.Pedido, pedido_id)
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return pedido


@router.post("", response_model=schemas.PedidoOut, status_code=201)
def criar_pedido(dados: schemas.PedidoCreate, db: Session = Depends(get_db)):
    if not dados.itens:
        raise HTTPException(status_code=400, detail="O pedido precisa ter pelo menos um item")

    pedido = models.Pedido(
        canal=dados.canal,
        cliente_nome=dados.cliente_nome,
        cliente_contato=dados.cliente_contato,
        status=dados.status,
        data_pedido=datetime.utcnow(),
        valor_total=0.0,
    )
    db.add(pedido)
    db.flush()

    valor_total = 0.0
    for item in dados.itens:
        produto = db.get(models.Produto, item.produto_id)
        if not produto:
            db.rollback()
            raise HTTPException(status_code=404, detail=f"Produto {item.produto_id} não encontrado")
        if produto.quantidade_estoque < item.quantidade:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail=f"Estoque insuficiente para o produto '{produto.nome}'",
            )
        subtotal = produto.preco * item.quantidade
        db.add(models.ItemPedido(
            pedido_id=pedido.id,
            produto_id=produto.id,
            quantidade=item.quantidade,
            preco_unitario=produto.preco,
            subtotal=subtotal,
        ))
        produto.quantidade_estoque -= item.quantidade
        valor_total += subtotal

    pedido.valor_total = valor_total
    db.commit()
    db.refresh(pedido)
    return pedido


@router.put("/{pedido_id}", response_model=schemas.PedidoOut)
def editar_pedido(pedido_id: int, dados: schemas.PedidoUpdate, db: Session = Depends(get_db)):
    pedido = db.get(models.Pedido, pedido_id)
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    status_anterior = pedido.status
    novo_status = dados.status if dados.status is not None else status_anterior
    if novo_status == "cancelado" and status_anterior != "cancelado":
        _devolver_estoque(pedido, db)

    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(pedido, campo, valor)

    db.commit()
    db.refresh(pedido)
    return pedido


@router.delete("/{pedido_id}", status_code=204)
def remover_pedido(pedido_id: int, db: Session = Depends(get_db)):
    pedido = db.get(models.Pedido, pedido_id)
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    if pedido.status != "cancelado":
        _devolver_estoque(pedido, db)
    db.delete(pedido)
    db.commit()
    return None


def _devolver_estoque(pedido: models.Pedido, db: Session) -> None:
    for item in pedido.itens:
        produto = db.get(models.Produto, item.produto_id)
        if produto:
            produto.quantidade_estoque += item.quantidade
```

- [ ] **Step 5: Modify `app/main.py`** (replace entire file)

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv()

from app.database import Base, engine
from app import models  # noqa: F401
from app.routers import produtos, pedidos

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Fama Fashion")
app.mount("/static", StaticFiles(directory="app/static"), name="static")

app.include_router(produtos.router)
app.include_router(pedidos.router)


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 6: Run tests, verify they pass**

Run: `pytest -v`
Expected: PASS (all tests so far)

- [ ] **Step 7: Commit**

```bash
git add app/schemas.py app/routers/pedidos.py app/main.py tests/test_rotas_pedidos.py
git commit -m "feat: add pedidos CRUD router with multi-item stock deduction/return"
```

---

### Task 5: Shared stock services + Estoque router

**Files:**
- Create: `app/servicos_estoque.py`
- Create: `app/routers/estoque.py`
- Modify: `app/main.py` (replace entire file)
- Create: `tests/test_servicos_estoque.py`
- Create: `tests/test_rotas_estoque.py`

**Interfaces:**
- Consumes: `app.models.Produto`, `Pedido`, `ItemPedido` (Task 2).
- Produces: `app.servicos_estoque.calcular_valor_total_em_estoque(produtos: list[Produto]) -> float`, `listar_produtos_estoque_baixo(produtos: list[Produto]) -> list[Produto]`, `listar_produtos_parados(db: Session, produtos: list[Produto], dias: int = 30) -> list[Produto]` — reused by Task 6's `montar_resumo_dados`. Router mounted at prefix `/estoque`.

- [ ] **Step 1: Write the failing tests**

`tests/test_servicos_estoque.py`:
```python
from datetime import datetime, timedelta

from app import models, servicos_estoque


def test_calcular_valor_total_em_estoque():
    produtos = [
        models.Produto(sku="A", nome="A", categoria="Blusa", tamanho="M", cor="Azul", preco=10.0, quantidade_estoque=5, estoque_minimo=2),
        models.Produto(sku="B", nome="B", categoria="Saia", tamanho="P", cor="Preto", preco=20.0, quantidade_estoque=3, estoque_minimo=2),
    ]
    assert servicos_estoque.calcular_valor_total_em_estoque(produtos) == 110.0


def test_listar_produtos_estoque_baixo():
    baixo = models.Produto(sku="A", nome="A", categoria="Blusa", tamanho="M", cor="Azul", preco=10.0, quantidade_estoque=1, estoque_minimo=5)
    normal = models.Produto(sku="B", nome="B", categoria="Saia", tamanho="P", cor="Preto", preco=20.0, quantidade_estoque=10, estoque_minimo=5)
    resultado = servicos_estoque.listar_produtos_estoque_baixo([baixo, normal])
    assert resultado == [baixo]


def test_listar_produtos_parados(db_session):
    produto_parado = models.Produto(sku="PARADO", nome="Parado", categoria="Blusa", tamanho="M", cor="Azul", preco=10.0, quantidade_estoque=5, estoque_minimo=2)
    produto_ativo = models.Produto(sku="ATIVO", nome="Ativo", categoria="Saia", tamanho="P", cor="Preto", preco=20.0, quantidade_estoque=5, estoque_minimo=2)
    db_session.add_all([produto_parado, produto_ativo])
    db_session.commit()

    pedido = models.Pedido(
        canal="shopee", cliente_nome="Cliente", status="entregue",
        data_pedido=datetime.utcnow() - timedelta(days=1), valor_total=20.0,
    )
    db_session.add(pedido)
    db_session.flush()
    db_session.add(models.ItemPedido(
        pedido_id=pedido.id, produto_id=produto_ativo.id,
        quantidade=1, preco_unitario=20.0, subtotal=20.0,
    ))
    db_session.commit()

    parados = servicos_estoque.listar_produtos_parados(db_session, [produto_parado, produto_ativo])
    assert parados == [produto_parado]
```

`tests/test_rotas_estoque.py`:
```python
from datetime import datetime, timedelta

from app import models


def test_resumo_calcula_valor_total_em_estoque(client):
    client.post("/produtos", json={
        "sku": "EST-001", "nome": "Produto A", "categoria": "Blusa",
        "tamanho": "M", "cor": "Azul", "preco": 10.0,
        "quantidade_estoque": 5, "estoque_minimo": 2,
    })
    client.post("/produtos", json={
        "sku": "EST-002", "nome": "Produto B", "categoria": "Saia",
        "tamanho": "P", "cor": "Preto", "preco": 20.0,
        "quantidade_estoque": 3, "estoque_minimo": 2,
    })

    resposta = client.get("/estoque/resumo")
    assert resposta.status_code == 200
    assert resposta.json()["valor_total_estoque"] == 5 * 10.0 + 3 * 20.0


def test_estoque_baixo_lista_produtos_abaixo_do_minimo(client):
    client.post("/produtos", json={
        "sku": "EST-003", "nome": "Produto C", "categoria": "Vestido",
        "tamanho": "M", "cor": "Rosa", "preco": 50.0,
        "quantidade_estoque": 1, "estoque_minimo": 5,
    })

    resposta = client.get("/estoque/baixo")
    assert resposta.status_code == 200
    assert any(p["sku"] == "EST-003" for p in resposta.json())


def test_produtos_parados_ignora_vendas_recentes(client, db_session):
    produto = client.post("/produtos", json={
        "sku": "EST-004", "nome": "Produto D", "categoria": "Short",
        "tamanho": "G", "cor": "Branco", "preco": 30.0,
        "quantidade_estoque": 10, "estoque_minimo": 2,
    }).json()

    pedido = models.Pedido(
        canal="shopee", cliente_nome="Cliente Parado", status="entregue",
        data_pedido=datetime.utcnow() - timedelta(days=5), valor_total=30.0,
    )
    db_session.add(pedido)
    db_session.flush()
    db_session.add(models.ItemPedido(
        pedido_id=pedido.id, produto_id=produto["id"],
        quantidade=1, preco_unitario=30.0, subtotal=30.0,
    ))
    db_session.commit()

    resposta = client.get("/estoque/parados")
    skus_parados = {p["sku"] for p in resposta.json()}
    assert "EST-004" not in skus_parados
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `pytest tests/test_servicos_estoque.py tests/test_rotas_estoque.py -v`
Expected: FAIL — `app.servicos_estoque` module and `/estoque/*` routes don't exist yet.

- [ ] **Step 3: Implement `app/servicos_estoque.py`**

```python
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app import models


def calcular_valor_total_em_estoque(produtos: list) -> float:
    return round(sum(p.preco * p.quantidade_estoque for p in produtos), 2)


def listar_produtos_estoque_baixo(produtos: list) -> list:
    return [p for p in produtos if p.quantidade_estoque <= p.estoque_minimo]


def listar_produtos_parados(db: Session, produtos: list, dias: int = 30) -> list:
    limite = datetime.utcnow() - timedelta(days=dias)
    pedidos_recentes = (
        db.query(models.Pedido)
        .filter(models.Pedido.data_pedido >= limite)
        .filter(models.Pedido.status != "cancelado")
        .all()
    )
    ids_com_venda_recente = {item.produto_id for pedido in pedidos_recentes for item in pedido.itens}
    return [p for p in produtos if p.id not in ids_com_venda_recente]
```

- [ ] **Step 4: Implement `app/routers/estoque.py`**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, servicos_estoque
from app.database import get_db

router = APIRouter(prefix="/estoque", tags=["estoque"])


@router.get("/resumo")
def resumo_estoque(db: Session = Depends(get_db)):
    produtos = db.query(models.Produto).all()
    return {
        "valor_total_estoque": servicos_estoque.calcular_valor_total_em_estoque(produtos),
        "quantidade_produtos": len(produtos),
        "produtos": [
            {
                "id": p.id, "nome": p.nome, "sku": p.sku,
                "quantidade_estoque": p.quantidade_estoque, "estoque_minimo": p.estoque_minimo,
            }
            for p in produtos
        ],
    }


@router.get("/baixo")
def produtos_com_estoque_baixo(db: Session = Depends(get_db)):
    produtos = db.query(models.Produto).all()
    baixos = servicos_estoque.listar_produtos_estoque_baixo(produtos)
    return [
        {"id": p.id, "nome": p.nome, "sku": p.sku, "quantidade_estoque": p.quantidade_estoque, "estoque_minimo": p.estoque_minimo}
        for p in baixos
    ]


@router.get("/parados")
def produtos_parados(dias: int = 30, db: Session = Depends(get_db)):
    produtos = db.query(models.Produto).all()
    parados = servicos_estoque.listar_produtos_parados(db, produtos, dias)
    return [
        {"id": p.id, "nome": p.nome, "sku": p.sku, "quantidade_estoque": p.quantidade_estoque}
        for p in parados
    ]
```

- [ ] **Step 5: Modify `app/main.py`** (replace entire file)

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv()

from app.database import Base, engine
from app import models  # noqa: F401
from app.routers import produtos, pedidos, estoque

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Fama Fashion")
app.mount("/static", StaticFiles(directory="app/static"), name="static")

app.include_router(produtos.router)
app.include_router(pedidos.router)
app.include_router(estoque.router)


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 6: Run tests, verify they pass**

Run: `pytest -v`
Expected: PASS (all tests so far)

- [ ] **Step 7: Commit**

```bash
git add app/servicos_estoque.py app/routers/estoque.py app/main.py tests/test_servicos_estoque.py tests/test_rotas_estoque.py
git commit -m "feat: add shared stock services and estoque router"
```

---

### Task 6: KPI data summary (`montar_resumo_dados`) — Python calculates, IA will only interpret

**Files:**
- Create: `app/ia/__init__.py`
- Create: `app/ia/resumo.py`
- Create: `tests/test_resumo.py`

**Interfaces:**
- Consumes: `app.models.Produto`, `Pedido`, `ItemPedido` (Task 2); `app.servicos_estoque.listar_produtos_parados`, `listar_produtos_estoque_baixo` (Task 5).
- Produces: `app.ia.resumo.montar_resumo_dados(db: Session) -> dict` with keys `faturamento_por_canal` (dict[str, float]), `ticket_medio` (float), `top_produtos_mais_vendidos` (list of dicts with `produto_id`, `quantidade_vendida`, `faturamento`, `nome`, `sku`), `giro_estoque` (list of dicts with `produto_id`, `nome`, `quantidade_vendida_periodo`, `quantidade_estoque_atual`), `produtos_parados` (list of dicts with `produto_id`, `nome`, `sku`), `produtos_estoque_baixo` (list of dicts with `produto_id`, `nome`, `quantidade_estoque`, `estoque_minimo`), `quantidade_pedidos_ultimos_30_dias` (int). This exact dict shape is consumed by Task 10's orchestrator and Task 17's Painel de IA frontend (`top_produtos_mais_vendidos[].nome`/`.quantidade_vendida`, `faturamento_por_canal`, `ticket_medio`, `quantidade_pedidos_ultimos_30_dias`).

- [ ] **Step 1: Write the failing tests**

`tests/test_resumo.py`:
```python
from datetime import datetime, timedelta

from app import models
from app.ia.resumo import montar_resumo_dados


def _criar_produto(db, **kwargs):
    padrao = {
        "sku": "SKU", "nome": "Nome", "categoria": "Blusa", "tamanho": "M",
        "cor": "Azul", "preco": 10.0, "quantidade_estoque": 10, "estoque_minimo": 5,
    }
    padrao.update(kwargs)
    produto = models.Produto(**padrao)
    db.add(produto)
    db.commit()
    db.refresh(produto)
    return produto


def _criar_pedido(db, produto, quantidade, canal, dias_atras, status="entregue"):
    data_pedido = datetime.utcnow() - timedelta(days=dias_atras)
    pedido = models.Pedido(
        canal=canal, cliente_nome="Cliente", status=status,
        data_pedido=data_pedido, valor_total=produto.preco * quantidade,
    )
    db.add(pedido)
    db.flush()
    db.add(models.ItemPedido(
        pedido_id=pedido.id, produto_id=produto.id,
        quantidade=quantidade, preco_unitario=produto.preco,
        subtotal=produto.preco * quantidade,
    ))
    db.commit()
    return pedido


def test_montar_resumo_calcula_faturamento_e_ticket_medio(db_session):
    produto = _criar_produto(db_session, sku="P1", preco=100.0, quantidade_estoque=50, estoque_minimo=5)
    _criar_pedido(db_session, produto, 2, "loja_fisica", dias_atras=1)
    _criar_pedido(db_session, produto, 1, "shopee", dias_atras=2)

    resumo = montar_resumo_dados(db_session)

    assert resumo["faturamento_por_canal"]["loja_fisica"] == 200.0
    assert resumo["faturamento_por_canal"]["shopee"] == 100.0
    assert resumo["ticket_medio"] == 150.0


def test_montar_resumo_ignora_pedidos_cancelados(db_session):
    produto = _criar_produto(db_session, sku="P2", preco=50.0)
    _criar_pedido(db_session, produto, 3, "loja_fisica", dias_atras=1, status="cancelado")

    resumo = montar_resumo_dados(db_session)

    assert resumo["faturamento_por_canal"] == {}
    assert resumo["ticket_medio"] == 0.0


def test_montar_resumo_identifica_produto_parado_e_estoque_baixo(db_session):
    produto_parado = _criar_produto(db_session, sku="P3", quantidade_estoque=10, estoque_minimo=5)
    produto_baixo = _criar_produto(db_session, sku="P4", quantidade_estoque=2, estoque_minimo=5)
    produto_ativo = _criar_produto(db_session, sku="P5", quantidade_estoque=10, estoque_minimo=5)
    _criar_pedido(db_session, produto_ativo, 1, "shopee", dias_atras=1)

    resumo = montar_resumo_dados(db_session)

    skus_parados = {p["sku"] for p in resumo["produtos_parados"]}
    assert "P3" in skus_parados
    assert "P5" not in skus_parados

    ids_baixo_estoque = {p["produto_id"] for p in resumo["produtos_estoque_baixo"]}
    assert produto_baixo.id in ids_baixo_estoque


def test_montar_resumo_top_produtos_ordenado_por_quantidade(db_session):
    produto_mais_vendido = _criar_produto(db_session, sku="TOP-1", preco=10.0)
    produto_menos_vendido = _criar_produto(db_session, sku="TOP-2", preco=10.0)
    _criar_pedido(db_session, produto_mais_vendido, 5, "shopee", dias_atras=1)
    _criar_pedido(db_session, produto_menos_vendido, 1, "shopee", dias_atras=1)

    resumo = montar_resumo_dados(db_session)

    assert resumo["top_produtos_mais_vendidos"][0]["sku"] == "TOP-1"
    assert resumo["top_produtos_mais_vendidos"][0]["quantidade_vendida"] == 5
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `pytest tests/test_resumo.py -v`
Expected: FAIL — `app.ia` package / `montar_resumo_dados` don't exist yet.

- [ ] **Step 3: Implement `app/ia/resumo.py`**

`app/ia/__init__.py`: empty file.

`app/ia/resumo.py`:
```python
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app import models, servicos_estoque


def montar_resumo_dados(db: Session) -> dict:
    """Calcula em Python os números exatos que os agentes de IA vão interpretar."""
    produtos = db.query(models.Produto).all()
    pedidos_validos = db.query(models.Pedido).filter(models.Pedido.status != "cancelado").all()

    faturamento_por_canal: dict[str, float] = {}
    for pedido in pedidos_validos:
        faturamento_por_canal[pedido.canal] = faturamento_por_canal.get(pedido.canal, 0.0) + pedido.valor_total

    ticket_medio = (
        sum(p.valor_total for p in pedidos_validos) / len(pedidos_validos)
        if pedidos_validos else 0.0
    )

    vendidos_por_produto: dict[int, dict] = {}
    for pedido in pedidos_validos:
        for item in pedido.itens:
            registro = vendidos_por_produto.setdefault(
                item.produto_id,
                {"produto_id": item.produto_id, "quantidade_vendida": 0, "faturamento": 0.0},
            )
            registro["quantidade_vendida"] += item.quantidade
            registro["faturamento"] += item.subtotal

    produtos_por_id = {p.id: p for p in produtos}
    top_produtos = sorted(
        vendidos_por_produto.values(), key=lambda r: r["quantidade_vendida"], reverse=True
    )[:5]
    for registro in top_produtos:
        produto = produtos_por_id.get(registro["produto_id"])
        registro["nome"] = produto.nome if produto else "Produto removido"
        registro["sku"] = produto.sku if produto else ""
        registro["faturamento"] = round(registro["faturamento"], 2)

    giro_estoque = [
        {
            "produto_id": produto.id,
            "nome": produto.nome,
            "quantidade_vendida_periodo": vendidos_por_produto.get(produto.id, {"quantidade_vendida": 0})["quantidade_vendida"],
            "quantidade_estoque_atual": produto.quantidade_estoque,
        }
        for produto in produtos
    ]

    produtos_parados = servicos_estoque.listar_produtos_parados(db, produtos)
    produtos_estoque_baixo = servicos_estoque.listar_produtos_estoque_baixo(produtos)

    limite_30_dias = datetime.utcnow() - timedelta(days=30)
    pedidos_recentes = [p for p in pedidos_validos if p.data_pedido >= limite_30_dias]

    return {
        "faturamento_por_canal": {k: round(v, 2) for k, v in faturamento_por_canal.items()},
        "ticket_medio": round(ticket_medio, 2),
        "top_produtos_mais_vendidos": top_produtos,
        "giro_estoque": giro_estoque,
        "produtos_parados": [{"produto_id": p.id, "nome": p.nome, "sku": p.sku} for p in produtos_parados],
        "produtos_estoque_baixo": [
            {"produto_id": p.id, "nome": p.nome, "quantidade_estoque": p.quantidade_estoque, "estoque_minimo": p.estoque_minimo}
            for p in produtos_estoque_baixo
        ],
        "quantidade_pedidos_ultimos_30_dias": len(pedidos_recentes),
    }
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `pytest -v`
Expected: PASS (all tests so far)

- [ ] **Step 5: Commit**

```bash
git add app/ia/__init__.py app/ia/resumo.py tests/test_resumo.py
git commit -m "feat: add Python-computed KPI data summary for the AI orchestrator"
```

---

### Task 7: Claude client wrapper + Agente de KPIs

**Files:**
- Create: `app/ia/cliente_claude.py`
- Create: `app/ia/agente_kpis.py`
- Create: `tests/test_agente_kpis.py`

**Interfaces:**
- Produces: `app.ia.cliente_claude.obter_cliente() -> anthropic.Anthropic`, `obter_modelo() -> str` (read `ANTHROPIC_MODEL` env var, default `"claude-sonnet-5"`); `app.ia.agente_kpis.executar(resumo: dict) -> dict` returning `{"interpretacao": str}` (or `{"interpretacao": str, "erro": str}` on malformed JSON from the API) — the `executar(resumo)` signature and the mocking pattern (monkeypatching `obter_cliente`/`obter_modelo` on the agent module) are reused identically by Tasks 8 and 9.
- The real Anthropic API is never called in tests — always mocked via a fake client object with a `.messages.create(**kwargs)` method.

- [ ] **Step 1: Write the failing tests**

`tests/test_agente_kpis.py`:
```python
import json
from types import SimpleNamespace

from app.ia import agente_kpis


class ClienteFalso:
    def __init__(self, texto_resposta):
        self.texto_resposta = texto_resposta
        self.mensagens_recebidas = None
        self.messages = self

    def create(self, **kwargs):
        self.mensagens_recebidas = kwargs
        return SimpleNamespace(content=[SimpleNamespace(text=self.texto_resposta)])


def test_executar_retorna_interpretacao_da_ia(monkeypatch):
    resposta_json = json.dumps({"interpretacao": "Vendas em alta na Shopee."})
    cliente_falso = ClienteFalso(resposta_json)
    monkeypatch.setattr(agente_kpis, "obter_cliente", lambda: cliente_falso)
    monkeypatch.setattr(agente_kpis, "obter_modelo", lambda: "modelo-teste")

    resultado = agente_kpis.executar({"ticket_medio": 100.0})

    assert resultado == {"interpretacao": "Vendas em alta na Shopee."}
    assert cliente_falso.mensagens_recebidas["model"] == "modelo-teste"


def test_executar_lida_com_resposta_invalida(monkeypatch):
    cliente_falso = ClienteFalso("isso não é um json")
    monkeypatch.setattr(agente_kpis, "obter_cliente", lambda: cliente_falso)
    monkeypatch.setattr(agente_kpis, "obter_modelo", lambda: "modelo-teste")

    resultado = agente_kpis.executar({"ticket_medio": 100.0})

    assert "interpretacao" in resultado
    assert "erro" in resultado
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `pytest tests/test_agente_kpis.py -v`
Expected: FAIL — `app.ia.agente_kpis` doesn't exist yet.

- [ ] **Step 3: Implement `app/ia/cliente_claude.py`**

```python
import os

import anthropic

_cliente = None


def obter_cliente() -> anthropic.Anthropic:
    global _cliente
    if _cliente is None:
        _cliente = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    return _cliente


def obter_modelo() -> str:
    return os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5")
```

- [ ] **Step 4: Implement `app/ia/agente_kpis.py`**

```python
import json

from app.ia.cliente_claude import obter_cliente, obter_modelo

SYSTEM_PROMPT = """Você é um analista de dados especializado em varejo de moda (loja física e Shopee).
Você recebe um resumo em JSON com números JÁ CALCULADOS (faturamento por canal, ticket médio,
produtos mais vendidos, giro de estoque). NÃO recalcule nem invente números: use exclusivamente
os valores fornecidos para interpretar tendências e comparar os canais de venda.

Responda APENAS com um JSON válido, sem nenhum texto fora do JSON, no formato:
{"interpretacao": "texto em português explicando as tendências e a comparação entre canais"}
"""


def executar(resumo: dict) -> dict:
    """Chama o Claude para interpretar os KPIs já calculados em Python."""
    cliente = obter_cliente()
    resposta = cliente.messages.create(
        model=obter_modelo(),
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": json.dumps(resumo, ensure_ascii=False)}],
    )
    texto = resposta.content[0].text
    try:
        return json.loads(texto)
    except json.JSONDecodeError:
        return {"interpretacao": "Não foi possível interpretar a resposta da IA.", "erro": texto}
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `pytest -v`
Expected: PASS (all tests so far)

- [ ] **Step 6: Commit**

```bash
git add app/ia/cliente_claude.py app/ia/agente_kpis.py tests/test_agente_kpis.py
git commit -m "feat: add Claude client wrapper and Agente de KPIs"
```

---

### Task 8: Agente de Anomalias

**Files:**
- Create: `app/ia/agente_anomalias.py`
- Create: `tests/test_agente_anomalias.py`

**Interfaces:**
- Consumes: `app.ia.cliente_claude.obter_cliente`/`obter_modelo` (Task 7).
- Produces: `app.ia.agente_anomalias.executar(resumo: dict, interpretacao_kpis: dict) -> dict` returning `{"alertas": [{"titulo": str, "descricao": str, "severidade": "alta"|"media"|"baixa", "produto_relacionado": str}]}` (or `{"alertas": [], "erro": str}` on malformed JSON) — consumed by Task 10's orchestrator.

- [ ] **Step 1: Write the failing tests**

`tests/test_agente_anomalias.py`:
```python
import json
from types import SimpleNamespace

from app.ia import agente_anomalias


class ClienteFalso:
    def __init__(self, texto_resposta):
        self.texto_resposta = texto_resposta
        self.mensagens_recebidas = None
        self.messages = self

    def create(self, **kwargs):
        self.mensagens_recebidas = kwargs
        return SimpleNamespace(content=[SimpleNamespace(text=self.texto_resposta)])


def test_executar_retorna_alertas_da_ia(monkeypatch):
    resposta_json = json.dumps({
        "alertas": [
            {"titulo": "Queda de vendas", "descricao": "Produto X caiu 80%", "severidade": "alta", "produto_relacionado": "Produto X"}
        ]
    })
    cliente_falso = ClienteFalso(resposta_json)
    monkeypatch.setattr(agente_anomalias, "obter_cliente", lambda: cliente_falso)
    monkeypatch.setattr(agente_anomalias, "obter_modelo", lambda: "modelo-teste")

    resultado = agente_anomalias.executar({"ticket_medio": 100.0}, {"interpretacao": "texto"})

    assert resultado["alertas"][0]["severidade"] == "alta"
    assert cliente_falso.mensagens_recebidas["model"] == "modelo-teste"


def test_executar_lida_com_resposta_invalida(monkeypatch):
    cliente_falso = ClienteFalso("não é json")
    monkeypatch.setattr(agente_anomalias, "obter_cliente", lambda: cliente_falso)
    monkeypatch.setattr(agente_anomalias, "obter_modelo", lambda: "modelo-teste")

    resultado = agente_anomalias.executar({}, {})

    assert resultado["alertas"] == []
    assert "erro" in resultado
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `pytest tests/test_agente_anomalias.py -v`
Expected: FAIL — `app.ia.agente_anomalias` doesn't exist yet.

- [ ] **Step 3: Implement `app/ia/agente_anomalias.py`**

```python
import json

from app.ia.cliente_claude import obter_cliente, obter_modelo

SYSTEM_PROMPT = """Você é um especialista em detectar anomalias operacionais em um pequeno
comércio de roupas (loja física + Shopee). Você recebe um resumo em JSON com números já
calculados (produtos parados, estoque baixo, giro de estoque, faturamento por canal) e a
interpretação de KPIs feita por outro analista. Use esses sinais — e qualquer padrão que você
observar nos dados brutos fornecidos — para levantar alertas relevantes (quedas bruscas de
venda, produtos parados há muito tempo, divergência entre canais, possíveis erros de cadastro).
Se não houver nenhuma anomalia relevante, devolva uma lista vazia.

Responda APENAS com um JSON válido, sem nenhum texto fora do JSON, no formato:
{"alertas": [{"titulo": "...", "descricao": "...", "severidade": "alta|media|baixa", "produto_relacionado": "..."}]}
"""


def executar(resumo: dict, interpretacao_kpis: dict) -> dict:
    cliente = obter_cliente()
    conteudo = json.dumps({"resumo": resumo, "interpretacao_kpis": interpretacao_kpis}, ensure_ascii=False)
    resposta = cliente.messages.create(
        model=obter_modelo(),
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": conteudo}],
    )
    texto = resposta.content[0].text
    try:
        return json.loads(texto)
    except json.JSONDecodeError:
        return {"alertas": [], "erro": texto}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `pytest -v`
Expected: PASS (all tests so far)

- [ ] **Step 5: Commit**

```bash
git add app/ia/agente_anomalias.py tests/test_agente_anomalias.py
git commit -m "feat: add Agente de Anomalias"
```

---

### Task 9: Agente de Recomendações

**Files:**
- Create: `app/ia/agente_recomendacoes.py`
- Create: `tests/test_agente_recomendacoes.py`

**Interfaces:**
- Consumes: `app.ia.cliente_claude.obter_cliente`/`obter_modelo` (Task 7).
- Produces: `app.ia.agente_recomendacoes.executar(resumo: dict, interpretacao_kpis: dict, anomalias: dict) -> dict` returning `{"acoes": [{"titulo": str, "descricao": str, "prioridade": "alta"|"media"|"baixa"}]}` (or `{"acoes": [], "erro": str}` on malformed JSON) — consumed by Task 10's orchestrator.

- [ ] **Step 1: Write the failing tests**

`tests/test_agente_recomendacoes.py`:
```python
import json
from types import SimpleNamespace

from app.ia import agente_recomendacoes


class ClienteFalso:
    def __init__(self, texto_resposta):
        self.texto_resposta = texto_resposta
        self.mensagens_recebidas = None
        self.messages = self

    def create(self, **kwargs):
        self.mensagens_recebidas = kwargs
        return SimpleNamespace(content=[SimpleNamespace(text=self.texto_resposta)])


def test_executar_retorna_acoes_da_ia(monkeypatch):
    resposta_json = json.dumps({
        "acoes": [{"titulo": "Repor estoque", "descricao": "Comprar mais unidades", "prioridade": "alta"}]
    })
    cliente_falso = ClienteFalso(resposta_json)
    monkeypatch.setattr(agente_recomendacoes, "obter_cliente", lambda: cliente_falso)
    monkeypatch.setattr(agente_recomendacoes, "obter_modelo", lambda: "modelo-teste")

    resultado = agente_recomendacoes.executar({}, {"interpretacao": "x"}, {"alertas": []})

    assert resultado["acoes"][0]["prioridade"] == "alta"
    assert cliente_falso.mensagens_recebidas["model"] == "modelo-teste"


def test_executar_lida_com_resposta_invalida(monkeypatch):
    cliente_falso = ClienteFalso("não é json")
    monkeypatch.setattr(agente_recomendacoes, "obter_cliente", lambda: cliente_falso)
    monkeypatch.setattr(agente_recomendacoes, "obter_modelo", lambda: "modelo-teste")

    resultado = agente_recomendacoes.executar({}, {}, {})

    assert resultado["acoes"] == []
    assert "erro" in resultado
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `pytest tests/test_agente_recomendacoes.py -v`
Expected: FAIL — `app.ia.agente_recomendacoes` doesn't exist yet.

- [ ] **Step 3: Implement `app/ia/agente_recomendacoes.py`**

```python
import json

from app.ia.cliente_claude import obter_cliente, obter_modelo

SYSTEM_PROMPT = """Você é um consultor de logística para um pequeno comércio de roupas femininas
(loja física + Shopee). Você recebe o resumo de dados, a interpretação de KPIs e a lista de
anomalias detectadas por outros analistas. Com base nisso, sugira ações práticas e específicas:
reposição de estoque, produtos a promover, ajustes de canal de venda. Seja concreto — cite
produtos pelo nome quando fizer sentido.

Responda APENAS com um JSON válido, sem nenhum texto fora do JSON, no formato:
{"acoes": [{"titulo": "...", "descricao": "...", "prioridade": "alta|media|baixa"}]}
"""


def executar(resumo: dict, interpretacao_kpis: dict, anomalias: dict) -> dict:
    cliente = obter_cliente()
    conteudo = json.dumps(
        {"resumo": resumo, "interpretacao_kpis": interpretacao_kpis, "anomalias": anomalias},
        ensure_ascii=False,
    )
    resposta = cliente.messages.create(
        model=obter_modelo(),
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": conteudo}],
    )
    texto = resposta.content[0].text
    try:
        return json.loads(texto)
    except json.JSONDecodeError:
        return {"acoes": [], "erro": texto}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `pytest -v`
Expected: PASS (all tests so far)

- [ ] **Step 5: Commit**

```bash
git add app/ia/agente_recomendacoes.py tests/test_agente_recomendacoes.py
git commit -m "feat: add Agente de Recomendações"
```

---

### Task 10: Orquestrador (sequential 3-agent pipeline)

**Files:**
- Create: `app/ia/orquestrador.py`
- Create: `tests/test_orquestrador.py`

**Interfaces:**
- Consumes: `app.ia.resumo.montar_resumo_dados` (Task 6), `app.ia.agente_kpis/agente_anomalias/agente_recomendacoes.executar` (Tasks 7-9), `app.models.AnaliseIA` (Task 2).
- Produces: `app.ia.orquestrador.executar_analise(db: Session) -> dict` returning `{"gerado_em": iso-str, "kpis": {"dados_calculados": dict, "interpretacao": str}, "anomalias": dict, "recomendacoes": dict}`, and persists one `AnaliseIA` row per call. Consumed by Task 11's `/ia/analisar` route.

- [ ] **Step 1: Write the failing test**

`tests/test_orquestrador.py`:
```python
from app import models
from app.ia import orquestrador


def test_executar_analise_chama_agentes_em_sequencia_e_salva(monkeypatch, db_session):
    chamadas = []

    def kpis_falso(resumo):
        chamadas.append("kpis")
        return {"interpretacao": "interpretação teste"}

    def anomalias_falso(resumo, interpretacao_kpis):
        chamadas.append("anomalias")
        assert interpretacao_kpis == {"interpretacao": "interpretação teste"}
        return {"alertas": [{"titulo": "t", "descricao": "d", "severidade": "alta", "produto_relacionado": "x"}]}

    def recomendacoes_falso(resumo, interpretacao_kpis, anomalias):
        chamadas.append("recomendacoes")
        assert anomalias["alertas"][0]["titulo"] == "t"
        return {"acoes": [{"titulo": "a", "descricao": "b", "prioridade": "media"}]}

    monkeypatch.setattr(orquestrador.agente_kpis, "executar", kpis_falso)
    monkeypatch.setattr(orquestrador.agente_anomalias, "executar", anomalias_falso)
    monkeypatch.setattr(orquestrador.agente_recomendacoes, "executar", recomendacoes_falso)

    resultado = orquestrador.executar_analise(db_session)

    assert chamadas == ["kpis", "anomalias", "recomendacoes"]
    assert resultado["kpis"]["interpretacao"] == "interpretação teste"
    assert resultado["anomalias"]["alertas"][0]["titulo"] == "t"
    assert resultado["recomendacoes"]["acoes"][0]["titulo"] == "a"

    analise_salva = db_session.query(models.AnaliseIA).first()
    assert analise_salva is not None
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pytest tests/test_orquestrador.py -v`
Expected: FAIL — `app.ia.orquestrador` doesn't exist yet.

- [ ] **Step 3: Implement `app/ia/orquestrador.py`**

```python
import json
from datetime import datetime

from sqlalchemy.orm import Session

from app import models
from app.ia import agente_anomalias, agente_kpis, agente_recomendacoes
from app.ia.resumo import montar_resumo_dados


def executar_analise(db: Session) -> dict:
    """Chama os 3 agentes em sequência e salva o resultado consolidado."""
    resumo = montar_resumo_dados(db)

    interpretacao_kpis = agente_kpis.executar(resumo)
    anomalias = agente_anomalias.executar(resumo, interpretacao_kpis)
    recomendacoes = agente_recomendacoes.executar(resumo, interpretacao_kpis, anomalias)

    resultado = {
        "gerado_em": datetime.utcnow().isoformat(),
        "kpis": {"dados_calculados": resumo, "interpretacao": interpretacao_kpis.get("interpretacao", "")},
        "anomalias": anomalias,
        "recomendacoes": recomendacoes,
    }

    db.add(models.AnaliseIA(
        data_hora=datetime.utcnow(),
        kpis_json=json.dumps(resultado["kpis"], ensure_ascii=False),
        anomalias_json=json.dumps(resultado["anomalias"], ensure_ascii=False),
        recomendacoes_json=json.dumps(resultado["recomendacoes"], ensure_ascii=False),
    ))
    db.commit()

    return resultado
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pytest -v`
Expected: PASS (all tests so far)

- [ ] **Step 5: Commit**

```bash
git add app/ia/orquestrador.py tests/test_orquestrador.py
git commit -m "feat: add sequential 3-agent orchestrator"
```

---

### Task 11: Rotas de IA

**Files:**
- Create: `app/routers/ia.py`
- Modify: `app/main.py` (replace entire file)
- Create: `tests/test_rotas_ia.py`

**Interfaces:**
- Consumes: `app.ia.orquestrador.executar_analise` (Task 10), `app.models.AnaliseIA` (Task 2).
- Produces: `POST /ia/analisar`, `GET /ia/ultima`, `GET /ia/historico` routes.

- [ ] **Step 1: Write the failing tests**

`tests/test_rotas_ia.py`:
```python
import json

from app import models
from app.routers import ia as rotas_ia


def test_post_analisar_chama_orquestrador(client, monkeypatch):
    def analise_falsa(db):
        return {"gerado_em": "2026-01-01T00:00:00", "kpis": {}, "anomalias": {}, "recomendacoes": {}}

    monkeypatch.setattr(rotas_ia, "executar_analise", analise_falsa)

    resposta = client.post("/ia/analisar")

    assert resposta.status_code == 200
    assert resposta.json()["gerado_em"] == "2026-01-01T00:00:00"


def test_get_ultima_retorna_none_quando_sem_analises(client):
    resposta = client.get("/ia/ultima")
    assert resposta.status_code == 200
    assert resposta.json() is None


def test_get_ultima_retorna_analise_mais_recente(client, db_session):
    analise = models.AnaliseIA(
        kpis_json=json.dumps({"interpretacao": "x"}),
        anomalias_json=json.dumps({"alertas": []}),
        recomendacoes_json=json.dumps({"acoes": []}),
    )
    db_session.add(analise)
    db_session.commit()

    resposta = client.get("/ia/ultima")

    assert resposta.status_code == 200
    assert resposta.json()["kpis"] == {"interpretacao": "x"}


def test_historico_lista_analises(client, db_session):
    db_session.add(models.AnaliseIA(kpis_json="{}", anomalias_json="{}", recomendacoes_json="{}"))
    db_session.add(models.AnaliseIA(kpis_json="{}", anomalias_json="{}", recomendacoes_json="{}"))
    db_session.commit()

    resposta = client.get("/ia/historico")

    assert resposta.status_code == 200
    assert len(resposta.json()) == 2
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `pytest tests/test_rotas_ia.py -v`
Expected: FAIL — `/ia/*` routes don't exist yet.

- [ ] **Step 3: Implement `app/routers/ia.py`**

```python
import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.ia.orquestrador import executar_analise

router = APIRouter(prefix="/ia", tags=["ia"])


@router.post("/analisar")
def analisar(db: Session = Depends(get_db)):
    return executar_analise(db)


@router.get("/ultima")
def ultima_analise(db: Session = Depends(get_db)):
    analise = db.query(models.AnaliseIA).order_by(models.AnaliseIA.data_hora.desc()).first()
    if not analise:
        return None
    return {
        "gerado_em": analise.data_hora.isoformat(),
        "kpis": json.loads(analise.kpis_json),
        "anomalias": json.loads(analise.anomalias_json),
        "recomendacoes": json.loads(analise.recomendacoes_json),
    }


@router.get("/historico")
def historico(db: Session = Depends(get_db)):
    analises = db.query(models.AnaliseIA).order_by(models.AnaliseIA.data_hora.desc()).all()
    return [{"id": a.id, "data_hora": a.data_hora.isoformat()} for a in analises]
```

- [ ] **Step 4: Modify `app/main.py`** (replace entire file)

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv()

from app.database import Base, engine
from app import models  # noqa: F401
from app.routers import produtos, pedidos, estoque, ia

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Fama Fashion")
app.mount("/static", StaticFiles(directory="app/static"), name="static")

app.include_router(produtos.router)
app.include_router(pedidos.router)
app.include_router(estoque.router)
app.include_router(ia.router)


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `pytest -v`
Expected: PASS (all tests so far)

- [ ] **Step 6: Commit**

```bash
git add app/routers/ia.py app/main.py tests/test_rotas_ia.py
git commit -m "feat: add IA routes (analisar, ultima, historico)"
```

---

### Task 12: Seed script (example data)

**Files:**
- Create: `seed.py`
- Create: `tests/test_seed.py`

**Interfaces:**
- Consumes: `app.database.Base/engine/SessionLocal`, `app.models` (Task 2).
- Produces: `seed.popular_produtos(db: Session) -> list[Produto]`, `seed.popular_pedidos(db: Session, produtos: list[Produto]) -> None`, `seed.PRODUTOS_SEED` (list of dicts), `seed.main()` (CLI entry point using the real database).

- [ ] **Step 1: Write the failing test**

`tests/test_seed.py`:
```python
from datetime import datetime, timedelta

from app import models
from seed import PRODUTOS_SEED, popular_pedidos, popular_produtos


def test_seed_cria_produtos_e_pedidos(db_session):
    produtos = popular_produtos(db_session)
    assert len(produtos) == len(PRODUTOS_SEED)

    popular_pedidos(db_session, produtos)

    assert db_session.query(models.Pedido).count() > 0

    produto_parado = db_session.query(models.Produto).filter_by(sku="VES-004").first()
    tem_pedido = (
        db_session.query(models.ItemPedido)
        .filter(models.ItemPedido.produto_id == produto_parado.id)
        .first()
    )
    assert tem_pedido is None

    produto_queda = db_session.query(models.Produto).filter_by(sku="SAI-001").first()
    itens_queda = (
        db_session.query(models.ItemPedido)
        .join(models.Pedido)
        .filter(models.ItemPedido.produto_id == produto_queda.id)
        .all()
    )
    assert len(itens_queda) > 0
    limite_recente = datetime.utcnow() - timedelta(days=20)
    assert all(item.pedido.data_pedido < limite_recente for item in itens_queda)
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pytest tests/test_seed.py -v`
Expected: FAIL — `seed.py` doesn't exist yet.

- [ ] **Step 3: Implement `seed.py`**

```python
"""Popula o banco de dados com produtos e pedidos de exemplo para demonstração."""
import random
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app import models
from app.database import Base, SessionLocal, engine

random.seed(42)

PRODUTOS_SEED = [
    {"sku": "BLU-001", "nome": "Blusa Cropped Básica", "categoria": "Blusa", "tamanho": "P", "cor": "Preto", "preco": 49.90, "quantidade_estoque": 30, "estoque_minimo": 5},
    {"sku": "BLU-002", "nome": "Blusa Ciganinha", "categoria": "Blusa", "tamanho": "M", "cor": "Branco", "preco": 59.90, "quantidade_estoque": 25, "estoque_minimo": 5},
    {"sku": "VES-001", "nome": "Vestido Midi Floral", "categoria": "Vestido", "tamanho": "M", "cor": "Rosa", "preco": 129.90, "quantidade_estoque": 15, "estoque_minimo": 4},
    {"sku": "VES-002", "nome": "Vestido Longo Festa", "categoria": "Vestido", "tamanho": "G", "cor": "Vermelho", "preco": 189.90, "quantidade_estoque": 8, "estoque_minimo": 3},
    {"sku": "SAI-001", "nome": "Saia Jeans", "categoria": "Saia", "tamanho": "M", "cor": "Azul", "preco": 79.90, "quantidade_estoque": 20, "estoque_minimo": 5},
    {"sku": "SAI-002", "nome": "Saia Plissada", "categoria": "Saia", "tamanho": "P", "cor": "Preto", "preco": 69.90, "quantidade_estoque": 18, "estoque_minimo": 5},
    {"sku": "CAL-001", "nome": "Calça Wide Leg", "categoria": "Calça", "tamanho": "M", "cor": "Branco", "preco": 99.90, "quantidade_estoque": 22, "estoque_minimo": 5},
    {"sku": "CAL-002", "nome": "Calça Alfaiataria", "categoria": "Calça", "tamanho": "G", "cor": "Preto", "preco": 109.90, "quantidade_estoque": 3, "estoque_minimo": 5},
    {"sku": "SHO-001", "nome": "Short Jeans", "categoria": "Short", "tamanho": "P", "cor": "Azul", "preco": 59.90, "quantidade_estoque": 26, "estoque_minimo": 5},
    {"sku": "SHO-002", "nome": "Short Alfaiataria", "categoria": "Short", "tamanho": "M", "cor": "Vermelho", "preco": 64.90, "quantidade_estoque": 14, "estoque_minimo": 5},
    {"sku": "BLU-003", "nome": "Blusa Manga Longa", "categoria": "Blusa", "tamanho": "G", "cor": "Rosa", "preco": 54.90, "quantidade_estoque": 19, "estoque_minimo": 5},
    {"sku": "VES-003", "nome": "Vestido Curto Casual", "categoria": "Vestido", "tamanho": "P", "cor": "Branco", "preco": 89.90, "quantidade_estoque": 17, "estoque_minimo": 5},
    {"sku": "SAI-003", "nome": "Saia Lápis", "categoria": "Saia", "tamanho": "M", "cor": "Vermelho", "preco": 74.90, "quantidade_estoque": 21, "estoque_minimo": 5},
    {"sku": "CAL-003", "nome": "Calça Legging", "categoria": "Calça", "tamanho": "P", "cor": "Preto", "preco": 44.90, "quantidade_estoque": 28, "estoque_minimo": 5},
    {"sku": "SHO-003", "nome": "Short Moletom", "categoria": "Short", "tamanho": "G", "cor": "Azul", "preco": 39.90, "quantidade_estoque": 24, "estoque_minimo": 5},
    # Produto propositalmente parado: estoque disponível, sem nenhuma venda recente
    {"sku": "VES-004", "nome": "Vestido Inverno Tricot", "categoria": "Vestido", "tamanho": "M", "cor": "Preto", "preco": 149.90, "quantidade_estoque": 12, "estoque_minimo": 3},
]

NOMES_CLIENTES = [
    "Ana Souza", "Beatriz Lima", "Carla Mendes", "Daniela Rocha", "Elisa Santos",
    "Fernanda Alves", "Gabriela Reis", "Helena Costa", "Isabela Martins", "Julia Ferreira",
]


def popular_produtos(db: Session) -> list:
    produtos = [models.Produto(**dados) for dados in PRODUTOS_SEED]
    db.add_all(produtos)
    db.commit()
    for produto in produtos:
        db.refresh(produto)
    return produtos


def _criar_pedido(db: Session, canal: str, cliente_nome: str, dias_atras: int, itens: list) -> models.Pedido:
    """itens: lista de tuplas (produto, quantidade)."""
    data_pedido = datetime.utcnow() - timedelta(days=dias_atras)
    pedido = models.Pedido(
        canal=canal, cliente_nome=cliente_nome, cliente_contato="11999990000",
        status="entregue", data_pedido=data_pedido, valor_total=0.0, criado_em=data_pedido,
    )
    db.add(pedido)
    db.flush()

    valor_total = 0.0
    for produto, quantidade in itens:
        subtotal = produto.preco * quantidade
        db.add(models.ItemPedido(
            pedido_id=pedido.id, produto_id=produto.id,
            quantidade=quantidade, preco_unitario=produto.preco, subtotal=subtotal,
        ))
        produto.quantidade_estoque = max(produto.quantidade_estoque - quantidade, 0)
        valor_total += subtotal

    pedido.valor_total = valor_total
    db.commit()
    return pedido


def popular_pedidos(db: Session, produtos: list) -> None:
    produtos_por_sku = {p.sku: p for p in produtos}

    # Produto com queda brusca de vendas: vendas concentradas entre 42 e 55 dias atrás, nada recente
    produto_queda = produtos_por_sku["SAI-001"]
    for dias in [55, 52, 48, 45, 42]:
        canal = random.choice(["loja_fisica", "shopee"])
        _criar_pedido(db, canal, random.choice(NOMES_CLIENTES), dias, [(produto_queda, random.randint(2, 4))])

    # Pedidos variados nos últimos 35 dias, para os demais produtos (exceto o parado e o de queda)
    produtos_ativos = [p for p in produtos if p.sku not in ("VES-004", "SAI-001")]
    for _ in range(35):
        dias_atras = random.randint(0, 35)
        canal = random.choice(["loja_fisica", "shopee"])
        cliente = random.choice(NOMES_CLIENTES)
        itens = [
            (produto, random.randint(1, 3))
            for produto in random.sample(produtos_ativos, k=random.randint(1, 2))
        ]
        _criar_pedido(db, canal, cliente, dias_atras, itens)


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(models.Produto).first():
            print("Banco já contém dados. Nenhuma alteração feita.")
            return
        produtos = popular_produtos(db)
        popular_pedidos(db, produtos)
        print(f"Seed concluído: {len(produtos)} produtos e {db.query(models.Pedido).count()} pedidos criados.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pytest -v`
Expected: PASS (all tests so far)

- [ ] **Step 5: Commit**

```bash
git add seed.py tests/test_seed.py
git commit -m "feat: add example data seed script"
```

---

### Task 13: Frontend base (layout, styles, shared JS helper)

**Files:**
- Create: `app/templates/base.html`
- Create: `app/static/css/estilos.css`
- Create: `app/static/js/common.js`
- Create: `tests/test_frontend_base.py`

**Interfaces:**
- Produces: `base.html` Jinja2 block layout (`{% block scripts %}`, `{% block conteudo %}`) extended by every screen template in Tasks 14-17; `chamarApi(url, opcoes) -> Promise` JS helper (thin `fetch` wrapper that throws with the backend's `detail` message on non-2xx responses) used by every screen's JS file; shared CSS classes `linha-baixo-estoque`, `linha-parado`, `alerta-alta/media/baixa`, `card`, `cards`, `formulario` used by Tasks 14-17.

- [ ] **Step 1: Write the failing tests**

`tests/test_frontend_base.py`:
```python
def test_estilos_css_disponivel(client):
    resposta = client.get("/static/css/estilos.css")
    assert resposta.status_code == 200


def test_common_js_disponivel(client):
    resposta = client.get("/static/js/common.js")
    assert resposta.status_code == 200
    assert "chamarApi" in resposta.text
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `pytest tests/test_frontend_base.py -v`
Expected: FAIL — files don't exist yet (404).

- [ ] **Step 3: Implement `app/static/js/common.js`**

```javascript
async function chamarApi(url, opcoes = {}) {
  const resposta = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opcoes,
  });
  if (resposta.status === 204) {
    return null;
  }
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    const mensagem = (dados && dados.detail) || "Erro ao comunicar com o servidor";
    throw new Error(mensagem);
  }
  return dados;
}
```

- [ ] **Step 4: Implement `app/static/css/estilos.css`**

```css
* { box-sizing: border-box; }
body { font-family: Arial, sans-serif; margin: 0; background: #f5f5f7; color: #222; }
.topo { background: #1f2937; color: white; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; }
.topo nav a { color: white; margin-left: 1.5rem; text-decoration: none; }
.topo nav a:hover { text-decoration: underline; }
.conteudo { padding: 2rem; max-width: 1100px; margin: 0 auto; }
table { width: 100%; border-collapse: collapse; background: white; margin-top: 1rem; }
th, td { padding: 0.6rem 0.8rem; border-bottom: 1px solid #ddd; text-align: left; }
th { background: #e5e7eb; }
form.formulario { background: white; padding: 1rem 1.5rem; border-radius: 8px; margin-top: 1rem; display: grid; gap: 0.6rem; max-width: 500px; }
form.formulario label { font-size: 0.9rem; font-weight: bold; }
form.formulario input, form.formulario select { padding: 0.4rem; }
button { cursor: pointer; padding: 0.5rem 1rem; border: none; border-radius: 4px; background: #2563eb; color: white; }
button.excluir { background: #dc2626; }
.linha-baixo-estoque { background: #fef3c7; }
.linha-parado { background: #fee2e2; }
.cards { display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 1rem; }
.card { background: white; padding: 1rem 1.5rem; border-radius: 8px; flex: 1; min-width: 180px; }
.alerta { padding: 0.8rem; border-radius: 6px; margin-bottom: 0.6rem; }
.alerta-alta { background: #fee2e2; border-left: 4px solid #dc2626; }
.alerta-media { background: #fef3c7; border-left: 4px solid #d97706; }
.alerta-baixa { background: #e0f2fe; border-left: 4px solid #0284c7; }
.graficos { display: flex; gap: 2rem; flex-wrap: wrap; margin-top: 1.5rem; }
.grafico-container { background: white; padding: 1rem; border-radius: 8px; flex: 1; min-width: 300px; }
```

- [ ] **Step 5: Implement `app/templates/base.html`**

```html
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <title>Fama Fashion</title>
  <link rel="stylesheet" href="/static/css/estilos.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
  <script src="/static/js/common.js" defer></script>
  {% block scripts %}{% endblock %}
</head>
<body>
  <header class="topo">
    <h1>Fama Fashion</h1>
    <nav>
      <a href="/">Produtos</a>
      <a href="/pedidos-page">Pedidos</a>
      <a href="/estoque-page">Estoque</a>
      <a href="/painel-ia">Painel de IA</a>
    </nav>
  </header>
  <main class="conteudo">
    {% block conteudo %}{% endblock %}
  </main>
</body>
</html>
```

- [ ] **Step 6: Run tests, verify they pass**

Run: `pytest -v`
Expected: PASS (all tests so far)

- [ ] **Step 7: Commit**

```bash
git add app/templates/base.html app/static/css/estilos.css app/static/js/common.js tests/test_frontend_base.py
git commit -m "feat: add shared frontend layout, styles, and fetch helper"
```

---

### Task 14: Tela de Produtos

**Files:**
- Create: `app/templates/produtos.html`
- Create: `app/static/js/produtos.js`
- Modify: `app/main.py` (replace entire file)
- Create: `tests/test_pagina_produtos.py`

**Interfaces:**
- Consumes: `base.html` (Task 13), `/produtos` CRUD routes (Task 3).
- Produces: `GET /` page route.

- [ ] **Step 1: Write the failing tests**

`tests/test_pagina_produtos.py`:
```python
def test_pagina_produtos_carrega(client):
    resposta = client.get("/")
    assert resposta.status_code == 200
    assert "form-produto" in resposta.text
    assert "Fama Fashion" in resposta.text


def test_produtos_js_disponivel(client):
    resposta = client.get("/static/js/produtos.js")
    assert resposta.status_code == 200
    assert "carregarProdutos" in resposta.text
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `pytest tests/test_pagina_produtos.py -v`
Expected: FAIL — `/` route (404, since no page route defined yet) and `produtos.js` (404) don't exist.

- [ ] **Step 3: Implement `app/templates/produtos.html`**

```html
{% extends "base.html" %}
{% block scripts %}<script src="/static/js/produtos.js" defer></script>{% endblock %}
{% block conteudo %}
<h2>Produtos</h2>

<form id="form-produto" class="formulario">
  <input type="hidden" id="produto-id">
  <label>SKU</label>
  <input type="text" id="produto-sku" required>
  <label>Nome</label>
  <input type="text" id="produto-nome" required>
  <label>Categoria</label>
  <input type="text" id="produto-categoria" required>
  <label>Tamanho</label>
  <input type="text" id="produto-tamanho" required>
  <label>Cor</label>
  <input type="text" id="produto-cor" required>
  <label>Preço (R$)</label>
  <input type="number" id="produto-preco" step="0.01" min="0" required>
  <label>Quantidade em estoque</label>
  <input type="number" id="produto-quantidade" min="0" required>
  <label>Estoque mínimo</label>
  <input type="number" id="produto-estoque-minimo" min="0" value="5" required>
  <button type="submit">Salvar produto</button>
</form>

<table>
  <thead>
    <tr><th>SKU</th><th>Nome</th><th>Categoria</th><th>Tamanho</th><th>Cor</th><th>Preço</th><th>Estoque</th><th>Ações</th></tr>
  </thead>
  <tbody id="tabela-produtos"></tbody>
</table>
{% endblock %}
```

- [ ] **Step 4: Implement `app/static/js/produtos.js`**

```javascript
const formProduto = document.getElementById("form-produto");
const tabelaProdutos = document.getElementById("tabela-produtos");

async function carregarProdutos() {
  const produtos = await chamarApi("/produtos");
  tabelaProdutos.innerHTML = "";
  for (const produto of produtos) {
    const linha = document.createElement("tr");
    linha.innerHTML = `
      <td>${produto.sku}</td>
      <td>${produto.nome}</td>
      <td>${produto.categoria}</td>
      <td>${produto.tamanho}</td>
      <td>${produto.cor}</td>
      <td>R$ ${produto.preco.toFixed(2)}</td>
      <td>${produto.quantidade_estoque}</td>
      <td>
        <button type="button" data-id="${produto.id}" class="editar">Editar</button>
        <button type="button" data-id="${produto.id}" class="excluir">Excluir</button>
      </td>
    `;
    tabelaProdutos.appendChild(linha);
  }
}

formProduto.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const id = document.getElementById("produto-id").value;
  const dados = {
    sku: document.getElementById("produto-sku").value,
    nome: document.getElementById("produto-nome").value,
    categoria: document.getElementById("produto-categoria").value,
    tamanho: document.getElementById("produto-tamanho").value,
    cor: document.getElementById("produto-cor").value,
    preco: parseFloat(document.getElementById("produto-preco").value),
    quantidade_estoque: parseInt(document.getElementById("produto-quantidade").value, 10),
    estoque_minimo: parseInt(document.getElementById("produto-estoque-minimo").value, 10),
  };
  try {
    if (id) {
      await chamarApi(`/produtos/${id}`, { method: "PUT", body: JSON.stringify(dados) });
    } else {
      await chamarApi("/produtos", { method: "POST", body: JSON.stringify(dados) });
    }
    formProduto.reset();
    document.getElementById("produto-id").value = "";
    await carregarProdutos();
  } catch (erro) {
    alert(erro.message);
  }
});

tabelaProdutos.addEventListener("click", async (evento) => {
  const id = evento.target.dataset.id;
  if (!id) return;

  if (evento.target.classList.contains("excluir")) {
    if (!confirm("Excluir este produto?")) return;
    await chamarApi(`/produtos/${id}`, { method: "DELETE" });
    await carregarProdutos();
  }

  if (evento.target.classList.contains("editar")) {
    const produto = await chamarApi(`/produtos/${id}`);
    document.getElementById("produto-id").value = produto.id;
    document.getElementById("produto-sku").value = produto.sku;
    document.getElementById("produto-nome").value = produto.nome;
    document.getElementById("produto-categoria").value = produto.categoria;
    document.getElementById("produto-tamanho").value = produto.tamanho;
    document.getElementById("produto-cor").value = produto.cor;
    document.getElementById("produto-preco").value = produto.preco;
    document.getElementById("produto-quantidade").value = produto.quantidade_estoque;
    document.getElementById("produto-estoque-minimo").value = produto.estoque_minimo;
  }
});

carregarProdutos();
```

- [ ] **Step 5: Modify `app/main.py`** (replace entire file)

```python
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv

load_dotenv()

from app.database import Base, engine
from app import models  # noqa: F401
from app.routers import produtos, pedidos, estoque, ia

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Fama Fashion")
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

app.include_router(produtos.router)
app.include_router(pedidos.router)
app.include_router(estoque.router)
app.include_router(ia.router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def pagina_produtos(request: Request):
    return templates.TemplateResponse("produtos.html", {"request": request})
```

- [ ] **Step 6: Run tests, verify they pass**

Run: `pytest -v`
Expected: PASS (all tests so far)

- [ ] **Step 7: Commit**

```bash
git add app/templates/produtos.html app/static/js/produtos.js app/main.py tests/test_pagina_produtos.py
git commit -m "feat: add Produtos screen"
```

**Manual verification (not automatable via TestClient):** run `uvicorn app.main:app --reload`, open `http://127.0.0.1:8000/` in a browser, create/edit/delete a product through the form and confirm the table updates live.

---

### Task 15: Tela de Pedidos

**Files:**
- Create: `app/templates/pedidos.html`
- Create: `app/static/js/pedidos.js`
- Modify: `app/main.py` (replace entire file)
- Create: `tests/test_pagina_pedidos.py`

**Interfaces:**
- Consumes: `base.html` (Task 13), `/produtos` (Task 3), `/pedidos` CRUD routes (Task 4).
- Produces: `GET /pedidos-page` page route.

- [ ] **Step 1: Write the failing tests**

`tests/test_pagina_pedidos.py`:
```python
def test_pagina_pedidos_carrega(client):
    resposta = client.get("/pedidos-page")
    assert resposta.status_code == 200
    assert "form-pedido" in resposta.text


def test_pedidos_js_disponivel(client):
    resposta = client.get("/static/js/pedidos.js")
    assert resposta.status_code == 200
    assert "carregarPedidos" in resposta.text
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `pytest tests/test_pagina_pedidos.py -v`
Expected: FAIL — `/pedidos-page` route and `pedidos.js` don't exist yet.

- [ ] **Step 3: Implement `app/templates/pedidos.html`**

```html
{% extends "base.html" %}
{% block scripts %}<script src="/static/js/pedidos.js" defer></script>{% endblock %}
{% block conteudo %}
<h2>Pedidos</h2>

<form id="form-pedido" class="formulario">
  <label>Canal</label>
  <select id="pedido-canal" required>
    <option value="loja_fisica">Loja física</option>
    <option value="shopee">Shopee</option>
  </select>
  <label>Nome do cliente</label>
  <input type="text" id="pedido-cliente-nome" required>
  <label>Contato do cliente</label>
  <input type="text" id="pedido-cliente-contato">
  <label>Status</label>
  <select id="pedido-status">
    <option value="pendente">Pendente</option>
    <option value="confirmado">Confirmado</option>
    <option value="enviado">Enviado</option>
    <option value="entregue">Entregue</option>
    <option value="cancelado">Cancelado</option>
  </select>

  <label>Itens do pedido</label>
  <div id="itens-pedido"></div>
  <button type="button" id="adicionar-item">+ item</button>

  <button type="submit">Criar pedido</button>
</form>

<table>
  <thead>
    <tr><th>#</th><th>Canal</th><th>Cliente</th><th>Data</th><th>Status</th><th>Valor total</th><th>Ações</th></tr>
  </thead>
  <tbody id="tabela-pedidos"></tbody>
</table>
{% endblock %}
```

- [ ] **Step 4: Implement `app/static/js/pedidos.js`**

```javascript
const formPedido = document.getElementById("form-pedido");
const itensContainer = document.getElementById("itens-pedido");
const tabelaPedidos = document.getElementById("tabela-pedidos");
let produtosDisponiveis = [];

function criarLinhaItem() {
  const linha = document.createElement("div");
  linha.className = "linha-item";
  const opcoesProdutos = produtosDisponiveis
    .map((p) => `<option value="${p.id}">${p.nome} (${p.sku})</option>`)
    .join("");
  linha.innerHTML = `
    <select class="item-produto">${opcoesProdutos}</select>
    <input type="number" class="item-quantidade" min="1" value="1" required>
    <button type="button" class="remover-item">Remover</button>
  `;
  linha.querySelector(".remover-item").addEventListener("click", () => linha.remove());
  itensContainer.appendChild(linha);
}

document.getElementById("adicionar-item").addEventListener("click", criarLinhaItem);

async function carregarProdutosDisponiveis() {
  produtosDisponiveis = await chamarApi("/produtos");
}

const STATUS_OPCOES = ["pendente", "confirmado", "enviado", "entregue", "cancelado"];

async function carregarPedidos() {
  const pedidos = await chamarApi("/pedidos");
  tabelaPedidos.innerHTML = "";
  for (const pedido of pedidos) {
    const opcoesStatus = STATUS_OPCOES
      .map((s) => `<option value="${s}" ${s === pedido.status ? "selected" : ""}>${s}</option>`)
      .join("");
    const linha = document.createElement("tr");
    linha.innerHTML = `
      <td>${pedido.id}</td>
      <td>${pedido.canal}</td>
      <td>${pedido.cliente_nome}</td>
      <td>${new Date(pedido.data_pedido).toLocaleString("pt-BR")}</td>
      <td><select class="mudar-status" data-id="${pedido.id}">${opcoesStatus}</select></td>
      <td>R$ ${pedido.valor_total.toFixed(2)}</td>
      <td><button type="button" data-id="${pedido.id}" class="excluir">Excluir</button></td>
    `;
    tabelaPedidos.appendChild(linha);
  }
}

formPedido.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const itens = Array.from(itensContainer.querySelectorAll(".linha-item")).map((linha) => ({
    produto_id: parseInt(linha.querySelector(".item-produto").value, 10),
    quantidade: parseInt(linha.querySelector(".item-quantidade").value, 10),
  }));

  const dados = {
    canal: document.getElementById("pedido-canal").value,
    cliente_nome: document.getElementById("pedido-cliente-nome").value,
    cliente_contato: document.getElementById("pedido-cliente-contato").value,
    status: document.getElementById("pedido-status").value,
    itens,
  };

  try {
    await chamarApi("/pedidos", { method: "POST", body: JSON.stringify(dados) });
    formPedido.reset();
    itensContainer.innerHTML = "";
    criarLinhaItem();
    await carregarPedidos();
  } catch (erro) {
    alert(erro.message);
  }
});

tabelaPedidos.addEventListener("click", async (evento) => {
  if (!evento.target.classList.contains("excluir")) return;
  if (!confirm("Excluir este pedido?")) return;
  await chamarApi(`/pedidos/${evento.target.dataset.id}`, { method: "DELETE" });
  await carregarPedidos();
});

tabelaPedidos.addEventListener("change", async (evento) => {
  if (!evento.target.classList.contains("mudar-status")) return;
  await chamarApi(`/pedidos/${evento.target.dataset.id}`, {
    method: "PUT",
    body: JSON.stringify({ status: evento.target.value }),
  });
  await carregarPedidos();
});

(async function iniciar() {
  await carregarProdutosDisponiveis();
  criarLinhaItem();
  await carregarPedidos();
})();
```

- [ ] **Step 5: Modify `app/main.py`** (replace entire file — adds the `/pedidos-page` route)

```python
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv

load_dotenv()

from app.database import Base, engine
from app import models  # noqa: F401
from app.routers import produtos, pedidos, estoque, ia

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Fama Fashion")
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

app.include_router(produtos.router)
app.include_router(pedidos.router)
app.include_router(estoque.router)
app.include_router(ia.router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def pagina_produtos(request: Request):
    return templates.TemplateResponse("produtos.html", {"request": request})


@app.get("/pedidos-page")
def pagina_pedidos(request: Request):
    return templates.TemplateResponse("pedidos.html", {"request": request})
```

- [ ] **Step 6: Run tests, verify they pass**

Run: `pytest -v`
Expected: PASS (all tests so far)

- [ ] **Step 7: Commit**

```bash
git add app/templates/pedidos.html app/static/js/pedidos.js app/main.py tests/test_pagina_pedidos.py
git commit -m "feat: add Pedidos screen"
```

**Manual verification:** run the server, open `/pedidos-page`, create an order with 2+ items across both channels, change its status via the dropdown, delete one, and confirm the Produtos screen reflects the stock changes.

---

### Task 16: Tela de Estoque

**Files:**
- Create: `app/templates/estoque.html`
- Create: `app/static/js/estoque.js`
- Modify: `app/main.py` (replace entire file)
- Create: `tests/test_pagina_estoque.py`

**Interfaces:**
- Consumes: `base.html` (Task 13), `/estoque/resumo`, `/estoque/baixo`, `/estoque/parados` (Task 5).
- Produces: `GET /estoque-page` page route.

- [ ] **Step 1: Write the failing tests**

`tests/test_pagina_estoque.py`:
```python
def test_pagina_estoque_carrega(client):
    resposta = client.get("/estoque-page")
    assert resposta.status_code == 200
    assert "cards-resumo" in resposta.text


def test_estoque_js_disponivel(client):
    resposta = client.get("/static/js/estoque.js")
    assert resposta.status_code == 200
    assert "carregarEstoque" in resposta.text
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `pytest tests/test_pagina_estoque.py -v`
Expected: FAIL — `/estoque-page` route and `estoque.js` don't exist yet.

- [ ] **Step 3: Implement `app/templates/estoque.html`**

```html
{% extends "base.html" %}
{% block scripts %}<script src="/static/js/estoque.js" defer></script>{% endblock %}
{% block conteudo %}
<h2>Estoque geral</h2>

<div class="cards" id="cards-resumo"></div>

<table>
  <thead>
    <tr><th>SKU</th><th>Nome</th><th>Estoque atual</th><th>Estoque mínimo</th><th>Situação</th></tr>
  </thead>
  <tbody id="tabela-estoque"></tbody>
</table>
{% endblock %}
```

- [ ] **Step 4: Implement `app/static/js/estoque.js`**

```javascript
async function carregarEstoque() {
  const resumo = await chamarApi("/estoque/resumo");
  const baixo = await chamarApi("/estoque/baixo");
  const parados = await chamarApi("/estoque/parados");

  const idsBaixo = new Set(baixo.map((p) => p.id));
  const idsParados = new Set(parados.map((p) => p.id));

  document.getElementById("cards-resumo").innerHTML = `
    <div class="card"><h3>Valor total em estoque</h3><p>R$ ${resumo.valor_total_estoque.toFixed(2)}</p></div>
    <div class="card"><h3>Produtos com estoque baixo</h3><p>${baixo.length}</p></div>
    <div class="card"><h3>Produtos parados</h3><p>${parados.length}</p></div>
  `;

  const tabela = document.getElementById("tabela-estoque");
  tabela.innerHTML = "";
  for (const produto of resumo.produtos) {
    const linha = document.createElement("tr");
    let situacao = "Normal";
    if (idsBaixo.has(produto.id)) {
      linha.classList.add("linha-baixo-estoque");
      situacao = "Estoque baixo";
    }
    if (idsParados.has(produto.id)) {
      linha.classList.add("linha-parado");
      situacao = "Parado";
    }
    linha.innerHTML = `
      <td>${produto.sku}</td>
      <td>${produto.nome}</td>
      <td>${produto.quantidade_estoque}</td>
      <td>${produto.estoque_minimo}</td>
      <td>${situacao}</td>
    `;
    tabela.appendChild(linha);
  }
}

carregarEstoque();
```

- [ ] **Step 5: Modify `app/main.py`** (replace entire file — adds the `/estoque-page` route)

```python
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv

load_dotenv()

from app.database import Base, engine
from app import models  # noqa: F401
from app.routers import produtos, pedidos, estoque, ia

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Fama Fashion")
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

app.include_router(produtos.router)
app.include_router(pedidos.router)
app.include_router(estoque.router)
app.include_router(ia.router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def pagina_produtos(request: Request):
    return templates.TemplateResponse("produtos.html", {"request": request})


@app.get("/pedidos-page")
def pagina_pedidos(request: Request):
    return templates.TemplateResponse("pedidos.html", {"request": request})


@app.get("/estoque-page")
def pagina_estoque(request: Request):
    return templates.TemplateResponse("estoque.html", {"request": request})
```

- [ ] **Step 6: Run tests, verify they pass**

Run: `pytest -v`
Expected: PASS (all tests so far)

- [ ] **Step 7: Commit**

```bash
git add app/templates/estoque.html app/static/js/estoque.js app/main.py tests/test_pagina_estoque.py
git commit -m "feat: add Estoque screen"
```

**Manual verification:** run the server, open `/estoque-page`, confirm the summary cards match `/estoque/resumo` and that low-stock/stale products are visually highlighted.

---

### Task 17: Painel de Análise com IA

**Files:**
- Create: `app/templates/painel_ia.html`
- Create: `app/static/js/painel_ia.js`
- Modify: `app/main.py` (replace entire file)
- Create: `tests/test_pagina_painel_ia.py`

**Interfaces:**
- Consumes: `base.html` (Task 13), `POST /ia/analisar`, `GET /ia/ultima` (Task 11). Reads the exact `montar_resumo_dados` field names from Task 6 (`faturamento_por_canal`, `ticket_medio`, `quantidade_pedidos_ultimos_30_dias`, `top_produtos_mais_vendidos[].nome`/`.quantidade_vendida`) and the agent output shapes from Tasks 8-9 (`anomalias.alertas[].severidade`, `recomendacoes.acoes[].prioridade`, matching the CSS classes `alerta-alta/media/baixa` from Task 13).
- Produces: `GET /painel-ia` page route.

- [ ] **Step 1: Write the failing tests**

`tests/test_pagina_painel_ia.py`:
```python
def test_pagina_painel_ia_carrega(client):
    resposta = client.get("/painel-ia")
    assert resposta.status_code == 200
    assert "botao-analisar" in resposta.text


def test_painel_ia_js_disponivel(client):
    resposta = client.get("/static/js/painel_ia.js")
    assert resposta.status_code == 200
    assert "renderizarAnalise" in resposta.text
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `pytest tests/test_pagina_painel_ia.py -v`
Expected: FAIL — `/painel-ia` route and `painel_ia.js` don't exist yet.

- [ ] **Step 3: Implement `app/templates/painel_ia.html`**

```html
{% extends "base.html" %}
{% block scripts %}<script src="/static/js/painel_ia.js" defer></script>{% endblock %}
{% block conteudo %}
<h2>Painel de Análise com IA</h2>

<button type="button" id="botao-analisar">Analisar agora</button>
<p id="ultima-geracao"></p>

<div class="graficos">
  <div class="grafico-container"><canvas id="grafico-faturamento"></canvas></div>
  <div class="grafico-container"><canvas id="grafico-top-produtos"></canvas></div>
</div>

<div class="cards" id="card-kpis"></div>

<h3>Anomalias detectadas</h3>
<div id="lista-anomalias"></div>

<h3>Recomendações</h3>
<div id="lista-recomendacoes"></div>
{% endblock %}
```

- [ ] **Step 4: Implement `app/static/js/painel_ia.js`**

```javascript
let graficoFaturamento = null;
let graficoTopProdutos = null;

function renderizarAnalise(analise) {
  if (!analise) {
    document.getElementById("ultima-geracao").textContent =
      "Nenhuma análise gerada ainda. Clique em 'Analisar agora'.";
    return;
  }

  document.getElementById("ultima-geracao").textContent =
    "Última análise: " + new Date(analise.gerado_em).toLocaleString("pt-BR");

  const dados = analise.kpis.dados_calculados;

  document.getElementById("card-kpis").innerHTML = `
    <div class="card"><h3>Ticket médio</h3><p>R$ ${dados.ticket_medio.toFixed(2)}</p></div>
    <div class="card"><h3>Pedidos (30 dias)</h3><p>${dados.quantidade_pedidos_ultimos_30_dias}</p></div>
    <div class="card"><h3>Interpretação da IA</h3><p>${analise.kpis.interpretacao}</p></div>
  `;

  const contextoFaturamento = document.getElementById("grafico-faturamento").getContext("2d");
  if (graficoFaturamento) graficoFaturamento.destroy();
  graficoFaturamento = new Chart(contextoFaturamento, {
    type: "bar",
    data: {
      labels: Object.keys(dados.faturamento_por_canal),
      datasets: [{ label: "Faturamento por canal (R$)", data: Object.values(dados.faturamento_por_canal) }],
    },
  });

  const contextoTop = document.getElementById("grafico-top-produtos").getContext("2d");
  if (graficoTopProdutos) graficoTopProdutos.destroy();
  graficoTopProdutos = new Chart(contextoTop, {
    type: "bar",
    data: {
      labels: dados.top_produtos_mais_vendidos.map((p) => p.nome),
      datasets: [{ label: "Quantidade vendida", data: dados.top_produtos_mais_vendidos.map((p) => p.quantidade_vendida) }],
    },
  });

  const listaAnomalias = document.getElementById("lista-anomalias");
  listaAnomalias.innerHTML = analise.anomalias.alertas && analise.anomalias.alertas.length
    ? analise.anomalias.alertas
        .map((a) => `<div class="alerta alerta-${a.severidade}"><strong>${a.titulo}</strong><p>${a.descricao}</p></div>`)
        .join("")
    : "<p>Nenhuma anomalia detectada.</p>";

  const listaRecomendacoes = document.getElementById("lista-recomendacoes");
  listaRecomendacoes.innerHTML = analise.recomendacoes.acoes && analise.recomendacoes.acoes.length
    ? analise.recomendacoes.acoes
        .map((a) => `<div class="alerta alerta-${a.prioridade}"><strong>${a.titulo}</strong><p>${a.descricao}</p></div>`)
        .join("")
    : "<p>Nenhuma recomendação no momento.</p>";
}

document.getElementById("botao-analisar").addEventListener("click", async () => {
  const botao = document.getElementById("botao-analisar");
  botao.disabled = true;
  botao.textContent = "Analisando...";
  try {
    const analise = await chamarApi("/ia/analisar", { method: "POST" });
    renderizarAnalise(analise);
  } catch (erro) {
    alert(erro.message);
  } finally {
    botao.disabled = false;
    botao.textContent = "Analisar agora";
  }
});

(async function iniciar() {
  const ultima = await chamarApi("/ia/ultima");
  renderizarAnalise(ultima);
})();
```

- [ ] **Step 5: Modify `app/main.py`** (replace entire file — adds the `/painel-ia` route)

```python
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv

load_dotenv()

from app.database import Base, engine
from app import models  # noqa: F401
from app.routers import produtos, pedidos, estoque, ia

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Fama Fashion")
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

app.include_router(produtos.router)
app.include_router(pedidos.router)
app.include_router(estoque.router)
app.include_router(ia.router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def pagina_produtos(request: Request):
    return templates.TemplateResponse("produtos.html", {"request": request})


@app.get("/pedidos-page")
def pagina_pedidos(request: Request):
    return templates.TemplateResponse("pedidos.html", {"request": request})


@app.get("/estoque-page")
def pagina_estoque(request: Request):
    return templates.TemplateResponse("estoque.html", {"request": request})


@app.get("/painel-ia")
def pagina_painel_ia(request: Request):
    return templates.TemplateResponse("painel_ia.html", {"request": request})
```

- [ ] **Step 6: Run tests, verify they pass**

Run: `pytest -v`
Expected: PASS (all tests so far — the full suite from Tasks 1-17)

- [ ] **Step 7: Commit**

```bash
git add app/templates/painel_ia.html app/static/js/painel_ia.js app/main.py tests/test_pagina_painel_ia.py
git commit -m "feat: add Painel de Análise com IA screen"
```

**Manual verification (requires a real `ANTHROPIC_API_KEY` in `.env`):** run the server, open `/painel-ia`, click "Analisar agora", and confirm the two charts render, the KPI interpretation text appears, and the anomaly/recommendation lists are populated and color-coded by severity/priority.

---

### Task 18: README + final end-to-end verification

**Files:**
- Create: `README.md`

**Interfaces:**
- None (documentation only; final task in the plan).

- [ ] **Step 1: Write `README.md`**

```markdown
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
```

- [ ] **Step 2: Run the full test suite one last time**

Run: `pytest -v`
Expected: PASS — every test from Tasks 1-17 passes together.

- [ ] **Step 3: Manual end-to-end walkthrough**

With `.env` configured and `python seed.py` already run:

1. `uvicorn app.main:app --reload`
2. Open `/` — confirm the seeded products list, create one new product, edit it, delete it.
3. Open `/pedidos-page` — create an order with 2 items across both channels, confirm the total and that stock decreased on `/`; change its status to `cancelado` and confirm stock is restored.
4. Open `/estoque-page` — confirm the summary cards and that `VES-004` (the seeded stale product) and `CAL-002` (the seeded low-stock product) are visually highlighted.
5. Open `/painel-ia` — click "Analisar agora", confirm both charts render, the KPI interpretation reads sensibly, and the seeded sales-drop on `SAI-001` shows up as an anomaly alert.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup, run, and verification instructions"
```

