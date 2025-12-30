import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { sendCalendarEventReminders } from "@/lib/notifications";

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

    // Get hoursBefore from query params or body, default to 24
    const { searchParams } = new URL(request.url);
    const hoursBeforeParam = searchParams.get("hoursBefore");
    const hoursBefore = hoursBeforeParam ? parseInt(hoursBeforeParam, 10) : 24;

    if (isNaN(hoursBefore) || hoursBefore < 0) {
      return NextResponse.json(
        { error: "Invalid hoursBefore parameter" },
        { status: 400 }
      );
    }

    const reminderCount = await sendCalendarEventReminders(hoursBefore);

    return NextResponse.json({
      success: true,
      message: `Sent ${reminderCount} calendar event reminders`,
      reminderCount,
    });
  } catch (error) {
    console.error("Error sending calendar event reminders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

