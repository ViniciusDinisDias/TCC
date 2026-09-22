from datetime import datetime, timedelta

from app import models


def test_resumo_calcula_valor_total_em_estoque(client_admin):
    client_admin.post("/produtos", json={
        "sku": "EST-001", "nome": "Produto A", "categoria": "Blusa",
        "tamanho": "M", "cor": "Azul", "preco": 10.0,
        "quantidade_estoque": 5, "estoque_minimo": 2,
    })
    client_admin.post("/produtos", json={
        "sku": "EST-002", "nome": "Produto B", "categoria": "Saia",
        "tamanho": "P", "cor": "Preto", "preco": 20.0,
        "quantidade_estoque": 3, "estoque_minimo": 2,
    })

    resposta = client_admin.get("/estoque/resumo")
    assert resposta.status_code == 200
    assert resposta.json()["valor_total_estoque"] == 5 * 10.0 + 3 * 20.0


def test_estoque_baixo_lista_produtos_abaixo_do_minimo(client_admin):
    client_admin.post("/produtos", json={
        "sku": "EST-003", "nome": "Produto C", "categoria": "Vestido",
        "tamanho": "M", "cor": "Rosa", "preco": 50.0,
        "quantidade_estoque": 1, "estoque_minimo": 5,
    })

    resposta = client_admin.get("/estoque/baixo")
    assert resposta.status_code == 200
    assert any(p["sku"] == "EST-003" for p in resposta.json())


def test_produtos_parados_ignora_vendas_recentes(client_admin, db_session):
    produto = client_admin.post("/produtos", json={
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

    resposta = client_admin.get("/estoque/parados")
    skus_parados = {p["sku"] for p in resposta.json()}
    assert "EST-004" not in skus_parados


def test_resumo_estoque_traz_preco_e_valor_por_item(client_admin):
    client_admin.post("/produtos", json={
        "sku": "EST-005", "nome": "Produto E", "categoria": "Calça",
        "tamanho": "M", "cor": "Preto", "preco": 15.0,
        "quantidade_estoque": 4, "estoque_minimo": 2,
    })

    resposta = client_admin.get("/estoque/resumo")
    produto = next(p for p in resposta.json()["produtos"] if p["sku"] == "EST-005")
    assert produto["preco"] == 15.0
    assert produto["valor_estoque"] == 60.0
