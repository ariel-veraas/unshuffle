const TOKEN_KEY = "unshuffle.spotify.token";
const VERIFIER_KEY = "unshuffle.spotify.verifier";

type TokenState = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
};

const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined;
const configuredRedirect = import.meta.env.VITE_SPOTIFY_REDIRECT_URI as
  | string
  | undefined;
const redirectUri = configuredRedirect || window.location.origin + "/";

function base64Url(bytes: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function challenge(verifier: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return base64Url(digest);
}

function randomVerifier() {
  const bytes = crypto.getRandomValues(new Uint8Array(64));
  return base64Url(bytes.buffer);
}

function saveToken(token: TokenState) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
}

function loadToken(): TokenState | null {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY) || "null");
  } catch {
    return null;
  }
}

async function tokenRequest(params: URLSearchParams) {
  if (!clientId) throw new Error("Missing VITE_SPOTIFY_CLIENT_ID");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!response.ok) {
    throw new Error("Spotify token exchange failed");
  }

  return response.json();
}

export async function login() {
  if (!clientId) throw new Error("Add VITE_SPOTIFY_CLIENT_ID to .env");

  const verifier = randomVerifier();
  sessionStorage.setItem(VERIFIER_KEY, verifier);

  const codeChallenge = await challenge(verifier);
  const scopes = [
    "playlist-read-private",
    "playlist-read-collaborative",
    "playlist-modify-public",
    "playlist-modify-private",
    "user-read-recently-played",
    "user-read-private",
  ];

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    scope: scopes.join(" "),
  });

  window.location.assign(
    `https://accounts.spotify.com/authorize?${params.toString()}`,
  );
}

export async function handleCallback() {
  const code = new URLSearchParams(window.location.search).get("code");
  if (!code) return false;

  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier || !clientId) throw new Error("Missing PKCE verifier");

  const data = await tokenRequest(
    new URLSearchParams({
      client_id: clientId,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  );

  saveToken({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  });

  sessionStorage.removeItem(VERIFIER_KEY);
  history.replaceState({}, "", window.location.pathname);
  return true;
}

export async function getAccessToken(): Promise<string | null> {
  const token = loadToken();
  if (!token) return null;

  if (Date.now() < token.expiresAt - 60_000) {
    return token.accessToken;
  }

  if (!token.refreshToken || !clientId) return null;

  const data = await tokenRequest(
    new URLSearchParams({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
    }),
  );

  const refreshed = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || token.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  saveToken(refreshed);
  return refreshed.accessToken;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}
