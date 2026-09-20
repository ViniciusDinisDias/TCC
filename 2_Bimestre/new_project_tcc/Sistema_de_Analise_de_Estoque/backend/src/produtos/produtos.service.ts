import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProdutoDto } from './dto/create-produto.dto';

@Injectable()
export class ProdutosService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: { busca?: string; categoriaId?: string; ativo?: boolean }) {
    const { busca, categoriaId, ativo = true } = params;
    return this.prisma.produto.findMany({
      where: {
        ativo,
        ...(categoriaId && { categoriaId }),
        ...(busca && {
          OR: [
            { nome: { contains: busca, mode: 'insensitive' } },
            { sku: { contains: busca, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        categoria: { select: { id: true, nome: true } },
        estoques: {
          include: {
            localEstoque: { select: { id: true, nome: true, tipo: true } },
          },
        },
      },
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(id: string) {
    const produto = await this.prisma.produto.findUnique({
      where: { id },
      include: {
        categoria: true,
        estoques: {
          include: {
            localEstoque: true,
          },
        },
        movimentacoes: {
          take: 10,
          orderBy: { dataMovimentacao: 'desc' },
          include: {
            localOrigem: { select: { nome: true } },
            localDestino: { select: { nome: true } },
            responsavel: { select: { nome: true } },
          },
        },
      },
    });
    if (!produto) throw new NotFoundException('Produto não encontrado');
    return produto;
  }

  async findBySku(sku: string) {
    return this.prisma.produto.findUnique({ where: { sku } });
  }

  async create(dto: CreateProdutoDto) {
    const existe = await this.prisma.produto.findUnique({ where: { sku: dto.sku } });
    if (existe) throw new ConflictException(`SKU '${dto.sku}' já cadastrado`);

    const categoria = await this.prisma.categoriaProduto.findUnique({
      where: { id: dto.categoriaId },
    });
    if (!categoria) throw new NotFoundException('Categoria não encontrada');

    return this.prisma.produto.create({
      data: {
        sku: dto.sku,
        nome: dto.nome,
        descricao: dto.descricao,
        categoriaId: dto.categoriaId,
        unidadeMedida: dto.unidadeMedida ?? 'UN',
        tipoProduto: dto.tipoProduto,
        precoVenda: dto.precoVenda,
        precoCusto: dto.precoCusto,
        estoqueMinimo: dto.estoqueMinimo ?? 0,
        estoqueMaximo: dto.estoqueMaximo,
      },
      include: { categoria: true },
    });
  }

  async update(id: string, dto: Partial<CreateProdutoDto>) {
    await this.findOne(id);

    if (dto.sku) {
      const existe = await this.prisma.produto.findFirst({
        where: { sku: dto.sku, NOT: { id } },
      });
      if (existe) throw new ConflictException(`SKU '${dto.sku}' já cadastrado`);
    }

    return this.prisma.produto.update({
      where: { id },
      data: {
        ...(dto.sku && { sku: dto.sku }),
        ...(dto.nome && { nome: dto.nome }),
        ...(dto.descricao !== undefined && { descricao: dto.descricao }),
        ...(dto.categoriaId && { categoriaId: dto.categoriaId }),
        ...(dto.precoVenda !== undefined && { precoVenda: dto.precoVenda }),
        ...(dto.precoCusto !== undefined && { precoCusto: dto.precoCusto }),
        ...(dto.estoqueMinimo !== undefined && { estoqueMinimo: dto.estoqueMinimo }),
        ...(dto.estoqueMaximo !== undefined && { estoqueMaximo: dto.estoqueMaximo }),
      },
      include: { categoria: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.produto.update({ where: { id }, data: { ativo: false } });
  }

  async getEstoqueTotal(id: string) {
    const estoques = await this.prisma.estoque.findMany({
      where: { produtoId: id },
      include: { localEstoque: true },
    });
    const total = estoques.reduce((acc, e) => acc + e.quantidadeDisponivel, 0);
    return { estoques, total };
  }

  async getProdutosBaixoEstoque() {
    const produtos = await this.prisma.produto.findMany({
      where: { ativo: true },
      include: {
        estoques: true,
        categoria: { select: { nome: true } },
      },
    });

    return produtos
      .map((p) => {
        const totalEstoque = p.estoques.reduce((acc, e) => acc + e.quantidadeDisponivel, 0);
        return { ...p, totalEstoque };
      })
      .filter((p) => p.totalEstoque <= p.estoqueMinimo)
      .sort((a, b) => a.totalEstoque - b.totalEstoque);
  }
}
