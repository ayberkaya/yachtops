import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { ItemUnit } from "@prisma/client";
import { z } from "zod";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  defaultUnit: z.nativeEnum(ItemUnit).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { scopedSession } = tenantResult;

    const products = await db.product.findMany({
      where: withTenantScope(scopedSession, {}),
      orderBy: { name: "asc" },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
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
    const validated = productSchema.parse(body);

    const product = await db.product.create({
      data: {
        yachtId: ensuredTenantId,
        name: validated.name,
        defaultUnit: validated.defaultUnit || ItemUnit.PIECE,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

