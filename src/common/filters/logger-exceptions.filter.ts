import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AppLoggerService } from '../logger/app-logger.service';

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly configService: ConfigService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody =
      exception instanceof HttpException
        ? exception.getResponse()
        : {
            message:
              exception instanceof Error
                ? exception.message
                : 'Internal server error',
          };

    const message =
      typeof responseBody === 'string'
        ? responseBody
        : typeof responseBody === 'object' &&
            responseBody !== null &&
            'message' in responseBody
          ? String((responseBody as { message: unknown }).message)
          : exception instanceof Error
            ? exception.message
            : 'Unknown error';

    const logMessage =
      typeof responseBody === 'string'
        ? responseBody
        : JSON.stringify(responseBody);

    this.logError(
      logMessage,
      status,
      request,
      exception instanceof Error ? exception.stack : undefined,
    );

    const isProd = this.configService.get<string>('nodeEnv') === 'production';

    if (isProd && status === (HttpStatus.INTERNAL_SERVER_ERROR as number)) {
      response.status(status).json({
        statusCode: status,
        message: 'Internal server error',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const payload =
      typeof responseBody === 'object' && responseBody !== null
        ? { ...responseBody }
        : { message };

    response.status(status).json({
      ...payload,
      statusCode: status,
      timestamp: new Date().toISOString(),
    });
  }

  private logError(
    message: string,
    status: number,
    request: Request,
    stack?: string,
  ) {
    const source = this.parseSourceFromStack(stack);
    const sourceInfo = source ? ` [${source}]` : '';
    if (status >= 500) {
      this.logger.error(
        `[${status}] ${request.method} ${request.url} - ${message}${sourceInfo}`,
        stack,
      );
    } else {
      this.logger.warn(
        `[${status}] ${request.method} ${request.url} - ${message}${sourceInfo}`,
      );
    }
  }

  private parseSourceFromStack(stack?: string): string | null {
    if (!stack) return null;
    const lines = stack.split('\n').slice(1);
    const frameRe =
      /at\s+(?:(\S+)\s+\()?(?:.*[/\\])?(?:src|dist)[/\\]([^:]+):(\d+):(\d+)/;
    for (const line of lines) {
      const match = line.trim().match(frameRe);
      if (match) {
        const [, fn, file, lineNum] = match;
        const module = file.replace(/\.(ts|js)$/, '').replace(/[/\\]/g, '.');
        return fn ? `${module}.${fn}` : `${module}:${lineNum}`;
      }
    }
    return null;
  }
}
