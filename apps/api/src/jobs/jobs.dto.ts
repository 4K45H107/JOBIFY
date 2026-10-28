import {
  employerJobsQuerySchema,
  jobCreateSchema,
  jobDetailSchema,
  jobListSchema,
  jobSearchQuerySchema,
  jobSummarySchema,
  jobUpdateSchema,
  recommendedJobSchema,
} from "@jobify/shared";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export class JobCreateDto extends createZodDto(jobCreateSchema) {}
export class JobUpdateDto extends createZodDto(jobUpdateSchema) {}
export class JobDetailDto extends createZodDto(jobDetailSchema) {}
export class JobListDto extends createZodDto(jobListSchema) {}
export class JobSummaryListDto extends createZodDto(z.array(jobSummarySchema)) {}
export class JobSearchQueryDto extends createZodDto(jobSearchQuerySchema) {}
export class EmployerJobsQueryDto extends createZodDto(employerJobsQuerySchema) {}
export class RecommendedJobListDto extends createZodDto(z.array(recommendedJobSchema)) {}
