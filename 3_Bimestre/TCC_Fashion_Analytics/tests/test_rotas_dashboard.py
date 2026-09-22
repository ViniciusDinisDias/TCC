from datetime import datetime

from app import models


def _criar_produto(client_admin, sku, preco, quantidade, minimo=5):
    return client_admin.post("/produtos", json={
        "sku": sku, "nome": f"Produto {sku}", "categoria": "Blusa",
        "tamanho": "M", "cor": "Azul", "preco": preco,
        "quantidade_estoque": quantidade, "estoque_minimo": minimo,
    }).json()


def test_dashboard_resumo_traz_kpis_alertas_e_ultimos_pedidos(client_admin, db_session):
    produto_normal = _criar_produto(client_admin, "DASH-001", 50.0, 20, minimo=5)
    produto_baixo = _criar_produto(client_admin, "DASH-002", 30.0, 1, minimo=5)

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

    resposta = client_admin.get("/dashboard/resumo")
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
