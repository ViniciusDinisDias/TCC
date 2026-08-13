import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { TipoMovimentacao } from '@prisma/client';

export class CreateMovimentacaoDto {
  @ApiProperty({ enum: TipoMovimentacao })
  @IsEnum(TipoMovimentacao)
  tipo: TipoMovimentacao;

  @ApiProperty({ example: 'uuid-do-produto' })
  @IsUUID()
  produtoId: string;

  @ApiPropertyOptional({ example: 'uuid-do-local-origem' })
  @IsOptional()
  @IsUUID()
  localOrigemId?: string;

  @ApiPropertyOptional({ example: 'uuid-do-local-destino' })
  @IsOptional()
  @IsUUID()
  localDestinoId?: string;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  quantidade: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacao?: string;
}
