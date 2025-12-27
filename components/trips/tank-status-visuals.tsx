"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Fuel, Droplet, Waves } from "lucide-react";
import { format } from "date-fns";

interface TankLog {
  id: string;
  tripId: string;
  fuelLevel: number | null;
  freshWater: number | null;
  greyWater: number | null;
  blackWater: number | null;
  recordedAt: string;
}

interface TankStatusVisualsProps {
  latestTankLog: TankLog | null;
  // Optional: Maximum capacity for each tank type (for percentage calculation)
  maxFuel?: number;
  maxFreshWater?: number;
  maxGreyWater?: number;
  maxBlackWater?: number;
}

export function TankStatusVisuals({
  latestTankLog,
  maxFuel = 10000, // Default max values in liters
  maxFreshWater = 5000,
  maxGreyWater = 2000,
  maxBlackWater = 2000,
}: TankStatusVisualsProps) {
  if (!latestTankLog) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fuel className="h-5 w-5" />
            Tank Status
          </CardTitle>
          <CardDescription>No tank readings recorded yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getPercentage = (value: number | null, max: number): number => {
    if (value === null || value === undefined) return 0;
    return Math.min(Math.max((value / max) * 100, 0), 100);
  };

  const getColorClass = (percentage: number, type: "fuel" | "water" | "waste"): string => {
    if (type === "fuel") {
      if (percentage < 20) return "bg-red-500";
      if (percentage < 40) return "bg-orange-500";
      return "bg-amber-500";
    }
    if (type === "water") {
      if (percentage < 20) return "bg-red-500";
      if (percentage < 40) return "bg-orange-500";
      return "bg-blue-500";
    }
    // waste (grey/black water)
    if (percentage > 80) return "bg-red-500";
    if (percentage > 60) return "bg-orange-500";
    return "bg-slate-600";
  };

  const fuelPercentage = getPercentage(latestTankLog.fuelLevel, maxFuel);
  const freshWaterPercentage = getPercentage(latestTankLog.freshWater, maxFreshWater);
  const greyWaterPercentage = getPercentage(latestTankLog.greyWater, maxGreyWater);
  const blackWaterPercentage = getPercentage(latestTankLog.blackWater, maxBlackWater);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fuel className="h-5 w-5" />
          Current Tank Status
        </CardTitle>
        <CardDescription>
          Latest reading: {format(new Date(latestTankLog.recordedAt), "PPp")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Fuel Level */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fuel className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-medium">Fuel</span>
              </div>
              <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                {latestTankLog.fuelLevel?.toFixed(1) || "—"} L
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getColorClass(fuelPercentage, "fuel")}`}
                style={{ width: `${fuelPercentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{fuelPercentage.toFixed(0)}%</span>
              <span>Max: {maxFuel.toLocaleString()} L</span>
            </div>
          </div>

          {/* Fresh Water */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium">Fresh Water</span>
              </div>
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                {latestTankLog.freshWater?.toFixed(1) || "—"} L
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getColorClass(freshWaterPercentage, "water")}`}
                style={{ width: `${freshWaterPercentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{freshWaterPercentage.toFixed(0)}%</span>
              <span>Max: {maxFreshWater.toLocaleString()} L</span>
            </div>
          </div>

          {/* Grey Water */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Waves className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                <span className="text-sm font-medium">Grey Water</span>
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {latestTankLog.greyWater?.toFixed(1) || "—"} L
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getColorClass(greyWaterPercentage, "waste")}`}
                style={{ width: `${greyWaterPercentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{greyWaterPercentage.toFixed(0)}%</span>
              <span>Max: {maxGreyWater.toLocaleString()} L</span>
            </div>
          </div>

          {/* Black Water */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Waves className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                <span className="text-sm font-medium">Black Water</span>
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {latestTankLog.blackWater?.toFixed(1) || "—"} L
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getColorClass(blackWaterPercentage, "waste")}`}
                style={{ width: `${blackWaterPercentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{blackWaterPercentage.toFixed(0)}%</span>
              <span>Max: {maxBlackWater.toLocaleString()} L</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

