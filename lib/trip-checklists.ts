import { Prisma, TripChecklistType } from "@prisma/client";

import { db } from "@/lib/db";

export const DEFAULT_TRIP_CHECKLIST_TEMPLATES: Record<
  TripChecklistType,
  { title: string; remarks?: string }[]
> = {
  [TripChecklistType.PRE_DEPARTURE]: [
    {
      title: "Bridge & navigation equipment check",
      remarks: "Verify radar, AIS, GPS, gyro and alarm panel",
    },
    {
      title: "Engine room round",
      remarks: "Oil level, cooling water and belt tension",
    },
    {
      title: "Safety gear confirmation",
      remarks: "Life jackets, EPIRB, firefighting equipment ready",
    },
    {
      title: "Bilge & alarm test",
      remarks: "Run short test on every alarm trigger",
    },
    {
      title: "Departure briefing",
      remarks: "Captain shares route, weather and duties",
    },
    {
      title: "Fuel & water levels recorded",
      remarks: "Note bunkers, fresh water, grey/black tank status",
    },
    {
      title: "Weather & routing review",
      remarks: "Confirm latest forecast and alternative ports",
    },
    {
      title: "Galley secured",
      remarks: "All drawers/ovens locked, hot surfaces off",
    },
    {
      title: "Deck loose gear stowed",
      remarks: "Lounge cushions, covers, awnings removed",
    },
    {
      title: "Tender & toys inspection",
      remarks: "Fuel, lanyards and lashing straps checked",
    },
  ],
  [TripChecklistType.POST_ARRIVAL]: [
    {
      title: "Lines & fenders secured",
      remarks: "Check chafe and tension at the pier",
    },
    {
      title: "Engine / generator shutdown",
      remarks: "Idle down, lubricate and record in log",
    },
    {
      title: "Bridge & voyage log update",
      remarks: "Log arrival time, fuel burn and key notes",
    },
    {
      title: "Deck & toys secured",
      remarks: "Lock tender, jet ski and loose deck gear",
    },
    {
      title: "Arrival handover",
      remarks: "Verbal debrief to oncoming watch",
    },
    {
      title: "Fuel / water consumption logged",
      remarks: "Update bunker book and tank spreadsheet",
    },
    {
      title: "Guest feedback collected",
      remarks: "Note compliments/issues for owner & chef",
    },
    {
      title: "Waste & laundry plan",
      remarks: "Schedule offload / service per port rules",
    },
    {
      title: "Security systems set",
      remarks: "Doors, CCTV and intrusion sensors armed",
    },
    {
      title: "Next departure prep",
      remarks: "Seed upcoming checklist and maintenance reminders",
    },
  ],
};

const CREATE_CHECKLIST_ENUM_SQL = `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'TripChecklistType'
  ) THEN
    CREATE TYPE "TripChecklistType" AS ENUM ('PRE_DEPARTURE', 'POST_ARRIVAL');
  END IF;
END
$$;
`;

const CREATE_CHECKLIST_TABLE_SQL = `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'trip_checklist_items'
  ) THEN
    CREATE TABLE "public"."trip_checklist_items" (
      "id" TEXT PRIMARY KEY,
      "trip_id" TEXT NOT NULL,
      "type" "TripChecklistType" NOT NULL,
      "title" TEXT NOT NULL,
      "remarks" TEXT,
      "completed" BOOLEAN NOT NULL DEFAULT false,
      "completed_at" TIMESTAMP(3),
      "completed_by_id" TEXT,
      "order_index" INTEGER NOT NULL DEFAULT 0,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX "trip_checklist_items_trip_id_type_idx"
      ON "public"."trip_checklist_items" ("trip_id", "type");

    ALTER TABLE "public"."trip_checklist_items"
      ADD CONSTRAINT "trip_checklist_items_trip_id_fkey"
      FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;

    ALTER TABLE "public"."trip_checklist_items"
      ADD CONSTRAINT "trip_checklist_items_completed_by_id_fkey"
      FOREIGN KEY ("completed_by_id") REFERENCES "public"."users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
`;

let checklistTableEnsured = false;
let checklistTableEnsuring: Promise<void> | null = null;

const isDuplicateDefinitionError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2010" &&
  typeof error.meta?.message === "string" &&
  error.meta.message.includes("already exists");

const safeExecute = async (sql: string) => {
  try {
    await db.$executeRawUnsafe(sql);
  } catch (error) {
    if (!isDuplicateDefinitionError(error)) {
      throw error;
    }
  }
};

export async function ensureTripChecklistTableReady() {
  if (checklistTableEnsured) {
    return;
  }

  if (!checklistTableEnsuring) {
    checklistTableEnsuring = (async () => {
      try {
        await db.tripChecklistItem.findFirst({ select: { id: true } });
        checklistTableEnsured = true;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
          await safeExecute(CREATE_CHECKLIST_ENUM_SQL);
          await safeExecute(CREATE_CHECKLIST_TABLE_SQL);
          checklistTableEnsured = true;
        } else {
          throw error;
        }
      } finally {
        checklistTableEnsuring = null;
      }
    })();
  }

  await checklistTableEnsuring;
}

export async function ensureTripChecklistSeeded(tripId: string) {
  await ensureTripChecklistTableReady();

  const existingItems = await db.tripChecklistItem.findMany({
    where: { tripId },
    orderBy: { orderIndex: "asc" },
  });

  const itemsByType = existingItems.reduce(
    (acc: Record<TripChecklistType, typeof existingItems>, item) => {
      acc[item.type] = acc[item.type] || [];
      acc[item.type].push(item);
      return acc;
    },
    {
      [TripChecklistType.PRE_DEPARTURE]: [],
      [TripChecklistType.POST_ARRIVAL]: [],
    } as Record<TripChecklistType, typeof existingItems>
  );

  const inserts: {
    tripId: string;
    type: TripChecklistType;
    title: string;
    orderIndex: number;
    remarks: string | null;
  }[] = [];

  for (const [typeKey, templates] of Object.entries(DEFAULT_TRIP_CHECKLIST_TEMPLATES)) {
    const type = typeKey as TripChecklistType;
    const existingForType = itemsByType[type];
    const existingTitles = new Set(existingForType.map((item: { title: string }) => item.title));
    let orderIndex = existingForType.length > 0 ? existingForType[existingForType.length - 1].orderIndex + 1 : 0;

    templates.forEach((template, index) => {
      if (existingTitles.has(template.title)) {
        return;
      }

      inserts.push({
        tripId,
        type,
        title: template.title,
        orderIndex: existingForType.length > 0 ? orderIndex++ : index,
        remarks: template.remarks ?? null,
      });
    });
  }

  if (inserts.length > 0) {
    await db.tripChecklistItem.createMany({ data: inserts });
    return true;
  }

  return false;
}

