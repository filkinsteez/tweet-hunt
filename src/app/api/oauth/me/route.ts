import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_ACCESS_TOKEN, COOKIE_REFRESH_TOKEN, X_API_ME_URL } from "@/lib/twitterAuth";

export const dynamic = "force-dynamic";

type MeResponse = {
  data?: {
    id: string;
    name: string;
    username: string;
  };
};

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_ACCESS_TOKEN)?.value;
  if (!token) {
    return NextResponse.json({ authorized: false });
  }

  try {
    const apiResponse = await fetch(X_API_ME_URL, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store"
    });

    if (apiResponse.status === 401 || apiResponse.status === 403) {
      const stale = NextResponse.json({ authorized: false, expired: true });
      stale.cookies.delete(COOKIE_ACCESS_TOKEN);
      stale.cookies.delete(COOKIE_REFRESH_TOKEN);
      return stale;
    }
    if (!apiResponse.ok) {
      return NextResponse.json({ authorized: false });
    }

    const json = (await apiResponse.json()) as MeResponse;
    if (!json.data) {
      return NextResponse.json({ authorized: false });
    }

    return NextResponse.json({
      authorized: true,
      handle: json.data.username,
      name: json.data.name
    });
  } catch {
    return NextResponse.json({ authorized: false });
  }
}
