import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LocaisService, CreateLocalDto } from './locais.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('locais')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('locais')
export class LocaisController {
  constructor(private readonly locaisService: LocaisService) {}

  @Get()
  @ApiOperation({ summary: 'Listar locais de estoque' })
  findAll() {
    return this.locaisService.findAll();
  }

  @Get('resumo')
  @ApiOperation({ summary: 'Resumo de estoque por local' })
  getResumo() {
    return this.locaisService.getResumo();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar local de estoque por ID' })
  findOne(@Param('id') id: string) {
    return this.locaisService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar local de estoque' })
  create(@Body() dto: CreateLocalDto) {
    return this.locaisService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar local de estoque' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateLocalDto>) {
    return this.locaisService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover local de estoque (soft delete)' })
  remove(@Param('id') id: string) {
    return this.locaisService.remove(id);
  }
}
