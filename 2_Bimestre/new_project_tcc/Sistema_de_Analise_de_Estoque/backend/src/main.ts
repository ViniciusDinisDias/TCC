import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:5173');

  app.use(helmet());

  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  app.setGlobalPrefix('api');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Sistema de Análise de Estoque com IA')
    .setDescription('API completa para gestão de estoque, produtos e análise inteligente')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .addTag('auth', 'Autenticação e autorização')
    .addTag('produtos', 'Gestão de produtos')
    .addTag('categorias', 'Categorias de produtos')
    .addTag('estoque', 'Controle de estoque')
    .addTag('movimentacoes', 'Movimentações de estoque')
    .addTag('locais', 'Locais de armazenamento')
    .addTag('analise-ia', 'Análise inteligente com IA')
    .addTag('dashboard', 'Métricas e KPIs')
    .addTag('usuarios', 'Gestão de usuários')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 Servidor rodando em: http://localhost:${port}`);
  logger.log(`📚 Swagger disponível em: http://localhost:${port}/api/docs`);
}

bootstrap();
