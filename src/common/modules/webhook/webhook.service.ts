import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import type { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppLoggerService } from '../../logger/app-logger.service';
import type { WebhookSendJsonOptions } from './interfaces/webhook-send-json.options';

export type { WebhookSendJsonOptions } from './interfaces/webhook-send-json.options';

@Injectable()
export class WebhookService {
  constructor(
    private readonly httpService: HttpService,
    private readonly logger: AppLoggerService,
  ) {}

  async sendJson<T>(
    url: string,
    payload: T,
    options?: WebhookSendJsonOptions,
  ): Promise<AxiosResponse<unknown>> {
    const response = await firstValueFrom(
      this.httpService.post<unknown, T>(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        signal: options?.signal,
        validateStatus: () => true,
      }),
    );

    if (response.status >= 400) {
      this.logger.warn(
        `[${WebhookService.name}] Webhook POST ${url} → ${response.status} ${response.statusText}`,
      );
    }

    return response;
  }
}
