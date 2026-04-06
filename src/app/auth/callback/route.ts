import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  return NextResponse.json({
    message: "OAuth callback placeholder",
    hasCode: Boolean(code),
  });
}
