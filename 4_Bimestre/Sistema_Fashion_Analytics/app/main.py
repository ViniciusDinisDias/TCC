import os

from fastapi import Depends, FastAPI, Form, Request
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from starlette.middleware.sessions import SessionMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.database import Base, engine, get_db
from app import auth, models  # noqa: F401
from app.routers import produtos, pedidos, estoque, ia, dashboard

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Fama Fashion")
app.add_middleware(
    SessionMiddleware,
    secret_key=os.environ.get("SESSION_SECRET_KEY", "chave-dev-fama-fashion-trocar-em-producao"),
    session_cookie="fama_fashion_sessao",
    same_site="lax",
)
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")


def static_version(caminho_relativo: str) -> int:
    """Timestamp do arquivo estático, usado como query string para invalidar o cache do navegador a cada mudança."""
    return int(os.path.getmtime(os.path.join(STATIC_DIR, caminho_relativo)))


templates.env.globals["static_version"] = static_version

app.include_router(produtos.router)
app.include_router(pedidos.router)
app.include_router(estoque.router)
app.include_router(ia.router)
app.include_router(dashboard.router)


@app.get("/health")
def health():
    return {"status": "ok"}


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
