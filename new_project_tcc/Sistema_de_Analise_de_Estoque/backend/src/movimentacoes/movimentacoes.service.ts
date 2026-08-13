import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMovimentacaoDto } from './dto/create-movimentacao.dto';
import { TipoMovimentacao } from '@prisma/client';

@Injectable()
export class MovimentacoesService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    produtoId?: string;
    tipo?: TipoMovimentacao;
    localId?: string;
    dataInicio?: string;
    dataFim?: string;
    page?: number;
    limit?: number;
  }) {
    const { produtoId, tipo, localId, dataInicio, dataFim, page = 1, limit = 20 } = params;

    const where: any = {};
    if (produtoId) where.produtoId = produtoId;
    if (tipo) where.tipo = tipo;
    if (localId) where.OR = [{ localOrigemId: localId }, { localDestinoId: localId }];
    if (dataInicio || dataFim) {
      where.dataMovimentacao = {};
      if (dataInicio) where.dataMovimentacao.gte = new Date(dataInicio);
      if (dataFim) where.dataMovimentacao.lte = new Date(dataFim);
    }

    const [movimentacoes, total] = await Promise.all([
      this.prisma.movimentacaoEstoque.findMany({
        where,
        include: {
          produto: { select: { id: true, sku: true, nome: true } },
          localOrigem: { select: { id: true, nome: true, tipo: true } },
          localDestino: { select: { id: true, nome: true, tipo: true } },
          responsavel: { select: { id: true, nome: true } },
        },
        orderBy: { dataMovimentacao: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.movimentacaoEstoque.count({ where }),
    ]);

    return {
      movimentacoes,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const mov = await this.prisma.movimentacaoEstoque.findUnique({
      where: { id },
      include: {
        produto: { include: { categoria: true } },
        localOrigem: true,
        localDestino: true,
        responsavel: { select: { id: true, nome: true } },
      },
    });
    if (!mov) throw new NotFoundException('Movimentação não encontrada');
    return mov;
  }

  async create(dto: CreateMovimentacaoDto, responsavelId: string) {
    const produto = await this.prisma.produto.findUnique({ where: { id: dto.produtoId } });
    if (!produto) throw new NotFoundException('Produto não encontrado');

    if (dto.tipo === TipoMovimentacao.SAIDA && dto.localOrigemId) {
      const estoque = await this.prisma.estoque.findUnique({
        where: {
          produtoId_localEstoqueId: {
            produtoId: dto.produtoId,
            localEstoqueId: dto.localOrigemId,
          },
        },
      });

      if (!estoque || estoque.quantidadeDisponivel < dto.quantidade) {
        throw new BadRequestException(
          `Estoque insuficiente. Disponível: ${estoque?.quantidadeDisponivel ?? 0}, Solicitado: ${dto.quantidade}`,
        );
      }
    }

    const movimentacao = await this.prisma.$transaction(async (tx) => {
      const mov = await tx.movimentacaoEstoque.create({
        data: {
          tipo: dto.tipo,
          produtoId: dto.produtoId,
          localOrigemId: dto.localOrigemId,
          localDestinoId: dto.localDestinoId,
          quantidade: dto.quantidade,
          observacao: dto.observacao,
          responsavelId,
        },
        include: {
          produto: { select: { id: true, nome: true, sku: true } },
          localOrigem: { select: { id: true, nome: true } },
          localDestino: { select: { id: true, nome: true } },
        },
      });

      // Atualizar estoque origem (saída)
      if (
        (dto.tipo === TipoMovimentacao.SAIDA || dto.tipo === TipoMovimentacao.TRANSFERENCIA) &&
        dto.localOrigemId
      ) {
        await tx.estoque.updateMany({
          where: { produtoId: dto.produtoId, localEstoqueId: dto.localOrigemId },
          data: { quantidadeDisponivel: { decrement: dto.quantidade } },
        });
      }

      // Atualizar estoque destino (entrada)
      if (
        (dto.tipo === TipoMovimentacao.ENTRADA || dto.tipo === TipoMovimentacao.TRANSFERENCIA) &&
        dto.localDestinoId
      ) {
        await tx.estoque.upsert({
          where: {
            produtoId_localEstoqueId: {
              produtoId: dto.produtoId,
              localEstoqueId: dto.localDestinoId,
            },
          },
          update: { quantidadeDisponivel: { increment: dto.quantidade } },
          create: {
            produtoId: dto.produtoId,
            localEstoqueId: dto.localDestinoId,
            quantidadeDisponivel: dto.quantidade,
          },
        });
      }

      return mov;
    });

    return movimentacao;
  }

  async getResumoMovimentacoes(dias: number = 30) {
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - dias);

    const [entradas, saidas, porCanal] = await Promise.all([
      this.prisma.movimentacaoEstoque.aggregate({
        where: { tipo: TipoMovimentacao.ENTRADA, dataMovimentacao: { gte: dataInicio } },
        _sum: { quantidade: true },
        _count: true,
      }),
      this.prisma.movimentacaoEstoque.aggregate({
        where: { tipo: TipoMovimentacao.SAIDA, dataMovimentacao: { gte: dataInicio } },
        _sum: { quantidade: true },
        _count: true,
      }),
      this.prisma.movimentacaoEstoque.groupBy({
        by: ['localOrigemId'],
        where: { tipo: TipoMovimentacao.SAIDA, dataMovimentacao: { gte: dataInicio } },
        _sum: { quantidade: true },
      }),
    ]);

    return {
      entradas: {
        total: entradas._sum.quantidade ?? 0,
        count: entradas._count,
      },
      saidas: {
        total: saidas._sum.quantidade ?? 0,
        count: saidas._count,
      },
      porCanal,
    };
  }
}
