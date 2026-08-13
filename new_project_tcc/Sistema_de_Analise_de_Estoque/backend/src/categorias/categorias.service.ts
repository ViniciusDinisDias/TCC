import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoriaDto, UpdateCategoriaDto } from './dto/create-categoria.dto';

@Injectable()
export class CategoriasService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.categoriaProduto.findMany({
      where: { ativo: true },
      include: { _count: { select: { produtos: true } } },
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(id: string) {
    const cat = await this.prisma.categoriaProduto.findUnique({
      where: { id },
      include: {
        produtos: {
          where: { ativo: true },
          select: { id: true, sku: true, nome: true, precoVenda: true },
        },
      },
    });
    if (!cat) throw new NotFoundException('Categoria não encontrada');
    return cat;
  }

  async create(dto: CreateCategoriaDto) {
    const exists = await this.prisma.categoriaProduto.findUnique({ where: { nome: dto.nome } });
    if (exists) throw new ConflictException('Categoria já existe');
    return this.prisma.categoriaProduto.create({ data: dto });
  }

  async update(id: string, dto: UpdateCategoriaDto) {
    await this.findOne(id);
    return this.prisma.categoriaProduto.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.categoriaProduto.update({
      where: { id },
      data: { ativo: false },
    });
  }
}
