import { Module } from '@nestjs/common';
import { AnaliseIaService } from './analise-ia.service';
import { AnaliseIaController } from './analise-ia.controller';
import { AnthropicProvider } from './providers/anthropic.provider';

@Module({
  controllers: [AnaliseIaController],
  providers: [AnaliseIaService, AnthropicProvider],
  exports: [AnaliseIaService],
})
export class AnaliseIaModule {}
