from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import auth, models, servicos_estoque
from app.database import get_db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

NOMES_MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]


def _somar_meses(ano: int, mes: int, delta: int) -> tuple[int, int]:
    indice = ano * 12 + (mes - 1) + delta
    return indice // 12, indice % 12 + 1


def _variacao_pct(atual: float, anterior: float):
    if not anterior:
        return None
    return round((atual - anterior) / anterior * 100, 1)


@router.get("/resumo")
def resumo_dashboard(db: Session = Depends(get_db), usuario: dict = Depends(auth.exigir_login)):
    agora = datetime.utcnow()
    ano_atual, mes_atual = agora.year, agora.month
    ano_anterior, mes_anterior = _somar_meses(ano_atual, mes_atual, -1)

    pedidos_validos = (
        db.query(models.Pedido)
        .filter(models.Pedido.status != "cancelado")
        .all()
    )

    def _pedidos_do_mes(ano: int, mes: int) -> list:
        ano_fim, mes_fim = _somar_meses(ano, mes, 1)
        inicio = datetime(ano, mes, 1)
        fim = datetime(ano_fim, mes_fim, 1)
        return [p for p in pedidos_validos if inicio <= p.data_pedido < fim]

    pedidos_mes_atual = _pedidos_do_mes(ano_atual, mes_atual)
    pedidos_mes_anterior = _pedidos_do_mes(ano_anterior, mes_anterior)

    faturamento_atual = round(sum(p.valor_total for p in pedidos_mes_atual), 2)
    faturamento_anterior = round(sum(p.valor_total for p in pedidos_mes_anterior), 2)
    ticket_medio_atual = round(faturamento_atual / len(pedidos_mes_atual), 2) if pedidos_mes_atual else 0.0
    ticket_medio_anterior = round(faturamento_anterior / len(pedidos_mes_anterior), 2) if pedidos_mes_anterior else 0.0

    vendas_por_mes = []
    for i in range(5, -1, -1):
        ano_ref, mes_ref = _somar_meses(ano_atual, mes_atual, -i)
        total = round(sum(p.valor_total for p in _pedidos_do_mes(ano_ref, mes_ref)), 2)
        vendas_por_mes.append({"mes": f"{NOMES_MESES[mes_ref - 1]}/{ano_ref % 100:02d}", "valor": total})

    produtos = db.query(models.Produto).all()
    produtos_baixo = servicos_estoque.listar_produtos_estoque_baixo(produtos)
    produtos_parados = servicos_estoque.listar_produtos_parados(db, produtos)
    ids_baixo = {p.id for p in produtos_baixo}

    alertas = [
        {
            "produto_id": p.id, "nome": p.nome, "sku": p.sku, "tipo": "baixo",
            "quantidade_estoque": p.quantidade_estoque, "estoque_minimo": p.estoque_minimo,
        }
        for p in produtos_baixo
    ]
    for p in produtos_parados:
        if p.id in ids_baixo:
            continue
        alertas.append({
            "produto_id": p.id, "nome": p.nome, "sku": p.sku, "tipo": "parado",
            "quantidade_estoque": p.quantidade_estoque, "estoque_minimo": p.estoque_minimo,
        })
    alertas = alertas[:5]

    ultimos_pedidos = (
        db.query(models.Pedido)
        .order_by(models.Pedido.data_pedido.desc())
        .limit(5)
        .all()
    )

    return {
        "kpis": {
            "faturamento_mes_atual": faturamento_atual,
            "variacao_faturamento_pct": _variacao_pct(faturamento_atual, faturamento_anterior),
            "pedidos_mes_atual": len(pedidos_mes_atual),
            "variacao_pedidos_pct": _variacao_pct(len(pedidos_mes_atual), len(pedidos_mes_anterior)),
            "ticket_medio_mes_atual": ticket_medio_atual,
            "variacao_ticket_medio_pct": _variacao_pct(ticket_medio_atual, ticket_medio_anterior),
            "valor_total_estoque": servicos_estoque.calcular_valor_total_em_estoque(produtos),
        },
        "vendas_por_mes": vendas_por_mes,
        "alertas_estoque": alertas,
        "ultimos_pedidos": [
            {
                "id": p.id, "cliente_nome": p.cliente_nome, "canal": p.canal,
                "data_pedido": p.data_pedido.isoformat(), "status": p.status,
                "valor_total": p.valor_total,
            }
            for p in ultimos_pedidos
        ],
    }
