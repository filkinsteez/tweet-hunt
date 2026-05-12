import { NextResponse, type NextRequest } from "next/server";
import {
  COOKIE_RETURN_MODE,
  COOKIE_STATE,
  COOKIE_VERIFIER,
  buildAuthorizeUrl,
  generateCodeVerifier,
  generateState,
  getOAuthEnv,
  isReturnMode,
  shortLivedCookieOptions
} from "@/lib/twitterAuth";

export const dynamic = "force-dynamic";

function redirectWithMissingConfig(request: NextRequest) {
  const target = new URL("/", request.url);
  target.searchParams.set("auth", "missing-config");
  return NextResponse.redirect(target);
}

export async function GET(request: NextRequest) {
  const env = getOAuthEnv();
  if (!env) {
    return redirectWithMissingConfig(request);
  }

  const verifier = generateCodeVerifier();
  const state = generateState();
  const requestedMode = request.nextUrl.searchParams.get("mode");

  const authorize = buildAuthorizeUrl(env, state, verifier);

  const response = NextResponse.redirect(authorize);
  const opts = shortLivedCookieOptions(60 * 10);
  response.cookies.set(COOKIE_VERIFIER, verifier, opts);
  response.cookies.set(COOKIE_STATE, state, opts);
  if (isReturnMode(requestedMode)) {
    response.cookies.set(COOKIE_RETURN_MODE, requestedMode, opts);
  }
  return response;
}
