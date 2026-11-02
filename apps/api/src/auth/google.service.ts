import { createHash, randomBytes } from "node:crypto";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { GooglePending, SignupRole } from "@jobify/shared";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Env } from "../config/env";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService, type IssuedTokens } from "./auth.service";

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
/** Separates these short-lived cookies from access tokens signed with the same secret. */
const FLOW_AUDIENCE = "google-oauth-flow";
const PENDING_AUDIENCE = "google-signup";
const FLOW_TTL = "10m";

/** What we keep (signed, in a cookie) between sending someone to Google and their return. */
export interface GoogleFlow {
  state: string;
  verifier: string;
  nonce: string;
  next?: string;
  role?: SignupRole;
}

/** The parts of Google's verified ID token we use. */
export interface GoogleClaims {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  nonce?: string;
}

export type GoogleResult =
  | { kind: "signed-in"; tokens: IssuedTokens }
  /** New email and no role chosen yet: finish on /register/google. */
  | { kind: "pending"; pendingCookie: string };

/**
 * Google sign-in with the authorization-code flow: state (CSRF), PKCE (the code is useless
 * without our verifier) and a nonce (the ID token was issued for this attempt). The ID token's
 * signature, issuer, audience and expiry are checked against Google's published keys.
 */
@Injectable()
export class GoogleService {
  readonly clientId?: string;
  private readonly clientSecret?: string;
  private readonly redirectUri: string;

  constructor(
    @Inject(ConfigService) config: ConfigService<Env, true>,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {
    this.clientId = config.get("GOOGLE_CLIENT_ID", { infer: true });
    this.clientSecret = config.get("GOOGLE_CLIENT_SECRET", { infer: true });
    // Through the web app's /api proxy, so the session cookies land on the web app's domain.
    this.redirectUri = `${config.get("WEB_ORIGIN", { infer: true })}/api/auth/google/callback`;
  }

  get enabled(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  /** Google's sign-in URL, and the signed cookie that remembers this attempt. */
  async start(input: {
    next?: string;
    role?: SignupRole;
  }): Promise<{ url: string; cookie: string }> {
    const flow: GoogleFlow = {
      state: randomBytes(16).toString("base64url"),
      verifier: randomBytes(32).toString("base64url"),
      nonce: randomBytes(16).toString("base64url"),
      ...input,
    };
    const url = new URL(AUTHORIZE_URL);
    url.search = new URLSearchParams({
      client_id: this.clientId!,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state: flow.state,
      nonce: flow.nonce,
      code_challenge: createHash("sha256").update(flow.verifier).digest("base64url"),
      code_challenge_method: "S256",
      prompt: "select_account",
    }).toString();
    const cookie = await this.jwt.signAsync(
      { ...flow },
      { audience: FLOW_AUDIENCE, expiresIn: FLOW_TTL },
    );
    return { url: url.toString(), cookie };
  }

  /** The attempt from the cookie, if it's ours, unexpired and matches Google's state. */
  async readFlow(cookie: string | undefined, state: string | undefined): Promise<GoogleFlow> {
    const flow = cookie
      ? await this.jwt
          .verifyAsync<GoogleFlow>(cookie, { audience: FLOW_AUDIENCE })
          .catch(() => null)
      : null;
    if (!flow || !state || flow.state !== state) {
      throw new UnauthorizedException("Google sign-in expired or was started elsewhere");
    }
    return flow;
  }

  /** Trades the code for an ID token and verifies it. Overridden in tests. */
  async fetchClaims(code: string, verifier: string): Promise<GoogleClaims> {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: this.clientId!,
        client_secret: this.clientSecret!,
        redirect_uri: this.redirectUri,
        grant_type: "authorization_code",
        code_verifier: verifier,
      }),
    });
    if (!res.ok) throw new UnauthorizedException("Google didn't accept the sign-in");
    const { id_token: idToken } = (await res.json()) as { id_token?: string };
    if (!idToken) throw new UnauthorizedException("Google didn't return an ID token");
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: this.clientId!,
    });
    return {
      sub: String(payload.sub),
      email: String(payload.email ?? "").toLowerCase(),
      emailVerified: payload.email_verified === true,
      name: typeof payload.name === "string" ? payload.name : "",
      nonce: typeof payload.nonce === "string" ? payload.nonce : undefined,
    };
  }

  /**
   * Signs in the Google account's Jobify user: by Google id, else by email (linking Google to
   * that account), else creates one if the role is known, else asks for it.
   */
  async complete(
    flow: GoogleFlow,
    claims: GoogleClaims,
    userAgent?: string,
  ): Promise<GoogleResult> {
    if (claims.nonce !== flow.nonce) throw new UnauthorizedException("Google sign-in didn't match");
    // Linking by email is only safe when Google has verified that the address is theirs.
    if (!claims.email || !claims.emailVerified) {
      throw new UnauthorizedException("Your Google account's email isn't verified");
    }

    const byGoogle = await this.prisma.user.findUnique({ where: { googleId: claims.sub } });
    if (byGoogle)
      return { kind: "signed-in", tokens: await this.auth.issueSession(byGoogle, userAgent) };

    const byEmail = await this.prisma.user.findUnique({ where: { email: claims.email } });
    if (byEmail) {
      const user = await this.prisma.user.update({
        where: { id: byEmail.id },
        // Google vouches for the address, so this also verifies it.
        data: { googleId: claims.sub, emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date() },
      });
      return { kind: "signed-in", tokens: await this.auth.issueSession(user, userAgent) };
    }

    const pending: GooglePending & { sub: string } = {
      sub: claims.sub,
      email: claims.email,
      fullName: claims.name,
    };
    if (flow.role) {
      return {
        kind: "signed-in",
        tokens: await this.createUser(pending, flow.role, claims.name || claims.email, userAgent),
      };
    }
    const pendingCookie = await this.jwt.signAsync(
      { ...pending },
      { audience: PENDING_AUDIENCE, expiresIn: FLOW_TTL },
    );
    return { kind: "pending", pendingCookie };
  }

  async readPending(cookie: string | undefined): Promise<GooglePending & { sub: string }> {
    const pending = cookie
      ? await this.jwt
          .verifyAsync<GooglePending & { sub: string }>(cookie, { audience: PENDING_AUDIENCE })
          .catch(() => null)
      : null;
    if (!pending) throw new UnauthorizedException("Google sign-up expired. Start again.");
    return pending;
  }

  /** A new account from Google: verified email, no password (they can set one later). */
  async createUser(
    pending: GooglePending & { sub: string },
    role: SignupRole,
    fullName: string,
    userAgent?: string,
  ): Promise<IssuedTokens> {
    const user = await this.auth.createAccount(
      {
        email: pending.email,
        role,
        fullName,
        googleId: pending.sub,
        emailVerifiedAt: new Date(),
      },
      userAgent,
    );
    return user;
  }
}
