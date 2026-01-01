import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { getTenantId } from "@/lib/tenant";
import { z } from "zod";

const createCertificateSchema = z.object({
  userId: z.string(),
  name: z.string().min(1),
  issueDate: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
  isIndefinite: z.boolean().default(false),
});

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

    if (!hasPermission(session.user, "documents.upload", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validated = createCertificateSchema.parse(body);

    // Verify user belongs to same yacht
    const user = await db.user.findFirst({
      where: {
        id: validated.userId,
        yachtId: tenantId as string,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const certificate = await db.crewCertificate.create({
      data: {
        userId: validated.userId,
        yachtId: tenantId as string,
        name: validated.name,
        issueDate: validated.issueDate ? new Date(validated.issueDate) : null,
        expiryDate: validated.expiryDate ? new Date(validated.expiryDate) : null,
        isIndefinite: validated.isIndefinite,
      },
    });

    return NextResponse.json(certificate, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating certificate:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

