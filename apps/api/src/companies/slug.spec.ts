import { slugify } from "./slug";

describe("slugify", () => {
  it.each([
    ["Northwind Labs", "northwind-labs"],
    ["  Café Déjà-Vu!! ", "cafe-deja-vu"],
    ["A&B  Ltd.", "a-b-ltd"],
    ["!!!", "company"],
  ])("%s -> %s", (input, slug) => {
    expect(slugify(input)).toBe(slug);
  });
});
