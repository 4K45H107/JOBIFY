import {
  codingProblemListSchema,
  codingProblemQuerySchema,
  codingProblemSchema,
} from "@jobify/shared";
import { createZodDto } from "nestjs-zod";

export class CodingProblemListDto extends createZodDto(codingProblemListSchema) {}
export class CodingProblemQueryDto extends createZodDto(codingProblemQuerySchema) {}
export class CodingProblemDto extends createZodDto(codingProblemSchema) {}
