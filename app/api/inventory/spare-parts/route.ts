import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { z } from "zod";
import { getTenantId } from "@/lib/tenant";

const sparePartsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(["ENGINE", "ELECTRICAL", "PLUMBING", "DECK", "RIGGING", "SAFETY", "TOOLS", "OTHER"]).optional().nullable(),
  quantity: z.number().min(0).default(0),
  unit: z.string().default("piece"),
  lowStockThreshold: z.number().min(0).optional().nullable(),
  location: z.string().optional().nullable(),
  partNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Replace with actual database query when SparePartStock model is created
    return NextResponse.json([]);
  } catch (error) {
    console.error("Error fetching spare parts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = getTenantId(session);
    if (!tenantId) {
      return NextResponse.json(
        { error: "User must be assigned to a tenant" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validated = sparePartsSchema.parse(body);

    // TODO: Replace with actual database create when SparePartStock model is created
    const stock = {
      id: `temp-${Date.now()}`,
      ...validated,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(stock, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating spare part:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
