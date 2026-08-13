import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnthropicProvider } from './providers/anthropic.provider';
import { TipoMovimentacao } from '@prisma/client';

@Injectable()
export class AnaliseIaService {
  private readonly logger = new Logger(AnaliseIaService.name);

  constructor(
    private prisma: PrismaService,
    private anthropic: AnthropicProvider,
  ) {}

  async gerarAnalise(periodo: string = 'ultimo-mes', usuarioId?: string) {
    this.logger.log(`Gerando análise para período: ${periodo}`);

    const contexto = await this.coletarContexto(periodo);
    const resultado = await this.anthropic.analisarEstoque(contexto);

    const analise = await this.prisma.analiseIA.create({
      data: {
        periodo,
        totalProdutos: contexto.totalProdutos,
        insights: resultado.insights,
        previsoes: resultado.previsoes,
        recomendacoes: resultado.recomendacoes,
        dadosProcessados: contexto as any,
        criadoPor: usuarioId,
      },
    });

    return {
      id: analise.id,
      periodo,
      criadoEm: analise.criadoEm,
      contexto: {
        totalProdutos: contexto.totalProdutos,
        totalEmEstoque: contexto.totalEmEstoque,
        produtosBaixoEstoque: contexto.produtosBaixoEstoque.length,
        estoqueValorTotal: contexto.estoqueValorTotal,
      },
      insights: resultado.insights,
      previsoes: resultado.previsoes,
      recomendacoes: resultado.recomendacoes,
    };
  }

  async getHistorico(page = 1, limit = 10) {
    const [analises, total] = await Promise.all([
      this.prisma.analiseIA.findMany({
        orderBy: { criadoEm: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          periodo: true,
          totalProdutos: true,
          criadoEm: true,
          criadoPor: true,
        },
      }),
      this.prisma.analiseIA.count(),
    ]);
    return { analises, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getAnaliseById(id: string) {
    return this.prisma.analiseIA.findUnique({ where: { id } });
  }

  async getUltimaAnalise() {
    const analise = await this.prisma.analiseIA.findFirst({
      orderBy: { criadoEm: 'desc' },
    });

    if (!analise) {
      return this.gerarAnalise('ultimo-mes');
    }

    return analise;
  }

  private async coletarContexto(periodo: string) {
    const diasPeriodo = this.getDiasPeriodo(periodo);
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - diasPeriodo);

    const [produtos, movimentacoes, estoques, locais] = await Promise.all([
      this.prisma.produto.findMany({
        where: { ativo: true },
        include: {
          categoria: true,
          estoques: true,
        },
      }),
      this.prisma.movimentacaoEstoque.findMany({
        where: { dataMovimentacao: { gte: dataInicio } },
        include: {
          produto: { select: { nome: true, sku: true, precoVenda: true, precoCusto: true } },
          localOrigem: { select: { nome: true, tipo: true } },
          localDestino: { select: { nome: true, tipo: true } },
        },
        orderBy: { dataMovimentacao: 'desc' },
        take: 100,
      }),
      this.prisma.estoque.findMany({
        include: {
          localEstoque: true,
          produto: { select: { precoVenda: true, precoCusto: true } },
        },
      }),
      this.prisma.localEstoque.findMany({ where: { ativo: true } }),
    ]);

    const produtosBaixoEstoque = produtos
      .map((p) => {
        const totalEstoque = p.estoques.reduce((acc, e) => acc + e.quantidadeDisponivel, 0);
        return {
          nome: p.nome,
          sku: p.sku,
          totalEstoque,
          estoqueMinimo: p.estoqueMinimo,
          categoria: p.categoria?.nome ?? 'Sem categoria',
        };
      })
      .filter((p) => p.totalEstoque <= p.estoqueMinimo);

    const vendasPorCanal = locais.map((l) => {
      const saidasLocal = movimentacoes
        .filter(
          (m) =>
            m.tipo === TipoMovimentacao.SAIDA &&
            m.localOrigem?.nome === l.nome,
        )
        .reduce((acc, m) => acc + m.quantidade, 0);
      return { canal: l.nome, quantidade: saidasLocal };
    });

    const topProdutosMovimentacao = produtos
      .map((p) => {
        const saidas = movimentacoes
          .filter((m) => m.tipo === TipoMovimentacao.SAIDA && m.produtoId === p.id)
          .reduce((acc, m) => acc + m.quantidade, 0);
        const precoVenda = Number(p.precoVenda);
        const precoCusto = Number(p.precoCusto);
        const margem = precoVenda > 0 ? ((precoVenda - precoCusto) / precoVenda) * 100 : 0;
        return { produto: p.nome, totalSaidas: saidas, margem };
      })
      .filter((p) => p.totalSaidas > 0)
      .sort((a, b) => b.totalSaidas - a.totalSaidas);

    const totalEmEstoque = estoques.reduce((acc, e) => acc + e.quantidadeDisponivel, 0);
    const estoqueValorTotal = estoques.reduce(
      (acc, e) => acc + e.quantidadeDisponivel * Number(e.produto.precoVenda),
      0,
    );

    return {
      totalProdutos: produtos.length,
      totalEmEstoque,
      estoqueValorTotal,
      produtosBaixoEstoque,
      vendasPorCanal,
      topProdutosMovimentacao,
      movimentacoesRecentes: movimentacoes.slice(0, 20).map((m) => ({
        tipo: m.tipo,
        produto: m.produto.nome,
        quantidade: m.quantidade,
        canal: m.localOrigem?.nome ?? m.localDestino?.nome ?? 'N/A',
        data: m.dataMovimentacao.toLocaleDateString('pt-BR'),
      })),
      periodo,
    };
  }

  private getDiasPeriodo(periodo: string): number {
    switch (periodo) {
      case 'ultima-semana': return 7;
      case 'ultimo-mes': return 30;
      case 'ultimo-trimestre': return 90;
      case 'ultimo-ano': return 365;
      default: return 30;
    }
  }
}
