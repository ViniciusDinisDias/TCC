import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AnaliseIaService } from './analise-ia.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('analise-ia')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('analise-ia')
export class AnaliseIaController {
  constructor(private readonly analiseIaService: AnaliseIaService) {}

  @Post('gerar')
  @ApiOperation({ summary: 'Gerar nova análise de estoque com IA' })
  @ApiQuery({ name: 'periodo', required: false, enum: ['ultima-semana', 'ultimo-mes', 'ultimo-trimestre', 'ultimo-ano'] })
  gerarAnalise(
    @Query('periodo') periodo: string,
    @CurrentUser('id') usuarioId: string,
  ) {
    return this.analiseIaService.gerarAnalise(periodo || 'ultimo-mes', usuarioId);
  }

  @Get('ultima')
  @ApiOperation({ summary: 'Retorna a última análise gerada (ou gera uma nova)' })
  getUltima() {
    return this.analiseIaService.getUltimaAnalise();
  }

  @Get('historico')
  @ApiOperation({ summary: 'Histórico de análises geradas' })
  getHistorico(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.analiseIaService.getHistorico(Number(page), Number(limit));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar análise por ID' })
  getById(@Param('id') id: string) {
    return this.analiseIaService.getAnaliseById(id);
  }
}
