import { describe, expect, it } from "vitest";
import { calculateMetrics } from "./metrics";
import { generateSequence } from "./sequencer";
import type { Track } from "../types";

const tracks: Track[] = Array.from({ length: 20 }, (_, index) => ({
  id: String(index),
  uri: `spotify:track:${index}`,
  name: `Track ${index}`,
  album: "Test",
  artists: [
    {
      id: `artist-${Math.floor(index / 2)}`,
      name: `Artist ${Math.floor(index / 2)}`,
    },
  ],
}));

const settings = {
  seed: "same-seed",
  sessionSize: 12,
  artistCooldown: 3,
  recentPenalty: 80,
  rediscovery: 50,
  chaos: 65,
};

describe("generateSequence", () => {
  it("is deterministic for the same seed", () => {
    expect(generateSequence({ tracks, settings })).toEqual(
      generateSequence({ tracks, settings }),
    );
  });

  it("does not duplicate source tracks", () => {
    const result = generateSequence({
      tracks,
      settings: { ...settings, sessionSize: 20 },
    });

    expect(new Set(result.map((track) => track.uri)).size).toBe(result.length);
    expect(calculateMetrics(result).repeatedTracks).toBe(0);
  });

  it("honors the requested session size", () => {
    expect(generateSequence({ tracks, settings })).toHaveLength(12);
  });
});
