from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class ProdutoBase(BaseModel):
    sku: str
    nome: str
    categoria: str
    tamanho: str
    cor: str
    preco: float
    quantidade_estoque: int = 0
    estoque_minimo: int = 5


class ProdutoCreate(ProdutoBase):
    pass


class ProdutoUpdate(BaseModel):
    sku: Optional[str] = None
    nome: Optional[str] = None
    categoria: Optional[str] = None
    tamanho: Optional[str] = None
    cor: Optional[str] = None
    preco: Optional[float] = None
    quantidade_estoque: Optional[int] = None
    estoque_minimo: Optional[int] = None


class ProdutoOut(ProdutoBase):
    id: int
    criado_em: datetime
    atualizado_em: datetime

    model_config = ConfigDict(from_attributes=True)


class ItemPedidoCreate(BaseModel):
    produto_id: int
    quantidade: int


class ItemPedidoOut(BaseModel):
    id: int
    produto_id: int
    quantidade: int
    preco_unitario: float
    subtotal: float

    model_config = ConfigDict(from_attributes=True)


class PedidoCreate(BaseModel):
    canal: str
    cliente_nome: str
    cliente_contato: Optional[str] = None
    status: str = "pendente"
    itens: List[ItemPedidoCreate]


class PedidoUpdate(BaseModel):
    cliente_nome: Optional[str] = None
    cliente_contato: Optional[str] = None
    status: Optional[str] = None


class PedidoOut(BaseModel):
    id: int
    canal: str
    cliente_nome: str
    cliente_contato: Optional[str]
    data_pedido: datetime
    status: str
    valor_total: float
    criado_em: datetime
    itens: List[ItemPedidoOut]

    model_config = ConfigDict(from_attributes=True)
