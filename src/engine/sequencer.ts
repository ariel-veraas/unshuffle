import type { ShuffleSettings, Track } from "../types";
import { hashSeed, mulberry32 } from "./prng";

type Inputs = {
  tracks: Track[];
  recentUris?: string[];
  settings: ShuffleSettings;
};

function primaryArtist(track: Track) {
  return track.artists[0]?.id ?? track.artists[0]?.name ?? "unknown";
}

export function generateSequence({ tracks, recentUris = [], settings }: Inputs): Track[] {
  const rng = mulberry32(hashSeed(settings.seed || "unshuffle"));
  const recentRank = new Map(recentUris.map((uri, index) => [uri, index]));
  const remaining = [...tracks];
  const output: Track[] = [];
  const target = Math.min(settings.sessionSize, remaining.length);

  while (output.length < target && remaining.length) {
    const cooldownArtists = new Set(
      output.slice(-settings.artistCooldown).map(primaryArtist),
    );

    const scored = remaining.map((track, index) => {
      const artist = primaryArtist(track);
      const recentPosition = recentRank.get(track.uri);
      const recentFactor =
        recentPosition === undefined
          ? 1 + settings.rediscovery / 100
          : Math.max(
              0.02,
              1 -
                (settings.recentPenalty / 100) *
                  (1 - recentPosition / Math.max(1, recentUris.length)),
            );

      const cooldownFactor = cooldownArtists.has(artist) ? 0.015 : 1;
      const chaos = 0.15 + (settings.chaos / 100) * 0.85;
      const randomFactor = 1 - chaos + rng() * chaos;

      return { index, score: recentFactor * cooldownFactor * randomFactor };
    });

    scored.sort((a, b) => b.score - a.score);
    const choiceWindow = Math.min(5, scored.length);
    const pick = scored[Math.floor(rng() * choiceWindow)];

    output.push(remaining[pick.index]);
    remaining.splice(pick.index, 1);
  }

  return output;
}
