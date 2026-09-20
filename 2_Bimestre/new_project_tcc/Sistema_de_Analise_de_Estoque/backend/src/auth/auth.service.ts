import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
      include: { empresa: { select: { id: true, nome: true } } },
    });

    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    const senhaValida = await bcrypt.compare(dto.senha, usuario.senhaHash);
    if (!senhaValida) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    const tokens = await this.gerarTokens(usuario);

    return {
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papel: usuario.papel,
        cargo: usuario.cargo,
        empresa: usuario.empresa,
      },
      ...tokens,
    };
  }

  async register(dto: RegisterDto) {
    const jaExiste = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    if (jaExiste) throw new ConflictException('E-mail já cadastrado');

    const empresa = await this.prisma.empresa.findUnique({
      where: { id: dto.empresaId },
    });
    if (!empresa) throw new NotFoundException('Empresa não encontrada');

    const senhaHash = await bcrypt.hash(dto.senha, 10);

    const usuario = await this.prisma.usuario.create({
      data: {
        empresaId: dto.empresaId,
        nome: dto.nome,
        email: dto.email,
        senhaHash,
        cargo: dto.cargo,
        papel: dto.papel,
      },
      include: { empresa: { select: { id: true, nome: true } } },
    });

    const tokens = await this.gerarTokens(usuario);

    return {
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papel: usuario.papel,
        cargo: usuario.cargo,
        empresa: usuario.empresa,
      },
      ...tokens,
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
      include: { usuario: { include: { empresa: { select: { id: true, nome: true } } } } },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    await this.prisma.refreshToken.delete({ where: { id: tokenRecord.id } });

    const tokens = await this.gerarTokens(tokenRecord.usuario);

    return {
      usuario: {
        id: tokenRecord.usuario.id,
        nome: tokenRecord.usuario.nome,
        email: tokenRecord.usuario.email,
        papel: tokenRecord.usuario.papel,
        cargo: tokenRecord.usuario.cargo,
        empresa: tokenRecord.usuario.empresa,
      },
      ...tokens,
    };
  }

  async logout(usuarioId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { usuarioId } });
    return { message: 'Logout realizado com sucesso' };
  }

  private async gerarTokens(usuario: any) {
    const payload = {
      sub: usuario.id,
      email: usuario.email,
      papel: usuario.papel,
      empresaId: usuario.empresaId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRATION', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('REFRESH_TOKEN_SECRET'),
        expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRATION', '7d'),
      }),
    ]);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        usuarioId: usuario.id,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }
}
