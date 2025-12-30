import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { DashboardWidgets, WidgetType } from "@/types/widgets";
import { getUserWidgetSettings } from "@/lib/dashboard/widget-settings";
import { z } from "zod";
import { withEgressLogging } from "@/lib/egress-middleware";

const updateWidgetsSchema = z.object({
  widgets: z.array(
    z.object({
      id:       z.custom<WidgetType>((val) => {
        const validWidgetTypes: WidgetType[] = [
          "cash_ledger_summary",
          "credit_card_expenses",
          "pending_expenses",
          "recent_expenses",
          "upcoming_trips",
          "my_tasks",
          "role_tasks_alert",
          "upcoming_maintenance",
          "expiring_permissions",
          "low_stock_alert",
          "monthly_report",
          "quick_stats",
          "calendar_events",
        ];
        return typeof val === "string" && validWidgetTypes.includes(val as WidgetType);
      }),
      enabled: z.boolean(),
      order: z.number(),
      size: z.enum(["small", "medium", "large", "full"]).optional(),
    })
  ),
});

export const GET = withEgressLogging(async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use the centralized helper function
    const widgets = await getUserWidgetSettings(session.user.id);

    // Cache for 5 minutes - widgets don't change frequently
    return NextResponse.json({ widgets }, {
      headers: {
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard widgets:", error);
    
    // Handle user not found error
    if (error instanceof Error && error.message === "User not found") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    return NextResponse.json(
      { error: "Failed to fetch dashboard widgets" },
      { status: 500 }
    );
  }
});

export const PUT = withEgressLogging(async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = updateWidgetsSchema.parse(body);

    const dashboardWidgets: DashboardWidgets = {
      widgets: validated.widgets,
      lastUpdated: new Date().toISOString(),
    };

    await db.user.update({
      where: { id: session.user.id },
      data: {
        dashboardWidgets: JSON.stringify(dashboardWidgets),
      },
    });

    return NextResponse.json({ success: true, widgets: dashboardWidgets.widgets });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Zod validation error:", error.issues);
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating dashboard widgets:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to update dashboard widgets", message: errorMessage },
      { status: 500 }
    );
  }
});

