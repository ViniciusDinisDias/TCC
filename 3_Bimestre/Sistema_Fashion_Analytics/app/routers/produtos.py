from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import auth, models, schemas
from app.database import get_db

router = APIRouter(prefix="/produtos", tags=["produtos"])


@router.get("", response_model=list[schemas.ProdutoOut])
def listar_produtos(
    nome: str | None = None,
    categoria: str | None = None,
    db: Session = Depends(get_db),
    usuario: dict = Depends(auth.exigir_login),
):
    query = db.query(models.Produto)
    if nome:
        query = query.filter(models.Produto.nome.ilike(f"%{nome}%"))
    if categoria:
        query = query.filter(models.Produto.categoria == categoria)
    return query.all()


@router.get("/{produto_id}", response_model=schemas.ProdutoOut)
def obter_produto(produto_id: int, db: Session = Depends(get_db), usuario: dict = Depends(auth.exigir_login)):
    produto = db.get(models.Produto, produto_id)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return produto


@router.post("", response_model=schemas.ProdutoOut, status_code=201)
def criar_produto(dados: schemas.ProdutoCreate, db: Session = Depends(get_db), usuario: dict = Depends(auth.exigir_admin)):
    produto = models.Produto(**dados.model_dump())
    db.add(produto)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="SKU já cadastrado")
    db.refresh(produto)
    return produto


@router.put("/{produto_id}", response_model=schemas.ProdutoOut)
def editar_produto(produto_id: int, dados: schemas.ProdutoUpdate, db: Session = Depends(get_db), usuario: dict = Depends(auth.exigir_admin)):
    produto = db.get(models.Produto, produto_id)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(produto, campo, valor)
    db.commit()
    db.refresh(produto)
    return produto


@router.delete("/{produto_id}", status_code=204)
def remover_produto(produto_id: int, db: Session = Depends(get_db), usuario: dict = Depends(auth.exigir_admin)):
    produto = db.get(models.Produto, produto_id)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    tem_pedidos = db.query(models.ItemPedido).filter(models.ItemPedido.produto_id == produto_id).first()
    if tem_pedidos:
        raise HTTPException(
            status_code=400,
            detail="Não é possível excluir este produto pois ele já foi usado em pedidos.",
        )

    db.delete(produto)
    db.commit()
    return None
