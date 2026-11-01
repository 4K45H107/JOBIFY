import { Global, Module } from "@nestjs/common";
import { EmailController } from "./email.controller";
import { EmailQueueService } from "./email-queue.service";
import { EmailService } from "./email.service";

/** Email preferences, one-click unsubscribe, and queuing emails for the worker to send. */
@Global()
@Module({
  controllers: [EmailController],
  providers: [EmailService, EmailQueueService],
  exports: [EmailQueueService],
})
export class EmailModule {}
