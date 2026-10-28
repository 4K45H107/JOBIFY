import {
  employerProfileSchema,
  employerProfileUpdateSchema,
  jobPreferenceSchema,
  seekerProfileSchema,
  seekerProfileUpdateSchema,
  skillsUpdateSchema,
} from "@jobify/shared";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export class SeekerProfileDto extends createZodDto(seekerProfileSchema) {}
export class SeekerProfileUpdateDto extends createZodDto(seekerProfileUpdateSchema) {}
export class SkillsUpdateDto extends createZodDto(skillsUpdateSchema) {}
export class JobPreferenceDto extends createZodDto(jobPreferenceSchema) {}
export class EmployerProfileDto extends createZodDto(employerProfileSchema) {}
export class EmployerProfileUpdateDto extends createZodDto(employerProfileUpdateSchema) {}
export class SkillSearchQueryDto extends createZodDto(
  z.object({ q: z.string().trim().max(40).default("") }),
) {}
