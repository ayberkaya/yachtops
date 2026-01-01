"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, AlertTriangle, CheckCircle2 } from "lucide-react";

interface CrewCertificationKPIsProps {
  totalCrew: number;
  actionRequired: number;
  complianceRate: number;
}

export function CrewCertificationKPIs({
  totalCrew,
  actionRequired,
  complianceRate,
}: CrewCertificationKPIsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="border-zinc-200/60">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Crew</p>
              <p className="text-3xl font-bold mt-2">{totalCrew}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center">
              <Users className="h-6 w-6 text-zinc-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-200/60">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Action Required</p>
              <p className="text-3xl font-bold mt-2 text-red-600">{actionRequired}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-200/60">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Compliance Rate</p>
              <p className="text-3xl font-bold mt-2">{complianceRate}%</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

