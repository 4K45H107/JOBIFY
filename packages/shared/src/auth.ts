import { z } from "zod";
import { UserRole } from "./roles";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email("Enter a valid email address"));

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Use at most 128 characters")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

/** Only seekers and employers can sign up. Admins are created by hand. */
export const SignupRole = UserRole.extract(["SEEKER", "EMPLOYER"]);
export type SignupRole = z.infer<typeof SignupRole>;

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(80),
  email: emailSchema,
  password: passwordSchema,
  role: SignupRole,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Link tokens are 43 base64url characters; accept a little slack, reject junk early. */
const linkToken = z.string().trim().min(20).max(200);

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({ token: linkToken, password: passwordSchema });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password").max(128),
    newPassword: passwordSchema,
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "Choose a password different from the current one",
    path: ["newPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const verifyEmailSchema = z.object({ token: linkToken });
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

/** Which sign-in methods are switched on (Google needs its OAuth client configured). */
export const authProvidersSchema = z.object({ google: z.boolean() });
export type AuthProviders = z.infer<typeof authProvidersSchema>;

/** A first Google sign-in, before the account exists: what Google told us. */
export const googlePendingSchema = z.object({ email: z.string(), fullName: z.string() });
export type GooglePending = z.infer<typeof googlePendingSchema>;

/** Finishing a first Google sign-in: Google doesn't know whether they're hiring. */
export const googleSignupSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(80),
  role: SignupRole,
});
export type GoogleSignupInput = z.infer<typeof googleSignupSchema>;

/** How long emailed links work. */
export const EMAIL_VERIFICATION_TTL_HOURS = 48;
export const PASSWORD_RESET_TTL_MINUTES = 60;

export const MembershipStatus = z.enum(["PENDING", "ACTIVE", "REJECTED"]);
export type MembershipStatus = z.infer<typeof MembershipStatus>;

/** The signed-in user as returned by GET /api/auth/me. */
export const authUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: UserRole,
  fullName: z.string().nullable(),
  photoUrl: z.string().nullable(),
  /** Applying to and posting jobs need a verified email. */
  emailVerified: z.boolean(),
  /** False for Google-only accounts: they set one with "Forgot password". */
  hasPassword: z.boolean(),
  company: z
    .object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      role: z.enum(["ADMIN", "RECRUITER"]),
      status: MembershipStatus,
    })
    .nullable(),
});
export type AuthUser = z.infer<typeof authUserSchema>;
