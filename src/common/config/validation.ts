import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class DatabaseConfig {
  @IsString()
  @IsNotEmpty()
  host: string;

  @IsOptional()
  port: number;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}

class JwtConfig {
  @IsString()
  @IsNotEmpty()
  accessSecret: string;

  @IsString()
  @IsNotEmpty()
  refreshSecret: string;

  @IsString()
  @IsNotEmpty()
  accessExpiresIn: string;

  @IsString()
  @IsNotEmpty()
  refreshExpiresIn: string;
}

class WebhookConfig {
  @IsOptional()
  @IsString()
  url?: string;
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsOptional()
  port: number;

  @ValidateNested()
  @Type(() => JwtConfig)
  jwt: JwtConfig;

  @ValidateNested()
  @Type(() => DatabaseConfig)
  database: DatabaseConfig;

  @IsOptional()
  @ValidateNested()
  @Type(() => WebhookConfig)
  webhook?: WebhookConfig;
}
export const validate = (config: Record<string, unknown>) => {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
};
