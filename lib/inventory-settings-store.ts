import "server-only";
import { dbUnscoped } from "@/lib/db";
import { Prisma } from "@prisma/client";

export type InventorySectionKey =
  | "foodProvisions"
  | "cleaningSupplies"
  | "spareParts"
  | "otherItems";

export interface InventoryItem {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  unit: string;
  lowStockThreshold: number | null;
  location: string | null;
  notes: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface InventoryHistoryEntry {
  at: string; // ISO
  userId: string;
  action: "create" | "update" | "delete";
  before?: Partial<InventoryItem> | null;
  after?: Partial<InventoryItem> | null;
  note?: string | null;
}

interface InventorySectionData {
  items: InventoryItem[];
  history: Record<string, InventoryHistoryEntry[]>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asItems(value: unknown): InventoryItem[] {
  if (!Array.isArray(value)) return [];
  const out: InventoryItem[] = [];
  for (const raw of value) {
    if (!isRecord(raw)) continue;
    const id = asStringOrNull(raw.id);
    const name = asStringOrNull(raw.name);
    const unit = asStringOrNull(raw.unit);
    const quantity = typeof raw.quantity === "number" ? raw.quantity : null;
    const createdAt = asStringOrNull(raw.createdAt);
    const updatedAt = asStringOrNull(raw.updatedAt);
    if (!id || !name || !unit || quantity === null || !createdAt || !updatedAt) continue;
    out.push({
      id,
      name,
      category: asStringOrNull(raw.category),
      quantity,
      unit,
      lowStockThreshold: asNumberOrNull(raw.lowStockThreshold),
      location: asStringOrNull(raw.location),
      notes: asStringOrNull(raw.notes),
      createdAt,
      updatedAt,
    });
  }
  return out;
}

function asHistory(value: unknown): Record<string, InventoryHistoryEntry[]> {
  if (!isRecord(value)) return {};
  const out: Record<string, InventoryHistoryEntry[]> = {};
  for (const [k, v] of Object.entries(value)) {
    if (!Array.isArray(v)) continue;
    const entries: InventoryHistoryEntry[] = [];
    for (const e of v) {
      if (!isRecord(e)) continue;
      const at = asStringOrNull(e.at);
      const userId = asStringOrNull(e.userId);
      const action = asStringOrNull(e.action);
      if (!at || !userId || (action !== "create" && action !== "update" && action !== "delete")) continue;
      entries.push({
        at,
        userId,
        action,
        before: isRecord(e.before) ? (e.before as Partial<InventoryItem>) : null,
        after: isRecord(e.after) ? (e.after as Partial<InventoryItem>) : null,
        note: asStringOrNull(e.note),
      });
    }
    out[k] = entries;
  }
  return out;
}

export async function getInventorySection(
  yachtId: string,
  section: InventorySectionKey
): Promise<InventorySectionData> {
  const yacht = await dbUnscoped.yacht.findUnique({
    where: { id: yachtId },
    select: { settings: true },
  });

  const settings = asRecord(yacht?.settings);
  const inventory = asRecord(settings.inventory);
  const sectionData = asRecord(inventory[section]);

  return {
    items: asItems(sectionData.items),
    history: asHistory(sectionData.history),
  };
}

export async function setInventorySection(
  yachtId: string,
  section: InventorySectionKey,
  next: InventorySectionData
): Promise<void> {
  const yacht = await dbUnscoped.yacht.findUnique({
    where: { id: yachtId },
    select: { settings: true },
  });

  const settings = asRecord(yacht?.settings) as unknown as Prisma.JsonObject;
  const inventory = asRecord(settings.inventory) as unknown as Prisma.JsonObject;

  const sectionValue = {
    items: next.items,
    history: next.history,
  } as unknown as Prisma.JsonObject;

  const nextSettings = {
    ...settings,
    inventory: {
      ...inventory,
      [section]: sectionValue,
    },
  } as unknown as Prisma.InputJsonValue;

  await dbUnscoped.yacht.update({
    where: { id: yachtId },
    data: { settings: nextSettings },
  });
}


