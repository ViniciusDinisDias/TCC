from app import models


def test_criar_produto(db_session):
    produto = models.Produto(
        sku="TEST-001", nome="Produto Teste", categoria="Blusa",
        tamanho="M", cor="Azul", preco=59.90,
        quantidade_estoque=10, estoque_minimo=3,
    )
    db_session.add(produto)
    db_session.commit()
    db_session.refresh(produto)

    assert produto.id is not None
    assert produto.criado_em is not None


def test_criar_pedido_com_itens(db_session):
    produto = models.Produto(
        sku="TEST-002", nome="Produto 2", categoria="Saia",
        tamanho="P", cor="Preto", preco=39.90,
        quantidade_estoque=20, estoque_minimo=5,
    )
    db_session.add(produto)
    db_session.commit()
    db_session.refresh(produto)

    pedido = models.Pedido(
        canal="loja_fisica", cliente_nome="Cliente Teste",
        status="pendente", valor_total=79.80,
    )
    db_session.add(pedido)
    db_session.commit()
    db_session.refresh(pedido)

    item = models.ItemPedido(
        pedido_id=pedido.id, produto_id=produto.id,
        quantidade=2, preco_unitario=39.90, subtotal=79.80,
    )
    db_session.add(item)
    db_session.commit()
    db_session.refresh(pedido)

    assert len(pedido.itens) == 1
    assert pedido.itens[0].subtotal == 79.80


def test_criar_analise_ia(db_session):
    analise = models.AnaliseIA(
        kpis_json="{}", anomalias_json="{}", recomendacoes_json="{}",
    )
    db_session.add(analise)
    db_session.commit()
    db_session.refresh(analise)

    assert analise.id is not None
    assert analise.data_hora is not None
