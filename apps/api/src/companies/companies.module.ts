import { Module } from "@nestjs/common";
import { CompaniesController } from "./companies.controller";
import { CompaniesService } from "./companies.service";
import { CompanyAccessService } from "./company-access.service";

@Module({
  controllers: [CompaniesController],
  providers: [CompaniesService, CompanyAccessService],
  exports: [CompanyAccessService],
})
export class CompaniesModule {}
