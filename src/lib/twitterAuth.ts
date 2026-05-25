import crypto from "node:crypto";

export const X_OAUTH_AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";
export const X_OAUTH_TOKEN_URL = "https://api.x.com/2/oauth2/token";
export const X_OAUTH_REVOKE_URL = "https://api.x.com/2/oauth2/revoke";
export const X_API_ME_URL = "https://api.x.com/2/users/me";
export const X_API_BASE_URL = "https://api.x.com/2";

export const X_OAUTH_SCOPES = ["users.read", "tweet.read", "tweet.write"] as const;

export function getOAuthScopes(): string[] {
  return [...X_OAUTH_SCOPES];
}

export const COOKIE_VERIFIER = "tw_pkce_verifier";
export const COOKIE_STATE = "tw_oauth_state";
export const COOKIE_RETURN_MODE = "tw_oauth_return_mode";
export const COOKIE_ACCESS_TOKEN = "tw_access_token";
export const COOKIE_REFRESH_TOKEN = "tw_refresh_token";

export type OAuthEnv = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export function getOAuthEnv(): OAuthEnv | null {
  const clientId = process.env.X_CLIENT_ID ?? "";
  const clientSecret = process.env.X_CLIENT_SECRET ?? "";
  const redirectUri = process.env.X_REDIRECT_URI ?? "";
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

export function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateCodeVerifier(): string {
  return base64UrlEncode(crypto.randomBytes(32));
}

export function generateState(): string {
  return base64UrlEncode(crypto.randomBytes(16));
}

export function basicAuthHeader(env: OAuthEnv): string {
  const token = Buffer.from(`${env.clientId}:${env.clientSecret}`).toString("base64");
  return `Basic ${token}`;
}

export function shortLivedCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds
  };
}

export function authCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds
  };
}

export function isReturnMode(mode: string | null | undefined): mode is "A" {
  return mode === "A";
}

export function buildAuthorizeUrl(env: OAuthEnv, state: string, codeVerifier: string): URL {
  const authorize = new URL(X_OAUTH_AUTHORIZE_URL);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", env.clientId);
  authorize.searchParams.set("redirect_uri", env.redirectUri);
  authorize.searchParams.set("scope", getOAuthScopes().join(" "));
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("code_challenge", codeVerifier);
  authorize.searchParams.set("code_challenge_method", "plain");
  return authorize;
}
