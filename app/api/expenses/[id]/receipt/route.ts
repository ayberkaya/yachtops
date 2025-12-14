import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { getTenantId, isPlatformAdmin } from "@/lib/tenant";
import { hasPermission } from "@/lib/permissions";
import { validateFileUpload } from "@/lib/file-upload-security";
import { createAuditLog } from "@/lib/audit-log";
import { AuditAction } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const tenantId = getTenantId(session);
    const isAdmin = isPlatformAdmin(session);
    if (!tenantId && !isAdmin) {
      return NextResponse.json({ error: "Tenant not set" }, { status: 400 });
    }

    const expense = await db.expense.findFirst({
      where: {
        id,
        yachtId: tenantId || undefined,
        deletedAt: null, // Exclude soft-deleted expenses
      },
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Check permissions
    const canUpload = 
      expense.createdByUserId === session.user.id ||
      hasPermission(session.user, "documents.upload", session.user.permissions);

    if (!canUpload) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file upload security (receipts are typically images)
    const validation = validateFileUpload(file, "image");
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "File validation failed" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || "image/jpeg";
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const receipt = await db.expenseReceipt.create({
      data: {
        expenseId: id,
        fileUrl: dataUrl,
        createdByUserId: session.user.id,
      },
    });

    // Create audit log
    await createAuditLog({
      yachtId: tenantId!,
      userId: session.user.id,
      action: AuditAction.CREATE,
      entityType: "ExpenseReceipt",
      entityId: receipt.id,
      description: `Receipt uploaded for expense: ${expense.description}`,
      request,
    });

    return NextResponse.json(receipt, { status: 201 });
  } catch (error) {
    console.error("Error uploading expense receipt:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


