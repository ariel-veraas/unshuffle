export type Track = {
  id: string;
  uri: string;
  name: string;
  album: string;
  albumImage?: string;
  artists: { id: string; name: string }[];
};

export type Playlist = {
  id: string;
  name: string;
  image?: string;
  total: number;
};

export type ShuffleSettings = {
  seed: string;
  sessionSize: number;
  artistCooldown: number;
  recentPenalty: number;
  rediscovery: number;
  chaos: number;
};

export type SequenceMetrics = {
  tracks: number;
  uniqueArtists: number;
  uniqueArtistRatio: number;
  repeatedTracks: number;
  recentTracksIncluded: number;
  closestArtistRepeat: number | null;
};
