import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { verifyUnsubscribeToken } from "@jobify/email/tokens";
import {
  EMAIL_TYPES,
  type EmailPreferences,
  type EmailPreferenceUpdate,
  emailTypeLabel,
  unsubscribeSchema,
  type UnsubscribeResult,
  type UserRole,
} from "@jobify/shared";
import type { Env } from "../config/env";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class EmailService {
  private readonly secret: string;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ConfigService) config: ConfigService<Env, true>,
  ) {
    this.secret = config.get("JWT_ACCESS_SECRET", { infer: true });
  }

  /** Every email type the role can get, on unless the user turned it off. */
  async preferences(userId: string, role: UserRole): Promise<EmailPreferences> {
    const rows = await this.prisma.emailPreference.findMany({ where: { userId } });
    const off = new Set(rows.filter((r) => !r.enabled).map((r) => r.type));
    return {
      preferences: EMAIL_TYPES[role].map((t) => ({ ...t, enabled: !off.has(t.type) })),
    };
  }

  async update(
    userId: string,
    role: UserRole,
    { preferences }: EmailPreferenceUpdate,
  ): Promise<EmailPreferences> {
    const allowed = new Set(EMAIL_TYPES[role].map((t) => t.type));
    const invalid = preferences.find((p) => !allowed.has(p.type));
    if (invalid) throw new BadRequestException(`${invalid.type} isn't an email you can get`);
    await this.prisma.$transaction(
      preferences.map((p) =>
        this.prisma.emailPreference.upsert({
          where: { userId_type: { userId, type: p.type } },
          create: { userId, type: p.type, enabled: p.enabled },
          update: { enabled: p.enabled },
        }),
      ),
    );
    return this.preferences(userId, role);
  }

  /** One click from an email footer, no sign-in: the signed token names the user and type. */
  async unsubscribe(token: unknown): Promise<UnsubscribeResult> {
    const input = unsubscribeSchema.safeParse({ token });
    const parsed = input.success ? verifyUnsubscribeToken(input.data.token, this.secret) : null;
    if (!parsed) throw new BadRequestException("This unsubscribe link isn't valid");
    const user = await this.prisma.user.findUnique({
      where: { id: parsed.userId },
      select: { role: true },
    });
    if (!user) throw new NotFoundException("This account no longer exists");
    await this.prisma.emailPreference.upsert({
      where: { userId_type: { userId: parsed.userId, type: parsed.type } },
      create: { userId: parsed.userId, type: parsed.type, enabled: false },
      update: { enabled: false },
    });
    return { label: emailTypeLabel(user.role, parsed.type) };
  }
}
