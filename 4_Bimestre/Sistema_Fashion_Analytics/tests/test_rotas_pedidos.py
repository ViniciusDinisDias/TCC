def _criar_produto(client_admin, quantidade_estoque=10, preco=50.0, sku="PED-001"):
    resposta = client_admin.post("/produtos", json={
        "sku": sku, "nome": "Produto Pedido", "categoria": "Blusa",
        "tamanho": "M", "cor": "Azul", "preco": preco,
        "quantidade_estoque": quantidade_estoque, "estoque_minimo": 2,
    })
    return resposta.json()


def test_criar_pedido_com_varios_itens_desconta_estoque_e_calcula_total(client_admin):
    produto_a = _criar_produto(client_admin, quantidade_estoque=10, preco=50.0, sku="PED-A")
    produto_b = _criar_produto(client_admin, quantidade_estoque=10, preco=20.0, sku="PED-B")

    resposta = client_admin.post("/pedidos", json={
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

    produto_a_atualizado = client_admin.get(f"/produtos/{produto_a['id']}").json()
    produto_b_atualizado = client_admin.get(f"/produtos/{produto_b['id']}").json()
    assert produto_a_atualizado["quantidade_estoque"] == 7
    assert produto_b_atualizado["quantidade_estoque"] == 8


def test_criar_pedido_com_estoque_insuficiente_falha(client_admin):
    produto = _criar_produto(client_admin, quantidade_estoque=2)

    resposta = client_admin.post("/pedidos", json={
        "canal": "loja_fisica", "cliente_nome": "Cliente Y",
        "itens": [{"produto_id": produto["id"], "quantidade": 5}],
    })

    assert resposta.status_code == 400
    produto_atualizado = client_admin.get(f"/produtos/{produto['id']}").json()
    assert produto_atualizado["quantidade_estoque"] == 2


def test_criar_pedido_sem_itens_falha(client_admin):
    resposta = client_admin.post("/pedidos", json={
        "canal": "shopee", "cliente_nome": "Cliente Sem Itens", "itens": [],
    })
    assert resposta.status_code == 400


def test_cancelar_pedido_devolve_estoque(client_admin):
    produto = _criar_produto(client_admin, quantidade_estoque=10)
    pedido = client_admin.post("/pedidos", json={
        "canal": "shopee", "cliente_nome": "Cliente Z",
        "itens": [{"produto_id": produto["id"], "quantidade": 4}],
    }).json()

    resposta = client_admin.put(f"/pedidos/{pedido['id']}", json={"status": "cancelado"})
    assert resposta.status_code == 200

    produto_atualizado = client_admin.get(f"/produtos/{produto['id']}").json()
    assert produto_atualizado["quantidade_estoque"] == 10


def test_excluir_pedido_nao_cancelado_devolve_estoque(client_admin):
    produto = _criar_produto(client_admin, quantidade_estoque=10)
    pedido = client_admin.post("/pedidos", json={
        "canal": "loja_fisica", "cliente_nome": "Cliente W",
        "itens": [{"produto_id": produto["id"], "quantidade": 2}],
    }).json()

    resposta = client_admin.delete(f"/pedidos/{pedido['id']}")
    assert resposta.status_code == 204

    produto_atualizado = client_admin.get(f"/produtos/{produto['id']}").json()
    assert produto_atualizado["quantidade_estoque"] == 10


def test_listar_pedidos_filtra_por_canal(client_admin):
    produto = _criar_produto(client_admin, quantidade_estoque=10)
    client_admin.post("/pedidos", json={
        "canal": "shopee", "cliente_nome": "A",
        "itens": [{"produto_id": produto["id"], "quantidade": 1}],
    })
    client_admin.post("/pedidos", json={
        "canal": "loja_fisica", "cliente_nome": "B",
        "itens": [{"produto_id": produto["id"], "quantidade": 1}],
    })

    resposta = client_admin.get("/pedidos", params={"canal": "shopee"})
    assert resposta.status_code == 200
    assert len(resposta.json()) == 1
    assert resposta.json()[0]["canal"] == "shopee"
