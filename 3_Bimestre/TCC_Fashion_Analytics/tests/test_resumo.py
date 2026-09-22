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
