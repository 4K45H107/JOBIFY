import { Body, Controller, Get, Inject, Post, Query, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiExcludeEndpoint, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import {
  authProvidersSchema,
  googlePendingSchema,
  googleSignupSchema,
  SignupRole,
} from "@jobify/shared";
import type { CookieOptions, Request, Response } from "express";
import { createZodDto, ZodSerializerDto } from "nestjs-zod";
import type { Env } from "../config/env";
import { AuthUserDto } from "./auth.dto";
import { AuthService, type IssuedTokens } from "./auth.service";
import { setAuthCookies } from "./cookies";
import { Public } from "./decorators/public.decorator";
import { GoogleService } from "./google.service";
import { TokensService } from "./tokens.service";

class ProvidersDto extends createZodDto(authProvidersSchema) {}
class PendingDto extends createZodDto(googlePendingSchema) {}
class GoogleSignupDto extends createZodDto(googleSignupSchema) {}

const FLOW_COOKIE = "jobify_google";
const PENDING_COOKIE = "jobify_google_signup";
const LIMIT = { default: { limit: 20, ttl: 60_000 } };

/** Same-site relative paths only (no open redirects), as the web app's ?next= handling. */
const safeNext = (next: unknown): string | undefined =>
  typeof next === "string" &&
  next.startsWith("/") &&
  !next.startsWith("//") &&
  !next.startsWith("/\\")
    ? next
    : undefined;

/** "Continue with Google". Pages the browser lands on are in the web app; see GoogleService. */
@ApiTags("auth")
@Controller("auth")
export class GoogleController {
  private readonly secure: boolean;

  constructor(
    private readonly google: GoogleService,
    private readonly auth: AuthService,
    private readonly tokens: TokensService,
    @Inject(ConfigService) config: ConfigService<Env, true>,
  ) {
    this.secure = config.get("NODE_ENV", { infer: true }) === "production";
  }

  @Public()
  @Get("providers")
  @ZodSerializerDto(ProvidersDto)
  @ApiOkResponse({ type: ProvidersDto })
  providers() {
    return { google: this.google.enabled };
  }

  /** Redirects to Google. `role` (from the sign-up page) skips the role step for new accounts. */
  @Public()
  @Throttle(LIMIT)
  @Get("google")
  @ApiExcludeEndpoint()
  async start(
    @Query("next") next: unknown,
    @Query("role") role: unknown,
    @Res() res: Response,
  ): Promise<void> {
    if (!this.google.enabled) return res.redirect(302, "/login?error=google-off");
    const { url, cookie } = await this.google.start({
      next: safeNext(next),
      role: SignupRole.safeParse(role).data,
    });
    res.cookie(FLOW_COOKIE, cookie, this.flowCookie());
    res.redirect(302, url);
  }

  @Public()
  @Throttle(LIMIT)
  @Get("google/callback")
  @ApiExcludeEndpoint()
  async callback(
    @Query("code") code: unknown,
    @Query("state") state: unknown,
    @Query("error") error: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    res.clearCookie(FLOW_COOKIE, this.flowCookie());
    if (error) return res.redirect(302, "/login?error=google-cancelled");
    try {
      const flow = await this.google.readFlow(
        this.cookie(req, FLOW_COOKIE),
        typeof state === "string" ? state : undefined,
      );
      if (typeof code !== "string") throw new Error("No code");
      const claims = await this.google.fetchClaims(code, flow.verifier);
      const result = await this.google.complete(flow, claims, req.get("user-agent"));
      const next = flow.next ? `?next=${encodeURIComponent(flow.next)}` : "";
      if (result.kind === "pending") {
        res.cookie(PENDING_COOKIE, result.pendingCookie, this.flowCookie());
        return res.redirect(302, `/register/google${next}`);
      }
      this.signIn(res, result.tokens);
      // The web page finishes the redirect (role home, onboarding or ?next=).
      res.redirect(302, `/signing-in${next}`);
    } catch {
      res.redirect(302, "/login?error=google");
    }
  }

  /** What Google told us, for the "join as…" step. */
  @Public()
  @Get("google/pending")
  @ZodSerializerDto(PendingDto)
  @ApiOkResponse({ type: PendingDto })
  async pending(@Req() req: Request) {
    const { email, fullName } = await this.google.readPending(this.cookie(req, PENDING_COOKIE));
    return { email, fullName };
  }

  @Public()
  @Throttle(LIMIT)
  @Post("google/complete")
  @ZodSerializerDto(AuthUserDto)
  @ApiOkResponse({ type: AuthUserDto, description: "Account created with Google and signed in." })
  async completeSignup(
    @Body() body: GoogleSignupDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const pending = await this.google.readPending(this.cookie(req, PENDING_COOKIE));
    const tokens = await this.google.createUser(
      pending,
      body.role,
      body.fullName,
      req.get("user-agent"),
    );
    res.clearCookie(PENDING_COOKIE, this.flowCookie());
    this.signIn(res, tokens);
    return this.auth.me(tokens.userId);
  }

  private signIn(res: Response, tokens: IssuedTokens): void {
    setAuthCookies(res, tokens, {
      secure: this.secure,
      accessTtlSeconds: this.tokens.accessTtlSeconds,
      refreshTtlDays: this.tokens.refreshTtlDays,
    });
  }

  /** Lax, so it comes back on Google's top-level redirect; scoped to these routes. */
  private flowCookie(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: "lax",
      secure: this.secure,
      path: "/api/auth/google",
      maxAge: 10 * 60_000,
    };
  }

  private cookie(req: Request, name: string): string | undefined {
    return (req.cookies as Record<string, string> | undefined)?.[name];
  }
}
