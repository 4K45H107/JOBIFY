import { Module } from "@nestjs/common";
import { CompaniesModule } from "../companies/companies.module";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  imports: [CompaniesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
