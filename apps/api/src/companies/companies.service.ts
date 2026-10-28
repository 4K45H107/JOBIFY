import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  Branch,
  BranchCreate,
  CompanyCreate,
  CompanyDetail,
  CompanyList,
  CompanyListQuery,
  CompanyMember,
  CompanySummary,
  CompanyUpdate,
  MembershipStatus,
} from "@jobify/shared";
import { isUniqueConstraintError, type Prisma } from "@jobify/db";
import { companyFileKey, fileUrl } from "../files/file-keys";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { slugify } from "./slug";

const summaryInclude = {
  _count: {
    select: {
      jobs: { where: { status: "OPEN" } },
      members: { where: { status: "ACTIVE" } },
    },
  },
} satisfies Prisma.CompanyInclude;

type CompanyWithCounts = Prisma.CompanyGetPayload<{ include: typeof summaryInclude }>;

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── read ────────────────────────────────────────────────────────────────

  async list({ q, page, pageSize }: CompanyListQuery): Promise<CompanyList> {
    const where: Prisma.CompanyWhereInput = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { industry: { contains: q, mode: "insensitive" } },
            { headquarters: { contains: q, mode: "insensitive" } },
          ],
        }
      : {};
    const [total, companies] = await this.prisma.$transaction([
      this.prisma.company.count({ where }),
      this.prisma.company.findMany({
        where,
        include: summaryInclude,
        orderBy: [{ jobs: { _count: "desc" } }, { name: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items: companies.map(toSummary), total, page, pageSize };
  }

  async getBySlug(slug: string): Promise<CompanyDetail> {
    const company = await this.prisma.company.findUnique({
      where: { slug },
      include: { ...summaryInclude, branches: { orderBy: { name: "asc" } } },
    });
    if (!company) throw new NotFoundException("Company not found");
    return toDetail(company);
  }

  /** The caller's company, if they're an active member. */
  async getMine(userId: string): Promise<CompanyDetail> {
    const membership = await this.activeMembership(userId);
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: membership.companyId },
      include: { ...summaryInclude, branches: { orderBy: { name: "asc" } } },
    });
    return toDetail(company);
  }

  // ─── onboarding ──────────────────────────────────────────────────────────

  async create(userId: string, input: CompanyCreate): Promise<CompanyDetail> {
    await this.assertNoMembership(userId);
    const existing = await this.prisma.company.findFirst({
      where: { name: { equals: input.name, mode: "insensitive" } },
    });
    if (existing)
      throw new ConflictException(
        "A company with this name already exists. Ask to join it instead.",
      );

    try {
      const company = await this.prisma.company.create({
        data: {
          ...input,
          slug: await this.uniqueSlug(input.name),
          members: { create: { userId, role: "ADMIN", status: "ACTIVE" } },
        },
      });
      return this.getBySlug(company.slug);
    } catch (error) {
      if (isUniqueConstraintError(error))
        throw new ConflictException("A company with this name already exists");
      throw error;
    }
  }

  async requestToJoin(userId: string, companyId: string): Promise<void> {
    await this.assertNoMembership(userId);
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException("Company not found");

    const requester = await this.prisma.employerProfile.findUniqueOrThrow({ where: { userId } });
    await this.prisma.companyMember.upsert({
      where: { companyId_userId: { companyId, userId } },
      // A previously rejected employer may ask again.
      update: { status: "PENDING", role: "RECRUITER" },
      create: { companyId, userId, role: "RECRUITER", status: "PENDING" },
    });

    const admins = await this.prisma.companyMember.findMany({
      where: { companyId, role: "ADMIN", status: "ACTIVE" },
      select: { userId: true },
    });
    await this.notifications.notify(
      admins.map((a) => a.userId),
      "COMPANY_JOIN_REQUESTED",
      {
        userId,
        name: requester.fullName,
        designation: requester.designation,
        company: company.name,
      },
    );
  }

  /** Withdraws the caller's pending request. */
  async cancelRequest(userId: string): Promise<void> {
    await this.prisma.companyMember.deleteMany({ where: { userId, status: "PENDING" } });
  }

  // ─── admin ───────────────────────────────────────────────────────────────

  async members(adminId: string, status?: MembershipStatus): Promise<CompanyMember[]> {
    const { companyId } = await this.adminMembership(adminId);
    const members = await this.prisma.companyMember.findMany({
      where: { companyId, ...(status && { status }) },
      include: { user: { include: { employerProfile: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
    return members.map((m) => ({
      userId: m.userId,
      fullName: m.user.employerProfile?.fullName ?? m.user.email,
      email: m.user.email,
      designation: m.user.employerProfile?.designation ?? null,
      photoUrl: fileUrl(m.user.employerProfile?.photoKey),
      role: m.role,
      status: m.status,
      requestedAt: m.createdAt.toISOString(),
    }));
  }

  async decide(adminId: string, memberId: string, decision: "ACTIVE" | "REJECTED"): Promise<void> {
    const { companyId } = await this.adminMembership(adminId);
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId } });
    const updated = await this.prisma.companyMember.updateMany({
      where: { companyId, userId: memberId, status: "PENDING" },
      data: { status: decision },
    });
    if (updated.count === 0) throw new NotFoundException("No pending request from this employer");

    await this.notifications.notify([memberId], "COMPANY_JOIN_DECIDED", {
      company: company.name,
      approved: decision === "ACTIVE",
    });
  }

  async update(adminId: string, input: CompanyUpdate): Promise<CompanyDetail> {
    const { companyId } = await this.adminMembership(adminId);
    if (input.name) {
      const clash = await this.prisma.company.findFirst({
        where: { name: { equals: input.name, mode: "insensitive" }, id: { not: companyId } },
      });
      if (clash) throw new ConflictException("Another company already uses this name");
    }
    // The slug stays stable when the name changes, so shared links keep working.
    const company = await this.prisma.company.update({ where: { id: companyId }, data: input });
    return this.getBySlug(company.slug);
  }

  async replaceImage(
    adminId: string,
    kind: "logo" | "cover",
    file: { buffer: Buffer; contentType: string; ext: string },
  ): Promise<CompanyDetail> {
    const { companyId } = await this.adminMembership(adminId);
    const key = companyFileKey(companyId, kind, file.ext);
    await this.storage.put(key, file.buffer, file.contentType);
    const field = kind === "logo" ? "logoKey" : "coverKey";
    const before = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId } });
    const company = await this.prisma.company.update({
      where: { id: companyId },
      data: { [field]: key },
    });
    if (before[field]) await this.storage.delete(before[field]);
    return this.getBySlug(company.slug);
  }

  async addBranch(adminId: string, input: BranchCreate): Promise<Branch> {
    const { companyId } = await this.adminMembership(adminId);
    const branch = await this.prisma.companyBranch.create({ data: { ...input, companyId } });
    return { id: branch.id, name: branch.name, city: branch.city, country: branch.country };
  }

  async removeBranch(adminId: string, branchId: string): Promise<void> {
    const { companyId } = await this.adminMembership(adminId);
    const deleted = await this.prisma.companyBranch.deleteMany({
      where: { id: branchId, companyId },
    });
    if (deleted.count === 0) throw new NotFoundException("Branch not found");
  }

  // ─── helpers ─────────────────────────────────────────────────────────────

  private async assertNoMembership(userId: string): Promise<void> {
    const current = await this.prisma.companyMember.findFirst({
      where: { userId, status: { in: ["ACTIVE", "PENDING"] } },
      include: { company: { select: { name: true } } },
    });
    if (current) {
      throw new ConflictException(
        current.status === "ACTIVE"
          ? `You already belong to ${current.company.name}`
          : `You already asked to join ${current.company.name}. Cancel that request first.`,
      );
    }
  }

  private async activeMembership(userId: string) {
    const membership = await this.prisma.companyMember.findFirst({
      where: { userId, status: "ACTIVE" },
    });
    if (!membership) throw new NotFoundException("You don't belong to a company yet");
    return membership;
  }

  private async adminMembership(userId: string) {
    const membership = await this.activeMembership(userId);
    if (membership.role !== "ADMIN")
      throw new ForbiddenException("Only the company admin can do this");
    return membership;
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base = slugify(name);
    for (let n = 1; ; n++) {
      const slug = n === 1 ? base : `${base}-${n}`;
      if (!(await this.prisma.company.findUnique({ where: { slug } }))) return slug;
    }
  }
}

function toSummary(c: CompanyWithCounts): CompanySummary {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    industry: c.industry,
    size: c.size,
    headquarters: c.headquarters,
    description: c.description,
    logoUrl: fileUrl(c.logoKey),
    openJobs: c._count.jobs,
    employees: c._count.members,
  };
}

function toDetail(c: CompanyWithCounts & { branches: Branch[] }): CompanyDetail {
  return {
    ...toSummary(c),
    foundedYear: c.foundedYear,
    website: c.website,
    mission: c.mission,
    coverUrl: fileUrl(c.coverKey),
    branches: c.branches.map(({ id, name, city, country }) => ({ id, name, city, country })),
  };
}
