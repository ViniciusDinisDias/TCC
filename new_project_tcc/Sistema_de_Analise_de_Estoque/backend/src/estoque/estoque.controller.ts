import { Controller, Get, Param, Query, Body, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EstoqueService } from './estoque.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('estoque')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('estoque')
export class EstoqueController {
  constructor(private readonly estoqueService: EstoqueService) {}

  @Get()
  @ApiOperation({ summary: 'Listar registros de estoque' })
  findAll(
    @Query('produtoId') produtoId?: string,
    @Query('localId') localId?: string,
  ) {
    return this.estoqueService.findAll({ produtoId, localId });
  }

  @Get('visao-geral')
  @ApiOperation({ summary: 'Visão geral do estoque (totais por local e categoria)' })
  getVisaoGeral() {
    return this.estoqueService.getVisaoGeral();
  }

  @Get(':produtoId/historico')
  @ApiOperation({ summary: 'Histórico de movimentações de um produto' })
  getHistorico(
    @Param('produtoId') produtoId: string,
    @Query('dias') dias?: number,
  ) {
    return this.estoqueService.getHistoricoEstoque(produtoId, Number(dias) || 30);
  }

  @Patch(':produtoId/:localId/ajustar')
  @ApiOperation({ summary: 'Ajustar quantidade de estoque manualmente' })
  ajustar(
    @Param('produtoId') produtoId: string,
    @Param('localId') localId: string,
    @Body('quantidade') quantidade: number,
  ) {
    return this.estoqueService.ajustarEstoque(produtoId, localId, quantidade);
  }
}
