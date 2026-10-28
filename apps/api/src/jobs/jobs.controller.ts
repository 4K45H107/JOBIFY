import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ZodSerializerDto } from "nestjs-zod";
import { CurrentUser, type RequestUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import {
  EmployerJobsQueryDto,
  JobCreateDto,
  JobDetailDto,
  JobListDto,
  JobSearchQueryDto,
  JobSummaryListDto,
  JobUpdateDto,
  PlatformStatsDto,
  RecommendedJobListDto,
} from "./jobs.dto";
import { JobsService } from "./jobs.service";

@ApiTags("jobs")
@Controller()
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get("jobs")
  @ZodSerializerDto(JobListDto)
  @ApiOkResponse({ type: JobListDto, description: "Open jobs matching the filters." })
  search(@CurrentUser() user: RequestUser, @Query() query: JobSearchQueryDto) {
    return this.jobs.search(user, query);
  }

  @Get("stats")
  @ZodSerializerDto(PlatformStatsDto)
  @ApiOkResponse({ type: PlatformStatsDto, description: "Headline numbers for the home page." })
  stats() {
    return this.jobs.stats();
  }

  @Roles("SEEKER")
  @Get("jobs/for-you")
  @ZodSerializerDto(RecommendedJobListDto)
  @ApiOkResponse({
    type: RecommendedJobListDto,
    description: "Open jobs ranked by fit, with reasons.",
  })
  forYou(@CurrentUser() user: RequestUser) {
    return this.jobs.forYou(user.id);
  }

  @Roles("EMPLOYER")
  @Post("jobs")
  @ZodSerializerDto(JobDetailDto)
  @ApiOkResponse({ type: JobDetailDto })
  create(@CurrentUser() user: RequestUser, @Body() body: JobCreateDto) {
    return this.jobs.create(user.id, body);
  }

  @Get("jobs/:id")
  @ZodSerializerDto(JobDetailDto)
  @ApiOkResponse({
    type: JobDetailDto,
    description: "Seekers' visits are recorded as recent views.",
  })
  detail(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.jobs.detail(user, id);
  }

  @Get("jobs/:id/similar")
  @ZodSerializerDto(JobSummaryListDto)
  @ApiOkResponse({ type: JobSummaryListDto })
  similar(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.jobs.similar(user, id);
  }

  @Roles("EMPLOYER")
  @Patch("jobs/:id")
  @ZodSerializerDto(JobDetailDto)
  @ApiOkResponse({ type: JobDetailDto })
  update(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: JobUpdateDto) {
    return this.jobs.update(user.id, id, body);
  }

  @Roles("SEEKER")
  @Post("jobs/:id/save")
  @HttpCode(204)
  @ApiNoContentResponse()
  save(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.jobs.save(user.id, id);
  }

  @Roles("SEEKER")
  @Delete("jobs/:id/save")
  @HttpCode(204)
  @ApiNoContentResponse()
  unsave(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.jobs.unsave(user.id, id);
  }

  @Roles("SEEKER")
  @Get("me/saved-jobs")
  @ZodSerializerDto(JobSummaryListDto)
  @ApiOkResponse({ type: JobSummaryListDto })
  saved(@CurrentUser() user: RequestUser) {
    return this.jobs.saved(user.id);
  }

  @Roles("SEEKER")
  @Get("me/recent-jobs")
  @ZodSerializerDto(JobSummaryListDto)
  @ApiOkResponse({ type: JobSummaryListDto, description: "Last 10 jobs the seeker opened." })
  recent(@CurrentUser() user: RequestUser) {
    return this.jobs.recent(user.id);
  }

  @Roles("EMPLOYER")
  @Get("employer/jobs")
  @ZodSerializerDto(JobListDto)
  @ApiOkResponse({
    type: JobListDto,
    description: "scope=mine (My Offerings) or company (My Company Jobs).",
  })
  employerJobs(@CurrentUser() user: RequestUser, @Query() query: EmployerJobsQueryDto) {
    return this.jobs.employerJobs(user.id, query);
  }
}
