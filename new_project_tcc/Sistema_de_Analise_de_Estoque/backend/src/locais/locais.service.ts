import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Canal } from '@prisma/client';

export class CreateLocalDto {
  nome: string;
  tipo: Canal;
  endereco?: string;
  empresaId?: string;
}

@Injectable()
export class LocaisService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.localEstoque.findMany({
      where: { ativo: true },
      include: {
        _count: { select: { estoques: true } },
        estoques: {
          include: { produto: { select: { id: true, nome: true } } },
        },
      },
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(id: string) {
    const local = await this.prisma.localEstoque.findUnique({
      where: { id },
      include: {
        estoques: {
          include: {
            produto: { include: { categoria: { select: { nome: true } } } },
          },
          orderBy: { produto: { nome: 'asc' } },
        },
      },
    });
    if (!local) throw new NotFoundException('Local de estoque não encontrado');
    return local;
  }

  async create(dto: CreateLocalDto) {
    return this.prisma.localEstoque.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateLocalDto>) {
    await this.findOne(id);
    return this.prisma.localEstoque.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.localEstoque.update({ where: { id }, data: { ativo: false } });
  }

  async getResumo() {
    const locais = await this.prisma.localEstoque.findMany({
      where: { ativo: true },
      include: {
        estoques: { select: { quantidadeDisponivel: true } },
      },
    });

    return locais.map((l) => ({
      id: l.id,
      nome: l.nome,
      tipo: l.tipo,
      totalItens: l.estoques.reduce((acc, e) => acc + e.quantidadeDisponivel, 0),
    }));
  }
}
