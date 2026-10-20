import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { exportAttendanceCSV } from "@/server/services/ownerService";
import { todayVN } from "@/lib/time";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["OWNER"]);
    const csv = await exportAttendanceCSV();

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="cham_cong_${todayVN()}.csv"`,
      },
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return new NextResponse("Unauthorized", { status: 403 });
    }
    return new NextResponse("Error generating CSV", { status: 500 });
  }
}
