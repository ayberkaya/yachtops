import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import {
  getInventorySection,
  setInventorySection,
  type InventoryHistoryEntry,
} from "@/lib/inventory-settings-store";

export const runtime = "nodejs";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.enum(["DETERGENTS", "DISINFECTANTS", "TOOLS", "CLOTHS", "PAPER_PRODUCTS", "SPECIALTY", "OTHER"]).nullable().optional(),
  quantity: z.number().min(0).optional(),
  unit: z.string().min(1).optional(),
  lowStockThreshold: z.number().min(0).nullable().optional(),
  location: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user, "inventory.edit", session.user.permissions)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const yachtId = session.user.yachtId;
  if (!yachtId) return NextResponse.json({ error: "Yacht not found" }, { status: 400 });

  const { id } = await params;
  const body = await request.json();
  const validated = updateSchema.parse(body);

  const section = await getInventorySection(yachtId, "cleaningSupplies");
  const idx = section.items.findIndex((i) => i.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const before = section.items[idx];
  const now = new Date().toISOString();
  const after = {
    ...before,
    ...validated,
    category: validated.category === undefined ? before.category : validated.category,
    lowStockThreshold:
      validated.lowStockThreshold === undefined ? before.lowStockThreshold : validated.lowStockThreshold,
    location: validated.location === undefined ? before.location : validated.location,
    notes: validated.notes === undefined ? before.notes : validated.notes,
    updatedAt: now,
  };

  const historyEntry: InventoryHistoryEntry = {
    at: now,
    userId: session.user.id,
    action: "update",
    before,
    after,
  };

  const nextItems = [...section.items];
  nextItems[idx] = after;
  const nextHistory = {
    ...section.history,
    [id]: [historyEntry, ...(section.history[id] ?? [])].slice(0, 50),
  };

  await setInventorySection(yachtId, "cleaningSupplies", { items: nextItems, history: nextHistory });
  return NextResponse.json(after, { status: 200 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user, "inventory.delete", session.user.permissions)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const yachtId = session.user.yachtId;
  if (!yachtId) return NextResponse.json({ error: "Yacht not found" }, { status: 400 });

  const { id } = await params;
  const section = await getInventorySection(yachtId, "cleaningSupplies");
  const item = section.items.find((i) => i.id === id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date().toISOString();
  const historyEntry: InventoryHistoryEntry = {
    at: now,
    userId: session.user.id,
    action: "delete",
    before: item,
  };
  const nextHistory = {
    ...section.history,
    [id]: [historyEntry, ...(section.history[id] ?? [])].slice(0, 50),
  };

  await setInventorySection(yachtId, "cleaningSupplies", {
    items: section.items.filter((i) => i.id !== id),
    history: nextHistory,
  });

  return NextResponse.json({ success: true }, { status: 200 });
}


