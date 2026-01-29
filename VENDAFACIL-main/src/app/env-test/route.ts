import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ? "OK" : "MISSING",
    anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "OK" : "MISSING",
  });
}
