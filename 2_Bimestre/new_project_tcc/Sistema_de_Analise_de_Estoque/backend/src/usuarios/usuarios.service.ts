import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Papel } from '@prisma/client';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async findAll(empresaId: string) {
    return this.prisma.usuario.findMany({
      where: { empresaId },
      select: {
        id: true,
        nome: true,
        email: true,
        papel: true,
        cargo: true,
        ativo: true,
        criadoEm: true,
      },
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        papel: true,
        cargo: true,
        ativo: true,
        empresaId: true,
        criadoEm: true,
        atualizadoEm: true,
        empresa: { select: { id: true, nome: true } },
      },
    });
    if (!usuario) throw new NotFoundException('Usuário não encontrado');
    return usuario;
  }

  async update(id: string, data: { nome?: string; cargo?: string; papel?: Papel; senha?: string }) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuário não encontrado');

    const updateData: any = {};
    if (data.nome) updateData.nome = data.nome;
    if (data.cargo !== undefined) updateData.cargo = data.cargo;
    if (data.papel) updateData.papel = data.papel;
    if (data.senha) updateData.senhaHash = await bcrypt.hash(data.senha, 10);

    return this.prisma.usuario.update({
      where: { id },
      data: updateData,
      select: { id: true, nome: true, email: true, papel: true, cargo: true, ativo: true },
    });
  }

  async toggleAtivo(id: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuário não encontrado');

    return this.prisma.usuario.update({
      where: { id },
      data: { ativo: !usuario.ativo },
      select: { id: true, nome: true, ativo: true },
    });
  }
}
