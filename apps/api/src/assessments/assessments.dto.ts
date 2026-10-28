import {
  assessmentInput,
  attemptSchema,
  submitAttemptSchema,
  teamAssessmentSchema,
} from "@jobify/shared";
import { createZodDto } from "nestjs-zod";

export class AssessmentInputDto extends createZodDto(assessmentInput) {}
export class TeamAssessmentDto extends createZodDto(teamAssessmentSchema) {}
export class AttemptDto extends createZodDto(attemptSchema) {}
export class SubmitAttemptDto extends createZodDto(submitAttemptSchema) {}
