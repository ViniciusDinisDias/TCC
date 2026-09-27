from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import auth, models, servicos_estoque
from app.database import get_db

router = APIRouter(prefix="/estoque", tags=["estoque"])


@router.get("/resumo")
def resumo_estoque(db: Session = Depends(get_db), usuario: dict = Depends(auth.exigir_login)):
    produtos = db.query(models.Produto).all()
    return {
        "valor_total_estoque": servicos_estoque.calcular_valor_total_em_estoque(produtos),
        "quantidade_produtos": len(produtos),
        "produtos": [
            {
                "id": p.id, "nome": p.nome, "sku": p.sku,
                "quantidade_estoque": p.quantidade_estoque, "estoque_minimo": p.estoque_minimo,
                "preco": p.preco, "valor_estoque": round(p.preco * p.quantidade_estoque, 2),
            }
            for p in produtos
        ],
    }


@router.get("/baixo")
def produtos_com_estoque_baixo(db: Session = Depends(get_db), usuario: dict = Depends(auth.exigir_login)):
    produtos = db.query(models.Produto).all()
    baixos = servicos_estoque.listar_produtos_estoque_baixo(produtos)
    return [
        {"id": p.id, "nome": p.nome, "sku": p.sku, "quantidade_estoque": p.quantidade_estoque, "estoque_minimo": p.estoque_minimo}
        for p in baixos
    ]


@router.get("/parados")
def produtos_parados(dias: int = 30, db: Session = Depends(get_db), usuario: dict = Depends(auth.exigir_login)):
    produtos = db.query(models.Produto).all()
    parados = servicos_estoque.listar_produtos_parados(db, produtos, dias)
    return [
        {"id": p.id, "nome": p.nome, "sku": p.sku, "quantidade_estoque": p.quantidade_estoque}
        for p in parados
    ]
