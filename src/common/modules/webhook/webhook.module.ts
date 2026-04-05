import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';
import { WebhookService } from './webhook.service';

@Global()
@Module({
  imports: [HttpModule],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
