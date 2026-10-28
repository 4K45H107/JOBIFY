import { describe, expect, it } from "vitest";
import { companyCreateSchema } from "./company";

describe("companyCreateSchema", () => {
  it("accepts a cleared website as null or blank", () => {
    expect(companyCreateSchema.parse({ name: "Acme", website: null }).website).toBeNull();
    expect(companyCreateSchema.parse({ name: "Acme", website: "  " }).website).toBeNull();
  });

  it("only accepts http(s) websites", () => {
    expect(
      companyCreateSchema.parse({ name: "Acme", website: "https://acme.example" }).website,
    ).toBe("https://acme.example");
    expect(
      companyCreateSchema.safeParse({ name: "Acme", website: "javascript:alert(1)" }).success,
    ).toBe(false);
    expect(companyCreateSchema.safeParse({ name: "Acme", website: "acme.example" }).success).toBe(
      false,
    );
  });

  it("accepts nulls for every optional field (what the web form sends)", () => {
    const blank = {
      industry: null,
      size: null,
      foundedYear: null,
      website: null,
      headquarters: null,
      description: null,
      mission: null,
    };
    expect(companyCreateSchema.safeParse({ name: "Acme", ...blank }).success).toBe(true);
  });
});
