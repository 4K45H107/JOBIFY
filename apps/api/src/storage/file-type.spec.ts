import { sniffContentType } from "./file-type";

describe("sniffContentType", () => {
  it.each([
    ["application/pdf", Buffer.from("%PDF-1.7\n...")],
    ["image/png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])],
    ["image/jpeg", Buffer.from([0xff, 0xd8, 0xff, 0xe0])],
    ["image/webp", Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBPVP8 ")])],
  ])("detects %s", (type, buffer) => {
    expect(sniffContentType(buffer)).toBe(type);
  });

  it("rejects anything else, even when renamed", () => {
    expect(sniffContentType(Buffer.from("<html><script>alert(1)</script>"))).toBeNull();
    expect(sniffContentType(Buffer.from("MZ\x90\x00"))).toBeNull();
  });
});
