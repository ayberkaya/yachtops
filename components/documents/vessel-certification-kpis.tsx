"use client";

import { Card, CardContent } from "@/components/ui/card";
import { FileText, AlertTriangle } from "lucide-react";

interface VesselCertificationKPIsProps {
  totalDocuments: number;
  actionRequired30Days: number;
  actionRequired90Days: number;
}

export function VesselCertificationKPIs({
  totalDocuments,
  actionRequired30Days,
  actionRequired90Days,
}: VesselCertificationKPIsProps) {
  return (
    <div className="grid grid-cols-3 gap-2 md:gap-4">
      <Card className="border-zinc-200/60">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Documents</p>
              <p className="text-2xl font-bold mt-1">{totalDocuments}</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center">
              <FileText className="h-4 w-4 text-zinc-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-200/60">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">&lt; 90 Days</p>
              <p className="text-2xl font-bold mt-1 text-yellow-600">{actionRequired90Days}</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-yellow-50 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-200/60">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">&lt; 30 Days</p>
              <p className="text-2xl font-bold mt-1 text-red-600">{actionRequired30Days}</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

