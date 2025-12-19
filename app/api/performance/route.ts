import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { canManageUsers } from "@/lib/auth";
import { db } from "@/lib/db";
import { TaskStatus } from "@prisma/client";
import { format } from "date-fns";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { scopedSession } = tenantResult;
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // OWNER/CAPTAIN can view all users' performance, CREW can only view their own
    const targetUserId = userId && canManageUsers(session.user) 
      ? userId 
      : session.user.id;

    const baseWhere: any = {
      status: TaskStatus.DONE,
      completedById: targetUserId,
    };

    if (startDate || endDate) {
      baseWhere.completedAt = {};
      if (startDate) {
        baseWhere.completedAt.gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        baseWhere.completedAt.lte = endDateTime;
      }
    }

    const completedTasks = await db.task.findMany({
      where: withTenantScope(scopedSession, baseWhere),
      include: {
        completedBy: {
          select: { id: true, name: true, email: true },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
        trip: {
          select: { id: true, name: true },
        },
      },
      orderBy: { completedAt: "desc" },
    });

    // Group by date
    const tasksByDate: Record<string, typeof completedTasks> = {};
    completedTasks.forEach((task: { completedAt: Date | null }) => {
      if (task.completedAt) {
        const dateKey = format(new Date(task.completedAt), "yyyy-MM-dd");
        if (!tasksByDate[dateKey]) {
          tasksByDate[dateKey] = [];
        }
        tasksByDate[dateKey].push(task);
      }
    });

    return NextResponse.json({
      tasks: completedTasks,
      tasksByDate,
      totalCompleted: completedTasks.length,
    });
  } catch (error) {
    console.error("Error fetching performance data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

