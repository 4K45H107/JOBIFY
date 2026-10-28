import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { UserRole } from "@jobify/shared";

/** Claims carried by the access token and attached to the request by JwtAuthGuard. */
export interface RequestUser {
  id: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: RequestUser;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) throw new Error("CurrentUser used on a route without JwtAuthGuard");
    return request.user;
  },
);
