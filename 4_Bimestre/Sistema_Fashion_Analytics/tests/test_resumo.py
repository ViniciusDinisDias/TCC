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


def test_metricas_30_dias_ignoram_pedidos_fora_da_janela(db_session):
    """faturamento_total_30_dias/ticket_medio_30_dias/pedidos_30_dias devem usar
    exatamente a mesma janela — reprodução do bug onde o faturamento era
    histórico mas a contagem de pedidos era só dos últimos 30 dias."""
    produto = _criar_produto(db_session, sku="P10", preco=100.0)
    _criar_pedido(db_session, produto, 1, "loja_fisica", dias_atras=5)
    _criar_pedido(db_session, produto, 1, "loja_fisica", dias_atras=10)
    _criar_pedido(db_session, produto, 1, "loja_fisica", dias_atras=40)  # fora da janela de 30 dias

    resumo = montar_resumo_dados(db_session)

    assert resumo["quantidade_pedidos_ultimos_30_dias"] == 2
    assert resumo["faturamento_total_30_dias"] == 200.0
    assert resumo["ticket_medio_30_dias"] == 100.0
    # os campos históricos continuam intocados (usados pelos gráficos e pela IA)
    assert resumo["ticket_medio"] == 100.0


def test_variacao_30_dias_fica_none_sem_periodo_anterior(db_session):
    produto = _criar_produto(db_session, sku="P11", preco=50.0)
    _criar_pedido(db_session, produto, 1, "shopee", dias_atras=5)

    resumo = montar_resumo_dados(db_session)

    assert resumo["faturamento_30_dias_anterior"] is None
    assert resumo["variacao_faturamento_30_dias_pct"] is None


def test_variacao_30_dias_calculada_com_periodo_anterior(db_session):
    produto = _criar_produto(db_session, sku="P12", preco=100.0)
    _criar_pedido(db_session, produto, 2, "shopee", dias_atras=5)  # 200 nos últimos 30 dias
    _criar_pedido(db_session, produto, 1, "shopee", dias_atras=45)  # 100 no período anterior (31-60d)

    resumo = montar_resumo_dados(db_session)

    assert resumo["faturamento_30_dias_anterior"] == 100.0
    assert resumo["faturamento_total_30_dias"] == 200.0
    assert resumo["variacao_faturamento_30_dias_pct"] == 100.0


def test_produto_top_30_dias_ignora_vendas_antigas(db_session):
    produto_antigo = _criar_produto(db_session, sku="P13", preco=10.0)
    produto_recente = _criar_produto(db_session, sku="P14", preco=10.0)
    _criar_pedido(db_session, produto_antigo, 10, "shopee", dias_atras=45)
    _criar_pedido(db_session, produto_recente, 1, "shopee", dias_atras=2)

    resumo = montar_resumo_dados(db_session)

    assert resumo["produto_top_30_dias"]["nome"] == produto_recente.nome
    assert resumo["produto_top_30_dias"]["quantidade_vendida"] == 1


def test_produto_top_30_dias_none_sem_pedidos_recentes(db_session):
    produto = _criar_produto(db_session, sku="P15", preco=10.0)
    _criar_pedido(db_session, produto, 3, "shopee", dias_atras=45)

    resumo = montar_resumo_dados(db_session)

    assert resumo["produto_top_30_dias"] is None


def test_serie_faturamento_diario_30_dias_tem_30_pontos(db_session):
    produto = _criar_produto(db_session, sku="P16", preco=20.0)
    _criar_pedido(db_session, produto, 1, "loja_fisica", dias_atras=0)

    resumo = montar_resumo_dados(db_session)

    serie = resumo["serie_faturamento_diario_30_dias"]
    assert len(serie) == 30
    assert serie[-1] == 20.0  # hoje (último ponto) recebeu o pedido criado acima
