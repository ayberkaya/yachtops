import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { StoreType } from "@prisma/client";
import { z } from "zod";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";

const storeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.nativeEnum(StoreType),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const updateStoreSchema = storeSchema.partial();

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { scopedSession } = tenantResult;

    const stores = await db.shoppingStore.findMany({
      where: withTenantScope(scopedSession, {}),
      orderBy: { name: "asc" },
    });

    return NextResponse.json(stores);
  } catch (error) {
    console.error("Error fetching stores:", error);
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
    const validated = storeSchema.parse(body);

    const store = await db.shoppingStore.create({
      data: {
        yachtId: ensuredTenantId,
        name: validated.name,
        type: validated.type,
        address: validated.address || null,
        phone: validated.phone || null,
        notes: validated.notes || null,
      },
    });

    return NextResponse.json(store, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating store:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

