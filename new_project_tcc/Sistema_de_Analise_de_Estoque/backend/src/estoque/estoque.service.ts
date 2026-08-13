import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EstoqueService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: { produtoId?: string; localId?: string }) {
    const { produtoId, localId } = params;
    return this.prisma.estoque.findMany({
      where: {
        ...(produtoId && { produtoId }),
        ...(localId && { localEstoqueId: localId }),
      },
      include: {
        produto: {
          include: { categoria: { select: { id: true, nome: true } } },
        },
        localEstoque: true,
      },
      orderBy: { produto: { nome: 'asc' } },
    });
  }

  async findOne(produtoId: string, localId: string) {
    const estoque = await this.prisma.estoque.findUnique({
      where: { produtoId_localEstoqueId: { produtoId, localEstoqueId: localId } },
      include: { produto: true, localEstoque: true },
    });
    if (!estoque) throw new NotFoundException('Registro de estoque não encontrado');
    return estoque;
  }

  async getVisaoGeral() {
    const [estoques, totalProdutos, baixoEstoque] = await Promise.all([
      this.prisma.estoque.findMany({
        include: {
          produto: { include: { categoria: true } },
          localEstoque: true,
        },
      }),
      this.prisma.produto.count({ where: { ativo: true } }),
      this.prisma.produto.findMany({
        where: { ativo: true },
        include: { estoques: true },
      }),
    ]);

    const totalPorLocal = estoques.reduce(
      (acc, e) => {
        const key = e.localEstoque.nome;
        acc[key] = (acc[key] || 0) + e.quantidadeDisponivel;
        return acc;
      },
      {} as Record<string, number>,
    );

    const totalPorCategoria = estoques.reduce(
      (acc, e) => {
        const key = e.produto.categoria?.nome ?? 'Sem categoria';
        acc[key] = (acc[key] || 0) + e.quantidadeDisponivel;
        return acc;
      },
      {} as Record<string, number>,
    );

    const produtosBaixoEstoque = baixoEstoque.filter((p) => {
      const total = p.estoques.reduce((acc, e) => acc + e.quantidadeDisponivel, 0);
      return total <= p.estoqueMinimo;
    }).length;

    const totalGeral = estoques.reduce((acc, e) => acc + e.quantidadeDisponivel, 0);

    return {
      totalGeral,
      totalProdutos,
      produtosBaixoEstoque,
      totalPorLocal,
      totalPorCategoria,
    };
  }

  async getHistoricoEstoque(produtoId: string, dias: number = 30) {
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - dias);

    const movimentacoes = await this.prisma.movimentacaoEstoque.findMany({
      where: {
        produtoId,
        dataMovimentacao: { gte: dataInicio },
      },
      include: {
        localOrigem: { select: { nome: true } },
        localDestino: { select: { nome: true } },
      },
      orderBy: { dataMovimentacao: 'asc' },
    });

    return movimentacoes;
  }

  async ajustarEstoque(produtoId: string, localId: string, novaQuantidade: number) {
    await this.prisma.estoque.upsert({
      where: {
        produtoId_localEstoqueId: { produtoId, localEstoqueId: localId },
      },
      update: { quantidadeDisponivel: novaQuantidade },
      create: { produtoId, localEstoqueId: localId, quantidadeDisponivel: novaQuantidade },
    });
    return this.findOne(produtoId, localId);
  }
}
