import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Papel } from '@prisma/client';

@ApiTags('usuarios')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  @Roles(Papel.ADMIN, Papel.GERENTE)
  @ApiOperation({ summary: 'Listar todos os usuários da empresa' })
  findAll(@CurrentUser('empresaId') empresaId: string) {
    return this.usuariosService.findAll(empresaId);
  }

  @Get('perfil')
  @ApiOperation({ summary: 'Retorna perfil do usuário autenticado' })
  perfil(@CurrentUser() user: any) {
    return this.usuariosService.findOne(user.id);
  }

  @Get(':id')
  @Roles(Papel.ADMIN, Papel.GERENTE)
  @ApiOperation({ summary: 'Buscar usuário por ID' })
  findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar usuário' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.usuariosService.update(id, body);
  }

  @Patch(':id/toggle-ativo')
  @Roles(Papel.ADMIN)
  @ApiOperation({ summary: 'Ativar/desativar usuário' })
  toggleAtivo(@Param('id') id: string) {
    return this.usuariosService.toggleAtivo(id);
  }
}
