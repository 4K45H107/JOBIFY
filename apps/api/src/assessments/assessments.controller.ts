import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from "@nestjs/common";
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { AssessmentInput, SubmitAttempt } from "@jobify/shared";
import { ZodSerializerDto } from "nestjs-zod";
import { CurrentUser, type RequestUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import {
  assessmentInputPipe,
  AttemptDto,
  CodingDraftDto,
  CodingSubmissionDto,
  submitAttemptPipe,
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
    description:
      "The job's skill test (hiring team only): MCQ with its answer key, or the coding problem.",
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
    @Body(assessmentInputPipe) body: AssessmentInput,
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

  @Roles("EMPLOYER")
  @Get("applications/:applicationId/code")
  @ZodSerializerDto(CodingSubmissionDto)
  @ApiOkResponse({ type: CodingSubmissionDto, description: "A candidate's submitted code." })
  code(@CurrentUser() user: RequestUser, @Param("applicationId") applicationId: string) {
    return this.assessments.codingSubmission(user.id, applicationId);
  }

  @Roles("SEEKER")
  @Put("attempts/:attemptId/draft")
  @HttpCode(204)
  @ApiNoContentResponse({ description: "Autosaves code in progress (coding tests)." })
  saveDraft(
    @CurrentUser() user: RequestUser,
    @Param("attemptId") attemptId: string,
    @Body() body: CodingDraftDto,
  ) {
    return this.assessments.saveDraft(user.id, attemptId, body);
  }

  @Roles("SEEKER")
  @Post("attempts/:attemptId/submit")
  @HttpCode(200)
  @ZodSerializerDto(AttemptDto)
  @ApiOkResponse({
    type: AttemptDto,
    description: "MCQ: graded on the server. Coding: saved for the hiring team to review.",
  })
  submit(
    @CurrentUser() user: RequestUser,
    @Param("attemptId") attemptId: string,
    @Body(submitAttemptPipe) body: SubmitAttempt,
  ) {
    return this.assessments.submit(user.id, attemptId, body);
  }
}
