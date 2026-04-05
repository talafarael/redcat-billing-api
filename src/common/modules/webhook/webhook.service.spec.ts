import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { AppLoggerService } from '@/common/logger/app-logger.service';
import { WebhookService } from './webhook.service';

describe('WebhookService', () => {
  let service: WebhookService;
  let httpService: { post: jest.Mock };
  let logger: { warn: jest.Mock; error: jest.Mock };

  beforeEach(async () => {
    httpService = { post: jest.fn() };
    logger = { warn: jest.fn(), error: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: HttpService, useValue: httpService },
        { provide: AppLoggerService, useValue: logger },
      ],
    }).compile();

    service = module.get(WebhookService);
  });

  describe('sendJson', () => {
    it('POSTs JSON with default headers and returns the response', async () => {
      const axiosResponse = {
        status: 200,
        statusText: 'OK',
        data: { ok: true },
      };
      httpService.post.mockReturnValue(of(axiosResponse));

      const payload = { a: 1 };
      await expect(
        service.sendJson('https://hook.example/web', payload),
      ).resolves.toBe(axiosResponse);

      expect(httpService.post).toHaveBeenCalledWith(
        'https://hook.example/web',
        payload,
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    it('merges optional headers', async () => {
      httpService.post.mockReturnValue(
        of({ status: 200, statusText: 'OK', data: {} }),
      );

      await service.sendJson('https://x', { x: true }, {
        headers: { 'X-Custom': '1' },
      });

      expect(httpService.post).toHaveBeenCalledWith(
        'https://x',
        { x: true },
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'X-Custom': '1',
          },
        }),
      );
    });

    it('forwards AbortSignal when provided', async () => {
      const signal = AbortSignal.abort();
      httpService.post.mockReturnValue(
        of({ status: 200, statusText: 'OK', data: {} }),
      );

      await service.sendJson('https://x', {}, { signal });

      expect(httpService.post).toHaveBeenCalledWith(
        'https://x',
        {},
        expect.objectContaining({ signal }),
      );
    });

    it('uses validateStatus that accepts any HTTP status', async () => {
      httpService.post.mockReturnValue(
        of({ status: 500, statusText: 'ERR', data: {} }),
      );

      await service.sendJson('https://x', {});

      const call = httpService.post.mock.calls[0];
      const cfg = call[2] as { validateStatus?: (s: number) => boolean };
      expect(cfg.validateStatus?.(200)).toBe(true);
      expect(cfg.validateStatus?.(500)).toBe(true);
    });

    it('logs a warning when response status is 4xx or 5xx', async () => {
      httpService.post.mockReturnValue(
        of({ status: 404, statusText: 'Not Found', data: {} }),
      );

      await service.sendJson('https://hook.example/missing', {});

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          '[WebhookService] Webhook POST https://hook.example/missing → 404 Not Found',
        ),
      );
    });
  });
});
