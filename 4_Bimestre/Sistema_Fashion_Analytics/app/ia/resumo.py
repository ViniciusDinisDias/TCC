from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app import models, servicos_estoque


def montar_resumo_dados(db: Session) -> dict:
    """Calcula em Python os números exatos que os agentes de IA vão interpretar."""
    produtos = db.query(models.Produto).all()
    pedidos_validos = db.query(models.Pedido).filter(models.Pedido.status != "cancelado").all()

    faturamento_por_canal: dict[str, float] = {}
    for pedido in pedidos_validos:
        faturamento_por_canal[pedido.canal] = faturamento_por_canal.get(pedido.canal, 0.0) + pedido.valor_total

    ticket_medio = (
        sum(p.valor_total for p in pedidos_validos) / len(pedidos_validos)
        if pedidos_validos else 0.0
    )

    vendidos_por_produto: dict[int, dict] = {}
    for pedido in pedidos_validos:
        for item in pedido.itens:
            registro = vendidos_por_produto.setdefault(
                item.produto_id,
                {"produto_id": item.produto_id, "quantidade_vendida": 0, "faturamento": 0.0},
            )
            registro["quantidade_vendida"] += item.quantidade
            registro["faturamento"] += item.subtotal

    produtos_por_id = {p.id: p for p in produtos}
    top_produtos = sorted(
        vendidos_por_produto.values(), key=lambda r: r["quantidade_vendida"], reverse=True
    )[:5]
    for registro in top_produtos:
        produto = produtos_por_id.get(registro["produto_id"])
        registro["nome"] = produto.nome if produto else "Produto removido"
        registro["sku"] = produto.sku if produto else ""
        registro["faturamento"] = round(registro["faturamento"], 2)

    giro_estoque = [
        {
            "produto_id": produto.id,
            "nome": produto.nome,
            "quantidade_vendida_total": vendidos_por_produto.get(produto.id, {"quantidade_vendida": 0})["quantidade_vendida"],
            "quantidade_estoque_atual": produto.quantidade_estoque,
        }
        for produto in produtos
    ]

    produtos_parados = servicos_estoque.listar_produtos_parados(db, produtos)
    produtos_estoque_baixo = servicos_estoque.listar_produtos_estoque_baixo(produtos)

    agora = datetime.utcnow()
    limite_30_dias = agora - timedelta(days=30)
    limite_60_dias = agora - timedelta(days=60)
    pedidos_recentes = [p for p in pedidos_validos if p.data_pedido >= limite_30_dias]
    pedidos_periodo_anterior = [
        p for p in pedidos_validos if limite_60_dias <= p.data_pedido < limite_30_dias
    ]

    # Bloco usado pelo hero do Painel de IA: faturamento, ticket médio e produto
    # top SEMPRE recalculados sobre a mesma janela de 30 dias que "pedidos
    # recentes" (ao contrário de faturamento_por_canal/ticket_medio acima, que
    # são históricos — usados pelos gráficos e pelos agentes de IA).
    faturamento_total_30_dias = round(sum(p.valor_total for p in pedidos_recentes), 2)
    ticket_medio_30_dias = (
        round(faturamento_total_30_dias / len(pedidos_recentes), 2) if pedidos_recentes else 0.0
    )

    faturamento_30_dias_anterior = (
        round(sum(p.valor_total for p in pedidos_periodo_anterior), 2)
        if pedidos_periodo_anterior else None
    )
    variacao_faturamento_30_dias_pct = (
        round(
            (faturamento_total_30_dias - faturamento_30_dias_anterior) / faturamento_30_dias_anterior * 100, 1
        )
        if faturamento_30_dias_anterior else None
    )

    vendidos_por_produto_30_dias: dict[int, int] = {}
    for pedido in pedidos_recentes:
        for item in pedido.itens:
            vendidos_por_produto_30_dias[item.produto_id] = (
                vendidos_por_produto_30_dias.get(item.produto_id, 0) + item.quantidade
            )
    produto_top_30_dias = None
    if vendidos_por_produto_30_dias:
        produto_id_top = max(vendidos_por_produto_30_dias, key=vendidos_por_produto_30_dias.get)
        produto_top = produtos_por_id.get(produto_id_top)
        produto_top_30_dias = {
            "produto_id": produto_id_top,
            "nome": produto_top.nome if produto_top else "Produto removido",
            "quantidade_vendida": vendidos_por_produto_30_dias[produto_id_top],
        }

    serie_faturamento_diario_30_dias = []
    for dias_atras in range(29, -1, -1):
        dia = (agora - timedelta(days=dias_atras)).date()
        total_do_dia = sum(p.valor_total for p in pedidos_recentes if p.data_pedido.date() == dia)
        serie_faturamento_diario_30_dias.append(round(total_do_dia, 2))

    return {
        "faturamento_por_canal": {k: round(v, 2) for k, v in faturamento_por_canal.items()},
        "ticket_medio": round(ticket_medio, 2),
        "top_produtos_mais_vendidos": top_produtos,
        "giro_estoque": giro_estoque,
        "produtos_parados": [{"produto_id": p.id, "nome": p.nome, "sku": p.sku} for p in produtos_parados],
        "produtos_estoque_baixo": [
            {"produto_id": p.id, "nome": p.nome, "quantidade_estoque": p.quantidade_estoque, "estoque_minimo": p.estoque_minimo}
            for p in produtos_estoque_baixo
        ],
        "quantidade_pedidos_ultimos_30_dias": len(pedidos_recentes),
        "faturamento_total_30_dias": faturamento_total_30_dias,
        "ticket_medio_30_dias": ticket_medio_30_dias,
        "produto_top_30_dias": produto_top_30_dias,
        "faturamento_30_dias_anterior": faturamento_30_dias_anterior,
        "variacao_faturamento_30_dias_pct": variacao_faturamento_30_dias_pct,
        "serie_faturamento_diario_30_dias": serie_faturamento_diario_30_dias,
    }
