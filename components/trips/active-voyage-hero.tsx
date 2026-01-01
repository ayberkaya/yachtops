"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, ArrowRight, Users, Ship, Plus } from "lucide-react";
import { TripStatus, TripType } from "@prisma/client";
import { format } from "date-fns";
import Link from "next/link";

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
}

interface ActiveVoyageHeroProps {
  trip: Trip;
  canEdit: boolean;
}

export function ActiveVoyageHero({ trip, canEdit }: ActiveVoyageHeroProps) {

  const getStatusBadge = () => {
    return (
      <Badge className="bg-blue-600 text-white border-blue-700 dark:bg-blue-700 dark:text-white dark:border-blue-600 font-semibold">
        Status: Underway
      </Badge>
    );
  };

  const getTypeBadge = () => {
    const colors: Record<TripType, string> = {
      [TripType.CHARTER]: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      [TripType.PRIVATE]: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      [TripType.DELIVERY]: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      [TripType.MAINTENANCE]: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      [TripType.OTHER]: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    };
    return (
      <Badge className={colors[trip.type] || "bg-gray-100 text-gray-800"}>
        {trip.type}
      </Badge>
    );
  };

  return (
    <Card className="border-2 border-blue-300 dark:border-blue-700 shadow-lg mb-6 relative overflow-hidden">
      {/* Animated background layer */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-cyan-50 to-blue-50 dark:from-blue-950/40 dark:via-cyan-950/40 dark:to-blue-950/40 animate-pulse pointer-events-none" />
      {/* Content layer */}
      <CardContent className="p-6 md:p-8 relative z-10">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          {/* Left side: Trip info */}
          <div className="flex-1 space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 rounded-full bg-blue-600 dark:bg-blue-700 flex items-center justify-center shadow-md">
                  <Ship className="h-7 w-7 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {trip.name}
                  </h2>
                  {trip.code && (
                    <span className="text-lg font-medium text-gray-600 dark:text-gray-400">
                      ({trip.code})
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {getStatusBadge()}
                  {getTypeBadge()}
                  {trip.guestCount !== null && (
                    <Badge variant="outline" className="flex items-center gap-1.5 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">
                      <Users className="h-3.5 w-3.5" />
                      <span className="font-semibold">Guests: {trip.guestCount}</span>
                    </Badge>
                  )}
                </div>

                {/* Route display */}
                <div className="flex items-center gap-3 text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span>
                      {trip.departurePort || "Departure TBD"}
                    </span>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span>
                      {trip.arrivalPort || "Arrival TBD"}
                    </span>
                  </div>
                </div>

                {/* Dates */}
                <div className="flex flex-wrap gap-6 text-sm">
                  <div className="text-gray-700 dark:text-gray-300">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">Started:</span>{" "}
                    <span className="font-medium">{format(new Date(trip.startDate), "PPP")}</span>
                  </div>
                  {trip.endDate && (
                    <div className="text-gray-700 dark:text-gray-300">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">Expected End:</span>{" "}
                      <span className="font-medium">{format(new Date(trip.endDate), "PPP")}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right side: Quick Actions */}
          {canEdit && (
            <div className="flex flex-col gap-2 md:min-w-[200px]">
              <Link href={`/dashboard/trips?view=fuel&tripId=${trip.id}`}>
                <Button
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                  size="lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Movement Log
                </Button>
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

