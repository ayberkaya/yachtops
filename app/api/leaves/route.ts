import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { getTenantId, isPlatformAdmin } from "@/lib/tenant";
import { z } from "zod";

// Define enums manually to avoid Prisma client import issues
const LeaveType = {
  ANNUAL_LEAVE: "ANNUAL_LEAVE",
  SICK_LEAVE: "SICK_LEAVE",
  PERSONAL_LEAVE: "PERSONAL_LEAVE",
  EMERGENCY_LEAVE: "EMERGENCY_LEAVE",
} as const;

const LeaveStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

type LeaveType = typeof LeaveType[keyof typeof LeaveType];
type LeaveStatus = typeof LeaveStatus[keyof typeof LeaveStatus];

const createLeaveSchema = z.object({
  userId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  type: z.nativeEnum(LeaveType),
  reason: z.string().optional().nullable(),
  status: z.nativeEnum(LeaveStatus).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.yachtId) {
      return NextResponse.json({ error: "No yacht assigned" }, { status: 400 });
    }

    // Check permission
    if (!hasPermission(session.user, "users.view", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {
      yachtId: session.user.yachtId,
    };

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.OR = [];
      if (startDate && endDate) {
        // Find leaves that overlap with the date range
        where.OR.push({
          AND: [
            { startDate: { lte: new Date(endDate) } },
            { endDate: { gte: new Date(startDate) } },
          ],
        });
      } else if (startDate) {
        where.OR.push({
          endDate: { gte: new Date(startDate) },
        });
      } else if (endDate) {
        where.OR.push({
          startDate: { lte: new Date(endDate) },
        });
      }
    }

    console.log("GET /api/leaves - db.leave exists:", !!db.leave);
    if (!db.leave) {
      console.error("db.leave is undefined in GET handler!");
      return NextResponse.json(
        {
          error: "Database configuration error",
          message: "Leave model not found in Prisma client. Please restart the development server.",
        },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const leaves = await db.leave.findMany({
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
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { startDate: "asc" },
      ],
    });

    return NextResponse.json(
      leaves.map((leave) => ({
        ...leave,
        startDate: leave.startDate.toISOString().split("T")[0],
        endDate: leave.endDate.toISOString().split("T")[0],
        createdAt: leave.createdAt.toISOString(),
        updatedAt: leave.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Error fetching leaves:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log("=== POST /api/leaves - Starting ===");
  try {
    console.log("Getting session...");
    const session = await getSession();
    console.log("Session:", session ? "exists" : "null");
    
    if (!session?.user) {
      console.log("No session or user");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!session.user.yachtId) {
      console.log("No yachtId in session");
      return NextResponse.json(
        { error: "No yacht assigned" },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check permission - users.view is enough to create leaves
    if (!hasPermission(session.user, "users.view", session.user.permissions)) {
      console.log("Permission denied");
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Parsing request body...");
    let body;
    try {
      body = await request.json();
      console.log("Request body:", JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Validating schema...");
    let validated;
    try {
      validated = createLeaveSchema.parse(body);
      console.log("Validation passed:", validated);
    } catch (validationError) {
      console.error("Validation error:", validationError);
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid input", details: validationError.issues },
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      throw validationError;
    }

    // Verify user belongs to same yacht
    console.log("Fetching user from database...");
    let user;
    try {
      user = await db.user.findUnique({
        where: { id: validated.userId },
        select: { yachtId: true },
      });
      console.log("User found:", user ? `yachtId: ${user.yachtId}` : "not found");
    } catch (dbError: any) {
      console.error("Database error fetching user:", dbError);
      console.error("Error code:", dbError?.code);
      console.error("Error message:", dbError?.message);
      return NextResponse.json(
        { error: "Database error", message: "Failed to verify user", details: dbError?.message },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!user || user.yachtId !== session.user.yachtId) {
      console.log("User validation failed:", { userExists: !!user, userYachtId: user?.yachtId, sessionYachtId: session.user.yachtId });
      return NextResponse.json(
        { error: "Invalid user" },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check for overlapping leaves
    console.log("Checking for overlapping leaves...");
    let overlappingLeaves;
    try {
      overlappingLeaves = await db.leave.findFirst({
        where: {
          userId: validated.userId,
          yachtId: session.user.yachtId,
          startDate: { lte: new Date(validated.endDate) },
          endDate: { gte: new Date(validated.startDate) },
        },
      });
      console.log("Overlapping leaves check:", overlappingLeaves ? "found" : "none");
    } catch (dbError: any) {
      console.error("Database error checking overlapping leaves:", dbError);
      console.error("Error code:", dbError?.code);
      console.error("Error message:", dbError?.message);
      // If table doesn't exist, this will fail - but we'll catch it in the create
      overlappingLeaves = null;
    }

    if (overlappingLeaves) {
      return NextResponse.json(
        { error: "Leave already exists for this date range" },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Creating leave in database...");
    console.log("db.leave exists:", !!db.leave);
    console.log("db keys:", Object.keys(db).filter(k => k.toLowerCase().includes('leave')));
    
    if (!db.leave) {
      console.error("db.leave is undefined! Prisma client may not be generated correctly.");
      return NextResponse.json(
        {
          error: "Database configuration error",
          message: "Leave model not found in Prisma client. Please restart the development server.",
        },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    let leave;
    try {
      leave = await db.leave.create({
        data: {
          yachtId: session.user.yachtId,
          userId: validated.userId,
          startDate: new Date(validated.startDate),
          endDate: new Date(validated.endDate),
          type: validated.type,
          reason: validated.reason || null,
          status: (validated.status as any) || "PENDING",
          createdByUserId: session.user.id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    } catch (dbError: any) {
      console.error("=== Database error creating leave ===");
      console.error("Error code:", dbError?.code);
      console.error("Error message:", dbError?.message);
      console.error("Error meta:", dbError?.meta);
      console.error("Full error:", JSON.stringify(dbError, Object.getOwnPropertyNames(dbError)));
      
      // Check if it's a table doesn't exist error
      if (dbError?.code === "42P01" || dbError?.message?.includes("does not exist")) {
        return NextResponse.json(
          { 
            error: "Database table not found. Please run migrations.",
            details: "The 'leaves' table does not exist. Run: npx prisma migrate deploy"
          },
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Return detailed error for debugging
      const errorResponse = {
        error: "Database error",
        message: dbError?.message || "Failed to create leave",
        code: dbError?.code,
        ...(process.env.NODE_ENV === "development" 
          ? { 
              meta: dbError?.meta,
              stack: dbError?.stack?.substring(0, 500),
            } 
          : {}),
      };
      
      console.error("Returning error response:", JSON.stringify(errorResponse, null, 2));
      
      return NextResponse.json(
        errorResponse,
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Leave created successfully:", leave.id);
    return NextResponse.json(
      {
        ...leave,
        startDate: leave.startDate.toISOString().split("T")[0],
        endDate: leave.endDate.toISOString().split("T")[0],
        createdAt: leave.createdAt.toISOString(),
        updatedAt: leave.updatedAt.toISOString(),
      },
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("=== ERROR IN POST /api/leaves ===");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack");
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Ensure we always return JSON, even if something goes wrong
    try {
      return NextResponse.json(
        {
          error: "Internal server error",
          message: errorMessage,
          ...(process.env.NODE_ENV === "development" && errorStack
            ? { stack: errorStack }
            : {}),
        },
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (responseError) {
      // Fallback if JSON creation fails
      console.error("Failed to create error response:", responseError);
      return new NextResponse(
        JSON.stringify({ error: "Internal server error", message: "Failed to process request" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }
}
