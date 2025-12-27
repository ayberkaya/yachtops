"use client";

import { useState } from "react";
import { TripList } from "./trip-list";
import { RouteFuelEstimation } from "./route-fuel-estimation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ship, History, Fuel } from "lucide-react";
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
  activeTrips: Trip[];
  pastTrips: Trip[];
  trips: Array<{
    id: string;
    name: string;
    code: string | null;
    status: TripStatus;
    startDate: string;
    endDate: string | null;
    departurePort: string | null;
    arrivalPort: string | null;
  }>;
  movementLogs: MovementLog[];
  tankLogs: TankLog[];
  canManage: boolean;
  canEdit: boolean;
  currentUser: {
    id: string;
    name: string | null;
    email: string;
  };
}

export function LogbookTabs({
  activeTrips,
  pastTrips,
  trips,
  movementLogs,
  tankLogs,
  canManage,
  canEdit,
  currentUser,
}: LogbookTabsProps) {
  const [activeTab, setActiveTab] = useState("active");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="active" className="flex items-center gap-2">
          <Ship className="h-4 w-4" />
          Active Voyages
        </TabsTrigger>
        <TabsTrigger value="past" className="flex items-center gap-2">
          <History className="h-4 w-4" />
          Past Voyages
        </TabsTrigger>
        <TabsTrigger value="fuel" className="flex items-center gap-2">
          <Fuel className="h-4 w-4" />
          Fuel Log
        </TabsTrigger>
      </TabsList>

      <TabsContent value="active" className="mt-6">
        <TripList 
          initialTrips={activeTrips} 
          canManage={canManage} 
        />
      </TabsContent>

      <TabsContent value="past" className="mt-6">
        <TripList 
          initialTrips={pastTrips} 
          canManage={canManage} 
        />
      </TabsContent>

      <TabsContent value="fuel" className="mt-6">
        <RouteFuelEstimation
          trips={trips}
          movementLogs={movementLogs}
          tankLogs={tankLogs}
          canEdit={canEdit}
          currentUser={currentUser}
        />
      </TabsContent>
    </Tabs>
  );
}

