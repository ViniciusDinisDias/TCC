from datetime import datetime, timedelta

from app import models, servicos_estoque


def test_calcular_valor_total_em_estoque():
    produtos = [
        models.Produto(sku="A", nome="A", categoria="Blusa", tamanho="M", cor="Azul", preco=10.0, quantidade_estoque=5, estoque_minimo=2),
        models.Produto(sku="B", nome="B", categoria="Saia", tamanho="P", cor="Preto", preco=20.0, quantidade_estoque=3, estoque_minimo=2),
    ]
    assert servicos_estoque.calcular_valor_total_em_estoque(produtos) == 110.0


def test_listar_produtos_estoque_baixo():
    baixo = models.Produto(sku="A", nome="A", categoria="Blusa", tamanho="M", cor="Azul", preco=10.0, quantidade_estoque=1, estoque_minimo=5)
    normal = models.Produto(sku="B", nome="B", categoria="Saia", tamanho="P", cor="Preto", preco=20.0, quantidade_estoque=10, estoque_minimo=5)
    resultado = servicos_estoque.listar_produtos_estoque_baixo([baixo, normal])
    assert resultado == [baixo]


def test_listar_produtos_parados(db_session):
    produto_parado = models.Produto(sku="PARADO", nome="Parado", categoria="Blusa", tamanho="M", cor="Azul", preco=10.0, quantidade_estoque=5, estoque_minimo=2)
    produto_ativo = models.Produto(sku="ATIVO", nome="Ativo", categoria="Saia", tamanho="P", cor="Preto", preco=20.0, quantidade_estoque=5, estoque_minimo=2)
    db_session.add_all([produto_parado, produto_ativo])
    db_session.commit()

    pedido = models.Pedido(
        canal="shopee", cliente_nome="Cliente", status="entregue",
        data_pedido=datetime.utcnow() - timedelta(days=1), valor_total=20.0,
    )
    db_session.add(pedido)
    db_session.flush()
    db_session.add(models.ItemPedido(
        pedido_id=pedido.id, produto_id=produto_ativo.id,
        quantidade=1, preco_unitario=20.0, subtotal=20.0,
    ))
    db_session.commit()

    parados = servicos_estoque.listar_produtos_parados(db_session, [produto_parado, produto_ativo])
    assert parados == [produto_parado]
