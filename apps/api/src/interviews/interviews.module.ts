import { Module } from "@nestjs/common";
import { ApplicationsModule } from "../applications/applications.module";
import { CompaniesModule } from "../companies/companies.module";
import { InterviewsController } from "./interviews.controller";
import { InterviewsService } from "./interviews.service";
import { VideoRoomsService } from "./video-rooms.service";

@Module({
  imports: [CompaniesModule, ApplicationsModule],
  controllers: [InterviewsController],
  providers: [InterviewsService, VideoRoomsService],
})
export class InterviewsModule {}
