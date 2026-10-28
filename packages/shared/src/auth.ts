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

export const MembershipStatus = z.enum(["PENDING", "ACTIVE", "REJECTED"]);
export type MembershipStatus = z.infer<typeof MembershipStatus>;

/** The signed-in user as returned by GET /api/auth/me. */
export const authUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: UserRole,
  fullName: z.string().nullable(),
  photoUrl: z.string().nullable(),
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
