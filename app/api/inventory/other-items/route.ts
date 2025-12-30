import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import {
  getInventorySection,
  setInventorySection,
  type InventoryHistoryEntry,
  type InventoryItem,
} from "@/lib/inventory-settings-store";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["SAFETY_EQUIPMENT", "WATER_SPORTS", "DECK_EQUIPMENT", "OTHER"]).nullable().optional(),
  quantity: z.number().min(0).default(0),
  unit: z.string().min(1).default("piece"),
  lowStockThreshold: z.number().min(0).nullable().optional(),
  location: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user, "inventory.view", session.user.permissions)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const yachtId = session.user.yachtId;
  if (!yachtId) return NextResponse.json({ error: "Yacht not found" }, { status: 400 });

  const section = await getInventorySection(yachtId, "otherItems");
  return NextResponse.json(section.items, { status: 200 });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user, "inventory.create", session.user.permissions)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const yachtId = session.user.yachtId;
  if (!yachtId) return NextResponse.json({ error: "Yacht not found" }, { status: 400 });

  const body = await request.json();
  const validated = createSchema.parse(body);

  const now = new Date().toISOString();
  const item: InventoryItem = {
    id: randomUUID(),
    name: validated.name,
    category: validated.category ?? null,
    quantity: validated.quantity,
    unit: validated.unit,
    lowStockThreshold: validated.lowStockThreshold ?? null,
    location: validated.location ?? null,
    notes: validated.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };

  const section = await getInventorySection(yachtId, "otherItems");
  const historyEntry: InventoryHistoryEntry = {
    at: now,
    userId: session.user.id,
    action: "create",
    after: item,
  };
  const nextHistory = {
    ...section.history,
    [item.id]: [historyEntry, ...(section.history[item.id] ?? [])].slice(0, 50),
  };

  await setInventorySection(yachtId, "otherItems", {
    items: [...section.items, item],
    history: nextHistory,
  });

  return NextResponse.json(item, { status: 201 });
}


