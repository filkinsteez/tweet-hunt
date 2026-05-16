import { NextResponse, type NextRequest } from "next/server";
import {
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
  COOKIE_RETURN_MODE,
  COOKIE_STATE,
  COOKIE_VERIFIER,
  X_OAUTH_TOKEN_URL,
  authCookieOptions,
  basicAuthHeader,
  getOAuthEnv,
  isReturnMode
} from "@/lib/twitterAuth";

export const dynamic = "force-dynamic";

type TokenResponse = {
  token_type?: string;
  expires_in?: number;
  access_token?: string;
  scope?: string;
  refresh_token?: string;
};

function clearOAuthArtifacts(response: NextResponse) {
  response.cookies.delete(COOKIE_VERIFIER);
  response.cookies.delete(COOKIE_STATE);
  response.cookies.delete(COOKIE_RETURN_MODE);
  return response;
}

function redirectWithAuthError(request: NextRequest, auth: string) {
  const target = new URL("/", request.url);
  target.searchParams.set("auth", auth);
  return clearOAuthArtifacts(NextResponse.redirect(target));
}

export async function GET(request: NextRequest) {
  const env = getOAuthEnv();
  if (!env) {
    return clearOAuthArtifacts(NextResponse.redirect(new URL("/?auth=missing-config", request.url)));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  const verifierCookie = request.cookies.get(COOKIE_VERIFIER)?.value;
  const stateCookie = request.cookies.get(COOKIE_STATE)?.value;
  const returnMode = request.cookies.get(COOKIE_RETURN_MODE)?.value ?? "";

  if (oauthError) {
    return redirectWithAuthError(request, "denied");
  }
  if (!code || !state || !verifierCookie || !stateCookie || state !== stateCookie) {
    return redirectWithAuthError(request, "state-mismatch");
  }

  const params = new URLSearchParams();
  params.set("code", code);
  params.set("grant_type", "authorization_code");
  params.set("client_id", env.clientId);
  params.set("redirect_uri", env.redirectUri);
  params.set("code_verifier", verifierCookie);

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded"
  };
  const basic = basicAuthHeader(env);
  if (basic) headers.Authorization = basic;

  const tokenResponse = await fetch(X_OAUTH_TOKEN_URL, {
    method: "POST",
    headers,
    body: params.toString(),
    cache: "no-store"
  });

  if (!tokenResponse.ok) {
    return redirectWithAuthError(request, "token-error");
  }

  let token: TokenResponse;
  try {
    token = (await tokenResponse.json()) as TokenResponse;
  } catch {
    return redirectWithAuthError(request, "token-error");
  }
  if (!token.access_token || !token.expires_in) {
    return redirectWithAuthError(request, "token-error");
  }

  const target = new URL("/", request.url);
  target.searchParams.set("auth", "ok");
  if (isReturnMode(returnMode)) {
    target.searchParams.set("mode", returnMode);
  }

  const response = NextResponse.redirect(target);
  response.cookies.set(COOKIE_ACCESS_TOKEN, token.access_token, authCookieOptions(token.expires_in));
  if (token.refresh_token) {
    response.cookies.set(COOKIE_REFRESH_TOKEN, token.refresh_token, authCookieOptions(60 * 60 * 24 * 30));
  }
  return clearOAuthArtifacts(response);
}
