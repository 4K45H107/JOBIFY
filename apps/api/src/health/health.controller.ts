import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOkResponse({ description: "The API and its database are up." })
  @ApiServiceUnavailableResponse({ description: "The database is unreachable." })
  async check() {
    if (!(await this.prisma.isHealthy())) {
      throw new ServiceUnavailableException("Database unavailable");
    }
    return { status: "ok", database: "up", uptime: Math.round(process.uptime()) };
  }
}
