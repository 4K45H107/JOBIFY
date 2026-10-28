import { Body, Controller, Get, HttpCode, Post, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { ZodSerializerDto } from "nestjs-zod";
import type { Env } from "../config/env";
import { AuthUserDto, LoginDto, RegisterDto } from "./auth.dto";
import { AuthService, type IssuedTokens } from "./auth.service";
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from "./cookies";
import { CurrentUser, type RequestUser } from "./decorators/current-user.decorator";
import { Public } from "./decorators/public.decorator";
import { TokensService } from "./tokens.service";

/** Stricter limit on credential endpoints to slow down guessing. */
const CREDENTIAL_LIMIT = { default: { limit: 10, ttl: 60_000 } };

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  private readonly secureCookies: boolean;

  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokensService,
    config: ConfigService<Env, true>,
  ) {
    this.secureCookies = config.get("NODE_ENV", { infer: true }) === "production";
  }

  @Public()
  @Throttle(CREDENTIAL_LIMIT)
  @Post("register")
  @ZodSerializerDto(AuthUserDto)
  @ApiOkResponse({ type: AuthUserDto, description: "Account created and signed in." })
  async register(
    @Body() body: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.register(body, req.get("user-agent"));
    return this.signIn(res, tokens);
  }

  @Public()
  @Throttle(CREDENTIAL_LIMIT)
  @Post("login")
  @HttpCode(200)
  @ZodSerializerDto(AuthUserDto)
  @ApiOkResponse({ type: AuthUserDto, description: "Signed in." })
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.login(body, req.get("user-agent"));
    return this.signIn(res, tokens);
  }

  @Public()
  @Post("refresh")
  @HttpCode(204)
  @ApiNoContentResponse({ description: "Cookies rotated." })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    try {
      const tokens = await this.auth.refresh(this.refreshCookie(req), req.get("user-agent"));
      this.setCookies(res, tokens);
    } catch (error) {
      clearAuthCookies(res, this.secureCookies);
      throw error;
    }
  }

  @Public()
  @Post("logout")
  @HttpCode(204)
  @ApiNoContentResponse({ description: "Signed out." })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(this.refreshCookie(req));
    clearAuthCookies(res, this.secureCookies);
  }

  @Get("me")
  @ZodSerializerDto(AuthUserDto)
  @ApiOkResponse({ type: AuthUserDto })
  me(@CurrentUser() user: RequestUser) {
    return this.auth.me(user.id);
  }

  private async signIn(res: Response, tokens: IssuedTokens) {
    this.setCookies(res, tokens);
    return this.auth.me(tokens.userId);
  }

  private setCookies(res: Response, tokens: IssuedTokens): void {
    setAuthCookies(res, tokens, {
      secure: this.secureCookies,
      accessTtlSeconds: this.tokens.accessTtlSeconds,
      refreshTtlDays: this.tokens.refreshTtlDays,
    });
  }

  private refreshCookie(req: Request): string | undefined {
    return (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
  }
}
