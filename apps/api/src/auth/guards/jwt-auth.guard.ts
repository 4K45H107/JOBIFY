import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { UserRole } from "@jobify/shared";
import { ACCESS_COOKIE } from "../cookies";
import type { AuthenticatedRequest } from "../decorators/current-user.decorator";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

interface AccessTokenPayload {
  sub: string;
  role: string;
}

/**
 * Global guard: every route needs a valid access token unless marked @Public().
 * Reads the httpOnly cookie, or a Bearer header for API clients.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedException("Not signed in");
    }

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
      request.user = { id: payload.sub, role: UserRole.parse(payload.role) };
    } catch {
      // A stale token on a public route is ignored; the client refreshes it later.
      if (isPublic) return true;
      throw new UnauthorizedException("Session expired");
    }
    return true;
  }

  private extractToken(request: AuthenticatedRequest): string | undefined {
    const fromCookie = (request.cookies as Record<string, string> | undefined)?.[ACCESS_COOKIE];
    if (fromCookie) return fromCookie;
    const [scheme, value] = request.headers.authorization?.split(" ") ?? [];
    return scheme === "Bearer" ? value : undefined;
  }
}
