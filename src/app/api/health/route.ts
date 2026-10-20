import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/server/db/pool";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const pool = getPool();
    await pool.execute("SELECT 1");
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    // Do NOT include error details or stack traces in the response
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
