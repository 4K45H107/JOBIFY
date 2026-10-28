import { Module } from "@nestjs/common";
import { CompaniesModule } from "../companies/companies.module";
import { AssessmentsController } from "./assessments.controller";
import { AssessmentsService } from "./assessments.service";

@Module({
  imports: [CompaniesModule],
  controllers: [AssessmentsController],
  providers: [AssessmentsService],
})
export class AssessmentsModule {}
