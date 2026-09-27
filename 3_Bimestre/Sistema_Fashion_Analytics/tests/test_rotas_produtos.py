def test_criar_e_listar_produto(client_admin):
    resposta = client_admin.post("/produtos", json={
        "sku": "PROD-001", "nome": "Blusa Teste", "categoria": "Blusa",
        "tamanho": "M", "cor": "Azul", "preco": 59.90,
        "quantidade_estoque": 15, "estoque_minimo": 5,
    })
    assert resposta.status_code == 201
    assert resposta.json()["sku"] == "PROD-001"

    resposta_lista = client_admin.get("/produtos")
    assert resposta_lista.status_code == 200
    assert len(resposta_lista.json()) == 1


def test_sku_duplicado_retorna_erro(client_admin):
    dados = {
        "sku": "PROD-DUP", "nome": "Produto", "categoria": "Saia",
        "tamanho": "P", "cor": "Preto", "preco": 39.90,
        "quantidade_estoque": 5, "estoque_minimo": 2,
    }
    client_admin.post("/produtos", json=dados)
    resposta = client_admin.post("/produtos", json=dados)
    assert resposta.status_code == 400


def test_editar_produto(client_admin):
    produto = client_admin.post("/produtos", json={
        "sku": "PROD-002", "nome": "Saia Original", "categoria": "Saia",
        "tamanho": "M", "cor": "Preto", "preco": 79.90,
        "quantidade_estoque": 10, "estoque_minimo": 3,
    }).json()

    resposta = client_admin.put(f"/produtos/{produto['id']}", json={"preco": 89.90})
    assert resposta.status_code == 200
    assert resposta.json()["preco"] == 89.90


def test_excluir_produto(client_admin):
    produto = client_admin.post("/produtos", json={
        "sku": "PROD-003", "nome": "Calça", "categoria": "Calça",
        "tamanho": "G", "cor": "Azul", "preco": 99.90,
        "quantidade_estoque": 5, "estoque_minimo": 2,
    }).json()

    resposta = client_admin.delete(f"/produtos/{produto['id']}")
    assert resposta.status_code == 204

    resposta_get = client_admin.get(f"/produtos/{produto['id']}")
    assert resposta_get.status_code == 404


def test_produto_inexistente_retorna_404(client_admin):
    resposta = client_admin.get("/produtos/9999")
    assert resposta.status_code == 404
