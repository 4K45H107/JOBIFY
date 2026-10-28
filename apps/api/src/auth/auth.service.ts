import { ConflictException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import type { AuthUser, LoginInput, RegisterInput } from "@jobify/shared";
import { isUniqueConstraintError } from "@jobify/db";
import argon2 from "argon2";
import { fileUrl } from "../files/file-keys";
import { PrismaService } from "../prisma/prisma.service";
import { TokensService } from "./tokens.service";

export interface IssuedTokens {
  userId: string;
  accessToken: string;
  /** Absent when only the access token was renewed (see REUSE_GRACE_MS). */
  refreshToken?: string;
}

/**
 * Parallel requests (e.g. a page load plus its prefetches) can present the same
 * refresh token at once. Inside this window a just-rotated token still gets a
 * new access token, but no new refresh token, instead of tripping theft detection.
 */
export const REUSE_GRACE_MS = 30_000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  /** Verified against when the email is unknown, so response time doesn't reveal which emails exist. */
  private readonly dummyHash = argon2.hash("not-a-real-password-dummy");

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
  ) {}

  async register(input: RegisterInput, userAgent?: string): Promise<IssuedTokens> {
    const passwordHash = await argon2.hash(input.password);
    const profile = { create: { fullName: input.fullName } };

    try {
      const user = await this.prisma.user.create({
        data: {
          email: input.email,
          passwordHash,
          role: input.role,
          ...(input.role === "SEEKER" ? { seekerProfile: profile } : { employerProfile: profile }),
        },
      });
      return this.issueTokens(user, userAgent);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException("An account with this email already exists");
      }
      throw error;
    }
  }

  async login(input: LoginInput, userAgent?: string): Promise<IssuedTokens> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    const valid = user?.passwordHash
      ? await argon2.verify(user.passwordHash, input.password)
      : (await argon2.verify(await this.dummyHash, input.password), false);

    if (!user || !valid) throw new UnauthorizedException("Incorrect email or password");
    return this.issueTokens(user, userAgent);
  }

  /** Rotates the refresh token. Reusing an already-rotated token revokes every session of that user. */
  async refresh(refreshToken: string | undefined, userAgent?: string): Promise<IssuedTokens> {
    if (!refreshToken) throw new UnauthorizedException("Not signed in");

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: TokensService.hash(refreshToken) },
      include: { user: true },
    });
    if (!session) throw new UnauthorizedException("Session not found");

    if (session.revokedAt) {
      const rotatedRecently =
        session.replacedBy !== null && Date.now() - session.revokedAt.getTime() < REUSE_GRACE_MS;
      if (rotatedRecently && (await this.isActive(session.replacedBy!))) {
        return {
          userId: session.userId,
          accessToken: await this.tokens.signAccessToken(session.user),
        };
      }
      // Rotated long ago: a stolen token is being replayed. Logged-out tokens are just rejected.
      if (session.replacedBy !== null) {
        this.logger.warn(
          `Refresh token reuse detected for user ${session.userId}. Revoking all sessions.`,
        );
        await this.revokeAll(session.userId);
      }
      throw new UnauthorizedException("Session revoked");
    }
    if (session.expiresAt < new Date()) throw new UnauthorizedException("Session expired");

    const next = this.tokens.createRefreshToken();
    // Revoke + create in one transaction. A concurrent refresh blocks on the row lock,
    // then sees the token already rotated (count 0) with its successor committed.
    const won = await this.prisma.$transaction(async (tx) => {
      const rotated = await tx.session.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: new Date(), replacedBy: next.hash },
      });
      if (rotated.count === 0) return false;
      await tx.session.create({
        data: {
          userId: session.userId,
          tokenHash: next.hash,
          expiresAt: next.expiresAt,
          userAgent,
        },
      });
      return true;
    });
    // Lost the race to a parallel request: take the grace path above.
    if (!won) return this.refresh(refreshToken, userAgent);

    return {
      userId: session.userId,
      accessToken: await this.tokens.signAccessToken(session.user),
      refreshToken: next.token,
    };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    await this.prisma.session.updateMany({
      where: { tokenHash: TokensService.hash(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        seekerProfile: { select: { fullName: true, photoKey: true } },
        employerProfile: { select: { fullName: true, photoKey: true } },
        companyMembership: {
          where: { status: { in: ["ACTIVE", "PENDING"] } },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { company: { select: { id: true, name: true, slug: true } } },
        },
      },
    });
    if (!user) throw new UnauthorizedException("Account no longer exists");

    const membership = user.companyMembership[0];
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.seekerProfile?.fullName ?? user.employerProfile?.fullName ?? null,
      photoUrl: fileUrl(user.seekerProfile?.photoKey ?? user.employerProfile?.photoKey),
      company: membership
        ? { ...membership.company, role: membership.role, status: membership.status }
        : null,
    };
  }

  private async issueTokens(
    user: { id: string; role: AuthUser["role"] },
    userAgent?: string,
  ): Promise<IssuedTokens> {
    const refresh = this.tokens.createRefreshToken();
    await this.prisma.session.create({
      data: { userId: user.id, tokenHash: refresh.hash, expiresAt: refresh.expiresAt, userAgent },
    });
    return {
      userId: user.id,
      accessToken: await this.tokens.signAccessToken(user),
      refreshToken: refresh.token,
    };
  }

  private async isActive(tokenHash: string): Promise<boolean> {
    const successor = await this.prisma.session.findUnique({ where: { tokenHash } });
    return !!successor && !successor.revokedAt && successor.expiresAt > new Date();
  }

  private async revokeAll(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
