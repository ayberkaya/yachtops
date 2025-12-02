import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { checkDueDates } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER/CAPTAIN can trigger this check
    if (session.user.role === "CREW") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await checkDueDates();

    return NextResponse.json({ success: true, message: "Due dates checked" });
  } catch (error) {
    console.error("Error checking due dates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

