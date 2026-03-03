import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { EnvService } from './core/env/env.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const envService = app.get(EnvService);
  app.enableCors({
    origin: true,
    credentials: true,
  });

  await app.listen(envService.getPort());
}
void bootstrap();
