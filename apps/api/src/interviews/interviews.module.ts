import { Module } from "@nestjs/common";
import { ApplicationsModule } from "../applications/applications.module";
import { CompaniesModule } from "../companies/companies.module";
import { InterviewsController } from "./interviews.controller";
import { InterviewsService } from "./interviews.service";

@Module({
  imports: [CompaniesModule, ApplicationsModule],
  controllers: [InterviewsController],
  providers: [InterviewsService],
})
export class InterviewsModule {}
