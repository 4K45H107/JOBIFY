import {
  applicantSchema,
  applicantsQuerySchema,
  applySchema,
  myApplicationSchema,
  myApplicationsSchema,
  stageChangeSchema,
} from "@jobify/shared";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export class ApplyDto extends createZodDto(applySchema) {}
export class StageChangeDto extends createZodDto(stageChangeSchema) {}
export class ApplicantsQueryDto extends createZodDto(applicantsQuerySchema) {}
export class MyApplicationDto extends createZodDto(myApplicationSchema) {}
export class MyApplicationsDto extends createZodDto(myApplicationsSchema) {}
export class ApplicantDto extends createZodDto(applicantSchema) {}
export class ApplicantListDto extends createZodDto(z.array(applicantSchema)) {}
