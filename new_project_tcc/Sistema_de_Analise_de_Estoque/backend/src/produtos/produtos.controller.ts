import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProdutosService } from './produtos.service';
import { CreateProdutoDto } from './dto/create-produto.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('produtos')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('produtos')
export class ProdutosController {
  constructor(private readonly produtosService: ProdutosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar produtos com filtros' })
  @ApiQuery({ name: 'busca', required: false })
  @ApiQuery({ name: 'categoriaId', required: false })
  findAll(
    @Query('busca') busca?: string,
    @Query('categoriaId') categoriaId?: string,
  ) {
    return this.produtosService.findAll({ busca, categoriaId });
  }

  @Get('baixo-estoque')
  @ApiOperation({ summary: 'Produtos com estoque abaixo do mínimo' })
  getProdutosBaixoEstoque() {
    return this.produtosService.getProdutosBaixoEstoque();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar produto por ID' })
  findOne(@Param('id') id: string) {
    return this.produtosService.findOne(id);
  }

  @Get(':id/estoque')
  @ApiOperation({ summary: 'Estoque total por canal de um produto' })
  getEstoque(@Param('id') id: string) {
    return this.produtosService.getEstoqueTotal(id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar novo produto' })
  create(@Body() dto: CreateProdutoDto) {
    return this.produtosService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar produto' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateProdutoDto>) {
    return this.produtosService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover produto (soft delete)' })
  remove(@Param('id') id: string) {
    return this.produtosService.remove(id);
  }
}
