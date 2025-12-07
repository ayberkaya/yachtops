import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { hasPermission } from "@/lib/permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListChecks, Anchor, ClipboardCheck, Navigation, Waves, Droplet } from "lucide-react";

export default async function VoyagePlanningPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (!hasPermission(session.user, "trips.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Voyage Planning & Checklists</h1>
        <p className="text-muted-foreground">
          Pre/post-departure checklists, tank levels, and departure/arrival logs for each trip.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Pre-departure checklist
            </CardTitle>
            <CardDescription>Templates for departure routines and safety checks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Navigation equipment</span>
              <Badge variant="outline">Radar/GPS</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Engine room</span>
              <Badge variant="outline">Oil/filters</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Safety</span>
              <Badge variant="outline">PFD/Flares</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Post-arrival checklist
            </CardTitle>
            <CardDescription>Secure, shutdown, and handover routines after arrival.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Lines & fenders</span>
              <Badge variant="outline">Secured</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Systems</span>
              <Badge variant="outline">HVAC/Gen</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Deck/bridge log</span>
              <Badge variant="outline">Logged</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplet className="h-5 w-5" />
              Tank levels & consumables
            </CardTitle>
            <CardDescription>Fuel, fresh water, grey/black water, and lube oil snapshots.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Fuel</span>
              <Badge variant="secondary">Record before/after</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Fresh water</span>
              <Badge variant="secondary">Top-up check</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Grey/black tanks</span>
              <Badge variant="secondary">Levels noted</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Anchor className="h-5 w-5" />
            Departure / Arrival Log
          </CardTitle>
          <CardDescription>Record departures, arrivals, ETA/ETD, and conditions per trip.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 text-sm">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-muted-foreground" />
            <span>Route plan & waypoints</span>
          </div>
          <div className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-muted-foreground" />
            <span>Sea state / weather snapshot</span>
          </div>
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-muted-foreground" />
            <span>Bridge/engine log linkage</span>
          </div>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            <span>Arrival handover checklist</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

