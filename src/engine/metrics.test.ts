import { describe, expect, it } from "vitest";
import { calculateMetrics } from "./metrics";
import type { Track } from "../types";

function track(uri: string, artistId: string): Track {
  return {
    id: uri,
    uri,
    name: uri,
    album: "Test",
    artists: [{ id: artistId, name: artistId }],
  };
}

describe("calculateMetrics", () => {
  it("counts unique artists and diversity ratio", () => {
    const metrics = calculateMetrics([
      track("a", "artist-1"),
      track("b", "artist-2"),
      track("c", "artist-1"),
    ]);

    expect(metrics.tracks).toBe(3);
    expect(metrics.uniqueArtists).toBe(2);
    expect(metrics.uniqueArtistRatio).toBeCloseTo(2 / 3);
  });

  it("flags duplicate tracks by uri", () => {
    const metrics = calculateMetrics([
      track("a", "artist-1"),
      track("a", "artist-1"),
    ]);

    expect(metrics.repeatedTracks).toBe(1);
  });

  it("finds the closest repeat distance for the same artist", () => {
    const metrics = calculateMetrics([
      track("a", "artist-1"),
      track("b", "artist-2"),
      track("c", "artist-1"),
      track("d", "artist-1"),
    ]);

    expect(metrics.closestArtistRepeat).toBe(1);
  });

  it("reports no repeat when every artist is unique", () => {
    const metrics = calculateMetrics([
      track("a", "artist-1"),
      track("b", "artist-2"),
    ]);

    expect(metrics.closestArtistRepeat).toBeNull();
  });

  it("counts recent tracks included from the recent-uri list", () => {
    const metrics = calculateMetrics(
      [track("a", "artist-1"), track("b", "artist-2")],
      ["a"],
    );

    expect(metrics.recentTracksIncluded).toBe(1);
  });

  it("handles an empty sequence", () => {
    const metrics = calculateMetrics([]);

    expect(metrics.tracks).toBe(0);
    expect(metrics.uniqueArtistRatio).toBe(0);
    expect(metrics.closestArtistRepeat).toBeNull();
  });
});
