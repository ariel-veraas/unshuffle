import type { SequenceMetrics, Track } from "../types";

export function calculateMetrics(
  sequence: Track[],
  recentUris: string[] = [],
): SequenceMetrics {
  const artistIds = sequence.flatMap((track) =>
    track.artists.map((artist) => artist.id || artist.name),
  );
  const recent = new Set(recentUris);
  const seenTracks = new Set<string>();
  const lastArtistPosition = new Map<string, number>();

  let repeatedTracks = 0;
  let closestArtistRepeat: number | null = null;

  sequence.forEach((track, index) => {
    if (seenTracks.has(track.uri)) repeatedTracks += 1;
    seenTracks.add(track.uri);

    const artist = track.artists[0]?.id ?? track.artists[0]?.name;
    if (!artist) return;

    const previous = lastArtistPosition.get(artist);
    if (previous !== undefined) {
      const distance = index - previous;
      closestArtistRepeat =
        closestArtistRepeat === null
          ? distance
          : Math.min(closestArtistRepeat, distance);
    }
    lastArtistPosition.set(artist, index);
  });

  const uniqueArtists = new Set(artistIds).size;

  return {
    tracks: sequence.length,
    uniqueArtists,
    uniqueArtistRatio: sequence.length
      ? uniqueArtists / sequence.length
      : 0,
    repeatedTracks,
    recentTracksIncluded: sequence.filter((track) => recent.has(track.uri))
      .length,
    closestArtistRepeat,
  };
}
