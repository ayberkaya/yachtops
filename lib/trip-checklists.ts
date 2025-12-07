import { TripChecklistType } from "@prisma/client";

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

export async function ensureTripChecklistSeeded(tripId: string) {
  const existingItems = await db.tripChecklistItem.findMany({
    where: { tripId },
    orderBy: { orderIndex: "asc" },
  });

  const itemsByType = existingItems.reduce<Record<TripChecklistType, typeof existingItems>>(
    (acc, item) => {
      acc[item.type] = acc[item.type] || [];
      acc[item.type].push(item);
      return acc;
    },
    {
      [TripChecklistType.PRE_DEPARTURE]: [],
      [TripChecklistType.POST_ARRIVAL]: [],
    }
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
    const existingTitles = new Set(existingForType.map((item) => item.title));
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

