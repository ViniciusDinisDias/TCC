import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('dashboard')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Retorna todos os dados do dashboard em uma única chamada' })
  getDados() {
    return this.dashboardService.getDados();
  }

  @Get('kpis')
  @ApiOperation({ summary: 'KPIs principais' })
  getKpis() {
    return this.dashboardService.getKpis();
  }

  @Get('estoque-por-canal')
  @ApiOperation({ summary: 'Distribuição de estoque por canal' })
  getEstoquePorCanal() {
    return this.dashboardService.getEstoquePorCanal();
  }

  @Get('estoque-por-categoria')
  @ApiOperation({ summary: 'Distribuição de estoque por categoria' })
  getEstoquePorCategoria() {
    return this.dashboardService.getEstoquePorCategoria();
  }

  @Get('movimentacoes-mensais')
  @ApiOperation({ summary: 'Movimentações mensais (entradas x saídas)' })
  getMovimentacoesMensais(@Query('meses') meses?: number) {
    return this.dashboardService.getMovimentacoesMensais(Number(meses) || 6);
  }

  @Get('ultimas-movimentacoes')
  @ApiOperation({ summary: 'Últimas movimentações de estoque' })
  getUltimasMovimentacoes(@Query('limite') limite?: number) {
    return this.dashboardService.getUltimasMovimentacoes(Number(limite) || 10);
  }

  @Get('produtos-baixo-estoque')
  @ApiOperation({ summary: 'Produtos com estoque abaixo do mínimo' })
  getProdutosBaixoEstoque() {
    return this.dashboardService.getProdutosBaixoEstoque();
  }
}
