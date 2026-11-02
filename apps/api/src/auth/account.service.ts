import { BadRequestException, Injectable } from "@nestjs/common";
import type { AuthTokenType } from "@jobify/db";
import {
  type AccountEmailKind,
  EMAIL_VERIFICATION_TTL_HOURS,
  PASSWORD_RESET_TTL_MINUTES,
} from "@jobify/shared";
import argon2 from "argon2";
import { EmailQueueService } from "../email/email-queue.service";
import { PrismaService } from "../prisma/prisma.service";
import { TokensService } from "./tokens.service";

const TTL_MS: Record<AuthTokenType, number> = {
  EMAIL_VERIFICATION: EMAIL_VERIFICATION_TTL_HOURS * 3_600_000,
  PASSWORD_RESET: PASSWORD_RESET_TTL_MINUTES * 60_000,
};

const INVALID_LINK = "This link is invalid or has expired. Ask for a new one.";

/** Email verification and password reset / change. Links carry single-use, expiring tokens. */
@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emails: EmailQueueService,
    private readonly tokens: TokensService,
  ) {}

  /** Emails a verification link, unless the address is already verified. */
  async sendVerification(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.emailVerifiedAt) return;
    const token = await this.issue(userId, "EMAIL_VERIFICATION");
    await this.send("VERIFY_EMAIL", userId, token);
  }

  async verifyEmail(token: string): Promise<void> {
    const row = await this.consume(token, "EMAIL_VERIFICATION");
    await this.prisma.user.updateMany({
      where: { id: row.userId, emailVerifiedAt: null },
      data: { emailVerifiedAt: new Date() },
    });
  }

  /**
   * Always succeeds, whether or not the address has an account, so the response can't be used
   * to find out who is registered. Google-only accounts use this to set a first password.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return;
    const token = await this.issue(user.id, "PASSWORD_RESET");
    await this.send("PASSWORD_RESET", user.id, token);
  }

  /** Sets the new password and signs out everywhere. Opening the emailed link also proves the address. */
  async resetPassword(token: string, password: string): Promise<void> {
    const passwordHash = await argon2.hash(password);
    const row = await this.consume(token, "PASSWORD_RESET");
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: row.userId },
        data: { passwordHash, emailVerifiedAt: row.user.emailVerifiedAt ?? now },
      }),
      this.prisma.session.updateMany({
        where: { userId: row.userId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
    await this.send("PASSWORD_CHANGED", row.userId);
  }

  /**
   * Needs the current password. Revokes every other session; this one stays signed in. Other
   * devices keep working until their access token expires (ACCESS_TOKEN_TTL_SECONDS, 15 min),
   * because refreshing then fails: checking sessions on every request would cost a query each.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    currentRefreshToken: string | undefined,
  ): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.passwordHash) {
      throw new BadRequestException(
        'This account signs in with Google. Set a password with "Forgot password" first.',
      );
    }
    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) throw new BadRequestException("Your current password isn't right");

    const keep = currentRefreshToken ? TokensService.hash(currentRefreshToken) : undefined;
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: await argon2.hash(newPassword) },
      }),
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null, ...(keep && { tokenHash: { not: keep } }) },
        data: { revokedAt: now },
      }),
      // An old reset link must not undo the change.
      this.prisma.authToken.updateMany({
        where: { userId, type: "PASSWORD_RESET", usedAt: null },
        data: { usedAt: now },
      }),
    ]);
    await this.send("PASSWORD_CHANGED", userId);
  }

  /** A new token replaces any unused one of the same type, so only the latest link works. */
  private async issue(userId: string, type: AuthTokenType): Promise<string> {
    const { token, hash } = this.tokens.createLinkToken();
    await this.prisma.$transaction([
      this.prisma.authToken.updateMany({
        where: { userId, type, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.authToken.create({
        data: { userId, type, tokenHash: hash, expiresAt: new Date(Date.now() + TTL_MS[type]) },
      }),
    ]);
    return token;
  }

  /** Marks the token used, atomically, so a link works exactly once. */
  private async consume(token: string, type: AuthTokenType) {
    const tokenHash = TokensService.hash(token);
    const claimed = await this.prisma.authToken.updateMany({
      where: { tokenHash, type, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count === 0) throw new BadRequestException(INVALID_LINK);
    return this.prisma.authToken.findUniqueOrThrow({
      where: { tokenHash },
      include: { user: { select: { emailVerifiedAt: true } } },
    });
  }

  private send(kind: AccountEmailKind, userId: string, token?: string): Promise<void> {
    return this.emails.enqueueAccount({ kind, userId, token });
  }
}
