import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { z } from "zod";

const feedbackSchema = z.object({
  type: z.enum(["bug", "feature", "question", "other"]),
  message: z.string().min(1, "Message is required"),
  page: z.string().optional(),
  action: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = feedbackSchema.parse(body);

    // Create feedback entry
    await db.feedback.create({
      data: {
        userId: session.user.id,
        yachtId: session.user.yachtId || null,
        type: validated.type,
        message: validated.message,
        page: validated.page || null,
        action: validated.action || null,
        metadata: validated.metadata || undefined,
        status: "new",
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Feedback submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only super admins can view all feedback
    // Users can view their own feedback
    const { searchParams } = new URL(request.url);
    const yachtId = session.user.yachtId;
    const isSuperAdmin = session.user.role === "SUPER_ADMIN";

    const where: any = {};
    
    if (isSuperAdmin) {
      // Super admin can see all feedback
      const requestedYachtId = searchParams.get("yachtId");
      if (requestedYachtId) {
        where.yachtId = requestedYachtId;
      }
    } else {
      // Regular users see only their own feedback
      where.userId = session.user.id;
      if (yachtId) {
        where.yachtId = yachtId;
      }
    }

    const status = searchParams.get("status");
    if (status) {
      where.status = status;
    }

    const feedback = await db.feedback.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        yacht: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    return NextResponse.json(feedback);
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}

