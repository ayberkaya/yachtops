import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { z } from "zod";
import { getTenantId, isPlatformAdmin } from "@/lib/tenant";

const alcoholStockSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(["WINE", "SPIRITS", "BEER"]).optional().nullable(),
  quantity: z.number().min(0).default(0),
  unit: z.string().default("bottle"),
  lowStockThreshold: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantIdFromSession = getTenantId(session);
    const isAdmin = isPlatformAdmin(session);
    const requestedTenantId = searchParams.get("tenantId");
    const tenantId = isAdmin && requestedTenantId ? requestedTenantId : tenantIdFromSession;
    if (!tenantId && !isAdmin) {
      return NextResponse.json({ error: "Tenant not set" }, { status: 400 });
    }

    const stocks = await db.alcoholStock.findMany({
      where: {
        yachtId: tenantId || undefined,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(stocks);
  } catch (error) {
    console.error("Error fetching alcohol stock:", error);
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
    const isAdmin = isPlatformAdmin(session);
    const effectiveTenantId = tenantId || "";
    if (!effectiveTenantId && !isAdmin) {
      return NextResponse.json(
        { error: "User must be assigned to a tenant" },
        { status: 400 }
      );
    }

    // Check if request has FormData (image upload) or JSON
    const contentType = request.headers.get("content-type") || "";
    let validated: z.infer<typeof alcoholStockSchema>;

    // Try to parse as FormData first (browser sets boundary automatically)
    const isFormData = contentType.includes("multipart/form-data");
    
    if (isFormData) {
      try {
        const formData = await request.formData();
        const file = formData.get("image") as File | null;
        const name = formData.get("name") as string;
        const category = formData.get("category") as string | null;
        const quantityStr = formData.get("quantity") as string | null;
        const quantity = quantityStr ? parseInt(quantityStr) : 0;
        const unit = (formData.get("unit") as string) || "bottle";
        const lowStockThresholdStr = formData.get("lowStockThreshold") as string | null;
        const lowStockThreshold = lowStockThresholdStr ? parseInt(lowStockThresholdStr) : null;
        const notes = formData.get("notes") as string | null;

        if (!name || name.trim() === "") {
          return NextResponse.json(
            { error: "Name is required" },
            { status: 400 }
          );
        }

        let imageUrl: string | null = null;
        if (file && file.size > 0) {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const mimeType = file.type || "image/jpeg";
          const base64 = buffer.toString("base64");
          imageUrl = `data:${mimeType};base64,${base64}`;
        }

        validated = alcoholStockSchema.parse({
          name: name.trim(),
          category: category && category !== "NONE" && category !== "" ? category as "WINE" | "SPIRITS" | "BEER" : null,
          quantity: isNaN(quantity) ? 0 : quantity,
          unit,
          lowStockThreshold: lowStockThreshold && !isNaN(lowStockThreshold) ? lowStockThreshold : null,
          notes: notes || null,
          imageUrl,
        });
      } catch (formError) {
        console.error("Error parsing form data:", formError);
        if (formError instanceof z.ZodError) {
          return NextResponse.json(
            { error: "Invalid form data", details: formError.issues },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: "Invalid form data", details: formError instanceof Error ? formError.message : String(formError) },
          { status: 400 }
        );
      }
    } else {
      // Try to parse as JSON
      try {
        const body = await request.json();
        validated = alcoholStockSchema.parse(body);
      } catch (jsonError) {
        console.error("Error parsing JSON:", jsonError);
        if (jsonError instanceof z.ZodError) {
          return NextResponse.json(
            { error: "Invalid JSON data", details: jsonError.issues },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: "Invalid JSON data", details: jsonError instanceof Error ? jsonError.message : String(jsonError) },
          { status: 400 }
        );
      }
    }

    // Check if stock with same name already exists
    const existing = await db.alcoholStock.findUnique({
      where: {
        yachtId_name: {
          yachtId: effectiveTenantId,
          name: validated.name,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Alcohol stock with this name already exists" },
        { status: 400 }
      );
    }

    const stock = await db.alcoholStock.create({
      data: {
        yachtId: effectiveTenantId,
        name: validated.name,
        category: validated.category || null,
        quantity: validated.quantity,
        unit: validated.unit,
        lowStockThreshold: validated.lowStockThreshold || null,
        notes: validated.notes || null,
        imageUrl: validated.imageUrl || null,
      },
    });

    // Create initial history entry if quantity > 0
    if (validated.quantity > 0) {
      await db.alcoholStockHistory.create({
        data: {
          stockId: stock.id,
          userId: session.user.id,
          changeType: "SET",
          quantityBefore: 0,
          quantityAfter: validated.quantity,
          quantityChange: validated.quantity,
          notes: "Initial stock",
        },
      });
    }

    return NextResponse.json(stock, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.issues);
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating alcohol stock:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

