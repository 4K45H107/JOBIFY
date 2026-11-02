import { dashboardQuerySchema, dashboardSchema } from "@jobify/shared";
import { createZodDto } from "nestjs-zod";

export class DashboardQueryDto extends createZodDto(dashboardQuerySchema) {}
export class DashboardDto extends createZodDto(dashboardSchema) {}
