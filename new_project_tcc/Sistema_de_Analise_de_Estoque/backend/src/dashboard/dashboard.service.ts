import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TipoMovimentacao } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getKpis() {
    const dataInicio30d = new Date();
    dataInicio30d.setDate(dataInicio30d.getDate() - 30);
    const dataInicio60d = new Date();
    dataInicio60d.setDate(dataInicio60d.getDate() - 60);

    const [
      totalProdutos,
      totalEmEstoque,
      produtosBaixoEstoque,
      movimentacoesMes,
      movimentacoesMesAnterior,
      entradasMes,
      saidasMes,
    ] = await Promise.all([
      this.prisma.produto.count({ where: { ativo: true } }),

      this.prisma.estoque.aggregate({ _sum: { quantidadeDisponivel: true } }),

      this.prisma.produto.findMany({
        where: { ativo: true },
        include: { estoques: { select: { quantidadeDisponivel: true } } },
      }).then((prods) =>
        prods.filter((p) => {
          const total = p.estoques.reduce((a, e) => a + e.quantidadeDisponivel, 0);
          return total <= p.estoqueMinimo;
        }).length
      ),

      this.prisma.movimentacaoEstoque.count({
        where: { dataMovimentacao: { gte: dataInicio30d } },
      }),

      this.prisma.movimentacaoEstoque.count({
        where: { dataMovimentacao: { gte: dataInicio60d, lt: dataInicio30d } },
      }),

      this.prisma.movimentacaoEstoque.aggregate({
        where: { tipo: TipoMovimentacao.ENTRADA, dataMovimentacao: { gte: dataInicio30d } },
        _sum: { quantidade: true },
      }),

      this.prisma.movimentacaoEstoque.aggregate({
        where: { tipo: TipoMovimentacao.SAIDA, dataMovimentacao: { gte: dataInicio30d } },
        _sum: { quantidade: true },
      }),
    ]);

    const variacaoMovimentacoes =
      movimentacoesMesAnterior > 0
        ? (((movimentacoesMes - movimentacoesMesAnterior) / movimentacoesMesAnterior) * 100).toFixed(1)
        : '0';

    return {
      totalProdutos,
      totalEmEstoque: totalEmEstoque._sum.quantidadeDisponivel ?? 0,
      produtosBaixoEstoque,
      movimentacoesMes,
      variacaoMovimentacoes: `${Number(variacaoMovimentacoes) >= 0 ? '+' : ''}${variacaoMovimentacoes}%`,
      entradasMes: entradasMes._sum.quantidade ?? 0,
      saidasMes: saidasMes._sum.quantidade ?? 0,
    };
  }

  async getEstoquePorCanal() {
    const locais = await this.prisma.localEstoque.findMany({
      where: { ativo: true },
      include: {
        estoques: { select: { quantidadeDisponivel: true } },
      },
    });

    return locais.map((l) => ({
      canal: l.nome,
      tipo: l.tipo,
      total: l.estoques.reduce((acc, e) => acc + e.quantidadeDisponivel, 0),
    }));
  }

  async getEstoquePorCategoria() {
    const categorias = await this.prisma.categoriaProduto.findMany({
      where: { ativo: true },
      include: {
        produtos: {
          where: { ativo: true },
          include: { estoques: { select: { quantidadeDisponivel: true } } },
        },
      },
    });

    return categorias.map((c) => ({
      categoria: c.nome,
      total: c.produtos.reduce(
        (acc, p) => acc + p.estoques.reduce((a, e) => a + e.quantidadeDisponivel, 0),
        0,
      ),
    }));
  }

  async getMovimentacoesMensais(meses: number = 6) {
    const dados: Array<{ mes: string; entradas: number; saidas: number }> = [];

    for (let i = meses - 1; i >= 0; i--) {
      const inicio = new Date();
      inicio.setMonth(inicio.getMonth() - i);
      inicio.setDate(1);
      inicio.setHours(0, 0, 0, 0);

      const fim = new Date(inicio);
      fim.setMonth(fim.getMonth() + 1);
      fim.setDate(0);
      fim.setHours(23, 59, 59, 999);

      const [entradas, saidas] = await Promise.all([
        this.prisma.movimentacaoEstoque.aggregate({
          where: {
            tipo: TipoMovimentacao.ENTRADA,
            dataMovimentacao: { gte: inicio, lte: fim },
          },
          _sum: { quantidade: true },
        }),
        this.prisma.movimentacaoEstoque.aggregate({
          where: {
            tipo: TipoMovimentacao.SAIDA,
            dataMovimentacao: { gte: inicio, lte: fim },
          },
          _sum: { quantidade: true },
        }),
      ]);

      dados.push({
        mes: inicio.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        entradas: entradas._sum.quantidade ?? 0,
        saidas: saidas._sum.quantidade ?? 0,
      });
    }

    return dados;
  }

  async getUltimasMovimentacoes(limite: number = 10) {
    return this.prisma.movimentacaoEstoque.findMany({
      take: limite,
      orderBy: { dataMovimentacao: 'desc' },
      include: {
        produto: { select: { nome: true, sku: true } },
        localOrigem: { select: { nome: true } },
        localDestino: { select: { nome: true } },
        responsavel: { select: { nome: true } },
      },
    });
  }

  async getProdutosBaixoEstoque() {
    const produtos = await this.prisma.produto.findMany({
      where: { ativo: true },
      include: {
        categoria: { select: { nome: true } },
        estoques: { select: { quantidadeDisponivel: true } },
      },
    });

    return produtos
      .map((p) => ({
        id: p.id,
        sku: p.sku,
        nome: p.nome,
        categoria: p.categoria?.nome,
        totalEstoque: p.estoques.reduce((a, e) => a + e.quantidadeDisponivel, 0),
        estoqueMinimo: p.estoqueMinimo,
      }))
      .filter((p) => p.totalEstoque <= p.estoqueMinimo)
      .sort((a, b) => a.totalEstoque - b.totalEstoque)
      .slice(0, 5);
  }

  async getDados() {
    const [kpis, estoquePorCanal, estoquePorCategoria, movimentacoesMensais, ultimasMovimentacoes, produtosBaixoEstoque] =
      await Promise.all([
        this.getKpis(),
        this.getEstoquePorCanal(),
        this.getEstoquePorCategoria(),
        this.getMovimentacoesMensais(),
        this.getUltimasMovimentacoes(),
        this.getProdutosBaixoEstoque(),
      ]);

    return {
      kpis,
      estoquePorCanal,
      estoquePorCategoria,
      movimentacoesMensais,
      ultimasMovimentacoes,
      produtosBaixoEstoque,
    };
  }
}
