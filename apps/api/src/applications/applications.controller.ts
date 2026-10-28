import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ZodSerializerDto } from "nestjs-zod";
import { CurrentUser, type RequestUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import {
  ApplicantDto,
  ApplicantListDto,
  ApplicantsQueryDto,
  ApplyDto,
  MyApplicationDto,
  MyApplicationsDto,
  StageChangeDto,
} from "./applications.dto";
import { ApplicationsService } from "./applications.service";

@ApiTags("applications")
@Controller()
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Roles("SEEKER")
  @Post("jobs/:jobId/applications")
  @ZodSerializerDto(MyApplicationDto)
  @ApiOkResponse({
    type: MyApplicationDto,
    description: "Easy Apply. Uses (and snapshots) the profile CV.",
  })
  apply(@CurrentUser() user: RequestUser, @Param("jobId") jobId: string, @Body() body: ApplyDto) {
    return this.applications.apply(user.id, jobId, body);
  }

  @Roles("SEEKER")
  @Get("me/applications")
  @ZodSerializerDto(MyApplicationsDto)
  @ApiOkResponse({ type: MyApplicationsDto })
  listMine(@CurrentUser() user: RequestUser) {
    return this.applications.listMine(user.id);
  }

  @Roles("SEEKER")
  @Get("me/applications/:id")
  @ZodSerializerDto(MyApplicationDto)
  @ApiOkResponse({ type: MyApplicationDto })
  mine(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.applications.mine(user.id, id);
  }

  @Roles("SEEKER")
  @Delete("me/applications/:id")
  @ZodSerializerDto(MyApplicationDto)
  @ApiOkResponse({ type: MyApplicationDto, description: "Withdraws the application." })
  withdraw(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.applications.withdraw(user.id, id);
  }

  @Roles("EMPLOYER")
  @Get("jobs/:jobId/applications")
  @ZodSerializerDto(ApplicantListDto)
  @ApiOkResponse({ type: ApplicantListDto, description: "Applicants for a job your company owns." })
  applicants(
    @CurrentUser() user: RequestUser,
    @Param("jobId") jobId: string,
    @Query() query: ApplicantsQueryDto,
  ) {
    return this.applications.applicants(user.id, jobId, query);
  }

  @Roles("EMPLOYER")
  @Patch("applications/:id/stage")
  @ZodSerializerDto(ApplicantDto)
  @ApiOkResponse({
    type: ApplicantDto,
    description: "Moves an applicant along the pipeline; the seeker is notified.",
  })
  changeStage(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() body: StageChangeDto,
  ) {
    return this.applications.changeStage(user.id, id, body);
  }
}
