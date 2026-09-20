import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { Papel } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'uuid-da-empresa' })
  @IsUUID()
  empresaId: string;

  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @IsNotEmpty()
  nome: string;

  @ApiProperty({ example: 'joao@confeccao.com.br' })
  @IsEmail({}, { message: 'E-mail inválido' })
  email: string;

  @ApiProperty({ example: 'Senha@123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  senha: string;

  @ApiPropertyOptional({ example: 'Gerente de Estoque' })
  @IsOptional()
  @IsString()
  cargo?: string;

  @ApiPropertyOptional({ enum: Papel, default: Papel.OPERADOR })
  @IsOptional()
  @IsEnum(Papel)
  papel?: Papel;
}
