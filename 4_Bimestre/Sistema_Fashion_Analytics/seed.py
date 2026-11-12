"""Popula o banco de dados com produtos e pedidos de exemplo para demonstração."""
import os
import random
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app import auth, models
from app.database import Base, SessionLocal, engine

random.seed(42)

PRODUTOS_SEED = [
    # Estoque inicial recalibrado para absorver ~6 meses de pedidos (ver
    # popular_pedidos) sem que a maioria zere — só CAL-002 fica propositalmente
    # crítica desde o início, e SAI-001 é consumido de propósito (ver abaixo).
    {"sku": "BLU-001", "nome": "Blusa Cropped Básica", "categoria": "Blusa", "tamanho": "P", "cor": "Preto", "preco": 49.90, "quantidade_estoque": 90, "estoque_minimo": 5},
    {"sku": "BLU-002", "nome": "Blusa Ciganinha", "categoria": "Blusa", "tamanho": "M", "cor": "Branco", "preco": 59.90, "quantidade_estoque": 75, "estoque_minimo": 5},
    {"sku": "VES-001", "nome": "Vestido Midi Floral", "categoria": "Vestido", "tamanho": "M", "cor": "Rosa", "preco": 129.90, "quantidade_estoque": 60, "estoque_minimo": 4},
    {"sku": "VES-002", "nome": "Vestido Longo Festa", "categoria": "Vestido", "tamanho": "G", "cor": "Vermelho", "preco": 189.90, "quantidade_estoque": 30, "estoque_minimo": 3},
    # Produto com queda brusca de vendas: ver dias_queda em popular_pedidos.
    {"sku": "SAI-001", "nome": "Saia Jeans", "categoria": "Saia", "tamanho": "M", "cor": "Azul", "preco": 79.90, "quantidade_estoque": 50, "estoque_minimo": 5},
    {"sku": "SAI-002", "nome": "Saia Plissada", "categoria": "Saia", "tamanho": "P", "cor": "Preto", "preco": 69.90, "quantidade_estoque": 70, "estoque_minimo": 5},
    {"sku": "CAL-001", "nome": "Calça Wide Leg", "categoria": "Calça", "tamanho": "M", "cor": "Branco", "preco": 99.90, "quantidade_estoque": 75, "estoque_minimo": 5},
    # Produto propositalmente crítico: estoque baixo desde o início.
    {"sku": "CAL-002", "nome": "Calça Alfaiataria", "categoria": "Calça", "tamanho": "G", "cor": "Preto", "preco": 109.90, "quantidade_estoque": 3, "estoque_minimo": 5},
    {"sku": "SHO-001", "nome": "Short Jeans", "categoria": "Short", "tamanho": "P", "cor": "Azul", "preco": 59.90, "quantidade_estoque": 80, "estoque_minimo": 5},
    {"sku": "SHO-002", "nome": "Short Alfaiataria", "categoria": "Short", "tamanho": "M", "cor": "Vermelho", "preco": 64.90, "quantidade_estoque": 65, "estoque_minimo": 5},
    {"sku": "BLU-003", "nome": "Blusa Manga Longa", "categoria": "Blusa", "tamanho": "G", "cor": "Rosa", "preco": 54.90, "quantidade_estoque": 70, "estoque_minimo": 5},
    {"sku": "VES-003", "nome": "Vestido Curto Casual", "categoria": "Vestido", "tamanho": "P", "cor": "Branco", "preco": 89.90, "quantidade_estoque": 65, "estoque_minimo": 5},
    {"sku": "SAI-003", "nome": "Saia Lápis", "categoria": "Saia", "tamanho": "M", "cor": "Vermelho", "preco": 74.90, "quantidade_estoque": 75, "estoque_minimo": 5},
    {"sku": "CAL-003", "nome": "Calça Legging", "categoria": "Calça", "tamanho": "P", "cor": "Preto", "preco": 44.90, "quantidade_estoque": 85, "estoque_minimo": 5},
    {"sku": "SHO-003", "nome": "Short Moletom", "categoria": "Short", "tamanho": "G", "cor": "Azul", "preco": 39.90, "quantidade_estoque": 80, "estoque_minimo": 5},
    # Produto propositalmente parado: estoque disponível, sem nenhuma venda recente
    {"sku": "VES-004", "nome": "Vestido Inverno Tricot", "categoria": "Vestido", "tamanho": "M", "cor": "Preto", "preco": 149.90, "quantidade_estoque": 12, "estoque_minimo": 3},
]

# Pool combinatório de nomes (20 x 20 = até 400 combinações) usado para gerar
# clientes variados sem repetir a mesma dupla nome+sobrenome sempre.
NOMES = [
    "Ana", "Beatriz", "Camila", "Daniela", "Elisa", "Fernanda", "Gabriela", "Helena",
    "Isabela", "Julia", "Larissa", "Mariana", "Natalia", "Patricia", "Rafaela",
    "Sofia", "Tatiane", "Vitoria", "Yasmin", "Bruna",
]
SOBRENOMES = [
    "Souza", "Lima", "Mendes", "Rocha", "Santos", "Alves", "Reis", "Costa",
    "Martins", "Ferreira", "Oliveira", "Pereira", "Carvalho", "Ribeiro", "Barbosa",
    "Cardoso", "Teixeira", "Nunes", "Correia", "Dias",
]

MAX_PEDIDOS_POR_CLIENTE = 2


def gerar_clientes(quantidade_pedidos: int) -> list:
    """Sorteia um nome de cliente para cada pedido, sem repetir a mesma pessoa
    mais de MAX_PEDIDOS_POR_CLIENTE vezes no total do seed."""
    combinacoes = [f"{nome} {sobrenome}" for nome in NOMES for sobrenome in SOBRENOMES]
    random.shuffle(combinacoes)
    clientes_necessarios = -(-quantidade_pedidos // MAX_PEDIDOS_POR_CLIENTE)  # ceil
    pool = combinacoes[:clientes_necessarios]
    clientes = (pool * MAX_PEDIDOS_POR_CLIENTE)[:quantidade_pedidos]
    random.shuffle(clientes)
    return clientes


def popular_produtos(db: Session) -> list:
    produtos = [models.Produto(**dados) for dados in PRODUTOS_SEED]
    db.add_all(produtos)
    db.commit()
    for produto in produtos:
        db.refresh(produto)
    return produtos


def _criar_pedido(db: Session, canal: str, cliente_nome: str, dias_atras: int, itens: list) -> models.Pedido:
    """itens: lista de tuplas (produto, quantidade)."""
    data_pedido = datetime.utcnow() - timedelta(days=dias_atras)
    pedido = models.Pedido(
        canal=canal, cliente_nome=cliente_nome, cliente_contato="11999990000",
        status="entregue", data_pedido=data_pedido, valor_total=0.0, criado_em=data_pedido,
    )
    db.add(pedido)
    db.flush()

    valor_total = 0.0
    for produto, quantidade in itens:
        subtotal = produto.preco * quantidade
        db.add(models.ItemPedido(
            pedido_id=pedido.id, produto_id=produto.id,
            quantidade=quantidade, preco_unitario=produto.preco, subtotal=subtotal,
        ))
        produto.quantidade_estoque = max(produto.quantidade_estoque - quantidade, 0)
        valor_total += subtotal

    pedido.valor_total = valor_total
    db.commit()
    return pedido


DIAS_JANELA_PEDIDOS = 180  # ~6 meses de histórico, terminando "hoje" (abril–setembro se rodado em setembro)
TOTAL_PEDIDOS_VARIADOS = 150

# Produto com queda brusca de vendas: vendeu bem há uns 3-4 meses e nada
# depois disso — fora da janela de "produtos parados" (30 dias) e visível
# como anomalia de queda no histórico completo.
DIAS_QUEDA_SAI_001 = [128, 122, 116, 110, 105, 101, 97, 94, 90, 86]


def popular_pedidos(db: Session, produtos: list) -> None:
    produtos_por_sku = {p.sku: p for p in produtos}
    produto_queda = produtos_por_sku["SAI-001"]
    produtos_ativos = [p for p in produtos if p.sku not in ("VES-004", "SAI-001")]

    total_pedidos = len(DIAS_QUEDA_SAI_001) + TOTAL_PEDIDOS_VARIADOS
    clientes = gerar_clientes(total_pedidos)
    clientes_queda = clientes[: len(DIAS_QUEDA_SAI_001)]
    clientes_variados = clientes[len(DIAS_QUEDA_SAI_001):]

    for dias, cliente in zip(DIAS_QUEDA_SAI_001, clientes_queda):
        canal = random.choice(["loja_fisica", "shopee"])
        _criar_pedido(db, canal, cliente, dias, [(produto_queda, random.randint(3, 6))])

    # Pedidos variados ao longo de ~6 meses, para os demais produtos (exceto o parado e o de queda)
    for cliente in clientes_variados:
        dias_atras = random.randint(0, DIAS_JANELA_PEDIDOS - 1)
        canal = random.choice(["loja_fisica", "shopee"])
        itens = [
            (produto, random.randint(1, 3))
            for produto in random.sample(produtos_ativos, k=random.randint(1, 2))
        ]
        _criar_pedido(db, canal, cliente, dias_atras, itens)


def popular_usuarios(db: Session) -> None:
    if db.query(models.Usuario).first():
        return
    senha_admin = os.environ.get("SEED_SENHA_ADMIN", "admin123")
    senha_assistente = os.environ.get("SEED_SENHA_ASSISTENTE", "assistente123")
    db.add(models.Usuario(login="admin", senha_hash=auth.gerar_hash_senha(senha_admin), papel=auth.PAPEL_ADMIN))
    db.add(models.Usuario(login="assistente", senha_hash=auth.gerar_hash_senha(senha_assistente), papel=auth.PAPEL_ASSISTENTE))
    db.commit()
    print("Usuários padrão criados: admin/assistente (troque as senhas em produção).")


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        popular_usuarios(db)
        if db.query(models.Produto).first():
            print("Banco já contém dados de produtos. Nenhuma alteração feita.")
            return
        produtos = popular_produtos(db)
        popular_pedidos(db, produtos)
        print(f"Seed concluído: {len(produtos)} produtos e {db.query(models.Pedido).count()} pedidos criados.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
