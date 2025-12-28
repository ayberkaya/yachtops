"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { TripList } from "./trip-list";
import { RouteFuelEstimation } from "./route-fuel-estimation";
import { ActiveVoyageHero } from "./active-voyage-hero";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TripType, TripStatus, TripMovementEvent } from "@prisma/client";

interface Trip {
  id: string;
  name: string;
  code: string | null;
  type: TripType;
  startDate: string;
  endDate: string | null;
  departurePort: string | null;
  arrivalPort: string | null;
  status: TripStatus;
  mainGuest: string | null;
  guestCount: number | null;
  notes: string | null;
  createdBy: { id: string; name: string | null; email: string } | null;
  _count?: {
    expenses: number;
    tasks: number;
  };
  expenseSummary?: Record<string, number>;
}

interface MovementLog {
  id: string;
  tripId: string;
  eventType: TripMovementEvent;
  port: string | null;
  eta: string | null;
  etd: string | null;
  weather: string | null;
  seaState: string | null;
  notes: string | null;
  recordedAt: string;
}

interface TankLog {
  id: string;
  tripId: string;
  fuelLevel: number | null;
  freshWater: number | null;
  greyWater: number | null;
  blackWater: number | null;
  recordedAt: string;
}

interface LogbookTabsProps {
  currentView: "active" | "past" | "fuel";
  trips: Trip[];
  tripsForFuelLog?: Array<{
    id: string;
    name: string;
    code: string | null;
    status: TripStatus;
    startDate: string;
    endDate: string | null;
    departurePort: string | null;
    arrivalPort: string | null;
  }>;
  movementLogs?: MovementLog[];
  tankLogs?: TankLog[];
  canManage: boolean;
  canEdit: boolean;
  currentUser: {
    id: string;
    name: string | null;
    email: string;
  };
}

export function LogbookTabs({
  currentView,
  trips,
  tripsForFuelLog,
  movementLogs = [],
  tankLogs = [],
  canManage,
  canEdit,
  currentUser,
}: LogbookTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const basePath = "/dashboard/trips";

  // Create URL with view param
  const createViewUrl = (view: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    return `${basePath}?${params.toString()}`;
  };

  // Handle tab change
  const handleValueChange = (value: string) => {
    router.push(createViewUrl(value));
  };

  return (
    <Tabs value={currentView} onValueChange={handleValueChange} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="active">
          Active Voyages
        </TabsTrigger>
        <TabsTrigger value="past">
          Past Voyages
        </TabsTrigger>
        <TabsTrigger value="fuel">
          Fuel Log
        </TabsTrigger>
      </TabsList>

      <TabsContent value="active" className="mt-6">
        {/* Show ActiveVoyageHero if there's an ONGOING trip */}
        {trips.find((t) => t.status === TripStatus.ONGOING) && (
          <ActiveVoyageHero
            trip={trips.find((t) => t.status === TripStatus.ONGOING)!}
            canEdit={canEdit}
          />
        )}
        <TripList 
          initialTrips={trips} 
          canManage={canManage} 
        />
      </TabsContent>

      <TabsContent value="past" className="mt-6">
        <TripList 
          initialTrips={trips} 
          canManage={canManage} 
        />
      </TabsContent>

      <TabsContent value="fuel" className="mt-6">
        <RouteFuelEstimation
          trips={tripsForFuelLog || []}
          movementLogs={movementLogs}
          tankLogs={tankLogs}
          canEdit={canEdit}
          currentUser={currentUser}
        />
      </TabsContent>
    </Tabs>
  );
}

