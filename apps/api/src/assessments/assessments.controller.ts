import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from "@nestjs/common";
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ZodSerializerDto } from "nestjs-zod";
import { CurrentUser, type RequestUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import {
  AssessmentInputDto,
  AttemptDto,
  SubmitAttemptDto,
  TeamAssessmentDto,
} from "./assessments.dto";
import { AssessmentsService } from "./assessments.service";

@ApiTags("assessments")
@Controller()
export class AssessmentsController {
  constructor(private readonly assessments: AssessmentsService) {}

  @Roles("EMPLOYER")
  @Get("jobs/:jobId/assessment")
  @ZodSerializerDto(TeamAssessmentDto)
  @ApiOkResponse({
    type: TeamAssessmentDto,
    description: "The job's MCQ test with its answer key (hiring team only).",
  })
  get(@CurrentUser() user: RequestUser, @Param("jobId") jobId: string) {
    return this.assessments.getForTeam(user.id, jobId);
  }

  @Roles("EMPLOYER")
  @Put("jobs/:jobId/assessment")
  @ZodSerializerDto(TeamAssessmentDto)
  @ApiOkResponse({ type: TeamAssessmentDto })
  upsert(
    @CurrentUser() user: RequestUser,
    @Param("jobId") jobId: string,
    @Body() body: AssessmentInputDto,
  ) {
    return this.assessments.upsert(user.id, jobId, body);
  }

  @Roles("EMPLOYER")
  @Delete("jobs/:jobId/assessment")
  @HttpCode(204)
  @ApiNoContentResponse()
  remove(@CurrentUser() user: RequestUser, @Param("jobId") jobId: string) {
    return this.assessments.remove(user.id, jobId);
  }

  @Roles("SEEKER")
  @Post("me/applications/:applicationId/attempt")
  @ZodSerializerDto(AttemptDto)
  @ApiOkResponse({
    type: AttemptDto,
    description: "Starts (or resumes) the skill test. No answer key.",
  })
  start(@CurrentUser() user: RequestUser, @Param("applicationId") applicationId: string) {
    return this.assessments.start(user.id, applicationId);
  }

  @Roles("SEEKER")
  @Post("attempts/:attemptId/submit")
  @HttpCode(200)
  @ZodSerializerDto(AttemptDto)
  @ApiOkResponse({ type: AttemptDto, description: "Graded on the server; returns the score." })
  submit(
    @CurrentUser() user: RequestUser,
    @Param("attemptId") attemptId: string,
    @Body() body: SubmitAttemptDto,
  ) {
    return this.assessments.submit(user.id, attemptId, body);
  }
}
