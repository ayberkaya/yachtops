import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { z } from "zod";

const preferencesSchema = z.object({
  desktopEnabled: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  mentionEnabled: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { notificationPreferences: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const preferences = user.notificationPreferences
      ? JSON.parse(user.notificationPreferences)
      : {
          desktopEnabled: true,
          soundEnabled: true,
          mentionEnabled: true,
        };

    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = preferencesSchema.parse(body);

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { notificationPreferences: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentPreferences = user.notificationPreferences
      ? JSON.parse(user.notificationPreferences)
      : {
          desktopEnabled: true,
          soundEnabled: true,
          mentionEnabled: true,
        };

    const updatedPreferences = {
      ...currentPreferences,
      ...validated,
    };

    await db.user.update({
      where: { id: session.user.id },
      data: {
        notificationPreferences: JSON.stringify(updatedPreferences),
      },
    });

    return NextResponse.json(updatedPreferences);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating notification preferences:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

