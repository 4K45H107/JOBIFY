import { createHash, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { UserRole } from "@jobify/shared";
import type { Env } from "../config/env";

@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  get accessTtlSeconds(): number {
    return this.config.get("ACCESS_TOKEN_TTL_SECONDS", { infer: true });
  }

  get refreshTtlDays(): number {
    return this.config.get("REFRESH_TOKEN_TTL_DAYS", { infer: true });
  }

  signAccessToken(user: { id: string; role: UserRole }): Promise<string> {
    return this.jwt.signAsync(
      { sub: user.id, role: user.role },
      { expiresIn: this.accessTtlSeconds },
    );
  }

  /** An opaque random refresh token plus the hash we store. */
  createRefreshToken(): { token: string; hash: string; expiresAt: Date } {
    const token = randomBytes(32).toString("base64url");
    return {
      token,
      hash: TokensService.hash(token),
      expiresAt: new Date(Date.now() + this.refreshTtlDays * 86_400_000),
    };
  }

  static hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
