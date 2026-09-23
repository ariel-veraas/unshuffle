import type { Playlist, Track } from "../types";

const ARTISTS = [
  "Paper Moth",
  "Glass Harbor",
  "Static Bloom",
  "Nova Faye",
  "Concrete Garden",
  "Faint Signal",
  "Amber Loop",
  "Driftwood Choir",
  "Blue Hour",
  "Radio Silence",
  "Low Tide",
  "Echo Valley",
];

const TITLES = [
  "Afterglow",
  "Slow Fade",
  "Night Drive",
  "Static",
  "Halfway Home",
  "Burnt Orange",
  "Quiet Hours",
  "Undertow",
  "Paper Planes",
  "Streetlights",
  "Wildfire",
  "Blue Room",
  "Backroads",
  "Glasshouse",
];

function buildTrack(index: number): Track {
  const artist = ARTISTS[index % ARTISTS.length];
  return {
    id: String(index),
    uri: `demo:track:${index}`,
    name: TITLES[index % TITLES.length],
    album: `${artist} EP`,
    artists: [{ id: artist, name: artist }],
  };
}

const allTracks = Array.from({ length: 60 }, (_, index) => buildTrack(index));

export const demoPlaylists: Playlist[] = [
  { id: "demo-late-night", name: "Late Night Rotation", total: 40 },
  { id: "demo-gym", name: "Gym / High Energy", total: 20 },
];

export function getDemoTracks(playlistId: string): Track[] {
  return playlistId === "demo-gym" ? allTracks.slice(0, 20) : allTracks.slice(0, 40);
}

export const demoRecentTracks: Track[] = allTracks.slice(0, 10);
