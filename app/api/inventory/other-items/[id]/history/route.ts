import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { getInventorySection } from "@/lib/inventory-settings-store";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user, "inventory.view", session.user.permissions)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const yachtId = session.user.yachtId;
  if (!yachtId) return NextResponse.json({ error: "Yacht not found" }, { status: 400 });

  const { id } = await params;
  const section = await getInventorySection(yachtId, "otherItems");
  return NextResponse.json(section.history[id] ?? [], { status: 200 });
}


