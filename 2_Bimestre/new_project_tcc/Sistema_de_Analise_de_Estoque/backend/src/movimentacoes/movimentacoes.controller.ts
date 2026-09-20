import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MovimentacoesService } from './movimentacoes.service';
import { CreateMovimentacaoDto } from './dto/create-movimentacao.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TipoMovimentacao } from '@prisma/client';

@ApiTags('movimentacoes')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('movimentacoes')
export class MovimentacoesController {
  constructor(private readonly movimentacoesService: MovimentacoesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar movimentações com filtros e paginação' })
  findAll(
    @Query('produtoId') produtoId?: string,
    @Query('tipo') tipo?: TipoMovimentacao,
    @Query('localId') localId?: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.movimentacoesService.findAll({
      produtoId,
      tipo,
      localId,
      dataInicio,
      dataFim,
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Get('resumo')
  @ApiOperation({ summary: 'Resumo de movimentações dos últimos N dias' })
  @ApiQuery({ name: 'dias', required: false, example: 30 })
  getResumo(@Query('dias') dias?: number) {
    return this.movimentacoesService.getResumoMovimentacoes(Number(dias) || 30);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar movimentação por ID' })
  findOne(@Param('id') id: string) {
    return this.movimentacoesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar nova movimentação de estoque' })
  create(
    @Body() dto: CreateMovimentacaoDto,
    @CurrentUser('id') responsavelId: string,
  ) {
    return this.movimentacoesService.create(dto, responsavelId);
  }
}
