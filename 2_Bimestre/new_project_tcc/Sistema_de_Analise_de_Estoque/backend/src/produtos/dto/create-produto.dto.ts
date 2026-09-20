import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { TipoProduto } from '@prisma/client';

export class CreateProdutoDto {
  @ApiProperty({ example: 'VE001' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 'Vestido Floral' })
  @IsString()
  @IsNotEmpty()
  nome: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiProperty({ example: 'uuid-da-categoria' })
  @IsUUID()
  categoriaId: string;

  @ApiPropertyOptional({ example: 'UN', default: 'UN' })
  @IsOptional()
  @IsString()
  unidadeMedida?: string;

  @ApiPropertyOptional({ enum: TipoProduto, default: TipoProduto.PRODUTO_ACABADO })
  @IsOptional()
  @IsEnum(TipoProduto)
  tipoProduto?: TipoProduto;

  @ApiProperty({ example: 89.9 })
  @IsNumber()
  @Min(0)
  precoVenda: number;

  @ApiProperty({ example: 35.0 })
  @IsNumber()
  @Min(0)
  precoCusto: number;

  @ApiPropertyOptional({ example: 10, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estoqueMinimo?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estoqueMaximo?: number;
}
