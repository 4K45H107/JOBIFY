import { Injectable } from "@nestjs/common";
import type { RequestUser } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import type { ParsedKey } from "./file-keys";

@Injectable()
export class FileAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async canRead(user: RequestUser, file: ParsedKey): Promise<boolean> {
    // Photos, logos and covers are visible to any signed-in user.
    if (file.kind !== "cv") return true;
    if (user.role === "ADMIN" || user.id === file.ownerId) return true;

    // Employers can read the CV of someone who applied to one of their company's jobs.
    if (user.role !== "EMPLOYER") return false;
    const application = await this.prisma.application.findFirst({
      where: {
        seekerId: file.ownerId,
        job: { company: { members: { some: { userId: user.id, status: "ACTIVE" } } } },
      },
      select: { id: true },
    });
    return application !== null;
  }
}
