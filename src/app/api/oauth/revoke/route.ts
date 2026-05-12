import { NextResponse, type NextRequest } from "next/server";
import {
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
  X_OAUTH_REVOKE_URL,
  basicAuthHeader,
  getOAuthEnv
} from "@/lib/twitterAuth";

export const dynamic = "force-dynamic";

async function revokeToken(token: string, hint: "access_token" | "refresh_token") {
  const env = getOAuthEnv();
  if (!env) return;

  const params = new URLSearchParams();
  params.set("token", token);
  params.set("token_type_hint", hint);
  params.set("client_id", env.clientId);

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization: basicAuthHeader(env)
  };

  try {
    await fetch(X_OAUTH_REVOKE_URL, {
      method: "POST",
      headers,
      body: params.toString(),
      cache: "no-store"
    });
  } catch {
    // ignore network errors during revoke; we still clear cookies below
  }
}

export async function POST(request: NextRequest) {
  const access = request.cookies.get(COOKIE_ACCESS_TOKEN)?.value;
  const refresh = request.cookies.get(COOKIE_REFRESH_TOKEN)?.value;

  if (access) await revokeToken(access, "access_token");
  if (refresh) await revokeToken(refresh, "refresh_token");

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(COOKIE_ACCESS_TOKEN);
  response.cookies.delete(COOKIE_REFRESH_TOKEN);
  return response;
}
