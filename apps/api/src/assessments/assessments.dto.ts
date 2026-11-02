import {
  assessmentInput,
  submitAttemptSchema,
  attemptSchema,
  codingDraftSchema,
  codingSubmissionSchema,
  teamAssessmentSchema,
} from "@jobify/shared";
import { createZodDto, ZodValidationPipe } from "nestjs-zod";

export class TeamAssessmentDto extends createZodDto(teamAssessmentSchema) {}
export class AttemptDto extends createZodDto(attemptSchema) {}
export class CodingDraftDto extends createZodDto(codingDraftSchema) {}
export class CodingSubmissionDto extends createZodDto(codingSubmissionSchema) {}

/**
 * MCQ or coding: unions can't be DTO classes, so these bodies are validated with an explicit pipe.
 */
export const assessmentInputPipe = new ZodValidationPipe(assessmentInput);
export const submitAttemptPipe = new ZodValidationPipe(submitAttemptSchema);
