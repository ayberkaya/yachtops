"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, ArrowRight, Users, Ship, Plus, Fuel } from "lucide-react";
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
      <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200">
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
    <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 via-cyan-50 to-blue-50 dark:from-blue-950/30 dark:via-cyan-950/30 dark:to-blue-950/30 shadow-lg mb-6">
      <CardContent className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          {/* Left side: Trip info */}
          <div className="flex-1 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <Ship className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-2xl md:text-3xl font-bold text-blue-900 dark:text-blue-100">
                    {trip.name}
                  </h2>
                  {trip.code && (
                    <span className="text-lg text-blue-700 dark:text-blue-300">
                      ({trip.code})
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {getStatusBadge()}
                  {getTypeBadge()}
                  {trip.guestCount !== null && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Guests: {trip.guestCount}
                    </Badge>
                  )}
                </div>

                {/* Route display */}
                <div className="flex items-center gap-3 text-lg font-medium text-blue-900 dark:text-blue-100">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold">
                      {trip.departurePort || "Departure TBD"}
                    </span>
                  </div>
                  <ArrowRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold">
                      {trip.arrivalPort || "Arrival TBD"}
                    </span>
                  </div>
                </div>

                {/* Dates */}
                <div className="flex flex-wrap gap-4 text-sm text-blue-700 dark:text-blue-300">
                  <div>
                    <span className="font-medium">Started:</span>{" "}
                    {format(new Date(trip.startDate), "PPP")}
                  </div>
                  {trip.endDate && (
                    <div>
                      <span className="font-medium">Expected End:</span>{" "}
                      {format(new Date(trip.endDate), "PPP")}
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
              <Link href={`/dashboard/trips?view=fuel&tripId=${trip.id}`}>
                <Button
                  variant="outline"
                  className="w-full border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                  size="lg"
                >
                  <Fuel className="h-4 w-4 mr-2" />
                  Update Fuel
                </Button>
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

