import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { ShoppingListStatus } from "@prisma/client";
import { z } from "zod";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";

const listSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(ShoppingListStatus).optional(),
  tripId: z.string().optional().nullable(),
});

const updateListSchema = listSchema.partial();

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { scopedSession } = tenantResult;
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const baseWhere: any = {};

    if (status) {
      baseWhere.status = status;
    }

    const lists = await db.shoppingList.findMany({
      where: withTenantScope(scopedSession, baseWhere),
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        trip: {
          select: { id: true, name: true, code: true },
        },
        items: {
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(lists);
  } catch (error) {
    console.error("Error fetching shopping lists:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { tenantId } = tenantResult;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: "User must be assigned to a tenant" },
        { status: 400 }
      );
    }
    const ensuredTenantId = tenantId;

    const body = await request.json();
    const validated = listSchema.parse(body);

    // Fetch current user to ensure we have the correct user data
    const currentUser = await db.user.findUnique({
      where: { id: session!.user.id },
      select: { id: true, name: true, email: true },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const list = await db.shoppingList.create({
      data: {
        yachtId: ensuredTenantId,
        name: validated.name,
        description: validated.description || null,
        status: validated.status || ShoppingListStatus.DRAFT,
        tripId: validated.tripId || null,
        createdByUserId: session!.user.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        trip: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { items: true },
        },
      },
    });

    // Always use the current user for createdBy to ensure correctness
    const responseList = {
      ...list,
      createdBy: currentUser,
    };

    return NextResponse.json(responseList, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating shopping list:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

