import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { DashboardWidgets, WidgetConfig, DEFAULT_WIDGETS, WidgetType } from "@/types/widgets";
import { z } from "zod";

const updateWidgetsSchema = z.object({
  widgets: z.array(
    z.object({
      id: z.string() as z.ZodType<WidgetType>,
      enabled: z.boolean(),
      order: z.number(),
      size: z.enum(["small", "medium", "large", "full"]).optional(),
    })
  ),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { dashboardWidgets: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let widgets: WidgetConfig[] = [];

    if (user.dashboardWidgets) {
      try {
        const parsed = JSON.parse(user.dashboardWidgets) as DashboardWidgets;
        widgets = parsed.widgets || [];
      } catch (error) {
        console.error("Error parsing dashboard widgets:", error);
      }
    }

    // If no widgets configured, return defaults for user role
    if (widgets.length === 0) {
      widgets = DEFAULT_WIDGETS[user.role as keyof typeof DEFAULT_WIDGETS] || [];
    }

    return NextResponse.json({ widgets });
  } catch (error) {
    console.error("Error fetching dashboard widgets:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard widgets" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating dashboard widgets:", error);
    return NextResponse.json(
      { error: "Failed to update dashboard widgets" },
      { status: 500 }
    );
  }
}

