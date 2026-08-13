import { Module } from '@nestjs/common';
import { LocaisService } from './locais.service';
import { LocaisController } from './locais.controller';

@Module({
  controllers: [LocaisController],
  providers: [LocaisService],
  exports: [LocaisService],
})
export class LocaisModule {}
