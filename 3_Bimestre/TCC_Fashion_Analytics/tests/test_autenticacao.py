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


def test_pagina_sem_login_redireciona_para_login(client):
    for rota in ["/", "/produtos-page", "/pedidos-page", "/estoque-page", "/painel-ia"]:
        resposta = client.get(rota, follow_redirects=False)
        assert resposta.status_code == 303, rota
        assert resposta.headers["location"] == "/login", rota
