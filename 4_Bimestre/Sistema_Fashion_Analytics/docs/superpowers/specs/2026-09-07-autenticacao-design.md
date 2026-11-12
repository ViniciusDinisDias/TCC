# Autenticação e controle de acesso por papel — Fama Fashion

Data: 2026-09-07

## Contexto

O sistema hoje não tem nenhum tipo de login — qualquer pessoa com a URL
acessa e altera qualquer coisa. Este documento adiciona dois papéis de
usuário:

- **Administrador**: acesso completo (tudo que existe hoje).
- **Assistente**: acesso de leitura a tudo, sem permissão para criar,
  editar ou excluir produtos/pedidos. Pode gerar novas análises de IA
  (não altera dados de negócio, só grava um insight).

## Fora de escopo

- Tela de gestão de usuários (criar/editar/remover pela interface) — só os
  dois usuários semeados (`admin`, `assistente`).
- Recuperação de senha, "lembrar de mim", múltiplos usuários por papel.
- Rate limiting / bloqueio por tentativas de login.
- Cookie `secure=True` / HTTPS — responsabilidade do ambiente de deploy,
  não deste projeto local de TCC.

## 1. Modelo de dados

Nova tabela em `app/models.py`:

```python
class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    login = Column(String, unique=True, index=True, nullable=False)
    senha_hash = Column(String, nullable=False)
    papel = Column(String, nullable=False)  # "admin" | "assistente"
```

## 2. Hash de senha — sem dependência nova

`app/auth.py` usa `hashlib.pbkdf2_hmac` (biblioteca padrão do Python, já
disponível) em vez de adicionar `passlib`/`bcrypt`:

- `gerar_hash_senha(senha: str) -> str`: gera um salt aleatório
  (`os.urandom(16)`), calcula `pbkdf2_hmac("sha256", senha, salt,
  200_000)` e retorna `"{salt_hex}${hash_hex}"`.
- `verificar_senha(senha: str, hash_armazenado: str) -> bool`: separa
  salt/hash, recalcula e compara com `hmac.compare_digest` (evita timing
  attack).

## 3. Sessão — `SessionMiddleware`

`app/main.py` registra o `SessionMiddleware` do Starlette (parte do
FastAPI; só falta declarar `itsdangerous` no `requirements.txt`, que já
está instalado como dependência transitiva):

```python
app.add_middleware(
    SessionMiddleware,
    secret_key=os.environ.get("SESSION_SECRET_KEY", "chave-dev-fama-fashion-trocar-em-producao"),
    session_cookie="fama_fashion_sessao",
    same_site="lax",
)
```

`.env.example` ganha `SESSION_SECRET_KEY=` com um comentário explicando
que deve ser trocado fora de ambiente de desenvolvimento.

Sessão guarda um dict simples: `{"id": ..., "login": ..., "papel": ...}`.

## 4. `app/auth.py` — funções e dependências

- `PAPEL_ADMIN = "admin"`, `PAPEL_ASSISTENTE = "assistente"`
- `autenticar(db, login, senha) -> Usuario | None`
- `obter_usuario_sessao(request) -> dict | None` — lê a sessão, sem
  levantar erro.
- `exigir_login(request: Request) -> dict` — dependência do FastAPI para
  **rotas de API**; levanta `HTTPException(401, "Não autenticado")` se
  não houver sessão.
- `exigir_admin(usuario: dict = Depends(exigir_login)) -> dict` —
  levanta `HTTPException(403, "Ação restrita ao administrador")` se
  `papel != "admin"`.
- Para **páginas** (que devem redirecionar, não devolver JSON 401), cada
  rota de página chama `obter_usuario_sessao` diretamente e retorna
  `RedirectResponse("/login", status_code=303)` se vier `None` — sem
  depender de exception handlers especiais.

## 5. Rotas novas

| Rota | Método | Comportamento |
|---|---|---|
| `/login` | GET | Renderiza `login.html`. Se já logado, redireciona para `/`. |
| `/login` | POST | Autentica (`login`, `senha` via form). Sucesso: grava sessão, redireciona para `/`. Falha: re-renderiza `login.html` com `erro="Usuário ou senha inválidos"`. |
| `/logout` | GET | Limpa a sessão, redireciona para `/login`. |

## 6. Matriz de autorização (rotas existentes)

| Rota | Método | Exige |
|---|---|---|
| `/`, `/produtos-page`, `/pedidos-page`, `/estoque-page`, `/painel-ia` | GET | login (qualquer papel); sem sessão → redirect `/login` |
| `/produtos`, `/produtos/{id}` | GET | login |
| `/produtos`, `/produtos/{id}` | POST/PUT/DELETE | **admin** |
| `/pedidos`, `/pedidos/{id}` | GET | login |
| `/pedidos`, `/pedidos/{id}` | POST/PUT/DELETE | **admin** |
| `/estoque/*` | GET | login |
| `/dashboard/resumo` | GET | login |
| `/ia/ultima`, `/ia/historico` | GET | login |
| `/ia/analisar` | POST | login (qualquer papel — decisão já validada com o usuário) |
| `/health` | GET | público (healthcheck técnico, sem checagem) |

## 7. Frontend

- `app/templates/login.html`: página isolada (**não** estende
  `base.html` — sem sidebar), com a mesma paleta/tipografia do resto do
  sistema, card centralizado, campos usuário/senha, botão "Entrar" e
  área de erro.
- `base.html`: rodapé da sidebar mostra `{{ usuario.login }}` / papel
  (no lugar do texto fixo "Fama Fashion / Loja física + Shopee") e um
  link "Sair" (`/logout`). O `<head>` ganha
  `<script>window.PAPEL_USUARIO = "{{ usuario.papel }}";</script>`.
- Cada rota de página em `main.py` passa `usuario` no contexto do
  template (além de `pagina_ativa` já existente).
- `produtos.html` / `pedidos.html`: botão "+ Novo Produto"/"+ Novo
  Pedido" envolto em `{% if usuario.papel == 'admin' %}`.
- `produtos.js` / `pedidos.js`: ao montar cada card, se
  `window.PAPEL_USUARIO !== "admin"`, não renderiza os botões de
  editar/excluir e desabilita (`disabled`) o `<select>` de status do
  pedido.
- `common.js`: `chamarApi` redireciona para `/login` quando a resposta é
  401 (sessão expirada), em vez de só lançar o erro.

## 8. Seed dos usuários iniciais

`seed.py` ganha `popular_usuarios(db)`, chamada **independente** da
checagem de produtos (o banco de desenvolvimento atual já tem produtos,
então a checagem existente pularia a criação dos usuários). Só cria
`admin`/`assistente` se a tabela `usuarios` estiver vazia. Senha inicial
via `SEED_SENHA_ADMIN` / `SEED_SENHA_ASSISTENTE` (env vars), com um
fallback de desenvolvimento documentado no README junto com um aviso
para trocar a senha depois.

## 9. Impacto nos testes existentes

Praticamente todo teste de rota/página hoje chama a API sem nenhuma
sessão — vão passar a receber 401/redirect. Serão necessários:

- Um fixture `client_admin` / `client_assistente` em `conftest.py` que
  cria o usuário correspondente, faz `POST /login` (o `TestClient` do
  Starlette mantém cookies entre requisições automaticamente) e devolve
  o client já autenticado.
- Ajuste dos testes existentes de página/rota para usar
  `client_admin` no lugar de `client` onde a ação exige login (a
  esmagadora maioria).
- Novos testes específicos: página redireciona sem sessão; rota de
  escrita retorna 403 para `client_assistente`; login com senha errada
  falha; logout limpa a sessão.
