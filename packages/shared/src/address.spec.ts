import { normalizeAddress } from "./address";

describe("normalizeAddress", () => {
  it("lowercases and trims", () => {
    expect(normalizeAddress("  TidePool.ZZ  ")).toEqual({
      ok: true,
      address: "tidepool.zz",
    });
  });

  it("strips fragments and queries", () => {
    expect(normalizeAddress("forest.zz#top?x=1")).toEqual({
      ok: true,
      address: "forest.zz",
    });
  });

  it("allows a single path segment", () => {
    expect(normalizeAddress("library.zz/stacks")).toEqual({
      ok: true,
      address: "library.zz/stacks",
    });
  });

  it("rejects schemes", () => {
    expect(normalizeAddress("http://tidepool.zz").ok).toBe(false);
    expect(normalizeAddress("javascript:alert(1)").ok).toBe(false);
  });

  it("rejects empty and invalid shapes", () => {
    expect(normalizeAddress("").ok).toBe(false);
    expect(normalizeAddress("not a host").ok).toBe(false);
    expect(normalizeAddress("tidepool.com").ok).toBe(false);
  });
});
