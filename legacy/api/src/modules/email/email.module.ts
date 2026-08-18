import { Module } from '@nestjs/common';
import { Resend } from 'resend';

import { EmailService } from './services/email.service';
import { IdentityEmailConsumer } from './consumers/identity-email.consumer';

@Module({
  imports: [],
  providers: [
    EmailService,
    IdentityEmailConsumer,
    {
      provide: 'RESEND_CLIENT',
      useFactory: () => new Resend(process.env.RESEND_API_KEY || 're_disabled'),
    },
  ],
  exports: [EmailService],
})
export class EmailModule {}
