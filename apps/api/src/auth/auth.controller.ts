import { Body, Controller, Get, HttpCode, Post, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { ZodSerializerDto } from "nestjs-zod";
import type { Env } from "../config/env";
import { AccountService } from "./account.service";
import {
  AuthUserDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from "./auth.dto";
import { AuthService, type IssuedTokens } from "./auth.service";
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from "./cookies";
import { CurrentUser, type RequestUser } from "./decorators/current-user.decorator";
import { Public } from "./decorators/public.decorator";
import { TokensService } from "./tokens.service";

/** Stricter limit on credential endpoints to slow down guessing. */
const CREDENTIAL_LIMIT = { default: { limit: 10, ttl: 60_000 } };
/** Endpoints that send email: few per visitor, so they can't be used to flood an inbox. */
const EMAIL_LIMIT = { default: { limit: 5, ttl: 15 * 60_000 } };

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  private readonly secureCookies: boolean;

  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokensService,
    private readonly account: AccountService,
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

  /** Same response whether or not the email has an account. */
  @Public()
  @Throttle(EMAIL_LIMIT)
  @Post("password/forgot")
  @HttpCode(204)
  @ApiNoContentResponse({ description: "A reset link is emailed if the account exists." })
  forgotPassword(@Body() body: ForgotPasswordDto): Promise<void> {
    return this.account.forgotPassword(body.email);
  }

  @Public()
  @Throttle(CREDENTIAL_LIMIT)
  @Post("password/reset")
  @HttpCode(204)
  @ApiNoContentResponse({ description: "Password set; every session signed out." })
  resetPassword(@Body() body: ResetPasswordDto): Promise<void> {
    return this.account.resetPassword(body.token, body.password);
  }

  @Throttle(CREDENTIAL_LIMIT)
  @Post("password/change")
  @HttpCode(204)
  @ApiNoContentResponse({ description: "Password changed; other devices signed out." })
  changePassword(
    @CurrentUser() user: RequestUser,
    @Body() body: ChangePasswordDto,
    @Req() req: Request,
  ): Promise<void> {
    return this.account.changePassword(
      user.id,
      body.currentPassword,
      body.newPassword,
      this.refreshCookie(req),
    );
  }

  /** Public: the link may be opened in a browser that isn't signed in. */
  @Public()
  @Throttle(CREDENTIAL_LIMIT)
  @Post("email/verify")
  @HttpCode(204)
  @ApiNoContentResponse({ description: "Email verified." })
  verifyEmail(@Body() body: VerifyEmailDto): Promise<void> {
    return this.account.verifyEmail(body.token);
  }

  @Throttle(EMAIL_LIMIT)
  @Post("email/resend")
  @HttpCode(204)
  @ApiNoContentResponse({ description: "A new verification link is emailed (if not verified)." })
  resendVerification(@CurrentUser() user: RequestUser): Promise<void> {
    return this.account.sendVerification(user.id);
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
