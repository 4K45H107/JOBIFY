import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/** Membership checks other modules use to authorize company-scoped actions. */
@Injectable()
export class CompanyAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** The caller's active membership, or 404 if they don't belong to a company. */
  async activeMembership(userId: string) {
    const membership = await this.prisma.companyMember.findFirst({
      where: { userId, status: "ACTIVE" },
    });
    if (!membership) throw new NotFoundException("You don't belong to a company yet");
    return membership;
  }

  /** Throws unless the caller is an active member of this company. */
  async assertMember(userId: string, companyId: string): Promise<void> {
    const membership = await this.prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId } },
    });
    if (membership?.status !== "ACTIVE")
      throw new ForbiddenException("Only this company's team can do that");
  }

  async isMember(userId: string, companyId: string): Promise<boolean> {
    const membership = await this.prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId } },
    });
    return membership?.status === "ACTIVE";
  }
}
