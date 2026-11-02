import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ZodSerializerDto } from "nestjs-zod";
import { CurrentUser, type RequestUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { DashboardDto, DashboardQueryDto } from "./dashboard.dto";
import { DashboardService } from "./dashboard.service";

@ApiTags("dashboard")
@Controller()
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Roles("SEEKER", "EMPLOYER")
  @Get("me/dashboard")
  @ZodSerializerDto(DashboardDto)
  @ApiOkResponse({
    type: DashboardDto,
    description:
      "Seekers: their applications. Employers: their company's jobs and applicants. " +
      "Employers without a company get 404.",
  })
  get(@CurrentUser() user: RequestUser, @Query() query: DashboardQueryDto) {
    return user.role === "EMPLOYER"
      ? this.dashboard.employer(user.id, query)
      : this.dashboard.seeker(user.id, query);
  }
}
