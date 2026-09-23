import { describe, expect, it } from "vitest";
import { hashSeed, mulberry32 } from "./prng";

describe("hashSeed", () => {
  it("is deterministic for the same input", () => {
    expect(hashSeed("unshuffle")).toBe(hashSeed("unshuffle"));
  });

  it("produces different hashes for different seeds", () => {
    expect(hashSeed("seed-a")).not.toBe(hashSeed("seed-b"));
  });

  it("always returns an unsigned 32-bit integer", () => {
    const hash = hashSeed("");
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThan(2 ** 32);
  });
});

describe("mulberry32", () => {
  it("produces the same sequence for the same seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);

    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("produces values in the [0, 1) range", () => {
    const rng = mulberry32(hashSeed("range-check"));
    for (let i = 0; i < 50; i += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("diverges for different seeds", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);

    expect(a()).not.toBe(b());
  });
});
