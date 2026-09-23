import { useEffect, useMemo, useState } from "react";
import { calculateMetrics } from "./engine/metrics";
import { generateSequence } from "./engine/sequencer";
import { getAccessToken, handleCallback, login, logout } from "./spotify/auth";
import {
  exportSequence,
  getPlaylistTracks,
  getPlaylists,
  getRecentTracks,
} from "./spotify/api";
import { demoPlaylists, demoRecentTracks, getDemoTracks } from "./spotify/demoData";
import type { Playlist, ShuffleSettings, Track } from "./types";

const defaults: ShuffleSettings = {
  seed: new Date().toISOString().slice(0, 10),
  sessionSize: 40,
  artistCooldown: 6,
  recentPenalty: 90,
  rediscovery: 70,
  chaos: 65,
};

type Mode = "guest" | "demo" | "live";

export default function App() {
  const [mode, setMode] = useState<Mode>("guest");
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selected, setSelected] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [recent, setRecent] = useState<Track[]>([]);
  const [settings, setSettings] = useState<ShuffleSettings>(defaults);
  const [sequence, setSequence] = useState<Track[]>([]);
  const [status, setStatus] = useState("Ready.");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        await handleCallback();
        const token = await getAccessToken();
        if (token) setMode("live");
      } catch (error) {
        setStatus(
          error instanceof Error ? error.message : "Authentication failed",
        );
      }
    })();
  }, []);

  useEffect(() => {
    if (mode === "guest") return;

    if (mode === "demo") {
      setPlaylists(demoPlaylists);
      setRecent(demoRecentTracks);
      setStatus("Loaded demo playlists with sample data.");
      return;
    }

    void (async () => {
      setBusy(true);
      try {
        const [playlistData, recentData] = await Promise.all([
          getPlaylists(),
          getRecentTracks(),
        ]);
        setPlaylists(playlistData);
        setRecent(recentData);
        setStatus(
          `Loaded ${playlistData.length} playlists and ${recentData.length} recent tracks.`,
        );
      } catch (error) {
        setStatus(
          error instanceof Error ? error.message : "Could not load Spotify",
        );
      } finally {
        setBusy(false);
      }
    })();
  }, [mode]);

  const metrics = useMemo(
    () => calculateMetrics(sequence, recent.map((track) => track.uri)),
    [sequence, recent],
  );

  async function loadPlaylist(id: string) {
    setSelected(id);
    setSequence([]);
    if (!id) return;

    if (mode === "demo") {
      const data = getDemoTracks(id);
      setTracks(data);
      setSettings((current) => ({
        ...current,
        sessionSize: Math.min(current.sessionSize, data.length),
      }));
      setStatus(`Loaded ${data.length} sample tracks.`);
      return;
    }

    setBusy(true);
    try {
      const data = await getPlaylistTracks(id);
      setTracks(data);
      setSettings((current) => ({
        ...current,
        sessionSize: Math.min(current.sessionSize, data.length),
      }));
      setStatus(`Loaded ${data.length} playable tracks.`);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not load playlist",
      );
    } finally {
      setBusy(false);
    }
  }

  function generate() {
    const result = generateSequence({
      tracks,
      recentUris: recent.map((track) => track.uri),
      settings,
    });
    setSequence(result);
    setStatus(
      `Generated ${result.length} tracks with seed “${settings.seed}”.`,
    );
  }

  async function saveToSpotify() {
    if (!sequence.length) return;

    if (mode === "demo") {
      setStatus("Connect your real Spotify account to export sessions.");
      return;
    }

    setBusy(true);
    try {
      const playlist = playlists.find((item) => item.id === selected);
      const url = await exportSequence(
        `Unshuffle · ${playlist?.name ?? "Session"}`,
        sequence,
      );
      window.open(url, "_blank", "noopener,noreferrer");
      setStatus("Exported to a private Spotify playlist.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  if (mode === "guest") {
    return (
      <main className="shell hero">
        <div className="eyebrow">YOUR MUSIC. YOUR ALGORITHM.</div>
        <h1>Unshuffle</h1>
        <p className="lede">
          A transparent, user-controlled alternative to black-box shuffle.
        </p>
        <div className="actions">
          <button
            className="primary"
            onClick={() =>
              login().catch((error: Error) => setStatus(error.message))
            }
          >
            Connect Spotify
          </button>
          <button className="ghost" onClick={() => setMode("demo")}>
            Try the demo · sample data
          </button>
        </div>
        <p className="status">{status}</p>
      </main>
    );
  }

  return (
    <main className="shell">
      <header>
        <div>
          <div className="eyebrow">
            {mode === "demo" ? "DEMO · SAMPLE DATA" : "SEQUENCING LAB"}
          </div>
          <h1>Unshuffle</h1>
        </div>
        <button
          className="ghost"
          onClick={() => {
            if (mode === "live") logout();
            setMode("guest");
            setPlaylists([]);
            setTracks([]);
            setRecent([]);
            setSequence([]);
            setSelected("");
            setStatus("Ready.");
          }}
        >
          {mode === "demo" ? "Exit demo" : "Disconnect"}
        </button>
      </header>

      <section className="panel">
        <label htmlFor="playlist">Source playlist</label>
        <select
          id="playlist"
          value={selected}
          onChange={(event) => void loadPlaylist(event.target.value)}
          disabled={busy}
        >
          <option value="">Choose a playlist…</option>
          {playlists.map((playlist) => (
            <option key={playlist.id} value={playlist.id}>
              {playlist.name} · {playlist.total} tracks
            </option>
          ))}
        </select>
      </section>

      <section className="grid">
        <div className="panel controls">
          <h2>Rules</h2>
          <Control
            label="Session size"
            value={settings.sessionSize}
            min={tracks.length ? 1 : 0}
            max={Math.max(1, tracks.length)}
            onChange={(value) =>
              setSettings({ ...settings, sessionSize: value })
            }
          />
          <Control
            label="Artist cooldown"
            value={settings.artistCooldown}
            min={0}
            max={20}
            onChange={(value) =>
              setSettings({ ...settings, artistCooldown: value })
            }
          />
          <Control
            label="Recent penalty"
            value={settings.recentPenalty}
            min={0}
            max={100}
            suffix="%"
            onChange={(value) =>
              setSettings({ ...settings, recentPenalty: value })
            }
          />
          <Control
            label="Rediscovery"
            value={settings.rediscovery}
            min={0}
            max={100}
            suffix="%"
            onChange={(value) =>
              setSettings({ ...settings, rediscovery: value })
            }
          />
          <Control
            label="Chaos"
            value={settings.chaos}
            min={0}
            max={100}
            suffix="%"
            onChange={(value) => setSettings({ ...settings, chaos: value })}
          />

          <label htmlFor="seed">Seed</label>
          <input
            id="seed"
            value={settings.seed}
            onChange={(event) =>
              setSettings({ ...settings, seed: event.target.value })
            }
          />

          <div className="actions">
            <button
              className="primary"
              disabled={!tracks.length || busy}
              onClick={generate}
            >
              Generate session
            </button>
            <button
              className="ghost"
              disabled={!sequence.length || busy}
              onClick={() => void saveToSpotify()}
            >
              Export to Spotify
            </button>
          </div>
        </div>

        <div className="panel">
          <h2>Session audit</h2>
          <div className="metrics">
            <Metric label="Tracks" value={metrics.tracks} />
            <Metric label="Unique artists" value={metrics.uniqueArtists} />
            <Metric
              label="Artist diversity"
              value={`${Math.round(metrics.uniqueArtistRatio * 100)}%`}
            />
            <Metric
              label="Recent tracks"
              value={metrics.recentTracksIncluded}
            />
            <Metric
              label="Duplicate tracks"
              value={metrics.repeatedTracks}
            />
            <Metric
              label="Closest artist repeat"
              value={
                metrics.closestArtistRepeat
                  ? `${metrics.closestArtistRepeat} tracks`
                  : "None"
              }
            />
          </div>
          <p className="status">{busy ? "Working…" : status}</p>
        </div>
      </section>

      <section className="panel">
        <div className="sectionTitle">
          <h2>Generated order</h2>
          <span>
            {sequence.length ? `${sequence.length} tracks` : "No session yet"}
          </span>
        </div>

        <ol className="tracklist">
          {sequence.map((track) => (
            <li key={track.uri}>
              {track.albumImage ? (
                <img src={track.albumImage} alt="" />
              ) : (
                <div className="cover" />
              )}
              <div>
                <strong>{track.name}</strong>
                <span>
                  {track.artists.map((artist) => artist.name).join(", ")} ·{" "}
                  {track.album}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

function Control({
  label,
  value,
  min,
  max,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="control">
      <div>
        <label>{label}</label>
        <span>
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
