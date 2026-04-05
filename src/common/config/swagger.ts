import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const setupSwagger = (app: INestApplication): void => {
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('nodeEnv');

  const config = new DocumentBuilder()
    .setTitle('RedCat Billing API')
    .setVersion('1.0')
    .addCookieAuth('access_token')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  if (nodeEnv === 'development') {
    SwaggerModule.setup('api', app, documentFactory);
  }
};
