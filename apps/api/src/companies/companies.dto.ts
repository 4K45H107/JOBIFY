import {
  branchCreateSchema,
  branchSchema,
  companyCreateSchema,
  companyDetailSchema,
  companyListQuerySchema,
  companyListSchema,
  companyMemberSchema,
  companyUpdateSchema,
  memberListQuerySchema,
} from "@jobify/shared";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export class CompanyCreateDto extends createZodDto(companyCreateSchema) {}
export class CompanyUpdateDto extends createZodDto(companyUpdateSchema) {}
export class CompanyDetailDto extends createZodDto(companyDetailSchema) {}
export class CompanyListQueryDto extends createZodDto(companyListQuerySchema) {}
export class CompanyListDto extends createZodDto(companyListSchema) {}
export class CompanyMemberDto extends createZodDto(companyMemberSchema) {}
export class CompanyMemberListDto extends createZodDto(z.array(companyMemberSchema)) {}
export class MemberListQueryDto extends createZodDto(memberListQuerySchema) {}
export class BranchCreateDto extends createZodDto(branchCreateSchema) {}
export class BranchDto extends createZodDto(branchSchema) {}
