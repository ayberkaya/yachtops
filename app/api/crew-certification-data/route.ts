import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { getTenantId } from "@/lib/tenant";

export async function GET(request: NextRequest) {
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

    if (!hasPermission(session.user, "documents.crew.view", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const crewMembers = await db.user.findMany({
      where: {
        yachtId: tenantId as string,
        role: {
          notIn: ["OWNER", "SUPER_ADMIN", "ADMIN"],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        passportDate: true,
        passportNumber: true,
        healthReportDate: true,
        walletDate: true,
        walletQualifications: true,
        walletTcKimlikNo: true,
        walletSicilLimani: true,
        walletSicilNumarasi: true,
        walletDogumTarihi: true,
        walletUyrugu: true,
        licenseDate: true,
        radioDate: true,
        certificates: {
          select: {
            id: true,
            name: true,
            issueDate: true,
            expiryDate: true,
            isIndefinite: true,
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(crewMembers);
  } catch (error) {
    console.error("Error fetching crew certification data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

