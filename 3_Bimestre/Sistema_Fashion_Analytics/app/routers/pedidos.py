from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app import auth, models, schemas
from app.database import get_db

router = APIRouter(prefix="/pedidos", tags=["pedidos"])


@router.get("", response_model=list[schemas.PedidoOut])
def listar_pedidos(
    canal: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    usuario: dict = Depends(auth.exigir_login),
):
    query = db.query(models.Pedido).options(joinedload(models.Pedido.itens))
    if canal:
        query = query.filter(models.Pedido.canal == canal)
    if status:
        query = query.filter(models.Pedido.status == status)
    return query.order_by(models.Pedido.data_pedido.desc()).all()


@router.get("/{pedido_id}", response_model=schemas.PedidoOut)
def obter_pedido(pedido_id: int, db: Session = Depends(get_db), usuario: dict = Depends(auth.exigir_login)):
    pedido = db.get(models.Pedido, pedido_id)
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return pedido


@router.post("", response_model=schemas.PedidoOut, status_code=201)
def criar_pedido(dados: schemas.PedidoCreate, db: Session = Depends(get_db), usuario: dict = Depends(auth.exigir_admin)):
    if not dados.itens:
        raise HTTPException(status_code=400, detail="O pedido precisa ter pelo menos um item")

    pedido = models.Pedido(
        canal=dados.canal,
        cliente_nome=dados.cliente_nome,
        cliente_contato=dados.cliente_contato,
        status=dados.status,
        data_pedido=datetime.utcnow(),
        valor_total=0.0,
    )
    db.add(pedido)
    db.flush()

    valor_total = 0.0
    for item in dados.itens:
        produto = db.get(models.Produto, item.produto_id)
        if not produto:
            db.rollback()
            raise HTTPException(status_code=404, detail=f"Produto {item.produto_id} não encontrado")
        if produto.quantidade_estoque < item.quantidade:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail=f"Estoque insuficiente para o produto '{produto.nome}'",
            )
        subtotal = produto.preco * item.quantidade
        db.add(models.ItemPedido(
            pedido_id=pedido.id,
            produto_id=produto.id,
            quantidade=item.quantidade,
            preco_unitario=produto.preco,
            subtotal=subtotal,
        ))
        produto.quantidade_estoque -= item.quantidade
        valor_total += subtotal

    pedido.valor_total = valor_total
    db.commit()
    db.refresh(pedido)
    return pedido


@router.put("/{pedido_id}", response_model=schemas.PedidoOut)
def editar_pedido(pedido_id: int, dados: schemas.PedidoUpdate, db: Session = Depends(get_db), usuario: dict = Depends(auth.exigir_admin)):
    pedido = db.get(models.Pedido, pedido_id)
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    status_anterior = pedido.status
    novo_status = dados.status if dados.status is not None else status_anterior
    if novo_status == "cancelado" and status_anterior != "cancelado":
        _devolver_estoque(pedido, db)

    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(pedido, campo, valor)

    db.commit()
    db.refresh(pedido)
    return pedido


@router.delete("/{pedido_id}", status_code=204)
def remover_pedido(pedido_id: int, db: Session = Depends(get_db), usuario: dict = Depends(auth.exigir_admin)):
    pedido = db.get(models.Pedido, pedido_id)
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    if pedido.status != "cancelado":
        _devolver_estoque(pedido, db)
    db.delete(pedido)
    db.commit()
    return None


def _devolver_estoque(pedido: models.Pedido, db: Session) -> None:
    for item in pedido.itens:
        produto = db.get(models.Produto, item.produto_id)
        if produto:
            produto.quantidade_estoque += item.quantidade
