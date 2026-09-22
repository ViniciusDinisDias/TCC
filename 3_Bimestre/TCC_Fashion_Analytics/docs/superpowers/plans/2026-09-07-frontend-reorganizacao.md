# Reorganização do Frontend (Fama Fashion) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved sidebar/cards visual (from the mockup) to the real app, reorganize each page's content per the design spec, and add a new Dashboard/Resumo home page — without touching backend structure beyond two small additive changes.

**Architecture:** Server-rendered Jinja2 pages sharing one `base.html` shell (sidebar + main content area) and one `estilos.css` design system. Each page keeps its existing vanilla-JS fetch pattern (`chamarApi` from `common.js`). One new FastAPI router (`dashboard.py`) aggregates data for the new page; `estoque.py`'s existing `/resumo` endpoint gets two new response fields.

**Tech Stack:** FastAPI, Jinja2, SQLAlchemy, vanilla JS, Chart.js (already loaded via CDN in `base.html`), pytest + FastAPI TestClient.

**Spec:** `docs/superpowers/specs/2026-09-07-frontend-reorganizacao-design.md`

## Global Constraints

- Preserve the sidebar/cards visual identity from the approved mockup exactly — this plan only changes content organization and the background token, never layout structure or component styling philosophy.
- Main content background becomes a neutral off-white (`--surface: #F7F8F7`), replacing the previous warm/pink-tinted tone.
- No new AI categories beyond the 3 the backend already produces (KPIs/Anomalias/Recomendações).
- `Pedidos` table columns, in order: Cliente, Canal, Data, Status, Valor, Ações.
- `Estoque` page: one destaque card ("Valor total do estoque") + table with Produto, Quantidade, Valor unitário, Valor em estoque. No low-stock/parado cards on this page — that alert data lives only in the Dashboard.
- Painel de IA shows nothing (no KPIs/charts/anomalies) until the user clicks "Analisar com IA".
- All new/changed Portuguese copy matches the wording already established in the spec (e.g., exact button label "Analisar com IA").

---

## File Structure

| File | Change |
|---|---|
| `app/static/css/estilos.css` | Rewrite: full design-system tokens + all component classes used across pages |
| `app/templates/base.html` | Rewrite: sidebar shell replaces old top header/nav |
| `app/templates/resumo.html` | New: Dashboard page markup |
| `app/static/js/resumo.js` | New: fetches `/dashboard/resumo`, renders KPIs/chart/alerts/latest orders |
| `app/routers/dashboard.py` | New: `GET /dashboard/resumo` |
| `app/main.py` | `/` now serves Resumo; Produtos moves to `/produtos-page`; all routes pass `pagina_ativa`; register `dashboard` router |
| `app/routers/estoque.py` | `/estoque/resumo` gains `preco` + `valor_estoque` per product |
| `app/templates/estoque.html` + `app/static/js/estoque.js` | New table shape (Produto/Quantidade/Valor unitário/Valor em estoque), single destaque card |
| `app/templates/pedidos.html` + `app/static/js/pedidos.js` | Reordered columns, drop `#` column |
| `app/templates/produtos.html` | Reskin only (wrap in new layout classes), no field/behavior change |
| `app/templates/painel_ia.html` + `app/static/js/painel_ia.js` | Empty-state-until-click UI |
| `tests/test_pagina_produtos.py` | Points at `/produtos-page` instead of `/` |
| `tests/test_pagina_estoque.py` | Asserts new `resumo-estoque` marker instead of `cards-resumo` |
| `tests/test_pagina_resumo.py` | New: dashboard page smoke test |
| `tests/test_rotas_dashboard.py` | New: `/dashboard/resumo` contract test |
| `tests/test_rotas_estoque.py` | Extend existing test to assert new fields |

---

### Task 1: Design system CSS

**Files:**
- Modify: `app/static/css/estilos.css` (full rewrite)

**Interfaces:**
- Produces: every CSS class referenced by later tasks — `.app`, `.sidebar`, `.marca*`, `.nav-item`(`.ativo`), `.sidebar-rodape`, `.avatar`, `.main`, `.topo`, `.subtitulo`, `.periodo`, `.kpis`, `.kpi`(`.kpi-texto`), `.kpi-label`, `.kpi-valor`, `.delta`(`.up`/`.down`), `.grid-principal`, `.painel`, `.painel-titulo`, `.alerta`, `.selo`(`.critical`/`.warning`), `.alerta-corpo`, `.alerta-titulo`, `.alerta-detalhe`, `.tag-severidade`(`.critical`/`.warning`), `.destaque-financeiro`, `.card-tabela`, table/`th`/`td`, `.canal-pill`, `.status-pill`(`.entregue`/`.pendente`/`.enviado`/`.confirmado`/`.cancelado`), `.formulario`, `.btn`(`.btn-grande`), `.excluir`, `.ia-estado-vazio`, `.ia-icone`, `.alerta-ia`(`.alerta-ia-alta`/`.alerta-ia-media`/`.alerta-ia-baixa`).

- [ ] **Step 1: Write the new stylesheet**

```css
:root{
  --ink:#241016; --ink-soft:#7a6470; --ink-faint:#a6919b;
  --surface:#F7F8F7; --surface-card:#FFFFFF;
  --line:#E7E5E4;
  --accent:#9C2B4E; --accent-soft:#F4D8DF; --accent-strong:#7A1F3D;
  --good:#2F7D5E; --good-soft:#DCEEE5;
  --warning:#B9852E; --warning-soft:#F6E8D2;
  --critical:#B23A3A; --critical-soft:#F7DEDD;
  --sidebar-bg:#2B1420; --sidebar-ink:#F3E6EA; --sidebar-muted:#C9A8B6; --sidebar-line:#3E2230;
  --shadow: 0 1px 2px rgba(36,16,22,.04), 0 8px 24px -12px rgba(36,16,22,.12);
  --radius: 12px;
}

*{box-sizing:border-box;}
html,body{height:100%;}
body{margin:0;background:var(--surface);color:var(--ink);font-family:'IBM Plex Sans',Arial,sans-serif;}
h1,h2,h3{font-family:'Fraunces',Georgia,serif;margin:0;}
a{color:inherit;}

/* ---------- App shell ---------- */
.app{display:flex;min-height:100vh;align-items:stretch;}

.sidebar{width:236px;flex:0 0 236px;background:var(--sidebar-bg);color:var(--sidebar-ink);padding:1.3rem 1rem;display:flex;flex-direction:column;gap:1.6rem;}
.marca{display:flex;align-items:center;gap:.6rem;padding:0 .4rem;}
.marca-mono{width:34px;height:34px;border-radius:9px;background:linear-gradient(155deg,var(--accent),#5C1631);display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-weight:600;font-size:1.05rem;color:#fff;flex:none;}
.marca-nome{font-family:'Fraunces',serif;font-weight:600;font-size:1.05rem;line-height:1.1;}
.marca-sub{font-size:.68rem;color:var(--sidebar-muted);letter-spacing:.04em;text-transform:uppercase;}

.nav-grupo{display:flex;flex-direction:column;gap:.15rem;}
.nav-titulo{font-size:.68rem;text-transform:uppercase;letter-spacing:.08em;color:var(--sidebar-muted);padding:0 .7rem;margin-bottom:.35rem;}
.nav-item{display:flex;align-items:center;gap:.65rem;padding:.55rem .7rem;border-radius:8px;color:var(--sidebar-muted);text-decoration:none;font-size:.88rem;font-weight:500;}
.nav-item svg{flex:none;opacity:.85;}
.nav-item:hover{background:var(--sidebar-line);color:var(--sidebar-ink);}
.nav-item.ativo{background:var(--accent);color:#fff;}
.nav-item.ativo svg{opacity:1;}

.sidebar-rodape{margin-top:auto;padding:.8rem .7rem 0;border-top:1px solid var(--sidebar-line);display:flex;align-items:center;gap:.6rem;}
.avatar{width:30px;height:30px;border-radius:50%;background:var(--accent-soft);color:var(--accent-strong);display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;flex:none;}
.sidebar-rodape .nome{font-size:.82rem;font-weight:600;color:var(--sidebar-ink);}
.sidebar-rodape .papel{font-size:.72rem;color:var(--sidebar-muted);}

.main{flex:1;min-width:0;padding:1.6rem 2rem 2.4rem;}

/* ---------- Topo de página ---------- */
.topo{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap;margin-bottom:1.4rem;}
.topo h1{font-size:1.5rem;}
.topo .subtitulo{color:var(--ink-soft);font-size:.88rem;margin-top:.2rem;}
.periodo{display:flex;align-items:center;gap:.5rem;background:var(--surface-card);border:1px solid var(--line);border-radius:9px;padding:.5rem .8rem;font-size:.82rem;font-weight:500;box-shadow:var(--shadow);white-space:nowrap;}
.periodo .ponto{width:7px;height:7px;border-radius:50%;background:var(--accent);}

/* ---------- KPIs ---------- */
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:1.4rem;}
.kpi{background:var(--surface-card);border:1px solid var(--line);border-radius:var(--radius);padding:1rem 1.1rem;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:.5rem;}
.kpi-texto p{font-size:.84rem;color:var(--ink-soft);margin:0;}
.kpi-label{font-size:.78rem;color:var(--ink-soft);font-weight:500;}
.kpi-valor{font-family:'Fraunces',serif;font-size:1.5rem;font-weight:600;font-variant-numeric:tabular-nums;}
.delta{display:inline-flex;align-items:center;gap:.3rem;font-size:.76rem;font-weight:600;padding:.15rem .5rem;border-radius:999px;width:fit-content;}
.delta.up{color:var(--good);background:var(--good-soft);}
.delta.down{color:var(--critical);background:var(--critical-soft);}

/* ---------- Card financeiro em destaque (Estoque) ---------- */
.destaque-financeiro{background:var(--surface-card);border:1px solid var(--line);border-radius:var(--radius);padding:1.3rem 1.6rem;box-shadow:var(--shadow);margin-bottom:1.4rem;max-width:360px;display:flex;flex-direction:column;gap:.5rem;}

/* ---------- Grid principal / painéis ---------- */
.grid-principal{display:grid;grid-template-columns:1.5fr 1fr;gap:1rem;margin-bottom:1rem;}
.painel{background:var(--surface-card);border:1px solid var(--line);border-radius:var(--radius);padding:1.1rem 1.2rem;box-shadow:var(--shadow);margin-bottom:1rem;}
.painel-titulo{display:flex;justify-content:space-between;align-items:center;margin-bottom:.9rem;}
.painel-titulo h2{font-size:1rem;font-weight:600;font-family:'IBM Plex Sans',sans-serif;}

/* ---------- Alertas (Dashboard) ---------- */
.alerta{display:flex;gap:.7rem;align-items:flex-start;padding:.65rem 0;border-bottom:1px solid var(--line);}
.alerta:last-child{border-bottom:none;}
.selo{flex:none;width:26px;height:26px;border-radius:7px;margin-top:.05rem;}
.selo.critical{background:var(--critical-soft);}
.selo.warning{background:var(--warning-soft);}
.alerta-corpo{flex:1;min-width:0;}
.alerta-titulo{font-size:.86rem;font-weight:600;}
.alerta-detalhe{font-size:.78rem;color:var(--ink-soft);margin-top:.1rem;}
.tag-severidade{font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.03em;padding:.1rem .45rem;border-radius:5px;flex:none;}
.tag-severidade.critical{background:var(--critical-soft);color:var(--critical);}
.tag-severidade.warning{background:var(--warning-soft);color:var(--warning);}

/* ---------- Alertas (Painel de IA — anomalias/recomendações) ---------- */
.alerta-ia{padding:.8rem 1rem;border-radius:8px;margin-bottom:.6rem;}
.alerta-ia-alta{background:var(--critical-soft);border-left:4px solid var(--critical);}
.alerta-ia-media{background:var(--warning-soft);border-left:4px solid var(--warning);}
.alerta-ia-baixa{background:var(--accent-soft);border-left:4px solid var(--accent);}
.alerta-ia p{margin:.2rem 0 0;font-size:.86rem;}

/* ---------- Tabelas ---------- */
.card-tabela{background:var(--surface-card);border:1px solid var(--line);border-radius:var(--radius);padding:.4rem;box-shadow:var(--shadow);overflow-x:auto;}
table{width:100%;border-collapse:collapse;}
th{font-size:.7rem;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-soft);text-align:left;padding:.55rem .6rem;border-bottom:1px solid var(--line);font-weight:600;}
td{padding:.6rem .6rem;font-size:.84rem;border-bottom:1px solid var(--line);}
tr:last-child td{border-bottom:none;}
.canal-pill{font-size:.72rem;font-weight:600;padding:.15rem .5rem;border-radius:999px;background:var(--accent-soft);color:var(--accent-strong);white-space:nowrap;}
.status-pill{font-size:.72rem;font-weight:600;padding:.15rem .55rem;border-radius:999px;white-space:nowrap;}
.status-pill.entregue{background:var(--good-soft);color:var(--good);}
.status-pill.pendente{background:var(--warning-soft);color:var(--warning);}
.status-pill.enviado, .status-pill.confirmado{background:var(--accent-soft);color:var(--accent-strong);}
.status-pill.cancelado{background:var(--critical-soft);color:var(--critical);}

/* ---------- Formulários / botões ---------- */
.formulario{background:var(--surface-card);border:1px solid var(--line);padding:1rem 1.5rem;border-radius:var(--radius);margin-bottom:1.4rem;display:grid;gap:.6rem;max-width:500px;box-shadow:var(--shadow);}
.formulario label{font-size:.82rem;font-weight:600;color:var(--ink-soft);}
.formulario input, .formulario select{padding:.5rem .6rem;border:1px solid var(--line);border-radius:7px;font-family:inherit;font-size:.88rem;color:var(--ink);}
.btn{display:inline-flex;align-items:center;gap:.4rem;padding:.55rem .95rem;border-radius:9px;border:none;background:var(--accent);color:#fff;font-weight:600;font-size:.84rem;cursor:pointer;font-family:inherit;width:fit-content;}
.btn:hover{background:var(--accent-strong);}
button.excluir{padding:.35rem .7rem;border:none;border-radius:7px;background:var(--critical);color:#fff;font-size:.78rem;cursor:pointer;}

/* ---------- Painel de IA: estado vazio ---------- */
.ia-estado-vazio{background:var(--surface-card);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);padding:3rem 2rem;text-align:center;max-width:480px;margin:2rem auto;}
.ia-icone{font-size:2.4rem;margin-bottom:.6rem;}
.ia-estado-vazio h2{font-size:1.2rem;margin-bottom:.5rem;}
.ia-estado-vazio p{color:var(--ink-soft);font-size:.9rem;margin:0 0 1.2rem;}
.ia-estado-vazio .btn{margin:0 auto;}

@media (max-width:880px){
  .kpis{grid-template-columns:repeat(2,1fr);}
  .grid-principal{grid-template-columns:1fr;}
  .sidebar{width:76px;flex-basis:76px;padding:1.3rem .5rem;}
  .marca-nome,.marca-sub,.nav-titulo,.nav-item .rotulo,.sidebar-rodape .nome,.sidebar-rodape .papel{display:none;}
  .nav-item{justify-content:center;}
}
```

- [ ] **Step 2: Manually verify**

Run: `uvicorn app.main:app --reload`, open `http://127.0.0.1:8000/estoque-page` (any page still using the old markup at this point) and confirm the page still loads with no console 404 for `estilos.css` and no CSS parse errors in devtools. Full visual confirmation happens after Task 3 (base.html) is done — this step just confirms the file is syntactically valid and served.

Run: `pytest tests/test_frontend_base.py -v`
Expected: PASS (these tests only check the file is served, not its content).

- [ ] **Step 3: Commit**

```bash
git add app/static/css/estilos.css
git commit -m "feat: rewrite design system CSS for sidebar/cards layout"
```

---

### Task 2: `base.html` sidebar shell

**Files:**
- Modify: `app/templates/base.html` (full rewrite)

**Interfaces:**
- Consumes: CSS classes from Task 1; context variable `pagina_ativa` (string: `"resumo"`, `"produtos"`, `"pedidos"`, `"estoque"`, or `"painel_ia"`) passed by each route in `app/main.py` (Task 4).
- Produces: `{% block conteudo %}` and `{% block scripts %}` blocks that every page template fills, exactly as before (no change to the block contract other than the surrounding shell).

- [ ] **Step 1: Write the new base template**

```html
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <title>Fama Fashion</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500..700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">
  <link rel="stylesheet" href="/static/css/estilos.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
  <script src="/static/js/common.js" defer></script>
  {% block scripts %}{% endblock %}
</head>
<body>
  <div class="app">
    <aside class="sidebar">
      <div class="marca">
        <div class="marca-mono">F</div>
        <div>
          <div class="marca-nome">Fama Fashion</div>
          <div class="marca-sub">Gestão</div>
        </div>
      </div>

      <nav class="nav-grupo">
        <div class="nav-titulo">Visão geral</div>
        <a class="nav-item {% if pagina_ativa == 'resumo' %}ativo{% endif %}" href="/">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/></svg>
          <span class="rotulo">Resumo</span>
        </a>
      </nav>

      <nav class="nav-grupo">
        <div class="nav-titulo">Operação</div>
        <a class="nav-item {% if pagina_ativa == 'produtos' %}ativo{% endif %}" href="/produtos-page">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.5 7.5 12 3 3.5 7.5 12 12l8.5-4.5Z"/><path d="M3.5 7.5v9L12 21l8.5-4.5v-9"/><path d="M12 12v9"/></svg>
          <span class="rotulo">Produtos</span>
        </a>
        <a class="nav-item {% if pagina_ativa == 'pedidos' %}ativo{% endif %}" href="/pedidos-page">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          <span class="rotulo">Pedidos</span>
        </a>
        <a class="nav-item {% if pagina_ativa == 'estoque' %}ativo{% endif %}" href="/estoque-page">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9.5 12 3l9 6.5"/><path d="M5 8.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V8.5"/></svg>
          <span class="rotulo">Estoque</span>
        </a>
      </nav>

      <nav class="nav-grupo">
        <div class="nav-titulo">Inteligência</div>
        <a class="nav-item {% if pagina_ativa == 'painel_ia' %}ativo{% endif %}" href="/painel-ia">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a5 5 0 0 0-5 5c0 2 1 3 1 5v1h8v-1c0-2 1-3 1-5a5 5 0 0 0-5-5Z"/><path d="M9 18h6M10 21h4"/></svg>
          <span class="rotulo">Painel de IA</span>
        </a>
      </nav>

      <div class="sidebar-rodape">
        <div class="avatar">FF</div>
        <div>
          <div class="nome">Fama Fashion</div>
          <div class="papel">Loja física + Shopee</div>
        </div>
      </div>
    </aside>

    <main class="main">
      {% block conteudo %}{% endblock %}
    </main>
  </div>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add app/templates/base.html
git commit -m "feat: replace top-header layout with sidebar shell"
```

---

### Task 3: `app/main.py` routes + `pagina_ativa`

**Files:**
- Modify: `app/main.py`
- Modify: `tests/test_pagina_produtos.py`

**Interfaces:**
- Consumes: `pagina_ativa` values matching Task 2's `base.html` conditionals exactly (`resumo`, `produtos`, `pedidos`, `estoque`, `painel_ia`).
- Produces: `GET /` now renders `resumo.html` (Task 5); `GET /produtos-page` renders `produtos.html`.

- [ ] **Step 1: Update the failing test first**

`GET /` used to serve the products page; it now serves the dashboard, so the old assertion is wrong on purpose — update it to describe the new contract before touching `main.py`:

```python
def test_pagina_produtos_carrega(client):
    resposta = client.get("/produtos-page")
    assert resposta.status_code == 200
    assert "form-produto" in resposta.text
    assert "Fama Fashion" in resposta.text


def test_produtos_js_disponivel(client):
    resposta = client.get("/static/js/produtos.js")
    assert resposta.status_code == 200
    assert "carregarProdutos" in resposta.text
```

(This replaces the full contents of `tests/test_pagina_produtos.py`.)

- [ ] **Step 2: Run it to confirm it fails**

Run: `pytest tests/test_pagina_produtos.py -v`
Expected: FAIL — `/produtos-page` doesn't exist yet (404), so `"form-produto" in resposta.text` fails.

- [ ] **Step 3: Update `app/main.py`**

```python
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv

load_dotenv()

from app.database import Base, engine
from app import models  # noqa: F401
from app.routers import produtos, pedidos, estoque, ia, dashboard

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Fama Fashion")
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

app.include_router(produtos.router)
app.include_router(pedidos.router)
app.include_router(estoque.router)
app.include_router(ia.router)
app.include_router(dashboard.router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def pagina_resumo(request: Request):
    return templates.TemplateResponse(request, "resumo.html", {"pagina_ativa": "resumo"})


@app.get("/produtos-page")
def pagina_produtos(request: Request):
    return templates.TemplateResponse(request, "produtos.html", {"pagina_ativa": "produtos"})


@app.get("/pedidos-page")
def pagina_pedidos(request: Request):
    return templates.TemplateResponse(request, "pedidos.html", {"pagina_ativa": "pedidos"})


@app.get("/estoque-page")
def pagina_estoque(request: Request):
    return templates.TemplateResponse(request, "estoque.html", {"pagina_ativa": "estoque"})


@app.get("/painel-ia")
def pagina_painel_ia(request: Request):
    return templates.TemplateResponse(request, "painel_ia.html", {"pagina_ativa": "painel_ia"})
```

This references `app/routers/dashboard.py`, which Task 4 creates — the app won't import successfully until that task lands, so do Task 4 before running the app manually, but the test in Step 4 below only needs `/produtos-page` to work and will fail at import time until Task 4 exists too. Do Task 4 immediately after this step, then come back and run Step 4.

- [ ] **Step 4: Run tests to confirm they pass (after Task 4 is also done)**

Run: `pytest tests/test_pagina_produtos.py tests/test_main.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/main.py tests/test_pagina_produtos.py
git commit -m "feat: move products to /produtos-page, serve dashboard at /"
```

---

### Task 4: `GET /dashboard/resumo` endpoint

**Files:**
- Create: `app/routers/dashboard.py`
- Test: `tests/test_rotas_dashboard.py`

**Interfaces:**
- Consumes: `app.servicos_estoque.calcular_valor_total_em_estoque`, `.listar_produtos_estoque_baixo`, `.listar_produtos_parados` (all already exist, signatures unchanged, see `app/servicos_estoque.py`).
- Produces: `GET /dashboard/resumo` returning:
  ```json
  {
    "kpis": {
      "faturamento_mes_atual": float, "variacao_faturamento_pct": float|null,
      "pedidos_mes_atual": int, "variacao_pedidos_pct": float|null,
      "ticket_medio_mes_atual": float, "variacao_ticket_medio_pct": float|null,
      "valor_total_estoque": float
    },
    "vendas_por_mes": [{"mes": "Set/25", "valor": float}, ...] ,
    "alertas_estoque": [{"produto_id": int, "nome": str, "sku": str, "tipo": "baixo"|"parado", "quantidade_estoque": int, "estoque_minimo": int}],
    "ultimos_pedidos": [{"id": int, "cliente_nome": str, "canal": str, "data_pedido": "iso-string", "status": str, "valor_total": float}]
  }
  ```
  Router is registered in `app/main.py` (Task 3).

- [ ] **Step 1: Write the failing test**

```python
from datetime import datetime, timedelta

from app import models


def _criar_produto(client, sku, preco, quantidade, minimo=5):
    return client.post("/produtos", json={
        "sku": sku, "nome": f"Produto {sku}", "categoria": "Blusa",
        "tamanho": "M", "cor": "Azul", "preco": preco,
        "quantidade_estoque": quantidade, "estoque_minimo": minimo,
    }).json()


def test_dashboard_resumo_traz_kpis_alertas_e_ultimos_pedidos(client, db_session):
    produto_normal = _criar_produto(client, "DASH-001", 50.0, 20, minimo=5)
    produto_baixo = _criar_produto(client, "DASH-002", 30.0, 1, minimo=5)

    pedido = models.Pedido(
        canal="shopee", cliente_nome="Cliente Dashboard", status="entregue",
        data_pedido=datetime.utcnow(), valor_total=50.0,
    )
    db_session.add(pedido)
    db_session.flush()
    db_session.add(models.ItemPedido(
        pedido_id=pedido.id, produto_id=produto_normal["id"],
        quantidade=1, preco_unitario=50.0, subtotal=50.0,
    ))
    db_session.commit()

    resposta = client.get("/dashboard/resumo")
    assert resposta.status_code == 200
    corpo = resposta.json()

    assert corpo["kpis"]["pedidos_mes_atual"] >= 1
    assert corpo["kpis"]["faturamento_mes_atual"] >= 50.0
    assert corpo["kpis"]["valor_total_estoque"] == 20 * 50.0 + 1 * 30.0

    assert len(corpo["vendas_por_mes"]) == 6

    skus_alerta = {a["sku"] for a in corpo["alertas_estoque"]}
    assert "DASH-002" in skus_alerta

    clientes_recentes = {p["cliente_nome"] for p in corpo["ultimos_pedidos"]}
    assert "Cliente Dashboard" in clientes_recentes
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pytest tests/test_rotas_dashboard.py -v`
Expected: FAIL with a 404 (route doesn't exist) or connection/import error.

- [ ] **Step 3: Write `app/routers/dashboard.py`**

```python
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, servicos_estoque
from app.database import get_db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

NOMES_MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]


def _somar_meses(ano: int, mes: int, delta: int) -> tuple[int, int]:
    indice = ano * 12 + (mes - 1) + delta
    return indice // 12, indice % 12 + 1


def _variacao_pct(atual: float, anterior: float):
    if not anterior:
        return None
    return round((atual - anterior) / anterior * 100, 1)


@router.get("/resumo")
def resumo_dashboard(db: Session = Depends(get_db)):
    agora = datetime.utcnow()
    ano_atual, mes_atual = agora.year, agora.month
    ano_anterior, mes_anterior = _somar_meses(ano_atual, mes_atual, -1)

    pedidos_validos = (
        db.query(models.Pedido)
        .filter(models.Pedido.status != "cancelado")
        .all()
    )

    def _pedidos_do_mes(ano: int, mes: int) -> list:
        ano_fim, mes_fim = _somar_meses(ano, mes, 1)
        inicio = datetime(ano, mes, 1)
        fim = datetime(ano_fim, mes_fim, 1)
        return [p for p in pedidos_validos if inicio <= p.data_pedido < fim]

    pedidos_mes_atual = _pedidos_do_mes(ano_atual, mes_atual)
    pedidos_mes_anterior = _pedidos_do_mes(ano_anterior, mes_anterior)

    faturamento_atual = round(sum(p.valor_total for p in pedidos_mes_atual), 2)
    faturamento_anterior = round(sum(p.valor_total for p in pedidos_mes_anterior), 2)
    ticket_medio_atual = round(faturamento_atual / len(pedidos_mes_atual), 2) if pedidos_mes_atual else 0.0
    ticket_medio_anterior = round(faturamento_anterior / len(pedidos_mes_anterior), 2) if pedidos_mes_anterior else 0.0

    vendas_por_mes = []
    for i in range(5, -1, -1):
        ano_ref, mes_ref = _somar_meses(ano_atual, mes_atual, -i)
        total = round(sum(p.valor_total for p in _pedidos_do_mes(ano_ref, mes_ref)), 2)
        vendas_por_mes.append({"mes": f"{NOMES_MESES[mes_ref - 1]}/{ano_ref % 100:02d}", "valor": total})

    produtos = db.query(models.Produto).all()
    produtos_baixo = servicos_estoque.listar_produtos_estoque_baixo(produtos)
    produtos_parados = servicos_estoque.listar_produtos_parados(db, produtos)
    ids_baixo = {p.id for p in produtos_baixo}

    alertas = [
        {
            "produto_id": p.id, "nome": p.nome, "sku": p.sku, "tipo": "baixo",
            "quantidade_estoque": p.quantidade_estoque, "estoque_minimo": p.estoque_minimo,
        }
        for p in produtos_baixo
    ]
    for p in produtos_parados:
        if p.id in ids_baixo:
            continue
        alertas.append({
            "produto_id": p.id, "nome": p.nome, "sku": p.sku, "tipo": "parado",
            "quantidade_estoque": p.quantidade_estoque, "estoque_minimo": p.estoque_minimo,
        })
    alertas = alertas[:5]

    ultimos_pedidos = (
        db.query(models.Pedido)
        .order_by(models.Pedido.data_pedido.desc())
        .limit(5)
        .all()
    )

    return {
        "kpis": {
            "faturamento_mes_atual": faturamento_atual,
            "variacao_faturamento_pct": _variacao_pct(faturamento_atual, faturamento_anterior),
            "pedidos_mes_atual": len(pedidos_mes_atual),
            "variacao_pedidos_pct": _variacao_pct(len(pedidos_mes_atual), len(pedidos_mes_anterior)),
            "ticket_medio_mes_atual": ticket_medio_atual,
            "variacao_ticket_medio_pct": _variacao_pct(ticket_medio_atual, ticket_medio_anterior),
            "valor_total_estoque": servicos_estoque.calcular_valor_total_em_estoque(produtos),
        },
        "vendas_por_mes": vendas_por_mes,
        "alertas_estoque": alertas,
        "ultimos_pedidos": [
            {
                "id": p.id, "cliente_nome": p.cliente_nome, "canal": p.canal,
                "data_pedido": p.data_pedido.isoformat(), "status": p.status,
                "valor_total": p.valor_total,
            }
            for p in ultimos_pedidos
        ],
    }
```

- [ ] **Step 4: Register the router and re-run** (this makes `app/main.py`'s Task 3 changes importable)

Run: `pytest tests/test_rotas_dashboard.py tests/test_pagina_produtos.py tests/test_main.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/routers/dashboard.py tests/test_rotas_dashboard.py
git commit -m "feat: add GET /dashboard/resumo aggregation endpoint"
```

---

### Task 5: Dashboard page (`resumo.html` + `resumo.js`)

**Files:**
- Create: `app/templates/resumo.html`
- Create: `app/static/js/resumo.js`
- Test: `tests/test_pagina_resumo.py`

**Interfaces:**
- Consumes: `GET /dashboard/resumo` (Task 4's exact response shape); `chamarApi`, `escaparHtml` from `common.js`; Chart.js global `Chart` (loaded in `base.html`).
- Produces: page reachable at `/` (Task 3), containing element ids `kpis-resumo`, `grafico-vendas-mensais`, `lista-alertas-estoque`, `tabela-ultimos-pedidos`.

- [ ] **Step 1: Write the failing test**

```python
def test_pagina_resumo_carrega(client):
    resposta = client.get("/")
    assert resposta.status_code == 200
    assert "kpis-resumo" in resposta.text
    assert "Resumo" in resposta.text


def test_resumo_js_disponivel(client):
    resposta = client.get("/static/js/resumo.js")
    assert resposta.status_code == 200
    assert "dashboard/resumo" in resposta.text
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pytest tests/test_pagina_resumo.py -v`
Expected: FAIL — `resumo.html` doesn't exist, so `/` currently 500s or 404s on `resumo.js`.

- [ ] **Step 3: Write `app/templates/resumo.html`**

```html
{% extends "base.html" %}
{% block scripts %}<script src="/static/js/resumo.js" defer></script>{% endblock %}
{% block conteudo %}
<div class="topo">
  <div>
    <h1>Resumo</h1>
    <p class="subtitulo">Visão geral da loja física e do canal Shopee</p>
  </div>
</div>

<div class="kpis" id="kpis-resumo"></div>

<div class="grid-principal">
  <div class="painel">
    <div class="painel-titulo"><h2>Vendas nos últimos 6 meses</h2></div>
    <canvas id="grafico-vendas-mensais"></canvas>
  </div>
  <div class="painel">
    <div class="painel-titulo"><h2>Alertas de estoque</h2></div>
    <div id="lista-alertas-estoque"></div>
  </div>
</div>

<div class="painel">
  <div class="painel-titulo"><h2>Últimos pedidos</h2></div>
  <table>
    <thead><tr><th>Cliente</th><th>Canal</th><th>Data</th><th>Status</th><th>Valor</th></tr></thead>
    <tbody id="tabela-ultimos-pedidos"></tbody>
  </table>
</div>
{% endblock %}
```

- [ ] **Step 4: Write `app/static/js/resumo.js`**

```js
const CANAL_ROTULOS = { loja_fisica: "Loja física", shopee: "Shopee" };
const STATUS_ROTULOS = {
  pendente: "Pendente", confirmado: "Confirmado", enviado: "Enviado",
  entregue: "Entregue", cancelado: "Cancelado",
};

function formatarMoeda(valor) {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function badgeDelta(variacaoPct) {
  if (variacaoPct === null || variacaoPct === undefined) return "";
  const sentido = variacaoPct >= 0 ? "up" : "down";
  const seta = variacaoPct >= 0 ? "▲" : "▼";
  return `<span class="delta ${sentido}">${seta} ${Math.abs(variacaoPct).toFixed(1)}% vs. mês anterior</span>`;
}

function renderizarKpis(kpis) {
  document.getElementById("kpis-resumo").innerHTML = `
    <div class="kpi">
      <div class="kpi-label">Faturamento do mês</div>
      <div class="kpi-valor">R$ ${formatarMoeda(kpis.faturamento_mes_atual)}</div>
      ${badgeDelta(kpis.variacao_faturamento_pct)}
    </div>
    <div class="kpi">
      <div class="kpi-label">Pedidos</div>
      <div class="kpi-valor">${kpis.pedidos_mes_atual}</div>
      ${badgeDelta(kpis.variacao_pedidos_pct)}
    </div>
    <div class="kpi">
      <div class="kpi-label">Ticket médio</div>
      <div class="kpi-valor">R$ ${formatarMoeda(kpis.ticket_medio_mes_atual)}</div>
      ${badgeDelta(kpis.variacao_ticket_medio_pct)}
    </div>
    <div class="kpi">
      <div class="kpi-label">Valor em estoque</div>
      <div class="kpi-valor">R$ ${formatarMoeda(kpis.valor_total_estoque)}</div>
    </div>
  `;
}

let graficoVendasMensais = null;

function renderizarGraficoVendas(vendasPorMes) {
  const contexto = document.getElementById("grafico-vendas-mensais").getContext("2d");
  if (graficoVendasMensais) graficoVendasMensais.destroy();
  graficoVendasMensais = new Chart(contexto, {
    type: "bar",
    data: {
      labels: vendasPorMes.map((item) => item.mes),
      datasets: [{ label: "Faturamento (R$)", data: vendasPorMes.map((item) => item.valor), backgroundColor: "#9C2B4E" }],
    },
    options: { plugins: { legend: { display: false } } },
  });
}

function renderizarAlertas(alertas) {
  const container = document.getElementById("lista-alertas-estoque");
  if (!alertas.length) {
    container.innerHTML = "<p>Nenhum alerta de estoque no momento.</p>";
    return;
  }
  container.innerHTML = alertas
    .map((alerta) => {
      const critico = alerta.tipo === "baixo";
      const selo = critico ? "critical" : "warning";
      const rotulo = critico ? "Crítico" : "Parado";
      const detalhe = critico
        ? `${alerta.quantidade_estoque} un. em estoque · mínimo de ${alerta.estoque_minimo}`
        : "Sem vendas recentes · produto parado";
      return `
        <div class="alerta">
          <div class="selo ${selo}"></div>
          <div class="alerta-corpo">
            <div class="alerta-titulo">${escaparHtml(alerta.nome)} (${escaparHtml(alerta.sku)})</div>
            <div class="alerta-detalhe">${detalhe}</div>
          </div>
          <span class="tag-severidade ${selo}">${rotulo}</span>
        </div>
      `;
    })
    .join("");
}

function renderizarUltimosPedidos(pedidos) {
  const corpo = document.getElementById("tabela-ultimos-pedidos");
  corpo.innerHTML = pedidos
    .map((pedido) => `
      <tr>
        <td>${escaparHtml(pedido.cliente_nome)}</td>
        <td><span class="canal-pill">${escaparHtml(CANAL_ROTULOS[pedido.canal] || pedido.canal)}</span></td>
        <td>${new Date(pedido.data_pedido).toLocaleDateString("pt-BR")}</td>
        <td><span class="status-pill ${pedido.status}">${escaparHtml(STATUS_ROTULOS[pedido.status] || pedido.status)}</span></td>
        <td>R$ ${formatarMoeda(pedido.valor_total)}</td>
      </tr>
    `)
    .join("");
}

(async function iniciar() {
  const resumo = await chamarApi("/dashboard/resumo");
  renderizarKpis(resumo.kpis);
  renderizarGraficoVendas(resumo.vendas_por_mes);
  renderizarAlertas(resumo.alertas_estoque);
  renderizarUltimosPedidos(resumo.ultimos_pedidos);
})();
```

- [ ] **Step 5: Run tests to confirm they pass**

Run: `pytest tests/test_pagina_resumo.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/templates/resumo.html app/static/js/resumo.js tests/test_pagina_resumo.py
git commit -m "feat: add Dashboard/Resumo page"
```

---

### Task 6: Estoque — financial table

**Files:**
- Modify: `app/routers/estoque.py`
- Modify: `app/templates/estoque.html`
- Modify: `app/static/js/estoque.js`
- Modify: `tests/test_pagina_estoque.py`
- Modify: `tests/test_rotas_estoque.py`

**Interfaces:**
- Produces: `/estoque/resumo` items gain `preco: float` and `valor_estoque: float` (existing `id`/`nome`/`sku`/`quantidade_estoque`/`estoque_minimo` fields unchanged — additive only).

- [ ] **Step 1: Extend the failing test**

Add to `tests/test_rotas_estoque.py` (append this test to the file):

```python
def test_resumo_estoque_traz_preco_e_valor_por_item(client):
    client.post("/produtos", json={
        "sku": "EST-005", "nome": "Produto E", "categoria": "Calça",
        "tamanho": "M", "cor": "Preto", "preco": 15.0,
        "quantidade_estoque": 4, "estoque_minimo": 2,
    })

    resposta = client.get("/estoque/resumo")
    produto = next(p for p in resposta.json()["produtos"] if p["sku"] == "EST-005")
    assert produto["preco"] == 15.0
    assert produto["valor_estoque"] == 60.0
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pytest tests/test_rotas_estoque.py::test_resumo_estoque_traz_preco_e_valor_por_item -v`
Expected: FAIL with `KeyError: 'preco'`.

- [ ] **Step 3: Update `app/routers/estoque.py`**

```python
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
                "preco": p.preco, "valor_estoque": round(p.preco * p.quantidade_estoque, 2),
            }
            for p in produtos
        ],
    }
```

(Only the dict inside the list comprehension changes — `/baixo` and `/parados` stay untouched.)

- [ ] **Step 4: Run it to confirm it passes**

Run: `pytest tests/test_rotas_estoque.py -v`
Expected: PASS (all 4 tests in the file, including the 3 pre-existing ones)

- [ ] **Step 5: Update the page test**

Replace `tests/test_pagina_estoque.py` contents with:

```python
def test_pagina_estoque_carrega(client):
    resposta = client.get("/estoque-page")
    assert resposta.status_code == 200
    assert "resumo-estoque" in resposta.text


def test_estoque_js_disponivel(client):
    resposta = client.get("/static/js/estoque.js")
    assert resposta.status_code == 200
    assert "carregarEstoque" in resposta.text
```

- [ ] **Step 6: Update `app/templates/estoque.html`**

```html
{% extends "base.html" %}
{% block scripts %}<script src="/static/js/estoque.js" defer></script>{% endblock %}
{% block conteudo %}
<div class="topo">
  <div>
    <h1>Estoque</h1>
    <p class="subtitulo">Quantidade e valor financeiro dos produtos em estoque</p>
  </div>
</div>

<div class="destaque-financeiro" id="resumo-estoque"></div>

<div class="card-tabela">
  <table>
    <thead><tr><th>Produto</th><th>Quantidade</th><th>Valor unitário</th><th>Valor em estoque</th></tr></thead>
    <tbody id="tabela-estoque"></tbody>
  </table>
</div>
{% endblock %}
```

- [ ] **Step 7: Update `app/static/js/estoque.js`**

```js
async function carregarEstoque() {
  const resumo = await chamarApi("/estoque/resumo");

  document.getElementById("resumo-estoque").innerHTML = `
    <div class="kpi-label">Valor total do estoque</div>
    <div class="kpi-valor">R$ ${resumo.valor_total_estoque.toFixed(2)}</div>
  `;

  const tabela = document.getElementById("tabela-estoque");
  tabela.innerHTML = "";
  for (const produto of resumo.produtos) {
    const linha = document.createElement("tr");
    linha.innerHTML = `
      <td>${escaparHtml(produto.nome)}</td>
      <td>${produto.quantidade_estoque}</td>
      <td>R$ ${produto.preco.toFixed(2)}</td>
      <td>R$ ${produto.valor_estoque.toFixed(2)}</td>
    `;
    tabela.appendChild(linha);
  }
}

carregarEstoque();
```

- [ ] **Step 8: Run the full estoque test set**

Run: `pytest tests/test_pagina_estoque.py tests/test_rotas_estoque.py -v`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add app/routers/estoque.py app/templates/estoque.html app/static/js/estoque.js tests/test_pagina_estoque.py tests/test_rotas_estoque.py
git commit -m "feat: reorganize Estoque page around quantity + financial value"
```

---

### Task 7: Pedidos — column reorder

**Files:**
- Modify: `app/templates/pedidos.html`
- Modify: `app/static/js/pedidos.js`

**Interfaces:**
- No backend/API change — `PedidoOut` schema and `/pedidos` endpoints are untouched. This is a display-only reorder.

- [ ] **Step 1: Update `app/templates/pedidos.html`**

```html
{% extends "base.html" %}
{% block scripts %}<script src="/static/js/pedidos.js" defer></script>{% endblock %}
{% block conteudo %}
<div class="topo">
  <div>
    <h1>Pedidos</h1>
    <p class="subtitulo">Todos os pedidos da loja física e do Shopee</p>
  </div>
</div>

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
  <button type="button" id="adicionar-item" class="btn">+ item</button>

  <button type="submit" class="btn">Criar pedido</button>
</form>

<div class="card-tabela">
  <table>
    <thead><tr><th>Cliente</th><th>Canal</th><th>Data</th><th>Status</th><th>Valor</th><th>Ações</th></tr></thead>
    <tbody id="tabela-pedidos"></tbody>
  </table>
</div>
{% endblock %}
```

- [ ] **Step 2: Update `app/static/js/pedidos.js`**

Add the `CANAL_ROTULOS` constant near the top (after the existing `let produtosDisponiveis = [];` line) and replace `carregarPedidos`:

```js
const CANAL_ROTULOS = { loja_fisica: "Loja física", shopee: "Shopee" };
```

```js
async function carregarPedidos() {
  const pedidos = await chamarApi("/pedidos");
  tabelaPedidos.innerHTML = "";
  for (const pedido of pedidos) {
    const opcoesStatus = STATUS_OPCOES
      .map((s) => `<option value="${s}" ${s === pedido.status ? "selected" : ""}>${s}</option>`)
      .join("");
    const linha = document.createElement("tr");
    linha.innerHTML = `
      <td>${escaparHtml(pedido.cliente_nome)}</td>
      <td><span class="canal-pill">${escaparHtml(CANAL_ROTULOS[pedido.canal] || pedido.canal)}</span></td>
      <td>${new Date(pedido.data_pedido).toLocaleDateString("pt-BR")}</td>
      <td><select class="mudar-status" data-id="${pedido.id}">${opcoesStatus}</select></td>
      <td>R$ ${pedido.valor_total.toFixed(2)}</td>
      <td><button type="button" data-id="${pedido.id}" class="excluir">Excluir</button></td>
    `;
    tabelaPedidos.appendChild(linha);
  }
}
```

Everything else in the file (form submit handler, delete/status-change listeners, `iniciar()`) stays as-is — they reference `tabelaPedidos`/`formPedido` which are unchanged.

- [ ] **Step 3: Run the page + JS tests**

Run: `pytest tests/test_pagina_pedidos.py -v`
Expected: PASS (assertions only check `form-pedido` and `carregarPedidos`, both still present)

- [ ] **Step 4: Manual check**

Run: `uvicorn app.main:app --reload`, open `/pedidos-page`, confirm the table header reads Cliente/Canal/Data/Status/Valor/Ações and a seeded order's row lines up correctly (run `python seed.py` first if the DB is empty).

- [ ] **Step 5: Commit**

```bash
git add app/templates/pedidos.html app/static/js/pedidos.js
git commit -m "feat: reorder Pedidos table to Cliente/Canal/Data/Status/Valor/Ações"
```

---

### Task 8: Produtos — reskin only

**Files:**
- Modify: `app/templates/produtos.html`

**Interfaces:**
- No JS or API change — `produtos.js` and the `/produtos` endpoints are untouched.

- [ ] **Step 1: Update `app/templates/produtos.html`**

```html
{% extends "base.html" %}
{% block scripts %}<script src="/static/js/produtos.js" defer></script>{% endblock %}
{% block conteudo %}
<div class="topo">
  <div>
    <h1>Produtos</h1>
    <p class="subtitulo">Catálogo de produtos cadastrados</p>
  </div>
</div>

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
  <button type="submit" class="btn">Salvar produto</button>
</form>

<div class="card-tabela">
  <table>
    <thead>
      <tr><th>SKU</th><th>Nome</th><th>Categoria</th><th>Tamanho</th><th>Cor</th><th>Preço</th><th>Estoque</th><th>Ações</th></tr>
    </thead>
    <tbody id="tabela-produtos"></tbody>
  </table>
</div>
{% endblock %}
```

- [ ] **Step 2: Run the page test**

Run: `pytest tests/test_pagina_produtos.py -v`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/templates/produtos.html
git commit -m "style: reskin Produtos page with the shared design system"
```

---

### Task 9: Painel de IA — empty state until click

**Files:**
- Modify: `app/templates/painel_ia.html`
- Modify: `app/static/js/painel_ia.js`

**Interfaces:**
- Consumes: `GET /ia/ultima` (unchanged — returns `null` when no analysis exists yet, per `app/routers/ia.py:24-34`), `POST /ia/analisar` (unchanged).
- Produces: two mutually-exclusive sections, `#ia-vazio` and `#ia-resultado`, toggled via the `hidden` attribute.

- [ ] **Step 1: Update `app/templates/painel_ia.html`**

```html
{% extends "base.html" %}
{% block scripts %}<script src="/static/js/painel_ia.js" defer></script>{% endblock %}
{% block conteudo %}
<div id="ia-vazio" class="ia-estado-vazio">
  <div class="ia-icone">🤖</div>
  <h2>Análise inteligente</h2>
  <p>Clique no botão abaixo para analisar seus dados e receber insights da IA.</p>
  <button type="button" id="botao-analisar" class="btn btn-grande">Analisar com IA</button>
</div>

<div id="ia-resultado" hidden>
  <div class="topo">
    <div>
      <h1>Painel de Análise com IA</h1>
      <p class="subtitulo" id="ultima-geracao"></p>
    </div>
    <button type="button" id="botao-reanalisar" class="btn">Analisar novamente</button>
  </div>

  <div class="grid-principal">
    <div class="painel">
      <div class="painel-titulo"><h2>Faturamento por canal</h2></div>
      <canvas id="grafico-faturamento"></canvas>
    </div>
    <div class="painel">
      <div class="painel-titulo"><h2>Top produtos vendidos</h2></div>
      <canvas id="grafico-top-produtos"></canvas>
    </div>
  </div>

  <div class="kpis" id="card-kpis"></div>

  <div class="painel">
    <div class="painel-titulo"><h2>Anomalias detectadas</h2></div>
    <div id="lista-anomalias"></div>
  </div>

  <div class="painel">
    <div class="painel-titulo"><h2>Recomendações</h2></div>
    <div id="lista-recomendacoes"></div>
  </div>
</div>
{% endblock %}
```

- [ ] **Step 2: Update `app/static/js/painel_ia.js`**

```js
let graficoFaturamento = null;
let graficoTopProdutos = null;

function mostrarEstadoVazio() {
  document.getElementById("ia-vazio").hidden = false;
  document.getElementById("ia-resultado").hidden = true;
}

function mostrarResultado() {
  document.getElementById("ia-vazio").hidden = true;
  document.getElementById("ia-resultado").hidden = false;
}

function renderizarAnalise(analise) {
  mostrarResultado();

  document.getElementById("ultima-geracao").textContent =
    "Última análise: " + new Date(analise.gerado_em).toLocaleString("pt-BR");

  const dados = analise.kpis.dados_calculados;

  document.getElementById("card-kpis").innerHTML = `
    <div class="kpi"><div class="kpi-label">Ticket médio</div><div class="kpi-valor">R$ ${dados.ticket_medio.toFixed(2)}</div></div>
    <div class="kpi"><div class="kpi-label">Pedidos (30 dias)</div><div class="kpi-valor">${dados.quantidade_pedidos_ultimos_30_dias}</div></div>
    <div class="kpi kpi-texto"><div class="kpi-label">Interpretação da IA</div><p>${escaparHtml(analise.kpis.interpretacao)}</p></div>
  `;

  const contextoFaturamento = document.getElementById("grafico-faturamento").getContext("2d");
  if (graficoFaturamento) graficoFaturamento.destroy();
  graficoFaturamento = new Chart(contextoFaturamento, {
    type: "bar",
    data: {
      labels: Object.keys(dados.faturamento_por_canal),
      datasets: [{ label: "Faturamento por canal (R$)", data: Object.values(dados.faturamento_por_canal), backgroundColor: "#9C2B4E" }],
    },
  });

  const contextoTop = document.getElementById("grafico-top-produtos").getContext("2d");
  if (graficoTopProdutos) graficoTopProdutos.destroy();
  graficoTopProdutos = new Chart(contextoTop, {
    type: "bar",
    data: {
      labels: dados.top_produtos_mais_vendidos.map((p) => p.nome),
      datasets: [{ label: "Quantidade vendida", data: dados.top_produtos_mais_vendidos.map((p) => p.quantidade_vendida), backgroundColor: "#7A1F3D" }],
    },
  });

  const listaAnomalias = document.getElementById("lista-anomalias");
  listaAnomalias.innerHTML = analise.anomalias.alertas && analise.anomalias.alertas.length
    ? analise.anomalias.alertas
        .map((a) => `<div class="alerta-ia alerta-ia-${a.severidade}"><strong>${escaparHtml(a.titulo)}</strong><p>${escaparHtml(a.descricao)}</p></div>`)
        .join("")
    : "<p>Nenhuma anomalia detectada.</p>";

  const listaRecomendacoes = document.getElementById("lista-recomendacoes");
  listaRecomendacoes.innerHTML = analise.recomendacoes.acoes && analise.recomendacoes.acoes.length
    ? analise.recomendacoes.acoes
        .map((a) => `<div class="alerta-ia alerta-ia-${a.prioridade}"><strong>${escaparHtml(a.titulo)}</strong><p>${escaparHtml(a.descricao)}</p></div>`)
        .join("")
    : "<p>Nenhuma recomendação no momento.</p>";
}

async function iniciarAnalise(botao) {
  botao.disabled = true;
  const textoOriginal = botao.textContent;
  botao.textContent = "Analisando...";
  try {
    const analise = await chamarApi("/ia/analisar", { method: "POST" });
    renderizarAnalise(analise);
  } catch (erro) {
    alert(erro.message);
  } finally {
    botao.disabled = false;
    botao.textContent = textoOriginal;
  }
}

document.getElementById("botao-analisar").addEventListener("click", (evento) => iniciarAnalise(evento.target));
document.getElementById("botao-reanalisar").addEventListener("click", (evento) => iniciarAnalise(evento.target));

(async function iniciar() {
  const ultima = await chamarApi("/ia/ultima");
  if (ultima) {
    renderizarAnalise(ultima);
  } else {
    mostrarEstadoVazio();
  }
})();
```

- [ ] **Step 3: Run the page + JS tests**

Run: `pytest tests/test_pagina_painel_ia.py -v`
Expected: PASS (`botao-analisar` and `renderizarAnalise` are both still present, just relocated/restructured)

- [ ] **Step 4: Manual check**

Run: `uvicorn app.main:app --reload`, open `/painel-ia` on a fresh DB (no prior `/ia/analisar` call) — confirm only the empty-state card shows, no charts/KPIs. Click "Analisar com IA" — confirm it switches to the result view. Reload the page — confirm it goes straight to the result view (since `/ia/ultima` now returns the saved analysis) with a "Analisar novamente" button, not back to the empty state.

- [ ] **Step 5: Commit**

```bash
git add app/templates/painel_ia.html app/static/js/painel_ia.js
git commit -m "feat: show Painel de IA empty state until user requests analysis"
```

---

### Task 10: Full regression pass

**Files:** none (verification only)

- [ ] **Step 1: Run the entire suite**

Run: `pytest -v`
Expected: All tests PASS, including every test file touched or created above plus the untouched ones (`test_models.py`, `test_servicos_estoque.py`, `test_agente_*.py`, `test_orquestrador.py`, `test_resumo.py`, `test_seed.py`, `test_rotas_pedidos.py`, `test_rotas_produtos.py`, `test_rotas_ia.py`).

- [ ] **Step 2: Manual walkthrough**

Run: `python seed.py` (only if `fama_fashion.db` is empty — it already has data per the git status at the start of this session, so this step may be a no-op) then `uvicorn app.main:app --reload`. Visit, in order: `/` (Resumo — sidebar highlights "Resumo", KPIs/chart/alerts/latest orders all populated from seed data), `/produtos-page`, `/pedidos-page`, `/estoque-page`, `/painel-ia`. Confirm the sidebar's active item matches the current page on every screen, and the background reads as a light neutral off-white rather than the previous tone.

---

## Self-Review Notes

- **Spec coverage:** background token (Task 1), sidebar nav with 5 items incl. new route (Tasks 2–3), Produtos untouched scope (Task 8), Pedidos column order (Task 7), Estoque destaque + 4-column table (Task 6), Painel de IA empty state (Task 9), Dashboard (Tasks 4–5) — every spec section maps to a task.
- **Type/id consistency checked:** `pagina_ativa` values match between Task 2 (`base.html` conditionals) and Task 3 (`main.py` context dicts); `resumo-estoque` id matches between Task 6's template, JS, and updated test; `/dashboard/resumo` response keys match exactly between Task 4's endpoint, Task 5's `resumo.js`, and Task 5's test.
- **Ordering dependency called out explicitly:** Task 3's `main.py` imports `dashboard` (Task 4), so Task 3's test run is deferred to after Task 4 — flagged inline in Task 3 rather than left implicit.
