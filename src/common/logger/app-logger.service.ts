import {
  Injectable,
  Logger,
  LoggerService as NestLoggerService,
} from '@nestjs/common';

@Injectable()
export class AppLoggerService implements NestLoggerService {
  private readonly logger = new Logger(AppLoggerService.name);

  log(message: unknown, ...optionalParams: unknown[]) {
    this.logger.log(message, ...optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]) {
    this.logger.error(message, ...optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]) {
    this.logger.warn(message, ...optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]) {
    this.logger.debug(message, ...optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]) {
    this.logger.verbose(message, ...optionalParams);
  }
}
