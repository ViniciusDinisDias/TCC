from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app import models


def calcular_valor_total_em_estoque(produtos: list) -> float:
    return round(sum(p.preco * p.quantidade_estoque for p in produtos), 2)


def listar_produtos_estoque_baixo(produtos: list) -> list:
    return [p for p in produtos if p.quantidade_estoque <= p.estoque_minimo]


def listar_produtos_parados(db: Session, produtos: list, dias: int = 30) -> list:
    limite = datetime.utcnow() - timedelta(days=dias)
    pedidos_recentes = (
        db.query(models.Pedido)
        .filter(models.Pedido.data_pedido >= limite)
        .filter(models.Pedido.status != "cancelado")
        .all()
    )
    ids_com_venda_recente = {item.produto_id for pedido in pedidos_recentes for item in pedido.itens}
    return [p for p in produtos if p.id not in ids_com_venda_recente]
