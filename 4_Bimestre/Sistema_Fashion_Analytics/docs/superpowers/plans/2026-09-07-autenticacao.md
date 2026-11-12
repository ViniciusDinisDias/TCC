# Autenticação e Controle de Acesso Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add login (admin vs. assistente) with session-cookie auth, enforced server-side on every mutating route, plus the matching frontend (login page, hidden action buttons for the read-only role).

**Architecture:** A new `Usuario` table + `app/auth.py` (stdlib PBKDF2 hashing, session helpers, two FastAPI dependencies: `exigir_login` and `exigir_admin`). Starlette's `SessionMiddleware` signs a cookie holding `{id, login, papel}`. Every API router gets `exigir_login` on reads and `exigir_admin` on writes; every page route checks the session directly and redirects to `/login` if absent. The frontend reads `window.PAPEL_USUARIO` (set from the session in `base.html`) to hide create/edit/delete controls for the assistant role — the backend check is what actually enforces it.

**Tech Stack:** FastAPI, Starlette `SessionMiddleware`, stdlib `hashlib`/`hmac` (no new hashing library), `python-multipart` (new — required by FastAPI's `Form()`), pytest + FastAPI TestClient.

**Spec:** `docs/superpowers/specs/2026-09-07-autenticacao-design.md`

## Global Constraints

- No new password-hashing dependency — `hashlib.pbkdf2_hmac` (stdlib) only.
- Session via signed cookie (`SessionMiddleware`), not JWT/localStorage.
- Assistente: full read access everywhere, including triggering `/ia/analisar`. Blocked (403) on every POST/PUT/DELETE under `/produtos` and `/pedidos`.
- `/health` stays public, no auth check.
- Backend authorization is the real gate; hiding buttons in the UI is cosmetic on top of it, never a substitute for it.
- Every existing test that calls the API through the `client` fixture will start failing (401) the moment auth lands on the routers — they must be migrated to `client_admin` in the same change that adds the enforcement, verified by a full-suite run before moving on.

---

## File Structure

| File | Change |
|---|---|
| `app/models.py` | Add `Usuario` |
| `app/auth.py` | New: hashing, `autenticar`, `exigir_login`, `exigir_admin` |
| `tests/test_auth_hash.py` | New: unit tests for the hashing functions |
| `app/main.py` | `SessionMiddleware`, `/login`, `/logout`, page routes check session + pass `usuario` |
| `app/templates/login.html` | New |
| `app/templates/base.html` | Sidebar footer shows the user + a logout link; `window.PAPEL_USUARIO` |
| `app/routers/produtos.py`, `pedidos.py`, `estoque.py`, `dashboard.py`, `ia.py` | Add `exigir_login`/`exigir_admin` dependencies |
| `tests/conftest.py` | `client_admin`, `client_assistente` fixtures |
| `tests/test_autenticacao.py` | New: login/logout/redirect/401/403 behavior |
| All existing `tests/test_rotas_*.py`, `tests/test_pagina_*.py` | `client` → `client_admin` |
| `app/templates/produtos.html`, `pedidos.html` | Wrap "+ Novo X" button in `{% if usuario.papel == 'admin' %}` |
| `app/static/js/produtos.js`, `pedidos.js` | Guard the now-optional button; hide editar/excluir and disable status select when `window.PAPEL_USUARIO !== "admin"` |
| `app/static/js/common.js` | `chamarApi` redirects to `/login` on 401 |
| `app/static/css/estilos.css` | Login page styles, sidebar logout icon contrast, disabled-select style |
| `seed.py` | `popular_usuarios`, called unconditionally |
| `tests/test_seed.py` | Tests for `popular_usuarios` |
| `.env.example`, `requirements.txt`, `README.md` | New env vars, `itsdangerous`/`python-multipart`, docs |

---

### Task 1: `Usuario` model

**Files:**
- Modify: `app/models.py`

**Interfaces:**
- Produces: `models.Usuario` with columns `id`, `login` (unique), `senha_hash`, `papel`.

- [ ] **Step 1: Add the model**

Append to `app/models.py`:

```python
class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    login = Column(String, unique=True, index=True, nullable=False)
    senha_hash = Column(String, nullable=False)
    papel = Column(String, nullable=False)  # "admin" | "assistente"
```

- [ ] **Step 2: Verify the app still imports cleanly**

Run: `python -c "from app import models; print(models.Usuario.__tablename__)"`
Expected: prints `usuarios`

- [ ] **Step 3: Commit**

```bash
git add app/models.py
git commit -m "feat: add Usuario model"
```

---

### Task 2: `app/auth.py` — hashing and dependencies

**Files:**
- Create: `app/auth.py`
- Test: `tests/test_auth_hash.py`

**Interfaces:**
- Produces: `PAPEL_ADMIN`, `PAPEL_ASSISTENTE`, `SESSAO_CHAVE_USUARIO`, `gerar_hash_senha(senha: str) -> str`, `verificar_senha(senha: str, hash_armazenado: str) -> bool`, `autenticar(db, login, senha) -> models.Usuario | None`, `obter_usuario_sessao(request) -> dict | None`, `exigir_login(request) -> dict` (FastAPI dependency, raises 401), `exigir_admin(usuario=Depends(exigir_login)) -> dict` (raises 403).

- [ ] **Step 1: Write the failing tests**

```python
from app import auth


def test_hash_senha_correta_verifica_true():
    hash_gerado = auth.gerar_hash_senha("minhaSenha123")
    assert auth.verificar_senha("minhaSenha123", hash_gerado) is True


def test_hash_senha_errada_verifica_false():
    hash_gerado = auth.gerar_hash_senha("minhaSenha123")
    assert auth.verificar_senha("senhaErrada", hash_gerado) is False


def test_hash_gera_salt_diferente_a_cada_chamada():
    hash_a = auth.gerar_hash_senha("mesmaSenha")
    hash_b = auth.gerar_hash_senha("mesmaSenha")
    assert hash_a != hash_b
    assert auth.verificar_senha("mesmaSenha", hash_a) is True
    assert auth.verificar_senha("mesmaSenha", hash_b) is True


def test_verificar_senha_com_hash_malformado_retorna_false():
    assert auth.verificar_senha("qualquer", "hash-sem-separador") is False
```

- [ ] **Step 2: Run to confirm it fails**

Run: `pytest tests/test_auth_hash.py -v`
Expected: FAIL — `app.auth` doesn't exist yet (`ModuleNotFoundError`).

- [ ] **Step 3: Write `app/auth.py`**

```python
import hashlib
import hmac
import os

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app import models

PAPEL_ADMIN = "admin"
PAPEL_ASSISTENTE = "assistente"

SESSAO_CHAVE_USUARIO = "usuario"

_ITERACOES_PBKDF2 = 200_000


def gerar_hash_senha(senha: str) -> str:
    salt = os.urandom(16)
    hash_bytes = hashlib.pbkdf2_hmac("sha256", senha.encode("utf-8"), salt, _ITERACOES_PBKDF2)
    return f"{salt.hex()}${hash_bytes.hex()}"


def verificar_senha(senha: str, hash_armazenado: str) -> bool:
    try:
        salt_hex, hash_hex = hash_armazenado.split("$", 1)
        salt = bytes.fromhex(salt_hex)
    except ValueError:
        return False
    hash_calculado = hashlib.pbkdf2_hmac("sha256", senha.encode("utf-8"), salt, _ITERACOES_PBKDF2)
    return hmac.compare_digest(hash_calculado.hex(), hash_hex)


def autenticar(db: Session, login: str, senha: str) -> models.Usuario | None:
    usuario = db.query(models.Usuario).filter(models.Usuario.login == login).first()
    if not usuario or not verificar_senha(senha, usuario.senha_hash):
        return None
    return usuario


def obter_usuario_sessao(request: Request) -> dict | None:
    return request.session.get(SESSAO_CHAVE_USUARIO)


def exigir_login(request: Request) -> dict:
    usuario = obter_usuario_sessao(request)
    if not usuario:
        raise HTTPException(status_code=401, detail="Não autenticado")
    return usuario


def exigir_admin(usuario: dict = Depends(exigir_login)) -> dict:
    if usuario.get("papel") != PAPEL_ADMIN:
        raise HTTPException(status_code=403, detail="Ação restrita ao administrador")
    return usuario
```

- [ ] **Step 4: Run to confirm it passes**

Run: `pytest tests/test_auth_hash.py -v`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add app/auth.py tests/test_auth_hash.py
git commit -m "feat: add password hashing and auth dependencies"
```

---

### Task 3: Session middleware, new dependency, env vars

**Files:**
- Modify: `app/main.py`
- Modify: `requirements.txt`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `app.auth` (Task 2).
- Produces: `app.add_middleware(SessionMiddleware, ...)` registered before any route is hit; `request.session` usable everywhere.

- [ ] **Step 1: Add dependencies to `requirements.txt`**

Append these two lines:

```
itsdangerous>=2.0
python-multipart>=0.0.9
```

`itsdangerous` signs the session cookie (already installed transitively, but now used directly). `python-multipart` is required by FastAPI's `Form(...)` for the login POST — without it FastAPI raises a runtime error the first time a form is submitted.

- [ ] **Step 2: Install them**

Run: `pip install -r requirements.txt`
Expected: both packages install (or confirm already satisfied for `itsdangerous`).

- [ ] **Step 3: Add env vars to `.env.example`**

```
ANTHROPIC_API_KEY=coloque_sua_chave_aqui
ANTHROPIC_MODEL=claude-sonnet-5
SESSION_SECRET_KEY=troque-esta-chave-antes-de-qualquer-deploy-real
SEED_SENHA_ADMIN=admin123
SEED_SENHA_ASSISTENTE=assistente123
```

(This replaces the full contents of `.env.example`.)

- [ ] **Step 4: Register the middleware in `app/main.py`**

Add the import and registration (right after `app = FastAPI(...)`, before `app.mount("/static", ...)`):

```python
from starlette.middleware.sessions import SessionMiddleware
```

```python
app.add_middleware(
    SessionMiddleware,
    secret_key=os.environ.get("SESSION_SECRET_KEY", "chave-dev-fama-fashion-trocar-em-producao"),
    session_cookie="fama_fashion_sessao",
    same_site="lax",
)
```

`app/main.py` already has `import os` from the cache-busting change — no new import needed for that.

- [ ] **Step 5: Verify the app still starts**

Run: `python -c "from app.main import app; print('ok')"`
Expected: prints `ok`, no import errors.

- [ ] **Step 6: Commit**

```bash
git add app/main.py requirements.txt .env.example
git commit -m "feat: register SessionMiddleware, add itsdangerous/python-multipart"
```

---

### Task 4: Test fixtures for authenticated clients

**Files:**
- Modify: `tests/conftest.py`

**Interfaces:**
- Consumes: `app.auth.gerar_hash_senha`, `app.auth.PAPEL_ADMIN`, `app.auth.PAPEL_ASSISTENTE` (Task 2); `models.Usuario` (Task 1).
- Produces: fixtures `client_admin`, `client_assistente` — a `TestClient` already logged in as that role (cookies persist on the same client instance for the rest of the test).

- [ ] **Step 1: Add the fixtures**

Add to the top of `tests/conftest.py` (after the existing imports) and at the end of the file:

```python
from app import auth, models
```

```python
def _criar_usuario(db_session, login, senha, papel):
    usuario = models.Usuario(login=login, senha_hash=auth.gerar_hash_senha(senha), papel=papel)
    db_session.add(usuario)
    db_session.commit()
    return usuario


@pytest.fixture
def client_admin(client, db_session):
    _criar_usuario(db_session, "admin_teste", "senha123", auth.PAPEL_ADMIN)
    client.post("/login", data={"login": "admin_teste", "senha": "senha123"})
    return client


@pytest.fixture
def client_assistente(client, db_session):
    _criar_usuario(db_session, "assistente_teste", "senha123", auth.PAPEL_ASSISTENTE)
    client.post("/login", data={"login": "assistente_teste", "senha": "senha123"})
    return client
```

- [ ] **Step 2: Verify (temporary, ad hoc)**

Run: `python -c "
from tests.conftest import _criar_usuario
print('import ok')
"`
Expected: prints `import ok`. This just confirms no syntax/import errors — real coverage comes from tests in later tasks that consume `client_admin`/`client_assistente` (login/logout routes don't exist until Task 5, so these fixtures can't be exercised end-to-end yet).

- [ ] **Step 3: Commit**

```bash
git add tests/conftest.py
git commit -m "test: add client_admin/client_assistente fixtures"
```

---

### Task 5: Login/logout routes + login page

**Files:**
- Modify: `app/main.py`
- Create: `app/templates/login.html`
- Modify: `app/static/css/estilos.css`
- Test: `tests/test_autenticacao.py`

**Interfaces:**
- Consumes: `auth.autenticar`, `auth.SESSAO_CHAVE_USUARIO`, `auth.obter_usuario_sessao` (Task 2); `client_admin`/`client_assistente` fixtures become usable end-to-end from here on.
- Produces: `GET/POST /login`, `GET /logout`.

- [ ] **Step 1: Write the failing tests**

```python
from app import auth, models


def test_login_com_credenciais_corretas_cria_sessao(client, db_session):
    usuario = models.Usuario(login="ana", senha_hash=auth.gerar_hash_senha("segredo123"), papel=auth.PAPEL_ADMIN)
    db_session.add(usuario)
    db_session.commit()

    resposta = client.post("/login", data={"login": "ana", "senha": "segredo123"}, follow_redirects=False)
    assert resposta.status_code == 303
    assert resposta.headers["location"] == "/"


def test_login_com_senha_errada_falha(client, db_session):
    usuario = models.Usuario(login="ana", senha_hash=auth.gerar_hash_senha("segredo123"), papel=auth.PAPEL_ADMIN)
    db_session.add(usuario)
    db_session.commit()

    resposta = client.post("/login", data={"login": "ana", "senha": "errada"})
    assert resposta.status_code == 401
    assert "Usuário ou senha inválidos" in resposta.text


def test_logout_limpa_sessao(client_admin):
    resposta = client_admin.get("/logout", follow_redirects=False)
    assert resposta.status_code == 303
    assert resposta.headers["location"] == "/login"

    resposta_pagina = client_admin.get("/produtos-page", follow_redirects=False)
    assert resposta_pagina.status_code == 303
    assert resposta_pagina.headers["location"] == "/login"
```

- [ ] **Step 2: Run to confirm it fails**

Run: `pytest tests/test_autenticacao.py -v`
Expected: FAIL — `/login` doesn't exist (404s), and `/produtos-page` doesn't redirect yet since Task 7 hasn't landed. Only the first two tests are expected to be meaningfully checkable right now; run them to see 404s, confirming the routes are missing.

- [ ] **Step 3: Write `app/templates/login.html`**

```html
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <title>Fama Fashion — Entrar</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500..700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">
  <link rel="stylesheet" href="/static/css/estilos.css?v={{ static_version('css/estilos.css') }}">
</head>
<body class="pagina-login">
  <div class="login-tela">
    <div class="login-card">
      <div class="login-marca">
        <div class="login-marca-mono">F</div>
        <div>
          <div class="login-marca-nome">Fama Fashion</div>
          <div class="login-marca-sub">Gestão</div>
        </div>
      </div>
      <h1 class="login-titulo">Entrar</h1>
      {% if erro %}<p class="login-erro">{{ erro }}</p>{% endif %}
      <form method="post" action="/login" class="formulario login-formulario">
        <label>Usuário</label>
        <input type="text" name="login" required autofocus>
        <label>Senha</label>
        <input type="password" name="senha" required>
        <button type="submit" class="btn">Entrar</button>
      </form>
    </div>
  </div>
</body>
</html>
```

- [ ] **Step 4: Add login page styles to `app/static/css/estilos.css`**

Append:

```css
/* ---------- Login ---------- */
.pagina-login{background:var(--surface);}
.login-tela{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.5rem;}
.login-card{background:var(--surface-card);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);padding:2.2rem 2rem;max-width:360px;width:100%;}
.login-marca{display:flex;align-items:center;gap:.6rem;margin-bottom:1.6rem;}
.login-marca-mono{width:34px;height:34px;border-radius:9px;background:linear-gradient(155deg,var(--accent),#5C1631);display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-weight:600;font-size:1.05rem;color:#fff;flex:none;}
.login-marca-nome{font-family:'Fraunces',serif;font-weight:600;font-size:1.1rem;line-height:1.1;}
.login-marca-sub{font-size:.72rem;color:var(--ink-soft);letter-spacing:.04em;text-transform:uppercase;}
.login-titulo{font-size:1.3rem;margin-bottom:1.2rem;}
.login-erro{background:var(--critical-soft);color:var(--critical);border-radius:8px;padding:.6rem .8rem;font-size:.84rem;margin-bottom:1rem;}
.login-formulario{max-width:none;box-shadow:none;border:none;padding:0;margin-bottom:0;}
.login-formulario .btn{width:100%;justify-content:center;margin-top:.4rem;}
```

- [ ] **Step 5: Add the routes to `app/main.py`**

Update the import block at the top of `app/main.py` — `Depends`, `Session`, `get_db`, and `auth` are not imported yet:

```python
from fastapi import Depends, FastAPI, Form, Request
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from dotenv import load_dotenv

load_dotenv()

from app.database import Base, engine, get_db
from app import auth, models  # noqa: F401
from app.routers import produtos, pedidos, estoque, ia, dashboard
```

(This replaces the existing `from fastapi import FastAPI, Request` line and the `from app.database import Base, engine` / `from app import models` lines — everything else in that block stays where it is.)

Add right after the `/health` route:

```python
@app.get("/login")
def pagina_login(request: Request):
    if auth.obter_usuario_sessao(request):
        return RedirectResponse("/", status_code=303)
    return templates.TemplateResponse(request, "login.html", {"erro": None})


@app.post("/login")
def autenticar_login(request: Request, login: str = Form(...), senha: str = Form(...), db: Session = Depends(get_db)):
    usuario = auth.autenticar(db, login, senha)
    if not usuario:
        return templates.TemplateResponse(
            request, "login.html", {"erro": "Usuário ou senha inválidos"}, status_code=401,
        )
    request.session[auth.SESSAO_CHAVE_USUARIO] = {"id": usuario.id, "login": usuario.login, "papel": usuario.papel}
    return RedirectResponse("/", status_code=303)


@app.get("/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/login", status_code=303)
```

This needs `from app import auth`, `from app.database import get_db` and `from sqlalchemy.orm import Session` at the top of `app/main.py` (`Depends` is already imported for the other routes — check the existing import line and extend it rather than duplicating).

- [ ] **Step 6: Run to confirm it passes**

Run: `pytest tests/test_autenticacao.py -v`
Expected: `test_login_com_credenciais_corretas_cria_sessao` and `test_login_com_senha_errada_falha` PASS. `test_logout_limpa_sessao` still FAILS (the `/produtos-page` redirect assertion) until Task 7 — leave it failing for now, Task 7 makes it pass.

- [ ] **Step 7: Commit**

```bash
git add app/main.py app/templates/login.html app/static/css/estilos.css tests/test_autenticacao.py
git commit -m "feat: add login/logout routes and login page"
```

---

### Task 6: Enforce auth on every API router

**Files:**
- Modify: `app/routers/produtos.py`, `app/routers/pedidos.py`, `app/routers/estoque.py`, `app/routers/dashboard.py`, `app/routers/ia.py`
- Modify (rename `client` → `client_admin`): `tests/test_rotas_produtos.py`, `tests/test_rotas_pedidos.py`, `tests/test_rotas_estoque.py`, `tests/test_rotas_dashboard.py`, `tests/test_rotas_ia.py`
- Modify: `tests/test_autenticacao.py` (add 401/403 coverage)

**Interfaces:**
- Consumes: `auth.exigir_login`, `auth.exigir_admin` (Task 2); `client_admin`/`client_assistente` (Task 4).

- [ ] **Step 1: Write the failing tests first**

Append to `tests/test_autenticacao.py`:

```python
def test_rota_api_sem_login_retorna_401(client):
    resposta = client.get("/produtos")
    assert resposta.status_code == 401


def test_escrita_de_produto_com_assistente_retorna_403(client_assistente):
    resposta = client_assistente.post("/produtos", json={
        "sku": "ASSIST-001", "nome": "Produto", "categoria": "Blusa",
        "tamanho": "M", "cor": "Azul", "preco": 10.0,
        "quantidade_estoque": 1, "estoque_minimo": 1,
    })
    assert resposta.status_code == 403


def test_escrita_de_pedido_com_assistente_retorna_403(client_assistente):
    resposta = client_assistente.put("/pedidos/1", json={"status": "cancelado"})
    assert resposta.status_code == 403


def test_leitura_com_assistente_funciona(client_assistente):
    resposta = client_assistente.get("/produtos")
    assert resposta.status_code == 200


def test_assistente_pode_disparar_analise_de_ia(client_assistente, monkeypatch):
    from app.routers import ia as rotas_ia

    def analise_falsa(db):
        return {"gerado_em": "2026-01-01T00:00:00", "kpis": {}, "anomalias": {}, "recomendacoes": {}}

    monkeypatch.setattr(rotas_ia, "executar_analise", analise_falsa)

    resposta = client_assistente.post("/ia/analisar")
    assert resposta.status_code == 200
```

- [ ] **Step 2: Run to confirm they fail**

Run: `pytest tests/test_autenticacao.py -v -k "sem_login or assistente"`
Expected: FAIL — `/produtos` currently has no auth dependency, so the 401/403 tests get 200/other unexpected codes.

- [ ] **Step 3: Add dependencies to `app/routers/produtos.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import auth, models, schemas
from app.database import get_db

router = APIRouter(prefix="/produtos", tags=["produtos"])


@router.get("", response_model=list[schemas.ProdutoOut])
def listar_produtos(
    nome: str | None = None,
    categoria: str | None = None,
    db: Session = Depends(get_db),
    usuario: dict = Depends(auth.exigir_login),
):
    query = db.query(models.Produto)
    if nome:
        query = query.filter(models.Produto.nome.ilike(f"%{nome}%"))
    if categoria:
        query = query.filter(models.Produto.categoria == categoria)
    return query.all()


@router.get("/{produto_id}", response_model=schemas.ProdutoOut)
def obter_produto(produto_id: int, db: Session = Depends(get_db), usuario: dict = Depends(auth.exigir_login)):
    produto = db.get(models.Produto, produto_id)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return produto


@router.post("", response_model=schemas.ProdutoOut, status_code=201)
def criar_produto(dados: schemas.ProdutoCreate, db: Session = Depends(get_db), usuario: dict = Depends(auth.exigir_admin)):
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
def editar_produto(produto_id: int, dados: schemas.ProdutoUpdate, db: Session = Depends(get_db), usuario: dict = Depends(auth.exigir_admin)):
    produto = db.get(models.Produto, produto_id)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(produto, campo, valor)
    db.commit()
    db.refresh(produto)
    return produto


@router.delete("/{produto_id}", status_code=204)
def remover_produto(produto_id: int, db: Session = Depends(get_db), usuario: dict = Depends(auth.exigir_admin)):
    produto = db.get(models.Produto, produto_id)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    db.delete(produto)
    db.commit()
    return None
```

- [ ] **Step 4: Add dependencies to `app/routers/pedidos.py`**

Replace the full file with (only the import line and each route's dependency list change — every function body is byte-for-byte the same as today):

```python
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app import auth, models, schemas
from app.database import get_db

router = APIRouter(prefix="/pedidos", tags=["pedidos"])


@router.get("", response_model=list[schemas.PedidoOut])
def listar_pedidos(
    canal: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    usuario: dict = Depends(auth.exigir_login),
):
    query = db.query(models.Pedido).options(joinedload(models.Pedido.itens))
    if canal:
        query = query.filter(models.Pedido.canal == canal)
    if status:
        query = query.filter(models.Pedido.status == status)
    return query.order_by(models.Pedido.data_pedido.desc()).all()


@router.get("/{pedido_id}", response_model=schemas.PedidoOut)
def obter_pedido(pedido_id: int, db: Session = Depends(get_db), usuario: dict = Depends(auth.exigir_login)):
    pedido = db.get(models.Pedido, pedido_id)
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return pedido


@router.post("", response_model=schemas.PedidoOut, status_code=201)
def criar_pedido(dados: schemas.PedidoCreate, db: Session = Depends(get_db), usuario: dict = Depends(auth.exigir_admin)):
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
def editar_pedido(pedido_id: int, dados: schemas.PedidoUpdate, db: Session = Depends(get_db), usuario: dict = Depends(auth.exigir_admin)):
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
def remover_pedido(pedido_id: int, db: Session = Depends(get_db), usuario: dict = Depends(auth.exigir_admin)):
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

- [ ] **Step 5: Add dependencies to `app/routers/estoque.py`**

Replace the full file (all three routes are read-only — `exigir_login`, no `exigir_admin`):

```python
from fastapi import APIRouter, Depends

from app import auth, models, servicos_estoque
from app.database import get_db

router = APIRouter(prefix="/estoque", tags=["estoque"])


@router.get("/resumo")
def resumo_estoque(db: Session = Depends(get_db), usuario: dict = Depends(auth.exigir_login)):
    produtos = db.query(models.Produto).all()
    return {
        "valor_total_estoque": servicos_estoque.calcular_valor_total_em_estoque(produtos),
        "quantidade_produtos": len(produtos),
        "produtos": [
            {
                "id": p.id, "nome": p.nome, "sku": p.sku,
                "quantidade_estoque": p.quantidade_estoque, "estoque_minimo": p.estoque_minimo,
                "preco": p.preco, "valor_estoque": round(p.preco * p.quantidade_estoque, 2),
            }
            for p in produtos
        ],
    }


@router.get("/baixo")
def produtos_com_estoque_baixo(db: Session = Depends(get_db), usuario: dict = Depends(auth.exigir_login)):
    produtos = db.query(models.Produto).all()
    baixos = servicos_estoque.listar_produtos_estoque_baixo(produtos)
    return [
        {"id": p.id, "nome": p.nome, "sku": p.sku, "quantidade_estoque": p.quantidade_estoque, "estoque_minimo": p.estoque_minimo}
        for p in baixos
    ]


@router.get("/parados")
def produtos_parados(dias: int = 30, db: Session = Depends(get_db), usuario: dict = Depends(auth.exigir_login)):
    produtos = db.query(models.Produto).all()
    parados = servicos_estoque.listar_produtos_parados(db, produtos, dias)
    return [
        {"id": p.id, "nome": p.nome, "sku": p.sku, "quantidade_estoque": p.quantidade_estoque}
        for p in parados
    ]
```

This needs `from sqlalchemy.orm import Session` added at the top (the current file relies on it only via the `Depends(get_db)` type hints — check the existing file: it's already imported today, keep that line, it's just not repeated above for brevity of the diff description — the full file must have `from sqlalchemy.orm import Session` as its second import line).

- [ ] **Step 6: Add the dependency to `app/routers/dashboard.py`**

In `app/routers/dashboard.py`, change:

```python
from app import models, servicos_estoque
```

to:

```python
from app import auth, models, servicos_estoque
```

and change the route signature from:

```python
@router.get("/resumo")
def resumo_dashboard(db: Session = Depends(get_db)):
```

to:

```python
@router.get("/resumo")
def resumo_dashboard(db: Session = Depends(get_db), usuario: dict = Depends(auth.exigir_login)):
```

Nothing else in the file changes — the entire body of `resumo_dashboard` (KPI/vendas/alertas/últimos-pedidos computation) stays exactly as-is, only its parameter list gains `usuario`.

- [ ] **Step 7: Add dependencies to `app/routers/ia.py`**

Replace the full file:

```python
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import auth, models
from app.database import get_db
from app.ia.orquestrador import executar_analise

router = APIRouter(prefix="/ia", tags=["ia"])


@router.post("/analisar")
def analisar(db: Session = Depends(get_db), usuario: dict = Depends(auth.exigir_login)):
    try:
        return executar_analise(db)
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Não foi possível falar com a IA. Verifique a ANTHROPIC_API_KEY no arquivo .env.",
        )


@router.get("/ultima")
def ultima_analise(db: Session = Depends(get_db), usuario: dict = Depends(auth.exigir_login)):
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
def historico(db: Session = Depends(get_db), usuario: dict = Depends(auth.exigir_login)):
    analises = db.query(models.AnaliseIA).order_by(models.AnaliseIA.data_hora.desc()).all()
    return [{"id": a.id, "data_hora": a.data_hora.isoformat()} for a in analises]
```

`analisar` uses `exigir_login` (not `exigir_admin`) — the assistant is allowed to trigger analysis, per the spec.

- [ ] **Step 8: Migrate existing route tests to `client_admin`**

In each of `tests/test_rotas_produtos.py`, `tests/test_rotas_pedidos.py`, `tests/test_rotas_estoque.py`, `tests/test_rotas_dashboard.py`, `tests/test_rotas_ia.py`: replace every `client` parameter with `client_admin`, and every use of the bare name `client` inside the test body with `client_admin`. `db_session` parameters (already present in some tests) stay as-is. For `test_rotas_pedidos.py`, this includes the `_criar_produto(client, ...)` helper — rename its parameter to `client_admin` and update its 6 call sites in the same file.

- [ ] **Step 9: Run to confirm everything passes**

Run: `pytest tests/test_rotas_produtos.py tests/test_rotas_pedidos.py tests/test_rotas_estoque.py tests/test_rotas_dashboard.py tests/test_rotas_ia.py tests/test_autenticacao.py -v`
Expected: PASS (the `test_logout_limpa_sessao` page-redirect assertion from Task 5 still fails — that's expected until Task 7).

- [ ] **Step 10: Commit**

```bash
git add app/routers tests/test_rotas_produtos.py tests/test_rotas_pedidos.py tests/test_rotas_estoque.py tests/test_rotas_dashboard.py tests/test_rotas_ia.py tests/test_autenticacao.py
git commit -m "feat: enforce login/admin checks on every API route"
```

---

### Task 7: Require login on pages, pass `usuario` to templates

**Files:**
- Modify: `app/main.py`
- Modify (rename `client` → `client_admin`): `tests/test_pagina_produtos.py`, `tests/test_pagina_pedidos.py`, `tests/test_pagina_resumo.py`, `tests/test_pagina_estoque.py`, `tests/test_pagina_painel_ia.py`
- Modify: `tests/test_autenticacao.py` (add page-redirect coverage)

**Interfaces:**
- Consumes: `auth.obter_usuario_sessao` (Task 2).
- Produces: every page route redirects unauthenticated visitors to `/login`; authenticated ones get `usuario` in the template context.

- [ ] **Step 1: Write the failing test**

Append to `tests/test_autenticacao.py`:

```python
def test_pagina_sem_login_redireciona_para_login(client):
    for rota in ["/", "/produtos-page", "/pedidos-page", "/estoque-page", "/painel-ia"]:
        resposta = client.get(rota, follow_redirects=False)
        assert resposta.status_code == 303, rota
        assert resposta.headers["location"] == "/login", rota
```

- [ ] **Step 2: Run to confirm it fails**

Run: `pytest tests/test_autenticacao.py::test_pagina_sem_login_redireciona_para_login -v`
Expected: FAIL — pages currently render directly with 200, no redirect.

- [ ] **Step 3: Update the page routes in `app/main.py`**

Replace all five page routes with:

```python
@app.get("/")
def pagina_resumo(request: Request):
    usuario = auth.obter_usuario_sessao(request)
    if not usuario:
        return RedirectResponse("/login", status_code=303)
    return templates.TemplateResponse(request, "resumo.html", {"pagina_ativa": "resumo", "usuario": usuario})


@app.get("/produtos-page")
def pagina_produtos(request: Request):
    usuario = auth.obter_usuario_sessao(request)
    if not usuario:
        return RedirectResponse("/login", status_code=303)
    return templates.TemplateResponse(request, "produtos.html", {"pagina_ativa": "produtos", "usuario": usuario})


@app.get("/pedidos-page")
def pagina_pedidos(request: Request):
    usuario = auth.obter_usuario_sessao(request)
    if not usuario:
        return RedirectResponse("/login", status_code=303)
    return templates.TemplateResponse(request, "pedidos.html", {"pagina_ativa": "pedidos", "usuario": usuario})


@app.get("/estoque-page")
def pagina_estoque(request: Request):
    usuario = auth.obter_usuario_sessao(request)
    if not usuario:
        return RedirectResponse("/login", status_code=303)
    return templates.TemplateResponse(request, "estoque.html", {"pagina_ativa": "estoque", "usuario": usuario})


@app.get("/painel-ia")
def pagina_painel_ia(request: Request):
    usuario = auth.obter_usuario_sessao(request)
    if not usuario:
        return RedirectResponse("/login", status_code=303)
    return templates.TemplateResponse(request, "painel_ia.html", {"pagina_ativa": "painel_ia", "usuario": usuario})
```

- [ ] **Step 4: Migrate existing page tests to `client_admin`**

In each of `tests/test_pagina_produtos.py`, `tests/test_pagina_pedidos.py`, `tests/test_pagina_resumo.py`, `tests/test_pagina_estoque.py`, `tests/test_pagina_painel_ia.py`: replace every `client` parameter and usage with `client_admin`.

- [ ] **Step 5: Run the full auth + page test set**

Run: `pytest tests/test_autenticacao.py tests/test_pagina_produtos.py tests/test_pagina_pedidos.py tests/test_pagina_resumo.py tests/test_pagina_estoque.py tests/test_pagina_painel_ia.py -v`
Expected: PASS — including `test_logout_limpa_sessao` from Task 5, now that page redirects exist.

- [ ] **Step 6: Run the entire suite as a checkpoint**

Run: `pytest -q`
Expected: PASS. This is the first point where every test file has been migrated — if anything outside the files touched so far still uses the bare `client` fixture against an authenticated route, it surfaces here.

- [ ] **Step 7: Commit**

```bash
git add app/main.py tests/test_pagina_produtos.py tests/test_pagina_pedidos.py tests/test_pagina_resumo.py tests/test_pagina_estoque.py tests/test_pagina_painel_ia.py tests/test_autenticacao.py
git commit -m "feat: require login on every page, pass usuario to templates"
```

---

### Task 8: Frontend — hide admin-only controls for the assistant role

**Files:**
- Modify: `app/templates/base.html`
- Modify: `app/templates/produtos.html`, `app/templates/pedidos.html`
- Modify: `app/static/js/produtos.js`, `app/static/js/pedidos.js`
- Modify: `app/static/js/common.js`
- Modify: `app/static/css/estilos.css`

**Interfaces:**
- Consumes: `usuario` in every page's template context (Task 7).
- Produces: `window.PAPEL_USUARIO` global; sidebar shows the logged-in user + logout link; "+ Novo Produto"/"+ Novo Pedido" and per-card editar/excluir are absent (not just visually hidden) for the assistant; the pedido status `<select>` is `disabled` for the assistant.

- [ ] **Step 1: `base.html` — user info, logout, `window.PAPEL_USUARIO`**

Add right after `<title>Fama Fashion</title>`:

```html
<script>window.PAPEL_USUARIO = "{{ usuario.papel }}";</script>
```

Replace the `sidebar-rodape` block:

```html
<div class="sidebar-rodape">
  <div class="sidebar-usuario">
    <div class="avatar">{{ usuario.login[:2].upper() }}</div>
    <div>
      <div class="nome">{{ usuario.login }}</div>
      <div class="papel">{{ "Administrador" if usuario.papel == "admin" else "Assistente" }}</div>
    </div>
  </div>
  <a href="/logout" class="icon-btn" aria-label="Sair" title="Sair">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
  </a>
</div>
```

- [ ] **Step 2: CSS for the sidebar footer layout and logout icon contrast**

In `app/static/css/estilos.css`, replace the existing `.sidebar-rodape` rule:

```css
.sidebar-rodape{margin-top:auto;padding:.8rem .7rem 0;border-top:1px solid var(--sidebar-line);display:flex;align-items:center;justify-content:space-between;gap:.6rem;}
.sidebar-usuario{display:flex;align-items:center;gap:.6rem;min-width:0;}
.sidebar-rodape .icon-btn{color:var(--sidebar-muted);}
.sidebar-rodape .icon-btn:hover{background:var(--sidebar-line);color:var(--sidebar-ink);}
```

(`.icon-btn`'s default colors are tuned for light backgrounds — the sidebar is dark, so this override keeps the logout icon visible and gives it a hover state that matches the sidebar, not the light theme.)

Also append a small polish for the disabled status select (Step 4 below relies on it):

```css
.status-select:disabled{opacity:.75;cursor:not-allowed;}
```

- [ ] **Step 3: `produtos.html` / `pedidos.html` — wrap the create button**

In `app/templates/produtos.html`:

```html
{% if usuario.papel == 'admin' %}
<button type="button" id="botao-novo-produto" class="btn">+ Novo Produto</button>
{% endif %}
```

In `app/templates/pedidos.html`:

```html
{% if usuario.papel == 'admin' %}
<button type="button" id="botao-novo-pedido" class="btn">+ Novo Pedido</button>
{% endif %}
```

- [ ] **Step 4: `produtos.js` — guard the button, hide card actions for non-admin**

Change:

```js
document.getElementById("botao-novo-produto").addEventListener("click", abrirModalNovo);
```

to:

```js
document.getElementById("botao-novo-produto")?.addEventListener("click", abrirModalNovo);
```

In `renderizarGrade`, compute `podeEditar` once and only emit the actions block when true:

```js
function renderizarGrade(lista) {
  const grade = document.getElementById("grade-produtos");
  if (!lista.length) {
    grade.innerHTML = "<p>Nenhum produto encontrado.</p>";
    return;
  }
  const podeEditar = window.PAPEL_USUARIO === "admin";
  grade.innerHTML = lista
    .map((produto) => `
      <div class="produto-card">
        <div class="produto-card-cabecalho">
          <div>
            <div class="produto-card-nome">${escaparHtml(produto.nome)}</div>
            <div class="produto-card-sku">${escaparHtml(produto.sku)}</div>
          </div>
        </div>
        <div class="produto-card-linhas">
          <div class="produto-card-linha"><span>Categoria</span><span>${escaparHtml(produto.categoria)}</span></div>
          <div class="produto-card-linha"><span>Estoque atual</span><span>${produto.quantidade_estoque}</span></div>
          <div class="produto-card-linha"><span>Preço</span><span>R$ ${produto.preco.toFixed(2)}</span></div>
        </div>
        ${podeEditar ? `
        <div class="produto-card-acoes">
          <button type="button" class="produto-acao-btn editar" data-id="${produto.id}" aria-label="Editar produto">${iconeEditar()}</button>
          <button type="button" class="produto-acao-btn excluir" data-id="${produto.id}" aria-label="Excluir produto">${iconeExcluir()}</button>
        </div>` : ""}
      </div>
    `)
    .join("");
}
```

- [ ] **Step 5: `pedidos.js` — same treatment, plus disable the status select**

Change:

```js
document.getElementById("botao-novo-pedido").addEventListener("click", abrirModalNovoPedido);
```

to:

```js
document.getElementById("botao-novo-pedido")?.addEventListener("click", abrirModalNovoPedido);
```

In `renderizarGrade`:

```js
function renderizarGrade(lista) {
  const grade = document.getElementById("grade-pedidos");
  if (!lista.length) {
    grade.innerHTML = "<p>Nenhum pedido encontrado.</p>";
    return;
  }
  const podeEditar = window.PAPEL_USUARIO === "admin";
  grade.innerHTML = lista
    .map((pedido) => `
      <div class="pedido-card">
        <div class="pedido-card-cabecalho">
          <div>
            <div class="pedido-card-cliente">${escaparHtml(pedido.cliente_nome)}</div>
            <div class="pedido-card-meta"><span class="canal-pill">${escaparHtml(CANAL_ROTULOS[pedido.canal] || pedido.canal)}</span> · ${new Date(pedido.data_pedido).toLocaleDateString("pt-BR")}</div>
          </div>
          ${podeEditar ? `<button type="button" class="icon-btn editar" data-id="${pedido.id}" aria-label="Editar pedido">${iconeEditar()}</button>` : ""}
        </div>
        <div class="pedido-card-valor">R$ ${pedido.valor_total.toFixed(2)}</div>
        <div class="pedido-card-rodape">
          <select class="status-select mudar-status ${pedido.status}" data-id="${pedido.id}" ${podeEditar ? "" : "disabled"}>${opcoesStatusPara(pedido.canal, pedido.status)}</select>
          ${podeEditar ? `<button type="button" class="icon-btn excluir" data-id="${pedido.id}" aria-label="Excluir pedido">${iconeExcluir()}</button>` : ""}
        </div>
      </div>
    `)
    .join("");
}
```

- [ ] **Step 6: `common.js` — redirect to `/login` on 401**

Add right after the `fetch` call in `chamarApi`, before the existing `204` check:

```js
async function chamarApi(url, opcoes = {}) {
  const resposta = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opcoes,
  });
  if (resposta.status === 401) {
    window.location.href = "/login";
    return new Promise(() => {});
  }
  if (resposta.status === 204) {
    return null;
  }
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    let mensagem = "Erro ao comunicar com o servidor";
    if (dados && dados.detail) {
      mensagem = Array.isArray(dados.detail)
        ? dados.detail.map((erro) => erro.msg).join("; ")
        : dados.detail;
    }
    throw new Error(mensagem);
  }
  return dados;
}
```

- [ ] **Step 7: Run the full suite**

Run: `pytest -q`
Expected: PASS — this task only touches templates/JS/CSS, no Python test should be affected, but a full run confirms nothing broke.

- [ ] **Step 8: Manual check**

Run: `uvicorn app.main:app --reload`. Log in as `admin`/`admin123` (or whatever `SEED_SENHA_ADMIN` resolves to once Task 9 seeds it — until then, use a user created by hand via a Python shell: `python -c "from app.database import SessionLocal; from app import models, auth; db = SessionLocal(); db.add(models.Usuario(login='admin', senha_hash=auth.gerar_hash_senha('admin123'), papel='admin')); db.add(models.Usuario(login='assistente', senha_hash=auth.gerar_hash_senha('assistente123'), papel='assistente')); db.commit()"`). Confirm: admin sees "+ Novo Produto"/"+ Novo Pedido" and all editar/excluir icons; log out, log in as `assistente`, confirm those are gone and the status dropdown on Pedidos is disabled, but every page still loads with real data.

- [ ] **Step 9: Commit**

```bash
git add app/templates/base.html app/templates/produtos.html app/templates/pedidos.html app/static/js/produtos.js app/static/js/pedidos.js app/static/js/common.js app/static/css/estilos.css
git commit -m "feat: hide admin-only controls in the UI for the assistant role"
```

---

### Task 9: Seed the two default users

**Files:**
- Modify: `seed.py`
- Modify: `tests/test_seed.py`
- Modify: `README.md`

**Interfaces:**
- Consumes: `auth.gerar_hash_senha`, `auth.PAPEL_ADMIN`, `auth.PAPEL_ASSISTENTE` (Task 2).
- Produces: `popular_usuarios(db) -> None`, called unconditionally from `seed.py`'s `main()`, before the existing product-check early return.

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_seed.py`:

```python
import os

from app import auth
from seed import popular_usuarios


def test_popular_usuarios_cria_admin_e_assistente(db_session, monkeypatch):
    monkeypatch.setenv("SEED_SENHA_ADMIN", "senhaAdminTeste")
    monkeypatch.setenv("SEED_SENHA_ASSISTENTE", "senhaAssistenteTeste")

    popular_usuarios(db_session)

    admin = db_session.query(models.Usuario).filter_by(login="admin").first()
    assistente = db_session.query(models.Usuario).filter_by(login="assistente").first()
    assert admin.papel == auth.PAPEL_ADMIN
    assert assistente.papel == auth.PAPEL_ASSISTENTE
    assert auth.verificar_senha("senhaAdminTeste", admin.senha_hash)


def test_popular_usuarios_nao_duplica_se_ja_existir(db_session):
    popular_usuarios(db_session)
    popular_usuarios(db_session)

    assert db_session.query(models.Usuario).count() == 2
```

Add `from app import models` to the top of `tests/test_seed.py` if it isn't already imported under that exact name (it is — see the existing `from app import models` line).

- [ ] **Step 2: Run to confirm it fails**

Run: `pytest tests/test_seed.py -v`
Expected: FAIL — `popular_usuarios` doesn't exist in `seed.py` yet (`ImportError`).

- [ ] **Step 3: Add `popular_usuarios` to `seed.py`**

Add the import at the top:

```python
from app import auth
```

Add the function (near `popular_produtos`):

```python
def popular_usuarios(db: Session) -> None:
    if db.query(models.Usuario).first():
        return
    senha_admin = os.environ.get("SEED_SENHA_ADMIN", "admin123")
    senha_assistente = os.environ.get("SEED_SENHA_ASSISTENTE", "assistente123")
    db.add(models.Usuario(login="admin", senha_hash=auth.gerar_hash_senha(senha_admin), papel=auth.PAPEL_ADMIN))
    db.add(models.Usuario(login="assistente", senha_hash=auth.gerar_hash_senha(senha_assistente), papel=auth.PAPEL_ASSISTENTE))
    db.commit()
    print("Usuários padrão criados: admin/assistente (troque as senhas em produção).")
```

This needs `import os` at the top of `seed.py` (not currently imported there — `seed.py` today imports `random` and `datetime`, not `os`).

- [ ] **Step 4: Call it unconditionally from `main()`**

Update `seed.py`'s `main()`:

```python
def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        popular_usuarios(db)
        if db.query(models.Produto).first():
            print("Banco já contém dados de produtos. Nenhuma alteração feita.")
            return
        produtos = popular_produtos(db)
        popular_pedidos(db, produtos)
        print(f"Seed concluído: {len(produtos)} produtos e {db.query(models.Pedido).count()} pedidos criados.")
    finally:
        db.close()
```

- [ ] **Step 5: Run to confirm it passes**

Run: `pytest tests/test_seed.py -v`
Expected: PASS (all tests in the file, including the two new ones).

- [ ] **Step 6: Run `seed.py` against the real dev database**

Run: `python seed.py`
Expected: prints `Usuários padrão criados: admin/assistente (troque as senhas em produção).` followed by `Banco já contém dados de produtos. Nenhuma alteração feita.` (since the dev DB already has products from earlier in this project). Confirm the users actually landed: `python -c "from app.database import SessionLocal; from app import models; db = SessionLocal(); print([u.login for u in db.query(models.Usuario).all()])"` should print `['admin', 'assistente']`.

- [ ] **Step 7: Update `README.md`**

Add a section (after "Popular o banco com dados de exemplo"):

```markdown
## Login

O `seed.py` cria dois usuários na primeira vez que roda:

- `admin` / `admin123` — acesso completo.
- `assistente` / `assistente123` — acesso de leitura a tudo, sem
  permissão para criar/editar/excluir produtos ou pedidos.

Troque essas senhas definindo `SEED_SENHA_ADMIN` e
`SEED_SENHA_ASSISTENTE` no `.env` **antes** de rodar `seed.py` pela
primeira vez. `SESSION_SECRET_KEY` (também no `.env`) assina o cookie de
sessão — troque-a antes de qualquer uso fora da sua máquina.
```

- [ ] **Step 8: Commit**

```bash
git add seed.py tests/test_seed.py README.md
git commit -m "feat: seed default admin/assistente users"
```

---

### Task 10: Full regression pass

**Files:** none (verification only)

- [ ] **Step 1: Run the entire suite**

Run: `pytest -v`
Expected: All tests PASS — every file touched across Tasks 1–9, plus the untouched ones (`test_models.py`, `test_servicos_estoque.py`, `test_agente_*.py`, `test_orquestrador.py`, `test_resumo.py`, `test_frontend_base.py`, `test_main.py`) which never depended on auth.

- [ ] **Step 2: Manual walkthrough**

Run: `uvicorn app.main:app --reload`. With a fresh browser session (or after clearing the site's cookies): visit `/` — confirm redirect to `/login`. Log in as `assistente`/`assistente123` — confirm every page loads with real data, no "+ Novo X" buttons, no editar/excluir icons, Pedidos status dropdown greyed out and disabled, "Analisar com IA" still clickable and working. Log out, log in as `admin`/`admin123` — confirm full CRUD still works exactly as before this feature (create/edit/delete a product and a pedido).

---

## Self-Review Notes

- **Spec coverage:** data model (Task 1), hashing without a new dependency (Task 2), session middleware (Task 3), login/logout + page (Task 5), authorization matrix — every router and every page (Tasks 6–7), frontend hiding (Task 8), seed defaults (Task 9). Every section of the spec maps to a task.
- **Type/id consistency checked:** `auth.SESSAO_CHAVE_USUARIO` is the same string used to write the session in Task 5's `/login` POST and to read it in `auth.obter_usuario_sessao` (Task 2) — one definition, two call sites. `window.PAPEL_USUARIO` is set once in `base.html` (Task 8) and read identically in both `produtos.js` and `pedidos.js`.
- **Sequencing risk called out explicitly:** Task 6 enforces auth on the API before Task 7 does it on pages — `test_logout_limpa_sessao` (written in Task 5) is expected to fail until Task 7 lands, which is flagged inline rather than left as a silent surprise.
- **Existing-test migration is exhaustive:** grepping the test suite for the `client` fixture during planning turned up exactly 12 files; all 12 are accounted for across Tasks 6–7 (either migrated to `client_admin` or, for `test_frontend_base.py`/`test_main.py`, explicitly left alone because they hit routes that stay public).
