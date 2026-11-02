import { describe, expect, it } from "vitest";
import {
  changePasswordSchema,
  loginSchema,
  passwordSchema,
  registerSchema,
  resetPasswordSchema,
} from "./auth";

describe("passwordSchema", () => {
  it.each(["short1", "allletters", "12345678"])("rejects %s", (pw) => {
    expect(passwordSchema.safeParse(pw).success).toBe(false);
  });

  it("accepts letters and numbers of length 8+", () => {
    expect(passwordSchema.parse("Password123")).toBe("Password123");
  });
});

describe("registerSchema", () => {
  const valid = {
    fullName: " Ayesha Rahman ",
    email: " Ayesha@Example.COM ",
    password: "Password123",
    role: "SEEKER",
  };

  it("normalises email and trims the name", () => {
    expect(registerSchema.parse(valid)).toMatchObject({
      fullName: "Ayesha Rahman",
      email: "ayesha@example.com",
    });
  });

  it("does not allow signing up as ADMIN", () => {
    expect(registerSchema.safeParse({ ...valid, role: "ADMIN" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires a password", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});

describe("account security schemas", () => {
  it("refuses a new password equal to the current one", () => {
    const same = changePasswordSchema.safeParse({
      currentPassword: "Password123",
      newPassword: "Password123",
    });
    expect(same.success).toBe(false);
    expect(
      changePasswordSchema.safeParse({ currentPassword: "Password123", newPassword: "Other1234" })
        .success,
    ).toBe(true);
  });

  it("applies the password rules on reset and rejects junk tokens", () => {
    const token = "a".repeat(43);
    expect(resetPasswordSchema.safeParse({ token, password: "short" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ token: "x", password: "Password123" }).success).toBe(
      false,
    );
    expect(resetPasswordSchema.safeParse({ token, password: "Password123" }).success).toBe(true);
  });
});
